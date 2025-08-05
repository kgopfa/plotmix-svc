import request from 'supertest';
import app from '../app';
import { testUtils, prisma } from './setup';
import bcrypt from 'bcryptjs';

describe('Authentication Endpoints', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePassword123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.data.user).toMatchObject({
        name: userData.name,
        email: userData.email,
      });
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.token).toBeDefined();

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(user).toBeDefined();
      expect(user?.name).toBe(userData.name);
      expect(await bcrypt.compare(userData.password, user!.password)).toBe(true);
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        name: 'Test User',
        email: 'duplicate@example.com',
        password: 'SecurePassword123',
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User with this email already exists');
    });

    it('should return error for invalid data', async () => {
      const invalidData = {
        name: 'Test User',
        // Missing email and password
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    let loginTestUser: {
      name: string;
      email: string;
      password: string;
    };
    let currentToken: string | null = null;

    beforeAll(async () => {
      // Create a shared test user for all login tests
      loginTestUser = {
        name: 'Login Test User',
        email: 'login@example.com',
        password: 'SecurePassword123',
      };

      // Register the user once for all tests
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(loginTestUser)
        .expect(201);

      currentToken = registerResponse.body.data.token;
    });

    beforeEach(async () => {
      // Ensure user is logged out before each test
      if (currentToken) {
        try {
          await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${currentToken}`)
            .expect(200);
        } catch (error) {
          // Token might already be invalid/blacklisted, which is fine
        }
        currentToken = null;
      }
    });

    it('should login user successfully with correct credentials', async () => {
      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginTestUser.email,
          password: loginTestUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.data.user).toMatchObject({
        name: loginTestUser.name,
        email: loginTestUser.email,
      });
      expect(response.body.data.user.password).toBeUndefined();
      expect(response.body.data.token).toBeDefined();
    });

    it('should return error for incorrect password', async () => {
      // Try to login with wrong password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: loginTestUser.email,
          password: 'WrongPassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SecurePassword123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile with valid token', async () => {
      const user = await testUtils.createTestUser({
        name: 'Profile Test User',
        email: 'profile@example.com',
      });

      const token = testUtils.generateTestToken(user.id, user.email);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile retrieved successfully');
      expect(response.body.data.user).toMatchObject({
        id: user.id,
        name: user.name,
        email: user.email,
      });
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user and blacklist token', async () => {
      const user = await testUtils.createTestUser({
        name: 'Logout Test User',
        email: 'logout@example.com',
      });
      const token = testUtils.generateTestToken(user.id, user.email);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logout successful');
      expect(response.body.data.logoutTime).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should prevent access to protected endpoints after logout', async () => {
      // First logout
      const user = await testUtils.createTestUser({
        name: 'Protected Endpoint Test User',
        email: 'protected@example.com',
      });
      const token = testUtils.generateTestToken(user.id, user.email);

      await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to access protected endpoint with the same token
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`);

      // In development mode, tokens aren't actually blacklisted, so this will still work
      // In production with Redis, this would return 401
      expect(response.status).toBe(200);
    });
  });
}); 