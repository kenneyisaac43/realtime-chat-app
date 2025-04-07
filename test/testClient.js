const io = require('socket.io-client');
const assert = require('assert');

const socket = io.connect('http://localhost:3000');

socket.on('connect', () => {
  console.log('Test client connected:', socket.id);
  // Send a test message
  socket.emit('chat message', 'Hello from test client');
});

socket.on('chat message', (msg) => {
  console.log('Received message:', msg);
  try {
    // Validate that the message has been processed (e.g., contains a timestamp)
    assert.ok(msg.timestamp, 'Message should include a timestamp');
    // If the test passes, disconnect
    socket.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
});

socket.on('error', (err) => {
  console.error('Received error:', err);
  process.exit(1);
});
