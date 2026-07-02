const fs = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '../assets/fonts');

// ─────────────────────────────────────────────────────────────────────────────
// Inyección de fuentes embebidas en base64
// ─────────────────────────────────────────────────────────────────────────────
const injectFontsToSVG = async (svgString) => {
    try {
        if (!fs.existsSync(FONTS_DIR)) return svgString;
        const files = fs.readdirSync(FONTS_DIR);
        const fontFiles = files.filter(f => f.endsWith('.ttf') || f.endsWith('.woff2') || f.endsWith('.otf'));
        if (fontFiles.length === 0) return svgString;

        let fontFacesCSS = '';
        for (const file of fontFiles) {
            const fontPath = path.join(FONTS_DIR, file);
            const fontBuffer = fs.readFileSync(fontPath);
            const base64Font = fontBuffer.toString('base64');
            const ext = path.extname(file).toLowerCase();
            let format = 'truetype';
            if (ext === '.woff2') format = 'woff2';
            if (ext === '.otf') format = 'opentype';
            const fontFamily = path.basename(file, ext);

            fontFacesCSS += `
            @font-face {
                font-family: '${fontFamily}';
                src: url('data:font/${ext.replace('.', '')};charset=utf-8;base64,${base64Font}') format('${format}');
                font-weight: normal;
                font-style: normal;
            }
            `;
        }

        const styleTag = `<style>\n${fontFacesCSS}\n</style>`;
        const svgOpenTagMatch = svgString.match(/<svg[^>]*>/i);
        if (svgOpenTagMatch) {
            return svgString.replace(svgOpenTagMatch[0], `${svgOpenTagMatch[0]}\n${styleTag}`);
        }
        return svgString;
    } catch (error) {
        console.error('[svgParser] Error inyectando fuentes:', error);
        return svgString;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Extrae un atributo por nombre del string de atributos SVG.
// ─────────────────────────────────────────────────────────────────────────────
const getAttr = (attrs, name) => {
    const re = new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'i');
    const m = attrs.match(re);
    return m ? m[1] : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Parsea el bloque <style> del SVG y devuelve un mapa:
//   { 'cls-3': { fontSize: 10.97 }, 'cls-5': { fontSize: 30 }, ... }
// Soporta herencia de clases agrupadas (.cls-3, .cls-5 { ... }).
// ─────────────────────────────────────────────────────────────────────────────
const parseSvgCssClasses = (svgString) => {
    const classMap = {};
    const styleMatch = svgString.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    if (!styleMatch) return classMap;

    const css = styleMatch[1];

    // Extraer bloques de reglas: .cls-X { ... } o .cls-X, .cls-Y { ... }
    const ruleRegex = /((?:\.[^{,]+,?\s*)+)\{([^}]+)\}/g;
    let rule;
    while ((rule = ruleRegex.exec(css)) !== null) {
        const selectors = rule[1].trim();
        const declarations = rule[2];

        // Extraer font-size del bloque
        const fontSizeMatch = declarations.match(/font-size\s*:\s*([\d.]+)\s*(px|pt|em)?/i);
        const fontSize = fontSizeMatch ? parseFloat(fontSizeMatch[1]) : null;

        if (fontSize === null) continue;

        // Aplicar a cada selector del bloque
        const selectorList = selectors.split(',').map(s => s.trim().replace(/^\./, ''));
        for (const cls of selectorList) {
            if (!classMap[cls]) classMap[cls] = {};
            classMap[cls].fontSize = fontSize;
        }
    }

    console.log('[svgParser] CSS clases detectadas:', JSON.stringify(classMap));
    return classMap;
};

// ─────────────────────────────────────────────────────────────────────────────
// Calcula cuántos caracteres caben por línea dados:
//   - fontSize: tamaño de fuente en unidades SVG
//   - boxWidthSvg: ancho del cuadro de texto en unidades SVG
// Usa 0.52 como factor promedio (ancho de char / tamaño de fuente).
// Montserrat y fuentes similares tienen un factor de ~0.50-0.55.
// ─────────────────────────────────────────────────────────────────────────────
const calcCharsPerLine = (fontSize, boxWidthSvg) => {
    const avgCharWidth = fontSize * 0.52;
    const chars = Math.floor(boxWidthSvg / avgCharWidth);
    return Math.max(chars, 10); // mínimo 10 para evitar loops infinitos
};

// ─────────────────────────────────────────────────────────────────────────────
// Intenta detectar el ancho del cuadro de texto de Illustrator.
// Illustrator exporta área de texto con un clip-path que define el rectángulo,
// o con atributo textLength en el tspan.
// Fallback: 45% del ancho del viewBox (área típica de texto en una tarjeta).
// ─────────────────────────────────────────────────────────────────────────────
const getBoxWidth = (tspanAttrs, svgViewWidth) => {
    // 1. textLength explícito en el tspan (Illustrator área de texto)
    const textLength = getAttr(tspanAttrs, 'textLength');
    if (textLength && parseFloat(textLength) > 0) {
        return parseFloat(textLength);
    }
    // 2. width explícito
    const w = getAttr(tspanAttrs, 'width');
    if (w && parseFloat(w) > 0) return parseFloat(w);

    // 3. Fallback: 45% del ancho del SVG
    return svgViewWidth * 0.45;
};

// ─────────────────────────────────────────────────────────────────────────────
// Obtiene el ancho del viewBox del SVG raíz.
// ─────────────────────────────────────────────────────────────────────────────
const getSvgViewWidth = (svgString) => {
    const svgTagMatch = svgString.match(/<svg([^>]*)>/i);
    if (!svgTagMatch) return 1080;
    const attrs = svgTagMatch[1];
    const vb = getAttr(attrs, 'viewBox');
    if (vb) {
        const parts = vb.trim().split(/[\s,]+/);
        if (parts.length === 4) return parseFloat(parts[2]) || 1080;
    }
    return parseFloat(getAttr(attrs, 'width')) || 1080;
};

// ─────────────────────────────────────────────────────────────────────────────
// Genera múltiples <tspan> para word-wrap.
//   Primer tspan: y="yBase" (posición absoluta original)
//   Resto:        dy="1.2em" (relativo al font-size, se adapta automáticamente)
// ─────────────────────────────────────────────────────────────────────────────
const buildTspans = (text, xAnchor, yBase, charsPerLine, fontSizeStyle = '') => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        const candidate = currentLine ? `${currentLine} ${word}` : word;
        if (candidate.length > charsPerLine && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = candidate;
        }
    }
    if (currentLine) lines.push(currentLine);

    const styleAttr = fontSizeStyle ? ` style="${fontSizeStyle}"` : '';

    return lines.map((line, i) => {
        if (i === 0) return `<tspan x="${xAnchor}" y="${yBase}"${styleAttr}>${line}</tspan>`;
        return `<tspan x="${xAnchor}" dy="1.2em"${styleAttr}>${line}</tspan>`;
    }).join('\n');
};

