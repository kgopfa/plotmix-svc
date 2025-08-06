import { Request, Response } from 'express';
import { ConversationService } from '../services/conversation.service';
import { ApiResponse, AuthenticatedRequest, MESSAGE_TYPES } from '../types';
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

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: conversation,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error creating conversation', { error, userId: req.user?.sub });
      res.status(500).json({
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

      const { conversationId } = req.params;
      const conversation = await ConversationService.getConversationById(conversationId, userId);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Conversation retrieved successfully',
        data: conversation,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving conversation', { error, conversationId: req.params.conversationId });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }

  static async getUserConversations(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.sub || req.user?.id || req.user?.userId;
      if (!userId) {
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

      const conversations = await ConversationService.getUserConversations(userId, filters);

      res.json({
        success: true,
        message: 'Conversations retrieved successfully',
        data: conversations,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving user conversations', { error, userId: req.user?.sub });
      res.status(500).json({
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

      const { conversationId } = req.params;
      const conversation = await ConversationService.updateConversation(conversationId, userId, req.body);

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied',
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Conversation updated successfully',
        data: conversation,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error updating conversation', { error, conversationId: req.params.conversationId });
      res.status(500).json({
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

      const { conversationId } = req.params;
      const deleted = await ConversationService.deleteConversation(conversationId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied',
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully',
      } as ApiResponse);
    } catch (error) {
      logger.error('Error deleting conversation', { error, conversationId: req.params.conversationId });
      res.status(500).json({
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

      const { conversationId } = req.params;
      const { messageType = MESSAGE_TYPES.USER, ...messageData } = req.body;

      const message = await ConversationService.addMessage(conversationId, userId, messageData, messageType);

      res.status(201).json({
        success: true,
        message: 'Message added successfully',
        data: message,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error adding message', { error, conversationId: req.params.conversationId });
      res.status(500).json({
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

      const { conversationId } = req.params;
      const { page, limit, before } = req.query;
      const pagination = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        before: before ? new Date(before as string) : undefined,
      };

      const messages = await ConversationService.getMessages(conversationId, userId, pagination);

      res.json({
        success: true,
        message: 'Messages retrieved successfully',
        data: messages,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving messages', { error, conversationId: req.params.conversationId });
      res.status(500).json({
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

      const { messageId } = req.params;
      const message = await ConversationService.getMessageById(messageId, userId);

      if (!message) {
        return res.status(404).json({
          success: false,
          message: 'Message not found',
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Message retrieved successfully',
        data: message,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving message', { error, messageId: req.params.messageId });
      res.status(500).json({
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

      const { messageId } = req.params;
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

      res.json({
        success: true,
        message: 'Message updated successfully',
        data: message,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error updating message', { error, messageId: req.params.messageId });
      res.status(500).json({
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

      const { messageId } = req.params;
      const deleted = await ConversationService.deleteMessage(messageId, userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Message not found or access denied',
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Message deleted successfully',
      } as ApiResponse);
    } catch (error) {
      logger.error('Error deleting message', { error, messageId: req.params.messageId });
      res.status(500).json({
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

      const { conversationId } = req.params;
      const stats = await ConversationService.getConversationStats(conversationId, userId);

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found',
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Conversation stats retrieved successfully',
        data: stats,
      } as ApiResponse);
    } catch (error) {
      logger.error('Error retrieving conversation stats', { error, conversationId: req.params.conversationId });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation stats',
        error: error instanceof Error ? error.message : 'Unknown error',
      } as ApiResponse);
    }
  }
} 