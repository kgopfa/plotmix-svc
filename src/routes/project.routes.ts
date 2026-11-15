import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authenticateToken } from '../middleware/auth';
import type { Request, Response, NextFunction } from 'express';
import { getCachedDslForPrompt } from '../services/pipeline/dsl/cache';
// Demo mode: AI generation is disabled when no LLM key is configured
const requireAi = (req: Request, res: Response, next: NextFunction): void => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt : '';
  // Cached example prompts don't need an LLM, so let them through
  if (prompt && getCachedDslForPrompt(prompt)) {
    next();
    return;
  }
  if (!process.env['OPENAI_API_KEY'] && !process.env['ANTHROPIC_API_KEY']) {
    res.status(503).json({ success: false, message: 'AI generation is disabled in this demo.' });
    return;
  }
  next();
};


const router: Router = Router();

// Apply authentication middleware to all project routes
router.use(authenticateToken);

// Project CRUD operations
router.post('/', ProjectController.createProject);
router.get('/', ProjectController.getUserProjects);
router.get('/:projectId', ProjectController.getProject);
router.put('/:projectId', ProjectController.updateProject);
router.delete('/:projectId', ProjectController.deleteProject);

// Version control operations
router.post('/:projectId/changes', ProjectController.applyChange);
router.post('/:projectId/snapshots', ProjectController.createSnapshot);
router.get('/:projectId/history', ProjectController.getProjectHistory);
router.post('/:projectId/rollback/:version', ProjectController.rollbackToVersion);
router.post('/:projectId/rollforward', ProjectController.rollforward);
router.post('/:projectId/undo', ProjectController.undo);
router.post('/:projectId/redo', ProjectController.redo);
// AI Tools: Apply NL prompt to edit project's mainState
router.post('/:projectId/ai-edit', requireAi, ProjectController.applyAiEdit);
router.post('/:projectId/convert-to-native', ProjectController.convertToNative);
// Designer prompts
router.get('/:projectId/designer-prompts', ProjectController.listDesignerPrompts);
router.delete('/:projectId/designer-prompts/:promptId', ProjectController.deleteDesignerPrompt);
router.delete('/:projectId/designer-prompts', ProjectController.clearDesignerPrompts);

// Script generation
router.post('/:projectId/generate-script', requireAi, ProjectController.generateScript);

// Project Generation
router.post('/generate', requireAi, ProjectController.generateProjectConfiguration);

// User preferences
router.post('/preferences', ProjectController.saveUserPreferences);

// Batch operations
router.post('/batch/delete', ProjectController.batchDelete);

export { router as projectRoutes }; 