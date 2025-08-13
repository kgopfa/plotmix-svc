import { prisma } from '../clients/database.client';
import { logger } from '../utils/logger';
import { getSystemUserId } from '../utils/system-user';
import {
  CreateProjectWithConversationRequest,
  Message,
  MESSAGE_TYPES,
  ProjectFeatures,
  ProjectConfigurationResponse,
  CreateProjectRequest,
} from '../types';
import { validateElementsArray } from '../schema/elements';
import { assignAnimationIdentifiers } from '../schema/animations';
import { OpenAIGenerationService } from './openai-generation.service';

export class OrchestrationService {
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

      openAIResponse.mainState = this.normalizeAndValidateMainState(openAIResponse.mainState);

      const project = await this.createProjectFromGeneratedResponse(userId, data, openAIResponse);

      const conversationId = await this.createConversationForProject(userId, data, project.id, openAIResponse);

      await this.createConversationMessages(conversationId, data, openAIResponse);

      const user = await this.getUserData(userId);

      logger.info('Project configuration generation completed successfully', {
        projectId: project.id,
        conversationId,
        userId,
        mainStateGenerated: !!openAIResponse.mainState
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
      const openAIResponse = await OpenAIGenerationService.generateScene(data.prompt);

      logger.info('OpenAI processing completed successfully', {
        hasMainState: !!openAIResponse.mainState,
        elementCount: openAIResponse.mainState?.elements?.length || 0,
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
    logger.info('Creating project from validated project configuration', {
      userId,
      hasMainState: !!openAIResponse.mainState,
    });

    try {
      const { ProjectService } = await import('./project.service');

      const projectName = data.name || openAIResponse.name || 'New Project';
      const projectTitle = data.title ?? openAIResponse.title;
      const projectDescription = openAIResponse.description || `${data.prompt.substring(0, 100)}...`;

      // Use normalized mainState (already validated earlier)
      const normalizedMainState = openAIResponse.mainState || { createdAt: new Date().toISOString() };

      const payload: CreateProjectRequest = {
        name: projectName,
        source: 'GENERATED',
        mainState: normalizedMainState,
        features: data.features || this.getDefaultFeatures(),
      };

      if (projectTitle !== undefined) {
        payload.title = projectTitle;
      }
      if (projectDescription !== undefined) {
        payload.description = projectDescription;
      }

      const project = await ProjectService.createProject(userId, payload);

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
        hasMainState: !!openAIResponse.mainState,
      });
      throw error;
    }
  }

  // Centralized schema validation + normalization
  private static normalizeAndValidateMainState(raw: any) {
    logger.info('Validating and normalizing openAI mainState response', {
      raw,
    });

    try {
      const source = raw || {};
      const elementsInput = Array.isArray(source.elements) ? source.elements : [];

      const elemRes = validateElementsArray(elementsInput);
      if (!elemRes.valid || !elemRes.value) {
        throw new Error(`Invalid elements: ${elemRes.errors.join('; ')}`);
      }

      const groupsInput = Array.isArray(source.groups) ? source.groups : [];

      const assigned = assignAnimationIdentifiers(elemRes.value, groupsInput, { recomputeDisplayNames: true });

      return {
        elements: assigned.elements,
        groups: assigned.groups,
        timeline: {
          scale: source.timeline?.scale ?? 1,
          duration: source.timeline?.duration ?? 0,
          currentTime: source.timeline?.currentTime ?? 0,
          animationStates: {},
        },
      };
    } catch (error) {
      logger.error('normalizeAndValidateMainState failed', {
        error: error instanceof Error ? error.message : String(error),
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
          user: {
            select: { id: true, name: true, email: true }
          },
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
    openAIResponse: any
  ) {
    logger.info('Starting conversation messages creation', {
      conversationId,
      hasPrompt: !!data.prompt,
      hasAttachments: !!data.attachments,
      hasOptions: !!data.options,
      hasCanvasResponse: !!openAIResponse,
    });

    try {
      // Get conversation to find the userId
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { userId: true }
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Create user message with the prompt
      logger.info('Adding user message to conversation', { conversationId, promptLength: data.prompt?.length || 0 });

      const userMessage = await prisma.message.create({
        data: {
          content: data.prompt,
          messageType: MESSAGE_TYPES.USER,
          conversationId,
          userId: conversation.userId,
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
      if (openAIResponse.success) {
        const description = `Generated project from prompt: ${data.prompt.substring(0, 200)}...`;
        logger.info('Creating LLM response message', {
          conversationId,
          description
        });

        // Get system user ID for LLM messages
        const systemUserId = await getSystemUserId();

        const llmMessage = await prisma.message.create({
          data: {
            content: description,
            messageType: MESSAGE_TYPES.LLM,
            conversationId,
            userId: systemUserId,
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
      // Get conversation to find the userId
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { userId: true }
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Get system user ID for system messages
      const systemUserId = await getSystemUserId();

      const message = await prisma.message.create({
        data: {
          content,
          messageType: MESSAGE_TYPES.SYSTEM,
          conversationId,
          userId: systemUserId,
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
      // Get conversation to find the userId
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { userId: true }
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const metadata = errorCode ? { errorCode } : null;

      // Get system user ID for error messages
      const systemUserId = await getSystemUserId();

      const message = await prisma.message.create({
        data: {
          content,
          messageType: MESSAGE_TYPES.ERROR,
          conversationId,
          userId: systemUserId,
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