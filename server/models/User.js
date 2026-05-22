const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: false, unique: true, sparse: true },
  password: { type: String, required: false },
  phone: { type: String, required: false, unique: true, sparse: true },
  cognitoSub: { type: String, required: false, sparse: true }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
