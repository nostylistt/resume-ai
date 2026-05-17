const {
  listResumeAnalysisSummaries,
  getResumeAnalysisSnapshot,
} = require('../services/analysisHistoryService');

async function listHistory(req, res) {
  try {
    const items = await listResumeAnalysisSummaries(req.user.id, req.query.limit);
    return res.json({ items });
  } catch (error) {
    console.error('[Analysis History] Failed to list items:', error);
    return res.status(500).json({ message: 'Не вдалося завантажити історію аналізів' });
  }
}

async function getHistoryItem(req, res) {
  const analysisId = Number(req.params.analysisId);

  if (!Number.isInteger(analysisId) || analysisId <= 0) {
    return res.status(400).json({ message: 'Невірний ідентифікатор аналізу' });
  }

  try {
    const analysis = await getResumeAnalysisSnapshot(req.user.id, analysisId);

    if (!analysis) {
      return res.status(404).json({ message: 'Аналіз не знайдено' });
    }

    return res.json({ analysis });
  } catch (error) {
    console.error('[Analysis History] Failed to load item:', error);
    return res.status(500).json({ message: 'Не вдалося завантажити елемент аналізу' });
  }
}

module.exports = {
  listHistory,
  getHistoryItem,
};
