const express = require('express');
const router = express.Router();
const crypto = require('crypto');

const auth = require('../middleware/auth');
const Itinerary = require('../models/Itinerary');

router.get('/', auth, async (req, res) => {
  const list = await Itinerary.find({ user: req.user.id }).sort({ createdAt: -1 });
  res.json({ itineraries: list });
});

router.get('/:id', auth, async (req, res) => {
  const it = await Itinerary.findById(req.params.id);
  if (!it) return res.status(404).json({ message: 'Not found' });
  if (it.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  res.json({ itinerary: it });
});

// share itinerary: create a token and mark shared
router.post('/:id/share', auth, async (req, res) => {
  const it = await Itinerary.findById(req.params.id);
  if (!it) return res.status(404).json({ message: 'Not found' });
  if (it.user.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
  const token = crypto.randomBytes(8).toString('hex');
  it.shared = true;
  it.share_token = token;
  await it.save();
  res.json({ share_url: `${req.protocol}://${req.get('host')}/api/itinerary/shared/${token}` });
});

// public share endpoint
router.get('/shared/:token', async (req, res) => {
  const it = await Itinerary.findOne({ share_token: req.params.token, shared: true });
  if (!it) return res.status(404).json({ message: 'Not found' });
  res.json({ itinerary: it });
});

module.exports = router;
