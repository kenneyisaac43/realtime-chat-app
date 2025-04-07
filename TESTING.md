# Testing Developer Documentation for EDA Real-Time Chat App

## Overview

The backend system is built with Node.js, Express, Socket.IO, MongoDB, Redis, and RabbitMQ. It includes the following features:

- **User Authentication:** Secure signup and login with JWT and password hashing.
- **Room Management:** REST endpoints to create and list public chat rooms, with real‑time room joining and leaving.
- **Real-Time Messaging:** Socket.IO handles messaging in specific chat rooms.
- **Message Persistence:** Chat messages are stored in MongoDB and can be retrieved via a REST API.
- **User Presence Tracking:** Redis is used to maintain online user lists per room.
- **Scalability Enhancements:** Shared session and presence management via Redis, and asynchronous message processing with RabbitMQ.
- **End-to-End Encryption Support:** Public key exchange endpoints for secure client-side encryption.
- **Rate Limiting & Spam Prevention:** API rate limiting (using express‑rate‑limit) and per-socket message rate limiting.
- **Admin Dashboard & Monitoring:** Secure endpoints for logs and basic system metrics.

This guide explains how to test these components using various strategies and tools.

---

## 1. Unit Testing

### 1.1. Testing Business Logic

- **Module:** `businessLogic.js`  
- **Purpose:** Validate message processing functions, ensuring they accept both simple strings and object inputs with expected properties (text, sender, room, timestamp).

### Example Test File: `test/businessLogic.test.js`

```javascript
const { expect } = require('chai');
const { validateMessage, processMessage } = require('../businessLogic');

describe('Business Logic', () => {
  describe('validateMessage', () => {
    it('should return true for a valid non-empty string', () => {
      expect(validateMessage("Hello")).to.be.true;
    });

    it('should return false for an empty string', () => {
      expect(validateMessage("")).to.be.false;
    });

    it('should return true for a valid object with non-empty text', () => {
      expect(validateMessage({ text: "Hi there" })).to.be.true;
    });

    it('should return false for an object with empty text', () => {
      expect(validateMessage({ text: "   " })).to.be.false;
    });
  });

  describe('processMessage', () => {
    it('should process a valid string message by adding a timestamp', () => {
      const msg = "Test message";
      const processed = processMessage(msg);
      expect(processed).to.have.property('text', msg);
      expect(processed).to.have.property('timestamp');
    });

    it('should process an object message and preserve sender and room if provided', () => {
      const input = { text: "Hello", sender: "user1", room: "room1" };
      const processed = processMessage(input);
      expect(processed).to.have.property('text', "Hello");
      expect(processed).to.have.property('timestamp');
      expect(processed).to.have.property('sender', "user1");
      expect(processed).to.have.property('room', "room1");
    });

    it('should throw an error for an invalid message', () => {
      expect(() => processMessage("")).to.throw('Invalid message format');
    });
  });
});
```

### Running Unit Tests

- **Command:**  
  ```bash
  npm test
  ```
- Ensure your test script is defined in `package.json` to run Mocha tests.

---

## 2. Integration Testing

Integration tests ensure that all components work together as expected. The following types of integration tests are included:

### 2.1. REST API Testing

- **Tools:** Use Postman or automated test scripts.
- **Endpoints to Test:**
  - **User Authentication:** `/api/signup` and `/api/login`
  - **Room Management:** `/api/rooms` for room creation and listing.
  - **Message History:** `/api/messages?room=RoomName`
  - **Key Exchange:** `/api/keys/update` and `/api/keys/:username`
  - **Admin Endpoints:** `/api/admin/logs` and `/api/admin/metrics`

### 2.2. Socket.IO Integration Testing

- **Test Client:**  
  Use the provided `test/testClient.js` script which simulates a Socket.IO client joining a room, sending a message, and validating the response.

#### Example Test Client: `test/testClient.js`

```javascript
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
    // If test passes, disconnect and exit
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
```

- **Run the Test Client:**  
  ```bash
  node test/testClient.js
  ```

---

## 3. Performance & Stress Testing

### 3.1. Load Testing with Artillery

We use Artillery to simulate multiple Socket.IO clients and test real-time messaging performance.

#### Example Load Test Configuration: `load-test.yml`

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - engine: "socketio"
    flow:
      - emit:
          channel: "join room"
          data: { "room": "loadTestRoom", "username": "loadTester" }
      - think: 1
      - emit:
          channel: "chat message"
          data: { "room": "loadTestRoom", "message": "Load testing message" }
      - think: 1
      - listen: "chat message"
```

### 3.2. Running Artillery

- **Command:**  
  ```bash
  artillery run load-test.yml
  ```

### 3.3. Monitoring Tools

- **Logging:**  
  Winston logs are stored locally (and can be directed to files) for troubleshooting.
- **Metrics:**  
  Use the admin endpoints (`/api/admin/metrics`) to fetch system metrics and verify load behavior.
- **Additional Tools:**  
  Consider integrating Prometheus and Grafana for real-time monitoring if needed.

---

## 4. Backend Comprehensive Setup Guide

### 4.1. Local Setup (Without Docker)

1. **Install Dependencies:**  
   ```bash
   npm install
   ```
2. **Set Environment Variables:**  
   Create a `.env` file with:
   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/realtime-chat-app
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://localhost:5672
   SESSION_SECRET=your-session-secret
   JWT_SECRET=your-jwt-secret
   ```
3. **Run Required Services:**  
   Ensure MongoDB, Redis, and RabbitMQ are running locally.
4. **Start the Server:**  
   ```bash
   node server.js
   ```
5. **Access the Frontend:**  
   Open `http://localhost:3000/index.html` (served from the public folder).

### 4.2. Docker Setup

1. **Dockerfile and docker-compose.yml:**  
   Use the provided Dockerfile and docker-compose.yml to run the entire environment (app, MongoDB, Redis, RabbitMQ).
2. **Build and Run:**  
   ```bash
   docker-compose up --build
   ```
3. **Access the System:**  
   - Backend: `http://localhost:3000`
   - RabbitMQ Management: `http://localhost:15672`
   - MongoDB and Redis are accessible on their respective ports.

---

## 5. Summary

This documentation covers:
- **Unit Tests:** Validate core functions using Mocha/Chai.
- **Integration Tests:** Ensure REST APIs and Socket.IO events work together seamlessly.
- **Performance & Stress Testing:** Use Artillery to simulate load.
- **Local and Docker Setup:** Instructions for both development and containerized environments.

This guide should help you set up and run comprehensive tests on the backend system. If you have any questions or require further modifications, please let me know!
