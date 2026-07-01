const express = require('express');
const multer = require('multer');
const { generateBatch } = require('../controllers/constructor.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/generate-batch', upload.fields([
  { name: 'configurador', maxCount: 1 },
  { name: 'datos', maxCount: 1 }
]), generateBatch);

module.exports = router;
