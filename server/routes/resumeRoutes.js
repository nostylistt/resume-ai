const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');

router.post('/upload', resumeController.upload.single('resume'), resumeController.uploadResume);

module.exports = router;
