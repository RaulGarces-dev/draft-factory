const { GoogleGenerativeAI } = require('@google/generative-ai');
const { IAInstructionSchema, ConceptosResponseSchema } = require('../schema/aiResponse.schema');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Utilidades
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function cleanJson(raw) {
  return raw.replace(/```json/gi, '').replace(/```/g, '').trim();
}

/**
 * Ejecuta una funciÃ³n con reintentos automÃ¡ticos ante errores 429 (rate limit).
 * @param {Function} fn FunciÃ³n async a ejecutar
 * @param {number} maxRetries MÃ¡ximo de reintentos
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.message?.includes('429') || err?.status === 429;
      if (is429 && attempt < maxRetries) {
        // Extraer el tiempo de espera sugerido por la API si estÃ¡ disponible
        const retryMatch = err.message.match(/retry in (\d+)(?:\.\d+)?s/i);
        const waitSecs = retryMatch ? parseInt(retryMatch[1]) + 2 : Math.pow(2, attempt) * 5;
        console.warn(`[Gemini] Rate limit (429). Intento ${attempt}/${maxRetries}. Esperando ${waitSecs}s...`);
        await new Promise(r => setTimeout(r, waitSecs * 1000));
      } else {
        throw err;
      }
    }
  }
}

/**
 * Calcula un score heurÃ­stico a un concepto para elegir el mÃ¡s creativo.
 */
