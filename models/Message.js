// models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  room:      { type: String, required: true },
  sender:    { type: String, required: true },
  encrypted: {
    iv:   { type: String, required: true },
    tag:  { type: String, required: true },
    data: { type: String, required: true }
  },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);
