import { OpenAIService, CanvasGenerationRequest, CanvasGenerationResponse } from './openai.service';
import { prisma } from './prisma.service';
import { logger } from '../utils/logger';
import { MESSAGE_TYPES, MessageType } from '../types';

export interface CanvasGenerationOptions {
  forceCanvasGeneration?: boolean;
  includeHistory?: boolean;
  maxHistoryMessages?: number;
}

export class CanvasGenerationService {
  private static openaiService = OpenAIService.getInstance();

  /**
   * Process a user message and determine if canvas generation is needed
   */
  public static async processUserMessage(
    conversationId: string,
    userId: string,
    userMessage: string,
    options: CanvasGenerationOptions = {}
  ): Promise<{ llmResponse: string; canvasData?: any }> {
    try {
      // Get conversation with project features
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: { project: true },
      });

      if (!conversation) {
        throw new Error('Conversation not found or access denied');
      }

      // Determine if canvas generation is needed
      const shouldGenerateCanvas = this.shouldGenerateCanvas(userMessage, options);

      if (shouldGenerateCanvas) {
        return await this.generateCanvasWithResponse(conversation, userMessage, options);
      } else {
        // Generate regular text response
        const llmResponse = await this.generateTextResponse(conversation, userMessage, options);
        return { llmResponse };
      }
    } catch (error) {
      logger.error('Error processing user message', {
        conversationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Determine if the user message requires canvas generation
   */
  private static shouldGenerateCanvas(userMessage: string, options: CanvasGenerationOptions): boolean {
    if (options.forceCanvasGeneration) {
      return true;
    }

    const canvasKeywords = [
      'create', 'generate', 'design', 'draw', 'build', 'make', 'show me',
      'diagram', 'architecture', 'system', 'flow', 'layout', 'structure',
      'visual', 'canvas', 'chart', 'graph', 'blueprint', 'wireframe'
    ];

    const lowerMessage = userMessage.toLowerCase();
    return canvasKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Generate canvas data with accompanying text response
   */
  private static async generateCanvasWithResponse(
    conversation: any,
    userMessage: string,
    options: CanvasGenerationOptions
  ): Promise<{ llmResponse: string; canvasData?: any }> {
    const conversationHistory = await this.buildConversationHistory(
      conversation.id,
      options.includeHistory ? options.maxHistoryMessages || 10 : 0
    );

    const request: CanvasGenerationRequest = {
      prompt: userMessage,
      conversationHistory,
      projectFeatures: conversation.project?.features || undefined,
    };

    const response = await this.openaiService.generateCanvasData(request);

    if (!response.success || !response.canvasData) {
      // Fallback to text response if canvas generation fails
      const fallbackResponse = await this.generateTextResponse(conversation, userMessage, options);
      return { llmResponse: fallbackResponse, canvasData: undefined };
    }

    // Generate accompanying text response
    const textPrompt = `I've generated a canvas design based on your request: "${userMessage}". Here's what I've created: ${JSON.stringify(response.canvasData.metadata || {})}`;
    const llmResponse = await this.openaiService.generateResponse(textPrompt, conversationHistory);

    return {
      llmResponse,
      canvasData: response.canvasData,
    };
  }

  /**
   * Generate regular text response
   */
  private static async generateTextResponse(
    conversation: any,
    userMessage: string,
    options: CanvasGenerationOptions
  ): Promise<string> {
    const conversationHistory = await this.buildConversationHistory(
      conversation.id,
      options.includeHistory ? options.maxHistoryMessages || 10 : 0
    );

    return await this.openaiService.generateResponse(userMessage, conversationHistory);
  }

  /**
   * Build conversation history for LLM context
   */
  private static async buildConversationHistory(
    conversationId: string,
    maxMessages: number
  ): Promise<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> {
    if (maxMessages <= 0) {
      return [];
    }

    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: maxMessages,
    });

    // Reverse to get chronological order
    return messages.reverse().map(message => ({
      role: this.mapMessageTypeToRole(message.messageType as MessageType),
      content: message.content,
    }));
  }

  /**
   * Map message type to OpenAI role
   */
  private static mapMessageTypeToRole(messageType: MessageType): 'user' | 'assistant' | 'system' {
    switch (messageType) {
      case MESSAGE_TYPES.USER:
        return 'user';
      case MESSAGE_TYPES.LLM:
      case MESSAGE_TYPES.CANVAS_GENERATION:
        return 'assistant';
      case MESSAGE_TYPES.SYSTEM:
        return 'system';
      default:
        return 'assistant';
    }
  }

  /**
   * Generate canvas data for a specific prompt
   */
  public static async generateCanvasData(
    conversationId: string,
    userId: string,
    prompt: string,
    options: CanvasGenerationOptions = {}
  ): Promise<CanvasGenerationResponse> {
    try {
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: { project: true },
      });

      if (!conversation) {
        return {
          success: false,
          error: 'Conversation not found or access denied',
        };
      }

      const conversationHistory = await this.buildConversationHistory(
        conversationId,
        options.includeHistory ? options.maxHistoryMessages || 10 : 0
      );

      const request: CanvasGenerationRequest = {
        prompt,
        conversationHistory,
        projectFeatures: conversation.project?.features as any || undefined,
      };

      return await this.openaiService.generateCanvasData(request);
    } catch (error) {
      logger.error('Error generating canvas data', {
        conversationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      };
    }
  }

  /**
   * Validate canvas data structure
   */
  public static validateCanvasData(canvasData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!canvasData) {
      errors.push('Canvas data is required');
      return { isValid: false, errors };
    }

    if (!canvasData.elements || !Array.isArray(canvasData.elements)) {
      errors.push('Canvas data must contain an elements array');
    } else {
      // Validate each element
      canvasData.elements.forEach((element: any, index: number) => {
        if (!element.id) {
          errors.push(`Element ${index}: missing id`);
        }
        if (!element.type) {
          errors.push(`Element ${index}: missing type`);
        }
        if (typeof element.x !== 'number') {
          errors.push(`Element ${index}: x must be a number`);
        }
        if (typeof element.y !== 'number') {
          errors.push(`Element ${index}: y must be a number`);
        }
      });
    }

    // Validate connections if present
    if (canvasData.connections && Array.isArray(canvasData.connections)) {
      canvasData.connections.forEach((connection: any, index: number) => {
        if (!connection.id) {
          errors.push(`Connection ${index}: missing id`);
        }
        if (!connection.from) {
          errors.push(`Connection ${index}: missing from element`);
        }
        if (!connection.to) {
          errors.push(`Connection ${index}: missing to element`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get canvas generation statistics
   */
  public static async getGenerationStats(conversationId: string): Promise<{
    totalGenerations: number;
    successfulGenerations: number;
    failedGenerations: number;
    lastGeneration?: Date;
  }> {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        messageType: MESSAGE_TYPES.CANVAS_GENERATION,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalGenerations = messages.length;
    const successfulGenerations = messages.filter(msg => 
      msg.metadata && typeof msg.metadata === 'object' && 'success' in msg.metadata && (msg.metadata as any)['success']
    ).length;
    const failedGenerations = totalGenerations - successfulGenerations;
    const lastGeneration = messages.length > 0 ? messages[0]?.createdAt : undefined;

    return {
      totalGenerations,
      successfulGenerations,
      failedGenerations,
      ...(lastGeneration && { lastGeneration }),
    };
  }
} 