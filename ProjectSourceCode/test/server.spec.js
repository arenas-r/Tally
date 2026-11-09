const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/scripts/app');
const {db, pgp} = require('../src/scripts/db');
const bcrypt = require('bcryptjs');

chai.use(chaiHttp);
const {expect} = chai;

// Root hook: close the shared database pool after all tests in this process.
// Keep other suites in this file or reuse these imports in separate files.
after(() => {
  pgp.end();
});

describe('Welcome route', () => {
  it('returns the default welcome message', async () => {
    const res = await chai.request(app).get('/welcome');
    expect(res).to.have.status(200);
    expect(res.body).to.deep.equal({
      status: 'success',
      message: 'Welcome!',
    });
  });
});


const { randomUUID } = require('node:crypto');

describe('POST /login/register', () => {
  const testUser = {
    username: `lab10_${randomUUID()}`,
    email: `lab10_${randomUUID()}@example.com`,
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
  };

  async function removeTestUser() {
    await db.none(
      'DELETE FROM users WHERE username = $1 OR email = $2',
      [testUser.username, testUser.email]
    );
  }

  beforeEach(removeTestUser);
  afterEach(removeTestUser);

  it('creates exactly one user for valid input', async () => {
    // Act: submit the registration form.
    const res = await chai
      .request(app)
      .post('/login/register')
      .type('form')
      .send(testUser)
      .redirects(0);

    // Assert: verify the redirect.
    expect(res).to.have.status(302);
    expect(res).to.have.header('location', '/login?registered=1');

    // Assert: verify the database record.
    const rows = await db.any(
      `SELECT username, email, password_hash
       FROM users
       WHERE username = $1`,
      [testUser.username]
    );

    expect(rows).to.have.lengthOf(1);
    expect(rows[0].username).to.equal(testUser.username);
    expect(rows[0].email).to.equal(testUser.email);

    // Verify the password was hashed correctly.
    expect(rows[0].password_hash).not.to.equal(testUser.password);

    expect(
      await bcrypt.compare(testUser.password, rows[0].password_hash)
    ).to.equal(true);
  });

  it('rejects registration when the password is missing', async () => {
    // Act: submit registration without a password.
    const res = await chai
      .request(app)
      .post('/login/register')
      .type('form')
      .send({
        username: testUser.username,
        email: testUser.email,
        confirmPassword: testUser.confirmPassword,
      });

    // Assert: verify the rejection.
    expect(res).to.have.status(400);
    expect(res.text).to.include(
      'Password must be at least 8 characters.'
    );

    // Assert: verify no user was created.
    const rows = await db.any(
      `SELECT user_id
       FROM users
       WHERE username = $1 OR email = $2`,
      [testUser.username, testUser.email]
    );

    expect(rows).to.have.lengthOf(0);
  });
});
