const multer = require('multer');
const { extractTextFromFile } = require('../services/documentParser');
const { extractSections } = require('../services/sectionExtractor');
const { fetchMarketRequirements } = require('../services/marketResearch');
const { compareSkills } = require('../services/skillsComparator');
const { analyzeStructure } = require('../services/structureAnalyzer');
const { analyzeText } = require('../services/textAnalyzer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10 MB max
    fileFilter: (req, file, cb) => {
        const allowed = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword'
        ];
        cb(null, allowed.includes(file.mimetype));
    }
});

const uploadResume = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'File not found' });
    }

    try {
        const { mimetype, buffer } = req.file;

        console.time('[File Parsing]');
        let parsedText = '';
        try {
            parsedText = await extractTextFromFile(buffer, mimetype);
        } catch (parseError) {
            console.timeEnd('[File Parsing]');
            return res.status(400).json({ message: 'Unsupported file format or corrupted file.' });
        }
        console.timeEnd('[File Parsing]');

        console.time('[Resume Extraction API]');
        const parsedResume = await extractSections(parsedText);
        console.timeEnd('[Resume Extraction API]');

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

        return res.json({
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
        });

    } catch (error) {
        console.error('[Resume Processing] Fatal error:', error);
        return res.status(500).json({ message: 'Internal server error processing file.' });
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
    resumeQuality: 0.55,
    marketFit: 0.45,
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
    upload,
    uploadResume
};
