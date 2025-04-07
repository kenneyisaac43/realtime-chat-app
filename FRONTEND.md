# Frontend Integration Documentation for EDA Real-Time Chat App

## Overview

This guide describes the features available in the backend and explains how you can integrate your frontend application with our backend system. The backend is built using Node.js, Express, Socket.IO, MongoDB, Redis, and RabbitMQ, and it provides both REST API endpoints and real-time events. The backend is also containerized with Docker. This document will help you:

- Understand the backend features and APIs.
- Integrate the frontend with Socket.IO for real-time messaging.
- Use REST endpoints for authentication, room management, message history retrieval, and key exchange.
- Set up and test the backend locally (with or without Docker) while developing your frontend.

---

## 1. Backend Features Overview

### 1.1. User Authentication & Registration

- **Endpoints:**
  - **POST /api/signup:**  
    Registers a new user.  
    **Request Body Example:**
    ```json
    {
      "username": "exampleUser",
      "password": "examplePassword"
    }
    ```
    **Response:** A JWT token along with a success message.
    
  - **POST /api/login:**  
    Authenticates an existing user.  
    **Request Body Example:**
    ```json
    {
      "username": "exampleUser",
      "password": "examplePassword"
    }
    ```
    **Response:** A JWT token that must be used in subsequent requests (e.g., in the Authorization header as `Bearer <token>`).

- **Integration Tips:**  
  - Use these endpoints to create a signup and login form in your frontend.
  - Store the returned JWT token in local storage or cookies (ensure proper security considerations).

---

### 1.2. Room Management

- **Endpoints:**
  - **POST /api/rooms:**  
    Creates a new public chat room. Requires a valid JWT token in the Authorization header.
    **Request Body Example:**
    ```json
    { "name": "UniqueRoomName" }
    ```
  - **GET /api/rooms:**  
    Retrieves a list of all public chat rooms.

- **Real-Time (Socket.IO) Integration:**  
  - **join room:**  
    Clients emit this event to join a room.  
    **Payload:**  
    ```json
    { "room": "RoomName", "username": "exampleUser" }
    ```
  - **leave room:**  
    Clients emit this event to leave a room.
  - **user list, user joined, user left:**  
    The server broadcasts these events to update the list of online users in the room.

- **Integration Tips:**  
  - Provide a UI for creating a new room and for listing available rooms.
  - When a user selects or creates a room, emit the `join room` event with the username (from the authenticated session) and the room name.
  - Listen for `user list` events to update the online users displayed in the chat interface.

---

### 1.3. Real-Time Messaging

