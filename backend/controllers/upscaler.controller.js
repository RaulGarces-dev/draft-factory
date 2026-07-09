const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { upscaleImage } = require('../services/upscaler.service');
const { createJob, enqueue, getJob } = require('../services/upscaler.jobs');

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

const TARGET_RESOLUTIONS = {
    'HD': 1280,
    'FHD': 1920,
    '2K': 2560,
    '4K': 3840
};

// POST /api/upscaler/upscale — encola el trabajo, devuelve jobId inmediatamente
async function upscale(req, res) {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibio ninguna imagen.' });

        // Aceptamos la calidad estandarizada
        const quality = TARGET_RESOLUTIONS[req.body.quality] ? req.body.quality : 'FHD';
        const targetPx = TARGET_RESOLUTIONS[quality];
        
        // Ingeniería Inversa: La IA siempre usará factor 4x (mejor modelo fotográfico).
        // Por tanto, la imagen base debe ser exactamente targetPx / 4.
        // Ej: Para 4K (3840), la IA procesará solo 960px.
        const inputPx = Math.ceil(targetPx / 4);

        const fmt = ALLOWED_FORMATS.includes(req.body.format?.toLowerCase())
            ? req.body.format.toLowerCase() : 'png';
        const outputFormat = fmt === 'jpg' ? 'jpeg' : fmt;

        // Comprimir/Reducir la imagen al tamaño ultra-pequeño calculado ANTES de la IA
        const pngBuffer = await sharp(req.file.buffer)
            .resize({ width: inputPx, height: inputPx, fit: 'inside' })
            .png()
            .toBuffer();

        const jobId = createJob(quality, outputFormat);

        enqueue(jobId, async (onProgress) => {
            // Siempre pasamos '4' (escala real para el binario), pero guardamos 'quality' (ej. 4K) en el job
            const { inputPath, outputPath } = await upscaleImage(pngBuffer, '4', outputFormat, onProgress);
            return { inputPath, outputPath };
        });

        res.json({ jobId, quality, format: outputFormat });

    } catch (err) {
        console.error('[upscaler] upscale:', err.message);
        res.status(500).json({ error: err.message });
    }
}

// GET /api/upscaler/progress/:jobId — JSON de estado para short-polling
function progress(req, res) {
    const { jobId } = req.params;
    const job = getJob(jobId);
    
    if (!job) {
        return res.json({ status: 'error', error: 'Job no encontrado o expiro (pasaron 10 min).' });
    }

    res.json({ status: job.status, progress: job.progress, position: job.position, error: job.error });
}

// GET /api/upscaler/input/:jobId — devuelve el PNG pre-procesado (para slider "before")
function inputImage(req, res) {
    const { jobId } = req.params;
    const job = getJob(jobId);
    
    if (!job || !job.inputPath) return res.status(404).json({ error: 'Input no disponible o no completado aun.' });
    if (!fs.existsSync(job.inputPath)) return res.status(404).json({ error: 'Archivo fisico no encontrado.' });
    
    res.set({ 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    res.sendFile(job.inputPath);
}

// GET /api/upscaler/result/:jobId — devuelve la imagen procesada enviando el archivo desde disco
function result(req, res) {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) return res.status(404).json({ error: 'Job no existe o ya expiro.' });
    if (job.status !== 'done') return res.status(202).json({ error: 'Todavia procesando.' });
    if (!job.outputPath || !fs.existsSync(job.outputPath)) return res.status(500).json({ error: 'Archivo resultado no encontrado en el disco.' });

    const ext = job.format === 'jpeg' ? 'jpg' : job.format;
    res.set({
        'Content-Type': `image/${job.format}`,
        'Content-Disposition': `attachment; filename="upscaled_${job.scale}x.${ext}"`,
    });
    res.sendFile(job.outputPath);
}

module.exports = { upscale, progress, inputImage, result };
