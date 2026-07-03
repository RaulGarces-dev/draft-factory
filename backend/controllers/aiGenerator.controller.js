const geminiService = require('../services/gemini.service');
const excelService = require('../services/excel.service');
const svgParserService = require('../services/svgParser.service');
const xlsx = require('xlsx');

// Extraer variables únicas del SVG
const extractVariables = async (req, res) => {
    try {
        const svgFile = req.files && req.files['template'] ? req.files['template'][0] : null;
        if (!svgFile) {
            return res.status(400).json({ error: 'Falta la plantilla SVG.' });
        }

        const svgString = svgFile.buffer.toString('utf-8');
        // Unir tspans fragmentados por Illustrator antes de extraer las llaves
        const cleanedSvg = svgParserService.preprocessSvgPlaceholders(svgString);
        
        // Excluir tags HTML que puedan quedar atrapados si la llaves siguen rotas por otras razones
        const matches = [...cleanedSvg.matchAll(/\{\{([^}]+)\}\}/g)];
        const textVariables = matches.map(m => {
            const cleanKey = m[1].replace(/<[^>]+>/g, '').trim(); // Quitar cualquier tag residual
            return cleanKey;
        }).filter(Boolean);

        // Extraer variables desde etiquetas <image> estáticas
        const imageVariables = [];
        const imageMatches = [...cleanedSvg.matchAll(/<image([^>]*?)>/gi)];
        
        const getAttrLocal = (attrs, name) => {
            const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']*)["']`, 'i');
            const m = attrs.match(re);
            return m ? m[1] : null;
        };

        for (const match of imageMatches) {
            const attrs = match[1];
            const id = getAttrLocal(attrs, 'id') || '';
            const href = getAttrLocal(attrs, 'href') || getAttrLocal(attrs, 'xlink:href') || '';
            
            // Limpiar prefijos de Illustrator y guiones bajos redundantes
            const cleanId = id.trim();
            const nameForVar = cleanId.replace(/^_[xX][0-9a-fA-F]{2,4}_/g, '').replace(/^_+/, '').replace(/_+$/, '');
            
            // Verificar si es un ID genérico
            const isGeneric = /^(image|img|layer|g|path|rect|circle|ellipse|line|polyline|polygon|text|tspan|st)[_\d-]*$/i.test(nameForVar);
            
            if (nameForVar && !isGeneric) {
                imageVariables.push(nameForVar);
            } else if (href && !href.startsWith('data:')) {
                // Tratar de inferir del nombre del archivo en el href (ej: logo_setchf.png -> logo, etc.)
                const filename = href.split('/').pop().split('?')[0];
                const dotIdx = filename.lastIndexOf('.');
                const cleanFilename = dotIdx !== -1 ? filename.substring(0, dotIdx).toLowerCase() : filename.toLowerCase();
                
                // Si el nombre del archivo contiene palabras clave comunes
                const matchedKeyword = cleanFilename.match(/(logo|imagen|foto|img|pic|brand|marca)/i);
                if (matchedKeyword) {
                    imageVariables.push(matchedKeyword[0].toLowerCase());
                } else if (cleanFilename) {
                    // Si tiene un nombre personalizado, lo añadimos
                    imageVariables.push(cleanFilename);
                }
            }
        }

        const variables = [...new Set([...textVariables, ...imageVariables])];

        console.log(`[aiGenerator] Variables encontradas en SVG (procesado):`, variables);
        return res.json({ variables });
    } catch (error) {
        console.error('Error en extractVariables:', error);
        res.status(500).json({ error: 'Ocurrió un error al extraer las variables del SVG.' });
    }
};

// Generar filas autocompletadas con IA
const generateAiRows = async (req, res) => {
    try {
        const dataFile = req.files && req.files['data'] ? req.files['data'][0] : null;
        const variablesStr = req.body.variables; // pasadas como string JSON
        const promptText = req.body.prompt || '';
        const rawText = req.body.rawText || '';
        let filePart = null;

        if (!variablesStr) {
            return res.status(400).json({ error: 'Falta la lista de variables.' });
        }

        const variables = JSON.parse(variablesStr);
        let referenceContent = rawText;

        if (dataFile) {
            const ext = dataFile.originalname.split('.').pop().toLowerCase();
            if (ext === 'txt') {
                referenceContent = dataFile.buffer.toString('utf-8');
            } else if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') {
                const workbook = xlsx.read(dataFile.buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                // Convertir a formato CSV para que la IA lo lea fácilmente
                referenceContent = xlsx.utils.sheet_to_csv(sheet);
            } else if (ext === 'pdf' || ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
                referenceContent = `Por favor, extrae la información del documento/imagen adjunto. ${rawText}`;
                filePart = {
                    inlineData: {
                        data: dataFile.buffer.toString("base64"),
                        mimeType: dataFile.mimetype || 'application/pdf'
                    }
                };
            } else {
                referenceContent = dataFile.buffer.toString('utf-8'); // Fallback
            }
        }

        if (!referenceContent.trim()) {
            return res.status(400).json({ error: 'No se proporcionó información de referencia (archivo o texto).' });
        }

        console.log(`[aiGenerator] Generando filas por IA para variables:`, variables);
        const rows = await geminiService.generateRowsWithAI(variables, referenceContent, promptText, filePart);
        console.log(`[aiGenerator] ✅ IA generó ${rows.length} fila(s).`);

        return res.json({ rows });
    } catch (error) {
        console.error('Error en generateAiRows:', error);
        res.status(500).json({ error: error.message || 'Error interno al generar las filas con IA.' });
    }
};

module.exports = {
    extractVariables,
    generateAiRows
};
