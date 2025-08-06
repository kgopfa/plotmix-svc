import { Router } from 'express';
import { ConversationController } from '../controllers/conversation.controller';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// Apply authentication middleware to all conversation routes
router.use(authenticateToken);

// Conversation CRUD operations
router.post('/', ConversationController.createConversation);
router.get('/', ConversationController.getUserConversations);
router.get('/:conversationId', ConversationController.getConversation);
router.put('/:conversationId', ConversationController.updateConversation);
router.delete('/:conversationId', ConversationController.deleteConversation);

// Message operations
router.post('/:conversationId/messages', ConversationController.sendMessage);
router.get('/:conversationId/messages', ConversationController.getMessages);

// Project features management
router.get('/projects/:projectId/features', ConversationController.getProjectFeatures);
router.put('/projects/:projectId/features', ConversationController.updateProjectFeatures);
router.post('/projects/:projectId/validate-message', ConversationController.validateMessage);

export { router as conversationRoutes }; 