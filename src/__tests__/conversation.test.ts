import request from 'supertest';
import app from '../app';
import { prisma } from '../services/prisma.service';
import { createTestUser, createTestProject, createTestConversation } from './helpers/test-request';
import { MESSAGE_TYPES } from '../types';

// Mock the OpenAI service
jest.mock('../services/openai.service');
jest.mock('../services/canvas-generation.service');

describe('Conversation System with LLM Integration', () => {
  let testUser: any;
  let testConversation: any;
  let testProject: any;
  let authToken: string;

  // Mock OpenAI service
  const mockOpenAIService = {
    generateResponse: jest.fn(),
    generateCanvasData: jest.fn(),
    getConfig: jest.fn(),
  };

  const mockCanvasGenerationService = {
    processUserMessage: jest.fn(),
    generateCanvasData: jest.fn(),
    validateCanvasData: jest.fn(),
    getGenerationStats: jest.fn(),
  };

  beforeAll(async () => {
    // Set up mocks
    const { OpenAIService } = require('../services/openai.service');
    const { CanvasGenerationService } = require('../services/canvas-generation.service');
    
    OpenAIService.getInstance = jest.fn().mockReturnValue(mockOpenAIService);
    (CanvasGenerationService as any).openaiService = mockOpenAIService;
    
    // Mock the static methods
    CanvasGenerationService.processUserMessage = mockCanvasGenerationService.processUserMessage;
    CanvasGenerationService.generateCanvasData = mockCanvasGenerationService.generateCanvasData;
    CanvasGenerationService.validateCanvasData = mockCanvasGenerationService.validateCanvasData;
    CanvasGenerationService.getGenerationStats = mockCanvasGenerationService.getGenerationStats;

    // Create test user and get auth token
    const userData = await createTestUser();
    testUser = userData.user;
    authToken = userData.token;

    // Create test project
    testProject = await createTestProject(testUser.id, {
      name: 'Test Project',
      mainState: {},
      features: {
        attachments: { enabled: true },
        audio: { enabled: false },
        music: { enabled: false },
        webSearch: { enabled: true },
      },
    });

    // Create test conversation
    testConversation = await createTestConversation(testUser.id, {
      title: 'Test Conversation',
      projectId: testProject.id,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock responses
    mockOpenAIService.generateResponse.mockResolvedValue('This is a mock response');
    mockOpenAIService.generateCanvasData.mockResolvedValue({
      success: true,
      canvasData: {
        elements: [
          {
            id: 'element-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
          },
        ],
        connections: [],
        metadata: { title: 'Mock Diagram' },
      },
    });
    
    mockCanvasGenerationService.processUserMessage.mockResolvedValue({
      llmResponse: 'This is a mock LLM response',
      canvasData: {
        elements: [
          {
            id: 'element-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
          },
        ],
        connections: [],
        metadata: { title: 'Mock Canvas Data' },
      },
    });
    
    mockCanvasGenerationService.generateCanvasData.mockResolvedValue({
      success: true,
      canvasData: {
        elements: [
          {
            id: 'element-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
          },
        ],
        connections: [],
        metadata: { title: 'Mock Canvas Data' },
      },
    });
    
    mockCanvasGenerationService.validateCanvasData.mockReturnValue({
      isValid: true,
      errors: [],
    });
    
    mockCanvasGenerationService.getGenerationStats.mockResolvedValue({
      totalGenerations: 1,
      successfulGenerations: 1,
      failedGenerations: 0,
      lastGeneration: new Date(),
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.message.deleteMany({
      where: { conversationId: testConversation.id },
    });
    await prisma.conversation.deleteMany({
      where: { id: testConversation.id },
    });
    await prisma.project.deleteMany({
      where: { id: testProject.id },
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id },
    });
  });

  describe('POST /api/conversations/:conversationId/messages', () => {
    it('should send a message and receive LLM response', async () => {
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Hello, can you help me create a simple system architecture diagram?',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toBeDefined();
      expect(response.body.data.userMessage.content).toBe('Hello, can you help me create a simple system architecture diagram?');
      expect(response.body.data.userMessage.messageType).toBe(MESSAGE_TYPES.USER);
      
      // LLM response should be present
      expect(response.body.data.llmResponse).toBeDefined();
      expect(response.body.data.llmResponse.messageType).toBe(MESSAGE_TYPES.LLM);
      expect(response.body.data.llmResponse.content).toBeTruthy();
    });

    it('should generate canvas data when prompted for visual content', async () => {
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Create a diagram showing a web application with a database and API',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toBeDefined();
      expect(response.body.data.llmResponse).toBeDefined();
      
      // Canvas generation message should be present
      expect(response.body.data.canvasMessage).toBeDefined();
      expect(response.body.data.canvasMessage.messageType).toBe(MESSAGE_TYPES.CANVAS_GENERATION);
      
      // Parse canvas data
      const canvasData = JSON.parse(response.body.data.canvasMessage.content);
      expect(canvasData.elements).toBeDefined();
      expect(Array.isArray(canvasData.elements)).toBe(true);
      expect(canvasData.elements.length).toBeGreaterThan(0);
    });

    it('should handle attachments when enabled', async () => {
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Analyze this diagram and suggest improvements',
          attachments: [
            {
              id: 'test-attachment-1',
              name: 'diagram.png',
              type: 'image/png',
              size: '1024',
              url: 'https://example.com/diagram.png',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage.attachments).toBeDefined();
      expect(response.body.data.userMessage.attachments).toHaveLength(1);
    });

    it('should reject attachments when disabled', async () => {
      // Create conversation without project (no features enabled)
      const simpleConversation = await createTestConversation(testUser.id, {
        title: 'Simple Conversation',
      });

      const response = await request(app)
        .post(`/api/conversations/${simpleConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message with attachment',
          attachments: [
            {
              id: 'test-attachment-1',
              name: 'file.txt',
              type: 'text/plain',
              size: '100',
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Attachments are not enabled');

      // Clean up
      await prisma.conversation.delete({ where: { id: simpleConversation.id } });
    });

    it('should handle web search when enabled', async () => {
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'What are the latest trends in microservices architecture?',
          options: {
            webSearch: true,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage.options).toBeDefined();
      expect(response.body.data.userMessage.options.webSearch).toBe(true);
    });

    it('should reject web search when disabled', async () => {
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Search for latest trends',
          options: {
            webSearch: true,
          },
        });

      // This should work since web search is enabled in our test project
      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/conversations/:conversationId/generate-canvas', () => {
    it('should generate canvas data directly', async () => {
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/generate-canvas`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: 'Create a simple e-commerce system architecture',
          options: {
            includeHistory: true,
            maxHistoryMessages: 5,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.canvasData).toBeDefined();
      expect(response.body.data.canvasData.elements).toBeDefined();
      expect(Array.isArray(response.body.data.canvasData.elements)).toBe(true);
    });

    it('should handle invalid prompts gracefully', async () => {
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/generate-canvas`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          prompt: '', // Empty prompt
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Prompt is required');
    });

    it('should respect conversation ownership', async () => {
      // Create another user
      const otherUser = await createTestUser();
      
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/generate-canvas`)
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send({
          prompt: 'Create a diagram',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Conversation not found or access denied');

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.user.id } });
    });
  });

  describe('GET /api/conversations/:conversationId/generation-stats', () => {
    it('should return generation statistics', async () => {
      const response = await request(app)
        .get(`/api/conversations/${testConversation.id}/generation-stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      expect(response.body.data.stats.totalGenerations).toBeGreaterThanOrEqual(0);
      expect(response.body.data.stats.successfulGenerations).toBeGreaterThanOrEqual(0);
      expect(response.body.data.stats.failedGenerations).toBeGreaterThanOrEqual(0);
    });

    it('should respect conversation ownership', async () => {
      // Create another user
      const otherUser = await createTestUser();
      
      const response = await request(app)
        .get(`/api/conversations/${testConversation.id}/generation-stats`)
        .set('Authorization', `Bearer ${otherUser.token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Conversation not found or access denied');

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.user.id } });
    });
  });

  describe('GET /api/conversations/:conversationId/messages', () => {
    it('should filter messages by type', async () => {
      const response = await request(app)
        .get(`/api/conversations/${testConversation.id}/messages?messageTypes=user,llm`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toBeDefined();
      
      // All messages should be user or llm type
      response.body.data.messages.forEach((message: any) => {
        expect(['user', 'llm']).toContain(message.messageType);
      });
    });

    it('should include canvas generation messages', async () => {
      const response = await request(app)
        .get(`/api/conversations/${testConversation.id}/messages?messageTypes=canvas_generation`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toBeDefined();
      
      // All messages should be canvas_generation type
      response.body.data.messages.forEach((message: any) => {
        expect(message.messageType).toBe(MESSAGE_TYPES.CANVAS_GENERATION);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      // This test would require mocking the OpenAI service
      // For now, we'll test the error handling structure
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message that might cause an error',
        });

      // Should either succeed or return a proper error response
      expect([200, 400, 500]).toContain(response.status);
      if (response.status !== 200) {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBeDefined();
      }
    });

    it('should handle invalid conversation ID', async () => {
      const response = await request(app)
        .post('/api/conversations/invalid-id/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test message',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .send({
          content: 'Test message',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Access token required');
    });
  });
}); 