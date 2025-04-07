// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// POST /api/signup - User Registration
router.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  
  try {
    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create and save the new user
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    // Generate a JWT token
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.status(201).json({ message: 'User created', token });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/login - User Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Compare the provided password with the stored hash
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    
    // Generate a JWT token upon successful login
    const token = jwt.sign(
      { id: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    res.json({ message: 'Logged in', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
