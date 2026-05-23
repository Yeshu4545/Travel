const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const requireMongo = require('../middleware/requireMongo');

router.post('/register', requireMongo, authController.register);
router.post('/login', requireMongo, authController.login);
router.post('/refresh', requireMongo, authController.refresh);
router.get('/me', require('../middleware/auth'), requireMongo, authController.me);
router.post('/send-otp', requireMongo, authController.sendOtp);
router.post('/verify-otp', requireMongo, authController.verifyOtp);

module.exports = router;
