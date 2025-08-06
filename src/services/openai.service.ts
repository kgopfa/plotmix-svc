import OpenAI from 'openai';
import axiosRetry from 'axios-retry';
import { logger } from '../utils/logger';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
}

export interface CanvasGenerationRequest {
  prompt: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  projectFeatures?: {
    attachments?: { enabled: boolean };
    audio?: { enabled: boolean };
    music?: { enabled: boolean };
    webSearch?: { enabled: boolean };
  };
}

export interface CanvasGenerationResponse {
  success: boolean;
  canvasData?: any;
  message?: string;
  error?: string;
}

export class OpenAIService {
  private static instance: OpenAIService;
  private client: OpenAI | null = null;
  private config: OpenAIConfig;

  private constructor() {
    this.config = this.loadConfig();
    
    // Create OpenAI client (will be mocked in tests)
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });

    // Configure retry logic for axios (used by OpenAI SDK) - only in non-test environment
    if (process.env['NODE_ENV'] !== 'test') {
      axiosRetry(this.client as any, {
        retries: 3,
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
          // Retry on network errors and 5xx status codes
          return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
                 Boolean(error.response?.status && error.response.status >= 500 && error.response.status < 600);
        },
      });
    }
  }

  public static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  private loadConfig(): OpenAIConfig {
    // Skip OpenAI initialization in test environment
    if (process.env['NODE_ENV'] === 'test') {
      return {
        apiKey: 'test-api-key',
        model: 'gpt-4-turbo-preview',
        systemPrompt: 'Test system prompt',
      };
    }

    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    return {
      apiKey,
      model: process.env['OPENAI_MODEL'] || 'gpt-4-turbo-preview',
      systemPrompt: process.env['OPENAI_SYSTEM_PROMPT'] || 
        'You are an AI assistant that generates canvas designs for system architecture diagrams. You can create, modify, and enhance visual representations of software systems, infrastructure, and data flows.',
    };
  }

  public async generateResponse(
    prompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
  ): Promise<string> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const messages = [
        { role: 'system' as const, content: this.config.systemPrompt },
        ...conversationHistory,
        { role: 'user' as const, content: prompt }
      ];

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      logger.info('OpenAI response generated successfully', {
        model: this.config!.model,
        promptLength: prompt.length,
        responseLength: content.length,
        usage: response.usage,
      });

      return content;
    } catch (error) {
      logger.error('Error generating OpenAI response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prompt: prompt.substring(0, 100) + '...',
      });
      throw this.handleOpenAIError(error);
    }
  }

  public async generateCanvasData(request: CanvasGenerationRequest): Promise<CanvasGenerationResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const enhancedPrompt = this.buildCanvasPrompt(request);
      
      const messages = [
        { role: 'system' as const, content: this.getCanvasSystemPrompt(request.projectFeatures) },
        ...request.conversationHistory,
        { role: 'user' as const, content: enhancedPrompt }
      ];

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      const canvasData = this.parseCanvasResponse(content);
      
      logger.info('Canvas data generated successfully', {
        model: this.config.model,
        promptLength: request.prompt.length,
        canvasElements: canvasData?.elements?.length || 0,
        usage: response.usage,
      });

      return {
        success: true,
        canvasData,
      };
    } catch (error) {
      logger.error('Error generating canvas data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prompt: request.prompt.substring(0, 100) + '...',
      });

      return {
        success: false,
        error: this.handleOpenAIError(error).message,
      };
    }
  }

  private buildCanvasPrompt(request: CanvasGenerationRequest): string {
    let prompt = `Generate a canvas design based on the following request: ${request.prompt}\n\n`;
    
    if (request.projectFeatures) {
      prompt += 'Available features:\n';
      if (request.projectFeatures.attachments?.enabled) {
        prompt += '- Attachments: enabled\n';
      }
      if (request.projectFeatures.audio?.enabled) {
        prompt += '- Audio: enabled\n';
      }
      if (request.projectFeatures.music?.enabled) {
        prompt += '- Music: enabled\n';
      }
      if (request.projectFeatures.webSearch?.enabled) {
        prompt += '- Web search: enabled\n';
      }
    }

    prompt += '\nPlease respond with a valid JSON object containing the canvas structure.';
    return prompt;
  }

  private getCanvasSystemPrompt(projectFeatures?: any): string {
    let systemPrompt = `You are an AI assistant specialized in generating canvas designs for system architecture diagrams. 

Your response must be a valid JSON object with the following structure:
{
  "elements": [
    {
      "id": "unique-id",
      "type": "rectangle|circle|text|image|line",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "text": "Element text",
      "style": {
        "fill": "#ffffff",
        "stroke": "#000000",
        "strokeWidth": 2,
        "fontSize": 14,
        "fontFamily": "Arial"
      }
    }
  ],
  "connections": [
    {
      "id": "connection-id",
      "from": "element-id-1",
      "to": "element-id-2",
      "type": "line|arrow",
      "style": {
        "stroke": "#000000",
        "strokeWidth": 2
      }
    }
  ],
  "metadata": {
    "title": "Diagram title",
    "description": "Diagram description"
  }
}

Guidelines:
- Use meaningful IDs for elements
- Position elements logically with appropriate spacing
- Use consistent styling
- Include descriptive text for elements
- Create logical connections between related elements`;

    if (projectFeatures) {
      if (projectFeatures.attachments?.enabled) {
        systemPrompt += '\n- You can reference attachments in your design';
      }
      if (projectFeatures.audio?.enabled) {
        systemPrompt += '\n- Audio elements can be included';
      }
      if (projectFeatures.music?.enabled) {
        systemPrompt += '\n- Music elements can be included';
      }
      if (projectFeatures.webSearch?.enabled) {
        systemPrompt += '\n- You can incorporate real-time information from web search';
      }
    }

    return systemPrompt;
  }

  private parseCanvasResponse(content: string): any {
    try {
      const parsed = JSON.parse(content);
      
      // Validate basic structure
      if (!parsed.elements || !Array.isArray(parsed.elements)) {
        throw new Error('Invalid canvas response: missing or invalid elements array');
      }

      // Validate each element has required fields
      for (const element of parsed.elements) {
        if (!element.id || !element.type || typeof element.x !== 'number' || typeof element.y !== 'number') {
          throw new Error('Invalid canvas element: missing required fields');
        }
      }

      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON response from OpenAI');
      }
      throw error;
    }
  }

  private handleOpenAIError(error: any): Error {
    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 401:
          return new Error('OpenAI API key is invalid or expired');
        case 429:
          return new Error('OpenAI rate limit exceeded. Please try again later.');
        case 500:
          return new Error('OpenAI service is temporarily unavailable');
        default:
          return new Error(`OpenAI API error: ${error.message}`);
      }
    }

    if (error instanceof OpenAI.APIConnectionError) {
      return new Error('Failed to connect to OpenAI API. Please check your internet connection.');
    }

    if (error instanceof OpenAI.APIConnectionError) {
      return new Error('OpenAI API request timed out. Please try again.');
    }

    if (error instanceof OpenAI.BadRequestError) {
      return new Error(`Invalid request to OpenAI API: ${error.message}`);
    }

    return new Error(error.message || 'An unexpected error occurred with OpenAI API');
  }

  public getConfig(): OpenAIConfig {
    return { ...this.config };
  }
} 