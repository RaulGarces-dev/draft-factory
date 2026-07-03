const excelService = require('../services/excel.service');
const svgParserService = require('../services/svgParser.service');
const puppeteerService = require('../services/puppeteer.service');
const pptxService = require('../services/pptx.service');
const pdfMergeService = require('../services/pdfMerge.service');
const streamUtil = require('../utils/stream.util');

// Helper para convertir el lote de imágenes subidas en un mapa indexado por nombre de archivo
const buildImagesMap = (req) => {
    const imagesMap = {};
    const imageFiles = req.files && req.files['images'] ? req.files['images'] : [];
    for (const file of imageFiles) {
        const base64 = file.buffer.toString('base64');
        const ext = file.originalname.split('.').pop().toLowerCase();
        let mimeType = `image/${ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext}`;
        if (ext === 'svg') mimeType = 'image/svg+xml';
        // Guardamos indexando por el nombre de archivo en minúsculas
        imagesMap[file.originalname.toLowerCase().trim()] = `data:${mimeType};base64,${base64}`;
    }
    return imagesMap;
};

// Helper para resolver nombres de imágenes en rowData convirtiéndolos a Base64 si se subieron en el lote
const resolveImageVariables = (rowData, imagesMap) => {
    const resolved = { ...rowData };
    const findUploadedImage = (filename) => {
        if (!filename) return null;
        const cleanName = filename.toLowerCase().trim();
        // Coincidencia exacta
        if (imagesMap[cleanName]) return imagesMap[cleanName];
        
        // Coincidencia sin extensión
        const keys = Object.keys(imagesMap);
        for (const key of keys) {
            const lastDot = key.lastIndexOf('.');
            const keyWithoutExt = lastDot !== -1 ? key.substring(0, lastDot) : key;
            if (keyWithoutExt === cleanName) {
                return imagesMap[key];
            }
        }
        return null;
    };

    for (const key of Object.keys(resolved)) {
        const val = resolved[key];
        if (val && typeof val === 'string' && !val.startsWith('http') && !val.startsWith('data:')) {
            const imgDataUri = findUploadedImage(val);
            if (imgDataUri) {
                resolved[key] = imgDataUri;
            }
        }
    }
    return resolved;
};

// Helper para obtener las filas de datos desde excel o json
const extractDataRows = (req) => {
    const dataFile = req.files && req.files['data'] ? req.files['data'][0] : null;
    const rowsJson = req.body.rows;
    if (rowsJson) {
        return JSON.parse(rowsJson);
    } else if (dataFile) {
        return excelService.parseExcelBuffer(dataFile.buffer);
    }
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Genera documentos para todas las filas.
// ─────────────────────────────────────────────────────────────────────────────
const generateDocuments = async (req, res) => {
    try {
        const templateFiles = req.files && req.files['template'] ? req.files['template'] : [];
        const formats = req.body.formats ? req.body.formats.split(',') : ['pdf'];
        const dataRows = extractDataRows(req);

        if (!templateFiles.length || !dataRows || dataRows.length === 0) {
            return res.status(400).json({ error: 'Faltan archivos o datos requeridos.' });
        }

        console.log(`[controller] ${templateFiles.length} plantilla(s), ${dataRows.length} fila(s)`);

        const imagesMap = buildImagesMap(req);

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
            try {
                const results = [];
                const pdfBuffersForPerson = [];

                // Resolver nombres de imágenes a Base64 para esta fila
                const resolvedRow = resolveImageVariables(row, imagesMap);

                for (const tpl of templatesInfo) {
                    if (!tpl.hasVariables) {
                        if (formats.includes('pdf')) {
                            pdfBuffersForPerson.push(staticRenders[tpl.index].pdf);
                        }
                        continue;
                    }

                    // Es variable: parsear y renderizar
                    const parsedSvg = svgParserService.replaceVariables(tpl.svgString, resolvedRow);
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

                if (formats.includes('pdf') && pdfBuffersForPerson.length > 0) {
                    const personPdf = pdfBuffersForPerson.length === 1 
                        ? pdfBuffersForPerson[0] 
                        : await pdfMergeService.mergePdfs(pdfBuffersForPerson);
                    results.push({ type: 'pdf', name: `doc_${rowIdx + 1}.pdf`, buffer: personPdf });
                }

                return results;
            } catch (cardError) {
                console.error(`[controller] Error procesando fila ${rowIdx + 1}:`, cardError);
                return [];
            }
        });

        const allResults = await puppeteerService.executeConcurrently(renderPromises, 3, archive);

        if (formats.includes('pdf')) {
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
// Previsualización: renderiza la fila elegida con la última plantilla
// ─────────────────────────────────────────────────────────────────────────────
const previewDocument = async (req, res) => {
    try {
        const templateFiles = req.files && req.files['template'] ? req.files['template'] : [];
        const dataRows = extractDataRows(req);

        if (!templateFiles.length || !dataRows || dataRows.length === 0) {
            return res.status(400).json({ error: 'Faltan archivos o datos requeridos.' });
        }

        let rowIndex = parseInt(req.body.rowIndex || 0, 10);
        if (isNaN(rowIndex) || rowIndex < 0 || rowIndex >= dataRows.length) {
            rowIndex = 0;
        }

        const imagesMap = buildImagesMap(req);
        const resolvedRow = resolveImageVariables(dataRows[rowIndex], imagesMap);

        const lastTemplate = templateFiles[templateFiles.length - 1];
        require('fs').writeFileSync('debug_uploaded.svg', lastTemplate.buffer);
        const svgWithFonts = await svgParserService.injectFontsToSVG(lastTemplate.buffer.toString('utf-8'));
        const parsedSvg = svgParserService.replaceVariables(svgWithFonts, resolvedRow);
        require('fs').writeFileSync('debug_parsed.svg', parsedSvg);

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
        const templateFiles = req.files && req.files['template'] ? req.files['template'] : [];
        const dataRows = extractDataRows(req);

        if (!templateFiles.length || !dataRows || dataRows.length === 0) {
            return res.status(400).json({ error: 'Faltan archivos o datos requeridos.' });
        }

        const imagesMap = buildImagesMap(req);
        const resolvedRow = resolveImageVariables(dataRows[0], imagesMap);

        const lastTemplate = templateFiles[templateFiles.length - 1];
        const svgWithFonts = await svgParserService.injectFontsToSVG(lastTemplate.buffer.toString('utf-8'));
        const parsedSvg = svgParserService.replaceVariables(svgWithFonts, resolvedRow);

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
