const Itinerary = require('../models/Itinerary');
const { extractFromUploadedFiles, combineExtractedText } = require('../services/extractionService');
const { generateWeeklyItinerary, formatWeeklyPlanText } = require('../services/itineraryAiService');

async function generateFromUpload(req, res) {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ error: 'Upload at least one PDF or image' });
    }

    const extracted = await extractFromUploadedFiles(files);
    const hasText = extracted.some((e) => e.text && e.text.length > 20);
    if (!hasText) {
      return res.status(400).json({
        error: 'Could not extract readable text from the files. Try a clearer PDF or image.',
      });
    }

    const combinedText = combineExtractedText(extracted);
    const weeklyPlanData = await generateWeeklyItinerary(extracted, combinedText);
    const renderedPlan = formatWeeklyPlanText(weeklyPlanData);

    const itinerary = await Itinerary.create({
      user: req.user.id,
      title: weeklyPlanData.title || `Trip to ${weeklyPlanData.destination || 'Destination'}`,
      destination: weeklyPlanData.destination,
      tripStart: weeklyPlanData.tripStart,
      tripEnd: weeklyPlanData.tripEnd,
      summary: weeklyPlanData.summary,
      bookings: extracted.map(({ filename, mimetype, text, charCount }) => ({
        filename,
        mimetype,
        charCount,
        textPreview: text.slice(0, 500),
      })),
      extractedText: combinedText.slice(0, 50000),
      weeklyPlan: weeklyPlanData.weeklyPlan,
      bookingsSummary: weeklyPlanData.bookingsSummary || [],
      ai_generated: weeklyPlanData,
      renderedPlan,
    });

    res.status(201).json({
      ok: true,
      itinerary,
      plan: weeklyPlanData,
      rendered: renderedPlan,
      message: 'Weekly itinerary generated and saved to MongoDB',
    });
  } catch (err) {
    console.error('Generate itinerary error:', err);
    res.status(500).json({
      error: err.message || 'Failed to generate itinerary',
    });
  }
}

module.exports = { generateFromUpload };
