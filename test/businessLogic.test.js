const { expect } = require('chai');
const { validateMessage, processMessage } = require('../businessLogic');

describe('Business Logic', () => {
  describe('validateMessage', () => {
    it('should return true for a valid non-empty string', () => {
      expect(validateMessage("Hello")).to.be.true;
    });

    it('should return false for an empty string', () => {
      expect(validateMessage("")).to.be.false;
    });

    it('should return true for a valid object with non-empty text', () => {
      expect(validateMessage({ text: "Hi there" })).to.be.true;
    });

    it('should return false for an object with empty text', () => {
      expect(validateMessage({ text: "   " })).to.be.false;
    });
  });

  describe('processMessage', () => {
    it('should process a valid string message by adding a timestamp', () => {
      const msg = "Test message";
      const processed = processMessage(msg);
      expect(processed).to.have.property('text', msg);
      expect(processed).to.have.property('timestamp');
    });

    it('should process an object message and preserve sender and room if provided', () => {
      const input = { text: "Hello", sender: "user1", room: "room1" };
      const processed = processMessage(input);
      expect(processed).to.have.property('text', "Hello");
      expect(processed).to.have.property('timestamp');
      expect(processed).to.have.property('sender', "user1");
      expect(processed).to.have.property('room', "room1");
    });

    it('should throw an error for an invalid message', () => {
      expect(() => processMessage("")).to.throw('Invalid message format');
    });
  });
});
