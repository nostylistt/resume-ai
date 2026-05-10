const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');
const { uploadResume } = require('./controllers/resumeController');

async function test() {
  const filePath = 'C:\\Users\\tcove\\Downloads\\Telegram Desktop\\Maksym_Ivanitskyi_CV.pdf';
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const buffer = fs.readFileSync(filePath);

  const req = {
    file: {
      buffer,
      mimetype: 'application/pdf',
    },
  };

  const res = {
    statusCode: 200,
    status: (code) => {
      res.statusCode = code;
      console.log('--- STATUS CODE:', code, '---');
      return res;
    },
    json: (data) => {
      const outputPath = res.statusCode >= 400 ? 'result.error.json' : 'result.json';
      console.log(`--- FULL JSON RESULT SAVED TO ${outputPath} ---`);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

      console.log('\n=========================================');

      if (res.statusCode >= 400) {
        console.log(`ERROR: ${data.message}`);
        console.log('=========================================\n');
        return;
      }

      console.log(`OVERALL SCORE: ${data.overallScore}/100`);
      console.log(`- Resume Quality: ${data.resumeQualityScore}/100`);
      console.log(`- Structure Score: ${data.structureAnalysis?.score}/100`);
      console.log(`- Text Score: ${data.textAnalysis?.score}/100`);
      console.log(`- ATS Score: ${data.structureAnalysis?.atsScore}/100`);
      console.log(`- Market Fit: ${data.skillsComparison?.stats?.marketFitScore}/100`);
      console.log(`- Analysis Mode: ${data.analysisMode}`);
      console.log('=========================================\n');
    },
  };

  try {
    await uploadResume(req, res);
  } catch (err) {
    console.error('Test script error:', err);
  }
}

test();
