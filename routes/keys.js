// routes/keys.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST /api/keys/update - Update or register the user's public key
// Requires Authorization header: "Bearer <token>"
// Body should contain: { "publicKey": "-----BEGIN PUBLIC KEY-----\n..." }
router.post('/keys/update', async (req, res) => {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const userData = jwt.verify(token, JWT_SECRET);
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ error: 'Public key is required' });
    }
    // Update the user's public key
    const user = await User.findByIdAndUpdate(userData.id, { publicKey }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Public key updated', user });
  } catch (error) {
    console.error("Error updating public key:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/keys/:username - Retrieve the public key for a given username
router.get('/keys/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user || !user.publicKey) {
      return res.status(404).json({ error: 'Public key not found' });
    }
    res.json({ username: user.username, publicKey: user.publicKey });
  } catch (error) {
    console.error("Error retrieving public key:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
