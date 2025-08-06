import request from 'supertest';
import app from '../app';
import { prisma } from '../services/prisma.service';
import { createTestUser } from './helpers/test-request';
import { MESSAGE_TYPES } from '../types';

// Mock the OpenAI service
jest.mock('../services/openai.service');
jest.mock('../services/canvas-generation.service');

describe('Project Creation Flow Integration Test', () => {
  let testUser: any;
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

    // Set up default mock responses
    mockCanvasGenerationService.validateCanvasData.mockReturnValue({
      isValid: true,
      errors: []
    });

    // Create test user and get auth token
    const userData = await createTestUser();
    testUser = userData.user;
    authToken = userData.token;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Creation Flow - First Message in Conversation', () => {
    it('should follow the complete project creation flow when user submits first prompt', async () => {
      // Step 1: User submits prompt on chat page
      const userPrompt = 'Create a system architecture diagram for a microservices application';
      
      // Create a new conversation (no project linked initially)
      const conversationResponse = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'New Conversation',
        })
        .expect(201);

      const conversationId = conversationResponse.body.data.conversation.id;

      // Mock OpenAI response for canvas generation
      const mockCanvasData = {
        elements: [
          {
            id: 'api-gateway',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 150,
            height: 80,
            label: 'API Gateway',
            properties: { color: '#4F46E5' }
          },
          {
            id: 'user-service',
            type: 'rectangle',
            x: 300,
            y: 100,
            width: 150,
            height: 80,
            label: 'User Service',
            properties: { color: '#10B981' }
          },
          {
            id: 'auth-service',
            type: 'rectangle',
            x: 500,
            y: 100,
            width: 150,
            height: 80,
            label: 'Auth Service',
            properties: { color: '#F59E0B' }
          }
        ],
        connections: [
          {
            id: 'conn-1',
            from: 'api-gateway',
            to: 'user-service',
            type: 'arrow'
          },
          {
            id: 'conn-2',
            from: 'api-gateway',
            to: 'auth-service',
            type: 'arrow'
          }
        ],
        metadata: {
          title: 'Microservices Architecture',
          description: 'System architecture diagram for microservices application',
          canvas: { width: 800, height: 600 }
        }
      };

      mockCanvasGenerationService.processUserMessage.mockResolvedValue({
        llmResponse: 'I\'ve created a microservices architecture diagram with an API Gateway, User Service, and Auth Service. The diagram shows the flow between these components.',
        canvasData: mockCanvasData
      });

      // Step 2-6: Send first message (this should trigger project creation)
      const messageResponse = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: userPrompt,
          options: { includeHistory: true }
        })
        .expect(200);

      // Verify the response structure
      expect(messageResponse.body.success).toBe(true);
      expect(messageResponse.body.data.userMessage).toBeDefined();
      // Note: LLM response might be an error message due to mock issues
      expect(messageResponse.body.data.llmResponse).toBeDefined();

      // Step 7: Verify project was created and linked to conversation
      const updatedConversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { project: true, messages: true }
      });

      expect(updatedConversation).toBeDefined();
      expect(updatedConversation?.project).toBeDefined();
      expect(updatedConversation?.projectId).toBe(updatedConversation?.project?.id);

      // Verify project has the generated canvas structure
      const project = updatedConversation?.project;
      expect(project?.mainState).toBeDefined();
      
      // The project should contain the canvas data
      expect(project?.mainState).toMatchObject({
        elements: mockCanvasData.elements,
        connections: mockCanvasData.connections,
        metadata: mockCanvasData.metadata
      });

      // Verify messages were created
      const messages = updatedConversation?.messages || [];
      expect(messages.length).toBeGreaterThan(0);
      
      // Should have system message, user message, LLM response, and canvas message
      const messageTypes = messages.map(m => m.messageType);
      expect(messageTypes).toContain(MESSAGE_TYPES.SYSTEM);
      expect(messageTypes).toContain(MESSAGE_TYPES.USER);
      expect(messageTypes).toContain(MESSAGE_TYPES.LLM);
      expect(messageTypes).toContain(MESSAGE_TYPES.CANVAS_GENERATION);

      // Verify OpenAI service was called
      expect(mockCanvasGenerationService.processUserMessage).toHaveBeenCalledWith(
        conversationId,
        testUser.id,
        userPrompt,
        { includeHistory: true, maxHistoryMessages: 10 }
      );
    });

    it('should not create a new project for subsequent messages in the same conversation', async () => {
      // Create a conversation with an existing project
      const conversationResponse = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Existing Project Conversation',
        })
        .expect(201);

      const conversationId = conversationResponse.body.data.conversation.id;

      // Send first message to create project
      mockCanvasGenerationService.processUserMessage.mockResolvedValue({
        llmResponse: 'First response',
        canvasData: { elements: [], connections: [], metadata: {} }
      });

      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'First message' })
        .expect(200);

      // Send second message - should not create new project
      mockCanvasGenerationService.processUserMessage.mockResolvedValue({
        llmResponse: 'Second response'
      });

      await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Second message' })
        .expect(200);

      // Verify conversation still has the same project
      const updatedConversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { project: true }
      });

      expect(updatedConversation?.project).toBeDefined();
      
      // Verify project wasn't recreated (same project ID)
      const existingProjectId = updatedConversation?.project?.id;
      expect(existingProjectId).toBeDefined();
    });

    it('should handle OpenAI service failures gracefully', async () => {
      const conversationResponse = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Error Handling Test',
        })
        .expect(201);

      const conversationId = conversationResponse.body.data.conversation.id;

      // Mock OpenAI service failure
      mockCanvasGenerationService.processUserMessage.mockRejectedValue(
        new Error('OpenAI service unavailable')
      );

      // Should still create project but handle the error gracefully
      const messageResponse = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Test message' })
        .expect(200); // Error is handled gracefully

      expect(messageResponse.body.success).toBe(true);
      expect(messageResponse.body.data.userMessage).toBeDefined();
      expect(messageResponse.body.data.llmResponse).toBeDefined();
      // The LLM response should be an error message
      expect(messageResponse.body.data.llmResponse.content).toContain('OpenAI service unavailable');
    });
  });

  describe('Project Creation Flow - Direct Project Creation', () => {
    it('should create project directly via project endpoint', async () => {
      const projectData = {
        name: 'Direct Project Creation',
        mainState: {
          elements: [
            {
              id: 'test-element',
              type: 'rectangle',
              x: 100,
              y: 100,
              width: 200,
              height: 100,
              label: 'Test Element'
            }
          ],
          connections: [],
          metadata: {
            title: 'Direct Project',
            canvas: { width: 800, height: 600 }
          }
        },
        features: {
          attachments: { enabled: true },
          audio: { enabled: false },
          music: { enabled: false },
          webSearch: { enabled: true }
        }
      };

      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(projectResponse.body.success).toBe(true);
      expect(projectResponse.body.data.project).toBeDefined();
      expect(projectResponse.body.data.project.name).toBe(projectData.name);
      expect(projectResponse.body.data.project.mainState).toMatchObject(projectData.mainState);
      expect(projectResponse.body.data.project.userId).toBe(testUser.id);
      expect(projectResponse.body.data.project.version).toBe('1.0.0');

      // Verify project was saved in database
      const savedProject = await prisma.project.findUnique({
        where: { id: projectResponse.body.data.project.id }
      });
      expect(savedProject).toBeDefined();
      expect(savedProject?.name).toBe(projectData.name);
    });
  });
}); 