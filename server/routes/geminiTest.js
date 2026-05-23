const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

router.get('/test', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ ok: false, error: 'GEMINI_API_KEY missing in server/.env' });
  }

  const models = [
    process.env.GEMINI_MODEL || 'gemini-1.5-flash-002',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro-002',
  ];
  const tried = [...new Set(models)];
  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of tried) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Reply with exactly: OK');
      return res.json({ ok: true, model: modelName, reply: result.response.text().trim().slice(0, 50) });
    } catch (err) {
      if (modelName === tried[tried.length - 1]) {
        return res.status(500).json({ ok: false, error: err.message, tried });
      }
    }
  }

  res.status(500).json({ ok: false, error: 'No model worked' });
});

module.exports = router;
