import { OpenAIService, CanvasGenerationRequest } from '../../services/openai.service';
import OpenAI from 'openai';

// Mock the OpenAI module
jest.mock('openai');
jest.mock('axios-retry');

describe('OpenAIService', () => {
  let mockOpenAIClient: any;
  let openAIService: OpenAIService;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset the singleton instance
    (OpenAIService as any).instance = undefined;
    
    // Create mock OpenAI client with proper jest mocks
    mockOpenAIClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    // Mock the OpenAI constructor
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAIClient);

    // Mock environment variables
    process.env['OPENAI_API_KEY'] = 'test-api-key';
    process.env['OPENAI_MODEL'] = 'gpt-4-turbo-preview';
    process.env['OPENAI_MAX_TOKENS'] = '4000';
    process.env['OPENAI_TEMPERATURE'] = '0.7';
    process.env['OPENAI_SYSTEM_PROMPT'] = 'Test system prompt';

    // Get service instance
    openAIService = OpenAIService.getInstance();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env['OPENAI_API_KEY'];
    delete process.env['OPENAI_MODEL'];
    delete process.env['OPENAI_MAX_TOKENS'];
    delete process.env['OPENAI_TEMPERATURE'];
    delete process.env['OPENAI_SYSTEM_PROMPT'];
  });

  describe('getInstance', () => {
    it('should return the same instance (singleton pattern)', () => {
      const instance1 = OpenAIService.getInstance();
      const instance2 = OpenAIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateResponse', () => {
    it('should generate a text response successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'This is a test response from OpenAI',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30,
        },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse as any);

      const result = await openAIService.generateResponse('Test prompt');

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'Test system prompt' },
          { role: 'user', content: 'Test prompt' },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });

      expect(result).toBe('This is a test response from OpenAI');
    });

    it('should include conversation history in the request', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Response with history' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse as any);

      const conversationHistory = [
        { role: 'user' as const, content: 'Previous message' },
        { role: 'assistant' as const, content: 'Previous response' },
      ];

      await openAIService.generateResponse('New prompt', conversationHistory);

      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: 'Test system prompt' },
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
          { role: 'user', content: 'New prompt' },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });
    });

    it('should handle API errors gracefully', async () => {
      const apiError = new Error('OpenAI API error');
      mockOpenAIClient.chat.completions.create.mockRejectedValue(apiError);

      await expect(openAIService.generateResponse('Test prompt')).rejects.toThrow('OpenAI API error');
    });

    it('should handle empty response content', async () => {
      const mockResponse = {
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 10, completion_tokens: 0, total_tokens: 10 },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse as any);

      await expect(openAIService.generateResponse('Test prompt')).rejects.toThrow('No response content received from OpenAI');
    });
  });

  describe('generateCanvasData', () => {
    it('should generate canvas data successfully', async () => {
      const mockCanvasResponse = {
        elements: [
          {
            id: 'element-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
            text: 'Database',
            style: {
              fill: '#ffffff',
              stroke: '#000000',
              strokeWidth: 2,
            },
          },
        ],
        connections: [
          {
            id: 'conn-1',
            from: 'element-1',
            to: 'element-2',
            type: 'arrow',
            style: {
              stroke: '#000000',
              strokeWidth: 2,
            },
          },
        ],
        metadata: {
          title: 'System Architecture',
          description: 'A simple system diagram',
        },
      };

      const mockResponse = {
        choices: [{ message: { content: JSON.stringify(mockCanvasResponse) } }],
        usage: { prompt_tokens: 20, completion_tokens: 50, total_tokens: 70 },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse as any);

      const request: CanvasGenerationRequest = {
        prompt: 'Create a system architecture diagram',
        conversationHistory: [],
        projectFeatures: {
          attachments: { enabled: true },
          webSearch: { enabled: false },
        },
      };

      const result = await openAIService.generateCanvasData(request);

      expect(result.success).toBe(true);
      expect(result.canvasData).toEqual(mockCanvasResponse);
      expect(mockOpenAIClient.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4-turbo-preview',
        messages: expect.arrayContaining([
          { role: 'system', content: expect.stringContaining('You are an AI assistant specialized in generating canvas designs') },
          { role: 'user', content: expect.stringContaining('Create a system architecture diagram') },
        ]),
        max_tokens: 4000,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      });
    });

    it('should handle invalid JSON response', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Invalid JSON response' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse as any);

      const request: CanvasGenerationRequest = {
        prompt: 'Create a diagram',
        conversationHistory: [],
      };

      const result = await openAIService.generateCanvasData(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON response from OpenAI');
    });

    it('should handle missing elements array', async () => {
      const invalidResponse = {
        connections: [],
        metadata: { title: 'Test' },
      };

      const mockResponse = {
        choices: [{ message: { content: JSON.stringify(invalidResponse) } }],
        usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
      };

      mockOpenAIClient.chat.completions.create.mockResolvedValue(mockResponse as any);

      const request: CanvasGenerationRequest = {
        prompt: 'Create a diagram',
        conversationHistory: [],
      };

      const result = await openAIService.generateCanvasData(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid canvas response: missing or invalid elements array');
    });

    it('should handle API errors during canvas generation', async () => {
      const apiError = new Error('Rate limit exceeded');
      mockOpenAIClient.chat.completions.create.mockRejectedValue(apiError);

      const request: CanvasGenerationRequest = {
        prompt: 'Create a diagram',
        conversationHistory: [],
      };

      const result = await openAIService.generateCanvasData(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });
  });

  describe('getConfig', () => {
    it('should return the current configuration', () => {
      const config = openAIService.getConfig();
      
      expect(config).toEqual({
        apiKey: 'test-api-key',
        model: 'gpt-4-turbo-preview',
        maxTokens: 4000,
        temperature: 0.7,
        systemPrompt: 'Test system prompt',
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing API key', () => {
      // Temporarily change NODE_ENV to force real config loading
      const originalNodeEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';
      
      // Clear the API key and reset singleton
      delete process.env['OPENAI_API_KEY'];
      (OpenAIService as any).instance = undefined;
      
      // This should throw because the service tries to create a client with no API key
      expect(() => {
        const service = OpenAIService.getInstance();
        // Force client creation by calling a method
        service.getConfig();
      }).toThrow('OPENAI_API_KEY environment variable is required');
      
      // Restore NODE_ENV
      process.env['NODE_ENV'] = originalNodeEnv;
    });

    it('should use default values when environment variables are not set', () => {
      // Temporarily change NODE_ENV to force real config loading
      const originalNodeEnv = process.env['NODE_ENV'];
      process.env['NODE_ENV'] = 'development';
      
      // Set API key but clear other environment variables
      process.env['OPENAI_API_KEY'] = 'test-api-key';
      delete process.env['OPENAI_MODEL'];
      delete process.env['OPENAI_MAX_TOKENS'];
      delete process.env['OPENAI_TEMPERATURE'];
      delete process.env['OPENAI_SYSTEM_PROMPT'];
      (OpenAIService as any).instance = undefined;
      
      const service = OpenAIService.getInstance();
      const config = service.getConfig();
      
      expect(config.model).toBe('gpt-4-turbo-preview');
      expect(config.maxTokens).toBe(4000);
      expect(config.temperature).toBe(0.7);
      expect(config.systemPrompt).toContain('AI assistant that generates canvas designs');
      
      // Restore NODE_ENV
      process.env['NODE_ENV'] = originalNodeEnv;
    });
  });
}); 