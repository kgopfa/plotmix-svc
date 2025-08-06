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

// Conversation statistics
router.get('/:conversationId/stats', ConversationController.getConversationStats);

// Message operations
router.post('/:conversationId/messages', ConversationController.addMessage);
router.get('/:conversationId/messages', ConversationController.getMessages);

// Individual message operations
router.get('/messages/:messageId', ConversationController.getMessage);
router.put('/messages/:messageId', ConversationController.updateMessage);
router.delete('/messages/:messageId', ConversationController.deleteMessage);

export { router as conversationRoutes }; 