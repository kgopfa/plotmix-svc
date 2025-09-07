import { logger } from '../../../utils/logger';
import { LlmFactory } from '../../../clients/llm/factory';
import { PromptTemplates } from './prompts';
import type { LlmClient, ContentPlan, ScenePlan, Stage, AnimationPlan } from '../../../types';

export interface ChainedExecutionResult {
  success: boolean;
  contentPlan?: ContentPlan;
  scenePlan?: ScenePlan;
  animationPlan?: AnimationPlan;
  dsl?: string;
  error?: string;
  stage?: Stage;
}

export class ChainedCaller {
  private client: LlmClient;

  constructor() {
    this.client = LlmFactory.create();
  }

  /**
   * Execute the full LLM pipeline from abstract prompt to DSL (no compilation here)
   */
  async execute(prompt: string): Promise<ChainedExecutionResult> {
    try {
      logger.info('llm-pipeline:start', { promptLength: prompt.length });

      // Stage 1: Content Planner
      const contentPlanResult = await this.executeContentPlanner(prompt);
      if (!contentPlanResult.success) {
        logger.error('llm-pipeline:content_planner_failed', { error: contentPlanResult.error });
        return {
          success: false,
          error: `Content Planner failed: ${contentPlanResult.error}`,
          stage: 'planner'
        };
      }

      const contentPlan = contentPlanResult.content as ContentPlan;
      logger.info('llm-pipeline:content_planned', { 
        problemTitle: contentPlan.problem.title,
        arrayCount: contentPlan.visualRequirements.arrays.length 
      });

      // Stage 2: Visual Planner
      const scenePlanResult = await this.executeVisualPlanner(contentPlan);
      if (!scenePlanResult.success) {
        logger.error('llm-pipeline:visual_planner_failed', { error: scenePlanResult.error });
        return {
          success: false,
          error: `Visual Planner failed: ${scenePlanResult.error}`,
          stage: 'visual'
        };
      }

      const scenePlan = scenePlanResult.content as ScenePlan;
      logger.info('llm-pipeline:visual_planned', { 
        sectionsCount: scenePlan.sections.length,
        canvas: scenePlan.canvas 
      });

      // Stage 3: Animation Planner
      const animationPlanResult = await this.executeAnimationPlanner(scenePlan, contentPlan);
      if (!animationPlanResult.success) {
        logger.error('llm-pipeline:animation_planner_failed', { error: animationPlanResult.error });
        return {
          success: false,
          error: `Animation Planner failed: ${animationPlanResult.error}`,
          stage: 'animation'
        };
      }

      const animationPlan = animationPlanResult.content as AnimationPlan;
      logger.info('llm-pipeline:animation_planned', { 
        algorithm: animationPlan.algorithm,
        steps: animationPlan.steps.length
      });

      // Stage 4: DSL Emitter
      const dslResult = await this.executeDslEmitter(scenePlan, animationPlan);
      if (!dslResult.success) {
        logger.error('llm-pipeline:dsl_emitter_failed', { error: dslResult.error });
        return {
          success: false,
          error: `DSL Emitter failed: ${dslResult.error}`,
          stage: 'dsl'
        };
      }

      const dsl = dslResult.content as string;
      logger.info('llm-pipeline:dsl_generated', { dslLength: dsl.length });

      // Return only LLM artifacts; compilation is handled by orchestrator
      return {
        success: true,
        contentPlan,
        scenePlan,
        animationPlan,
        dsl
      };

    } catch (error) {
      logger.error('llm-pipeline:error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Execute Stage 1: Content Planner
   */
  private async executeContentPlanner(prompt: string): Promise<any> {
    logger.info('llm-pipeline:executing_content_planner');
    const messages = PromptTemplates.contentPlanner(prompt);
    return await this.client.callStage('planner', messages, { temperature: 0.1, json: true });
  }

  /**
   * Execute Stage 2: Visual Planner
   */
  private async executeVisualPlanner(contentPlan: ContentPlan): Promise<any> {
    logger.info('llm-pipeline:executing_visual_planner');
    const messages = PromptTemplates.visualPlanner(contentPlan);
    return await this.client.callStage('visual', messages, { temperature: 0.1, json: true });
  }

  /**
   * Execute Stage 3: Animation Planner
   */
  private async executeAnimationPlanner(scenePlan: ScenePlan, contentPlan: ContentPlan): Promise<any> {
    logger.info('llm-pipeline:executing_animation_planner');
    const messages = PromptTemplates.animationPlanner(scenePlan, contentPlan);
    return await this.client.callStage('animation', messages, { temperature: 0.1, json: true });
  }

  /**
   * Execute Stage 4: DSL Emitter
   */
  private async executeDslEmitter(scenePlan: ScenePlan, animationPlan?: AnimationPlan): Promise<any> {
    logger.info('llm-pipeline:executing_dsl_emitter');
    const messages = PromptTemplates.dslEmitter(scenePlan, animationPlan);
    return await this.client.callStage('dsl', messages, { temperature: 0.0, json: false });
  }

  /**
   * Get the raw LLM client for custom usage
   */
  getClient(): LlmClient {
    return this.client;
  }
}
