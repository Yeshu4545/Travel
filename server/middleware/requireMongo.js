const mongoose = require('mongoose');

module.exports = function requireMongo(req, res, next) {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    error: 'Database is not connected. Check MONGO_URI in server/.env and allow your IP in MongoDB Atlas.',
    code: 'DB_UNAVAILABLE',
  });
};
