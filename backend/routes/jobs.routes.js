const express = require('express');
const router = express.Router();
const jobsController = require('../controllers/jobs.controller');

// Polling de estado de cualquier Job en la Suite
router.get('/:id', jobsController.getJobStatus);

module.exports = router;
