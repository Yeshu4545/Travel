require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const itineraryRoutes = require('./routes/itinerary');
const geminiTestRoutes = require('./routes/geminiTest');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash-002',
  });
});

app.use('/api/gemini', geminiTestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/itinerary', itineraryRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found', method: req.method, path: req.path });
});

app.use((err, req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
  next(err);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${PORT}`);
});

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('Mongo connection error', err));
