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

// Project Generation
router.post('/generate', ProjectController.generateProjectConfiguration);

export { router as projectRoutes }; 