import OpenAI from 'openai';
import { logger } from '../utils/logger';

export interface OpenAIConfig {
  apiKey: string;
  model: string;
}

export interface MainStateGenerationRequest {
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

export interface MainStateGenerationResponse {
  success: boolean;
  mainState?: any;
  message?: string;
  error?: string;
}

export class OpenAIClient {
  private static instance: OpenAIClient;
  private client: OpenAI | null = null;
  private config: OpenAIConfig;

  private constructor() {
    this.config = this.loadConfig();
    
    // Create OpenAI client (will be mocked in tests)
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  public static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }

  private loadConfig(): OpenAIConfig {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const model = process.env['OPENAI_MODEL'];
    if (!model) {
      throw new Error('OPENAI_MODEL environment variable is required');
    }

    return {
      apiKey,
      model,
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
        { role: 'system' as const, content: 'You are a helpful assistant.' },
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

  public async generateMainState(request: MainStateGenerationRequest): Promise<MainStateGenerationResponse> {
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

      const mainState = this.parseMainStateResponse(content);
      
      // Log the received mainState for debugging/inspection
      try {
        logger.info('OpenAI mainState received', {
          elementsCount: Array.isArray(mainState?.elements) ? mainState.elements.length : 0,
          groupsCount: Array.isArray(mainState?.groups) ? mainState.groups.length : 0,
          timelineKeys: mainState?.timeline ? Object.keys(mainState.timeline?.animationStates || {}).length : 0,
          mainState,
        });
      } catch {}

      logger.info('Canvas data generated successfully', {
        model: this.config.model,
        promptLength: request.prompt.length,
        canvasElements: mainState?.elements?.length || 0,
        usage: response.usage,
      });

      return {
        success: true,
        mainState,
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

  private buildCanvasPrompt(request: MainStateGenerationRequest): string {
    let prompt = `Generate a project mainState for our design canvas based on the following request: ${request.prompt}\n\n`;
    
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

    prompt += '\nRespond ONLY with a valid JSON object representing mainState (no prose).';
    return prompt;
  }

  private getCanvasSystemPrompt(projectFeatures?: any): string {
    let systemPrompt = `You generate JSON for a design canvas mainState used by a renderer. Output must be a single JSON object with this shape:
{
  "elements": [
    {
      "id": "string",
      "name": "string",
      "type": "rectangle|circle|triangle|arc|line|path|image|text",
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 100,
      "fill": "#ffffff",
      "stroke": "#000000",
      "strokeWidth": 1,
      "pivotX": 0,
      "pivotY": 0,
      "opacity": 1,
      "visible": true,
      "zIndex": 1,
      "groupId": "optional-group-id",
      "isAnimationPath": false,
      // Optional shape-specific fields
      "cornerRadius": 0,
      "rotation": 0,
      "lineOptions": { "points": { "start": {"x":0,"y":0}, "end": {"x":100,"y":0} }, "arrow": false, "dotted": false },
      "pathPoints": [ { "x": 0, "y": 0 }, { "x": 100, "y": 0 } ],
      // Text-specific (when type === "text")
      "text": "",
      "fontSize": 16,
      "fontFamily": "Inter",
      // Animations attached to this element
      "animations": [
        {
          "id": "string",
          "displayName": "move-1",
          "type": "move|rotate|scale|fade|color|path|typewriter|textScale|physics",
          "startTime": 0,
          "duration": 1,
          "properties": { "x": 0, "y": 0 },
          "easing": "power1.inOut",
          "repeat": 0,
          "repeatDelay": 0,
          "yoyo": false
        }
      ]
    }
  ],
  "groups": [
    {
      "id": "string",
      "name": "string",
      "elementIds": ["element-id"],
      "x": 0,
      "y": 0,
      "rotation": 0,
      "visible": true,
      "opacity": 1,
      "type": "text|custom|polygon",
      "isDefaultGroup": false,
      "isAnimationPath": false,
      "animations": [ /* same animation schema as elements */ ]
    }
  ],
  "timeline": {
    "scale": 1,
    "duration": 2,
    "currentTime": 0,
    "animationStates": {
      "<animation-id>": {
        "baseDuration": 2,
        "effectiveDuration": 2,
        "effectiveEndTime": 2,
        "repeat": 0,
        "repeatDelay": 0,
        "yoyo": false
      }
    }
  }
}

Rules:
- Return only JSON (no markdown, no prose).
- Follow the field names and types exactly. Do not include unknown fields like connections or metadata.
- Use valid color strings (e.g., "#RRGGBB").
- Canvas dimensions are Full HD: width 1920, height 1080. The logical origin (0,0) is the center of the canvas; place elements relative to the center unless the prompt implies a layout.
- Prefer simple coordinates centered around (0,0) unless the prompt implies otherwise.`;

    if (projectFeatures) {
      if (projectFeatures.attachments?.enabled) {
        systemPrompt += '\n- Attachments may inform element or text content, but do not add attachment objects.';
      }
      if (projectFeatures.audio?.enabled) {
        systemPrompt += '\n- Ignore audio generation; mainState has no audio objects.';
      }
      if (projectFeatures.music?.enabled) {
        systemPrompt += '\n- Ignore music generation; mainState has no music objects.';
      }
      if (projectFeatures.webSearch?.enabled) {
        systemPrompt += '\n- You may use web knowledge for layout ideas, but output remains strictly the mainState JSON.';
      }
    }

    return systemPrompt;
  }

  private parseMainStateResponse(content: string): any {
    try {
      const parsed = JSON.parse(content);

      // Allow either direct mainState object or wrapper { mainState }
      const mainStateCandidate = parsed.mainState ?? parsed;

      // Validate basic structure
      if (!mainStateCandidate.elements || !Array.isArray(mainStateCandidate.elements)) {
        throw new Error('Invalid mainState: missing or invalid elements array');
      }

      // Validate each element has required fields
      for (const element of mainStateCandidate.elements) {
        if (!element.id || !element.type || typeof element.x !== 'number' || typeof element.y !== 'number') {
          throw new Error('Invalid element: missing required fields');
        }
        if (!('animations' in element)) {
          element.animations = [];
        }
      }

      // Ensure groups and timeline exist
      if (!Array.isArray(mainStateCandidate.groups)) {
        mainStateCandidate.groups = [];
      }
      if (!mainStateCandidate.timeline || typeof mainStateCandidate.timeline !== 'object') {
        mainStateCandidate.timeline = {
          scale: 1,
          duration: 0,
          currentTime: 0,
          animationStates: {},
        };
      }

      return mainStateCandidate;
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