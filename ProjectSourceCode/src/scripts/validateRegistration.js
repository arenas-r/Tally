function validateRegistration(input) {
  const username = input?.username;
  const email = input?.email;
  const password = input?.password;
  const confirmPassword = input?.confirmPassword;

  if (
    typeof username !== 'string' ||
    username.trim().length < 2 ||
    username.trim().length > 64
  ) {
    return 'Username must be between 2 and 64 characters.';
  }

  const normalizedEmail =
    typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    normalizedEmail.length > 200
  ) {
    return 'Enter a valid email address.';
  }

  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }

  if (
    typeof confirmPassword !== 'string' ||
    password !== confirmPassword
  ) {
    return 'Passwords do not match.';
  }

  return null;
}

module.exports = validateRegistration;