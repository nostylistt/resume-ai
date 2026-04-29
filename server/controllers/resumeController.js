const multer = require('multer');
const { extractTextFromFile } = require('../services/documentParser');
const { extractSections } = require('../services/sectionExtractor');
const { fetchMarketRequirements } = require('../services/marketResearch');

const upload = multer({ storage: multer.memoryStorage() });

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

        let marketData = null;
        const position = parsedResume.position;

        if (position) {
            console.time('[Market Research Module]');
            try {
                marketData = await fetchMarketRequirements(
                    position, 
                    parsedResume.searchKeywords || [], 
                    parsedResume.skills
                );
            } catch (err) {
                console.error('[Market Research Module] Error:', err.message);
            }
            console.timeEnd('[Market Research Module]');
        } else {
            console.warn('[Market Research Module] Skipped: Position not found in resume.');
        }

        return res.json({
            message: 'File processed successfully',
            format: mimetype.includes('pdf') ? 'pdf' : 'docx',
            text: parsedText,
            parsedResume,
            marketData
        });

    } catch (error) {
        console.error('[Resume Processing] Fatal error:', error);
        return res.status(500).json({ message: 'Internal server error processing file.' });
    }
};

module.exports = {
    upload,
    uploadResume
};
