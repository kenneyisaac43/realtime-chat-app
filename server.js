require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const Redis = require('ioredis');
const rateLimit = require('express-rate-limit'); // API rate limiter

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/realtime-chat-app';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Create a Redis client for session storage, presence tracking, etc.
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');
const keyRoutes = require('./routes/keys'); // from feature 6, if integrated
const adminRoutes = require('./routes/admin'); // Feature 8 endpoints

const Message = require('./models/Message');
const { processMessage } = require('./businessLogic');
const { connectToBroker } = require('./broker');
const logger = require('./logger');
const { retryOperation } = require('./retry');

const app = express();
app.use(express.json());

// Setup session middleware using Redis as a shared session store
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false
}));

// Apply API rate limiting to all endpoints under /api
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api', authRoutes);
app.use('/api', roomRoutes);
app.use('/api', messageRoutes);
app.use('/api', keyRoutes); // if using feature 6 endpoints
app.use('/api', adminRoutes); // Feature 8 endpoints

// Serve static files for the frontend
app.use(express.static('public'));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Track connected sockets count for metrics
app.locals.connectedSockets = 0;

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// Variable placeholders for the broker channel and queue
let brokerChannel, brokerQueue;

// Connect to the RabbitMQ broker and set up the consumer
(async () => {
  try {
    const broker = await connectToBroker();
    brokerChannel = broker.channel;
    brokerQueue = broker.queue;

    brokerChannel.consume(brokerQueue, async (msg) => {
      if (msg !== null) {
        try {
          const message = JSON.parse(msg.content.toString());
          
          // Save the message to the database
          await Message.create({
            room: message.room || 'global',
            sender: message.sender || 'unknown',
            text: message.text || message, // Use the string directly if needed
            timestamp: message.timestamp || new Date()
          });

          // Emit to the appropriate room if specified, otherwise emit globally
          if (message.room) {
            io.to(message.room).emit('chat message', message);
            logger.info(`Message broadcasted to room ${message.room}: ${JSON.stringify(message)}`);
          } else {
            io.emit('chat message', message);
            logger.info(`Message broadcasted globally: ${JSON.stringify(message)}`);
          }
          brokerChannel.ack(msg);
        } catch (error) {
          logger.error(`Error processing message from broker: ${error.message}`);
          brokerChannel.nack(msg);
        }
      }
    });

  } catch (error) {
    logger.error(`Failed to connect to broker: ${error}`);
  }
})();

/*
  For presence tracking, we now use Redis sets instead of an in-memory object.
  Each chat room has a key "room:<roomName>" to store the usernames.
*/

// Socket.IO connection and events
io.on('connection', (socket) => {
  app.locals.connectedSockets++;
  logger.info(`User connected: ${socket.id}`);

  // Initialize per-socket rate limiting state
  socket.rateLimit = {
    lastMessageTime: Date.now(),
    messageCount: 0,
    windowMs: 5000,  // 5-second window
    maxMessages: 5   // Maximum of 5 messages per window
  };

  // Event: join room.
  // Expect data: { room: "roomName", username: "user123" }
  socket.on('join room', async (data) => {
    const { room, username } = data;
    if (!room || !username) {
      socket.emit('error', { error: 'Room and username are required to join.' });
      return;
    }
    socket.username = username;
    socket.join(room);
    logger.info(`${username} (${socket.id}) joined room ${room}`);

    // Update presence in Redis: add the user to the room set
    await redisClient.sadd(`room:${room}`, username);
    // Retrieve updated user list from Redis
    const users = await redisClient.smembers(`room:${room}`);
    io.to(room).emit('user list', users);
    socket.to(room).emit('user joined', { user: username, room });
  });

  // Event: leave room.
  // Expect data: { room: "roomName", username: "user123" }
  socket.on('leave room', async (data) => {
    const { room, username } = data;
    if (!room || !username) return;
    socket.leave(room);
    logger.info(`${username} (${socket.id}) left room ${room}`);
    await redisClient.srem(`room:${room}`, username);
    const users = await redisClient.smembers(`room:${room}`);
    io.to(room).emit('user list', users);
    socket.to(room).emit('user left', { user: username, room });
  });

  // When the socket disconnects, remove the user from all rooms
  socket.on('disconnect', async () => {
    app.locals.connectedSockets--;
    logger.info(`User disconnected: ${socket.id}`);
    const username = socket.username;
    if (username) {
      // Iterate over all rooms the socket is in (excluding its own room)
      socket.rooms.forEach(async (room) => {
        if (room !== socket.id) {
          await redisClient.srem(`room:${room}`, username);
          const users = await redisClient.smembers(`room:${room}`);
          io.to(room).emit('user list', users);
          socket.to(room).emit('user left', { user: username, room });
        }
      });
    }
  });

  // Updated chat message handler with per-socket rate limiting:
  socket.on('chat message', async (data) => {
    // Expect data: { room: "roomName", message: "Hello" }
    const now = Date.now();
    const rate = socket.rateLimit;
    if (now - rate.lastMessageTime > rate.windowMs) {
      rate.messageCount = 0;
      rate.lastMessageTime = now;
    }
    rate.messageCount++;
    if (rate.messageCount > rate.maxMessages) {
      socket.emit('error', { error: 'You are sending messages too quickly. Please slow down.' });
      return;
    }
    
    try {
      const processedMsg = processMessage(data.message); // Adds timestamp, etc.
      processedMsg.room = data.room;
      if (socket.username) {
        processedMsg.sender = socket.username;
      }
      // Publish to RabbitMQ if available
      if (brokerChannel && brokerQueue) {
        brokerChannel.sendToQueue(brokerQueue, Buffer.from(JSON.stringify(processedMsg)));
        logger.info(`Message sent to broker: ${JSON.stringify(processedMsg)}`);
      } else {
        logger.error('Broker channel is not initialized');
      }
    } catch (error) {
      logger.error(`Error processing message from ${socket.id}: ${error.message}`);
      socket.emit('error', { error: 'Message could not be processed' });
    }
  });
});
