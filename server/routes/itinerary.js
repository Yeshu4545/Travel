const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const itineraryController = require('../controllers/itineraryController');
const { generateFromUpload } = require('../controllers/itineraryGenerateController');

router.post('/generate', auth, upload.array('files', 8), generateFromUpload);
router.get('/shared/:token', itineraryController.getShared);
router.get('/', auth, itineraryController.listItineraries);
router.get('/:id', auth, itineraryController.getItinerary);
router.post('/:id/share', auth, itineraryController.shareItinerary);

module.exports = router;
