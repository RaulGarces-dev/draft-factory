const sharp = require('sharp');
const { upscaleImage } = require('../services/upscaler.service');

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

async function upscale(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibio ninguna imagen.' });
        }

        const scale = ['2', '4'].includes(req.body.scale) ? req.body.scale : '4';
        const format = ALLOWED_FORMATS.includes(req.body.format?.toLowerCase())
            ? req.body.format.toLowerCase()
            : 'png';
        const outputFormat = format === 'jpg' ? 'jpeg' : format;

        // Convertir entrada a PNG puro para que el binario la entienda siempre
        const pngInputBuffer = await sharp(req.file.buffer).png().toBuffer();

        // Escalar con realesrgan (devuelve PNG)
        const upscaledBuffer = await upscaleImage(pngInputBuffer, scale);

        // Convertir salida al formato pedido por el usuario
        const finalBuffer = await sharp(upscaledBuffer)[outputFormat]({ quality: 95 }).toBuffer();

        const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
        res.set({
            'Content-Type': `image/${outputFormat}`,
            'Content-Disposition': `attachment; filename="upscaled_${scale}x.${ext}"`,
        });
        res.send(finalBuffer);

    } catch (err) {
        console.error('[upscaler controller]', err);
        res.status(500).json({ error: err.message || 'Error interno al procesar la imagen.' });
    }
}

module.exports = { upscale };
