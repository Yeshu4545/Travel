const fs = require('fs');
const pdf = require('pdf-parse');
const Tesseract = require('tesseract.js');
const path = require('path');
const { OpenAI } = require('openai');

const Itinerary = require('../models/Itinerary');

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

function parseBookingsToItinerary(bookings) {
  const daysMap = {};
  let tripStart = null;
  let tripEnd = null;
  let primaryDestination = null;

  function tryParseDate(str) {
    if (!str) return null;
    str = str.trim();
    const d = new Date(str);
    if (!isNaN(d)) return d.toISOString().split('T')[0];
    const m = str.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (m) {
      const s = `${m[1]} ${m[2]} ${m[3]}`;
      const d2 = new Date(s);
      if (!isNaN(d2)) return d2.toISOString().split('T')[0];
    }
    const m2 = str.match(/([A-Za-z]+)\s+(\d{1,2}),?\s*(\d{4})/);
    if (m2) {
      const s = `${m2[2]} ${m2[1]} ${m2[3]}`;
      const d3 = new Date(s);
      if (!isNaN(d3)) return d3.toISOString().split('T')[0];
    }
    return null;
  }

  bookings.forEach(b => {
    const text = (b.text || '').replace(/\r/g, '\n');
        const dateMatch = text.match(/Journey\s*Date\s*[:]?[\s]*([A-Za-z0-9 ,\-:\/]*)/i)
      || text.match(/Check-?In\s*[:]?[\s]*([A-Za-z0-9 ,\-:\/]*)/i)
      || text.match(/Check-?Out\s*[:]?[\s]*([A-Za-z0-9 ,\-:\/]*)/i)
      || text.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    const dateRaw = dateMatch ? dateMatch[1].trim() : null;
    const date = tryParseDate(dateRaw);

    const from = (text.match(/\bFrom\b\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;
    const to = (text.match(/\bTo\b\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;
    if (to && !primaryDestination) primaryDestination = to.trim();

    const pnr = (text.match(/PNR\s*(?:Number)?\s*[:]?[\s]*([A-Za-z0-9\-]+)/i) || [])[1] || null;
    const train = (text.match(/Train\s*Name\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;
    const trainNo = (text.match(/Train\s*Number\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;
    const passenger = (text.match(/Passenger\s*Name\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;
    const coach = (text.match(/Coach\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;
    const seat = (text.match(/Seat\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;
    const clazz = (text.match(/Class\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;
    const checkIn = (text.match(/Check-?In\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;
    const checkOut = (text.match(/Check-?Out\s*[:]?[\s]*([^\n]+)/i) || [])[1] || null;

    const parsedCheckIn = tryParseDate(checkIn);
    const parsedCheckOut = tryParseDate(checkOut);
    if (parsedCheckIn) tripStart = tripStart || parsedCheckIn;
    if (parsedCheckOut) tripEnd = parsedCheckOut;
    if (date) tripStart = tripStart || date;

    const item = {
      type: train || trainNo ? 'Train' : 'Booking',
      time: null,
      from: from ? from.trim() : null,
      to: to ? to.trim() : null,
      details: [
        passenger ? `Passenger: ${passenger.trim()}` : null,
        train ? `Train: ${train.trim()}` : null,
        trainNo ? `Train no: ${trainNo.trim()}` : null,
        pnr ? `PNR: ${pnr}` : null,
        coach ? `Coach: ${coach}` : null,
        seat ? `Seat: ${seat}` : null,
        clazz ? `Class: ${clazz}` : null
      ].filter(Boolean).join(' | ')
    };

    const dayKey = date || (parsedCheckIn) || 'Unknown date';
    if (!daysMap[dayKey]) daysMap[dayKey] = { date: dayKey, items: [] };
    daysMap[dayKey].items.push(item);
  });

  if (tripStart && !tripEnd) {
    const d = new Date(tripStart);
    const d2 = new Date(d);
    d2.setDate(d2.getDate() + 6);
    tripEnd = d2.toISOString().split('T')[0];
  }

  const days = Object.values(daysMap);
  const out = { title: 'AI Itinerary', days, bookings };
  if (tripStart) out.tripStart = tripStart;
  if (tripEnd) out.tripEnd = tripEnd;
  if (primaryDestination) out.destination = primaryDestination;
  return out;
}

function formatItinerary(obj) {
  if (!obj) return '';
  let out = '';
  out += `${obj.title || 'Planned Itinerary'}\n`;
  out += '='.repeat(40) + '\n\n';
  if (obj.days && obj.days.length) {
    obj.days.forEach((d, di) => {
      out += `${di+1}. ${d.date || 'Date not specified'}\n`;
      if (d.items && d.items.length) {
        d.items.forEach((it, ii) => {
          out += `   - ${it.type || 'Activity'}: ${it.from ? (it.from + (it.to ? ` → ${it.to}` : '')) : ''}`;
          if (it.time) out += ` @ ${it.time}`;
          const details = it.details || '';
          if (details) out += ` — ${details}`;
          out += '\n';
        });
      } else {
        out += '   - No items for this day.\n';
      }
      out += '\n';
    });
  }

  if (obj.bookings && obj.bookings.length) {
    out += 'Bookings attached:\n';
    obj.bookings.forEach(b => {
      out += ` - ${b.filename || b.path || 'file'}\n`;
    });
    out += '\n';
  }

  return out;
}

async function handleUpload(req, res) {
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

    let structured = null;
    if (aiText && aiText.trim()) {
      try { structured = JSON.parse(aiText); } catch (e) { structured = null; }
    }
    if (!structured) {
      structured = parseBookingsToItinerary(extracted);
      aiText = JSON.stringify(structured);
    }

    // planner prompt
    let planned = null;
    let aiRendered = null;
    try {
      const plannerPrompt = `You are a travel planner. Given the user's booking data and constraints, produce a recommended day-by-day sightseeing plan for the trip. Requirements:\n1) Use the trip dates if provided (tripStart/tripEnd). If only tripStart is present, produce a 7-day plan starting that date.\n2) Base the plan on the primary destination (use destination field).\n3) For each day include a short summary and 3-5 suggested activities covering morning/afternoon/evening, with approximate timing and travel time notes.\n4) Keep suggestions realistic for the destination and note entry fees or booking needs when relevant.\n\nBookings and parsed itinerary (JSON):\n${JSON.stringify(structured, null, 2)}\n\nOutput a JSON object with keys: title, days: [{date, summary, activities:[{time, title, location, description}]}]. Also provide a human-readable text plan under the key \"notes\".`;

      const completion2 = await openai.chat.completions.create({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: plannerPrompt }], max_tokens: 1200 });
      const aiContent = completion2.choices?.[0]?.message?.content || completion2.choices?.[0]?.text || '';
      if (aiContent) {
        try { const parsed = JSON.parse(aiContent); planned = parsed; aiRendered = parsed.notes || null; } catch (e) {
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try { planned = JSON.parse(jsonMatch[0]); aiRendered = planned.notes || null; } catch (e2) { planned = null; }
          }
          if (!planned) aiRendered = aiContent;
        }
      }
    } catch (err) {
      console.error('Planner AI error', err?.message || err);
    }

    const finalPlan = planned || structured;
    const finalRendered = aiRendered || formatItinerary(finalPlan);

    const it = await Itinerary.create({ user: req.user.id, title: finalPlan.title || 'AI Itinerary', bookings: extracted, ai_generated: finalPlan });
    res.json({ itinerary: it, ai: finalPlan, rendered: finalRendered });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handleUpload };
