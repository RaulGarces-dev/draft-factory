/**
 * upscaler.jobs.js
 * Cola in-memory para procesamiento de imagenes — sin base de datos (privacy-first).
 * Los resultados ahora son rutas a archivos en disco (cero RAM).
 * Se limpian los archivos automaticamente a los 10 minutos.
 */
const crypto = require('crypto');
const fs = require('fs').promises;

const jobs = new Map();   // jobId -> job object
const queue = [];         // [ { jobId, task } ]
const MAX_CONCURRENT_JOBS = 4;
let activeJobs = 0;

function createJob(scale, format) {
    const id = crypto.randomUUID();
    jobs.set(id, {
        status: 'queued',
        progress: 0,
        position: queue.length + 1,
        scale,
        format,
        inputPath: null,
        outputPath: null,
        error: null,
    });
    return id;
}

function enqueue(jobId, task) {
    queue.push({ jobId, task });
    _processNext();
}

async function _processNext() {
    if (activeJobs >= MAX_CONCURRENT_JOBS || queue.length === 0) return;
    
    activeJobs++;
    const { jobId, task } = queue.shift();

    // Actualizar posicion de los jobs restantes en cola
    queue.forEach((item, i) => _patch(item.jobId, { position: i + 1 }));

    _patch(jobId, { status: 'processing', position: 0 });

    try {
        const { inputPath, outputPath } = await task((pct) => _patch(jobId, { progress: pct }));
        _patch(jobId, { status: 'done', progress: 100, inputPath, outputPath });
    } catch (err) {
        console.error('[upscaler queue]', err.message);
        _patch(jobId, { status: 'error', error: err.message });
    } finally {
        activeJobs--;
        
        // Limpiar de memoria y borrar archivos del disco a los 10 min
        setTimeout(async () => {
            const job = jobs.get(jobId);
            if (job) {
                if (job.inputPath) await fs.unlink(job.inputPath).catch(() => {});
                if (job.outputPath) await fs.unlink(job.outputPath).catch(() => {});
                jobs.delete(jobId);
            }
        }, 10 * 60 * 1000);

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