- **Socket.IO Events:**
  - **chat message (Client to Server):**  
    When a user sends a message, emit this event with:  
    ```json
    { "room": "RoomName", "message": "Hello everyone!" }
    ```
  - **chat message (Server to Client):**  
    The server emits processed messages to the room. These messages include metadata such as:
    - `text`
    - `timestamp`
    - `sender` (automatically added based on the user's login info)
    - `room`
  - **error:**  
    Any errors (e.g., rate limiting) are emitted as error events.

- **Integration Tips:**  
  - Set up a Socket.IO client in your frontend to connect to the backend (e.g., `io('http://localhost:3000')`).
  - Listen for the `"chat message"` event to update the chat window.
  - Provide UI elements (input field and send button) for sending messages.
  - Handle error events appropriately (display alerts or inline error messages).

---

### 1.4. Message Persistence

- **Endpoints:**
  - **GET /api/messages?room=RoomName&limit=20&skip=0:**  
    Fetches historical messages for a room with pagination.
    
- **Integration Tips:**  
  - Create a "Load History" button in the chat interface.
  - When the user clicks "Load History," call this endpoint using the current room name.
  - Display the retrieved messages in the chat window (ensure they are sorted chronologically).

---

### 1.5. End-to-End Encryption Support (Key Exchange)

- **Endpoints:**
  - **POST /api/keys/update:**  
    Allows an authenticated user to update or register their public key.  
    **Request Body Example:**
    ```json
    { "publicKey": "-----BEGIN PUBLIC KEY-----\n...your key...\n-----END PUBLIC KEY-----" }
    ```
  - **GET /api/keys/:username:**  
    Retrieves the public key for a specific user.
    
- **Integration Tips:**  
  - Add a settings page or a modal in the frontend where users can upload their public key.
  - Use the GET endpoint to retrieve public keys of other users when needed to encrypt messages client-side.
  - Remember: For true end-to-end encryption, encryption/decryption operations occur on the client, and the server simply facilitates key exchange.

---

### 1.6. Admin Dashboard & Monitoring (Optional for Frontend Integration)

- **Endpoints (for admin only):**
  - **GET /api/admin/logs:**  
    Returns the last 100 log entries.
  - **GET /api/admin/metrics:**  
    Returns system metrics (e.g., memory usage, number of connected sockets).

- **Integration Tips:**  
  - If required, build an admin interface where authorized users can view logs and metrics.
  - Use the provided endpoints and secure them by ensuring the JWT token belongs to an admin user.

---

## 2. Docker and Local Setup

### 2.1. Docker Setup

Our Docker environment is set up using Docker Compose. The `docker-compose.yml` file defines the following services:

- **app:**  
  Your Node.js backend server (exposed on port 3000). It is configured with environment variables:
  - `PORT=3000`
  - `MONGO_URI=mongodb://mongodb:27017/realtime-chat-app`
  - `REDIS_URL=redis://redis:6379`
  - `RABBITMQ_URL=amqp://rabbitmq:5672`
  - `SESSION_SECRET` and `JWT_SECRET`
- **rabbitmq:**  
  RabbitMQ with the management console (ports 5672 and 15672).
- **mongodb:**  
  A MongoDB instance (exposed on port 27017).
- **redis:**  
  A Redis instance (exposed on port 6379).

**To start the system with Docker:**

1. Ensure Docker and Docker Compose are installed.
2. In the project directory, run:
   ```bash
   docker-compose up --build
   ```
3. Your backend will be accessible at `http://localhost:3000`.

### 2.2. Local Setup (Without Docker)

If you prefer to run the backend locally (outside of Docker):

1. **Install Dependencies:**  
   Ensure you have Node.js installed. Then run:
   ```bash
   npm install
   ```
2. **Set Environment Variables:**  
   Create a `.env` file in the project root with:
   ```env
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/realtime-chat-app
   REDIS_URL=redis://localhost:6379
   RABBITMQ_URL=amqp://localhost:5672
   SESSION_SECRET=your-session-secret
   JWT_SECRET=your-jwt-secret
   ```
3. **Start MongoDB, Redis, and RabbitMQ:**  
   Ensure these services are running on your local machine.
4. **Run the Server:**  
   Start the server with:
   ```bash
   node server.js
   ```
5. **Access the Frontend:**  
   The frontend (placed in the `public` directory) will be served at `http://localhost:3000`.

---

## 3. Frontend Integration Guidelines

### 3.1. Socket.IO Integration

- **Connection:**  
  Use the Socket.IO client library to connect to the backend:
  ```javascript
  const socket = io('http://localhost:3000');
  ```
- **Real-Time Events:**  
  Listen for events such as `"chat message"`, `"user list"`, `"user joined"`, `"user left"`, and `"error"`.  
  Emit events like `"join room"`, `"leave room"`, and `"chat message"` with the appropriate payload.
- **Example Payloads:**
  - **Joining a room:**
    ```javascript
    socket.emit('join room', { room: "RoomName", username: "YourUsername" });
    ```
  - **Sending a message:**
    ```javascript
    socket.emit('chat message', { room: "RoomName", message: "Hello, world!" });
    ```

### 3.2. REST API Integration

- **Authentication:**  
  Use your signup (`/api/signup`) and login (`/api/login`) endpoints to register or authenticate users.
- **Room Management:**  
  Use the `/api/rooms` endpoints to create and list public chat rooms.
- **Message History:**  
  Retrieve chat history using `/api/messages?room=RoomName&limit=20&skip=0`.
- **Key Exchange:**  
  Use `/api/keys/update` to register a public key and `/api/keys/:username` to retrieve another user's public key.
- **Admin Endpoints:**  
  If needed, use `/api/admin/logs` and `/api/admin/metrics` for administrative monitoring.

### 3.3. Testing and Debugging

- Use the provided simple frontend (index.html) as a starting point.
- Develop additional interfaces (e.g., for signup, login, room management, and chat) that consume these endpoints.
- Ensure that your frontend properly handles CORS by serving your index.html from the backend (via the `public` directory) rather than directly from the filesystem.
- Log and display errors received from the backend for troubleshooting.

---

## 4. Summary

Your backend now supports:
- **User Authentication:** Secure signup and login with JWT.
- **Room Management:** Create, list, and join public chat rooms.
- **Real-Time Messaging:** Chat messages sent and received via Socket.IO, with room-specific events.
- **Message Persistence:** Chat history stored in MongoDB and retrievable via REST.
- **User Presence Tracking:** Online user lists per room, maintained in Redis.
- **Scalability Enhancements:** Sessions and presence sharing through Redis, and RabbitMQ for message queuing.
- **End-to-End Encryption Support:** Public key exchange endpoints for secure client-side encryption.
- **Rate Limiting & Spam Prevention:** Middleware to limit API calls and per-socket rate limiting.
- **Admin Dashboard:** Endpoints for logs and system metrics for monitoring purposes.

This document should give you a clear roadmap for integrating your frontend application with the backend. It includes details on available features, integration points, and setup instructions (both Docker-based and local). If you have any questions or need additional clarifications during your development, please refer back to this document or reach out for further assistance.