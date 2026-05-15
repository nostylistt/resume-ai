const { z } = require('zod');
const { generateAnalysisPdf } = require('../services/pdfExportService');

const PdfExportSchema = z.object({
  position: z.string().nullable().optional(),
  analysisMode: z.enum(['full', 'degraded_market', 'no_market_profile']),
  overallScore: z.number().nullable(),
  resumeQualityScore: z.number().nullable(),
  marketFitScore: z.number().nullable(),
  requiredCoverage: z.number().nullable(),
  structureScore: z.number().nullable(),
  atsScore: z.number().nullable(),
  textScore: z.number().nullable(),
  matchedRequiredCount: z.number().int().nonnegative(),
  requiredCount: z.number().int().nonnegative(),
});

async function exportPdf(req, res) {
  try {
    const summary = PdfExportSchema.parse(req.body || {});
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
