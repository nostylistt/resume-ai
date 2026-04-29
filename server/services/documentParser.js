const mammoth = require('mammoth');

/**
 * Extracts raw text from PDF and DOCX files.
 * @param {Buffer} buffer - File buffer
 * @param {string} mimetype - File MIME type
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromFile(buffer, mimetype) {
    let text = '';

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
        throw new Error('Unsupported file format. Please use PDF or DOCX.');
    }

    return text.trim();
}

module.exports = {
    extractTextFromFile
};
