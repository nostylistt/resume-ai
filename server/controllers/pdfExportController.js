const { z } = require('zod');
const { generateAnalysisPdf } = require('../services/pdfExportService');
const { getResumeAnalysisSnapshot } = require('../services/analysisHistoryService');

const PdfExportSchema = z.object({
  analysisId: z.number().int().positive(),
});

function buildPdfSummaryFromAnalysisRecord(analysis) {
  const result = analysis?.result || {};
  const stats = result.skillsComparison?.stats || {};

  return {
    position: result.marketData?.positionTitle || result.parsedResume?.position || null,
    analysisMode: result.analysisMode,
    overallScore: result.overallScore ?? null,
    resumeQualityScore: result.resumeQualityScore ?? null,
    marketFitScore: stats.marketFitScore ?? null,
    requiredCoverage: stats.requiredCoverage ?? null,
    structureScore: result.structureAnalysis?.score ?? null,
    atsScore: result.structureAnalysis?.atsScore ?? null,
    textScore: result.textAnalysis?.score ?? null,
    matchedRequiredCount: stats.matchedRequiredCount ?? 0,
    requiredCount: stats.requiredCount ?? 0,
  };
}

async function exportPdf(req, res) {
  try {
    const { analysisId } = PdfExportSchema.parse(req.body || {});
    const analysis = await getResumeAnalysisSnapshot(req.user.id, analysisId);

    if (!analysis) {
      return res.status(404).json({ message: 'Analysis not found.' });
    }

    const summary = buildPdfSummaryFromAnalysisRecord(analysis);
    const pdfBuffer = await generateAnalysisPdf(summary);
    const fileName = `resumatch-summary-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid PDF export payload.' });
    }

    console.error('[PDF Export] Failed to generate PDF:', error);
    return res.status(500).json({ message: 'Failed to export PDF.' });
  }
}

module.exports = {
  exportPdf,
};
