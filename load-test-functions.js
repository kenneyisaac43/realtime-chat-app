const chatMessages = [
  "Hello everyone!",
  "How's everyone doing today?",
  "Just joined the chat, what did I miss?",
  "Is anyone else experiencing lag?",
  "This is a test message for load testing",
  "Can anyone help me with a question?",
  "The server seems to be running smoothly!",
  "I'm just a virtual user in a load test :)",
  "Checking response times with this message",
  "How many users are online right now?",
  "This is message number {{ $randomNumber(1, 1000) }}",
  "Testing latency with a slightly longer message to see how the system handles messages of different sizes",
  "Quick test message",
  "Let's see how the server handles this load",
  "Are the messages appearing in the right order?",
  "Random thought: {{ $randomString(20) }}",
  "Message sent at {{ $timestamp }}",
  "Testing, testing, 1, 2, 3...",
  "Hello from virtual user {{ $randomNumber(1000, 9999) }}",
  "This room seems interesting!"
];

const emojis = ["😊", "👍", "🎉", "🚀", "💬", "🤖", "⚡", "🔥", "✨", "👋"];

function generateRandomMessageCount(context, events, done) {
  context.vars.messageCount = Math.floor(Math.random() * 5) + 3;
  return done();
}

function generateLimitedMessageCount(context, events, done) {
  context.vars.messageCount = Math.floor(Math.random() * 3) + 1;
  return done();
}

function checkAuthAndLogin(context, events, done) {
  if (context.vars.authToken === 'failed-auth') {
    events.emit('request', {
      name: 'Login after failed registration',
      url: '/api/login',
      method: 'POST',
      json: {
        username: 'user-' + generateRandomString(6),
        password: 'testPassword123'
      },
      capture: [{
        json: '$.token',
        as: 'authToken',
        default: 'failed-auth-again'
      }]
    });
  }
  return done();
}

function setDefaultAuth(context, events, done) {
  context.vars.authToken = 'failed-auth';
  return done();
}

function generateRandomMessage(context, events, done) {
  const baseMessage = chatMessages[Math.floor(Math.random() * chatMessages.length)];

  const addEmoji = Math.random() < 0.3;
  let message = baseMessage;
  
  if (addEmoji) {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    message = Math.random() < 0.5 ? `${emoji} ${message}` : `${message} ${emoji}`;
  }

  message = message.replace(/\{\{\s*\$randomNumber\((\d+),\s*(\d+)\)\s*\}\}/g, (match, min, max) => {
    return Math.floor(Math.random() * (parseInt(max) - parseInt(min) + 1)) + parseInt(min);
  });
  
  message = message.replace(/\{\{\s*\$randomString\((\d+)\)\s*\}\}/g, (match, length) => {
    return generateRandomString(parseInt(length));
  });
  
  message = message.replace(/\{\{\s*\$timestamp\s*\}\}/g, () => {
    return new Date().toISOString();
  });
  
  context.vars.randomMessage = message;
  return done();
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  generateRandomMessageCount,
  generateLimitedMessageCount,
  checkAuthAndLogin,
  setDefaultAuth,
  generateRandomMessage
};