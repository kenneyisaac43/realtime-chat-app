# EDA Real-Time Chat App Documentation

# Dependencies
- Docker Desktop (Windows/Mac) or Docker Engine (Linux) (Make sure to start the Docker Engine before running the containers)

## Setup/Deployment Instructions (Docker)

1. **Start Docker Engine:**  
   Ensure Docker is running on your machine.

2. **Docker Deployment:**  
   Use the provided Dockerfile and docker-compose.yml to run all services:

   run this command in the root directory of the project:
   ```bash
   docker-compose up --build
   ```

   This will spin up containers for the backend, RabbitMQ, MongoDB, and Redis.
   The Frontend will be Hosted on 127.0.0.1:3000/


## Overview

The EDA Real-Time Chat App is a scalable, low-latency, and asynchronous messaging platform built using an event-driven architecture. The backend is developed with Node.js and Express, using Socket.IO for real-time communication. Key integrations include:
- **User Authentication:** Secure user registration and login using JWT with password hashing.
- **Public Chat Rooms:** REST endpoints to create and list rooms and Socket.IO room functionality.
- **Message Persistence:** MongoDB is used to persist chat messages along with metadata (sender, room, timestamp).
- **User Presence:** Real-time online status per chat room, using Redis for distributed presence tracking.
- **Scalability Enhancements:** Horizontal scaling with shared sessions via Redis and a Redis adapter for Socket.IO.
- **End-to-End Encryption Key Exchange:** Endpoints for public key registration and retrieval to support client-side encryption.
- **Rate Limiting & Spam Prevention:** Middleware for REST endpoints and per-socket rate limiting for chat messages.
- **Admin Dashboard & Monitoring:** Secure admin endpoints for logs and basic system metrics.

## Architecture

The application is composed of several interconnected components:

- **Backend Server:**  
  A Node.js/Express server handling REST API endpoints for authentication, room management, message retrieval, and admin functions.
  
- **Real-Time Communication:**  
  Socket.IO enables real-time bidirectional messaging. Clients can join rooms, send messages, and receive live updates on user presence.
  
- **Message Broker:**  
  RabbitMQ manages asynchronous message queuing. Processed messages are published to a dedicated queue, consumed, persisted in MongoDB, and then broadcast to the appropriate room.
  
- **Persistent Storage:**  
  MongoDB stores user data, chat rooms, and chat history.
  
- **Distributed Cache & Session Store:**  
  Redis is used for session sharing (via express-session) and for tracking user presence in a scalable, multi-instance deployment.
  
- **End-to-End Encryption Support:**  
  Public key registration and retrieval endpoints allow clients to securely exchange keys for end-to-end encrypted messaging.
  
- **Rate Limiting:**  
  The system applies rate limiting on REST APIs (using express-rate-limit) and enforces per-socket limits on real-time messaging.
  
- **Administrative Monitoring:**  
  Admin endpoints provide access to recent log data and system metrics, enabling performance monitoring and troubleshooting.

## API Endpoints

### Authentication Endpoints
- **POST /api/signup**  
  **Description:** Registers a new user with a unique username and password.  
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
    "message": "User created",
    "token": "jwt-token-here"
  }
  ```

- **POST /api/login**  
  **Description:** Authenticates a user and returns a JWT token.  
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
    "message": "Logged in",
    "token": "jwt-token-here"
  }
  ```

### Room Management Endpoints
- **POST /api/rooms**  
  **Description:** Creates a new public chat room. Requires a valid JWT in the Authorization header.  
  **Request Body:**  
  ```json
  { "name": "UniqueRoomName" }
  ```  
  **Response:**  
  ```json
  { "message": "Room created", "room": { "name": "UniqueRoomName", ... } }
  ```

- **GET /api/rooms**  
  **Description:** Retrieves a list of all available public chat rooms.

### Message Endpoints
- **GET /api/messages?room=roomName&limit=20&skip=0**  
  **Description:** Retrieves historical messages for a specified room with pagination.

### Key Exchange Endpoints (Feature 6)
- **POST /api/keys/update**  
  **Description:** Authenticated users can register or update their public key.  
  **Request Body:**  
  ```json
  { "publicKey": "-----BEGIN PUBLIC KEY-----\n..." }
  ```
- **GET /api/keys/:username**  
  **Description:** Retrieves the public key for a given username.

### Admin Endpoints (Feature 8)
- **GET /api/admin/logs**  
  **Description:** Returns the last 100 lines from the application log (Admins only).
- **GET /api/admin/metrics**  
  **Description:** Returns basic system metrics (e.g., memory usage, connected socket count).

## WebSocket Events

### Connection Events
- **connection:**  
  Emitted when a client connects. Logs the socket ID.
- **disconnect:**  
  Emitted when a client disconnects. Cleans up presence data.

### Chat & Room Events
- **join room:**  
  Clients emit this event with `{ room, username }` to join a room. The server adds the user to the room (tracked in Redis) and broadcasts the updated user list.
- **leave room:**  
  Clients emit this event to leave a room. The server updates the presence data accordingly.
- **chat message:**  
  Clients emit a chat message with `{ room, message }`. The server processes the message (adding timestamp, sender, etc.), publishes it to RabbitMQ, persists it in MongoDB, and broadcasts it to the room.
- **user list:**  
  Emitted by the server to provide the current list of online users in a room.
- **user joined / user left:**  
  Notifications when users join or leave a room.

### Error Events
- **error:**  
  Emitted when message processing or other operations fail.

## Message Broker Integration

- **Queue:**  
  The system asserts a RabbitMQ queue named `chat_messages`.
- **Publishing:**  
  Processed messages (enriched with timestamp, sender, and room) are published to the queue.
- **Consuming:**  
  The consumer saves messages to MongoDB, then emits them to the correct room using Socket.IO. Acknowledgements (`ack`) and negative acknowledgements (`nack`) with retries ensure reliability.

## Testing
  The application using unit tests to make sure components work as intnended. They are build using the Mocha and Chai libraries.

  Make sure to run the following commands or already have the correct packages installed.
  ```bash
  npm install
  npm install sinon
  ```

  The following command will run the unit tests:
  ```bash
  npm run test
  ```

  Load testing can be ran with the following command:
  ```bash
  artillery run load-test.yml
  ```

## Conclusion

This documentation provides a comprehensive guide for developers. It details the application's architecture, API contracts, real-time events, and deployment instructions. This living document will continue to evolve as new features and optimizations are integrated into the system.