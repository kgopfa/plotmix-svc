import request from 'supertest';
import { Application } from 'express';
import { testUtils } from '../setup';

export class TestRequest {
  private app: Application;
  private authToken?: string;
  private userId?: string;

  constructor(app: Application) {
    this.app = app;
  }

  // Set authentication token
  withAuth(userId: string, email: string): TestRequest {
    this.authToken = testUtils.generateTestToken(userId, email);
    this.userId = userId;
    return this;
  }

  // Clear authentication
  withoutAuth(): TestRequest {
    this.authToken = undefined as any;
    this.userId = undefined as any;
    return this;
  }

  // Make a GET request
  get(url: string) {
    const req = request(this.app).get(url);
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    return req;
  }

  // Make a POST request
  post(url: string, data?: any) {
    const req = request(this.app).post(url);
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    if (data) {
      req.send(data);
    }
    return req;
  }

  // Make a PUT request
  put(url: string, data?: any) {
    const req = request(this.app).put(url);
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    if (data) {
      req.send(data);
    }
    return req;
  }

  // Make a DELETE request
  delete(url: string) {
    const req = request(this.app).delete(url);
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    return req;
  }

  // Get current user ID
  getUserId(): string | undefined {
    return this.userId;
  }
}

// Helper function to create a test request instance
export function createTestRequest(app: Application): TestRequest {
  return new TestRequest(app);
}

// Helper function to create a test user and get auth token
export async function createTestUser(data: {
  name?: string;
  email?: string;
  password?: string;
} = {}) {
  const user = await testUtils.createTestUser(data);
  const token = testUtils.generateTestToken(user.id, user.email);
  return { user, token };
}

// Helper function to create a test project
export async function createTestProject(userId: string, data: {
  name?: string;
  mainState?: any;
  version?: string;
  features?: any;
} = {}) {
  const project = await testUtils.createTestProject(userId, data);
  return project;
}

// Helper function to create a test conversation
export async function createTestConversation(userId: string, data: {
  title?: string;
  projectId?: string;
  initialPrompt?: string;
} = {}) {
  const conversation = await testUtils.createTestConversation(userId, data);
  return conversation;
} 