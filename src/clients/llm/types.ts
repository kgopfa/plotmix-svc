export type Role = 'system' | 'user' | 'assistant';

// Pipeline-specific types
export type PipelineStage = 'planner' | 'animation' | 'dsl';

export type Stage = 'planner' | 'entities' | 'actions';

export interface LlmClient {
  callStage(stage: Stage | PipelineStage, messages: Array<{ role: Role; content: string }>, opts?: { json?: boolean; temperature?: number }): Promise<any>;
}

export interface BaseLlmConfig {
  provider: 'openai' | 'anthropic';
}

export interface OpenAiStageModels {
  modelPlanner: string;
  modelEntities: string;
  modelActions: string;
}

export interface AnthropicStageModels {
  modelPlanner: string;
  modelEntities: string;
  modelActions: string;
}

export type OpenAiConfig = Readonly<{
  apiKey: string;
  baseURL: string | undefined;
  stages: OpenAiStageModels;
} & BaseLlmConfig>;

export type AnthropicConfig = Readonly<{
  apiKey: string;
  version?: string;
  stages: AnthropicStageModels;
} & BaseLlmConfig>;


