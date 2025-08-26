import { OpenAiLlmClient } from './openai.client';
import type { LlmClient, OpenAiConfig } from './types';

export class LlmFactory {
  static create(): LlmClient {
    const provider = process.env['LLM_ROUTER_PROVIDER'];
    if (provider !== 'openai') throw new Error('LLM_ROUTER_PROVIDER must be "openai"');

    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) throw new Error('OPENAI_API_KEY is required');

    const modelPlanner = process.env['LLM_MODEL_PLANNER'];
    const modelEntities = process.env['LLM_MODEL_ENTITIES'];
    const modelActions = process.env['LLM_MODEL_ACTIONS'];
    if (!modelPlanner || !modelEntities || !modelActions) {
      throw new Error('LLM_MODEL_PLANNER, LLM_MODEL_ENTITIES, and LLM_MODEL_ACTIONS are required');
    }

    const cfg: OpenAiConfig = {
      provider: 'openai',
      apiKey,
      baseURL: process.env['OPENAI_BASE_URL'],
      stages: {
        modelPlanner,
        modelEntities,
        modelActions,
      }
    };
    return new OpenAiLlmClient(cfg);
  }
}


