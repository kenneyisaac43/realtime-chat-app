const express = require('express');
const router = express.Router();

// Parse JSON bodies (already set up globally if using express.json())
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple validation – replace with actual authentication logic
  if (username && password) {
    // In a real application, generate and return a secure token
    const dummyToken = 'dummy-token';
    res.json({ token: dummyToken, user: username });
  } else {
    res.status(400).json({ error: 'Missing credentials' });
  }
});

// Additional endpoints (e.g., /register) can be added similarly

module.exports = router;
