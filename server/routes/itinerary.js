const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const itineraryController = require('../controllers/itineraryController');

router.get('/', auth, itineraryController.listItineraries);
router.get('/:id', auth, itineraryController.getItinerary);
router.post('/:id/share', auth, itineraryController.shareItinerary);
router.get('/shared/:token', itineraryController.getShared);

module.exports = router;
