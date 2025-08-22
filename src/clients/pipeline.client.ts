import OpenAI from 'openai';
import { logger } from '../utils/logger';

export interface PipelineModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface PipelineConfig {
  baseURL?: string;
  apiKey: string;
  models: {
    [stage: string]: PipelineModelConfig;
  };
}

export class PipelineJsonParseError extends Error {
  constructor(
    message: string,
    public rawText: string,
    public modelType: string,
    public parseError?: string
  ) {
    super(message);
    this.name = 'PipelineJsonParseError';
  }
}

export class PipelineClient {
  private static instance: PipelineClient;
  private openai: OpenAI;
  private config: PipelineConfig;

  private constructor() {
    this.config = this.loadConfig();
    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
      ...(this.config.baseURL && { baseURL: this.config.baseURL }),
    });
  }

  static getInstance(): PipelineClient {
    if (!PipelineClient.instance) {
      PipelineClient.instance = new PipelineClient();
    }
    return PipelineClient.instance;
  }

  private loadConfig(): PipelineConfig {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    const baseURL = process.env['OPENAI_BASE_URL'];
    
    return {
      ...(baseURL && { baseURL }),
      apiKey,
      models: {
        intentReducer: {
          model: process.env['PIPELINE_INTENT_REDUCER_MODEL'] || 'gpt-4',
          temperature: 0.1,
          maxTokens: 150,
        },
        router: {
          model: process.env['PIPELINE_ROUTER_MODEL'] || 'gpt-3.5-turbo',
          temperature: 0.0,
          maxTokens: 50,
        },
        scenePlanner: {
          model: process.env['PIPELINE_SCENE_PLANNER_MODEL'] || 'gpt-3.5-turbo',
          temperature: 0.0,
          maxTokens: 150,
        },
        sceneProcessor: {
          model: process.env['PIPELINE_SCENE_PROCESSOR_MODEL'] || 'gpt-4',
          temperature: 0.3,
          maxTokens: 500,
        },
        layoutCompiler: {
          model: process.env['PIPELINE_LAYOUT_COMPILER_MODEL'] || 'gpt-4',
          temperature: 0.1,
          maxTokens: 1000,
        },
        perSceneFanOut: {
          model: process.env['PIPELINE_PER_SCENE_FAN_OUT_MODEL'] || 'gpt-3.5-turbo',
          temperature: 0.0,
          maxTokens: 200,
        },
      },
    };
  }

  private getModelConfig(stage: string): PipelineModelConfig {
    const config = this.config.models[stage];
    if (!config) {
      throw new Error(`No model configuration found for stage: ${stage}`);
    }
    return config;
  }

  public async callLLM(
    messages: OpenAI.ChatCompletionMessageParam[],
    stage: string,
    options: { json?: boolean; attempts?: number } = {}
  ): Promise<any> {
    return this.withRetry(() => this.callLLMInternal(messages, stage, options), options.attempts || 1);
  }

  private async withRetry<T>(fn: () => Promise<T>, attempts: number): Promise<T> {
    let lastErr: unknown;
    
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (error) {
        lastErr = error;
        if (i < attempts - 1) {
          logger.warn(`Attempt ${i + 1} failed, retrying...`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        }
      }
    }
    
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  private async callLLMInternal(
    messages: OpenAI.ChatCompletionMessageParam[],
    stage: string,
    options: { json?: boolean; attempts?: number } = {}
  ): Promise<any> {
    const config = this.getModelConfig(stage);
    const { json = false } = options;

    // Check if this model supports JSON response format
    const supportsJson = this.isJsonSupported(config.model);
    logger.debug('LLM call configuration', { 
      stage, 
      model: config.model, 
      supportsJson, 
      requestingJson: json 
    });

    const requestOptions: OpenAI.ChatCompletionCreateParams = {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens as number,
      // Only use response_format for models that support it
      ...(json && supportsJson && { response_format: { type: 'json_object' } }),
    };

    try {
      const response = await this.openai.chat.completions.create(requestOptions);
      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content in response');
      }

      if (json) {
        try {
          return JSON.parse(content);
        } catch (parseError) {
          throw new PipelineJsonParseError(
            `Failed to parse JSON from ${stage}`,
            content,
            config.model,
            parseError instanceof Error ? parseError.message : String(parseError)
          );
        }
      }

      return content;
    } catch (error) {
      throw error;
    }
  }

  private isJsonSupported(model: string): boolean {
    // GPT-4 and GPT-3.5-turbo support json_object response format
    // Handle various model naming conventions
    const normalizedModel = model.toLowerCase();
    return normalizedModel.includes('gpt-4') || 
           normalizedModel.includes('gpt-3.5-turbo') ||
           normalizedModel.includes('gpt-4o') ||
           normalizedModel.includes('gpt-3.5-turbo-16k');
  }
}

// Convenience wrapper for simple calls
export async function callPipelineLLM(
  prompt: string, 
  modelType: string, 
  json: boolean = true, 
  attempts: number = 2
): Promise<any> {
  const client = PipelineClient.getInstance();
  return client.callLLM([{ role: 'user', content: prompt }], modelType, { json, attempts });
}
