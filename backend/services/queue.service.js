const BetterQueue = require('better-queue');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const Database = require('better-sqlite3');
const path = require('path');

// 1. Instanciar el driver de SQLite nativo de Node
const dbPath = path.join(__dirname, '../prisma/dev.db');
const sqlite = new Database(dbPath);

// 2. Instanciar el Driver Adapter oficial de Prisma para SQLite
const adapter = new PrismaBetterSqlite3(sqlite);

// 3. Pasar el adaptador al constructor de PrismaClient (Requerido en Prisma v7+)
const prisma = new PrismaClient({ adapter });

// Mapa de manejadores por tipo de tarea (para agregar módulos sin tocar el core)
const handlers = {};

/**
 * Registra un manejador para un tipo específico de Job.
 * Permite que nuevos módulos se registren de forma aislada.
 */
const registerJobHandler = (type, handlerFn) => {
    handlers[type] = handlerFn;
    console.log(`[Queue] Manejador registrado para tipo de tarea: "${type}"`);
};

// Instanciar la cola en memoria usando better-queue
const suiteQueue = new BetterQueue(async (task, cb) => {
    const { dbJobId, type, payload } = task;
    console.log(`[Queue/Worker] Iniciando tarea ${dbJobId} [${type}]`);

    // Actualizar estado a "processing" en la base de datos
    await prisma.job.update({
        where: { id: dbJobId },
        data: { status: 'processing', progress: 5 }
    });

    try {
        const handler = handlers[type];
        if (!handler) {
            throw new Error(`No se encontró un manejador registrado para la tarea tipo "${type}".`);
        }

        // Función para actualizar el progreso (0-100)
        const updateProgress = async (percent) => {
            const safePercent = Math.min(Math.max(Math.floor(percent), 0), 99);
            await prisma.job.update({
                where: { id: dbJobId },
                data: { progress: safePercent }
            });
        };

        // Ejecutar el procesador del módulo correspondiente
        const result = await handler(payload, updateProgress);

        // Completar el Job exitosamente
        await prisma.job.update({
            where: { id: dbJobId },
            data: {
                status: 'completed',
                progress: 100,
                result: result ? JSON.stringify(result) : null
            }
        });

        console.log(`[Queue/Worker] Tarea completada con éxito: ${dbJobId}`);
        cb(null, result);

    } catch (error) {
        console.error(`[Queue/Worker] Error ejecutando tarea ${dbJobId}:`, error.message);

        // Marcar el Job como fallido
        await prisma.job.update({
            where: { id: dbJobId },
            data: {
                status: 'failed',
                error: error.message
            }
        });

        cb(error);
    }
}, {
    concurrent: 2 // Límite de procesamiento concurrente local
});

/**
 * Registra una nueva tarea asíncrona en la base de datos y la encola en la cola en memoria.
 */
const addJobToQueue = async (type, data = {}) => {
    const jobRecord = await prisma.job.create({
        data: {
            type,
            status: 'pending',
            progress: 0
        }
    });

    suiteQueue.push({
        dbJobId: jobRecord.id,
        type,
        payload: data
    });

    return jobRecord;
};

module.exports = {
    addJobToQueue,
    registerJobHandler,
    prisma
};
