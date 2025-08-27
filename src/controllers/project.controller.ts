import { Response } from 'express';
import { ProjectService } from '../services/project.service';
// import { OrchestrationService } from '../services/orchestration.service';
import { Orchestrator } from '../services/pipeline/orchestrator';
import { ConversationService } from '../services/conversation.service';
import { MESSAGE_TYPES } from '../types';
import { logger } from '../utils/logger';
import { createDefaultProjectConfiguration } from '../utils/project-config';
import { AuthenticatedRequest, CreateProjectWithConversationRequest, ProjectConfigurationResponse, BatchDeleteRequest } from '../types';
// import { enqueueRenderJob } from '../services/render-queue.service';
// import { buildRenderObjectKey } from '../services/render-storage.service';

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
        configuration: createDefaultProjectConfiguration(),
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

      // New pipeline: generate mainState via orchestrator, then create project
      const generated = await Orchestrator.generateFromPrompt(data.prompt);
      const project = await ProjectService.createProject(req.user.userId, {
        name: data.name || 'Generated Project',
        title: data.title,
        source: 'GENERATED',
        mainState: generated.mainState,
        configuration: createDefaultProjectConfiguration(),
        features: {
          attachments: { enabled: false },
          audio: { enabled: false },
          music: { enabled: false },
          webSearch: { enabled: false },
        },
      } as any);
      // Create a conversation linked to the new project and seed messages
      let conversationId = '';
      try {
        const conversation = await ConversationService.createConversation(req.user.userId, { projectId: project.id });
        conversationId = conversation.id;
        await ConversationService.addMessage(conversationId, req.user.userId, { content: data.prompt } as any, MESSAGE_TYPES.USER);
        await ConversationService.addMessage(conversationId, req.user.userId, { content: generated.summary || 'Generated via pipeline' } as any, MESSAGE_TYPES.LLM);
      } catch (e) {
        logger.error('Failed to create conversation/messages for generated project', { error: e instanceof Error ? e.message : String(e) });
      }

      const result: ProjectConfigurationResponse = {
        project,
        conversationId,
        user: { id: req.user.userId!, name: (req.user as any).name, email: (req.user as any).email }
      };

      /*
      // Precompute render key and URL (using existing helper: same key format as renderer)
      try {
        const key = buildRenderObjectKey(project.id);
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
        await ProjectService.updateProject(project.id, req.user.userId, {
          contentVideoKey: key,
          contentVideoUrl: url,
          contentVideoStatus: 'pending',
        } as any);

        // Enqueue async render (fire-and-forget)
        void enqueueRenderJob({
          projectId: project.id,
          fps: 30,
          width: 1920,
          height: 1080,
          key,
        });
      } catch (err) {
        logger.error('Failed to enqueue render job', { err });
        // If we cannot enqueue or compute a public URL, ensure project reflects failure state
        try {
          await ProjectService.updateProject(project.id, req.user.userId, {
            contentVideoStatus: 'failed',
          } as any);
        } catch {}
      }
      */

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

      logger.info('🔍 XXL: Project current state: ', { project });

      if (!project) {
        res.status(404).json({
          success: false,
          message: 'Project not found or access denied',
        });
        return;
      }

      logger.info('Project current state', {
        projectId,
        userId: req.user?.userId,
        project: project.mainState,
      });

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
        logger.error('User not authenticated', {
          userId: req.user?.userId,
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
        logger.error('Project ID is required', {
          userId: req.user?.userId,
          projectId: req.params['projectId'],
        });
        res.status(400).json({
          success: false,
          message: 'Project ID is required',
        });
        return;
      }
      const project = await ProjectService.applyProjectChange(projectId, req.user.userId, req.body);

      if (!project) {
        logger.error('Project not found or edit access denied', {
          userId: req.user?.userId,
          projectId: req.params['projectId'],
        });
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

  // AI Edit endpoint: apply NL prompt to update a project's mainState
  static async applyAiEdit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      const { projectId } = req.params;
      const { prompt } = req.body || {};
      if (!projectId) {
        res.status(400).json({ success: false, message: 'Project ID is required' });
        return;
      }
      if (typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ success: false, message: 'Prompt is required' });
        return;
      }

      // Load current project and ensure edit access
      const project = await ProjectService.getProjectById(projectId, req.user.userId);
      if (!project) {
        res.status(404).json({ success: false, message: 'Project not found or access denied' });
        return;
      }

      // Generate updated mainState via OpenAI service. Include brief history context of prior prompts and AI summaries.
      const { DesignerPromptService } = await import('../services/designer-prompt.service');
      const recent = await DesignerPromptService.listPrompts(projectId, req.user.userId, 10);
      const historyContext = recent
        .map((p) => {
          const ai = (p as any)?.aiResponse;
          return `- user: ${p.prompt}${ai ? `\n  ai: ${ai}` : ''}`;
        })
        .reverse()
        .join('\n');
      const { OpenAIGenerationService } = await import('../services/openai-generation.service');
      const editResult = await OpenAIGenerationService.applyEditToMainStateWithSummary(String(prompt), (project.mainState as any) || {}, historyContext);
      const updatedMainState = editResult.mainState;

      // Compute a jsondiffpatch delta between current and updated, then persist via change service for versioning/undo
      const { DiffPatcher } = await import('jsondiffpatch');
      const robustPatcher = new DiffPatcher({
        objectHash: (obj: any) => obj?.id ?? JSON.stringify(obj),
        arrays: { detectMove: true, includeValueOnMove: false },
      } as any);
      const currentState = (project.mainState as any) ?? {};
      let delta: any = robustPatcher.diff(currentState, updatedMainState) || null;
      if (!delta) {
        // No-op; return current project without creating a change
        res.json({ success: true, message: 'No changes from AI edit', data: { project } });
        return;
      }

      // Persist via versioned change pipeline
      const actionDescription = `AI edit: ${String(prompt).slice(0, 160)}`;
      const saved = await ProjectService.applyProjectChange(projectId, req.user.userId, {
        diff: delta,
        actionDescription,
      } as any);
      if (!saved) {
        res.status(404).json({ success: false, message: 'Project not found or edit access denied' });
        return;
      }

      // Persist the prompt in dedicated designer prompts log with resulting version
      try {
        const { DesignerPromptService } = await import('../services/designer-prompt.service');
        // Generate a compact summary of the applied change for follow-ups
        const summary = (() => {
          if (typeof editResult.summary === 'string' && editResult.summary.trim()) return editResult.summary.trim();
          try {
            const ops = Object.keys(delta || {});
            return `Updated: ${ops.slice(0, 4).join(', ') || 'mainState'}`;
          } catch {
            return 'Updated project';
          }
        })();
        await DesignerPromptService.recordPrompt({
          projectId,
          userId: req.user.userId,
          prompt: String(prompt),
          aiResponse: summary,
          status: 'applied',
          resultVersion: saved.version,
          metadata: null,
        });
      } catch (e) {
        logger.warn('Failed to persist designer prompt', { error: e instanceof Error ? e.message : String(e), projectId, userId: req.user.userId });
      }

      res.json({ success: true, message: 'AI edit applied (versioned)', data: { project: saved } });
    } catch (error) {
      logger.error('AI edit failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
      });
      res.status(500).json({ success: false, message: 'Failed to apply AI edit' });
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

  // List designer prompts for a project (current user only)
  static async listDesignerPrompts(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const limit = req.query['limit'] ? Math.max(1, Math.min(200, parseInt(String(req.query['limit'])) || 50)) : 50;
      const { DesignerPromptService } = await import('../services/designer-prompt.service');
      const prompts = await DesignerPromptService.listPrompts(projectId, req.user.userId, limit);
      res.json({ success: true, message: 'Designer prompts retrieved', data: { prompts } });
    } catch (error) {
      logger.error('List designer prompts failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
      });
      res.status(500).json({ success: false, message: 'Failed to list designer prompts' });
    }
  }

  // Delete a single designer prompt (by id) for current user
  static async deleteDesignerPrompt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }
      const { projectId, promptId } = req.params as any;
      if (!projectId || !promptId) {
        res.status(400).json({ success: false, message: 'Project ID and prompt ID are required' });
        return;
      }
      const { DesignerPromptService } = await import('../services/designer-prompt.service');
      const ok = await DesignerPromptService.deletePrompt(promptId, projectId, req.user.userId);
      if (!ok) {
        res.status(404).json({ success: false, message: 'Prompt not found' });
        return;
      }
      res.json({ success: true, message: 'Prompt deleted' });
    } catch (error) {
      logger.error('Delete designer prompt failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        promptId: (req.params as any)['promptId'],
      });
      res.status(500).json({ success: false, message: 'Failed to delete designer prompt' });
    }
  }

  // Clear all designer prompts for the current user in a project
  static async clearDesignerPrompts(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const { DesignerPromptService } = await import('../services/designer-prompt.service');
      const count = await DesignerPromptService.clearPrompts(projectId, req.user.userId);
      res.json({ success: true, message: 'Prompts cleared', data: { count } });
    } catch (error) {
      logger.error('Clear designer prompts failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
      });
      res.status(500).json({ success: false, message: 'Failed to clear designer prompts' });
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

  static async saveUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { preferences } = req.body;
      
      if (!preferences) {
        res.status(400).json({
          success: false,
          message: 'Preferences data is required',
        });
        return;
      }

      // Get the user's most recent project to save preferences
      const userProjects = await ProjectService.getUserProjects(req.user.userId, { page: 1, limit: 1 });
      
      if (userProjects.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No projects found to save preferences to',
        });
        return;
      }

      const latestProject = userProjects[0];
      
      if (!latestProject) {
        res.status(404).json({
          success: false,
          message: 'No projects found to save preferences to',
        });
        return;
      }
      
      // Update the project configuration with new preferences
      const currentConfig = latestProject.configuration as any;
      const updatedConfig = {
        ...currentConfig,
        editor: {
          ...currentConfig?.editor,
          ...preferences.editor,
        },
      };
      
      await ProjectService.updateProject(latestProject.id, req.user.userId, {
        configuration: updatedConfig,
      } as any);

      res.status(200).json({
        success: true,
        message: 'User preferences saved successfully',
      });
    } catch (error) {
      logger.error('Failed to save user preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to save user preferences',
      });
    }
  }

  static async generateScript(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      logger.info('Starting script generation request', {
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        promptLength: req.body?.prompt?.length || 0,
      });

      if (!req.user || !req.user.userId) {
        logger.warn('Script generation failed: User not authenticated');
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { projectId } = req.params;
      if (!projectId) {
        logger.warn('Script generation failed: Project ID missing');
        res.status(400).json({
          success: false,
          message: 'Project ID is required',
        });
        return;
      }

      const { prompt } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        logger.warn('Script generation failed: Invalid prompt', {
          promptType: typeof prompt,
          promptValue: prompt,
        });
        res.status(400).json({
          success: false,
          message: 'Prompt is required and must be a string',
        });
        return;
      }

      logger.info('Fetching project data for script generation', {
        projectId,
        userId: req.user.userId,
      });

      // Get the project to access its current state
      const project = await ProjectService.getProjectById(projectId, req.user.userId);
      if (!project) {
        logger.warn('Script generation failed: Project not found', {
          projectId,
          userId: req.user.userId,
        });
        res.status(404).json({
          success: false,
          message: 'Project not found',
        });
        return;
      }

      logger.info('Project data retrieved successfully', {
        projectId,
        projectName: project.name,
        hasMainState: !!project.mainState,
        mainStateKeys: project.mainState ? Object.keys(project.mainState) : [],
      });

      logger.info('Initializing OpenAI client for script generation');
      
      // Generate script using OpenAI
      const openaiClient = require('../clients/openai.client').OpenAIClient.getInstance();
      
      logger.info('Calling OpenAI to generate script', {
        promptLength: prompt.length,
        projectStateSize: JSON.stringify(project.mainState).length,
      });

      const script = await openaiClient.generateScript(prompt, project.mainState);

      logger.info('Script generated successfully', {
        projectId,
        scriptLength: script.length,
        scriptPreview: script.substring(0, 100) + (script.length > 100 ? '...' : ''),
      });

      res.status(200).json({
        success: true,
        message: 'Script generated successfully',
        data: {
          script,
          projectId,
        },
      });
    } catch (error) {
      logger.error('Script generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        userId: req.user?.userId,
        projectId: req.params['projectId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate script',
      });
    }
  }
} 