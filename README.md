# EDA Real-Time Chat App Documentation

## Overview

The EDA Real-Time Chat App is designed to deliver low-latency, scalable, and asynchronous messaging via an event-driven architecture. The system uses Node.js and Express for the backend, Socket.IO for real-time communication, and RabbitMQ as a message broker to manage message queuing and distribution.

## Architecture

The application is structured as follows:
- **Backend:** A Node.js/Express server that handles REST API endpoints (e.g., authentication) and WebSocket connections.
- **WebSocket Communication:** Socket.IO is used to facilitate real-time bidirectional communication between the server and clients.
- **Message Broker:** RabbitMQ handles asynchronous message queuing. The system publishes processed chat messages to a queue, and a consumer broadcasts messages to all connected WebSocket clients.
- **Business Logic:** Message validation and processing (adding timestamps, error handling) is handled in a separate module.
- **Logging & Retry:** Winston is integrated for robust logging and a custom retry mechanism ensures reliable message processing.

## API Endpoints

### Authentication Endpoints
- **POST /api/login**  
  **Description:** Validates user credentials and returns a token.  
  **Request Body:**  
  ```json
  {
    "username": "user_example",
    "password": "password123"
  }
  ```  
  **Response:**  
  ```json
  {
    "token": "dummy-token",
    "user": "user_example"
  }
  ```

*Additional endpoints (e.g., registration) can be added as needed.*

## WebSocket Events

### Connection Events
- **connection:** Triggered when a client connects to the server.  
  **Example Log:**  
  `User connected: <socket.id>`

- **disconnect:** Triggered when a client disconnects.

### Chat Message Events
- **chat message (Client to Server):**  
  **Payload:** A simple text message (or JSON object if extended).  
  **Processing:** The message is validated and processed (e.g., timestamp is added) before being published to the RabbitMQ queue.
  
- **chat message (Server to Client):**  
  **Payload:** The processed message including the timestamp.  
  **Broadcast:** The message is emitted to all connected clients.

### Error Events
- **error:** Emitted back to the client when message processing fails.

## Message Broker Integration

- **Queue:**  
  The application asserts a RabbitMQ queue named `chat_messages`.
- **Publishing:**  
  Processed messages are published to the queue using `brokerChannel.sendToQueue`.
- **Consuming:**  
  A consumer listens for messages, and upon successful processing, acknowledges them with `channel.ack()`.  
  In case of processing errors, a retry mechanism is invoked, and if retries are exhausted, the message is negatively acknowledged (`channel.nack()`).

## Testing Instructions

### Unit Testing
- **Tools:** Mocha and Chai are used to test individual modules.  
- **Example:**  
  Testing the `businessLogic` module to ensure valid messages are processed correctly and invalid messages throw errors.

### Integration Testing
- **WebSocket Flow:**  
  Use a test client (e.g., with `socket.io-client`) to simulate message sending and receiving.
- **Script Example:**  
  A Node.js script (`test/testClient.js`) connects to the server, emits a chat message, and verifies that the response includes a timestamp.

### Performance & Stress Testing
- **Tools:** Artillery (or Apache JMeter) can simulate multiple concurrent connections.  
- **Sample Configuration:**  
  Create a YAML configuration file (e.g., `load-test.yml`) to simulate load by emitting `chat message` events.  
- **Run Command:**  
  ```bash
  artillery run load-test.yml
  ```

## Deployment Instructions

1. **Environment Variables:**  
   Create a `.env` file in the project root with the following content:
   ```env
   PORT=3000
   RABBITMQ_URL=amqp://localhost
   ```
2. **Dependencies:**  
   Install dependencies using:
   ```bash
   npm install
   ```
3. **Run the Application:**  
   Start the server using:
   ```bash
   node server.js
   ```
   For development, consider using `nodemon` for automatic restarts:
   ```bash
   nodemon server.js
   ```
4. **Docker Deployment (Optional):**  
   Create Dockerfiles for the application and RabbitMQ. Use Docker Compose to manage multi-container deployment.

## Evolution Planning & Roadmap

### Short-Term Enhancements
- **Authentication:**  
  Integrate robust authentication using JWT or OAuth.
- **Error Handling:**  
  Expand error handling to cover more edge cases and improve the retry strategy.
- **Monitoring:**  
  Integrate monitoring tools like Grafana or Prometheus to track application performance.

### Long-Term Enhancements
- **Scalability:**  
  Optimize the architecture to support microservices.
- **Security:**  
  Implement encryption (e.g., TLS for WebSocket connections) and further secure the message broker.
- **New Features:**  
  Plan for future enhancements such as multimedia messaging, AI-driven insights, and more comprehensive user profiles.
- **Documentation Updates:**  
  Maintain up-to-date technical documentation as the application evolves.

---

## Conclusion

This documentation serves as a comprehensive guide for developers and stakeholders. It details the application's architecture, API and event contracts, testing and deployment instructions, and future evolution planning. Use this document as a living reference to ensure consistency and clarity throughout the project's lifecycle.