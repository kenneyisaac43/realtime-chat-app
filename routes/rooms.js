// routes/rooms.js
const express = require('express');
const router = express.Router();
const ChatRoom = require('../models/ChatRoom');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST /api/rooms - Create a new chat room
router.post('/rooms', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Room name is required" });
  }
  
  // Expecting the JWT in the Authorization header (Bearer token)
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const user = jwt.verify(token, JWT_SECRET);
    
    // Check if the room already exists
    const existingRoom = await ChatRoom.findOne({ name });
    if (existingRoom) {
      return res.status(409).json({ error: "Room name already exists" });
    }
    
    // Create and save the new room
    const newRoom = new ChatRoom({ name, creator: user.id });
    await newRoom.save();
    res.status(201).json({ message: "Room created", room: newRoom });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/rooms - List all chat rooms
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await ChatRoom.find().sort({ createdAt: -1 });
    res.json({ rooms });
  } catch (error) {
    console.error("Error listing rooms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
