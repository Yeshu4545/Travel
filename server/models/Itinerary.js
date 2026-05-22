const mongoose = require('mongoose');

const ItinerarySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String },
  bookings: { type: Array, default: [] },
  ai_generated: { type: Object },
  shared: { type: Boolean, default: false },
  share_token: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Itinerary', ItinerarySchema);
