import { prisma } from '../clients/database.client';
import { logger } from '../utils/logger';
import {
  ConversationWithRelations,
  CreateProjectWithConversationRequest,
  Message,
  MESSAGE_TYPES,
  ProjectFeatures,
} from '../types';

export class ContentGenService {
  static async generateProjectConfiguration(
    userId: string,
    data: CreateProjectWithConversationRequest
  ): Promise<{
    project: any;
    conversation: ConversationWithRelations;
    messages: Message[];
  }> {
    // Step 1: Send prompt to OpenAI first
    const canvasResponse = await this.processPromptWithOpenAI(data);

    // Step 2: Create project with the generated canvas data
    const project = await this.createProjectFromCanvasResponse(userId, data, canvasResponse);

    // Step 3: Create conversation linked to the project
    const conversation = await this.createConversationForProject(userId, data, project.id, canvasResponse);

    // Step 4: Create all messages
    const messages = await this.createConversationMessages(conversation.id, data, canvasResponse);

    // Step 5: Update conversation timestamp
    await this.updateConversationTimestamp(conversation.id);

    logger.info('Project and conversation created successfully', {
      projectId: project.id,
      conversationId: conversation.id,
      userId,
      messageCount: messages.length,
      canvasGenerated: !!canvasResponse.canvasData,
    });

    return {
      project,
      conversation,
      messages,
    };
  }

  private static async processPromptWithOpenAI(data: CreateProjectWithConversationRequest) {
    const { OpenAIClient } = await import('../clients/openai.client');
    const openAIClient = OpenAIClient.getInstance();
    
    const canvasRequest = {
      prompt: data.prompt,
      conversationHistory: [], // No history for first message
      projectFeatures: data.features || this.getDefaultFeatures(),
    };

    const canvasResponse = await openAIClient.generateCanvasData(canvasRequest);

    // If OpenAI processing fails, throw an error - don't create project
    if (!canvasResponse.success) {
      throw new Error(canvasResponse.error || 'Failed to process prompt with AI');
    }

    return canvasResponse;
  }

  private static async createProjectFromCanvasResponse(
    userId: string,
    data: CreateProjectWithConversationRequest,
    canvasResponse: any
  ) {
    const { ProjectService } = await import('./project.service');
    
    // Extract title and description from OpenAI response metadata
    const projectTitle = canvasResponse.canvasData?.metadata?.title || data.title || 'New Project';
    const projectDescription = canvasResponse.canvasData?.metadata?.description || 
      `Project created from prompt: ${data.prompt.substring(0, 100)}...`;
    
    return await ProjectService.createProject(userId, {
      name: projectTitle,
      mainState: canvasResponse.canvasData || {
        description: projectDescription,
        createdAt: new Date().toISOString(),
        source: 'conversation',
      },
      features: data.features || this.getDefaultFeatures(),
    });
  }

  private static async createConversationForProject(
    userId: string,
    data: CreateProjectWithConversationRequest,
    projectId: string,
    canvasResponse?: any
  ): Promise<ConversationWithRelations> {
    // Use title from OpenAI response metadata if available
    const conversationTitle = canvasResponse?.canvasData?.metadata?.title || data.title || 'New Conversation';
    
    return await prisma.conversation.create({
      data: {
        title: conversationTitle,
        userId,
        projectId,
      },
      include: {
        user: true,
        messages: true,
        project: true,
      },
    });
  }

  private static async createConversationMessages(
    conversationId: string,
    data: CreateProjectWithConversationRequest,
    canvasResponse: any
  ): Promise<Message[]> {
    const messages: Message[] = [];

    // Create system message
    const systemMessage = await this.createSystemMessage(conversationId, 'Conversation started');
    messages.push(systemMessage);

    // Create user message with the prompt
    const userMessage = await prisma.message.create({
      data: {
        content: data.prompt,
        messageType: MESSAGE_TYPES.USER,
        conversationId,
        attachments: data.attachments ? (data.attachments as any) : null,
        options: data.options ? (data.options as any) : null,
      },
    });
    messages.push(userMessage);

    // Create LLM response message
    if (canvasResponse.message) {
      const llmMessage = await prisma.message.create({
        data: {
          content: canvasResponse.message,
          messageType: MESSAGE_TYPES.LLM,
          conversationId,
        },
      });
      messages.push(llmMessage);
    }

    // Create canvas generation message
    if (canvasResponse.canvasData) {
      const canvasMessage = await prisma.message.create({
        data: {
          content: JSON.stringify(canvasResponse.canvasData),
          messageType: MESSAGE_TYPES.CANVAS_GENERATION,
          conversationId,
          metadata: {
            success: true,
            elementCount: canvasResponse.canvasData.elements?.length || 0,
            connectionCount: canvasResponse.canvasData.connections?.length || 0,
          },
        },
      });
      messages.push(canvasMessage);
    }

    return messages;
  }

  private static async updateConversationTimestamp(conversationId: string): Promise<void> {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
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

  static getDefaultFeatures(): ProjectFeatures {
    return {
      attachments: { enabled: false },
      audio: { enabled: false },
      music: { enabled: false },
      webSearch: { enabled: false },
    };
  }
} 