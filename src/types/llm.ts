export type Role = 'system' | 'user' | 'assistant';

export type Stage = 'planner' | 'animation' | 'dsl';

export interface LlmMessage {
  role: Role;
  content: string;
}

export interface LlmResponse {
  success: boolean;
  content: any;
  error?: string;
}


// Content Plan (LLM #1 output)
export interface ContentPlan {
  problem: {
    title: string;
    description: string;
    example?: string;
  };
  approaches: {
    naive: {
      title: string;
      description: string;
      complexity: string;
    };
    optimal: {
      title: string;
      description: string;
      complexity: string;
      keyIdeas: string[];
    };
  };
  algorithmExplanation: string;
  pseudocode: string[];
  edgeCases: string[];
}

export interface LlmClient {
  callStage(
    stage: Stage, 
    messages: Array<{ role: Role; content: string }>, 
    opts?: { json?: boolean; temperature?: number }
  ): Promise<any>;
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


