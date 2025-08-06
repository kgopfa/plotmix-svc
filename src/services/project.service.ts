import { prisma } from '../clients/database.client';
import { logger } from '../utils/logger';
import {
  Project,
  ProjectWithRelations,
  CreateProjectRequest,
  UpdateProjectRequest,
  CreateProjectChangeRequest,
  CreateSnapshotRequest,
  ProjectHistory,
  VersionInfo,
  Snapshot,
} from '../types';

export class ProjectService {
  static async createProject(userId: string, projectData: CreateProjectRequest): Promise<Project> {
    const { features, ...restData } = projectData;
    const project = await prisma.project.create({
      data: {
        ...restData,
        userId,
        version: '1.0.0', // Initial version
        features: features ? (features as any) : null,
      },
    });

    logger.info('Project created successfully', {
      projectId: project.id,
      userId,
      name: project.name,
    });

    return project;
  }

  static async getProjectById(projectId: string, userId: string): Promise<ProjectWithRelations | null> {
    // Check if user has access to the project
    const hasAccess = await this.userHasProjectAccess(projectId, userId);
    if (!hasAccess) {
      return null;
    }

    return prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: true,
        changes: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Limit to recent changes
        },
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 5, // Limit to recent snapshots
        },
        collaborators: {
          include: {
            user: true,
          },
        },
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 5, // Limit to recent conversations
        },
      },
    });
  }

  static async getUserProjects(userId: string): Promise<Project[]> {
    return prisma.project.findMany({
      where: {
        OR: [
          { userId }, // Owned projects
          {
            collaborators: {
              some: {
                userId,
                status: 'accepted',
              },
            },
          }, // Collaborated projects
        ],
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  static async updateProject(
    projectId: string,
    userId: string,
    updateData: UpdateProjectRequest
  ): Promise<Project | null> {
    // Check if user is the owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      return null;
    }

    const { features, ...restUpdateData } = updateData;
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...restUpdateData,
        features: features ? (features as any) : undefined,
        updatedAt: new Date(),
      },
    });

    logger.info('Project updated successfully', {
      projectId,
      userId,
      updatedFields: Object.keys(updateData),
    });

    return updatedProject;
  }

  static async deleteProject(projectId: string, userId: string): Promise<boolean> {
    // Check if user is the owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== userId) {
      return false;
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    logger.info('Project deleted successfully', {
      projectId,
      userId,
    });

    return true;
  }

  // Version Control Methods
  static async applyProjectChange(
    projectId: string,
    userId: string,
    changeData: CreateProjectChangeRequest
  ): Promise<Project | null> {
    // Check if user has edit access
    const hasEditAccess = await this.userHasEditAccess(projectId, userId);
    if (!hasEditAccess) {
      return null;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return null;
    }

    // Create the change record
    await prisma.projectChange.create({
      data: {
        ...changeData,
        projectId,
        authorUserId: userId,
      },
    });

    // Update project version and state
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        version: changeData.version,
        mainState: changeData.diff, // This should be the new state, not just the diff
        updatedAt: new Date(),
      },
    });

    logger.info('Project change applied successfully', {
      projectId,
      userId,
      version: changeData.version,
      actionDescription: changeData.actionDescription,
    });

    return updatedProject;
  }

  static async createSnapshot(
    projectId: string,
    userId: string,
    snapshotData: CreateSnapshotRequest
  ): Promise<Snapshot | null> {
    // Check if user has access
    const hasAccess = await this.userHasProjectAccess(projectId, userId);
    if (!hasAccess) {
      return null;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return null;
    }

    const snapshot = await prisma.snapshot.create({
      data: {
        ...snapshotData,
        projectId,
        state: project.mainState as any, // Use current project state
      },
    });

    logger.info('Project snapshot created successfully', {
      projectId,
      userId,
      version: snapshotData.version,
    });

    return snapshot;
  }

  static async getProjectHistory(projectId: string, userId: string): Promise<ProjectHistory | null> {
    // Check if user has access
    const hasAccess = await this.userHasProjectAccess(projectId, userId);
    if (!hasAccess) {
      return null;
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        changes: {
          include: {
            author: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        snapshots: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!project) {
      return null;
    }

    const changes: VersionInfo[] = project.changes.map(change => ({
      version: change.version,
      timestamp: change.createdAt,
      authorId: change.author.id,
      authorName: change.author.name,
      ...(change.actionDescription && { actionDescription: change.actionDescription }),
    }));

    const snapshots: VersionInfo[] = project.snapshots.map(snapshot => ({
      version: snapshot.version,
      timestamp: snapshot.createdAt,
      authorId: '', // Snapshots don't have authors in current schema
      authorName: 'System',
    }));

    return {
      project,
      changes,
      snapshots,
    };
  }

  static async rollbackToVersion(projectId: string, userId: string, version: string): Promise<Project | null> {
    // Check if user has edit access
    const hasEditAccess = await this.userHasEditAccess(projectId, userId);
    if (!hasEditAccess) {
      return null;
    }

    // Try to find snapshot first (faster rollback)
    let snapshot = await prisma.snapshot.findFirst({
      where: {
        projectId,
        version,
      },
    });

    if (snapshot) {
      // Rollback using snapshot
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: {
          mainState: snapshot.state as any,
          version,
          updatedAt: new Date(),
        },
      });

      logger.info('Project rolled back using snapshot', {
        projectId,
        userId,
        version,
      });

      return updatedProject;
    }

    // If no snapshot, we'd need to replay changes (more complex)
    // This is a simplified version - in production you'd want more sophisticated change replay
    logger.warn('Rollback to version without snapshot not implemented', {
      projectId,
      userId,
      version,
    });

    return null;
  }

  // Helper Methods
  private static async userHasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId }, // Owner
          {
            collaborators: {
              some: {
                userId,
                status: 'accepted',
              },
            },
          }, // Collaborator
        ],
      },
    });

    return !!project;
  }

  private static async userHasEditAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId }, // Owner
          {
            collaborators: {
              some: {
                userId,
                status: 'accepted',
                role: { in: ['editor', 'admin'] },
              },
            },
          }, // Editor or Admin
        ],
      },
    });

    return !!project;
  }
} 