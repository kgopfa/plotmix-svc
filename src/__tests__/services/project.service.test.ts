import { ProjectService } from '../../services/project.service';
import { AuthService } from '../../services/auth.service';
import { CollaborationService } from '../../services/collaboration.service';

// Mock the dependent services
jest.mock('../../services/auth.service');
jest.mock('../../services/collaboration.service');
jest.mock('../../services/prisma.service', () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectChange: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    projectSnapshot: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    snapshot: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    collaboration: {
      findFirst: jest.fn(),
    },
  },
}));
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Import the mocked modules
import { prisma } from '../../services/prisma.service';
import { logger } from '../../utils/logger';

const mockedAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockedCollaborationService = CollaborationService as jest.Mocked<typeof CollaborationService>;
const mockedPrisma = prisma as any;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('ProjectService', () => {
  let owner: any;
  let collaborator: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock user data
    owner = {
      id: 'owner-id-1',
      name: 'Project Owner',
      email: 'owner@example.com',
    };

    collaborator = {
      id: 'collaborator-id-1',
      name: 'Project Collaborator',
      email: 'collaborator@example.com',
    };

    // Mock AuthService methods
    mockedAuthService.createUser.mockResolvedValue(owner);
    mockedAuthService.deleteUser.mockResolvedValue(undefined);

    // Mock CollaborationService methods
    mockedCollaborationService.inviteUser.mockResolvedValue({
      id: 'invitation-id-1',
      projectId: 'project-id-1',
      userId: collaborator.id,
      role: 'editor',
      status: 'pending',
    });

    mockedCollaborationService.respondToInvitation.mockResolvedValue({
      id: 'invitation-id-1',
      projectId: 'project-id-1',
      userId: collaborator.id,
      role: 'editor',
      status: 'accepted',
    });
  });

  afterEach(async () => {
    // Clean up is handled by mocks, no need for actual database cleanup
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const projectData = {
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
      };

      const mockProject = {
        id: 'project-id-1',
        name: projectData.name,
        mainState: projectData.mainState,
        version: '1.0.0',
        userId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.project.create.mockResolvedValue(mockProject);

      const project = await ProjectService.createProject(owner.id, projectData);

      expect(project).toBeDefined();
      expect(project.name).toBe(projectData.name);
      expect(project.mainState).toEqual(projectData.mainState);
      expect(project.version).toBe('1.0.0');
      expect(project.userId).toBe(owner.id);

      expect(mockedPrisma.project.create).toHaveBeenCalledWith({
        data: {
          ...projectData,
          userId: owner.id,
          version: '1.0.0',
          features: null,
        },
      });

      expect(mockedLogger.info).toHaveBeenCalledWith('Project created successfully', {
        projectId: project.id,
        userId: owner.id,
        name: project.name,
      });
    });
  });

  describe('getProjectById', () => {
    it('should return project for owner', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        owner: { id: owner.id, name: owner.name, email: owner.email },
        changes: [],
        snapshots: [],
        collaborators: [],
        conversations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock userHasProjectAccess to return true for owner
      mockedPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockedPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await ProjectService.getProjectById('project-id-1', owner.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe('project-id-1');
      expect(result?.owner).toBeDefined();
      expect(result?.owner.id).toBe(owner.id);
    });

    it('should return project for collaborator', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        owner: { id: owner.id, name: owner.name, email: owner.email },
        changes: [],
        snapshots: [],
        collaborators: [],
        conversations: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock userHasProjectAccess to return true for collaborator
      mockedPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockedPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await ProjectService.getProjectById('project-id-1', collaborator.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe('project-id-1');
    });

    it('should return null for unauthorized user', async () => {
      // Mock userHasProjectAccess to return false
      mockedPrisma.project.findFirst.mockResolvedValue(null);

      const result = await ProjectService.getProjectById('project-id-1', collaborator.id);

      expect(result).toBeNull();
    });
  });

  describe('getUserProjects', () => {
    it('should return user projects', async () => {
      const mockProjects = [
        {
          id: 'project-id-1',
          name: 'Project 1',
          mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
          version: '1.0.0',
          userId: owner.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'project-id-2',
          name: 'Project 2',
          mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
          version: '1.0.0',
          userId: owner.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockedPrisma.project.findMany.mockResolvedValue(mockProjects);

      const projects = await ProjectService.getUserProjects(owner.id);

      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.name)).toEqual(['Project 1', 'Project 2']);

      expect(mockedPrisma.project.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userId: owner.id },
            {
              collaborators: {
                some: {
                  userId: owner.id,
                  status: 'accepted',
                },
              },
            },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Original Name',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        name: 'Updated Name',
        mainState: { elements: [{ type: 'rectangle' }] },
      };

      const updatedProject = {
        ...mockProject,
        ...updateData,
      };

      mockedPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockedPrisma.project.update.mockResolvedValue(updatedProject);

      const result = await ProjectService.updateProject('project-id-1', owner.id, updateData);

      expect(result).toBeDefined();
      expect(result?.name).toBe(updateData.name);
      expect(result?.mainState).toEqual(updateData.mainState);

      expect(mockedPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-id-1' },
        data: expect.objectContaining({
          name: updateData.name,
          mainState: updateData.mainState,
        }),
      });
    });

    it('should return null for non-owner', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await ProjectService.updateProject('project-id-1', collaborator.id, {
        name: 'Updated Name',
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockedPrisma.project.delete.mockResolvedValue(mockProject);

      const result = await ProjectService.deleteProject('project-id-1', owner.id);

      expect(result).toBe(true);

      expect(mockedPrisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'project-id-1' },
      });
    });

    it('should return false for non-owner', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockedPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await ProjectService.deleteProject('project-id-1', collaborator.id);

      expect(result).toBe(false);
    });
  });

  describe('applyProjectChange', () => {
    it('should apply change successfully', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const changeData = {
        version: '1.1.0',
        diff: {
          op: 'add',
          path: '/elements/0',
          value: { type: 'rectangle', x: 100, y: 100 },
        },
        actionDescription: 'Added rectangle',
      };

      const updatedProject = {
        ...mockProject,
        version: changeData.version,
      };

      const mockChange = {
        id: 'change-id-1',
        projectId: 'project-id-1',
        version: changeData.version,
        diff: changeData.diff,
        actionDescription: changeData.actionDescription,
        createdAt: new Date(),
      };

      // Mock userHasEditAccess to return true
      mockedPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockedPrisma.projectChange.create.mockResolvedValue(mockChange);
      mockedPrisma.project.update.mockResolvedValue(updatedProject);

      const result = await ProjectService.applyProjectChange('project-id-1', owner.id, changeData);

      expect(result).toBeDefined();
      expect(result?.version).toBe(changeData.version);

      expect(mockedPrisma.projectChange.create).toHaveBeenCalledWith({
        data: {
          projectId: 'project-id-1',
          version: changeData.version,
          diff: changeData.diff,
          actionDescription: changeData.actionDescription,
          authorUserId: owner.id,
        },
      });

      expect(mockedPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-id-1' },
        data: expect.objectContaining({
          version: changeData.version,
        }),
      });
    });

    it('should return null for unauthorized user', async () => {
      // Mock userHasEditAccess to return false
      mockedPrisma.project.findFirst.mockResolvedValue(null);

      const result = await ProjectService.applyProjectChange('project-id-1', collaborator.id, {
        version: '1.1.0',
        diff: { op: 'add', path: '/elements/0', value: {} },
        actionDescription: 'Test change',
      });

      expect(result).toBeNull();
    });
  });

  describe('createSnapshot', () => {
    it('should create snapshot successfully', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const snapshotData = {
        version: '1.5.0',
        state: { elements: [] },
      };

      const mockSnapshot = {
        id: 'snapshot-id-1',
        projectId: 'project-id-1',
        version: snapshotData.version,
        state: mockProject.mainState,
        createdAt: new Date(),
      };

      // Mock userHasProjectAccess to return true
      mockedPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockedPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockedPrisma.snapshot.create.mockResolvedValue(mockSnapshot);

      const result = await ProjectService.createSnapshot('project-id-1', owner.id, snapshotData);

      expect(result).toBeDefined();
      expect(result?.version).toBe(snapshotData.version);

      expect(mockedPrisma.snapshot.create).toHaveBeenCalledWith({
        data: {
          ...snapshotData,
          projectId: 'project-id-1',
          state: mockProject.mainState,
        },
      });
    });
  });

  describe('getProjectHistory', () => {
    it('should return project history', async () => {
      const mockChanges = [
        {
          id: 'change-id-1',
          projectId: 'project-id-1',
          version: '1.1.0',
          diff: { op: 'add', path: '/elements/0', value: {} },
          actionDescription: 'Added element',
          createdAt: new Date(),
          author: { id: owner.id, name: owner.name },
        },
      ];

      const mockSnapshots = [
        {
          id: 'snapshot-id-1',
          projectId: 'project-id-1',
          version: '1.5.0',
          state: { elements: [] },
          createdAt: new Date(),
        },
      ];

      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        changes: mockChanges,
        snapshots: mockSnapshots,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock userHasProjectAccess to return true
      mockedPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockedPrisma.project.findUnique.mockResolvedValue(mockProject);

      const result = await ProjectService.getProjectHistory('project-id-1', owner.id);

      expect(result).toBeDefined();
      expect(result?.changes).toHaveLength(1);
      expect(result?.snapshots).toHaveLength(1);
      expect(result?.changes[0]?.version).toBe('1.1.0');
      expect(result?.snapshots[0]?.version).toBe('1.5.0');
    });
  });

  describe('rollbackToVersion', () => {
    it('should rollback to snapshot version', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSnapshot = {
        id: 'snapshot-id-1',
        projectId: 'project-id-1',
        version: '1.5.0',
        state: { elements: [{ type: 'rectangle' }] },
        createdAt: new Date(),
      };

      const updatedProject = {
        ...mockProject,
        version: '1.5.0',
        mainState: mockSnapshot.state,
      };

      // Mock userHasEditAccess to return true
      mockedPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockedPrisma.snapshot.findFirst.mockResolvedValue(mockSnapshot);
      mockedPrisma.project.update.mockResolvedValue(updatedProject);

      const result = await ProjectService.rollbackToVersion('project-id-1', owner.id, '1.5.0');

      expect(result).toBeDefined();
      expect(result?.version).toBe('1.5.0');

      expect(mockedPrisma.snapshot.findFirst).toHaveBeenCalledWith({
        where: {
          projectId: 'project-id-1',
          version: '1.5.0',
        },
      });

      expect(mockedPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'project-id-1' },
        data: {
          mainState: mockSnapshot.state,
          version: '1.5.0',
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should return null for non-existent version', async () => {
      const mockProject = {
        id: 'project-id-1',
        name: 'Test Project',
        mainState: { elements: [], canvas: { width: 1920, height: 1080 } },
        version: '1.0.0',
        userId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock userHasEditAccess to return true
      mockedPrisma.project.findFirst.mockResolvedValue(mockProject);
      mockedPrisma.snapshot.findFirst.mockResolvedValue(null);

      const result = await ProjectService.rollbackToVersion('project-id-1', owner.id, '2.0.0');

      expect(result).toBeNull();
    });
  });
}); 