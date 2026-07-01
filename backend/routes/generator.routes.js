const express = require('express');
const router = express.Router();
const multer = require('multer');
const generatorController = require('../controllers/generator.controller');

// Usar memory storage para Zero Disk Storage
const upload = multer({ storage: multer.memoryStorage() });

router.post(
    '/generate',
    upload.fields([
        { name: 'template', maxCount: 20 },
        { name: 'data', maxCount: 1 }
    ]),
    generatorController.generateDocuments
);

router.post(
    '/preview',
    upload.fields([
        { name: 'template', maxCount: 20 },
        { name: 'data', maxCount: 1 }
    ]),
    generatorController.previewDocument
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

