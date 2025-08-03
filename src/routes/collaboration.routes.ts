import { Router } from 'express';
import { CollaborationController } from '../controllers/collaboration.controller';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// Apply authentication middleware to all collaboration routes
router.use(authenticateToken);

// Project collaboration management
router.post('/:projectId/invite', CollaborationController.inviteUser);
router.put('/:projectId/invite/:userId', CollaborationController.updateInvitation);
router.post('/:projectId/respond', CollaborationController.respondToInvitation);
router.delete('/:projectId/collaborators/:userId', CollaborationController.removeCollaborator);
router.get('/:projectId/collaborators', CollaborationController.getProjectCollaborators);

// User collaboration views
router.get('/invitations', CollaborationController.getUserInvitations);
router.get('/collaborations', CollaborationController.getUserCollaborations);

export { router as collaborationRoutes }; 