const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Otp = require('../models/Otp');

const twilioSid = process.env.TWILIO_SID;
const twilioToken = process.env.TWILIO_TOKEN;
const twilioFrom = process.env.TWILIO_FROM;
let twilioClient = null;
if (twilioSid && twilioToken) {
  try { twilioClient = require('twilio')(twilioSid, twilioToken); } catch (e) { twilioClient = null; }
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function sendOtp(req, res) {
  try {
    const { phone, countryCode = '+91' } = req.body;
    if (!phone) return res.status(400).json({ error: 'phone required' });

    const full = `${countryCode}${phone}`;
    const recent = await Otp.findOne({ phone: full }).sort({ createdAt: -1 });
    if (recent && (Date.now() - new Date(recent.createdAt).getTime()) < 30*1000) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes

    await Otp.create({ phone: full, codeHash, expiresAt });

    let devCode = null;
    if (twilioClient && twilioFrom) {
      try {
        await twilioClient.messages.create({ body: `Your verification code is ${code}`, from: twilioFrom, to: full });
      } catch (err) {
        console.error('Twilio error', err.message || err);
        devCode = code;
      }
    } else {
      devCode = code;
    }

    res.json({ ok: true, sent: true, devCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function verifyOtp(req, res) {
  try {
    const { phone, countryCode = '+91', code, name } = req.body;
    if (!phone || !code) return res.status(400).json({ error: 'phone and code required' });
    const full = `${countryCode}${phone}`;
    const record = await Otp.findOne({ phone: full }).sort({ createdAt: -1 });
    if (!record) return res.status(400).json({ error: 'No code requested' });
    if (new Date() > record.expiresAt) return res.status(400).json({ error: 'Code expired' });
    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return res.status(400).json({ error: 'Invalid code' });
    }

    await Otp.deleteMany({ phone: full });

    let user = await User.findOne({ phone: full });
    if (!user) {
      user = await User.create({ name: name || 'New User', phone: full });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.json({ token, user: { id: user._id, name: user.name, phone: user.phone } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, sendOtp, verifyOtp };
