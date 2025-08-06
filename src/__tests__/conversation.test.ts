import request from 'supertest';
import app from '../app';
import { createTestUser, createTestProject } from './helpers/test-request';

describe('Conversation API', () => {
  let testUser: any;
  let testProject: any;
  let authToken: string;

  beforeEach(async () => {
    // Create test user and get auth token
    const userData = await createTestUser();
    testUser = userData.user;
    authToken = userData.token;

    // Create test project
    testProject = await createTestProject(testUser.id, authToken);
  });

  describe('POST /api/conversations', () => {
    it('should create a new conversation', async () => {
      const conversationData = {
        title: 'Test Conversation',
        initialPrompt: 'Hello, this is a test conversation',
      };

      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conversationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation).toBeDefined();
      expect(response.body.data.conversation.title).toBe(conversationData.title);
      expect(response.body.data.conversation.userId).toBe(testUser.id);
    });

    it('should create a conversation linked to a project', async () => {
      const conversationData = {
        title: 'Project Conversation',
        projectId: testProject.id,
      };

      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conversationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation.projectId).toBe(testProject.id);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/conversations')
        .send({ title: 'Test' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/conversations', () => {
    it('should get user conversations', async () => {
      const response = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversations).toBeDefined();
      expect(Array.isArray(response.body.data.conversations)).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/conversations?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });

    it('should filter by project', async () => {
      const response = await request(app)
        .get(`/api/conversations?projectId=${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/conversations/:conversationId', () => {
    let testConversation: any;

    beforeEach(async () => {
      // Create a test conversation
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Get Conversation' });

      testConversation = response.body.data.conversation;
    });

    it('should get a specific conversation', async () => {
      const response = await request(app)
        .get(`/api/conversations/${testConversation.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation.id).toBe(testConversation.id);
      expect(response.body.data.conversation.messages).toBeDefined();
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await request(app)
        .get('/api/conversations/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/conversations/:conversationId/messages', () => {
    let testConversation: any;

    beforeEach(async () => {
      // Create a test conversation
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Messages' });

      testConversation = response.body.data.conversation;
    });

    it('should send a message', async () => {
      const messageData = {
        content: 'This is a test message',
      };

      const response = await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.userMessage).toBeDefined();
      expect(response.body.data.userMessage.content).toBe(messageData.content);
    });

    it('should validate message features for project-linked conversations', async () => {
      // Create a conversation linked to a project
      const projectConversation = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          title: 'Project Messages',
          projectId: testProject.id 
        });

      const conversationId = projectConversation.body.data.conversation.id;

      // Try to send a message with disabled features
      const messageData = {
        content: 'Test message with attachments',
        attachments: [{ id: '1', name: 'test.txt', type: 'text/plain', size: '100' }],
      };

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Attachments are not enabled');
    });
  });

  describe('GET /api/conversations/:conversationId/messages', () => {
    let testConversation: any;

    beforeEach(async () => {
      // Create a test conversation with messages
      const response = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Test Get Messages' });

      testConversation = response.body.data.conversation;

      // Add some messages
      await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Message 1' });

      await request(app)
        .post(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Message 2' });
    });

    it('should get conversation messages', async () => {
      const response = await request(app)
        .get(`/api/conversations/${testConversation.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toBeDefined();
      expect(Array.isArray(response.body.data.messages)).toBe(true);
    });

    it('should support message type filtering', async () => {
      const response = await request(app)
        .get(`/api/conversations/${testConversation.id}/messages?messageTypes=user`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.messages).toBeDefined();
    });
  });

  describe('Project Features API', () => {
    it('should get project features', async () => {
      const response = await request(app)
        .get(`/api/conversations/projects/${testProject.id}/features`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.features).toBeDefined();
    });

    it('should update project features', async () => {
      const newFeatures = {
        attachments: { enabled: true, maxFileSize: 1048576 },
        webSearch: { enabled: true },
      };

      const response = await request(app)
        .put(`/api/conversations/projects/${testProject.id}/features`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ features: newFeatures })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.features.attachments.enabled).toBe(true);
    });

    it('should validate message features', async () => {
      const messageData = {
        attachments: [{ id: '1', name: 'test.txt', type: 'text/plain', size: '100' }],
        options: { webSearch: true },
      };

      const response = await request(app)
        .post(`/api/conversations/projects/${testProject.id}/validate-message`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBeDefined();
    });
  });
}); 