import { OpenAiLlmClient } from './openai.client';
import { AnthropicLlmClient } from './anthropic.client';
import type { LlmClient, OpenAiConfig, AnthropicConfig } from './types';

export class LlmFactory {
  static create(): LlmClient {
    const provider = process.env['LLM_ROUTER_PROVIDER'];
    if (!provider || (provider !== 'openai' && provider !== 'anthropic')) {
      throw new Error('LLM_ROUTER_PROVIDER must be "openai" or "anthropic"');
    }

    const modelPlanner = process.env['LLM_MODEL_PLANNER'];
    const modelAnimation = process.env['LLM_MODEL_ANIMATION'];
    const modelActions = process.env['LLM_MODEL_ACTIONS'];
    if (!modelPlanner || !modelAnimation || !modelActions) {
      throw new Error('LLM_MODEL_PLANNER, LLM_MODEL_ANIMATION, and LLM_MODEL_ACTIONS are required');
    }

    if (provider === 'openai') {
      const apiKey = process.env['OPENAI_API_KEY'];
      if (!apiKey) throw new Error('OPENAI_API_KEY is required');

      const cfg: OpenAiConfig = {
        provider: 'openai',
        apiKey,
        baseURL: process.env['OPENAI_BASE_URL'],
        stages: {
          modelPlanner,
          modelActions,
          modelAnimation,
        }
      };
      return new OpenAiLlmClient(cfg);
    } else {
      const apiKey = process.env['ANTHROPIC_API_KEY'];
      if (!apiKey) throw new Error('ANTHROPIC_API_KEY is required');

      const cfg: AnthropicConfig = {
        provider: 'anthropic',
        apiKey,
        ...(process.env['ANTHROPIC_VERSION'] && { version: process.env['ANTHROPIC_VERSION'] }),
        stages: {
          modelPlanner,
          modelActions,
          modelAnimation,
        }
      };
      return new AnthropicLlmClient(cfg);
    }
  }
}


