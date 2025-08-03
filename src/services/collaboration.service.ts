import { prisma } from './prisma.service';
import { logger } from '../utils/logger';
import {
  ProjectRole,
  ProjectRoleWithRelations,
  CreateProjectRoleRequest,
  UpdateProjectRoleRequest,
} from '../types';

export class CollaborationService {
  static async inviteUser(
    projectId: string,
    ownerId: string,
    inviteData: CreateProjectRoleRequest
  ): Promise<ProjectRole | null> {
    // Check if the inviter is the project owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== ownerId) {
      return null;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: inviteData.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if invitation already exists
    const existingInvite = await prisma.projectRole.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: inviteData.userId,
        },
      },
    });

    if (existingInvite) {
      throw new Error('User already has a role in this project');
    }

    const projectRole = await prisma.projectRole.create({
      data: {
        projectId,
        userId: inviteData.userId,
        role: inviteData.role,
        status: 'pending',
      },
    });

    logger.info('User invited to project', {
      projectId,
      ownerId,
      invitedUserId: inviteData.userId,
      role: inviteData.role,
    });

    return projectRole;
  }

  static async updateInvitation(
    projectId: string,
    userId: string,
    updateData: UpdateProjectRoleRequest
  ): Promise<ProjectRole | null> {
    const projectRole = await prisma.projectRole.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!projectRole) {
      return null;
    }

    const updatedRole = await prisma.projectRole.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: updateData,
    });

    logger.info('Project role updated', {
      projectId,
      userId,
      updatedFields: Object.keys(updateData),
    });

    return updatedRole;
  }

  static async respondToInvitation(
    projectId: string,
    userId: string,
    response: 'accepted' | 'declined'
  ): Promise<ProjectRole | null> {
    const projectRole = await prisma.projectRole.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!projectRole || projectRole.status !== 'pending') {
      return null;
    }

    const updatedRole = await prisma.projectRole.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: {
        status: response,
      },
    });

    logger.info('User responded to project invitation', {
      projectId,
      userId,
      response,
    });

    return updatedRole;
  }

  static async removeCollaborator(
    projectId: string,
    ownerId: string,
    userId: string
  ): Promise<boolean> {
    // Check if the remover is the project owner
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.userId !== ownerId) {
      return false;
    }

    // Don't allow removing the owner
    if (userId === ownerId) {
      return false;
    }

    await prisma.projectRole.delete({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    logger.info('Collaborator removed from project', {
      projectId,
      ownerId,
      removedUserId: userId,
    });

    return true;
  }

  static async getProjectCollaborators(projectId: string, userId: string): Promise<ProjectRoleWithRelations[]> {
    // Check if user has access to the project
    const hasAccess = await this.userHasProjectAccess(projectId, userId);
    if (!hasAccess) {
      return [];
    }

    return prisma.projectRole.findMany({
      where: { projectId },
      include: {
        user: true,
        project: true,
      },
    });
  }

  static async getUserInvitations(userId: string): Promise<ProjectRoleWithRelations[]> {
    return prisma.projectRole.findMany({
      where: {
        userId,
        status: 'pending',
      },
      include: {
        user: true,
        project: {
          include: {
            owner: true,
          },
        },
      },
    });
  }

  static async getUserCollaborations(userId: string): Promise<ProjectRoleWithRelations[]> {
    return prisma.projectRole.findMany({
      where: {
        userId,
        status: 'accepted',
      },
      include: {
        user: true,
        project: {
          include: {
            owner: true,
          },
        },
      },
    });
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
} 