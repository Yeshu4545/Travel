const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Otp = require('../models/Otp');
const { upsertCognitoUser, authenticateCognito } = require('../services/cognito');
const { issueTokenPair, verifyRefreshToken } = require('../services/jwt');

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authResponse(user, tokens, cognitoTokens = null) {
  return {
    ...tokens,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      cognitoSub: user.cognitoSub || null,
    },
    cognito: cognitoTokens,
  };
}

async function register(req, res) {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email address' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    let cognitoSub = null;
    try {
      cognitoSub = await upsertCognitoUser({
        email: normalizedEmail,
        name: name.trim(),
        password,
      });
    } catch (cognitoErr) {
      console.error('Cognito registration error', cognitoErr.message || cognitoErr);
      if (process.env.COGNITO_USER_POOL_ID) {
        return res.status(500).json({ error: 'Failed to register with Cognito. Check server Cognito settings.' });
      }
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      cognitoSub: cognitoSub || undefined,
    });

    let cognitoTokens = null;
    try {
      cognitoTokens = await authenticateCognito({ email: normalizedEmail, password });
    } catch (e) {
      console.error('Cognito login after register', e.message || e);
    }

    const tokens = issueTokenPair(user);
    res.json(authResponse(user, tokens, cognitoTokens));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({
        error: 'No account found with this email. Please create an account.',
        code: 'USER_NOT_FOUND',
      });
    }
    if (!user.password) {
      return res.status(404).json({
        error: 'No account found with this email. Please create an account.',
        code: 'USER_NOT_FOUND',
      });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        error: 'Incorrect password. Please try again.',
        code: 'INVALID_PASSWORD',
      });
    }

    let cognitoTokens = null;
    try {
      cognitoTokens = await authenticateCognito({ email: normalizedEmail, password });
    } catch (cognitoErr) {
      console.error('Cognito auth error', cognitoErr.message || cognitoErr);
    }

    const tokens = issueTokenPair(user);
    res.json(authResponse(user, tokens, cognitoTokens));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const tokens = issueTokenPair(user);
    res.json(authResponse(user, tokens));
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
}

async function me(req, res) {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        cognitoSub: user.cognitoSub || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function sendOtp(req, res) {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return res.status(400).json({ error: 'email required' });
    if (!isValidEmail(normalizedEmail)) return res.status(400).json({ error: 'Invalid email address' });

    const recent = await Otp.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (recent && Date.now() - new Date(recent.createdAt).getTime() < 30 * 1000) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5);

    await Otp.create({ email: normalizedEmail, codeHash, expiresAt });

    console.log(`OTP for ${normalizedEmail}: ${code}`);
    res.json({ ok: true, sent: true, devCode: code });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function verifyOtp(req, res) {
  try {
    const { email, code, name, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !code) return res.status(400).json({ error: 'email and code required' });

    const record = await Otp.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
    if (!record) return res.status(400).json({ error: 'No code requested' });
    if (new Date() > record.expiresAt) return res.status(400).json({ error: 'Code expired' });

    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return res.status(400).json({ error: 'Invalid code' });
    }

    await Otp.deleteMany({ email: normalizedEmail });

    let cognitoSub = null;
    try {
      cognitoSub = await upsertCognitoUser({
        email: normalizedEmail,
        name: name || 'New User',
        password: password || undefined,
      });
    } catch (cognitoErr) {
      console.error('Cognito registration error', cognitoErr.message || cognitoErr);
      if (process.env.COGNITO_USER_POOL_ID) {
        return res.status(500).json({ error: 'Failed to register with Cognito. Check server Cognito settings.' });
      }
    }

    let user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const hashed = password ? await bcrypt.hash(password, 10) : undefined;
      user = await User.create({
        name: name || 'New User',
        email: normalizedEmail,
        password: hashed,
        cognitoSub: cognitoSub || undefined,
      });
    } else if (cognitoSub && !user.cognitoSub) {
      user.cognitoSub = cognitoSub;
      await user.save();
    }

    const tokens = issueTokenPair(user);
    res.json(authResponse(user, tokens));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, refresh, me, sendOtp, verifyOtp };
