// routes/messages.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

const crypto = require('crypto');
const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

// GET /api/messages?room=roomName&limit=20&skip=0
router.get('/messages', async (req, res) => {
  try {
    const { room, limit = 20, skip = 0 } = req.query;
    if (!room) {
      return res.status(400).json({ error: "Room parameter is required" });
    }
    const messages = await Message.find({ room })
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const clear = messages.map(m => ({
      room:      m.room,
      sender:    m.sender,
      text:      decryptText(m.encrypted),
      timestamp: m.timestamp
    }));

    res.json({ messages: clear });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
