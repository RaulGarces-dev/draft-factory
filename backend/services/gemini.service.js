const { GoogleGenerativeAI } = require('@google/generative-ai');
const { IAInstructionSchema } = require('../schema/aiResponse.schema');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * Llama a Gemini para generar instrucciones de diseño para una fila.
 * @param {Object} configurador Reglas de diseño (Sector, Tono, Estilo_Visual, Restricciones)
 * @param {Object} datosFila Datos del evento (Fecha, Evento, Audiencia, Puntos_Clave)
 * @returns {Promise<Object|null>} JSON validado o null si falla
 */
async function generarInstrucciones(configurador, datosFila) {
  try {
    const prompt = `
Eres un Director de Arte senior especializado en comunicación corporativa. Recibes reglas de marca y datos de un evento. Tu misión es generar instrucciones de diseño en JSON puro para crear piezas gráficas de nivel profesional (comparable a una tarjeta producida en Illustrator).

REGLAS ABSOLUTAS (no negociables):
1. El campo "fondo_id" SIEMPRE debe ser exactamente "fondo_base.svg".
2. El campo "elementos" SIEMPRE debe ser un array con exactamente ["logo_garza.svg"].
3. Devuelve SOLO el JSON válido. Sin markdown, sin texto adicional, sin bloques de código.

DIRECTIVAS DE ARTE Y COPY:
- "titular": Frase corta, impactante, máximo 35 caracteres. Puede usar mayúsculas estratégicas para énfasis. No uses signos de exclamación básicos.
- "subtitulo": Complementa el titular con contexto elegante, tono corporativo, máximo 55 caracteres. USA MAYÚSCULAS para dar un look de categoría/etiqueta.
- "cuerpo": Redacta 2 oraciones completas y bien construidas. Tono cálido pero profesional. Máximo 140 caracteres. Incluye el nombre propio si está disponible en los datos.
- "color_acento": Elige un color hex que complemente la paleta petróleo (#2A5757) y naranja (#E0922B) de Garza. Prioriza el color del sector o del tono emocional del evento. Ej: eventos de salud → #4A90D9, tecnología → #7B68EE, celebraciones → #E0922B.

CRITERIO DE DECISIÓN VISUAL BASADO EN LONGITUD DE TEXTO:
- Si el titular tiene más de 20 caracteres, usa un subtitulo corto (menos de 30 chars) para equilibrio visual.
- Si el titular tiene menos de 20 caracteres, puedes usar un subtitulo más descriptivo (hasta 55 chars).

Esquema JSON de salida:
{
  "fondo_id": "fondo_base.svg",
  "elementos": ["logo_garza.svg"],
  "textos": {
    "titular": "string",
    "subtitulo": "string",
    "cuerpo": "string"
  },
  "color_acento": "string (hex)"
}

Reglas de Marca (Configurador):
${JSON.stringify(configurador, null, 2)}

Datos del Evento:
${JSON.stringify(datosFila, null, 2)}
`;

    const result = await model.generateContent(prompt);
    let textResponse = result.response.text().trim();
    
    // Limpiar posibles bloques markdown si la IA no obedece
    const cleanJsonString = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();

    const jsonParsed = JSON.parse(cleanJsonString);
    
    // Validar estrictamente con Zod
    const validatedData = IAInstructionSchema.parse(jsonParsed);
    
    return validatedData;
  } catch (error) {
    console.error('Error generando instrucciones con Gemini para la fila:', error.message);
    console.error(error.stack);
    // En caso de error, abortamos esta fila retornando null, para continuar con la siguiente
    return null;
  }
}

module.exports = {
  generarInstrucciones
};
