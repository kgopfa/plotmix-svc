import { prisma } from '../clients/database.client';
import { logger } from '../utils/logger';
import {
  CreateProjectWithConversationRequest,
  Message,
  MESSAGE_TYPES,
  ProjectFeatures,
  ProjectConfigurationResponse,
} from '../types';

export class ContentGenService {
  static async generateProjectConfiguration(
    userId: string,
    data: CreateProjectWithConversationRequest
  ): Promise<ProjectConfigurationResponse> {
    logger.info('Starting project configuration generation', {
      userId,
      promptLength: data.prompt?.length || 0,
      hasFeatures: !!data.features,
      hasAttachments: !!data.attachments,
      hasOptions: !!data.options,
    });

    try {
      const openAIResponse = await this.processPromptWithOpenAI(data);
      
      const project = await this.createProjectFromGeneratedResponse(userId, data, openAIResponse);

      const conversationId = await this.createConversationForProject(userId, data, project.id, openAIResponse);
      
      await this.createConversationMessages(conversationId, data, openAIResponse);

      const user = await this.getUserData(userId);

      logger.info('Project configuration generation completed successfully', { 
        projectId: project.id, 
        conversationId, 
        userId, 
        canvasGenerated: !!openAIResponse.canvasData 
      });

      return {
        project,
        conversationId,
        user,
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

      const openAIResponse = await openAIClient.generateProjectData(canvasRequest);

      // If OpenAI processing fails, throw an error - don't create project
      if (!openAIResponse.success) {
        logger.error('OpenAI processing failed', {
          error: openAIResponse.error,
          promptLength: data.prompt?.length || 0,
        });
        throw new Error(openAIResponse.error || 'Failed to process prompt with AI');
      }

      logger.info('OpenAI processing completed successfully', {
        hasCanvasData: !!openAIResponse.canvasData,
        hasMessage: !!openAIResponse.message,
        elementCount: openAIResponse.canvasData?.elements?.length || 0,
        connectionCount: openAIResponse.canvasData?.connections?.length || 0,
      });

      return openAIResponse;
    } catch (error) {
      logger.error('OpenAI prompt processing failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        promptLength: data.prompt?.length || 0,
      });
      throw error;
    }
  }

  private static async createProjectFromGeneratedResponse(
    userId: string,
    data: CreateProjectWithConversationRequest,
    openAIResponse: any
  ) {
    logger.info('Creating project with generated configuration', {
      userId,
      hasCanvasData: !!openAIResponse.canvasData,
      hasMetadata: !!openAIResponse.canvasData?.metadata,
    });

    try {
      const { ProjectService } = await import('./project.service');
      
      // Extract title and description from OpenAI response metadata
      const projectName = openAIResponse.canvasData?.metadata?.name || data.name || 'New Project';
      const projectTitle = openAIResponse.canvasData?.metadata?.title || data.title;
      const projectDescription = openAIResponse.canvasData?.metadata?.description || 
        `Project created from prompt: ${data.prompt.substring(0, 100)}...`;

      const project = await ProjectService.createProject(userId, {
        name: projectName,
        title: projectTitle,
        description: projectDescription,
        source: 'GENERATED',
        mainState: openAIResponse.canvasData || {
          createdAt: new Date().toISOString(),
        },
        features: data.features || this.getDefaultFeatures(),
      });

      logger.info('Project created successfully', {
        userId,
        projectId: project.id,
        projectName: project.name,
        projectTitle: project.title,
        hasMainState: !!project.mainState,
      });

      return project;
    } catch (error) {
      logger.error('Project creation from openAI response failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        hasCanvasData: !!openAIResponse.canvasData,
      });
      throw error;
    }
  }

  private static async createConversationForProject(
    userId: string,
    data: CreateProjectWithConversationRequest,
    projectId: string,
    canvasResponse?: any
  ): Promise<string> {
    logger.info('Starting conversation creation for project', {
      userId,
      projectId,
      hasCanvasResponse: !!canvasResponse,
      hasTitle: !!data.title,
    });

    try {
      const conversation = await prisma.conversation.create({
        data: {
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
        hasUser: !!conversation.user,
        hasProject: !!conversation.project,
        messageCount: conversation.messages.length,
      });

      return conversation.id;
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
  ) {
    logger.info('Starting conversation messages creation', {
      conversationId,
      hasPrompt: !!data.prompt,
      hasAttachments: !!data.attachments,
      hasOptions: !!data.options,
      hasCanvasResponse: !!canvasResponse,
    });

    try {
      // Create user message with the prompt
      logger.info('Adding user message to conversation', { conversationId, promptLength: data.prompt?.length || 0 });
      
      const userMessage = await prisma.message.create({
        data: {
          content: data.prompt,
          messageType: MESSAGE_TYPES.USER,
          conversationId,
          attachments: data.attachments ? (data.attachments as any) : null,
          options: data.options ? (data.options as any) : null,
        },
      });
      
      logger.info('User message added to conversation', {
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
        logger.info('LLM response message added to conversation', {
          conversationId,
          messageId: llmMessage.id,
          messageType: llmMessage.messageType,
        });
      } else {
        logger.info('Skipping LLM response message - no message in canvas response', { conversationId });
      }
    } catch (error) {
      logger.error('Conversation messages creation failed', {
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

  private static async getUserData(userId: string) {
    logger.info('Fetching user data', { userId });

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        logger.error('User not found', { userId });
        throw new Error('User not found');
      }

      logger.info('User data fetched successfully', { userId, userName: user.name });

      return user;
    } catch (error) {
      logger.error('Failed to fetch user data', {
        userId,
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