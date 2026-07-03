const { prisma } = require('../services/queue.service');

/**
 * Consulta el estado, progreso y resultados de un Job mediante su ID.
 */
const getJobStatus = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Falta el ID del Job.' });
        }

        const jobRecord = await prisma.job.findUnique({
            where: { id }
        });

        if (!jobRecord) {
            return res.status(404).json({ error: 'Job no encontrado.' });
        }

        let parsedResult = null;
        if (jobRecord.result) {
            try {
                parsedResult = JSON.parse(jobRecord.result);
            } catch (e) {
                parsedResult = jobRecord.result;
            }
        }

        return res.json({
            id: jobRecord.id,
            type: jobRecord.type,
            status: jobRecord.status,
            progress: jobRecord.progress,
            result: parsedResult,
            error: jobRecord.error,
            createdAt: jobRecord.createdAt,
            updatedAt: jobRecord.updatedAt
        });
    } catch (error) {
        console.error('[jobsController] Error consultando estado del Job:', error.message);
        return res.status(500).json({ error: 'Error interno consultando estado del Job.' });
    }
};

module.exports = {
    getJobStatus
};
