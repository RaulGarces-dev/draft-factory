const sharp = require('sharp');
const { upscaleImage } = require('../services/upscaler.service');
const { createJob, enqueue, getJob } = require('../services/upscaler.jobs');

const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

// POST /api/upscaler/upscale — encola el trabajo, devuelve jobId inmediatamente
async function upscale(req, res) {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibio ninguna imagen.' });

        const scale = ['2', '4'].includes(req.body.scale) ? req.body.scale : '4';
        const fmt = ALLOWED_FORMATS.includes(req.body.format?.toLowerCase())
            ? req.body.format.toLowerCase() : 'png';
        const outputFormat = fmt === 'jpg' ? 'jpeg' : fmt;

        // Convertir a PNG para compatibilidad con el binario
        const pngBuffer = await sharp(req.file.buffer).png().toBuffer();

        const jobId = createJob(scale, outputFormat);

        enqueue(jobId, async (onProgress) => {
            const upscaled = await upscaleImage(pngBuffer, scale, onProgress);
            return await sharp(upscaled)[outputFormat]({ quality: 95 }).toBuffer();
        });

        res.json({ jobId, scale, format: outputFormat });
    } catch (err) {
        console.error('[upscaler] upscale:', err.message);
        res.status(500).json({ error: err.message });
    }
}

// GET /api/upscaler/progress/:jobId — SSE stream de progreso real
function progress(req, res) {
    const { jobId } = req.params;

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();

    const send = (data) => {
        if (!res.writableEnded) res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const interval = setInterval(() => {
        const job = getJob(jobId);
        if (!job) {
            send({ status: 'error', error: 'Job no encontrado' });
            clearInterval(interval);
            return res.end();
        }
        // Enviar snapshot sin el Buffer de resultado (demasiado grande)
        send({ status: job.status, progress: job.progress, position: job.position, error: job.error });
        if (job.status === 'done' || job.status === 'error') {
            clearInterval(interval);
            res.end();
        }
    }, 250);

    req.on('close', () => clearInterval(interval));
}

// GET /api/upscaler/result/:jobId — devuelve la imagen procesada
function result(req, res) {
    const { jobId } = req.params;
    const job = getJob(jobId);

    if (!job) return res.status(404).json({ error: 'Job no existe o ya expiro.' });
    if (job.status !== 'done') return res.status(202).json({ error: 'Todavia procesando.' });
    if (!job.result) return res.status(500).json({ error: 'Resultado vacio.' });

    const ext = job.format === 'jpeg' ? 'jpg' : job.format;
    res.set({
        'Content-Type': `image/${job.format}`,
        'Content-Disposition': `attachment; filename="upscaled_${job.scale}x.${ext}"`,
    });
    res.send(job.result);
}

module.exports = { upscale, progress, result };
