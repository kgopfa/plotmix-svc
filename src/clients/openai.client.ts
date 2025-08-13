import OpenAI from 'openai';
// Intentionally no logging here; this is a thin connection singleton

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
  name?: string;
  title?: string;
  description?: string;
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

  public getConfig(): OpenAIConfig {
    return { ...this.config };
  }

  public getSdk(): OpenAI {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }
    return this.client;
  }
} 