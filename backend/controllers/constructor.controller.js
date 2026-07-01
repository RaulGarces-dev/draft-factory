const { parseExcelBuffer } = require('../services/excel.service');
const { generarInstrucciones } = require('../services/gemini.service');
const { ensamblar } = require('../services/svgAssembler.service');
const { renderBatchToImage } = require('../services/puppeteer.service');
const archiver = require('archiver');

const generateBatch = async (req, res) => {
  try {
    const configuradorFile = req.files['configurador'] ? req.files['configurador'][0] : null;
    const datosFile = req.files['datos'] ? req.files['datos'][0] : null;

    if (!configuradorFile || !datosFile) {
      return res.status(400).json({ error: 'Faltan archivos (configurador o datos).' });
    }

    // 1. Leer excels
    const configData = parseExcelBuffer(configuradorFile.buffer);
    const rowsData = parseExcelBuffer(datosFile.buffer);

    if (!configData || configData.length === 0) {
      return res.status(400).json({ error: 'El archivo configurador está vacío.' });
    }

    if (!rowsData || rowsData.length === 0) {
      return res.status(400).json({ error: 'El archivo de datos está vacío.' });
    }

    // Límite de seguridad de 50 filas
    if (rowsData.length > 50) {
      return res.status(400).json({ error: 'Límite excedido. Máximo 50 filas.' });
    }

    const reglasMarca = configData[0];
    const svgsEnsamblados = [];
    const metadatosFilas = []; // para nombrar archivos

    // 2. Bucle asíncrono para generar SVG por fila
    for (let i = 0; i < rowsData.length; i++) {
      const fila = rowsData[i];
      
      // Llamar Gemini
      const instruccionIA = await generarInstrucciones(reglasMarca, fila);
      
      if (!instruccionIA) {
        console.warn(`[generateBatch] Falla IA en fila ${i + 1}, omitiendo.`);
        continue;
      }

      // Ensamblar SVG
      const svgContent = ensamblar(instruccionIA);
      if (svgContent) {
        svgsEnsamblados.push(svgContent);
        metadatosFilas.push(fila.Nombre || fila.Evento || `Tarjeta_${i+1}`);
      }
    }

    if (svgsEnsamblados.length === 0) {
      return res.status(500).json({ error: 'No se generó ningún SVG exitosamente.' });
    }

    // 3. Puppeteer Render en lote
    const pngBuffers = await renderBatchToImage(svgsEnsamblados, 'png');

    // 4. Archiver
    res.attachment('campana_automatizada.zip');
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      console.error('[generateBatch] Error al crear ZIP:', err);
      res.status(500).end();
    });

    archive.pipe(res);

    pngBuffers.forEach((buffer, index) => {
      // Limpiar nombre de archivo
      let safeName = (metadatosFilas[index] || `banner_${index + 1}`).toString().replace(/[^a-z0-9]/gi, '_');
      archive.append(buffer, { name: `${safeName}.png` });
    });

    await archive.finalize();

  } catch (error) {
    console.error('[generateBatch] Error general:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno en la generación del lote.' });
    }
  }
};

module.exports = {
  generateBatch
};
