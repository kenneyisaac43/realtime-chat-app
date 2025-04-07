function validateMessage(msg) {
    // Ensure the message is a non-empty string; adjust logic for JSON if needed
    return typeof msg === 'string' && msg.trim() !== '';
  }
  
  function processMessage(msg) {
    if (!validateMessage(msg)) {
      throw new Error('Invalid message format');
    }
    // Process and augment the message (e.g., add a timestamp)
    return {
      text: msg,
      timestamp: new Date().toISOString()
    };
  }
  
  module.exports = { validateMessage, processMessage };
  