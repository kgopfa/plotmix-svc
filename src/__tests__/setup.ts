import { PrismaClient } from '@prisma/client';
import { config } from '../config';

// Create a test Prisma client
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env['TEST_DATABASE_URL'] || process.env['DATABASE_URL'] || '',
    },
  },
});

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env['NODE_ENV'] = 'test';
  
  // Clean up any existing test data
  await cleanupTestData();
});

// Global test teardown
afterAll(async () => {
  // Clean up test data
  await cleanupTestData();
  
  // Close database connection
  await testPrisma.$disconnect();
});

// Clean up test data between tests
afterEach(async () => {
  await cleanupTestData();
});

// Helper function to clean up test data
async function cleanupTestData() {
  try {
    // Delete in order to respect foreign key constraints
    await testPrisma.projectChange.deleteMany({});
    await testPrisma.snapshot.deleteMany({});
    await testPrisma.projectRole.deleteMany({});
    await testPrisma.project.deleteMany({});
    await testPrisma.user.deleteMany({});
  } catch (error) {
    console.warn('Cleanup error (this is usually harmless):', error);
  }
}

// Test utilities
export const testUtils = {
  // Create a test user
  async createTestUser(data: {
    name?: string;
    email?: string;
    password?: string;
  } = {}) {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    return testPrisma.user.create({
      data: {
        name: data.name || `Test User ${randomId}`,
        email: data.email || `test-${timestamp}-${randomId}@example.com`,
        password: data.password || 'SecurePassword123',
      },
    });
  },

  // Create a test project
  async createTestProject(userId: string, data: {
    name?: string;
    mainState?: any;
    version?: string;
  } = {}) {
    const randomId = Math.random().toString(36).substring(7);
    return testPrisma.project.create({
      data: {
        name: data.name || `Test Project ${randomId}`,
        mainState: data.mainState || { elements: [], canvas: { width: 1920, height: 1080 } },
        version: data.version || '1.0.0',
        userId,
      },
    });
  },

  // Generate a test JWT token
  generateTestToken(userId: string, email: string) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { sub: userId, userId, email, name: `Test User ${userId}` },
      config.nextAuth.secret,
      { expiresIn: '1h' }
    );
  },
};

// Export for use in tests
export { testPrisma as prisma }; 