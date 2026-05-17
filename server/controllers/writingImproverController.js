const { improveWritingBatch } = require('../services/writingImprover');

async function improve(req, res) {
  const { opportunities, position } = req.body || {};

  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    return res.status(400).json({ message: 'Необхідні можливості для переписування.' });
  }

  try {
    const items = await improveWritingBatch({ opportunities, position });
    return res.json({ items });
  } catch (error) {
    console.error('[Writing Improver] Failed to generate variants:', error);
    return res.status(500).json({ message: 'Не вдалося покращити текст.' });
  }
}

module.exports = {
  improve,
};
