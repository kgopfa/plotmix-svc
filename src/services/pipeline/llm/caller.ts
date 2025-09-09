import { logger } from '../../../utils/logger';
import { LlmFactory } from '../../../clients/llm/factory';
import { PromptTemplates } from './prompts';
import type { LlmClient, ContentPlan, Stage, AnimationPlan } from '../../../types';

export interface ChainedExecutionResult {
  success: boolean;
  contentPlan?: ContentPlan;
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

      logger.info('llm-pipeline:content_planner result: ', contentPlanResult);

      const contentPlan = contentPlanResult.content as ContentPlan;
      logger.info('llm-pipeline:content_planned', { 
        problemTitle: contentPlan.problem.title,
        edgeCasesCount: contentPlan.approaches.edgeCases.length 
      });

      // Stage 2: Animation Planner
      const animationPlanResult = await this.executeAnimationPlanner(contentPlan);
      if (!animationPlanResult.success) {
        logger.error('llm-pipeline:animation_planner_failed', { error: animationPlanResult.error });
        return {
          success: false,
          error: `Animation Planner failed: ${animationPlanResult.error}`,
          stage: 'animation'
        };
      }

      logger.info('llm-pipeline:animation_planner result: ', animationPlanResult);

      const animationPlan = animationPlanResult.content as AnimationPlan;
      logger.info('llm-pipeline:animation_planned', { 
        title: animationPlan.title,
        steps: animationPlan.steps.length
      });

      // Stage 3: DSL Emitter
      const dslResult = await this.executeDslEmitter(contentPlan, animationPlan);
      if (!dslResult.success) {
        logger.error('llm-pipeline:dsl_emitter_failed', { error: dslResult.error });
        return {
          success: false,
          error: `DSL Emitter failed: ${dslResult.error}`,
          stage: 'dsl'
        };
      }

      logger.info('llm-pipeline:dsl_emitter result: ', dslResult);

      const dsl = dslResult.content as string;
      logger.info('llm-pipeline:dsl_generated', { dslLength: dsl.length });

      // Return only LLM artifacts; compilation is handled by orchestrator
      return {
        success: true,
        contentPlan,
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
   * Execute Stage 2: Animation Planner
   */
  private async executeAnimationPlanner(contentPlan: ContentPlan): Promise<any> {
    logger.info('llm-pipeline:executing_animation_planner');
    const messages = PromptTemplates.animationPlanner(contentPlan);
    return await this.client.callStage('animation', messages, { temperature: 0.1, json: true });
  }

  /**
   * Execute Stage 3: DSL Emitter
   */
  private async executeDslEmitter(contentPlan: ContentPlan, animationPlan?: AnimationPlan): Promise<any> {
    logger.info('llm-pipeline:executing_dsl_emitter');
    const messages = PromptTemplates.dslEmitter(contentPlan, animationPlan);
    return await this.client.callStage('dsl', messages, { temperature: 0.0, json: false });
  }

  /**
   * Get the raw LLM client for custom usage
   */
  getClient(): LlmClient {
    return this.client;
  }
}
