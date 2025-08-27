import OpenAI from 'openai';
import type { LlmClient, Stage, Role, OpenAiConfig, PipelineStage } from './types';

export class OpenAiLlmClient implements LlmClient {
  private readonly sdk: OpenAI;
  private readonly cfg: OpenAiConfig;

  constructor(cfg: OpenAiConfig) {
    this.cfg = cfg;
    this.sdk = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL });
  }

  private modelFor(stage: Stage | PipelineStage): string {
    if (stage === 'planner') return this.cfg.stages.modelPlanner;
    if (stage === 'entities') return this.cfg.stages.modelEntities;
    if (stage === 'actions') return this.cfg.stages.modelActions;
    if (stage === 'visual') return this.cfg.stages.modelPlanner; // Use planner model for visual stage
    if (stage === 'dsl') return this.cfg.stages.modelActions; // Use actions model for DSL stage
    throw new Error(`Unknown stage: ${stage}`);
  }

  async callStage(stage: Stage, messages: Array<{ role: Role; content: string }>, opts: { json?: boolean; temperature?: number } = {}): Promise<any> {
    const body: any = {
      model: this.modelFor(stage),
      messages,
      temperature: typeof opts.temperature === 'number' ? opts.temperature : 0.2,
    };
    if (opts.json !== false) body.response_format = { type: 'json_object' } as const;
    const res = await this.sdk.chat.completions.create(body);
    const text = res.choices?.[0]?.message?.content ?? (opts.json === false ? '' : '{}');
    if (opts.json === false) return text;
    try { return JSON.parse(text); } catch {
      const stripped = text.replace(/```(?:json)?\n?|```/g, '').trim();
      return JSON.parse(stripped);
    }
  }
}


