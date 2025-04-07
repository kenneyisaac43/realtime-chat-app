require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const authRoutes = require('./routes/auth');
const { processMessage } = require('./businessLogic');
const { connectToBroker } = require('./broker');
const logger = require('./logger');
const { retryOperation } = require('./retry');

const app = express();
app.use(express.json());
app.use('/api', authRoutes);

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

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

    // Consume messages from the broker and broadcast to all connected clients
    brokerChannel.consume(brokerQueue, (msg) => {
      if (msg !== null) {
        // Wrap the message processing in a retry mechanism
        retryOperation(async () => {
          const message = JSON.parse(msg.content.toString());
          io.emit('chat message', message);
          brokerChannel.ack(msg);
          logger.info(`Message broadcasted to clients: ${JSON.stringify(message)}`);
        }, 3, 1000).catch((error) => {
          logger.error(`Final failure processing message: ${error.message}`);
          brokerChannel.nack(msg);
        });
      }
    });
  } catch (error) {
    logger.error(`Failed to connect to broker: ${error}`);
  }
})();

// Handle WebSocket connections and message publishing
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('chat message', async (msg) => {
    try {
      // Process and validate the message using business logic
      const processedMsg = processMessage(msg);
      
      // Publish the processed message to the broker queue
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

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});
