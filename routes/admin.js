// routes/admin.js
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware to check if the user is an admin.
// For demonstration, we consider a user with username 'admin' as an administrator.
function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
  const token = authHeader.split(' ')[1];
  try {
    const user = jwt.verify(token, JWT_SECRET);
    if (user.username !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Admins only' });
    }
    req.admin = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// GET /api/admin/logs
// Returns the last 100 lines of the log file.
router.get('/admin/logs', adminAuth, (req, res) => {
  const logFilePath = path.join(__dirname, '../combined.log');
  fs.readFile(logFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading log file:', err);
      return res.status(500).json({ error: 'Could not read log file' });
    }
    const lines = data.trim().split('\n');
    const lastLines = lines.slice(-100);
    res.json({ logs: lastLines });
  });
});

// GET /api/admin/metrics
// Returns basic metrics such as process memory usage and current number of connected sockets.
router.get('/admin/metrics', adminAuth, (req, res) => {
  // Example metrics: memory usage and the count of connected sockets.
  // The connected sockets count is maintained in app.locals.connectedSockets (see server.js integration).
  const memoryUsage = process.memoryUsage();
  const metrics = {
    memoryUsage,
    connectedSockets: req.app.locals.connectedSockets || 0
  };
  res.json({ metrics });
});

module.exports = router;
