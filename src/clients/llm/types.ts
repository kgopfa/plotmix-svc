export type Role = 'system' | 'user' | 'assistant';

// Pipeline-specific types
export type PipelineStage = 'planner' | 'visual' | 'animation' | 'dsl';

// Scene Plan JSON Schema (LLM #2 output)
export interface ScenePlan {
  seed: number;
  canvas: { width: number; height: number };
  style: "auto" | string;
  sections: SceneSection[];
}

export interface SceneSection {
  id: string;
  title: string;
  text?: string;
  bullets?: string[];
  keyIdeas?: string[];
  example?: string;
  visuals?: VisualElement[];
}

export interface VisualElement {
  kind: "array";
  values: (number | string)[];
  at: { x: number; y: number };
  gap: number;
  cell?: number;
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
  edgeCases: string[];
  visualRequirements: {
    arrays: Array<{
      values: (number | string)[];
      purpose: string;
      position: { x: number; y: number };
    }>;
  };
}

export type Stage = 'planner' | 'entities' | 'actions';

export interface LlmClient {
  callStage(stage: Stage | PipelineStage, messages: Array<{ role: Role; content: string }>, opts?: { json?: boolean; temperature?: number }): Promise<any>;
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


