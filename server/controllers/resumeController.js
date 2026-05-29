const multer = require('multer');
const { extractTextFromFile } = require('../services/documentParser');
const { extractSections } = require('../services/sectionExtractor');
const { fetchMarketRequirements } = require('../services/marketResearch');
const { compareSkills } = require('../services/skillsComparator');
const { analyzeStructure } = require('../services/structureAnalyzer');
const { analyzeText } = require('../services/textAnalyzer');
const { validateResumeContent } = require('../services/resumeContentValidator');
const { saveResumeAnalysisSnapshot } = require('../services/analysisHistoryService');

const MAX_RESUME_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_RESUME_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_RESUME_MIME_TYPES.includes(file.mimetype)) {
      const error = new Error('UNSUPPORTED_FILE_TYPE');
      error.code = 'UNSUPPORTED_FILE_TYPE';
      return cb(error);
    }

    return cb(null, true);
  },
});

const handleResumeUpload = (req, res, next) => {
  upload.single('resume')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          message: 'Файл завеликий. Максимальний розмір резюме — 10 МБ.',
        });
      }

      return res.status(400).json({
        message: 'Не вдалося завантажити файл резюме.',
      });
    }

    if (error.code === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({
        message: 'Підтримуються лише файли PDF, DOC і DOCX.',
      });
    }

    return next(error);
  });
};

const uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Файл не знайдено' });
  }

  try {
    const { mimetype, buffer } = req.file;

    console.time('[File Parsing]');
    let parsedText = '';
    try {
      parsedText = await extractTextFromFile(buffer, mimetype);
    } catch (parseError) {
      console.timeEnd('[File Parsing]');
      return res.status(400).json({ message: 'Формат файлу не підтримується або файл пошкоджено.' });
    }
    console.timeEnd('[File Parsing]');

    console.time('[Resume Extraction API]');
    const parsedResume = await extractSections(parsedText);
    console.timeEnd('[Resume Extraction API]');

    const resumeValidation = validateResumeContent(parsedResume, parsedText);
    if (!resumeValidation.isValid) {
      console.warn('[Resume Validation] Rejected non-resume document:', resumeValidation.reason, resumeValidation.signals);
      return res.status(422).json({
        message: 'Файл не схожий на резюме. Завантажте PDF або DOCX з резюме кандидата.',
        reason: resumeValidation.reason
      });
    }

    // Parallel pass: local analysis + market data in one shot.
    const position = parsedResume.position;

    console.time('[Parallel Analysis]');
    const [{ structureAnalysis, textAnalysis }, marketData] = await Promise.all([
      // Local analysis is sync, just wrapped so Promise.all can run it alongside market research.
      Promise.resolve().then(() => {
        const structureAnalysis = parsedResume ? analyzeStructure(parsedResume, parsedText) : null;
        const textAnalysis = parsedResume ? analyzeText(parsedResume) : null;
        return { structureAnalysis, textAnalysis };
      }),

      // Market research is the slow branch: scraping + LLM.
      position
        ? fetchMarketRequirements(position, parsedResume.searchKeywords || [], parsedResume.skills)
          .catch(err => {
            console.error('[Market Research Module] Error:', err.message);
            return null;
          })
        : Promise.resolve(null).then(() => {
          console.warn('[Market Research Module] Skipped: Position not found in resume.');
          return null;
        }),
    ]);
    console.timeEnd('[Parallel Analysis]');

    let skillsComparison = null;
    if (marketData && parsedResume.skills) {
      console.time('[Skills Comparison]');
      try {
        skillsComparison = await compareSkills(
          parsedResume.skills,
          marketData.requiredSkills,
          marketData.preferredSkills
        );
      } catch (err) {
        console.error('[Skills Comparison] Error:', err.message);
      }
      console.timeEnd('[Skills Comparison]');
    }

    let resumeQualityScore = null;
    let overallScore = null;
    if (structureAnalysis && textAnalysis) {
      resumeQualityScore = calculateResumeQualityScore(
        structureAnalysis.score || 0,
        textAnalysis.score || 0
      );
      overallScore = calculateOverallScore(
        resumeQualityScore,
        skillsComparison
      );
    }

    const analysisMeta = buildAnalysisMeta({
      position,
      marketData,
      skillsComparison
    });

    const responsePayload = {
      message: 'File processed successfully',
      format: mimetype.includes('pdf') ? 'pdf' : 'docx',
      resumeQualityScore,
      overallScore,
      analysisMode: analysisMeta.analysisMode,
      parsedResume,
      structureAnalysis,
      textAnalysis,
      marketData,
      skillsComparison
    };

    let historyEntry = null;
    try {
      historyEntry = await saveResumeAnalysisSnapshot({
        userId: req.user.id,
        file: req.file,
        analysisResult: responsePayload
      });
    } catch (historyError) {
      console.error('[Analysis History] Failed to save snapshot:', historyError);
    }

    return res.json({
      ...responsePayload,
      historyEntry
    });

  } catch (error) {
    console.error('[Resume Processing] Fatal error:', error);
    return res.status(500).json({ message: 'Внутрішня помилка сервера при обробці файлу.' });
  }
};

function calculateResumeQualityScore(structureScore, textScore) {
  const qualityWeights = {
    structure: 0.30,
    text: 0.25,
  };

  return Math.round(
    (structureScore * qualityWeights.structure + textScore * qualityWeights.text) /
    (qualityWeights.structure + qualityWeights.text)
  );
}

function calculateOverallScore(resumeQualityScore, skillsComparison) {
  const weights = {
    resumeQuality: 0.50,
    marketFit: 0.50,
  };

  const marketFitScore = skillsComparison ? skillsComparison.stats.marketFitScore : null;

  if (marketFitScore !== null) {
    return Math.round(
      resumeQualityScore * weights.resumeQuality +
      marketFitScore * weights.marketFit
    );
  }

  return resumeQualityScore;
}

function buildAnalysisMeta({ position, marketData, skillsComparison }) {
  if (!marketData) {
    return {
      analysisMode: 'no_market_profile',
    };
  }

  const requiredSkillCount =
    (marketData.requiredSkills?.technical?.length || 0) +
    (marketData.requiredSkills?.tools?.length || 0);
  const preferredSkillCount =
    (marketData.preferredSkills?.technical?.length || 0) +
    (marketData.preferredSkills?.tools?.length || 0);
  const sampleSize = marketData.sampleSize || 0;
  const sourceCount = marketData.sourceCount || marketData.sources?.length || 0;
  const hasStrongSample = sampleSize >= 4;
  const hasSourceCoverage = sourceCount >= 2;
  const hasRequiredMarketSignal = requiredSkillCount > 0;
  const hasMarketSignal = hasRequiredMarketSignal || preferredSkillCount > 0;
  const hasCompleteMarketFit =
    Boolean(position) &&
    Boolean(skillsComparison) &&
    hasStrongSample &&
    hasSourceCoverage &&
    hasRequiredMarketSignal;

  const analysisMode = hasCompleteMarketFit || (Boolean(skillsComparison) && hasMarketSignal && sampleSize >= 6)
    ? 'full'
    : 'degraded_market';

  return {
    analysisMode,
  };
}

module.exports = {
  MAX_RESUME_FILE_SIZE_BYTES,
  handleResumeUpload,
  uploadResume
};
