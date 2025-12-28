const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Will be hashed
  email:    { type: String, required: true, unique: true },
  fullName: { type: String }, // Ad Soyad
  role:     { type: String, enum: ['admin', 'organizer', 'attendee'], default: 'attendee' },
  // Optional: Array of bought tickets can be referenced here or queried from Tickets collection
});

module.exports = mongoose.model('User', UserSchema);