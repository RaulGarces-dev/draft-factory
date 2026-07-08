const express = require('express');
const router = express.Router();
const multer = require('multer');
const { upscale, progress, result } = require('../controllers/upscaler.controller');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        allowed.includes(file.mimetype)
            ? cb(null, true)
            : cb(new Error('Formato no soportado. Usa JPG, PNG o WebP.'));
    },
});

router.post('/upscale', upload.single('image'), upscale);
router.get('/progress/:jobId', progress);
router.get('/result/:jobId', result);

module.exports = router;
