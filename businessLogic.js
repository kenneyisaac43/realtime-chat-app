// businessLogic.js
const crypto = require('crypto');
const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function validateMessage(msg) {
  if (typeof msg === 'string') {
    return msg.trim() !== '';
  }
  if (typeof msg === 'object' && msg !== null) {
    // Ensure there is a non-empty 'text' property
    return typeof msg.text === 'string' && msg.text.trim() !== '';
  }
  return false;
}

function processMessage(msg) {
  if (!validateMessage(msg)) {
    throw new Error('Invalid message format');
  }
  

  const text = typeof msg === 'string' ? msg : msg.text;

  // AES-GCM encryption
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const result = {
    room:      msg.room,
    sender:    msg.sender,
    timestamp: new Date().toISOString(),
    encrypted: {
      iv:   iv.toString('hex'),
      tag:  tag.toString('hex'),
      data: ciphertext.toString('hex')
    }
  };
  
  return result;
}

module.exports = { validateMessage, processMessage };
