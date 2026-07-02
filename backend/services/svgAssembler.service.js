const fs = require('fs');
const path = require('path');
const { injectFontsToSVG } = require('./svgParser.service');

const LOGOS_DIR = path.join(__dirname, '../assets/modules/logos');

/**
 * Ensambla el SVG basado en las instrucciones de composición generativa de la IA.
 * @param {Object} instruccionIA JSON validado de la IA
 * @returns {Promise<String>} String SVG ensamblado y con fuentes embebidas
 */
async function ensamblar(instruccionIA) {
  const { color_acento, estilo, composicion } = instruccionIA;

  // 1. Generar Defs (Gradientes, Filtros, Estilos CSS)
  let defsContent = '';

  // Degradados
  if (estilo.degradados && estilo.degradados.length > 0) {
    for (const grad of estilo.degradados) {
      if (grad.tipo === 'linear') {
        const x1 = grad.x1 || '0%';
        const y1 = grad.y1 || '0%';
        const x2 = grad.x2 || '100%';
        const y2 = grad.y2 || '0%';
        defsContent += `    <linearGradient id="${grad.id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">\n`;
      } else {
        const cx = grad.cx || '50%';
        const cy = grad.cy || '50%';
        const r = grad.r || '50%';
        defsContent += `    <radialGradient id="${grad.id}" cx="${cx}" cy="${cy}" r="${r}">\n`;
      }

      for (const stop of grad.stops) {
        const opacityAttr = stop.opacity !== undefined ? ` stop-opacity="${stop.opacity}"` : '';
        defsContent += `      <stop offset="${stop.offset}" stop-color="${stop.color}"${opacityAttr} />\n`;
      }

      if (grad.tipo === 'linear') {
        defsContent += `    </linearGradient>\n`;
      } else {
        defsContent += `    </radialGradient>\n`;
      }
    }
  }

  // Filtros de sombra / resplandor
  if (estilo.filtros && estilo.filtros.length > 0) {
    for (const filter of estilo.filtros) {
      defsContent += `    <filter id="${filter.id}" x="-20%" y="-20%" width="140%" height="140%">\n`;
      if (filter.tipo === 'dropShadow') {
        const dx = filter.dx !== undefined ? filter.dx : 0;
        const dy = filter.dy !== undefined ? filter.dy : 4;
        const stdDeviation = filter.stdDeviation !== undefined ? filter.stdDeviation : 8;
        const floodColor = filter.floodColor || '#000000';
        const floodOpacity = filter.floodOpacity !== undefined ? filter.floodOpacity : 0.35;
        defsContent += `      <feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${stdDeviation}" flood-color="${floodColor}" flood-opacity="${floodOpacity}" />\n`;
      } else if (filter.tipo === 'gaussianBlur') {
        const stdDeviation = filter.stdDeviation !== undefined ? filter.stdDeviation : 5;
        defsContent += `      <feGaussianBlur stdDeviation="${stdDeviation}" result="blur"/>\n`;
        defsContent += `      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>\n`;
      }
      defsContent += `    </filter>\n`;
    }
  }

  // Clases CSS e inyección de variables dinámicas de acento
  let cssRules = `
    .color-acento { fill: ${color_acento} !important; }
    .color-acento-stroke { stroke: ${color_acento} !important; }
  `;
  if (estilo.clasesCSS) {
    for (const [className, rules] of Object.entries(estilo.clasesCSS)) {
      cssRules += `    .${className} { ${rules} }\n`;
    }
  }
  defsContent += `    <style>\n${cssRules}\n    </style>\n`;

  // 2. Construir los elementos de la composición vectorial
  let elementsContent = '';

  for (const el of composicion) {
    const classAttr = el.className ? ` class="${el.className}"` : '';
    const filterAttr = el.filter ? ` filter="${el.filter}"` : '';
    const fillAttr = el.fill ? ` fill="${el.fill}"` : '';
    const strokeAttr = el.stroke ? ` stroke="${el.stroke}"` : '';
    const strokeWidthAttr = el.strokeWidth !== undefined ? ` stroke-width="${el.strokeWidth}"` : '';
    const opacityAttr = el.opacity !== undefined ? ` opacity="${el.opacity}"` : '';

    switch (el.tipo) {
      case 'rect': {
        const rx = el.rx !== undefined ? ` rx="${el.rx}"` : '';
        const ry = el.ry !== undefined ? ` ry="${el.ry}"` : '';
        elementsContent += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}"${rx}${ry}${fillAttr}${strokeAttr}${strokeWidthAttr}${opacityAttr}${classAttr}${filterAttr} />\n`;
        break;
      }
      case 'circle': {
        elementsContent += `  <circle cx="${el.cx}" cy="${el.cy}" r="${el.r}"${fillAttr}${strokeAttr}${strokeWidthAttr}${opacityAttr}${classAttr}${filterAttr} />\n`;
        break;
      }
      case 'path': {
        elementsContent += `  <path d="${el.d}"${fillAttr}${strokeAttr}${strokeWidthAttr}${opacityAttr}${classAttr}${filterAttr} />\n`;
        break;
      }
      case 'line': {
        elementsContent += `  <line x1="${el.x1}" y1="${el.y1}" x2="${el.x2}" y2="${el.y2}"${strokeAttr}${strokeWidthAttr}${opacityAttr}${classAttr} />\n`;
        break;
      }
      case 'polygon': {
        elementsContent += `  <polygon points="${el.points}"${fillAttr}${strokeAttr}${strokeWidthAttr}${opacityAttr}${classAttr}${filterAttr} />\n`;
        break;
      }
      case 'ellipse': {
        elementsContent += `  <ellipse cx="${el.cx}" cy="${el.cy}" rx="${el.rx}" ry="${el.ry}"${fillAttr}${strokeAttr}${strokeWidthAttr}${opacityAttr}${classAttr}${filterAttr} />\n`;
        break;
      }
      case 'text': {
        const fontSz = el.fontSize !== undefined ? ` font-size="${el.fontSize}"` : '';
        const fontWt = el.fontWeight !== undefined ? ` font-weight="${el.fontWeight}"` : '';
        const fontFam = el.fontFamily !== undefined ? ` font-family="${el.fontFamily}"` : '';
        const textAnchor = el.textAnchor !== undefined ? ` text-anchor="${el.textAnchor}"` : '';
        const letterSpacing = el.letterSpacing !== undefined ? ` letter-spacing="${el.letterSpacing}"` : '';
        elementsContent += `  <text x="${el.x}" y="${el.y}"${fontSz}${fontWt}${fontFam}${fillAttr}${textAnchor}${letterSpacing}${opacityAttr}${classAttr}${filterAttr}>${el.contenido}</text>\n`;
        break;
      }
      case 'foreignObject': {
        const styleAttr = el.style ? ` style="${el.style}"` : '';
        elementsContent += `  <foreignObject x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}"${classAttr}>\n`;
        elementsContent += `    <div xmlns="http://www.w3.org/1999/xhtml"${styleAttr}>\n`;
        elementsContent += `      ${el.contenido}\n`;
        elementsContent += `    </div>\n`;
        elementsContent += `  </foreignObject>\n`;
        break;
      }
      case 'logo': {
        // Carga dinámica del logo Garza
        const logoFile = el.logo_id || 'logo_garza.svg';
        const logoPath = path.join(LOGOS_DIR, logoFile);
        if (fs.existsSync(logoPath)) {
          let logoContent = fs.readFileSync(logoPath, 'utf8');
          // Limpiar declaraciones XML si las hubiera
          logoContent = logoContent.replace(/<\?xml[^>]*\?>/gi, '');
          
          const lx = el.x !== undefined ? el.x : 800;
          const ly = el.y !== undefined ? el.y : 80;
          const lw = el.width !== undefined ? el.width : 200;
          const lh = el.height !== undefined ? el.height : 60;
          
          // Reemplazar x, y, width y height en el tag svg del logo
          logoContent = logoContent.replace(/<svg([^>]*)>/i, (match, attrs) => {
            let newAttrs = attrs
              .replace(/\s+x="[^"]*"/gi, '')
              .replace(/\s+y="[^"]*"/gi, '')
              .replace(/\s+width="[^"]*"/gi, '')
              .replace(/\s+height="[^"]*"/gi, '');
            return `<svg${newAttrs} x="${lx}" y="${ly}" width="${lw}" height="${lh}">`;
          });
          
          elementsContent += `\n  <!-- Logo Corporativo: ${logoFile} -->\n  ${logoContent}\n`;
        } else {
          console.warn(`[svgAssembler] Logo no encontrado: ${logoFile}`);
        }
        break;
      }
    }
  }

  // 3. Ensamblar estructura final SVG
  let svgString = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" viewBox="0 0 1080 1080" width="1080" height="1080">
  <defs>
${defsContent}  </defs>
${elementsContent}</svg>`;

  // 4. Inyectar fuentes base64 corporativas de Garza antes de renderizar
  svgString = await injectFontsToSVG(svgString);

  return svgString;
}

module.exports = {
  ensamblar
};
