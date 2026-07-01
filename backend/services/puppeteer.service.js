const puppeteer = require('puppeteer');

let browserInstance = null;

const getBrowser = async () => {
    if (!browserInstance) {
        browserInstance = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });
    }
    return browserInstance;
};

// Función auxiliar para configurar dimensiones en la página
const setupSvgDimensions = async (page) => {
    return await page.evaluate(() => {
        const svg = document.querySelector('svg');
        if (!svg) return { width: 800, height: 600 };
        
        let w = parseFloat(svg.getAttribute('width'));
        let h = parseFloat(svg.getAttribute('height'));
        
        if (isNaN(w) || isNaN(h) || w === 0 || h === 0) {
            const viewBox = svg.getAttribute('viewBox');
            if (viewBox) {
                const parts = viewBox.split(/[ ,]+/);
                if (parts.length === 4) {
                    w = parseFloat(parts[2]);
                    h = parseFloat(parts[3]);
                }
            }
        }
        
        if (isNaN(w) || isNaN(h) || w === 0 || h === 0) {
            const bbox = svg.getBoundingClientRect();
            w = bbox.width;
            h = bbox.height;
        }

        w = w || 800;
        h = h || 600;
        
        // Forzar atributos para que no haya 0 width
        svg.setAttribute('width', w + 'px');
        svg.setAttribute('height', h + 'px');
        svg.style.width = w + 'px';
        svg.style.height = h + 'px';
        
        return { width: Math.ceil(w), height: Math.ceil(h) };
    });
};

const renderToPdf = async (svgString) => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        console.log('[puppeteer] ── SVG para PDF (primeros 500 chars) ──');
        console.log(svgString.substring(0, 500));

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
                    svg { display: block; }
                </style>
            </head>
            <body>
                ${svgString}
            </body>
            </html>
        `;

        await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] });

        const dimensions = await setupSvgDimensions(page);
        await page.setViewport({ width: dimensions.width, height: dimensions.height });

        const pdfBuffer = await page.pdf({
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });

        await page.close();
        return Buffer.from(pdfBuffer);
    } catch (error) {
        console.error('ERROR_RENDERIZADO (PDF):', error.message);
        console.error('Stack:', error.stack);
        console.error('SVG completo que causó el error:\n', svgString);
        await page.close().catch(() => {});
        throw error;
    }
};

const renderToImage = async (svgString, format = 'png') => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
        // ── DIAGNÓSTICO: SVG que se va a renderizar ──────────────────────────
        console.log('[puppeteer] ── SVG para imagen (primeros 2000 chars) ──');
        console.log(svgString.substring(0, 2000));
        console.log('[puppeteer] ── Total chars del SVG:', svgString.length, '──');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body, html { margin: 0; padding: 0; display: inline-block; }
                    svg { display: block; }
                </style>
            </head>
            <body>
                ${svgString}
            </body>
            </html>
        `;

        await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0'] });
        // Pequeña pausa para que foreignObject termine de pintarse
        await new Promise(r => setTimeout(r, 150));

        const dimensions = await setupSvgDimensions(page);
        console.log('[puppeteer] Dimensiones detectadas:', dimensions);
        await page.setViewport({ width: dimensions.width, height: dimensions.height });

        const svgElement = await page.$('svg');
        if (!svgElement) {
            throw new Error('No se encontró elemento <svg> en el DOM después de setContent.');
        }

        const imgBuffer = await svgElement.screenshot({
            type: format === 'jpg' ? 'jpeg' : 'png',
            omitBackground: format === 'png',
            quality: format === 'jpg' ? 90 : undefined
        });

        await page.close();
        return Buffer.from(imgBuffer);
    } catch (error) {
        console.error('ERROR_RENDERIZADO (imagen):', error.message);
        console.error('Stack:', error.stack);
        console.error('[puppeteer] SVG completo que causó el error:\n', svgString);
        await page.close().catch(() => {});
        throw error;
    }
};

const executeConcurrently = async (promiseFns, limit, archive) => {
    const results = [];
    const executing = new Set();
    
    for (const promiseFn of promiseFns) {
        const p = promiseFn().then(res => {
            executing.delete(p);
            if (archive && res) {
                res.forEach(item => {
                    if (item.type !== 'pdf' && item.name) {
                        archive.append(item.buffer, { name: item.name });
                    }
                });
            }
            return res;
        });
        executing.add(p);
        results.push(p);
        
        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
};

module.exports = {
    renderToPdf,
    renderToImage,
    executeConcurrently,
    getBrowser
};
