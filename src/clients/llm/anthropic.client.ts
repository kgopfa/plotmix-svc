import OpenAI from 'openai';
import type { LlmClient, Stage, Role, AnthropicConfig, PipelineStage } from './types';
import { isTemperatureRestrictedModel } from '../openai.client';

export class AnthropicLlmClient implements LlmClient {
  private readonly sdk: OpenAI;
  private readonly cfg: AnthropicConfig;

  constructor(cfg: AnthropicConfig) {
    this.cfg = cfg;
    this.sdk = new OpenAI({ 
      apiKey: cfg.apiKey, 
      baseURL: 'https://api.anthropic.com/v1',
      defaultHeaders: {
        'anthropic-version': cfg.version || '2023-06-01'
      }
    });
  }

  private modelFor(stage: Stage | PipelineStage): string {
    // Current pipeline stages only
    if (stage === 'planner') return this.cfg.stages.modelPlanner;
    if (stage === 'animation') return this.cfg.stages.modelPlanner; // Use planner model for animation stage
    if (stage === 'dsl') return this.cfg.stages.modelActions; // Use actions model for DSL stage
    
    throw new Error(`Unknown stage: ${stage}`);
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async callStage(stage: Stage | PipelineStage, messages: Array<{ role: Role; content: string }>, opts: { json?: boolean; temperature?: number | undefined } = {}): Promise<any> {
    const maxRetries = 3;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const modelName = this.modelFor(stage);
        const isTemperatureRestricted = isTemperatureRestrictedModel(modelName);

        const body: any = {
          model: modelName,
          messages,
        };

        // Only set temperature if the model supports it and temperature is provided
        if (!isTemperatureRestricted && opts.temperature !== undefined) {
          body.temperature = opts.temperature;
        }

        if (opts.json !== false) body.response_format = { type: 'json_object' } as const;
        
        const res = await this.sdk.chat.completions.create(body);
        const text = res.choices?.[0]?.message?.content ?? (opts.json === false ? '' : '{}');
        
        let content;
        if (opts.json === false) {
          content = text;
        } else {
          try { 
            content = JSON.parse(text); 
          } catch {
            const stripped = text.replace(/```(?:json)?\n?|```/g, '').trim();
            content = JSON.parse(stripped);
          }
        }
        
        return {
          success: true,
          content
        };
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a 529 overloaded error or rate limit error
        if (error?.status === 529 || error?.message?.includes('529') || error?.message?.includes('Overloaded') || 
            error?.status === 429 || error?.message?.includes('rate_limit') || error?.message?.includes('Rate limit')) {
          if (attempt < maxRetries) {
            // Exponential backoff: 1s, 2s, 4s
            const delay = Math.pow(2, attempt) * 1000;
            console.log(`Anthropic API overloaded/rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
            await this.sleep(delay);
            continue;
          }
        }
        
        // For non-529/429 errors or after max retries, break and return error
        break;
      }
    }

    return {
      success: false,
      error: lastError instanceof Error ? lastError.message : String(lastError)
    };
  }
}
