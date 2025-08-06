import { Response } from 'express';
import { ConversationService } from '../services/conversation.service';
import { ProjectFeaturesService } from '../services/project-features.service';
import { CanvasGenerationService } from '../services/canvas-generation.service';
import { logger } from '../utils/logger';
import { AuthenticatedRequest, MessageType } from '../types';

export class ConversationController {
  static async createConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const conversation = await ConversationService.createConversation(req.user.userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: { conversation },
      });
    } catch (error) {
      logger.error('Conversation creation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Conversation creation failed',
      });
    }
  }

  static async getUserConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { page, limit, projectId } = req.query;
      const filters = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        projectId: projectId as string | undefined,
      };

      const result = await ConversationService.getUserConversations(req.user.userId, filters);

      res.json({
        success: true,
        message: 'Conversations retrieved successfully',
        data: {
          conversations: result.conversations,
          pagination: {
            page: filters.page || 1,
            limit: filters.limit || 20,
            total: result.total,
            totalPages: Math.ceil(result.total / (filters.limit || 20)),
          },
        },
      });
    } catch (error) {
      logger.error('Get user conversations failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        query: req.query,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversations',
      });
    }
  }

  static async getConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
        return;
      }

      const conversation = await ConversationService.getConversation(conversationId, req.user.userId);

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Conversation retrieved successfully',
        data: { conversation },
      });
    } catch (error) {
      logger.error('Get conversation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        conversationId: req.params['conversationId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation',
      });
    }
  }

  static async updateConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
        return;
      }

      const conversation = await ConversationService.updateConversation(
        conversationId,
        req.user.userId,
        req.body
      );

      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Conversation updated successfully',
        data: { conversation },
      });
    } catch (error) {
      logger.error('Update conversation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        conversationId: req.params['conversationId'],
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update conversation',
      });
    }
  }

  static async deleteConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
        return;
      }

      const deleted = await ConversationService.deleteConversation(conversationId, req.user.userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error) {
      logger.error('Delete conversation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        conversationId: req.params['conversationId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to delete conversation',
      });
    }
  }

  static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
        return;
      }

      const result = await ConversationService.sendMessage(conversationId, req.user.userId, req.body);

      res.json({
        success: true,
        message: 'Message sent successfully',
        data: {
          userMessage: result.userMessage,
          ...(result.llmResponse && { llmResponse: result.llmResponse }),
          ...(result.canvasMessage && { canvasMessage: result.canvasMessage }),
        },
      });
    } catch (error) {
      logger.error('Send message failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        conversationId: req.params['conversationId'],
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }

  static async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
        return;
      }

      const { page, limit, before, messageTypes } = req.query;
      const pagination = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        before: before ? new Date(before as string) : undefined,
      };

      const messageTypesArray = messageTypes
        ? (messageTypes as string).split(',').map(type => type.trim()) as MessageType[]
        : undefined;

      const result = await ConversationService.getMessages(
        conversationId,
        req.user.userId,
        pagination,
        messageTypesArray
      );

      res.json({
        success: true,
        message: 'Messages retrieved successfully',
        data: {
          messages: result.messages,
          pagination: {
            page: pagination.page || 1,
            limit: pagination.limit || 50,
            total: result.total,
            totalPages: Math.ceil(result.total / (pagination.limit || 50)),
          },
        },
      });
    } catch (error) {
      logger.error('Get messages failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        conversationId: req.params['conversationId'],
        query: req.query,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve messages',
      });
    }
  }

  static async getProjectFeatures(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const features = await ProjectFeaturesService.getProjectFeatures(projectId);

      res.json({
        success: true,
        message: 'Project features retrieved successfully',
        data: { features },
      });
    } catch (error) {
      logger.error('Get project features failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve project features',
      });
    }
  }

  static async updateProjectFeatures(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const features = await ProjectFeaturesService.updateProjectFeatures(projectId, req.body.features);

      res.json({
        success: true,
        message: 'Project features updated successfully',
        data: { features },
      });
    } catch (error) {
      logger.error('Update project features failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        body: req.body,
      });

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update project features',
      });
    }
  }

  static async validateMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const validation = await ProjectFeaturesService.validateMessageFeatures(projectId, req.body);

      res.json({
        success: true,
        message: 'Message validation completed',
        data: validation,
      });
    } catch (error) {
      logger.error('Validate message failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        projectId: req.params['projectId'],
        body: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to validate message',
      });
    }
  }

  static async generateCanvas(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
        return;
      }

      const { prompt, options } = req.body;
      if (!prompt) {
        res.status(400).json({
          success: false,
          message: 'Prompt is required',
        });
        return;
      }

      const result = await CanvasGenerationService.generateCanvasData(
        conversationId,
        req.user.userId,
        prompt,
        options || {}
      );

      if (result.success) {
        res.json({
          success: true,
          message: 'Canvas generated successfully',
          data: {
            canvasData: result.canvasData,
            message: result.message,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Canvas generation failed',
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Canvas generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        conversationId: req.params['conversationId'],
        body: req.body,
      });

      res.status(500).json({
        success: false,
        message: 'Failed to generate canvas',
      });
    }
  }

  static async getGenerationStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const { conversationId } = req.params;
      if (!conversationId) {
        res.status(400).json({
          success: false,
          message: 'Conversation ID is required',
        });
        return;
      }

      // Verify conversation ownership
      const conversation = await ConversationService.getConversation(conversationId, req.user.userId);
      if (!conversation) {
        res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied',
        });
        return;
      }

      const stats = await CanvasGenerationService.getGenerationStats(conversationId);

      res.json({
        success: true,
        message: 'Generation statistics retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      logger.error('Get generation stats failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.user?.userId,
        conversationId: req.params['conversationId'],
      });

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve generation statistics',
      });
    }
  }
} 