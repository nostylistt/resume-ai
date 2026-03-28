const multer = require('multer');
const { PDFParse } = require('pdf-parse');
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

        if (mimetype === 'application/pdf') {
            const parser = new PDFParse({ data: buffer });
            const pdfData = await parser.getText();
            await parser.destroy();
            text = pdfData.text;
        } else if (
            mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimetype === 'application/msword'
        ) {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
        } else {
            return res.status(400).json({ message: 'Непідтримуваний формат файлу. Використовуйте PDF або DOCX.' });
        }

        const trimmedText = text.trim();
        const parsedResume = await extractSections(trimmedText);

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
