// import request from 'supertest';
import app from '../app';
import { testUtils, prisma } from './setup';
import { createTestRequest } from './helpers/test-request';

describe('Project Endpoints', () => {
  let testRequest: ReturnType<typeof createTestRequest>;
  let owner: any;
  let collaborator: any;

  beforeEach(async () => {
    testRequest = createTestRequest(app);
    owner = await testUtils.createTestUser({
      name: 'Project Owner',
      email: 'owner@example.com',
    });
    collaborator = await testUtils.createTestUser({
      name: 'Project Collaborator',
      email: 'collaborator@example.com',
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project successfully', async () => {
      const projectData = {
        name: 'Test Project',
        mainState: {
          elements: [],
          canvas: { width: 1920, height: 1080 },
        },
      };

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .post('/api/projects', projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project created successfully');
      expect(response.body.data.project).toMatchObject({
        name: projectData.name,
        mainState: projectData.mainState,
        version: '1.0.0',
        userId: owner.id,
      });

      // Verify project was created in database
      const project = await prisma.project.findUnique({
        where: { id: response.body.data.project.id },
      });
      expect(project).toBeDefined();
      expect(project?.name).toBe(projectData.name);
    });

    it('should return error without authentication', async () => {
      const response = await testRequest
        .withoutAuth()
        .post('/api/projects', { name: 'Test Project' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('GET /api/projects', () => {
    it('should return user projects', async () => {
      // Create projects for owner
      await testUtils.createTestProject(owner.id, {
        name: 'Project 1',
      });
      await testUtils.createTestProject(owner.id, {
        name: 'Project 2',
      });

      // Create project for different user
      await testUtils.createTestProject(collaborator.id, {
        name: 'Other User Project',
      });

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .get('/api/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(2);
      expect(response.body.data.projects.map((p: any) => p.name)).toEqual([
        'Project 2',
        'Project 1',
      ]);
    });

    it('should return empty array for user with no projects', async () => {
      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .get('/api/projects')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projects).toHaveLength(0);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project details for owner', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .get(`/api/projects/${project.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project).toMatchObject({
        id: project.id,
        name: project.name,
        userId: owner.id,
      });
      expect(response.body.data.project.owner).toBeDefined();
    });

    it('should return project details for collaborator', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      // Create collaboration
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
        .get(`/api/projects/${project.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.id).toBe(project.id);
    });

    it('should return 404 for non-existent project', async () => {
      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .get('/api/projects/non-existent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });

    it('should return 404 for unauthorized access', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .get(`/api/projects/${project.id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project successfully', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Original Name',
      });

      const updateData = {
        name: 'Updated Name',
        mainState: { elements: [{ type: 'rectangle' }] },
      };

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .put(`/api/projects/${project.id}`, updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.name).toBe(updateData.name);
      expect(response.body.data.project.mainState).toEqual(updateData.mainState);

      // Verify in database
      const updatedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(updatedProject?.name).toBe(updateData.name);
    });

    it('should return 404 for non-owner', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .put(`/api/projects/${project.id}`, { name: 'Updated Name' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project successfully', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .delete(`/api/projects/${project.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Project deleted successfully');

      // Verify project was deleted
      const deletedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(deletedProject).toBeNull();
    });

    it('should return 404 for non-owner', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .delete(`/api/projects/${project.id}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or access denied');
    });
  });

  describe('POST /api/projects/:id/changes', () => {
    it('should apply project change successfully', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
        version: '1.0.0',
      });

      const changeData = {
        version: '1.1.0',
        diff: {
          op: 'add',
          path: '/elements/0',
          value: { type: 'rectangle', x: 100, y: 100 },
        },
        actionDescription: 'Added rectangle',
      };

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .post(`/api/projects/${project.id}/changes`, changeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.version).toBe(changeData.version);

      // Verify change was recorded
      const changes = await prisma.projectChange.findMany({
        where: { projectId: project.id },
      });
      expect(changes).toHaveLength(1);
      expect(changes[0]?.version).toBe(changeData.version);
      expect(changes[0]?.actionDescription).toBe(changeData.actionDescription);
    });

    it('should return 404 for unauthorized user', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const response = await testRequest
        .withAuth(collaborator.id, collaborator.email)
        .post(`/api/projects/${project.id}/changes`, {
          version: '1.1.0',
          diff: { op: 'add', path: '/elements/0', value: {} },
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found or edit access denied');
    });
  });

  describe('POST /api/projects/:id/snapshots', () => {
    it('should create snapshot successfully', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const snapshotData = {
        version: '1.5.0',
      };

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .post(`/api/projects/${project.id}/snapshots`, snapshotData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.snapshot.version).toBe(snapshotData.version);

      // Verify snapshot was created
      const snapshots = await prisma.snapshot.findMany({
        where: { projectId: project.id },
      });
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.version).toBe(snapshotData.version);
    });
  });

  describe('GET /api/projects/:id/history', () => {
    it('should return project history', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      // Create some changes
      await prisma.projectChange.create({
        data: {
          projectId: project.id,
          authorUserId: owner.id,
          version: '1.1.0',
          diff: { op: 'add', path: '/elements/0', value: {} },
          actionDescription: 'Added element',
        },
      });

      // Create a snapshot
      await prisma.snapshot.create({
        data: {
          projectId: project.id,
          version: '1.5.0',
          state: { elements: [] },
        },
      });

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .get(`/api/projects/${project.id}/history`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.history.changes).toHaveLength(1);
      expect(response.body.data.history.snapshots).toHaveLength(1);
      expect(response.body.data.history.changes[0].version).toBe('1.1.0');
      expect(response.body.data.history.snapshots[0].version).toBe('1.5.0');
    });
  });

  describe('POST /api/projects/:id/rollback/:version', () => {
    it('should rollback to snapshot version', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
        version: '1.0.0',
      });

      // Create a snapshot
      await prisma.snapshot.create({
        data: {
          projectId: project.id,
          version: '1.5.0',
          state: { elements: [{ type: 'rectangle' }] },
        },
      });

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .post(`/api/projects/${project.id}/rollback/1.5.0`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.project.version).toBe('1.5.0');
    });

    it('should return 404 for non-existent version', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const response = await testRequest
        .withAuth(owner.id, owner.email)
        .post(`/api/projects/${project.id}/rollback/2.0.0`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Project not found, version not found, or edit access denied');
    });
  });
}); 