// test/rooms.test.js

process.env.JWT_SECRET = 'test-secret-key';

const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const ChatRoom = {
  findOne: sinon.stub(),
  find: sinon.stub(),
  prototype: {
    save: sinon.stub()
  }
};

function ChatRoomConstructor(data) {
  this.name = data.name;
  this.creator = data.creator;
  this._id = 'mock-room-id-' + Math.random().toString(36).substring(2, 9);
  this.createdAt = new Date();
  this.save = ChatRoom.prototype.save;
}


const mockRequest = (body = {}, headers = {}) => ({
  body,
  headers
});

const mockResponse = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

async function createRoomHandler(req, res) {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Room name is required" });
  }

  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
  
    const existingRoom = await ChatRoom.findOne({ name });
    if (existingRoom) {
      return res.status(409).json({ error: "Room name already exists" });
    }
    
    const newRoom = new ChatRoomConstructor({ name, creator: user.id });
    await newRoom.save();
    res.status(201).json({ message: "Room created", room: newRoom });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

async function listRoomsHandler(req, res) {
  try {
    const rooms = await ChatRoom.find().sort({ createdAt: -1 });
    res.json({ rooms });
  } catch (error) {
    console.error("Error listing rooms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

describe('Chat Rooms API', () => {
  beforeEach(() => {
    ChatRoom.findOne.reset();
    ChatRoom.find.reset();
    ChatRoom.prototype.save.reset();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('POST /rooms - Create a new chat room', () => {
    it('should return 400 if room name is missing', async () => {
      const req = mockRequest({}, { authorization: 'Bearer valid-token' });
      const res = mockResponse();

      await createRoomHandler(req, res);
      
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: "Room name is required" })).to.be.true;
    });

    it('should return 401 if no token is provided', async () => {
      const req = mockRequest({ name: 'test-room' }, {});
      const res = mockResponse();

      await createRoomHandler(req, res);
      
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ error: "Unauthorized" })).to.be.true;
    });

    it('should return 409 if room name already exists', async () => {
      const token = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET);
      
      ChatRoom.findOne.resolves({ name: 'existing-room', creator: 'user-123' });
      
      const req = mockRequest(
        { name: 'existing-room' }, 
        { authorization: `Bearer ${token}` }
      );
      const res = mockResponse();

      await createRoomHandler(req, res);
      
      expect(ChatRoom.findOne.calledWith({ name: 'existing-room' })).to.be.true;
      expect(res.status.calledWith(409)).to.be.true;
      expect(res.json.calledWith({ error: "Room name already exists" })).to.be.true;
    });

    it('should create a new room successfully', async () => {

      const token = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET);

      ChatRoom.findOne.resolves(null);

      ChatRoom.prototype.save.resolves();
      
      const req = mockRequest(
        { name: 'new-room' }, 
        { authorization: `Bearer ${token}` }
      );
      const res = mockResponse();

      await createRoomHandler(req, res);
      
      expect(ChatRoom.findOne.calledWith({ name: 'new-room' })).to.be.true;
      expect(ChatRoom.prototype.save.calledOnce).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      
      const responseArg = res.json.firstCall.args[0];
      expect(responseArg).to.have.property('message', 'Room created');
      expect(responseArg).to.have.property('room');
      expect(responseArg.room).to.have.property('name', 'new-room');
      expect(responseArg.room).to.have.property('creator', 'user-123');
    });

    it('should handle invalid JWT token', async () => {
      const token = 'invalid-token';
      
      const req = mockRequest(
        { name: 'new-room' }, 
        { authorization: `Bearer ${token}` }
      );
      const res = mockResponse();

      await createRoomHandler(req, res);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Internal server error" })).to.be.true;
    });

    it('should handle database errors when creating a room', async () => {
      const token = jwt.sign({ id: 'user-123' }, process.env.JWT_SECRET);
      
      ChatRoom.findOne.resolves(null);
    
      ChatRoom.prototype.save.rejects(new Error('Database error'));
      
      const req = mockRequest(
        { name: 'new-room' }, 
        { authorization: `Bearer ${token}` }
      );
      const res = mockResponse();

      await createRoomHandler(req, res);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Internal server error" })).to.be.true;
    });
  });

  describe('GET /rooms - List all chat rooms', () => {
    it('should return a list of rooms', async () => {
      const mockRooms = [
        { _id: 'room-1', name: 'Room 1', creator: 'user-1', createdAt: new Date() },
        { _id: 'room-2', name: 'Room 2', creator: 'user-2', createdAt: new Date() }
      ];

      const sortStub = sinon.stub().returns(mockRooms);
      ChatRoom.find.returns({ sort: sortStub });
      
      const req = mockRequest();
      const res = mockResponse();
      
      await listRoomsHandler(req, res);
      
      expect(ChatRoom.find.calledOnce).to.be.true;
      expect(sortStub.calledWith({ createdAt: -1 })).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const responseArg = res.json.firstCall.args[0];
      expect(responseArg).to.have.property('rooms');
      expect(responseArg.rooms).to.deep.equal(mockRooms);
    });

    it('should handle empty rooms list', async () => {
      const sortStub = sinon.stub().returns([]);
      ChatRoom.find.returns({ sort: sortStub });
      
      const req = mockRequest();
      const res = mockResponse();
      
      await listRoomsHandler(req, res);
      
      expect(ChatRoom.find.calledOnce).to.be.true;
      expect(sortStub.calledWith({ createdAt: -1 })).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const responseArg = res.json.firstCall.args[0];
      expect(responseArg).to.have.property('rooms');
      expect(responseArg.rooms).to.be.an('array').that.is.empty;
    });

    it('should handle database errors when listing rooms', async () => {
      const findError = new Error('Database connection error');
      ChatRoom.find.throws(findError);
      
      const req = mockRequest();
      const res = mockResponse();
      
      await listRoomsHandler(req, res);
      
      expect(ChatRoom.find.calledOnce).to.be.true;
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Internal server error" })).to.be.true;
    });
  });
});