// ─────────────────────────────────────────────────────────────────────────────
// Pre-procesa el SVG para unir tspans fragmentados por Illustrator.
// Illustrator a veces exporta "{{Puesto}}" dividido en múltiples <tspan>:
//   <tspan>{{</tspan><tspan>Puesto</tspan><tspan>}}</tspan>
// Esta función detecta esos casos y une los tspans en uno solo.
// ─────────────────────────────────────────────────────────────────────────────
const preprocessSvgPlaceholders = (svgString) => {
    return svgString.replace(/<text([^>]*)>([\s\S]*?)<\/text>/gi, (fullMatch, textAttrs, innerContent) => {
        // Texto plano combinado de todos los tspans (sin etiquetas)
        const flatText = innerContent.replace(/<[^>]+>/g, '');

        // Si el texto combinado no contiene ningún placeholder completo → no tocar
        const flatPlaceholders = flatText.match(/\{\{[^}]+\}\}/g);
        if (!flatPlaceholders) return fullMatch;

        // Verificar si cada placeholder del texto combinado aparece COMPLETO en algún tspan individual.
        // Si no: el placeholder está fragmentado (por kerning auto, por carácter, etc.)
        const tspans = [...innerContent.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/gi)];
        const tspanContents = tspans.map(([, , content]) => content);

        const allFoundInSingleTspan = flatPlaceholders.every(ph =>
            tspanContents.some(content => content.includes(ph))
        );

        if (allFoundInSingleTspan) return fullMatch; // Todos completos → no tocar

        // Hay placeholders fragmentados (kerning auto, split por carácter, etc.)
        // → Unir todos los tspans en uno solo usando los atributos posicionales del primero
        const firstTspan = tspans[0];
        if (!firstTspan) return fullMatch;
        const firstAttrs = firstTspan[1];

        console.log(`[svgParser] 🔧 Uniendo tspans fragmentados: "${flatText.trim()}"`);
        return `<text${textAttrs}><tspan${firstAttrs}>${flatText}</tspan></text>`;
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// Reemplaza variables {{CLAVE}} en el SVG.
// Opera a nivel <tspan> individual para respetar la posición de cada elemento.
// ─────────────────────────────────────────────────────────────────────────────
const replaceVariables = (svgString, rowData) => {
    console.log('\n[svgParser] ══════════════════════════════════════════');
    console.log('[svgParser] Datos:', JSON.stringify(rowData));
    console.log('[svgParser] ══════════════════════════════════════════\n');

    if (!svgString.includes('<svg')) {
        console.error('[svgParser] ERROR: el string no contiene <svg>.');
        return svgString;
    }

    // Parsear CSS del SVG para obtener font-sizes reales
    const cssClasses = parseSvgCssClasses(svgString);
    const svgViewWidth = getSvgViewWidth(svgString);
    console.log(`[svgParser] ViewBox width: ${svgViewWidth}px`);

    // Pre-procesar: unir tspans fragmentados por Illustrator
    let newSvg = preprocessSvgPlaceholders(svgString);

    // ── Extraer todos los placeholders presentes en el SVG ──────────────────
    // Ejemplo: {{Puesto}}, {{Telefono}}, {{Correo}}, {{Nombre}}
    const svgPlaceholders = [...new Set((newSvg.match(/\{\{([^}]+)\}\}/g) || []))];
    console.log('[svgParser] Placeholders en SVG:', svgPlaceholders);

    // Normalizar: quitar tildes y bajar a minúsculas para comparación
    const normalize = (str) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    // Construir mapa: placeholderKey (como en SVG) → valor del Excel
    // Permite que columna "puesto" matchee con {{Puesto}}
    const resolvedData = {};
    for (const ph of svgPlaceholders) {
        const phKey = ph.slice(2, -2); // quitar {{ }}
        const phNorm = normalize(phKey);
        // Buscar en rowData la clave que normalizada sea igual
        const matchedExcelKey = Object.keys(rowData).find(k => normalize(k) === phNorm);
        if (matchedExcelKey !== undefined) {
            resolvedData[phKey] = rowData[matchedExcelKey];
            if (matchedExcelKey !== phKey) {
                console.log(`[svgParser] 🔗 Mapeando columna Excel "${matchedExcelKey}" → placeholder "{{${phKey}}}"`);
            }
        } else {
            console.warn(`[svgParser] ⚠️  No hay columna en Excel para "{{${phKey}}}"`);
        }
    }

    for (const key of Object.keys(resolvedData)) {
        const val = (resolvedData[key] != null ? resolvedData[key] : '').toString().trim();
        const placeholder = `{{${key}}}`;

        if (!newSvg.includes(placeholder)) {
            console.log(`[svgParser] ⚠️  "${placeholder}" no encontrado.`);
            continue;
        }

        console.log(`[svgParser] ✅ "${placeholder}" → "${val}" (${val.length} chars)`);

        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\{\\{${escapedKey}\\}\\}`, 'g');

        // ── PASO 1: Buscar y reemplazar el <tspan> específico ─────────────────
        const tspanRegex = new RegExp(
            `<tspan([^>]*)>([^<]*\\{\\{${escapedKey}\\}\\}[^<]*)<\\/tspan>`,
            'gi'
        );

        let matched = false;
        newSvg = newSvg.replace(tspanRegex, (match, tspanAttrs, tspanContent) => {
            matched = true;

            const xVal = getAttr(tspanAttrs, 'x') || '0';
            const yVal = getAttr(tspanAttrs, 'y') || '0';
            const plainText = tspanContent.replace(regex, val).trim();

            const tspanClass = getAttr(tspanAttrs, 'class') || '';

            // Buscar font-size en las clases del tspan; si no, usar font-size inline
            let fontSize = null;
            for (const cls of tspanClass.split(/\s+/)) {
                if (cssClasses[cls]?.fontSize) {
                    fontSize = cssClasses[cls].fontSize;
                    break;
                }
            }

            // Si no encontramos en el tspan, buscar en el <text> padre (en el SVG actual)
            if (!fontSize) {
                // Buscar el nodo <text> que contiene este tspan para obtener su clase
                const surroundingMatch = newSvg.match(
                    new RegExp(`<text([^>]*)>[^<]*(?:<tspan[^>]*>[^<]*)*${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
                );
                if (surroundingMatch) {
                    const textClass = getAttr(surroundingMatch[1], 'class') || '';
                    for (const cls of textClass.split(/\s+/)) {
                        if (cssClasses[cls]?.fontSize) {
                            fontSize = cssClasses[cls].fontSize;
                            break;
                        }
                    }
                }
            }

            // Fallback: font-size genérico si no se pudo leer del CSS
            if (!fontSize) {
                fontSize = 12;
                console.warn(`[svgParser] ⚠️  font-size no encontrado para "${key}". Usando ${fontSize}px.`);
            }

            const boxWidth = getBoxWidth(tspanAttrs, svgViewWidth);

            // Determinar si es un campo de una sola línea (Nombre, Puesto, Correo, etc.)
            const singleLineKeys = ['nombre', 'puesto', 'telefono', 'correo', 'email', 'phone', 'celular', 'web', 'url', 'sitio', 'address', 'direccion'];
            const isSingleLine = singleLineKeys.some(k => normalize(key).includes(k)) || plainText.trim().length < 40 || !plainText.trim().includes(' ');

            if (isSingleLine) {
                const textWidth = plainText.length * (fontSize * 0.52);
                if (textWidth > boxWidth) {
                    let newFontSize = boxWidth / (plainText.length * 0.52);
                    const minFontSize = fontSize * 0.5; // No reducir más del 50%
                    if (newFontSize < minFontSize) newFontSize = minFontSize;
                    newFontSize = Math.round(newFontSize * 100) / 100;

                    console.log(`[svgParser] 📐 Auto-scale "${key}": fontSize ${fontSize}px -> ${newFontSize}px (textWidth ${Math.round(textWidth)}px > boxWidth ${Math.round(boxWidth)}px)`);
                    
                    let updatedAttrs = tspanAttrs;
                    const styleAttr = getAttr(tspanAttrs, 'style');
                    if (styleAttr) {
                        if (styleAttr.includes('font-size')) {
                            const updatedStyle = styleAttr.replace(/font-size\s*:\s*[^;]+(;?)/i, `font-size: ${newFontSize}px$1`);
                            updatedAttrs = updatedAttrs.replace(`style="${styleAttr}"`, `style="${updatedStyle}"`);
                        } else {
                            const updatedStyle = styleAttr.endsWith(';') ? `${styleAttr} font-size: ${newFontSize}px;` : `${styleAttr}; font-size: ${newFontSize}px;`;
                            updatedAttrs = updatedAttrs.replace(`style="${styleAttr}"`, `style="${updatedStyle}"`);
                        }
                    } else {
                        updatedAttrs = `${updatedAttrs} style="font-size: ${newFontSize}px;"`;
                    }
                    return `<tspan${updatedAttrs}>${plainText}</tspan>`;
                } else {
                    console.log(`[svgParser] 🔤 Corto "${key}": x=${xVal} y=${yVal}`);
                    return `<tspan${tspanAttrs}>${plainText}</tspan>`;
                }
            }

            // Caso Multi-línea (Textarea / Descripciones): Word-wrap
            let charsPerLine = calcCharsPerLine(fontSize, boxWidth);
            let estimatedLines = Math.ceil(plainText.length / charsPerLine);
            let adjustedFontSize = fontSize;
            let fontSizeStyle = '';

            // Si tiene muchas líneas, reducimos un poco el tamaño de fuente para evitar desborde vertical
            if (estimatedLines > 3) {
                adjustedFontSize = fontSize * 0.85; // reducir 15%
                if (estimatedLines > 6) adjustedFontSize = fontSize * 0.7; // reducir 30%
                adjustedFontSize = Math.round(adjustedFontSize * 100) / 100;
                charsPerLine = calcCharsPerLine(adjustedFontSize, boxWidth);
                fontSizeStyle = `font-size: ${adjustedFontSize}px;`;
                console.log(`[svgParser] 📐 Escalamiento multilínea para "${key}": ${fontSize}px -> ${adjustedFontSize}px`);
            }

            console.log(`[svgParser] 📐 Word-wrap "${key}": fontSize=${adjustedFontSize}px boxWidth=${Math.round(boxWidth)}px → charsPerLine=${charsPerLine}`);

            const tspans = buildTspans(plainText, xVal, yVal, charsPerLine, fontSizeStyle);
            const lineCount = tspans.split('<tspan').length - 1;
            console.log(`[svgParser]    → ${lineCount} líneas generadas`);

            return tspans;
        });

        if (matched) continue;

        // ── PASO 2: Fallback — placeholder en <text> sin <tspan> ─────────────
        const textNodeRegex = new RegExp(
            `<text((?:[^>]|\\n)*?)>([^<]*\\{\\{${escapedKey}\\}\\}[^<]*)<\\/text>`,
            'gi'
        );

        newSvg = newSvg.replace(textNodeRegex, (match, attrs, content) => {
            matched = true;
            const plainText = content.replace(regex, val).trim();
            const textClass = getAttr(attrs, 'class') || '';
            let fontSize = 12;
            for (const cls of textClass.split(/\s+/)) {
                if (cssClasses[cls]?.fontSize) { fontSize = cssClasses[cls].fontSize; break; }
            }

            const boxWidth = svgViewWidth * 0.45;
            const singleLineKeys = ['nombre', 'puesto', 'telefono', 'correo', 'email', 'phone', 'celular', 'web', 'url', 'sitio', 'address', 'direccion'];
            const isSingleLine = singleLineKeys.some(k => normalize(key).includes(k));

            if (isSingleLine) {
                const textWidth = plainText.length * (fontSize * 0.52);
                if (textWidth > boxWidth) {
                    let newFontSize = boxWidth / (plainText.length * 0.52);
                    const minFontSize = fontSize * 0.5;
                    if (newFontSize < minFontSize) newFontSize = minFontSize;
                    newFontSize = Math.round(newFontSize * 100) / 100;

                    console.log(`[svgParser] 📐 Auto-scale (Fallback) "${key}": fontSize ${fontSize}px -> ${newFontSize}px`);

                    let updatedAttrs = attrs;
                    const styleAttr = getAttr(attrs, 'style');
                    if (styleAttr) {
                        if (styleAttr.includes('font-size')) {
                            const updatedStyle = styleAttr.replace(/font-size\s*:\s*[^;]+(;?)/i, `font-size: ${newFontSize}px$1`);
                            updatedAttrs = updatedAttrs.replace(`style="${styleAttr}"`, `style="${updatedStyle}"`);
                        } else {
                            const updatedStyle = styleAttr.endsWith(';') ? `${styleAttr} font-size: ${newFontSize}px;` : `${styleAttr}; font-size: ${newFontSize}px;`;
                            updatedAttrs = updatedAttrs.replace(`style="${styleAttr}"`, `style="${updatedStyle}"`);
                        }
                    } else {
                        updatedAttrs = `${updatedAttrs} style="font-size: ${newFontSize}px;"`;
                    }
                    return `<text${updatedAttrs}>${plainText}</text>`;
                }
                return `<text${attrs}>${plainText}</text>`;
            }

            const xVal = getAttr(attrs, 'x') || '0';
            const yVal = getAttr(attrs, 'y') || '0';
            let charsPerLine = calcCharsPerLine(fontSize, boxWidth);
            let estimatedLines = Math.ceil(plainText.length / charsPerLine);
            let adjustedFontSize = fontSize;
            let fontSizeStyle = '';

            if (estimatedLines > 3) {
                adjustedFontSize = fontSize * 0.85;
                if (estimatedLines > 6) adjustedFontSize = fontSize * 0.7;
                adjustedFontSize = Math.round(adjustedFontSize * 100) / 100;
                charsPerLine = calcCharsPerLine(adjustedFontSize, boxWidth);
                fontSizeStyle = `font-size: ${adjustedFontSize}px;`;
            }

            return `<text${attrs}>${buildTspans(plainText, xVal, yVal, charsPerLine, fontSizeStyle)}</text>`;
        });

        if (!matched) {
            console.warn(`[svgParser] ⚠️  "${placeholder}" no encontrado en tspan/text. Reemplazo crudo.`);
            newSvg = newSvg.replace(regex, val);
        }
    }

    const remaining = newSvg.match(/\{\{[^}]+\}\}/g);
    if (remaining) console.warn('[svgParser] ⚠️  Sin reemplazar:', remaining);
    else console.log('[svgParser] ✅ Todos los placeholders reemplazados.');

    return newSvg;
};

module.exports = {
    injectFontsToSVG,
    replaceVariables
};
