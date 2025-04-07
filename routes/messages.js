// routes/messages.js
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');

// GET /api/messages?room=roomName&limit=20&skip=0
router.get('/messages', async (req, res) => {
  try {
    const { room, limit = 20, skip = 0 } = req.query;
    if (!room) {
      return res.status(400).json({ error: "Room parameter is required" });
    }
    // Find messages for the given room, sorted by most recent first
    const messages = await Message.find({ room })
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    res.json({ messages });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
