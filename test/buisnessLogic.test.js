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
  });

  describe('processMessage', () => {
    it('should process a valid message by adding a timestamp', () => {
      const msg = "Test message";
      const processed = processMessage(msg);
      expect(processed).to.have.property('text', msg);
      expect(processed).to.have.property('timestamp');
    });

    it('should throw an error for an invalid message', () => {
      expect(() => processMessage("")).to.throw('Invalid message format');
    });
  });
});
