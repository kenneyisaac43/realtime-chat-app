// businessLogic.js

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
  
  // Initialize result object
  let result = {};
  
  if (typeof msg === 'string') {
    result.text = msg;
  } else {
    result.text = msg.text;
    // Include additional metadata if provided
    if (msg.sender) {
      result.sender = msg.sender;
    }
    if (msg.room) {
      result.room = msg.room;
    }
  }
  
  // Always add a timestamp
  result.timestamp = new Date().toISOString();
  return result;
}

module.exports = { validateMessage, processMessage };
