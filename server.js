require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
// For connect-redis, we revert to the older (v5) API usage:
const RedisStore = require('connect-redis')(session);
const Redis = require('ioredis');
const rateLimit = require('express-rate-limit'); // API rate limiter
const crypto = require('crypto');

const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/realtime-chat-app';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Create a Redis client for session storage, presence tracking, etc.
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const authRoutes    = require('./routes/auth');
const roomRoutes    = require('./routes/rooms');
const messageRoutes = require('./routes/messages');
const keyRoutes     = require('./routes/keys');   // Feature 6 endpoints
const adminRoutes   = require('./routes/admin');  // Feature 8 endpoints

const Message       = require('./models/Message');
const { processMessage } = require('./businessLogic');
const { connectToBroker } = require('./broker');
const logger        = require('./logger');
const { retryOperation } = require('./retry');

// Master key for AES-GCM decryption
const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

// Helper to decrypt AES-GCM encrypted blobs
function decryptText({ iv, tag, data }) {
  const ivBuf      = Buffer.from(iv,  'hex');
  const tagBuf     = Buffer.from(tag, 'hex');
  const cipherText = Buffer.from(data,'hex');
  const decipher   = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, ivBuf);
  decipher.setAuthTag(tagBuf);
  const plainBuf   = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return plainBuf.toString('utf8');
}

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
app.use('/api', keyRoutes);
app.use('/api', adminRoutes);

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
    brokerQueue   = broker.queue;

    brokerChannel.consume(brokerQueue, async (msg) => {
      if (!msg) return;

      try {
        const message = JSON.parse(msg.content.toString());

        // Discard any legacy messages without encryption
        if (!message.encrypted || !message.encrypted.data) {
          logger.warn('Skipping legacy or malformed message without encrypted blob');
          brokerChannel.ack(msg);
          return;
        }

        // Save the encrypted message to the database
        await Message.create({
          room:      message.room   || 'global',
          sender:    message.sender || 'unknown',
          encrypted: message.encrypted,
          timestamp: message.timestamp || new Date()
        });

        // Decrypt for real-time broadcast
        const clearText = decryptText(message.encrypted);
        const outbound = {
          room:      message.room,
          sender:    message.sender,
          text:      clearText,
          timestamp: message.timestamp
        };

        if (message.room) {
          io.to(message.room).emit('chat message', outbound);
          logger.info(`Message broadcasted to room ${message.room}: ${JSON.stringify(outbound)}`);
        } else {
          io.emit('chat message', outbound);
          logger.info(`Message broadcasted globally: ${JSON.stringify(outbound)}`);
        }

        brokerChannel.ack(msg);
      } catch (error) {
        logger.error(`Error processing message from broker: ${error.message}`);
        // Acknowledge so we don't requeue bad messages
        brokerChannel.ack(msg);
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
    messageCount:    0,
    windowMs:        5000,  // 5-second window
    maxMessages:     5      // Maximum of 5 messages per window
  };

  // Event: join room.
  socket.on('join room', async ({ room, username }) => {
    if (!room || !username) {
      socket.emit('error', { error: 'Room and username are required to join.' });
      return;
    }
    socket.username = username;
    socket.join(room);
    logger.info(`${username} (${socket.id}) joined room ${room}`);

    await redisClient.sadd(`room:${room}`, username);
    const users = await redisClient.smembers(`room:${room}`);
    io.to(room).emit('user list', users);
    socket.to(room).emit('user joined', { user: username, room });
  });

  // Event: leave room.
  socket.on('leave room', async ({ room, username }) => {
    if (!room || !username) return;
    socket.leave(room);
    logger.info(`${username} (${socket.id}) left room ${room}`);
    await redisClient.srem(`room:${room}`, username);
    const users = await redisClient.smembers(`room:${room}`);
    io.to(room).emit('user list', users);
    socket.to(room).emit('user left', { user: username, room });
  });

  // Clean up on disconnect
  socket.on('disconnect', async () => {
    app.locals.connectedSockets--;
    logger.info(`User disconnected: ${socket.id}`);
    const username = socket.username;
    if (username) {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          await redisClient.srem(`room:${room}`, username);
          const users = await redisClient.smembers(`room:${room}`);
          io.to(room).emit('user list', users);
          socket.to(room).emit('user left', { user: username, room });
        }
      }
    }
  });

  // Updated chat message handler with per-socket rate limiting:
  socket.on('chat message', async (data) => {
    const now = Date.now();
    const rate = socket.rateLimit;
    if (now - rate.lastMessageTime > rate.windowMs) {
      rate.messageCount    = 0;
      rate.lastMessageTime = now;
    }
    rate.messageCount++;
    if (rate.messageCount > rate.maxMessages) {
      socket.emit('error', { error: 'You are sending messages too quickly. Please slow down.' });
      return;
    }

    try {
      const processedMsg = processMessage(data.message);
      processedMsg.room   = data.room;
      if (socket.username) processedMsg.sender = socket.username;

      if (brokerChannel && brokerQueue) {
        brokerChannel.sendToQueue(
          brokerQueue,
          Buffer.from(JSON.stringify(processedMsg))
        );
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
