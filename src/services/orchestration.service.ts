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
// Validation has been moved to the pipeline's final step. The orchestrator now trusts pipeline output.
import { PipelineGenerationService } from './pipeline-generation.service';

export class OrchestrationService {
  static async generateProjectConfiguration(
    userId: string,
    data: CreateProjectWithConversationRequest
  ): Promise<ProjectConfigurationResponse> {
    logger.info('Starting project configuration generation with chained pipeline', {
      userId,
      promptLength: data.prompt?.length || 0,
      hasFeatures: !!data.features,
      hasAttachments: !!data.attachments,
      hasOptions: !!data.options,
    });

    try {
      // Use the chained generation pipeline directly
      const pipelineResponse = await this.processPrompt(data);

      pipelineResponse.mainState = this.normalizeAndValidateMainState(pipelineResponse.mainState);

      const project = await this.createProjectFromGeneratedResponse(userId, data, pipelineResponse);

      const conversationId = await this.createConversationForProject(userId, data, project.id, pipelineResponse);

      await this.createConversationMessages(conversationId, data, pipelineResponse);

      const user = await this.getUserData(userId);

      logger.info('Project configuration generation completed successfully', {
        projectId: project.id,
        conversationId,
        userId,
        mainStateGenerated: !!pipelineResponse.mainState,
        pipelineUsed: true,
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

  private static async processPrompt(data: CreateProjectWithConversationRequest) {
    logger.info('Starting prompt processing with chained generation pipeline', {
      promptLength: data.prompt?.length || 0,
      hasFeatures: !!data.features,
    });

    try {
      const pipelineResponse = await PipelineGenerationService.generateScene(data.prompt);

      logger.info('Prompt processing completed successfully', {
        hasMainState: !!pipelineResponse.mainState,
        elementCount: pipelineResponse.mainState?.scenes?.[0]?.sceneCanvas?.elements?.length || 0,
      });

      return pipelineResponse;
    } catch (error) {
      logger.error('Pipeline prompt processing failed', {
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

  // Centralized normalization only (validation moved to pipeline)
  private static normalizeAndValidateMainState(raw: any) {
    logger.info('Validating and normalizing mainState response', {
      hasScenes: !!raw.scenes,
      hasDimensions: !!raw.dimensions,
      rawType: typeof raw,
    });

    try {
      // Handle new pipeline structure (with dimensions and scenes)
      if (raw.dimensions && raw.scenes && Array.isArray(raw.scenes) && raw.scenes.length > 0) {
        logger.info('Processing new pipeline structure with dimensions and scenes');
        
        // Validate the structure
        if (!raw.scenes[0]?.sceneCanvas) {
          throw new Error('Invalid schema: missing sceneCanvas in first scene');
        }

        const source = raw.scenes[0].sceneCanvas;

        // Return the validated structure
        return {
          dimensions: raw.dimensions,
          scenes: [{
            ...raw.scenes[0],
            sceneCanvas: {
              elements: Array.isArray(source.elements) ? source.elements : [],
              groups: Array.isArray(source.groups) ? source.groups : [],
              timeline: {
                scale: source.timeline?.scale ?? 1,
                duration: source.timeline?.duration ?? 3,
                currentTime: source.timeline?.currentTime ?? 0,
                animationStates: source.timeline?.animationStates ?? {},
              },
            },
          }],
        };
      }
      
      // Handle legacy structure (just scenes array) - convert to new structure
      if (raw.scenes && Array.isArray(raw.scenes) && raw.scenes.length > 0) {
        logger.info('Processing legacy structure with scenes array - converting to new structure');
        
        if (!raw.scenes[0] || !raw.scenes[0].sceneCanvas) {
          throw new Error('Invalid schema: missing first scene or sceneCanvas');
        }

        const source = raw.scenes[0].sceneCanvas;

        // Convert legacy structure to new structure
        return {
          dimensions: {
            width: 1920,
            height: 1080
          },
          scenes: [{
            sceneId: raw.scenes[0].sceneId || 'default-scene',
            sceneName: raw.scenes[0].sceneName || 'Default Scene',
            sceneCanvas: {
              elements: Array.isArray(source.elements) ? source.elements : [],
              groups: Array.isArray(source.groups) ? source.groups : [],
              timeline: {
                scale: source.timeline?.scale ?? 1,
                duration: source.timeline?.duration ?? 3,
                currentTime: source.timeline?.currentTime ?? 0,
                animationStates: source.timeline?.animationStates ?? {},
              },
            },
          }],
        };
      }

      throw new Error('Invalid mainState format: missing scenes array or dimensions');
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