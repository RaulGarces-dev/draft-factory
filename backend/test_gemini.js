require('dotenv').config();
const { generarInstrucciones } = require('./services/gemini.service');
const { ensamblar } = require('./services/svgAssembler.service');

async function test() {
  console.log('Testing Gemini...');
  const config = { Tono: 'Formal', Color: '#2A5757' };
  const fila = { Evento: 'Prueba', Fecha: 'Hoy' };
  
  const result = await generarInstrucciones(config, fila);
  console.log('Gemini Result:', JSON.stringify(result, null, 2));

  if (result) {
    console.log('Testing Ensamblador...');
    const svg = await ensamblar(result);
    console.log('SVG length:', svg ? svg.length : 'NULL');
  }
}

test().catch(console.error);
