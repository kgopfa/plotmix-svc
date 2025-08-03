import { ProjectService } from '../../services/project.service';
import { testUtils, prisma } from '../setup';

describe('ProjectService', () => {
  let owner: any;
  let collaborator: any;

  beforeEach(async () => {
    owner = await testUtils.createTestUser({
      name: 'Project Owner',
      email: 'owner@example.com',
    });
    collaborator = await testUtils.createTestUser({
      name: 'Project Collaborator',
      email: 'collaborator@example.com',
    });
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const projectData = {
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
      };

      const project = await ProjectService.createProject(owner.id, projectData);

      expect(project).toBeDefined();
      expect(project.name).toBe(projectData.name);
      expect(project.mainState).toEqual(projectData.mainState);
      expect(project.version).toBe('1.0.0');
      expect(project.userId).toBe(owner.id);

      // Verify in database
      const dbProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(dbProject).toBeDefined();
      expect(dbProject?.name).toBe(projectData.name);
    });
  });

  describe('getProjectById', () => {
    it('should return project for owner', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const result = await ProjectService.getProjectById(project.id, owner.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(project.id);
      expect(result?.owner).toBeDefined();
      expect(result?.owner.id).toBe(owner.id);
    });

    it('should return project for collaborator', async () => {
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

      const result = await ProjectService.getProjectById(project.id, collaborator.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(project.id);
    });

    it('should return null for unauthorized user', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const result = await ProjectService.getProjectById(project.id, collaborator.id);

      expect(result).toBeNull();
    });
  });

  describe('getUserProjects', () => {
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

      const projects = await ProjectService.getUserProjects(owner.id);

      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.name)).toEqual(['Project 2', 'Project 1']);
    });

    it('should return collaborated projects', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Collaborated Project',
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

      const projects = await ProjectService.getUserProjects(collaborator.id);

      expect(projects).toHaveLength(1);
      expect(projects[0]?.name).toBe('Collaborated Project');
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Original Name',
      });

      const updateData = {
        name: 'Updated Name',
        mainState: { elements: [{ type: 'rectangle' }] },
      };

      const result = await ProjectService.updateProject(project.id, owner.id, updateData);

      expect(result).toBeDefined();
      expect(result?.name).toBe(updateData.name);
      expect(result?.mainState).toEqual(updateData.mainState);

      // Verify in database
      const dbProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(dbProject?.name).toBe(updateData.name);
    });

    it('should return null for non-owner', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const result = await ProjectService.updateProject(project.id, collaborator.id, {
        name: 'Updated Name',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const result = await ProjectService.deleteProject(project.id, owner.id);

      expect(result).toBe(true);

      // Verify project was deleted
      const dbProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(dbProject).toBeNull();
    });

    it('should return false for non-owner', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const result = await ProjectService.deleteProject(project.id, collaborator.id);

      expect(result).toBe(false);

      // Verify project was not deleted
      const dbProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(dbProject).toBeDefined();
    });
  });

  describe('applyProjectChange', () => {
    it('should apply change successfully', async () => {
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

      const result = await ProjectService.applyProjectChange(project.id, owner.id, changeData);

      expect(result).toBeDefined();
      expect(result?.version).toBe(changeData.version);

      // Verify change was recorded
      const changes = await prisma.projectChange.findMany({
        where: { projectId: project.id },
      });
      expect(changes).toHaveLength(1);
      expect(changes[0]?.version).toBe(changeData.version);
      expect(changes[0]?.actionDescription).toBe(changeData.actionDescription);
    });

    it('should return null for unauthorized user', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const result = await ProjectService.applyProjectChange(project.id, collaborator.id, {
        version: '1.1.0',
        diff: { op: 'add', path: '/elements/0', value: {} },
      });

      expect(result).toBeNull();
    });
  });

  describe('createSnapshot', () => {
    it('should create snapshot successfully', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const snapshotData = {
        version: '1.5.0',
        state: { elements: [] },
      };

      const result = await ProjectService.createSnapshot(project.id, owner.id, snapshotData);

      expect(result).toBeDefined();
      expect(result?.version).toBe(snapshotData.version);

      // Verify snapshot was created
      const snapshots = await prisma.snapshot.findMany({
        where: { projectId: project.id },
      });
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0]?.version).toBe(snapshotData.version);
    });
  });

  describe('getProjectHistory', () => {
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

      const result = await ProjectService.getProjectHistory(project.id, owner.id);

      expect(result).toBeDefined();
      expect(result?.changes).toHaveLength(1);
      expect(result?.snapshots).toHaveLength(1);
      expect(result?.changes[0]?.version).toBe('1.1.0');
      expect(result?.snapshots[0]?.version).toBe('1.5.0');
    });
  });

  describe('rollbackToVersion', () => {
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

      const result = await ProjectService.rollbackToVersion(project.id, owner.id, '1.5.0');

      expect(result).toBeDefined();
      expect(result?.version).toBe('1.5.0');
    });

    it('should return null for non-existent version', async () => {
      const project = await testUtils.createTestProject(owner.id, {
        name: 'Test Project',
      });

      const result = await ProjectService.rollbackToVersion(project.id, owner.id, '2.0.0');

      expect(result).toBeNull();
    });
  });
}); 