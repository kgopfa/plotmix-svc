import OpenAI from 'openai';
// Intentionally no logging here; this is a thin connection singleton

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  provider: 'openai' | 'anthropic';
  baseURL?: string;
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
    const isAnthropic = this.config.provider === 'anthropic';
    const defaultHeaders = isAnthropic
      ? {
          'x-api-key': this.config.apiKey,
          'anthropic-version': process.env['ANTHROPIC_VERSION'] || '2023-06-01',
        }
      : undefined;

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      defaultHeaders,
    });
  }

  public static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }

  private loadConfig(): OpenAIConfig {
    const provider = (process.env['LLM_PROVIDER'] as 'openai' | 'anthropic') || 'openai';

    if (provider === 'anthropic') {
      const apiKey = process.env['ANTHROPIC_API_KEY'];
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required when LLM_PROVIDER=anthropic');
      }
      const model = process.env['ANTHROPIC_MODEL'];
      if (!model) {
        throw new Error('ANTHROPIC_MODEL environment variable is required when LLM_PROVIDER=anthropic');
      }
      return {
        apiKey,
        model,
        provider,
        baseURL: process.env['ANTHROPIC_BASE_URL'] || 'https://api.anthropic.com/v1/',
      };
    }

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
      provider,
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