// models/ChatRoom.js
const mongoose = require('mongoose');

const ChatRoomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ChatRoom', ChatRoomSchema);
