const express = require('express');
const router = express.Router();
const multer = require('multer');
const generatorController = require('../controllers/generator.controller');
const aiGeneratorController = require('../controllers/aiGenerator.controller');

// Usar memory storage para Zero Disk Storage
const upload = multer({ storage: multer.memoryStorage() });

router.post(
    '/generate',
    upload.fields([
        { name: 'template', maxCount: 20 },
        { name: 'data', maxCount: 1 },
        { name: 'images', maxCount: 100 }
    ]),
    generatorController.generateDocuments
);

router.post(
    '/preview',
    upload.fields([
        { name: 'template', maxCount: 20 },
        { name: 'data', maxCount: 1 },
        { name: 'images', maxCount: 100 }
    ]),
    generatorController.previewDocument
);

// ── Endpoints inteligentes de IA ──────────────────────────────────────────────
router.post(
    '/extract-variables',
    upload.fields([{ name: 'template', maxCount: 1 }]),
    aiGeneratorController.extractVariables
);

router.post(
    '/generate-ai-rows',
    upload.fields([{ name: 'data', maxCount: 1 }]),
    aiGeneratorController.generateAiRows
);

// ── Endpoint de diagnóstico ───────────────────────────────────────────────────
router.post(
    '/debug-svg',
    upload.fields([
        { name: 'template', maxCount: 20 },
        { name: 'data', maxCount: 1 }
    ]),
    generatorController.debugSvg
);

module.exports = router;


