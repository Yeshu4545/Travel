const jwt = require('jsonwebtoken');

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${process.env.JWT_SECRET}_refresh`;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function signRefreshToken(payload) {
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, REFRESH_SECRET);
  if (decoded.type !== 'refresh') throw new Error('Invalid refresh token');
  return decoded;
}

function issueTokenPair(user) {
  const payload = {
    id: user._id.toString(),
    email: user.email || null,
    name: user.name || null,
    cognitoSub: user.cognitoSub || null,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: payload.id });
  return {
    accessToken,
    refreshToken,
    token: accessToken,
    expiresIn: ACCESS_EXPIRES,
  };
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  issueTokenPair,
};
