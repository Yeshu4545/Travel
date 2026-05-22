const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
const path = require('path');
const { OpenAI } = require('openai');

const auth = require('../middleware/auth');
const Itinerary = require('../models/Itinerary');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

async function extractTextFromFile(filePath, mimetype) {
  const ext = path.extname(filePath).toLowerCase();
  if (mimetype === 'application/pdf' || ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    try {
      const data = await pdf(dataBuffer);
      return data.text || '';
    } catch (e) {
      return '';
    }
  }
  try {
    const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
    return text || '';
  } catch (e) {
    return '';
  }
}

router.post('/', auth, upload.array('files', 6), async (req, res) => {
  try {
    const files = req.files || [];
    const extracted = [];
    for (const f of files) {
      const text = await extractTextFromFile(f.path, f.mimetype);
      extracted.push({ filename: f.filename, path: f.path, text });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const combinedText = extracted.map(e => `File: ${e.filename}\n${e.text}`).join('\n---\n');
    const prompt = `You are an assistant that extracts travel booking details and generates a structured itinerary.\n\nInput bookings:\n${combinedText}\n\nOutput a JSON object with: title, days: [{date, items:[{type, time?, from?, to?, details}]}], bookings: [raw booking entries].`;

    let aiText = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800
      });
      aiText = completion.choices?.[0]?.message?.content || completion.choices?.[0]?.text || '';
    } catch (err) {
      console.error('OpenAI error', err?.message || err);
    }

    const it = await Itinerary.create({ user: req.user.id, title: 'AI Itinerary', bookings: extracted, ai_generated: aiText });
    res.json({ itinerary: it, ai: aiText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
