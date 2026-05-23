const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const TEST_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro-002',
];

router.get('/test', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY missing in server/.env' });
  }

  const preferred = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const tried = [...new Set([preferred, ...TEST_MODELS])];
  const genAI = new GoogleGenerativeAI(apiKey);
  const errors = [];

  for (const modelName of tried) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Reply with exactly: OK');
      return res.json({ ok: true, model: modelName, reply: result.response.text().trim().slice(0, 50) });
    } catch (err) {
      errors.push({ model: modelName, error: err.message });
    }
  }

  res.status(500).json({ ok: false, error: 'No model worked', tried, errors });
});

module.exports = router;
