import { prisma } from '../clients/database.client';
import { logger } from '../utils/logger';
import {
  Conversation,
  Message,
  ConversationWithRelations,
  MessageWithRelations,
  CreateConversationRequest,
  UpdateConversationRequest,
  SendMessageRequest,
  ConversationFilters,
  PaginationOptions,
  MESSAGE_TYPES,
  MessageType,
} from '../types';

export class ConversationService {
  static async createConversation(
    userId: string,
    conversationData: CreateConversationRequest
  ): Promise<Conversation> {
    const conversation = await prisma.conversation.create({
      data: {
        title: conversationData.title || 'New Conversation',
        userId,
        projectId: conversationData.projectId || null,
      },
    });

    logger.info('Conversation created successfully', {
      conversationId: conversation.id,
      userId,
      title: conversation.title,
      projectId: conversation.projectId,
    });

    return conversation;
  }

  static async getConversationById(
    conversationId: string,
    userId: string
  ): Promise<ConversationWithRelations | null> {
    // Check if user has access to the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId, // Only allow access to own conversations
      },
      include: {
        user: true,
        project: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      logger.warn('Conversation not found or access denied', {
        conversationId,
        userId,
      });
      return null;
    }

    return conversation;
  }

  static async getUserConversations(
    userId: string,
    filters: ConversationFilters = {}
  ): Promise<Conversation[]> {
    const { page = 1, limit = 20, projectId } = filters;
    const skip = (page - 1) * limit;

    const whereClause: any = { userId };

    if (projectId) {
      whereClause.projectId = projectId;
    }

    return prisma.conversation.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  static async updateConversation(
    conversationId: string,
    userId: string,
    updateData: UpdateConversationRequest
  ): Promise<Conversation | null> {
    // Check if user owns the conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!existingConversation) {
      logger.warn('Conversation not found or access denied for update', {
        conversationId,
        userId,
      });
      return null;
    }

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: updateData,
    });

    logger.info('Conversation updated successfully', {
      conversationId,
      userId,
      title: conversation.title,
    });

    return conversation;
  }

  static async deleteConversation(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    // Check if user owns the conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!existingConversation) {
      logger.warn('Conversation not found or access denied for deletion', {
        conversationId,
        userId,
      });
      return false;
    }

    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    logger.info('Conversation deleted successfully', {
      conversationId,
      userId,
    });

    return true;
  }

  static async addMessage(
    conversationId: string,
    userId: string,
    messageData: SendMessageRequest,
    messageType: MessageType = MESSAGE_TYPES.USER
  ): Promise<Message> {
    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const message = await prisma.message.create({
      data: {
        content: messageData.content,
        messageType,
        metadata: messageData.attachments ? { attachments: messageData.attachments } : null,
        options: messageData.options ? (messageData.options as any) : null,
        conversationId,
      },
    });

    // Update conversation's updatedAt timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    logger.info('Message added to conversation', {
      messageId: message.id,
      conversationId,
      userId,
      messageType,
    });

    return message;
  }

  static async getMessages(
    conversationId: string,
    userId: string,
    pagination: PaginationOptions = {}
  ): Promise<Message[]> {
    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const { page = 1, limit = 50, before } = pagination;
    const skip = (page - 1) * limit;

    const whereClause: any = { conversationId };

    if (before) {
      whereClause.createdAt = { lt: before };
    }

    return prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });
  }

  static async getMessageById(
    messageId: string,
    userId: string
  ): Promise<MessageWithRelations | null> {
    const message = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          userId, // Ensure user has access to the conversation
        },
      },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      logger.warn('Message not found or access denied', {
        messageId,
        userId,
      });
      return null;
    }

    return message;
  }

  static async updateMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<Message | null> {
    // Verify message exists and user has access
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          userId,
        },
      },
    });

    if (!existingMessage) {
      logger.warn('Message not found or access denied for update', {
        messageId,
        userId,
      });
      return null;
    }

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { content },
    });

    logger.info('Message updated successfully', {
      messageId,
      userId,
      conversationId: message.conversationId,
    });

    return message;
  }

  static async deleteMessage(
    messageId: string,
    userId: string
  ): Promise<boolean> {
    // Verify message exists and user has access
    const existingMessage = await prisma.message.findFirst({
      where: {
        id: messageId,
        conversation: {
          userId,
        },
      },
    });

    if (!existingMessage) {
      logger.warn('Message not found or access denied for deletion', {
        messageId,
        userId,
      });
      return false;
    }

    await prisma.message.delete({
      where: { id: messageId },
    });

    logger.info('Message deleted successfully', {
      messageId,
      userId,
      conversationId: existingMessage.conversationId,
    });

    return true;
  }

  static async getConversationStats(conversationId: string, userId: string): Promise<{
    totalMessages: number;
    messageTypes: Record<string, number>;
    lastMessageAt: Date | null;
  } | null> {
    // Verify conversation exists and user has access
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return null;
    }

    const [totalMessages, messageTypes, lastMessage] = await Promise.all([
      prisma.message.count({
        where: { conversationId },
      }),
      prisma.message.groupBy({
        by: ['messageType'],
        where: { conversationId },
        _count: { messageType: true },
      }),
      prisma.message.findFirst({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const messageTypesCount: Record<string, number> = {};
    messageTypes.forEach((type) => {
      messageTypesCount[type.messageType] = type._count.messageType;
    });

    return {
      totalMessages,
      messageTypes: messageTypesCount,
      lastMessageAt: lastMessage?.createdAt || null,
    };
  }
} 