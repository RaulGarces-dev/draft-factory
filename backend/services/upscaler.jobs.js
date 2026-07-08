/**
 * upscaler.jobs.js
 * Cola in-memory para procesamiento de imagenes — sin base de datos (privacy-first).
 * Los resultados se limpian automaticamente a los 10 minutos.
 */
const crypto = require('crypto');

const jobs = new Map();   // jobId -> job object
const queue = [];         // [ { jobId, task } ]
let processing = false;

function createJob(scale, format) {
    const id = crypto.randomUUID();
    jobs.set(id, {
        status: 'queued',
        progress: 0,
        position: queue.length + 1,
        scale,
        format,
        result: null,
        error: null,
    });
    return id;
}

function enqueue(jobId, task) {
    queue.push({ jobId, task });
    _processNext();
}

async function _processNext() {
    if (processing || queue.length === 0) return;
    processing = true;

    const { jobId, task } = queue.shift();

    // Actualizar posicion de los jobs restantes en cola
    queue.forEach((item, i) => _patch(item.jobId, { position: i + 1 }));

    _patch(jobId, { status: 'processing', position: 0 });

    try {
        const result = await task((pct) => _patch(jobId, { progress: pct }));
        _patch(jobId, { status: 'done', progress: 100, result });
    } catch (err) {
        console.error('[upscaler queue]', err.message);
        _patch(jobId, { status: 'error', error: err.message, result: null });
    } finally {
        processing = false;
        // Limpiar resultado de memoria a los 10 min
        setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
        _processNext();
    }
}

function _patch(id, data) {
    const job = jobs.get(id);
    if (job) Object.assign(job, data);
}

function getJob(id) {
    return jobs.get(id) || null;
}

module.exports = { createJob, enqueue, getJob };
