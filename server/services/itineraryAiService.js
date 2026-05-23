const { GoogleGenerativeAI } = require('@google/generative-ai');

function parseJsonFromAi(content) {
  if (!content) return null;
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim());
      } catch {
        /* continue */
      }
    }
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

const SYSTEM_PROMPT = `You are an expert travel planner. You receive OCR/PDF text from travel bookings (flights, trains, hotels, tickets).

Your job:
1. Extract all relevant booking facts (passenger names, PNR, dates, cities, hotels, transport).
2. Infer the primary destination and trip date range from the documents.
3. Build a realistic 7-day WEEKLY sightseeing plan for that destination (extend or shorten to match trip length if dates are clear).
4. Each day must include: date (ISO YYYY-MM-DD if known else Day N), dayLabel, theme, and 3-5 activities with time, title, location, description, and type (transport|hotel|sightseeing|food|rest).

Return ONLY valid JSON with this exact structure:
{
  "title": "string",
  "destination": "string",
  "tripStart": "YYYY-MM-DD or null",
  "tripEnd": "YYYY-MM-DD or null",
  "summary": "2-3 sentence trip overview",
  "bookingsSummary": [{ "source": "filename", "type": "flight|train|hotel|other", "details": "string" }],
  "weeklyPlan": [
    {
      "day": 1,
      "date": "YYYY-MM-DD or Day 1",
      "dayLabel": "Monday - Arrival",
      "theme": "string",
      "activities": [
        { "time": "09:00", "title": "string", "location": "string", "description": "string", "type": "sightseeing" }
      ]
    }
  ]
}`;

/** Short names like gemini-1.5-flash are invalid — map to current API model IDs */
const MODEL_ALIASES = {
  'gemini-1.5-flash': 'gemini-2.5-flash',
  'gemini-1.5-flash-002': 'gemini-2.5-flash',
  'gemini-1.5-pro': 'gemini-2.5-flash',
  'gemini-1.5-pro-002': 'gemini-2.5-flash',
  'gemini-pro': 'gemini-2.5-flash',
  'gemini-2.0-flash': 'gemini-2.5-flash',
  'gemini-2.0-flash-001': 'gemini-2.5-flash',
};

/** Do not use gemini-2.0-flash — blocked for new API users */
const MODEL_FALLBACKS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro-002',
];

function resolveModelName(name) {
  const raw = (name || 'gemini-2.5-flash').trim();
  return MODEL_ALIASES[raw] || raw;
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }
  return new GoogleGenerativeAI(apiKey);
}

function getGeminiModel(genAI, modelName) {
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
  });
}

function isRetryableModelError(err) {
  const msg = err?.message || String(err);
  return (
    err?.status === 404 ||
    /not found|404|no longer available|not supported/i.test(msg)
  );
}

async function generateWeeklyItinerary(extracted, combinedText) {
  const genAI = getGeminiClient();
  const preferred = resolveModelName(process.env.GEMINI_MODEL);
  const modelsToTry = [...new Set([preferred, ...MODEL_FALLBACKS])];

  const userPrompt = `Uploaded booking documents (${extracted.length} file(s)):

${combinedText}

Create the weekly travel itinerary JSON. Use real place names for the destination. Align activities with booking dates when present.`;

  let lastError = null;
  let raw = '';

  for (const modelName of modelsToTry) {
    try {
      const model = getGeminiModel(genAI, modelName);
      const result = await model.generateContent(userPrompt);
      raw = result.response.text();
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (!isRetryableModelError(err)) throw err;
      console.warn(`Gemini model "${modelName}" unavailable, trying next...`);
    }
  }

  if (lastError) {
    throw new Error(
      `No Gemini model available. Set GEMINI_MODEL=gemini-2.5-flash in server/.env. Details: ${lastError.message}`
    );
  }

  const plan = parseJsonFromAi(raw);
  if (!plan || !Array.isArray(plan.weeklyPlan)) {
    throw new Error('Gemini did not return a valid weekly plan structure');
  }
  return plan;
}

function formatWeeklyPlanText(plan) {
  if (!plan) return '';
  let out = `${plan.title || 'Travel Itinerary'}\n`;
  out += `${plan.destination || ''}\n`;
  if (plan.tripStart || plan.tripEnd) {
    out += `Dates: ${plan.tripStart || '?'} → ${plan.tripEnd || '?'}\n`;
  }
  out += '\n' + (plan.summary || '') + '\n\n';
  out += '='.repeat(48) + '\n\n';

  (plan.weeklyPlan || []).forEach((day) => {
    out += `📅 ${day.dayLabel || `Day ${day.day}`}${day.date ? ` (${day.date})` : ''}\n`;
    out += `   Theme: ${day.theme || 'Explore'}\n\n`;
    (day.activities || []).forEach((act) => {
      out += `   ${act.time || '--:--'}  ${act.title || 'Activity'}\n`;
      out += `           📍 ${act.location || 'TBD'}\n`;
      if (act.description) out += `           ${act.description}\n`;
      out += '\n';
    });
    out += '\n';
  });

  if (plan.bookingsSummary?.length) {
    out += 'Confirmed bookings from uploads:\n';
    plan.bookingsSummary.forEach((b) => {
      out += ` • [${b.type || 'booking'}] ${b.source}: ${b.details}\n`;
    });
  }

  return out;
}

module.exports = { generateWeeklyItinerary, formatWeeklyPlanText, parseJsonFromAi };
