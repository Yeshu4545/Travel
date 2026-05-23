const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');

async function extractTextFromFile(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  if (mimetype === 'application/pdf' || ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    try {
      const data = await pdf(dataBuffer);
      return (data.text || '').trim();
    } catch {
      return '';
    }
  }

  try {
    const {
      data: { text },
    } = await Tesseract.recognize(filePath, 'eng');
    return (text || '').trim();
  } catch {
    return '';
  }
}

async function extractFromUploadedFiles(files) {
  const results = [];
  for (const f of files) {
    const text = await extractTextFromFile(f.path, f.mimetype);
    results.push({
      filename: f.originalname || f.filename,
      path: f.path,
      mimetype: f.mimetype,
      text,
      charCount: text.length,
    });
  }
  return results;
}

function combineExtractedText(extracted) {
  return extracted
    .map((e) => `=== FILE: ${e.filename} ===\n${e.text || '(no text extracted)'}`)
    .join('\n\n---\n\n');
}

module.exports = { extractFromUploadedFiles, combineExtractedText };
