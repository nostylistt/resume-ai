const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const analysisHistoryController = require('../controllers/analysisHistoryController');
const writingImproverController = require('../controllers/writingImproverController');
const { requireAuth } = require('../middleware/requireAuth');

router.get('/history', requireAuth, analysisHistoryController.listHistory);
router.get('/history/:analysisId', requireAuth, analysisHistoryController.getHistoryItem);
router.post('/improve-writing', requireAuth, writingImproverController.improve);
router.post('/upload', requireAuth, resumeController.upload.single('resume'), resumeController.uploadResume);

module.exports = router;
