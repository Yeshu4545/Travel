const crypto = require('crypto');
const Itinerary = require('../models/Itinerary');

async function listItineraries(req, res) {
  try {
    const list = await Itinerary.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ itineraries: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getItinerary(req, res) {
  try {
    const it = await Itinerary.findById(req.params.id);
    if (!it) return res.status(404).json({ message: 'Not found' });
    if (it.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    res.json({ itinerary: it });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function shareItinerary(req, res) {
  try {
    const it = await Itinerary.findById(req.params.id);
    if (!it) return res.status(404).json({ message: 'Not found' });
    if (it.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    const token = crypto.randomBytes(8).toString('hex');
    it.shared = true;
    it.share_token = token;
    await it.save();
    res.json({
      share_token: token,
      share_api_url: `${req.protocol}://${req.get('host')}/api/itinerary/shared/${token}`,
      share_path: `#share/${token}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getShared(req, res) {
  try {
    const it = await Itinerary.findOne({ share_token: req.params.token, shared: true });
    if (!it) return res.status(404).json({ message: 'Not found' });
    res.json({ itinerary: it });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listItineraries, getItinerary, shareItinerary, getShared };
