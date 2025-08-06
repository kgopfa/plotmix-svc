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
    logger.info('Starting project configuration generation', {
      userId,
      promptLength: data.prompt?.length || 0,
      hasFeatures: !!data.features,
      hasAttachments: !!data.attachments,
      hasOptions: !!data.options,
    });

    try {
      const canvasResponse = await this.processPromptWithOpenAI(data);
      logger.info('Received response from OpenAI', { canvasResponse });
      
      const project = await this.createProjectFromCanvasResponse(userId, data, canvasResponse);
      logger.info('Project created successfully', { projectId: project.id, projectName: project.name });

      const conversation = await this.createConversationForProject(userId, data, project.id, canvasResponse);
      logger.info('Conversation created successfully', { conversationId: conversation.id, conversationTitle: conversation.title });

      const messages = await this.createConversationMessages(conversation.id, data, canvasResponse);
      logger.info('Messages created successfully', { conversationId: conversation.id, messageCount: messages.length });

      await this.updateConversationTimestamp(conversation.id);
      logger.info('Conversation timestamp updated', { conversationId: conversation.id });

      logger.info('Project and conversation creation completed successfully', { projectId: project.id, conversationId: conversation.id, userId, messageCount: messages.length, canvasGenerated: !!canvasResponse.canvasData });

      return {
        project,
        conversation,
        messages,
      };
    } catch (error) {
      logger.error('Project configuration generation failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        step: 'generateProjectConfiguration',
      });
      throw error;
    }
  }

  private static async processPromptWithOpenAI(data: CreateProjectWithConversationRequest) {
    logger.info('Starting OpenAI prompt processing', {
      promptLength: data.prompt?.length || 0,
      hasFeatures: !!data.features,
    });

    try {
      const { OpenAIClient } = await import('../clients/openai.client');
      const openAIClient = OpenAIClient.getInstance();
      
      const canvasRequest = {
        prompt: data.prompt,
        conversationHistory: [], // No history for first message
        projectFeatures: data.features || this.getDefaultFeatures(),
      };

      logger.info('Sending request to OpenAI', {
        promptLength: canvasRequest.prompt?.length || 0,
        hasFeatures: !!canvasRequest.projectFeatures,
      });

      const canvasResponse = await openAIClient.generateCanvasData(canvasRequest);

      // TEMPORARY: Log full response for debugging
      logger.info('OpenAI response received', {
        success: canvasResponse.success,
        hasCanvasData: !!canvasResponse.canvasData,
        hasMessage: !!canvasResponse.message,
        error: canvasResponse.error || null,
        fullResponse: JSON.stringify(canvasResponse, null, 2),
      });

      // If OpenAI processing fails, throw an error - don't create project
      if (!canvasResponse.success) {
        logger.error('OpenAI processing failed', {
          error: canvasResponse.error,
          promptLength: data.prompt?.length || 0,
        });
        throw new Error(canvasResponse.error || 'Failed to process prompt with AI');
      }

      logger.info('OpenAI processing completed successfully', {
        hasCanvasData: !!canvasResponse.canvasData,
        hasMessage: !!canvasResponse.message,
        elementCount: canvasResponse.canvasData?.elements?.length || 0,
        connectionCount: canvasResponse.canvasData?.connections?.length || 0,
      });

      return canvasResponse;
    } catch (error) {
      logger.error('OpenAI prompt processing failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        promptLength: data.prompt?.length || 0,
      });
      throw error;
    }
  }

  private static async createProjectFromCanvasResponse(
    userId: string,
    data: CreateProjectWithConversationRequest,
    canvasResponse: any
  ) {
    logger.info('Starting project creation from canvas response', {
      userId,
      hasCanvasData: !!canvasResponse.canvasData,
      hasMetadata: !!canvasResponse.canvasData?.metadata,
    });

    try {
      const { ProjectService } = await import('./project.service');
      
      // Extract title and description from OpenAI response metadata
      const projectTitle = canvasResponse.canvasData?.metadata?.title || data.title || 'New Project';
      const projectDescription = canvasResponse.canvasData?.metadata?.description || 
        `Project created from prompt: ${data.prompt.substring(0, 100)}...`;
      
      logger.info('Creating project with extracted data', {
        userId,
        projectTitle,
        projectDescriptionLength: projectDescription.length,
        hasFeatures: !!data.features,
      });

      const project = await ProjectService.createProject(userId, {
        name: projectTitle,
        mainState: canvasResponse.canvasData || {
          description: projectDescription,
          createdAt: new Date().toISOString(),
          source: 'conversation',
        },
        features: data.features || this.getDefaultFeatures(),
      });

      logger.info('Project created successfully', {
        userId,
        projectId: project.id,
        projectName: project.name,
        hasMainState: !!project.mainState,
      });

      return project;
    } catch (error) {
      logger.error('Project creation from canvas response failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        hasCanvasData: !!canvasResponse.canvasData,
      });
      throw error;
    }
  }

  private static async createConversationForProject(
    userId: string,
    data: CreateProjectWithConversationRequest,
    projectId: string,
    canvasResponse?: any
  ): Promise<ConversationWithRelations> {
    logger.info('Starting conversation creation for project', {
      userId,
      projectId,
      hasCanvasResponse: !!canvasResponse,
      hasTitle: !!data.title,
    });

    try {
      // Use title from OpenAI response metadata if available
      const conversationTitle = canvasResponse?.canvasData?.metadata?.title || data.title || 'New Conversation';
      
      logger.info('Creating conversation with title', {
        userId,
        projectId,
        conversationTitle,
      });

      const conversation = await prisma.conversation.create({
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

      logger.info('Conversation created successfully', {
        userId,
        projectId,
        conversationId: conversation.id,
        conversationTitle: conversation.title,
        hasUser: !!conversation.user,
        hasProject: !!conversation.project,
        messageCount: conversation.messages.length,
      });

      return conversation;
    } catch (error) {
      logger.error('Conversation creation for project failed', {
        userId,
        projectId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private static async createConversationMessages(
    conversationId: string,
    data: CreateProjectWithConversationRequest,
    canvasResponse: any
  ): Promise<Message[]> {
    logger.info('Starting conversation messages creation', {
      conversationId,
      hasPrompt: !!data.prompt,
      hasAttachments: !!data.attachments,
      hasOptions: !!data.options,
      hasCanvasResponse: !!canvasResponse,
    });

    try {
      const messages: Message[] = [];

      // Create system message
      logger.info('Creating system message', { conversationId });
      const systemMessage = await this.createSystemMessage(conversationId, 'Conversation started');
      messages.push(systemMessage);
      logger.info('System message created', {
        conversationId,
        messageId: systemMessage.id,
        messageType: systemMessage.messageType,
      });

      // Create user message with the prompt
      logger.info('Creating user message', { conversationId, promptLength: data.prompt?.length || 0 });
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
      logger.info('User message created', {
        conversationId,
        messageId: userMessage.id,
        messageType: userMessage.messageType,
        hasAttachments: !!data.attachments,
        hasOptions: !!data.options,
      });

      // Create LLM response message
      if (canvasResponse.message) {
        logger.info('Creating LLM response message', { conversationId, messageLength: canvasResponse.message.length });
        const llmMessage = await prisma.message.create({
          data: {
            content: canvasResponse.message,
            messageType: MESSAGE_TYPES.LLM,
            conversationId,
          },
        });
        messages.push(llmMessage);
        logger.info('LLM response message created', {
          conversationId,
          messageId: llmMessage.id,
          messageType: llmMessage.messageType,
        });
      } else {
        logger.info('Skipping LLM response message - no message in canvas response', { conversationId });
      }

      // Create canvas generation message
      if (canvasResponse.canvasData) {
        logger.info('Creating canvas generation message', {
          conversationId,
          hasElements: !!canvasResponse.canvasData.elements,
          hasConnections: !!canvasResponse.canvasData.connections,
        });
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
        logger.info('Canvas generation message created', {
          conversationId,
          messageId: canvasMessage.id,
          messageType: canvasMessage.messageType,
          elementCount: canvasResponse.canvasData.elements?.length || 0,
          connectionCount: canvasResponse.canvasData.connections?.length || 0,
        });
      } else {
        logger.info('Skipping canvas generation message - no canvas data in response', { conversationId });
      }

      logger.info('All conversation messages created successfully', {
        conversationId,
        totalMessages: messages.length,
        messageTypes: messages.map(m => m.messageType),
      });

      return messages;
    } catch (error) {
      logger.error('Conversation messages creation failed', {
        conversationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private static async updateConversationTimestamp(conversationId: string): Promise<void> {
    logger.info('Updating conversation timestamp', { conversationId });

    try {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      logger.info('Conversation timestamp updated successfully', { conversationId });
    } catch (error) {
      logger.error('Failed to update conversation timestamp', {
        conversationId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  static async createSystemMessage(
    conversationId: string,
    content: string,
    metadata?: any
  ): Promise<Message> {
    logger.info('Creating system message', {
      conversationId,
      contentLength: content.length,
      hasMetadata: !!metadata,
    });

    try {
      const message = await prisma.message.create({
        data: {
          content,
          messageType: MESSAGE_TYPES.SYSTEM,
          conversationId,
          metadata: metadata ? (metadata as any) : null,
        },
      });

      logger.info('System message created successfully', {
        messageId: message.id,
        conversationId,
        contentLength: content.length,
        hasMetadata: !!metadata,
      });

      return message;
    } catch (error) {
      logger.error('Failed to create system message', {
        conversationId,
        contentLength: content.length,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  static async createErrorMessage(
    conversationId: string,
    content: string,
    errorCode?: string
  ): Promise<Message> {
    logger.info('Creating error message', {
      conversationId,
      contentLength: content.length,
      errorCode: errorCode || 'unknown',
    });

    try {
      const metadata = errorCode ? { errorCode } : null;
      
      const message = await prisma.message.create({
        data: {
          content,
          messageType: MESSAGE_TYPES.ERROR,
          conversationId,
          metadata: metadata ? (metadata as any) : null,
        },
      });

      logger.info('Error message created successfully', {
        messageId: message.id,
        conversationId,
        contentLength: content.length,
        errorCode: errorCode || 'unknown',
      });

      return message;
    } catch (error) {
      logger.error('Failed to create error message', {
        conversationId,
        contentLength: content.length,
        errorCode: errorCode || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  static getDefaultFeatures(): ProjectFeatures {
    logger.debug('Getting default project features');
    return {
      attachments: { enabled: false },
      audio: { enabled: false },
      music: { enabled: false },
      webSearch: { enabled: false },
    };
  }
} 