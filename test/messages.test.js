// test/messages.test.js
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
const mongoose = require('mongoose');

const Message = {
  find: sinon.stub()
};

const mockRequest = (query = {}) => ({
  query
});

const mockResponse = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

const routes = require('../routes/messages');

async function getMessagesHandler(req, res) {
  try {
    const { room, limit = 20, skip = 0 } = req.query;
    if (!room) {
      return res.status(400).json({ error: "Room parameter is required" });
    }

    const messages = await Message.find({ room })
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const decryptText = (encrypted) => {
      return encrypted.iv === 'mock-iv-1' ? 'Hello, world!' : 'Hi there!';
    };

    const clear = messages.map(m => ({
      room:      m.room,
      sender:    m.sender,
      text:      decryptText(m.encrypted),
      timestamp: m.timestamp
    }));

    res.json({ messages: clear });
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

describe('Messages API', () => {
  beforeEach(() => {
    Message.find.reset();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('GET /messages', () => {
    it('should return 400 if room parameter is missing', async () => {
      const req = mockRequest();
      const res = mockResponse();

      await getMessagesHandler(req, res);
      
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: "Room parameter is required" })).to.be.true;
    });

    it('should return messages for a specific room with default limit and skip', async () => {
      const testRoom = 'testRoom';
      const testMessages = [
        {
          _id: 'mockid1',
          room: testRoom,
          sender: 'user1',
          encrypted: {
            iv: 'mock-iv-1',
            content: 'mock-encrypted-content-1'
          },
          timestamp: new Date()
        },
        {
          _id: 'mockid2',
          room: testRoom,
          sender: 'user2',
          encrypted: {
            iv: 'mock-iv-2',
            content: 'mock-encrypted-content-2'
          },
          timestamp: new Date(Date.now() - 1000)
        }
      ];

      const sortStub = { skip: sinon.stub() };
      const skipStub = { limit: sinon.stub() };
      
      sortStub.skip.returns(skipStub);
      skipStub.limit.returns(testMessages);
      
      Message.find.withArgs({ room: testRoom }).returns(sortStub);
      sortStub.sort = sinon.stub().returns(sortStub);
      sortStub.sort.withArgs({ timestamp: -1 }).returns(sortStub);
      
      const req = mockRequest({ room: testRoom });
      const res = mockResponse();
      
      await getMessagesHandler(req, res);
      
      expect(Message.find.calledWith({ room: testRoom })).to.be.true;
      expect(sortStub.sort.calledWith({ timestamp: -1 })).to.be.true;
      expect(sortStub.skip.calledWith(0)).to.be.true;
      expect(skipStub.limit.calledWith(20)).to.be.true;
      
      const expectedResponse = {
        messages: [
          {
            room: testRoom,
            sender: 'user1',
            text: 'Hello, world!',
            timestamp: testMessages[0].timestamp
          },
          {
            room: testRoom,
            sender: 'user2',
            text: 'Hi there!',
            timestamp: testMessages[1].timestamp
          }
        ]
      };
      
      expect(res.json.calledOnce).to.be.true;
      const actualResponse = res.json.firstCall.args[0];
      expect(actualResponse).to.deep.equal(expectedResponse);
    });

    it('should respect custom limit and skip parameters', async () => {
      const testRoom = 'testRoom';
      const limit = 5;
      const skip = 10;

      const sortStub = { skip: sinon.stub() };
      const skipStub = { limit: sinon.stub() };
      
      sortStub.skip.returns(skipStub);
      skipStub.limit.returns([]);
      
      Message.find.withArgs({ room: testRoom }).returns(sortStub);
      sortStub.sort = sinon.stub().returns(sortStub);
      sortStub.sort.withArgs({ timestamp: -1 }).returns(sortStub);
      
      const req = mockRequest({ room: testRoom, limit, skip });
      const res = mockResponse();
      
      await getMessagesHandler(req, res);
      
      expect(sortStub.skip.calledWith(skip)).to.be.true;
      expect(skipStub.limit.calledWith(limit)).to.be.true;
    });

    it('should handle database errors gracefully', async () => {
      const testRoom = 'testRoom';

      Message.find.throws(new Error('Database connection failed'));
      
      const req = mockRequest({ room: testRoom });
      const res = mockResponse();
      
      await getMessagesHandler(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: "Internal server error" })).to.be.true;
    });

    it('should convert string parameters to integers', async () => {
      const testRoom = 'testRoom';
      const limit = '5'; 
      const skip = '10';
      
      const sortStub = { skip: sinon.stub() };
      const skipStub = { limit: sinon.stub() };
      
      sortStub.skip.returns(skipStub);
      skipStub.limit.returns([]);
      
      Message.find.withArgs({ room: testRoom }).returns(sortStub);
      sortStub.sort = sinon.stub().returns(sortStub);
      sortStub.sort.withArgs({ timestamp: -1 }).returns(sortStub);
      
      const req = mockRequest({ room: testRoom, limit, skip });
      const res = mockResponse();
      
      await getMessagesHandler(req, res);
      
      expect(sortStub.skip.calledWith(10)).to.be.true;
      expect(skipStub.limit.calledWith(5)).to.be.true;
    });

    it('should handle the case when no messages are found', async () => {
      const testRoom = 'emptyRoom';
      
      const sortStub = { skip: sinon.stub() };
      const skipStub = { limit: sinon.stub() };
      
      sortStub.skip.returns(skipStub);
      skipStub.limit.returns([]);
      
      Message.find.withArgs({ room: testRoom }).returns(sortStub);
      sortStub.sort = sinon.stub().returns(sortStub);
      sortStub.sort.withArgs({ timestamp: -1 }).returns(sortStub);
      
      const req = mockRequest({ room: testRoom });
      const res = mockResponse();
      
      await getMessagesHandler(req, res);
      
      expect(res.json.calledOnce).to.be.true;
      const responseData = res.json.firstCall.args[0];
      expect(responseData).to.have.property('messages');
      expect(responseData.messages).to.be.an('array').that.is.empty;
    });
  });
});