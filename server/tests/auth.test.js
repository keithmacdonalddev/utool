// c:\Users\macdo\Documents\Cline\utool\server\tests\auth.test.js
import request from 'supertest';
import app from '../server'; // Adjust path if your Express app is exported differently
import mongoose from 'mongoose';
import User from '../models/User'; // Adjust path to your User model
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Load environment variables from .env file
dotenv.config({ path: './config/config.env' }); // Ensure this path is correct relative to server root for tests

// Utility function to generate a token
const generateToken = (id, secret, expiresIn) => {
  return jwt.sign({ id }, secret, { expiresIn });
};

let mongoServer;

describe('Auth Endpoints', () => {
  // Connect to a test database before all tests
  beforeAll(async () => {
    // CRITICAL SAFETY CHECK: Ensure NODE_ENV is 'test'
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'FATAL: NODE_ENV is not set to "test". Aborting tests to prevent data loss on non-test database. Current NODE_ENV: ' +
          process.env.NODE_ENV
      );
    }

    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // The following safety checks for dbName are less critical with MongoMemoryServer,
    // as it always creates a random, isolated database. However, they don't hurt.
    const dbName = mongoUri.split('/').pop().split('?')[0];
    if (!dbName) {
      // Basic check that URI parsing worked
      throw new Error(
        `FATAL: Could not determine database name from MongoMemoryServer URI: ${mongoUri}`
      );
    }
    // console.log(`Test suite connecting to In-Memory MongoDB: ${mongoUri}`);
    // console.log(`In-Memory DB Name: ${dbName}`);

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  });

  // Clear database before each test
  beforeEach(async () => {
    // CRITICAL SAFETY CHECK: Prevent accidentally running tests against production DB
    const currentDbName = mongoose.connection.name;
    if (
      !currentDbName ||
      (!currentDbName.includes('test') && !currentDbName.includes('memory'))
    ) {
      throw new Error(`
        🚨 CRITICAL SAFETY ERROR: Tests are trying to run against a non-test database!
        Current DB: ${currentDbName}
        Tests should only run against databases with 'test' or 'memory' in the name.
        This prevents accidental data loss in production.
      `);
    }

    // With MongoMemoryServer, mongoose.connection.name will be the random DB name.
    // The check for '_test' is no longer strictly necessary but can be kept if desired for consistency.
    // For instance, if you ever switch back from MongoMemoryServer temporarily.
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  });

  // Disconnect from the database after all tests
  afterAll(async () => {
    // CRITICAL SAFETY CHECK: Prevent accidentally running cleanup against production DB
    const currentDbName = mongoose.connection.name;
    if (
      !currentDbName ||
      (!currentDbName.includes('test') && !currentDbName.includes('memory'))
    ) {
      console.error(
        `🚨 CRITICAL: Skipping cleanup - not a test database: ${currentDbName}`
      );
    } else {
    // Clear all data from the in-memory database before stopping the server
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    }

    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          username: 'testuser', // Optional field
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201); // Or 200 depending on your implementation

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful'); // Should contain verification message
    });

    it('should register a new user without username and auto-generate one', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Auto',
          lastName: 'Generated',
          // No username provided - should be auto-generated
          email: 'autogen@example.com',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Registration successful');

      // Verify the user was created with an auto-generated username
      const user = await User.findOne({ email: 'autogen@example.com' });
      expect(user).toBeTruthy();
      expect(user.username).toBeTruthy(); // Should have a generated username
      expect(user.username).toMatch(/^autogenerated\d{4}$/); // Should match the pattern
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login an existing user and return tokens', async () => {
      // First, register a user
      await User.create({
        firstName: 'Login',
        lastName: 'User',
        username: 'loginuser',
        email: 'login@example.com',
        password: 'password123', // Password will be hashed by pre-save hook
        isVerified: true, // Make sure user is verified for login
      });

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined(); // Access token
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshTokenCookie = cookies.find((cookie) =>
        cookie.startsWith('refreshToken=')
      );
      expect(refreshTokenCookie).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/refresh-token', () => {
    let testUser;
    let validRefreshToken;

    beforeEach(async () => {
      // Create a user and a refresh token for them
      testUser = await User.create({
        firstName: 'Refresh',
        lastName: 'Test',
        username: 'refreshtest',
        email: 'refresh@example.com',
        password: 'password123',
        isVerified: true, // Make sure user is verified
      });
      validRefreshToken = generateToken(
        testUser._id,
        process.env.REFRESH_TOKEN_SECRET,
        process.env.REFRESH_TOKEN_EXPIRES_IN
      );
    });

    it('should return a new access token with a valid refresh token cookie', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`refreshToken=${validRefreshToken}`])
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined(); // New access token
      // Optionally, verify the user in the response if your endpoint returns it
      // expect(response.body.user.id).toEqual(testUser._id.toString());
    });

    it('should return 401 if no refresh token cookie is provided', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual('Refresh token is required');
    });

    it('should return 401 if refresh token is invalid (e.g., wrong secret)', async () => {
      const invalidToken = generateToken(testUser._id, 'wrongsecret', '7d');
      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`refreshToken=${invalidToken}`])
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual('Not authorized'); // Or specific "Invalid token"
    });

    it('should return 401 if refresh token is expired', async () => {
      const expiredToken = generateToken(
        testUser._id,
        process.env.REFRESH_TOKEN_SECRET,
        '0s'
      ); // Expires immediately
      // Wait a moment for the token to actually be considered expired
      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`refreshToken=${expiredToken}`])
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual('Not authorized'); // Or specific "Token expired"
    });

    it('should return 401 if user for token not found', async () => {
      const nonExistentUserId = new mongoose.Types.ObjectId();
      const tokenForNonExistentUser = generateToken(
        nonExistentUserId,
        process.env.REFRESH_TOKEN_SECRET,
        '7d'
      );

      const response = await request(app)
        .post('/api/v1/auth/refresh-token')
        .set('Cookie', [`refreshToken=${tokenForNonExistentUser}`])
        .expect(401); // Or 404 depending on how you handle "user not found"

      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual('User not found or token invalid'); // Adjust based on actual error
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear the refresh token cookie and return 200', async () => {
      // First, simulate a login to get a refresh token cookie set by the server
      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: 'logout@example.com', // Assuming a user 'logout@example.com' is seeded or created
        password: 'password123',
      });

      // Ensure user is created for logout test
      await User.create({
        firstName: 'Logout',
        lastName: 'User',
        username: 'logoutuser',
        email: 'logout@example.com',
        password: 'password123',
        isVerified: true, // Make sure user is verified for login
      });

      const logoutResponse = await request(app)
        .post('/api/v1/auth/logout')
        // If your logout needs auth, set the access token from loginResponse.body.token
        // .set('Authorization', `Bearer ${loginResponse.body.token}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.data).toEqual({}); // Or whatever your logout success message is

      const cookies = logoutResponse.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshTokenCookie = cookies.find((cookie) =>
        cookie.startsWith('refreshToken=')
      );
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toMatch(/refreshToken=none;/); // Check it's cleared
      expect(refreshTokenCookie).toMatch(/Max-Age=0;/); // Or Expires to a past date
    });
  });
});
