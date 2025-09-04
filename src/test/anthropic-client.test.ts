import { AnthropicLlmClient } from '../clients/llm/anthropic.client';
import type { AnthropicConfig } from '../clients/llm/types';

describe('Anthropic LLM Client', () => {
  test('should create Anthropic client with valid config', () => {
    const config: AnthropicConfig = {
      provider: 'anthropic',
      apiKey: 'test-key',
      version: '2023-06-01',
      stages: {
        modelPlanner: 'claude-3-haiku-20240307',
        modelEntities: 'claude-3-haiku-20240307',
        modelActions: 'claude-3-haiku-20240307'
      }
    };

    const client = new AnthropicLlmClient(config);
    expect(client).toBeDefined();
  });

  test('should create Anthropic client without version', () => {
    const config: AnthropicConfig = {
      provider: 'anthropic',
      apiKey: 'test-key',
      stages: {
        modelPlanner: 'claude-3-haiku-20240307',
        modelEntities: 'claude-3-haiku-20240307',
        modelActions: 'claude-3-haiku-20240307'
      }
    };

    const client = new AnthropicLlmClient(config);
    expect(client).toBeDefined();
  });
});
