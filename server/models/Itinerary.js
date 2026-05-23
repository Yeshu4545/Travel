const mongoose = require('mongoose');

const ItinerarySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'Travel Itinerary' },
    destination: { type: String },
    tripStart: { type: String },
    tripEnd: { type: String },
    summary: { type: String },
    bookings: { type: Array, default: [] },
    extractedText: { type: String },
    weeklyPlan: { type: Array, default: [] },
    bookingsSummary: { type: Array, default: [] },
    ai_generated: { type: mongoose.Schema.Types.Mixed },
    renderedPlan: { type: String },
    s3Files: { type: Array, default: [] },
    shared: { type: Boolean, default: false },
    share_token: { type: String, index: true, sparse: true },
    sharedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Itinerary', ItinerarySchema);