function scoreConcepto(concepto) {
  let score = 0;
  const disp = (concepto.disposicion || '').toLowerCase();
  const elems = concepto.descripcion_elementos || [];
  const tipSize = concepto.estructura_tipografica?.titular_size || 0;
  const fondo = (concepto.paleta_colores?.fondo || '').toLowerCase();

  // Premia disposiciones no convencionales
  if (/(asimÃ©tric|diagonal|dividid|lateral|inferior|grid|collage)/i.test(disp)) score += 3;
  // Premia paletas oscuras
  const hexMatch = fondo.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const lum = parseInt(hexMatch[1].slice(0, 2), 16);
    if (lum < 80) score += 2;
  }
  // Premia riqueza de elementos
  if (elems.length >= 4) score += 3;
  else if (elems.length >= 2) score += 1;
  // Premia tipografÃ­a grande y expresiva
  if (tipSize >= 80) score += 2;
  else if (tipSize >= 60) score += 1;

  return score;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ETAPA 1: IdeaciÃ³n â€” Gemini propone 3 conceptos creativos libres
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generarConceptos(configurador, datosFila) {
  const prompt = `
Eres un Director Creativo Publicitario de nivel mundial. Tu Ãºnica tarea es IDEAR diseÃ±os, no ejecutarlos tÃ©cnicamente.

Recibes el contexto de un evento/campaÃ±a y debes proponer 3 conceptos de diseÃ±o visual radicalmente distintos entre sÃ­ para una tarjeta cuadrada de 1080x1080 pÃ­xeles.

REGLAS DE IDEACIÃ“N:
- Los 3 conceptos deben ser DIFERENTES en disposiciÃ³n, paleta y estilo visual.
- SÃ© audaz: piensa en diseÃ±os de revistas de lujo, festivales de arte, marcas de tecnologÃ­a premium.
- No uses siempre el mismo esquema "tarjeta centrada con fondo oscuro". VarÃ­a.
- Cada concepto debe tener una identidad visual propia y reconocible.

Ejemplos de disposiciones posibles (usa estas u inventa otras):
  "pantalla dividida vertical: mitad imagen geomÃ©trica / mitad texto",
  "tipografÃ­a colosal que ocupa 80% del canvas, elementos decorativos al margen",
  "layout minimalista con gran espacio en blanco y un elemento focal muy fuerte",
  "composiciÃ³n diagonal con banda de color que atraviesa el canvas",
  "grid modular con mÃºltiples bloques de color",
  "fondo fotogrÃ¡fico simulado con formas abstractas tipo Bauhaus",
  "estilo constructivista ruso con tipografÃ­a bold y bloques geomÃ©tricos"

Datos del evento:
${JSON.stringify(datosFila, null, 2)}

Reglas de Marca:
${JSON.stringify(configurador, null, 2)}

Devuelve EXACTAMENTE este JSON (sin markdown, sin texto extra):
{
  "conceptos": [
    {
      "id": 1,
      "nombre": "Nombre creativo del concepto",
      "disposicion": "DescripciÃ³n detallada de cÃ³mo se distribuyen los elementos visuales en el canvas",
      "paleta_colores": {
        "fondo": "#HEXCOLOR",
        "primario": "#HEXCOLOR",
        "acento": "#HEXCOLOR",
        "texto": "#HEXCOLOR"
      },
      "estructura_tipografica": {
        "titular_size": 72,
        "titular_peso": "900",
        "subtitulo_posicion": "inferior izquierdo",
        "fuente_sugerida": "Bebas Neue"
      },
      "descripcion_elementos": [
        "banda diagonal naranja desde esquina superior izquierda",
        "grilla de puntos en fondo con opacidad baja",
        "cÃ­rculo grande detrÃ¡s del titular como elemento focal",
        "lÃ­nea horizontal divisoria entre tÃ­tulo y subtÃ­tulo"
      ]
    }
  ]
}
`;

  const result = await retryWithBackoff(() => model.generateContent(prompt));
  const raw = cleanJson(result.response.text().trim());

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error('[Etapa1] Error parseando JSON de conceptos:', raw.slice(0, 500));
    throw new Error('Gemini no devolviÃ³ JSON vÃ¡lido en Etapa 1');
  }

  try {
    return ConceptosResponseSchema.parse(parsed);
  } catch (e) {
    console.error('[Etapa1] Error Zod en conceptos:', JSON.stringify(parsed, null, 2));
    throw e;
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ETAPA 2: EjecuciÃ³n â€” Gemini traduce el concepto ganador a SVG primitivas
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generarSvgDesdeConcepto(concepto, configurador, datosFila) {
  const prompt = `
Eres un ingeniero de diseÃ±o vectorial especialista en SVG. Recibes un CONCEPTO DE DISEÃ‘O ya definido por un Director Creativo y debes traducirlo FIELMENTE a instrucciones SVG tÃ©cnicas en formato JSON.

NO inventes un nuevo diseÃ±o. Tu trabajo es EJECUTAR con precisiÃ³n el concepto que se te entrega.

CONCEPTO DE DISEÃ‘O ASIGNADO:
${JSON.stringify(concepto, null, 2)}

DATOS DEL EVENTO:
${JSON.stringify(datosFila, null, 2)}

REGLAS TÃ‰CNICAS DE EJECUCIÃ“N (canvas 1080x1080px):
1. Usa la paleta_colores del concepto para todos los colores. El "fondo" va en el primer rect, "acento" en elementos decorativos, "texto" en los elementos text.
2. Traduce cada Ã­tem de "descripcion_elementos" a formas SVG concretas con coordenadas reales.
3. La "disposicion" del concepto define dÃ³nde va cada elemento. RespÃ©tala exactamente.
4. Usa la "estructura_tipografica" para los tamaÃ±os y pesos de fuente.
5. Incluye obligatoriamente el logo corporativo con tipo "logo".
6. Para textos largos usa "foreignObject". Para titulares cortos usa "text".
7. Crea degradados (linear o radial) cuando el concepto lo sugiera.
8. TIPOS VÃLIDOS en "composicion": "rect", "circle", "ellipse", "line", "path", "polygon", "text", "foreignObject", "logo". NingÃºn otro.
9. Incluye mÃ­nimo 8 elementos en "composicion" para garantizar riqueza visual.

Devuelve SOLO este JSON (sin markdown):
{
  "color_acento": "#HEXCOLOR (del concepto)",
  "estilo": {
    "degradados": [...],
    "filtros": [...],
    "clasesCSS": { "titular-style": "...", "subtitulo-style": "..." }
  },
  "composicion": [
    { "tipo": "rect", "x": 0, "y": 0, "width": 1080, "height": 1080, "fill": "url(#grad1)" },
    ...
  ]
}
`;

  const result = await retryWithBackoff(() => model.generateContent(prompt));
  const raw = cleanJson(result.response.text().trim());

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error('[Etapa2] Error parseando JSON SVG:', raw.slice(0, 500));
    throw new Error('Gemini no devolviÃ³ JSON vÃ¡lido en Etapa 2');
  }

  try {
    return IAInstructionSchema.parse(parsed);
  } catch (e) {
    console.error('[Etapa2] Error Zod en SVG:', JSON.stringify(parsed, null, 2));
    throw e;
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FunciÃ³n principal exportada â€” orquesta las 2 etapas
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function generarInstrucciones(configurador, datosFila) {
  try {
    // â”€â”€ Etapa 1: Generar 3 conceptos y elegir el mejor â”€â”€
    console.log('[Gemini] Etapa 1: Generando conceptos creativos...');
    const { conceptos } = await generarConceptos(configurador, datosFila);

    const scored = conceptos.map(c => ({ concepto: c, score: scoreConcepto(c) }));
    scored.sort((a, b) => b.score - a.score);
    const ganador = scored[0].concepto;

    console.log(`[Gemini] Concepto ganador: "${ganador.nombre}" (score: ${scored[0].score})`);
    console.log(`[Gemini]   DisposiciÃ³n: ${ganador.disposicion.slice(0, 80)}...`);

    // â”€â”€ Etapa 2: Traducir concepto ganador a primitivas SVG â”€â”€
    console.log('[Gemini] Etapa 2: Generando primitivas SVG...');
    const instruccionSvg = await generarSvgDesdeConcepto(ganador, configurador, datosFila);

    console.log(`[Gemini] âœ… Pipeline completado. Elementos en composiciÃ³n: ${instruccionSvg.composicion.length}`);
    return instruccionSvg;

  } catch (error) {
    console.error('[Gemini] Error en pipeline generativo:', error.message);
    return null;
  }
}

module.exports = {
  generarInstrucciones
};

