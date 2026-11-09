const { expect } = require('chai');
const validateRegistration = require('../src/scripts/validateRegistration');

describe('Registration validation', () => {
  it('rejects a missing password', () => {
    const result = validateRegistration({
      username: 'student123',
      email: 'student@example.com',
      confirmPassword: 'TestPassword123!',
    });

    expect(result).to.equal('Password must be at least 8 characters.');
  });

  it('accepts valid registration information', () => {
    const result = validateRegistration({
      username: 'student123',
      email: 'student@example.com',
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!',
    });

    expect(result).to.equal(null);
  });
});
