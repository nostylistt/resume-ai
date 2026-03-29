const multer = require('multer');
const mammoth = require('mammoth');
const { extractSections } = require('../services/sectionExtractor');

const upload = multer({ storage: multer.memoryStorage() });

const uploadResume = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'File not found' });
    }

    try {
        let text = '';
        const { mimetype, buffer } = req.file;

        console.time('PDF/DOCX Text Extraction');
        if (mimetype === 'application/pdf') {
            const mupdf = await import('mupdf');
            const doc = mupdf.Document.openDocument(new Uint8Array(buffer), mimetype);
            for (let i = 0; i < doc.countPages(); i++) {
                const page = doc.loadPage(i);
                text += page.toStructuredText().asText() + '\n';
            }
        } else if (
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimetype === 'application/msword'
        ) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return res.status(400).json({ message: 'Непідтримуваний формат файлу. Використовуйте PDF або DOCX.' });
        }
        console.timeEnd('PDF/DOCX Text Extraction');

        const trimmedText = text.trim();
        console.time('LLM sectionExtractor (Total Processing)');
        const parsedResume = await extractSections(trimmedText);
        console.timeEnd('LLM sectionExtractor (Total Processing)');

        return res.json({
            message: 'Файл успішно оброблено',
            format: mimetype.includes('pdf') ? 'pdf' : 'docx',
            text: trimmedText,
            parsedResume
        });

    } catch (error) {
        console.error('Помилка парсингу файлу:', error);
        return res.status(500).json({ message: 'Помилка при обробці файлу' });
    }
};

module.exports = {
    upload,
    uploadResume
};
