const excelService = require('../services/excel.service');
const svgParserService = require('../services/svgParser.service');
const puppeteerService = require('../services/puppeteer.service');
const pptxService = require('../services/pptx.service');
const pdfMergeService = require('../services/pdfMerge.service');
const streamUtil = require('../utils/stream.util');

// ─────────────────────────────────────────────────────────────────────────────
// Genera documentos para todas las filas del Excel.
// Soporta múltiples plantillas SVG (ej: cara frontal + cara trasera).
// Detecta si una plantilla tiene variables o es estática:
//  - Estáticas: Se renderizan UNA vez. Si es imagen/pptx, se añaden al zip una vez.
//  - Variables: Se renderizan por cada fila del Excel.
//  - PDF: Se crea un PDF por persona que intercala las caras estáticas y variables.
// ─────────────────────────────────────────────────────────────────────────────
const generateDocuments = async (req, res) => {
    try {
        const templateFiles = req.files['template'] || [];
        const dataFile = req.files['data'] ? req.files['data'][0] : null;

        const formats = req.body.formats ? req.body.formats.split(',') : ['pdf'];

        if (!templateFiles.length || !dataFile) {
            return res.status(400).json({ error: 'Faltan archivos requeridos.' });
        }

        const dataRows = excelService.parseExcelBuffer(dataFile.buffer);
        if (!dataRows || dataRows.length === 0) {
            return res.status(400).json({ error: 'El Excel está vacío o no es válido.' });
        }

        console.log(`[controller] ${templateFiles.length} plantilla(s), ${dataRows.length} fila(s)`);

        const isOnlyPdf = formats.length === 1 && formats.includes('pdf');
        let archive = null;
        if (!isOnlyPdf) {
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', 'attachment; filename=documentos_generados.zip');
            archive = streamUtil.createZipStream(res);
        }

        // 1. Inyectar fuentes y detectar cuáles plantillas tienen variables
        const templatesInfo = await Promise.all(templateFiles.map(async (f, idx) => {
            const svgString = await svgParserService.injectFontsToSVG(f.buffer.toString('utf-8'));
            const hasVariables = /\{\{.*?\}\}/.test(svgString);
            return { index: idx, svgString, hasVariables };
        }));

        // 2. Pre-renderizar plantillas estáticas UNA SOLA VEZ para ahorrar memoria/tiempo
        const staticRenders = {};
        for (const tpl of templatesInfo) {
            if (!tpl.hasVariables) {
                console.log(`[controller] Plantilla ${tpl.index + 1} es ESTÁTICA. Pre-renderizando...`);
                staticRenders[tpl.index] = {};
                for (const format of formats) {
                    if (format === 'pdf') {
                        staticRenders[tpl.index].pdf = await puppeteerService.renderToPdf(tpl.svgString);
                    } else if (format === 'png' || format === 'jpg') {
                        staticRenders[tpl.index].img = await puppeteerService.renderToImage(tpl.svgString, format);
                        // Añadir al ZIP directamente (una sola copia global)
                        if (archive) archive.append(staticRenders[tpl.index].img, { name: `cara_${tpl.index + 1}_estatica.${format}` });
                    } else if (format === 'pptx') {
                        const png = await puppeteerService.renderToImage(tpl.svgString, 'png');
                        staticRenders[tpl.index].pptx = await pptxService.generatePptx(png);
                        if (archive) archive.append(staticRenders[tpl.index].pptx, { name: `cara_${tpl.index + 1}_estatica.pptx` });
                    }
                }
            }
        }

        // 3. Renderizar cada fila (solo las plantillas que tienen variables)
        const renderPromises = dataRows.map((row, rowIdx) => async () => {
            const results = [];
            const pdfBuffersForPerson = [];

            for (const tpl of templatesInfo) {
                if (!tpl.hasVariables) {
                    // Si es estática, para imágenes ya se añadió al ZIP arriba.
                    // Para PDF, reutilizamos el buffer estático para intercalarlo en el archivo final.
                    if (formats.includes('pdf')) {
                        pdfBuffersForPerson.push(staticRenders[tpl.index].pdf);
                    }
                    continue;
                }

                // Es variable: parsear y renderizar para este usuario
                const parsedSvg = svgParserService.replaceVariables(tpl.svgString, row);
                const id = `doc_${rowIdx + 1}_cara_${tpl.index + 1}`;

                for (const format of formats) {
                    if (format === 'pdf') {
                        const pdfBuf = await puppeteerService.renderToPdf(parsedSvg);
                        pdfBuffersForPerson.push(pdfBuf);
                    } else if (format === 'png' || format === 'jpg') {
                        const imgBuf = await puppeteerService.renderToImage(parsedSvg, format);
                        results.push({ type: 'img', name: `${id}.${format}`, buffer: imgBuf });
                    } else if (format === 'pptx') {
                        const pngBuf = await puppeteerService.renderToImage(parsedSvg, 'png');
                        const pptxBuf = await pptxService.generatePptx(pngBuf);
                        results.push({ type: 'pptx', name: `${id}.pptx`, buffer: pptxBuf });
                    }
                }
            }

            // Unir todos los PDFs de esta persona en uno solo (ej. Frente y Reverso combinados)
            if (formats.includes('pdf') && pdfBuffersForPerson.length > 0) {
                const personPdf = pdfBuffersForPerson.length === 1 
                    ? pdfBuffersForPerson[0] 
                    : await pdfMergeService.mergePdfs(pdfBuffersForPerson);
                results.push({ type: 'pdf', name: `doc_${rowIdx + 1}.pdf`, buffer: personPdf });
            }

            return results;
        });

        const allResults = await puppeteerService.executeConcurrently(renderPromises, 3, archive);

        if (formats.includes('pdf')) {
            // Extraer PDFs por persona y unirlos todos en un master
            const pdfBuffers = allResults.map(resArray => {
                const pdfItem = resArray.find(i => i.type === 'pdf');
                return pdfItem ? pdfItem.buffer : null;
            }).filter(Boolean);

            const masterPdfBuffer = await pdfMergeService.mergePdfs(pdfBuffers);

            if (isOnlyPdf) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', 'attachment; filename=Documentos_Maestros.pdf');
                return res.end(masterPdfBuffer);
            } else {
                archive.append(masterPdfBuffer, { name: 'Documentos_Maestros.pdf' });
            }
        }

        if (archive) {
            await streamUtil.finalizeZip(archive);
        }

    } catch (error) {
        console.error('Error en generateDocuments:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Ocurrió un error al generar los documentos.' });
        } else {
            res.end();
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Previsualización: renderiza la primera fila del Excel con la ÚLTIMA plantilla
// (la que suele tener variables). Si solo hay una, usa esa.
// ─────────────────────────────────────────────────────────────────────────────
const previewDocument = async (req, res) => {
    try {
        const templateFiles = req.files['template'] || [];
        const dataFile = req.files['data'] ? req.files['data'][0] : null;

        if (!templateFiles.length || !dataFile) {
            return res.status(400).json({ error: 'Faltan archivos requeridos.' });
        }

        const dataRows = excelService.parseExcelBuffer(dataFile.buffer);
        if (!dataRows || dataRows.length === 0) {
            return res.status(400).json({ error: 'El Excel está vacío o no es válido.' });
        }

        let rowIndex = parseInt(req.body.rowIndex || 0, 10);
        if (isNaN(rowIndex) || rowIndex < 0 || rowIndex >= dataRows.length) {
            rowIndex = 0;
        }

        // Previsualizar con la última plantilla subida (más probable que tenga variables)
        const lastTemplate = templateFiles[templateFiles.length - 1];
        const svgWithFonts = await svgParserService.injectFontsToSVG(lastTemplate.buffer.toString('utf-8'));
        const parsedSvg = svgParserService.replaceVariables(svgWithFonts, dataRows[rowIndex]);

        const imgBuffer = await puppeteerService.renderToImage(parsedSvg, 'png');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('x-total-rows', dataRows.length.toString());
        return res.end(imgBuffer);

    } catch (error) {
        console.error('Error en previewDocument:', error);
        res.status(500).json({ error: 'Ocurrió un error al generar la previsualización.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Debug: devuelve el SVG procesado de la última plantilla como image/svg+xml
// ─────────────────────────────────────────────────────────────────────────────
const debugSvg = async (req, res) => {
    try {
        const templateFiles = req.files['template'] || [];
        const dataFile = req.files['data'] ? req.files['data'][0] : null;

        if (!templateFiles.length || !dataFile) {
            return res.status(400).json({ error: 'Faltan archivos requeridos.' });
        }

        const dataRows = excelService.parseExcelBuffer(dataFile.buffer);
        if (!dataRows || dataRows.length === 0) {
            return res.status(400).json({ error: 'El Excel está vacío o no es válido.' });
        }

        const lastTemplate = templateFiles[templateFiles.length - 1];
        const svgWithFonts = await svgParserService.injectFontsToSVG(lastTemplate.buffer.toString('utf-8'));
        const parsedSvg = svgParserService.replaceVariables(svgWithFonts, dataRows[0]);

        res.setHeader('Content-Type', 'image/svg+xml');
        return res.end(parsedSvg);

    } catch (error) {
        console.error('Error en debugSvg:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    generateDocuments,
    previewDocument,
    debugSvg
};
