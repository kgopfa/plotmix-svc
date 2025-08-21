import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authenticateToken } from '../middleware/auth';

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
router.post('/:projectId/ai-edit', ProjectController.applyAiEdit);
router.post('/:projectId/convert-to-native', ProjectController.convertToNative);
// Designer prompts
router.get('/:projectId/designer-prompts', ProjectController.listDesignerPrompts);
router.delete('/:projectId/designer-prompts/:promptId', ProjectController.deleteDesignerPrompt);
router.delete('/:projectId/designer-prompts', ProjectController.clearDesignerPrompts);

// Script generation
router.post('/:projectId/generate-script', ProjectController.generateScript);

// Project Generation
router.post('/generate', ProjectController.generateProjectConfiguration);

// User preferences
router.post('/preferences', ProjectController.saveUserPreferences);

// Batch operations
router.post('/batch/delete', ProjectController.batchDelete);

export { router as projectRoutes }; 