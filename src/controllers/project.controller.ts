import { Response } from 'express';
import { ProjectService } from '../services/project.service';
import { ContentGenService } from '../services/content-gen.service';
import { logger } from '../utils/logger';
import { config } from '../config';
import { AuthenticatedRequest, CreateProjectWithConversationRequest, ProjectConfigurationResponse, BatchDeleteRequest } from '../types';
import { enqueueRenderJob } from '../services/render-queue.service';
import { buildRenderObjectKey } from '../services/render-storage.service';

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

      // Precompute render key and URL (using existing helper: same key format as renderer)
      try {
        const key = buildRenderObjectKey(result.project.id);
        const publicBase = process.env['R2_PUBLIC_BASE'] || process.env['R2_PUBLIC_ENDPOINT'] || process.env['R2_ENDPOINT'];
        if (!publicBase) {
          throw new Error('Missing required environment variable for public render URL: set R2_PUBLIC_BASE or R2_ENDPOINT');
        }
        let url: string | undefined;
        if (publicBase) {
          const bucket = (process.env['R2_BUCKET'] || '').replace(/^\/+|\/+$/g, '');
          const base = String(publicBase).replace(/\/$/, '');
          try {
            const u = new URL(base);
            const isR2Public = /\.r2\.dev$/i.test(u.hostname);
            const firstSeg = u.pathname.split('/').filter(Boolean)[0];
            if (isR2Public && firstSeg !== bucket && bucket) {
              url = `${base}/${bucket}/${key}`;
            } else {
              url = `${base}/${key}`;
            }
          } catch {
            url = `${base}/${key}`;
          }
        }

        // Update project with pending status and URL if we could compute it
        await ProjectService.updateProject(result.project.id, req.user.userId, {
          contentVideoKey: key,
          contentVideoUrl: url,
          contentVideoStatus: 'pending',
        } as any);

        // Enqueue async render (fire-and-forget)
        void enqueueRenderJob({
          projectId: result.project.id,
          fps: 30,
          width: 1280,
          height: 720,
          key,
        });
      } catch (err) {
        logger.error('Failed to enqueue render job', { err });
        // If we cannot enqueue or compute a public URL, ensure project reflects failure state
        try {
          await ProjectService.updateProject(result.project.id, req.user.userId, {
            contentVideoStatus: 'failed',
          } as any);
        } catch {}
      }

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

      // Log full project payload (with minimal sanitization) only in non-production
      try {
        if (config.nodeEnv !== 'production') {
          const safeProject: any = JSON.parse(JSON.stringify(project));
          if (safeProject?.owner) {
            if ('password' in safeProject.owner) safeProject.owner.password = '[REDACTED]';
          }
          logger.info('GetProject full payload', {
            projectId,
            userId: req.user?.userId,
            project: safeProject,
          });
        }
      } catch {}

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

      const page = req.query['page'] ? parseInt(req.query['page'] as string) : undefined;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined;
      const source = typeof req.query['source'] === 'string' ? (req.query['source'] as string) : undefined;
      const paginator: { page?: number; limit?: number } = {};
      if (typeof page === 'number') paginator.page = page;
      if (typeof limit === 'number') paginator.limit = limit;
      const filters: { source?: string } = {};
      if (typeof source === 'string') filters.source = source;
      const projects = await ProjectService.getUserProjects(req.user.userId, paginator, filters);

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

  static async rollforward(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { projectId } = req.params;
      const steps = typeof req.body?.steps === 'number' ? req.body.steps : 1;
      if (!projectId) {
        res.status(400).json({
          success: false,
          message: 'Project ID is required',
        });
        return;
      }
      const project = await ProjectService.rollforward(projectId, req.user.userId, steps);

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found or edit access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Project rolled forward successfully',
        data: { project },
      });
    } catch (error) {
      logger.error('Rollforward project failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        body: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to rollforward project',
      });
    }
  }

  static async undo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({ success: false, message: 'Project ID is required' });
        return;
      }
      const project = await ProjectService.undo(projectId, req.user.userId);
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found or access denied' });
        return;
      }
      res.json({ success: true, message: 'Undo applied', data: { project } });
    } catch (error) {
      logger.error('Undo failed', { error: error instanceof Error ? error.message : 'Unknown error', userId: req.user?.userId, projectId: req.params['projectId'] });
      res.status(500).json({ success: false, message: 'Failed to undo' });
    }
  }

  static async redo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({ success: false, message: 'Project ID is required' });
        return;
      }
      const project = await ProjectService.redo(projectId, req.user.userId);
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found or access denied' });
        return;
      }
      res.json({ success: true, message: 'Redo applied', data: { project } });
    } catch (error) {
      logger.error('Redo failed', { error: error instanceof Error ? error.message : 'Unknown error', userId: req.user?.userId, projectId: req.params['projectId'] });
      res.status(500).json({ success: false, message: 'Failed to redo' });
    }
  }

  static async convertToNative(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({ success: false, message: 'Project ID is required' });
        return;
      }
      const updated = await ProjectService.convertToNative(projectId, req.user.userId);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Project not found or access denied' });
        return;
      }
      res.json({ success: true, message: 'Project converted to native', data: { project: updated } });
    } catch (error) {
      logger.error('Convert to native failed', { error: error instanceof Error ? error.message : 'Unknown error', userId: req.user?.userId, projectId: req.params['projectId'] });
      res.status(500).json({ success: false, message: 'Failed to convert project' });
    }
  }

  static async batchDelete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      const body = req.body as BatchDeleteRequest;
      if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        res.status(400).json({ success: false, message: 'ids[] is required' });
        return;
      }
      let deleted = 0;
      for (const id of body.ids) {
        const ok = await ProjectService.deleteProject(id, req.user.userId);
        if (ok) deleted += 1;
      }
      res.json({ success: true, message: 'Projects batch deleted', data: { requested: body.ids.length, deleted } });
    } catch (error) {
      logger.error('Batch delete projects failed', { error: error instanceof Error ? error.message : 'Unknown error', userId: req.user?.userId });
      res.status(500).json({ success: false, message: 'Failed to batch delete projects' });
    }
  }
} 