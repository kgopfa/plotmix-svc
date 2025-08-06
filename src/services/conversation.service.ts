import { prisma } from './prisma.service';
import { logger } from '../utils/logger';
import {
  Conversation,
  ConversationWithRelations,
  CreateConversationRequest,
  UpdateConversationRequest,
  ConversationFilters,
  Message,
  MessageWithRelations,
  SendMessageRequest,
  PaginationOptions,
  MESSAGE_TYPES,
  MessageType,
  ProjectFeatures,
} from '../types';

export class ConversationService {
  static async createConversation(
    userId: string,
    data: CreateConversationRequest
  ): Promise<ConversationWithRelations> {
    const conversation = await prisma.conversation.create({
      data: {
        title: data.title || `Conversation ${new Date().toLocaleDateString()}`,
        userId,
        projectId: data.projectId || null,
      },
      include: {
        user: true,
        messages: true,
        project: true,
      },
    });

    // Create initial system message if initialPrompt is provided
    if (data.initialPrompt) {
      await this.createSystemMessage(conversation.id, 'Conversation started');
      
      // Create user message with initial prompt
      await prisma.message.create({
        data: {
          content: data.initialPrompt,
          messageType: MESSAGE_TYPES.USER,
          conversationId: conversation.id,
        },
      });
    } else {
      // Create default system message
      await this.createSystemMessage(conversation.id, 'Conversation started');
    }

    logger.info('Conversation created successfully', {
      conversationId: conversation.id,
      userId,
      title: conversation.title,
    });

    return conversation;
  }

  static async getUserConversations(
    userId: string,
    filters: ConversationFilters = {}
  ): Promise<{ conversations: ConversationWithRelations[]; total: number }> {
    const { page = 1, limit = 20, projectId } = filters;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (projectId) {
      where.projectId = projectId;
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        include: {
          user: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Get only the latest message for preview
          },
          project: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.conversation.count({ where }),
    ]);

    return { conversations, total };
  }

  static async getConversation(
    id: string,
    userId: string
  ): Promise<ConversationWithRelations | null> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        user: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        project: true,
      },
    });

    if (!conversation) {
      return null;
    }

    return conversation;
  }

  static async updateConversation(
    id: string,
    userId: string,
    data: UpdateConversationRequest
  ): Promise<Conversation | null> {
    // Check if user owns the conversation
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingConversation) {
      return null;
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('Conversation updated successfully', {
      conversationId: id,
      userId,
      title: updatedConversation.title,
    });

    return updatedConversation;
  }

  static async deleteConversation(
    id: string,
    userId: string
  ): Promise<boolean> {
    // Check if user owns the conversation
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!conversation) {
      return false;
    }

    await prisma.conversation.delete({
      where: { id },
    });

    logger.info('Conversation deleted successfully', {
      conversationId: id,
      userId,
    });

    return true;
  }

  static async sendMessage(
    conversationId: string,
    userId: string,
    data: SendMessageRequest
  ): Promise<{ userMessage: Message; llmResponse?: Message }> {
    // Verify conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        project: true,
      },
    });

    if (!conversation) {
      throw new Error('Conversation not found or access denied');
    }

    // Validate message features if project exists
    if (conversation.project) {
      await this.validateMessageFeatures(conversation.project.id, data);
    }

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        content: data.content,
        messageType: MESSAGE_TYPES.USER,
        conversationId,
        attachments: data.attachments ? (data.attachments as any) : null,
        options: data.options ? (data.options as any) : null,
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    logger.info('User message sent successfully', {
      messageId: userMessage.id,
      conversationId,
      userId,
    });

    // For now, return only the user message
    // LLM response will be handled in Phase 2
    return { userMessage };
  }

  static async getMessages(
    conversationId: string,
    userId: string,
    pagination: PaginationOptions = {},
    messageTypes?: MessageType[]
  ): Promise<{ messages: MessageWithRelations[]; total: number }> {
    // Verify conversation ownership
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

    const where: any = { conversationId };
    if (before) {
      where.createdAt = { lt: before };
    }
    if (messageTypes && messageTypes.length > 0) {
      where.messageType = { in: messageTypes };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          conversation: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return { messages: messages.reverse(), total };
  }

  static async createSystemMessage(
    conversationId: string,
    content: string,
    metadata?: any
  ): Promise<Message> {
    const message = await prisma.message.create({
      data: {
        content,
        messageType: MESSAGE_TYPES.SYSTEM,
        conversationId,
        metadata: metadata ? (metadata as any) : null,
      },
    });

    logger.info('System message created', {
      messageId: message.id,
      conversationId,
      content,
    });

    return message;
  }

  static async createErrorMessage(
    conversationId: string,
    content: string,
    errorCode?: string
  ): Promise<Message> {
    const metadata = errorCode ? { errorCode } : null;
    
    const message = await prisma.message.create({
      data: {
        content,
        messageType: MESSAGE_TYPES.ERROR,
        conversationId,
        metadata: metadata ? (metadata as any) : null,
      },
    });

    logger.info('Error message created', {
      messageId: message.id,
      conversationId,
      content,
      errorCode,
    });

    return message;
  }

  static async validateMessageFeatures(
    projectId: string,
    messageData: SendMessageRequest
  ): Promise<void> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || !project.features) {
      // If no features configured, all optional features are disabled
      if (messageData.attachments?.length) {
        throw new Error('Attachments are not enabled for this project');
      }
      if (messageData.options?.webSearch) {
        throw new Error('Web search is not enabled for this project');
      }
      if (messageData.options?.audio) {
        throw new Error('Audio features are not enabled for this project');
      }
      if (messageData.options?.music) {
        throw new Error('Music features are not enabled for this project');
      }
      return;
    }

    const features = project.features as ProjectFeatures;

    // Validate attachments
    if (messageData.attachments?.length && !features.attachments?.enabled) {
      throw new Error('Attachments are not enabled for this project');
    }

    // Validate web search
    if (messageData.options?.webSearch && !features.webSearch?.enabled) {
      throw new Error('Web search is not enabled for this project');
    }

    // Validate audio features
    if (messageData.options?.audio && !features.audio?.enabled) {
      throw new Error('Audio features are not enabled for this project');
    }

    // Validate music features
    if (messageData.options?.music && !features.music?.enabled) {
      throw new Error('Music features are not enabled for this project');
    }
  }

  static getDefaultFeatures(): ProjectFeatures {
    return {
      attachments: { enabled: false },
      audio: { enabled: false },
      music: { enabled: false },
      webSearch: { enabled: false },
    };
  }
} 