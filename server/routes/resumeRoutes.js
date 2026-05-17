const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const analysisHistoryController = require('../controllers/analysisHistoryController');
const writingImproverController = require('../controllers/writingImproverController');
const pdfExportController = require('../controllers/pdfExportController');
const { requireAuth } = require('../middleware/requireAuth');
const {
  resumeUploadLimiter,
  writingImproverLimiter,
  pdfExportLimiter,
} = require('../middleware/rateLimits');

router.get('/history', requireAuth, analysisHistoryController.listHistory);
router.get('/history/:analysisId', requireAuth, analysisHistoryController.getHistoryItem);
router.post('/improve-writing', requireAuth, writingImproverLimiter, writingImproverController.improve);
router.post('/export-pdf', requireAuth, pdfExportLimiter, pdfExportController.exportPdf);
router.post('/upload', requireAuth, resumeUploadLimiter, resumeController.handleResumeUpload, resumeController.uploadResume);

module.exports = router;
