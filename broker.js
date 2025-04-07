const amqp = require('amqplib');

async function connectToBroker() {
  try {
    // Connect to RabbitMQ using the URL from your .env file (or default to localhost)
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
    const channel = await connection.createChannel();
    const queue = 'chat_messages';
    
    // Ensure the queue exists; for development, durable:false is acceptable
    await channel.assertQueue(queue, { durable: false });
    console.log('Connected to RabbitMQ broker and asserted queue:', queue);
    
    return { connection, channel, queue };
  } catch (error) {
    console.error('Error connecting to the broker:', error);
    throw error;
  }
}

module.exports = { connectToBroker };
