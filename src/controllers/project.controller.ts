import { Response } from 'express';
import { ProjectService } from '../services/project.service';
import { ContentGenService } from '../services/content-gen.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, CreateProjectWithConversationRequest, ProjectConfigurationResponse } from '../types';

export class ProjectController {
  static async createProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const project = await ProjectService.createProject(req.user.userId, {
        name: 'New Project',
        mainState: {},
        features: {
          attachments: { enabled: false },
          audio: { enabled: false },
          music: { enabled: false },
          webSearch: { enabled: false },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: { project },
      });
    } catch (error) {
      logger.error('Project creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create project',
      });
    }
  }

  static async generateProjectConfiguration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const data: CreateProjectWithConversationRequest = req.body;
      if (!data.prompt) {
        res.status(400).json({
          success: false,
          message: 'Prompt is required',
        });
        return;
      }

      const result: ProjectConfigurationResponse = await ContentGenService.generateProjectConfiguration(req.user.userId, data);

      res.status(201).json({
        success: true,
        message: 'Project and conversation created successfully',
        data: { project: result.project },
      });
    } catch (error) {
      logger.error('Project generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate project',
      });
    }
  }

  static async getProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    logger.info('Attempting to fetch project', {
      projectId: req.params['projectId'],
      userId: req.user?.userId,
      method: req.method,
      url: req.url,
    });
    
    try {
      if (!req.user || !req.user.userId) {
        logger.warn('❌ User not authenticated for getProject', {
          projectId: req.params['projectId'],
        });
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
      const project = await ProjectService.getProjectById(projectId, req.user.userId);

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Project retrieved successfully',
        data: { project },
      });
    } catch (error) {
      logger.error('Get project failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project',
      });
    }
  }

  static async getUserProjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const projects = await ProjectService.getUserProjects(req.user.userId);

      res.json({
        success: true,
        message: 'Projects retrieved successfully',
        data: { projects },
      });
    } catch (error) {
      logger.error('Get user projects failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve projects',
      });
    }
  }

  static async updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const project = await ProjectService.updateProject(projectId, req.user.userId, req.body);

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Project updated successfully',
        data: { project },
      });
    } catch (error) {
      logger.error('Update project failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        body: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to update project',
      });
    }
  }

  static async deleteProject(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const success = await ProjectService.deleteProject(projectId, req.user.userId);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Project deleted successfully',
      });
    } catch (error) {
      logger.error('Delete project failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete project',
      });
    }
  }

  // Version Control Endpoints
  static async applyChange(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const project = await ProjectService.applyProjectChange(projectId, req.user.userId, req.body);

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found or edit access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Project change applied successfully',
        data: { project },
      });
    } catch (error) {
      logger.error('Apply project change failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        body: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to apply project change',
      });
    }
  }

  static async createSnapshot(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const snapshot = await ProjectService.createSnapshot(projectId, req.user.userId, req.body);

      if (!snapshot) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied',
        });
        return;
      }

      res.status(201).json({
        success: true,
        message: 'Project snapshot created successfully',
        data: { snapshot },
      });
    } catch (error) {
      logger.error('Create snapshot failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        body: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to create snapshot',
      });
    }
  }

  static async getProjectHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const history = await ProjectService.getProjectHistory(projectId, req.user.userId);

      if (!history) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Project history retrieved successfully',
        data: { history },
      });
    } catch (error) {
      logger.error('Get project history failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project history',
      });
    }
  }

  static async rollbackToVersion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { projectId, version } = req.params;
      if (!projectId || !version) {
        res.status(400).json({
          success: false,
          message: 'Project ID and version are required',
        });
        return;
      }
      const project = await ProjectService.rollbackToVersion(projectId, req.user.userId, version);

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found, version not found, or edit access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Project rolled back successfully',
        data: { project },
      });
    } catch (error) {
      logger.error('Rollback project failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        version: req.params['version'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to rollback project',
      });
    }
  }
} 