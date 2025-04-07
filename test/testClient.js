const io = require('socket.io-client');
const assert = require('assert');

const socket = io.connect('http://localhost:3000');

socket.on('connect', () => {
  console.log('Test client connected:', socket.id);
  // Join a room first
  socket.emit('join room', { room: "testRoom", username: "testUser" });
  
  // Wait briefly then send a test message
  setTimeout(() => {
    socket.emit('chat message', { room: "testRoom", message: "Hello from test client" });
  }, 500);
});

socket.on('chat message', (msg) => {
  console.log('Received message:', msg);
  try {
    // Validate that the message has been processed and enriched
    assert.ok(msg.timestamp, 'Message should include a timestamp');
    assert.equal(msg.sender, "testUser", 'Sender should be testUser');
    assert.equal(msg.room, "testRoom", 'Room should be testRoom');
    // If the test passes, disconnect and exit
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
