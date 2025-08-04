import { Response } from 'express';
import { CollaborationService } from '../services/collaboration.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

export class CollaborationController {
  static async inviteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'Project ID is required',
        });
        return;
      }
      const projectRole = await CollaborationService.inviteUser(projectId, req.user.userId, req.body);

      if (!projectRole) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied',
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'User invited successfully',
        data: { projectRole },
      });
    } catch (error) {
      logger.error('Invite user failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to invite user',
      });
    }
  }

  static async updateInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { projectId, userId } = req.params;
      if (!projectId || !userId) {
        res.status(400).json({
          success: false,
          message: 'Project ID and User ID are required',
        });
        return;
      }
      const projectRole = await CollaborationService.updateInvitation(projectId, userId, req.body);

      if (!projectRole) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Invitation updated successfully',
        data: { projectRole },
      });
    } catch (error) {
      logger.error('Update invitation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        targetUserId: req.params['userId'],
        body: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update invitation',
      });
    }
  }

  static async respondToInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'Project ID is required',
        });
        return;
      }
      const { response } = req.body;

      if (!response || !['accepted', 'declined'].includes(response)) {
        res.status(400).json({
          success: false,
          message: 'Invalid response. Must be "accepted" or "declined"',
        });
        return;
      }

      const projectRole = await CollaborationService.respondToInvitation(
        projectId,
        req.user.userId,
        response
      );

      if (!projectRole) {
        res.status(404).json({
          success: false,
          message: 'Invitation not found or already processed',
        });
        return;
      }

      res.json({
        success: true,
        message: `Invitation ${response} successfully`,
        data: { projectRole },
      });
    } catch (error) {
      logger.error('Respond to invitation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        response: req.body.response,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to respond to invitation',
      });
    }
  }

  static async removeCollaborator(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { projectId, userId } = req.params;
      if (!projectId || !userId) {
        res.status(400).json({
          success: false,
          message: 'Project ID and User ID are required',
        });
        return;
      }
      const success = await CollaborationService.removeCollaborator(projectId, req.user.userId, userId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Project not found, access denied, or cannot remove owner',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Collaborator removed successfully',
      });
    } catch (error) {
      logger.error('Remove collaborator failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        targetUserId: req.params['userId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to remove collaborator',
      });
    }
  }

  static async getProjectCollaborators(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'Project ID is required',
        });
        return;
      }
      const collaborators = await CollaborationService.getProjectCollaborators(projectId, req.user.userId);

      res.json({
        success: true,
        message: 'Project collaborators retrieved successfully',
        data: { collaborators },
      });
    } catch (error) {
      logger.error('Get project collaborators failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project collaborators',
      });
    }
  }

  static async getUserInvitations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const invitations = await CollaborationService.getUserInvitations(req.user.userId);

      res.json({
        success: true,
        message: 'User invitations retrieved successfully',
        data: { invitations },
      });
    } catch (error) {
      logger.error('Get user invitations failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user invitations',
      });
    }
  }

  static async getUserCollaborations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const collaborations = await CollaborationService.getUserCollaborations(req.user.userId);

      res.json({
        success: true,
        message: 'User collaborations retrieved successfully',
        data: { collaborations },
      });
    } catch (error) {
      logger.error('Get user collaborations failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user collaborations',
      });
    }
  }
} 