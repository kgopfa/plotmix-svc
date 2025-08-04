// import request from 'supertest';
import app from '../app';
import { testUtils, prisma } from './setup';
import { createTestRequest } from './helpers/test-request';

describe('Collaboration Endpoints', () => {
  let testRequest: ReturnType<typeof createTestRequest>;
  let owner: any;
  let collaborator: any;
  let project: any;

  beforeEach(async () => {
    testRequest = createTestRequest(app);
    
    // Create test accounts for each test with unique emails
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    
    owner = await testUtils.createTestUser({
      name: 'Project Owner',
      email: `collab-test-owner-${timestamp}-${randomId}@example.com`,
    });
    collaborator = await testUtils.createTestUser({
      name: 'Project Collaborator',
      email: `collab-test-collaborator-${timestamp}-${randomId}@example.com`,
    });
    
    // Create a fresh project for each test
    project = await testUtils.createTestProject(owner.id, {
      name: 'Test Project',
    });
  });

  describe('POST /api/collaboration/:projectId/invite', () => {
    it('should invite user successfully', async () => {
      const inviteData = {
        userId: collaborator.id,
        role: 'editor',
      };

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .post(`/api/collaboration/${project.id}/invite`, inviteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User invited successfully');
      expect(response.body.data.projectRole).toMatchObject({
        role: inviteData.role,
        status: 'pending',
        projectId: project.id,
        userId: collaborator.id,
      });

      // Verify invitation was created in database
      const projectRole = await prisma.projectRole.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: collaborator.id,
          },
        },
      });
      expect(projectRole).toBeDefined();
      expect(projectRole?.role).toBe(inviteData.role);
      expect(projectRole?.status).toBe('pending');
    });

    it('should return error for non-owner', async () => {
      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .post(`/api/collaboration/${project.id}/invite`, {
          userId: 'some-user-id',
          role: 'editor',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });

    it('should return error for non-existent user', async () => {
      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .post(`/api/collaboration/${project.id}/invite`, {
          userId: 'non-existent-user-id',
          role: 'editor',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return error for duplicate invitation', async () => {
      // Create initial invitation
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'pending',
        },
      });

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .post(`/api/collaboration/${project.id}/invite`, {
          userId: collaborator.id,
          role: 'viewer',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User already has a role in this project');
    });
  });

  describe('PUT /api/collaboration/:projectId/invite/:userId', () => {
    it('should update invitation successfully', async () => {
      // Create initial invitation
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'pending',
        },
      });

      const updateData = {
        role: 'viewer',
        status: 'accepted',
      };

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .put(`/api/collaboration/${project.id}/invite/${collaborator.id}`, updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projectRole.role).toBe(updateData.role);
      expect(response.body.data.projectRole.status).toBe(updateData.status);
    });

    it('should return 404 for non-existent invitation', async () => {
      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .put(`/api/collaboration/${project.id}/invite/non-existent-user`, {
          role: 'viewer',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invitation not found');
    });
  });

  describe('POST /api/collaboration/:projectId/respond', () => {
    it('should accept invitation successfully', async () => {
      // Create pending invitation
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'pending',
        },
      });

      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .post(`/api/collaboration/${project.id}/respond`, { response: 'accepted' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation accepted successfully');
      expect(response.body.data.projectRole.status).toBe('accepted');

      // Verify status was updated in database
      const projectRole = await prisma.projectRole.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: collaborator.id,
          },
        },
      });
      expect(projectRole?.status).toBe('accepted');
    });

    it('should decline invitation successfully', async () => {
      // Create pending invitation
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'pending',
        },
      });

      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .post(`/api/collaboration/${project.id}/respond`, { response: 'declined' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Invitation declined successfully');
      expect(response.body.data.projectRole.status).toBe('declined');
    });

    it('should return error for invalid response', async () => {
      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .post(`/api/collaboration/${project.id}/respond`, { response: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid response. Must be "accepted" or "declined"');
    });

    it('should return 404 for non-existent invitation', async () => {
      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .post(`/api/collaboration/${project.id}/respond`, { response: 'accepted' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invitation not found or already processed');
    });
  });

  describe('DELETE /api/collaboration/:projectId/collaborators/:userId', () => {
    it('should remove collaborator successfully', async () => {
      // Create accepted collaboration
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'accepted',
        },
      });

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .delete(`/api/collaboration/${project.id}/collaborators/${collaborator.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Collaborator removed successfully');

      // Verify collaborator was removed
      const projectRole = await prisma.projectRole.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: collaborator.id,
          },
        },
      });
      expect(projectRole).toBeNull();
    });

    it('should return error for non-owner', async () => {
      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .delete(`/api/collaboration/${project.id}/collaborators/some-user-id`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found, access denied, or cannot remove owner');
    });

    it('should return error when trying to remove owner', async () => {
      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .delete(`/api/collaboration/${project.id}/collaborators/${owner.id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found, access denied, or cannot remove owner');
    });
  });

  describe('GET /api/collaboration/:projectId/collaborators', () => {
    it('should return project collaborators', async () => {
      // Create collaborators
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'accepted',
        },
      });

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .get(`/api/collaboration/${project.id}/collaborators`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborators).toHaveLength(1);
      expect(response.body.data.collaborators[0]).toMatchObject({
        role: 'editor',
        status: 'accepted',
        userId: collaborator.id,
      });
      expect(response.body.data.collaborators[0].user).toBeDefined();
      expect(response.body.data.collaborators[0].project).toBeDefined();
    });

    it('should return empty array for project with no collaborators', async () => {
      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .get(`/api/collaboration/${project.id}/collaborators`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborators).toHaveLength(0);
    });

    it('should return 404 for unauthorized access', async () => {
      const otherUser = await testUtils.createTestUser({
        name: 'Other User',
        email: 'other@example.com',
      });

      const response = await testRequest
        .withAuth(otherUser.id, otherUser.email)
        .get(`/api/collaboration/${project.id}/collaborators`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });
  });

  describe('GET /api/collaboration/invitations', () => {
    it('should return user invitations', async () => {
      // Create pending invitation for collaborator
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'pending',
        },
      });

      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .get('/api/collaboration/invitations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations).toHaveLength(1);
      expect(response.body.data.invitations[0]).toMatchObject({
        role: 'editor',
        status: 'pending',
        projectId: project.id,
        userId: collaborator.id,
      });
      expect(response.body.data.invitations[0].user).toBeDefined();
      expect(response.body.data.invitations[0].project).toBeDefined();
      expect(response.body.data.invitations[0].project.owner).toBeDefined();
    });

    it('should return empty array for user with no invitations', async () => {
      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .get('/api/collaboration/invitations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.invitations).toHaveLength(0);
    });
  });

  describe('GET /api/collaboration/collaborations', () => {
    it('should return user collaborations', async () => {
      // Create accepted collaboration for collaborator
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'accepted',
        },
      });

      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .get('/api/collaboration/collaborations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborations).toHaveLength(1);
      expect(response.body.data.collaborations[0]).toMatchObject({
        role: 'editor',
        status: 'accepted',
        projectId: project.id,
        userId: collaborator.id,
      });
      expect(response.body.data.collaborations[0].user).toBeDefined();
      expect(response.body.data.collaborations[0].project).toBeDefined();
      expect(response.body.data.collaborations[0].project.owner).toBeDefined();
    });

    it('should return empty array for user with no collaborations', async () => {
      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .get('/api/collaboration/collaborations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.collaborations).toHaveLength(0);
    });
  });

  describe('Collaboration Access Control', () => {
    it('should allow collaborator to access project after accepting invitation', async () => {
      // Create pending invitation
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'pending',
        },
      });

      // Accept invitation
      await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .post(`/api/collaboration/${project.id}/respond`, { response: 'accepted' })
        .expect(200);

      // Should be able to access project
      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .get(`/api/projects/${project.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.id).toBe(project.id);
    });

    it('should allow collaborator to make changes after accepting invitation', async () => {
      // Create accepted collaboration
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'editor',
          status: 'accepted',
        },
      });

      // Should be able to make changes
      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .post(`/api/projects/${project.id}/changes`, {
          version: '1.1.0',
          diff: { op: 'add', path: '/elements/0', value: {} },
          actionDescription: 'Test change',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not allow viewer to make changes', async () => {
      // Create viewer collaboration
      await prisma.projectRole.create({
        data: {
          projectId: project.id,
          userId: collaborator.id,
          role: 'viewer',
          status: 'accepted',
        },
      });

      // Should not be able to make changes
      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .post(`/api/projects/${project.id}/changes`, {
          version: '1.1.0',
          diff: { op: 'add', path: '/elements/0', value: {} },
          actionDescription: 'Test change',
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or edit access denied');
    });
  });
}); 