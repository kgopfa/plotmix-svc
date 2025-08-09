import { Response } from 'express';
import { ConversationService } from '../services/conversation.service';
import { ApiResponse, AuthenticatedRequest, MESSAGE_TYPES, BatchDeleteRequest } from '../types';
import { logger } from '../utils/logger';

export class ConversationController {
  static async createConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const conversation = await ConversationService.createConversation(userId, req.body);

      return res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: conversation,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error creating conversation', { error, userId: req.user?.sub });
      return res.status(500).json({
        success: false,
        message: 'Failed to create conversation',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async getConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const conversationId = req.params['conversationId'];
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        } as ApiResponse);
      }
      const conversation = await ConversationService.getConversationById(conversationId, userId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        } as ApiResponse);
      }

      return res.json({
        success: true,
        message: 'Conversation retrieved successfully',
        data: conversation,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving conversation', { error, conversationId: req.params['conversationId'] });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async getUserConversations(req: AuthenticatedRequest, res: Response) {
    logger.info('Attempting to fetch user conversations', {
      userId: req.user?.userId,
      projectId: req.query['projectId'],
      method: req.method,
      url: req.url,
    });
    
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        logger.warn('❌ User not authenticated for getUserConversations');
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const { page, limit, projectId } = req.query;
      const filters = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        projectId: projectId as string | undefined,
      };
      
      logger.info('📡 Fetching conversations with filters:', filters);

      const conversations = await ConversationService.getUserConversations(userId, filters);
      
      logger.info('✅ Conversations retrieved successfully', {
        userId,
        projectId: req.query['projectId'],
        conversationCount: conversations.length,
      });

      return res.json({
        success: true,
        message: 'Conversations retrieved successfully',
        data: conversations,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving user conversations', { error, userId: req.user?.sub });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversations',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async updateConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const conversationId = req.params['conversationId'];
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        } as ApiResponse);
      }
      const conversation = await ConversationService.updateConversation(conversationId, userId, req.body);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied',
        } as ApiResponse);
      }

      return res.json({
        success: true,
        message: 'Conversation updated successfully',
        data: conversation,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error updating conversation', { error, conversationId: req.params['conversationId'] });
      return res.status(500).json({
        success: false,
        message: 'Failed to update conversation',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async deleteConversation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const conversationId = req.params['conversationId'];
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        } as ApiResponse);
      }
      const deleted = await ConversationService.deleteConversation(conversationId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied',
        } as ApiResponse);
      }

      return res.json({
        success: true,
        message: 'Conversation deleted successfully',
      } as ApiResponse);
    } catch (error) {
      logger.error('Error deleting conversation', { error, conversationId: req.params['conversationId'] });
      return res.status(500).json({
        success: false,
        message: 'Failed to delete conversation',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async addMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const conversationId = req.params['conversationId'];
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        } as ApiResponse);
      }
      const { messageType = MESSAGE_TYPES.USER, ...messageData } = req.body;

      const message = await ConversationService.addMessage(conversationId, userId, messageData, messageType);

      return res.status(201).json({
        success: true,
        message: 'Message added successfully',
        data: message,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error adding message', { error, conversationId: req.params['conversationId'] });
      return res.status(500).json({
        success: false,
        message: 'Failed to add message',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async getMessages(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const conversationId = req.params['conversationId'];
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        } as ApiResponse);
      }
      const { page, limit, before } = req.query;
      const pagination = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        before: before ? new Date(before as string) : undefined,
      };

      const messages = await ConversationService.getMessages(conversationId, userId, pagination);

      return res.json({
        success: true,
        message: 'Messages retrieved successfully',
        data: messages,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving messages', { error, conversationId: req.params['conversationId'] });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve messages',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async getMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const messageId = req.params['messageId'];
      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Message ID is required',
        } as ApiResponse);
      }
      const message = await ConversationService.getMessageById(messageId, userId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        } as ApiResponse);
      }

      return res.json({
        success: true,
        message: 'Message retrieved successfully',
        data: message,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving message', { error, messageId: req.params['messageId'] });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve message',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async updateMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const messageId = req.params['messageId'];
      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Message ID is required',
        } as ApiResponse);
      }
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({
          success: false,
          message: 'Content is required',
        } as ApiResponse);
      }

      const message = await ConversationService.updateMessage(messageId, userId, content);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found or access denied',
        } as ApiResponse);
      }

      return res.json({
        success: true,
        message: 'Message updated successfully',
        data: message,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error updating message', { error, messageId: req.params['messageId'] });
      return res.status(500).json({
        success: false,
        message: 'Failed to update message',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async deleteMessage(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

        const messageId = req.params['messageId'];
      if (!messageId) {
        return res.status(400).json({
          success: false,
          message: 'Message ID is required',
        } as ApiResponse);
      }
      const deleted = await ConversationService.deleteMessage(messageId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Message not found or access denied',
        } as ApiResponse);
      }

      return res.json({
        success: true,
        message: 'Message deleted successfully',
      } as ApiResponse);
    } catch (error) {
      logger.error('Error deleting message', { error, messageId: req.params['messageId'] });
      return res.status(500).json({
        success: false,
        message: 'Failed to delete message',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async getConversationStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        } as ApiResponse);
      }

      const conversationId = req.params['conversationId'];
      if (!conversationId) {
        return res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        } as ApiResponse);
      }
      const stats = await ConversationService.getConversationStats(conversationId, userId);

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        } as ApiResponse);
      }

      return res.json({
        success: true,
        message: 'Conversation stats retrieved successfully',
        data: stats,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving conversation stats', { error, conversationId: req.params['conversationId'] });
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation stats',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async batchDelete(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' } as ApiResponse);
      }
      const body = req.body as BatchDeleteRequest;
      if (!body?.ids || !Array.isArray(body.ids) || body.ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids[] is required' } as ApiResponse);
      }
      let deleted = 0;
      for (const id of body.ids) {
        const ok = await ConversationService.deleteConversation(id, userId);
        if (ok) deleted += 1;
      }
      return res.json({ success: true, message: 'Conversations batch deleted', data: { requested: body.ids.length, deleted } } as ApiResponse);
    } catch (error) {
      logger.error('Batch delete conversations failed', { error });
      return res.status(500).json({ success: false, message: 'Failed to batch delete conversations' } as ApiResponse);
    }
  }
} 