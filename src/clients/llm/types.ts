export type Role = 'system' | 'user' | 'assistant';

export type Stage = 'planner' | 'entities' | 'actions';

export interface LlmClient {
  callStage(stage: Stage, messages: Array<{ role: Role; content: string }>, opts?: { json?: boolean; temperature?: number }): Promise<any>;
}

export interface BaseLlmConfig {
  provider: 'openai';
}

export interface OpenAiStageModels {
  modelPlanner: string;
  modelEntities: string;
  modelActions: string;
}

export type OpenAiConfig = Readonly<{
  apiKey: string;
  baseURL: string | undefined;
  stages: OpenAiStageModels;
} & BaseLlmConfig>;


