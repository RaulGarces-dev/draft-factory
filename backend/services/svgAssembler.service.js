const fs = require('fs');
const path = require('path');
const { replaceVariables } = require('./svgParser.service');

const ASSETS_DIR = path.join(__dirname, '../assets/modules');
const FONDOS_DIR = path.join(ASSETS_DIR, 'fondos');
const ELEMENTOS_DIRS = [
  path.join(ASSETS_DIR, 'logos'),
  path.join(ASSETS_DIR, 'decoraciones'),
  path.join(ASSETS_DIR, 'headers')
];

/**
 * Ensambla el SVG basado en las instrucciones de la IA
 * @param {Object} instruccionIA JSON validado de la IA
 * @returns {String|null} String SVG ensamblado, o null si el fondo no existe
 */
function ensamblar(instruccionIA) {
  const { fondo_id, elementos, textos, color_acento } = instruccionIA;

  // 1. Leer el fondo base
  const fondoPath = path.join(FONDOS_DIR, fondo_id);
  if (!fs.existsSync(fondoPath)) {
    console.error(`[svgAssembler] Fondo base no encontrado: ${fondo_id}`);
    return null;
  }
  
  let svgContent = fs.readFileSync(fondoPath, 'utf8');

  // 2. Inyectar el style dinámico para el color acento
  const dynamicStyle = `
    <style>
      .color-acento { fill: ${color_acento} !important; }
      .color-acento-stroke { stroke: ${color_acento} !important; }
    </style>
  `;
  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i);
  if (svgOpenTagMatch) {
    svgContent = svgContent.replace(svgOpenTagMatch[0], `${svgOpenTagMatch[0]}\n${dynamicStyle}`);
  }

  // 3. Inyectar los elementos adicionales en <g id="capa_elementos">
  if (elementos && elementos.length > 0) {
    let elementosInyectados = '';
    
    for (const el_id of elementos) {
      let elPath = null;
      for (const dir of ELEMENTOS_DIRS) {
        const testPath = path.join(dir, el_id);
        if (fs.existsSync(testPath)) {
          elPath = testPath;
          break;
        }
      }
      
      if (elPath) {
        const elContent = fs.readFileSync(elPath, 'utf8');
        // Extraer solo el contenido dentro del <svg> del elemento para no anidar <svg> de forma incorrecta
        // O simplemente insertarlo como <g> usando el contenido interno.
        const innerContentMatch = elContent.match(/<svg[^>]*>([\s\S]*?)<\/svg>/i);
        if (innerContentMatch) {
          elementosInyectados += `\n<!-- Inyectado: ${el_id} -->\n<g class="elemento-inyectado">${innerContentMatch[1]}</g>\n`;
        }
      } else {
        console.warn(`[svgAssembler] Elemento no encontrado: ${el_id}`);
      }
    }

    // Buscar <g id="capa_elementos"> e inyectar
    const regexCapa = /(<g[^>]*id="capa_elementos"[^>]*>)/i;
    if (regexCapa.test(svgContent)) {
      svgContent = svgContent.replace(regexCapa, `$1\n${elementosInyectados}`);
    } else if (svgOpenTagMatch) {
      // Si no existe la capa, lo inyectamos al inicio del SVG (detrás de todo o depende de la estructura)
      // Para ser seguros, lo ponemos justo después del svg tag.
      svgContent = svgContent.replace(svgOpenTagMatch[0], `${svgOpenTagMatch[0]}\n<g id="capa_elementos">\n${elementosInyectados}\n</g>`);
    }
  }

  // 4. Buscar y reemplazar placeholders de texto usando svgParser service
  // El svgParser espera un objeto con los mapeos.
  const dataMap = {
    titular: textos.titular || '',
    subtitulo: textos.subtitulo || '',
    cuerpo: textos.cuerpo || ''
  };

  // Usamos el replaceVariables que ya implementa la técnica segura de coordenadas Y y word-wrap
  svgContent = replaceVariables(svgContent, dataMap);

  return svgContent;
}

module.exports = {
  ensamblar
};
