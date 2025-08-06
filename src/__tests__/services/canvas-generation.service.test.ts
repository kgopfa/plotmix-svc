
import { CanvasGenerationService } from '../../services/canvas-generation.service';
import { OpenAIService } from '../../services/openai.service';
import { prisma } from '../../services/prisma.service';
import { MESSAGE_TYPES } from '../../types';

// Mock the OpenAIService
jest.mock('../../services/openai.service');
jest.mock('../../services/prisma.service');

describe('CanvasGenerationService', () => {
  let mockOpenAIService: any;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OpenAIService
    mockOpenAIService = {
      generateResponse: jest.fn(),
      generateCanvasData: jest.fn(),
      getConfig: jest.fn(),
    };

    (OpenAIService.getInstance as jest.Mock).mockReturnValue(mockOpenAIService);

    // Reset the static openaiService property in CanvasGenerationService
    (CanvasGenerationService as any).openaiService = mockOpenAIService;

    // Mock Prisma
    mockPrisma = {
      conversation: {
        findFirst: jest.fn(),
      },
      message: {
        findMany: jest.fn(),
      },
    };

    (prisma as any) = mockPrisma;
  });

  describe('processUserMessage', () => {
    const mockConversation = {
      id: 'conv-1',
      userId: 'user-1',
      project: {
        id: 'project-1',
        features: {
          attachments: { enabled: true },
          webSearch: { enabled: false },
        },
      },
    };

    beforeEach(() => {
      mockPrisma.conversation.findFirst.mockResolvedValue(mockConversation as any);
    });

    it('should generate text response for non-canvas prompts', async () => {
      mockOpenAIService.generateResponse.mockResolvedValue('This is a text response');
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await CanvasGenerationService.processUserMessage(
        'conv-1',
        'user-1',
        'Hello, how are you?',
        { includeHistory: true }
      );

      expect(result.llmResponse).toBe('This is a text response');
      expect(result.canvasData).toBeUndefined();
      expect(mockOpenAIService.generateResponse).toHaveBeenCalledWith(
        'Hello, how are you?',
        []
      );
    });

    it('should generate canvas data for canvas-related prompts', async () => {
      const mockCanvasData = {
        elements: [
          {
            id: 'element-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
          },
        ],
        connections: [],
        metadata: { title: 'Test Diagram' },
      };

      mockOpenAIService.generateCanvasData.mockResolvedValue({
        success: true,
        canvasData: mockCanvasData,
      });
      mockOpenAIService.generateResponse.mockResolvedValue('I\'ve created a diagram for you');
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await CanvasGenerationService.processUserMessage(
        'conv-1',
        'user-1',
        'Create a system architecture diagram',
        { includeHistory: true }
      );

      expect(result.llmResponse).toBe('I\'ve created a diagram for you');
      expect(result.canvasData).toEqual(mockCanvasData);
      expect(mockOpenAIService.generateCanvasData).toHaveBeenCalledWith({
        prompt: 'Create a system architecture diagram',
        conversationHistory: [],
        projectFeatures: mockConversation.project.features,
      });
    });

    it('should force canvas generation when option is set', async () => {
      const mockCanvasData = {
        elements: [{ id: 'element-1', type: 'rectangle', x: 100, y: 100 }],
        connections: [],
        metadata: { title: 'Forced Diagram' },
      };

      mockOpenAIService.generateCanvasData.mockResolvedValue({
        success: true,
        canvasData: mockCanvasData,
      });
      mockOpenAIService.generateResponse.mockResolvedValue('Forced canvas generation');
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await CanvasGenerationService.processUserMessage(
        'conv-1',
        'user-1',
        'Just say hello',
        { forceCanvasGeneration: true }
      );

      expect(result.canvasData).toEqual(mockCanvasData);
      expect(mockOpenAIService.generateCanvasData).toHaveBeenCalled();
    });

    it('should fallback to text response when canvas generation fails', async () => {
      mockOpenAIService.generateCanvasData.mockResolvedValue({
        success: false,
        error: 'Canvas generation failed',
      });
      mockOpenAIService.generateResponse.mockResolvedValue('Fallback text response');
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await CanvasGenerationService.processUserMessage(
        'conv-1',
        'user-1',
        'Create a diagram',
        { includeHistory: true }
      );

      expect(result.llmResponse).toBe('Fallback text response');
      expect(result.canvasData).toBeUndefined();
    });

    it('should include conversation history when requested', async () => {
      const mockHistory = [
        { id: 'msg-1', content: 'Previous message', messageType: MESSAGE_TYPES.USER, createdAt: new Date() },
        { id: 'msg-2', content: 'Previous response', messageType: MESSAGE_TYPES.LLM, createdAt: new Date() },
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockHistory as any);
      mockOpenAIService.generateResponse.mockResolvedValue('Response with history');

      await CanvasGenerationService.processUserMessage(
        'conv-1',
        'user-1',
        'New message',
        { includeHistory: true, maxHistoryMessages: 5 }
      );

      expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-1' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      expect(mockOpenAIService.generateResponse).toHaveBeenCalledWith(
        'New message',
        [
          { role: 'assistant', content: 'Previous response' },
          { role: 'user', content: 'Previous message' },
        ]
      );
    });

    it('should throw error for non-existent conversation', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      await expect(
        CanvasGenerationService.processUserMessage('conv-1', 'user-1', 'Test message')
      ).rejects.toThrow('Conversation not found or access denied');
    });
  });

  describe('generateCanvasData', () => {
    const mockConversation = {
      id: 'conv-1',
      userId: 'user-1',
      project: {
        id: 'project-1',
        features: { attachments: { enabled: true } },
      },
    };

    beforeEach(() => {
      mockPrisma.conversation.findFirst.mockResolvedValue(mockConversation as any);
    });

    it('should generate canvas data successfully', async () => {
      const mockCanvasData = {
        elements: [{ id: 'element-1', type: 'rectangle', x: 100, y: 100 }],
        connections: [],
        metadata: { title: 'Test' },
      };

      mockOpenAIService.generateCanvasData.mockResolvedValue({
        success: true,
        canvasData: mockCanvasData,
      });
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await CanvasGenerationService.generateCanvasData(
        'conv-1',
        'user-1',
        'Create a diagram',
        { includeHistory: true }
      );

      expect(result.success).toBe(true);
      expect(result.canvasData).toEqual(mockCanvasData);
    });

    it('should return error for non-existent conversation', async () => {
      mockPrisma.conversation.findFirst.mockResolvedValue(null);

      const result = await CanvasGenerationService.generateCanvasData(
        'conv-1',
        'user-1',
        'Create a diagram'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Conversation not found or access denied');
    });

    it('should handle OpenAI service errors', async () => {
      mockOpenAIService.generateCanvasData.mockRejectedValue(new Error('OpenAI error'));
      mockPrisma.message.findMany.mockResolvedValue([]);

      const result = await CanvasGenerationService.generateCanvasData(
        'conv-1',
        'user-1',
        'Create a diagram'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI error');
    });
  });

  describe('validateCanvasData', () => {
    it('should validate correct canvas data', () => {
      const validCanvasData = {
        elements: [
          {
            id: 'element-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            width: 200,
            height: 100,
          },
        ],
        connections: [
          {
            id: 'conn-1',
            from: 'element-1',
            to: 'element-2',
            type: 'arrow',
          },
        ],
      };

      const result = CanvasGenerationService.validateCanvasData(validCanvasData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject canvas data without elements', () => {
      const invalidCanvasData = {
        connections: [],
        metadata: { title: 'Test' },
      };

      const result = CanvasGenerationService.validateCanvasData(invalidCanvasData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Canvas data must contain an elements array');
    });

    it('should reject elements with missing required fields', () => {
      const invalidCanvasData = {
        elements: [
          {
            id: 'element-1',
            // Missing type, x, y
          },
        ],
      };

      const result = CanvasGenerationService.validateCanvasData(invalidCanvasData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Element 0: missing type');
      expect(result.errors).toContain('Element 0: x must be a number');
      expect(result.errors).toContain('Element 0: y must be a number');
    });

    it('should validate connections when present', () => {
      const canvasDataWithInvalidConnections = {
        elements: [
          { id: 'element-1', type: 'rectangle', x: 100, y: 100 },
        ],
        connections: [
          {
            id: 'conn-1',
            // Missing from and to
          },
        ],
      };

      const result = CanvasGenerationService.validateCanvasData(canvasDataWithInvalidConnections);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Connection 0: missing from element');
      expect(result.errors).toContain('Connection 0: missing to element');
    });

    it('should reject null canvas data', () => {
      const result = CanvasGenerationService.validateCanvasData(null as any);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Canvas data is required');
    });
  });

  describe('getGenerationStats', () => {
    it('should return generation statistics', async () => {
      const mockMessages = [
        {
          id: 'msg-3',
          messageType: MESSAGE_TYPES.CANVAS_GENERATION,
          metadata: { success: true },
          createdAt: new Date('2023-01-03'),
        },
        {
          id: 'msg-2',
          messageType: MESSAGE_TYPES.CANVAS_GENERATION,
          metadata: { success: false },
          createdAt: new Date('2023-01-02'),
        },
        {
          id: 'msg-1',
          messageType: MESSAGE_TYPES.CANVAS_GENERATION,
          metadata: { success: true },
          createdAt: new Date('2023-01-01'),
        },
      ];

      mockPrisma.message.findMany.mockResolvedValue(mockMessages as any);

      const stats = await CanvasGenerationService.getGenerationStats('conv-1');

      expect(stats.totalGenerations).toBe(3);
      expect(stats.successfulGenerations).toBe(2);
      expect(stats.failedGenerations).toBe(1);
      expect(stats.lastGeneration).toEqual(new Date('2023-01-03'));
    });

    it('should handle empty generation history', async () => {
      mockPrisma.message.findMany.mockResolvedValue([]);

      const stats = await CanvasGenerationService.getGenerationStats('conv-1');

      expect(stats.totalGenerations).toBe(0);
      expect(stats.successfulGenerations).toBe(0);
      expect(stats.failedGenerations).toBe(0);
      expect(stats.lastGeneration).toBeUndefined();
    });
  });

  describe('shouldGenerateCanvas', () => {
    it('should detect canvas keywords', () => {
      const canvasKeywords = [
        'create a diagram',
        'generate a chart',
        'design a system',
        'draw an architecture',
        'build a flow',
        'make a visual',
        'show me a blueprint',
      ];

      canvasKeywords.forEach(keyword => {
        const result = (CanvasGenerationService as any).shouldGenerateCanvas(keyword, {});
        expect(result).toBe(true);
      });
    });

    it('should not detect canvas keywords in regular messages', () => {
      const regularMessages = [
        'Hello, how are you?',
        'What is the weather like?',
        'Can you help me with this problem?',
        'Thank you for your assistance',
      ];

      regularMessages.forEach(message => {
        const result = (CanvasGenerationService as any).shouldGenerateCanvas(message, {});
        expect(result).toBe(false);
      });
    });

    it('should force canvas generation when option is set', () => {
      const result = (CanvasGenerationService as any).shouldGenerateCanvas(
        'Just say hello',
        { forceCanvasGeneration: true }
      );
      expect(result).toBe(true);
    });
  });
}); 