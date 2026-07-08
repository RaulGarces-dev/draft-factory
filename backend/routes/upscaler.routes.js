const express = require('express');
const router = express.Router();
const multer = require('multer');
const { upscale } = require('../controllers/upscaler.controller');

// Memory storage - sin tocar el disco hasta que el servicio lo necesite
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Formato no soportado. Usa JPG, PNG o WebP.'));
        }
    },
});

router.post('/upscale', upload.single('image'), upscale);

module.exports = router;
