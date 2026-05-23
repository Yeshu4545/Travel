const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { generateFromUpload } = require('../controllers/itineraryGenerateController');

// Legacy path — same handler as POST /api/itinerary/generate
router.post('/', auth, upload.array('files', 8), generateFromUpload);

module.exports = router;
