// test/auth.test.js

process.env.JWT_SECRET = 'test-jwt-secret';

const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

class MockUser {
  constructor(data) {
    Object.assign(this, data);
    this._id = new mongoose.Types.ObjectId();
  }
  
  save() {
    return Promise.resolve(this);
  }
}

const User = {
  findOne: sinon.stub(),
};

global.User = function(data) {
  return new MockUser(data);
};

const mockRequest = (body = {}) => ({
  body
});

const mockResponse = () => {
  const res = {};
  res.status = sinon.stub().returns(res);
  res.json = sinon.stub().returns(res);
  return res;
};

async function signupHandler(req, res) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    return res.status(201).json({ message: 'User created', token });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function loginHandler(req, res) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }
  
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    return res.json({ message: 'Logged in', token });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

describe('Authentication API', () => {
  let sandbox;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    User.findOne.reset();
    
    sandbox.stub(bcrypt, 'hash');
    sandbox.stub(bcrypt, 'compare');
    sandbox.stub(jwt, 'sign');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('POST /signup', () => {
    it('should return 400 if username is missing', async () => {
      const req = mockRequest({ password: 'password123' });
      const res = mockResponse();
      
      await signupHandler(req, res);
      
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Missing username or password' })).to.be.true;
    });

    it('should return 400 if password is missing', async () => {
      const req = mockRequest({ username: 'testuser' });
      const res = mockResponse();
      
      await signupHandler(req, res);
      
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Missing username or password' })).to.be.true;
    });

    it('should return 409 if username already exists', async () => {
      const req = mockRequest({ username: 'existinguser', password: 'password123' });
      const res = mockResponse();
      
      User.findOne.resolves({ username: 'existinguser' });
      
      await signupHandler(req, res);
      
      expect(res.status.calledWith(409)).to.be.true;
      expect(res.json.calledWith({ error: 'Username already exists' })).to.be.true;
    });

    it('should handle database errors during user creation', async () => {
      const req = mockRequest({ username: 'newuser', password: 'password123' });
      const res = mockResponse();
      
      User.findOne.resolves(null);
      
      const mockSave = sinon.stub().rejects(new Error('Database error'));
      sandbox.stub(MockUser.prototype, 'save').callsFake(mockSave);
      
      await signupHandler(req, res);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Internal server error' })).to.be.true;
    });
  });

  describe('POST /login', () => {
    it('should return 400 if username is missing', async () => {
      const req = mockRequest({ password: 'password123' });
      const res = mockResponse();
      
      await loginHandler(req, res);
      
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Missing username or password' })).to.be.true;
    });

    it('should return 400 if password is missing', async () => {
      const req = mockRequest({ username: 'testuser' });
      const res = mockResponse();
      
      await loginHandler(req, res);
      
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ error: 'Missing username or password' })).to.be.true;
    });

    it('should return 404 if user is not found', async () => {
      const req = mockRequest({ username: 'nonexistent', password: 'password123' });
      const res = mockResponse();
      
      User.findOne.resolves(null);
      
      await loginHandler(req, res);
      
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ error: 'User not found' })).to.be.true;
    });

    it('should return 401 if password is invalid', async () => {
      const req = mockRequest({ username: 'testuser', password: 'wrongpassword' });
      const res = mockResponse();
      
      const mockUser = { 
        _id: 'user123', 
        username: 'testuser', 
        password: 'hashed_password'
      };
      
      User.findOne.resolves(mockUser);
      bcrypt.compare.resolves(false);
      
      await loginHandler(req, res);
      
      expect(bcrypt.compare.calledWith('wrongpassword', 'hashed_password')).to.be.true;
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ error: 'Invalid password' })).to.be.true;
    });

    it('should successfully log in a user', async () => {
      const req = mockRequest({ username: 'testuser', password: 'correctpassword' });
      const res = mockResponse();
      
      const mockUser = { 
        _id: 'user123', 
        username: 'testuser', 
        password: 'hashed_password'
      };
      
      const mockToken = 'jwt_token_123';
      
      User.findOne.resolves(mockUser);
      bcrypt.compare.resolves(true);
      jwt.sign.returns(mockToken);
      
      await loginHandler(req, res);
      
      expect(bcrypt.compare.calledWith('correctpassword', 'hashed_password')).to.be.true;
      expect(jwt.sign.calledWith(
        { id: mockUser._id, username: mockUser.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      )).to.be.true;
      
      expect(res.json.calledWith({ 
        message: 'Logged in', 
        token: mockToken 
      })).to.be.true;
    });

    it('should handle database errors during login', async () => {
      const req = mockRequest({ username: 'testuser', password: 'password123' });
      const res = mockResponse();
      
      User.findOne.rejects(new Error('Database error'));
      
      await loginHandler(req, res);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Internal server error' })).to.be.true;
    });

    it('should handle bcrypt comparison errors', async () => {
      const req = mockRequest({ username: 'testuser', password: 'password123' });
      const res = mockResponse();
      
      const mockUser = { 
        _id: 'user123', 
        username: 'testuser', 
        password: 'hashed_password'
      };
      
      User.findOne.resolves(mockUser);
      bcrypt.compare.rejects(new Error('Bcrypt error'));
      
      await loginHandler(req, res);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ error: 'Internal server error' })).to.be.true;
    });
  });
});