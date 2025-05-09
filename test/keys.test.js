// test/keys.test.js

process.env.JWT_SECRET = 'test-jwt-secret';

const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
const jwt = require('jsonwebtoken');

const User = {
  findByIdAndUpdate: sinon.stub(),
  findOne: sinon.stub()
};

const mockRequest = (params = {}, body = {}, headers = {}) => ({
  params,
  body,
  headers
});

const mockResponse = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

async function updateKeyHandler(req, res) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const userData = jwt.verify(token, process.env.JWT_SECRET);
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ error: 'Public key is required' });
    }
    const user = await User.findByIdAndUpdate(userData.id, { publicKey }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ message: 'Public key updated', user });
  } catch (error) {
    console.error("Error updating public key:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getKeyHandler(req, res) {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user || !user.publicKey) {
      return res.status(404).json({ error: 'Public key not found' });
    }
    return res.json({ username: user.username, publicKey: user.publicKey });
  } catch (error) {
    console.error("Error retrieving public key:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

describe('Keys API', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    sandbox.stub(jwt, 'verify');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('POST /keys/update', () => {
    it('should return 401 if authorization token is missing', async () => {
      const req = mockRequest({}, {}, {});
      const res = mockResponse();
      
      await updateKeyHandler(req, res);
      
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ error: 'Unauthorized' })).to.be.true;
    });

    it('should return 400 if public key is missing', async () => {
      const req = mockRequest({}, {}, { authorization: 'Bearer valid-token' });
      const res = mockResponse();
      
      jwt.verify.returns({ id: 'user123' });
      
      await updateKeyHandler(req, res);
      
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Public key is required' })).to.be.true;
    });

    it('should return 404 if user is not found', async () => {
      const publicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0vx7agoSuA==\n-----END PUBLIC KEY-----';
      const req = mockRequest({}, { publicKey }, { authorization: 'Bearer valid-token' });
      const res = mockResponse();
      
      jwt.verify.returns({ id: 'user123' });
      User.findByIdAndUpdate.resolves(null);
      
      await updateKeyHandler(req, res);
      
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ error: 'User not found' })).to.be.true;
    });

    it('should successfully update public key', async () => {
      const publicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0vx7agoSuA==\n-----END PUBLIC KEY-----';
      const req = mockRequest({}, { publicKey }, { authorization: 'Bearer valid-token' });
      const res = mockResponse();
      
      const mockUser = { 
        _id: 'user123', 
        username: 'testuser', 
        publicKey 
      };
      
      jwt.verify.returns({ id: 'user123' });
      User.findByIdAndUpdate.resolves(mockUser);
      
      await updateKeyHandler(req, res);
      
      expect(res.json.calledWith({ 
        message: 'Public key updated', 
        user: mockUser 
      })).to.be.true;
    });

    it('should handle JWT verification errors', async () => {
      const req = mockRequest({}, { publicKey: 'test-key' }, { authorization: 'Bearer invalid-token' });
      const res = mockResponse();
      
      jwt.verify.throws(new Error('Invalid token'));
      
      await updateKeyHandler(req, res);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Internal server error' })).to.be.true;
    });

    it('should handle database errors during update', async () => {
      const publicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0vx7agoSuA==\n-----END PUBLIC KEY-----';
      const req = mockRequest({}, { publicKey }, { authorization: 'Bearer valid-token' });
      const res = mockResponse();
      
      jwt.verify.returns({ id: 'user123' });
      User.findByIdAndUpdate.rejects(new Error('Database error'));
      
      await updateKeyHandler(req, res);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Internal server error' })).to.be.true;
    });
  });

  describe('GET /keys/:username', () => {
    it('should return 404 if user is not found', async () => {
      const req = mockRequest({ username: 'nonexistent' });
      const res = mockResponse();
      
      User.findOne.resolves(null);
      
      await getKeyHandler(req, res);
      
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ error: 'Public key not found' })).to.be.true;
    });

    it('should return 404 if user exists but has no public key', async () => {
      const req = mockRequest({ username: 'userwithnopublickey' });
      const res = mockResponse();
      
      User.findOne.resolves({ 
        username: 'userwithnopublickey',
        publicKey: null
      });
      
      await getKeyHandler(req, res);
      
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ error: 'Public key not found' })).to.be.true;
    });

    it('should successfully return a user\'s public key', async () => {
      const req = mockRequest({ username: 'testuser' });
      const res = mockResponse();
      
      const publicKey = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0vx7agoSuA==\n-----END PUBLIC KEY-----';
      User.findOne.resolves({ 
        username: 'testuser',
        publicKey
      });
      
      await getKeyHandler(req, res);
      
      expect(res.json.calledWith({ 
        username: 'testuser', 
        publicKey 
      })).to.be.true;
    });

    it('should handle database errors during retrieval', async () => {
      const req = mockRequest({ username: 'testuser' });
      const res = mockResponse();
      
      User.findOne.rejects(new Error('Database error'));
      
      await getKeyHandler(req, res);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Internal server error' })).to.be.true;
    });
  });
});