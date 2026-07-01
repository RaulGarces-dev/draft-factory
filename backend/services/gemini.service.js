const { GoogleGenerativeAI } = require('@google/generative-ai');
const { IAInstructionSchema } = require('../schema/aiResponse.schema');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

/**
 * Llama a Gemini para generar instrucciones de diseño para una fila.
 * @param {Object} configurador Reglas de diseño (Sector, Tono, Estilo_Visual, Restricciones)
 * @param {Object} datosFila Datos del evento (Fecha, Evento, Audiencia, Puntos_Clave)
 * @returns {Promise<Object|null>} JSON validado o null si falla
 */
async function generarInstrucciones(configurador, datosFila) {
  try {
    const prompt = `
Eres un director de arte JSON. Recibes reglas de marca y un evento. Devuelve SOLO un JSON válido basado en el siguiente esquema. No uses markdown de código. No agregues texto adicional.

Esquema JSON Requerido:
{
  "fondo_id": "string (nombre del archivo SVG del fondo)",
  "elementos": ["string (nombres de archivos de elementos)"],
  "textos": {
    "titular": "string (max 40 chars)",
    "subtitulo": "string (max 60 chars)",
    "cuerpo": "string (max 150 chars)"
  },
  "color_acento": "string (hex color, ej. #E0922B)"
}

Reglas de Marca (Configurador):
${JSON.stringify(configurador, null, 2)}

Datos del Evento:
${JSON.stringify(datosFila, null, 2)}
`;

    const result = await model.generateContent(prompt);
    let textResponse = result.response.text().trim();
    
    // Limpiar posibles bloques markdown si la IA no obedece
    if (textResponse.startsWith('\`\`\`')) {
      textResponse = textResponse.replace(/^\`\`\`(json)?\n?/, '').replace(/\n?\`\`\`$/, '');
    }

    const jsonParsed = JSON.parse(textResponse);
    
    // Validar estrictamente con Zod
    const validatedData = IAInstructionSchema.parse(jsonParsed);
    
    return validatedData;
  } catch (error) {
    console.error('Error generando instrucciones con Gemini para la fila:', error.message);
    // En caso de error, abortamos esta fila retornando null, para continuar con la siguiente
    return null;
  }
}

module.exports = {
  generarInstrucciones
};
