import { logger } from '../../../utils/logger';
import { LlmFactory } from '../../../clients/llm/factory';
import { PromptTemplates } from './prompts';
import type { LlmClient, ContentPlan, Stage, AnimationPlan } from '../../../types';

export interface RouterResult {
  pipelineType: 'algorithm' | 'simple_scene' | 'direct_dsl';
  reasoning: string;
  extractedIntent: {
    topic?: string;
    sceneRequirements?: string[];
    structure?: string;
  };
}

export interface ChainedExecutionResult {
  success: boolean;
  routerResult?: RouterResult;
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

      // Stage 0: Router - determine which pipeline to execute
      const routerResult = await this.executeRouter(prompt);
      if (!routerResult.success) {
        logger.error('llm-pipeline:router_failed', { error: routerResult.error });
        return {
          success: false,
          error: `Router failed: ${routerResult.error}`,
          stage: 'planner'
        };
      }

      const routerOutput = routerResult.content as RouterResult;
      logger.info('llm-pipeline:router_result', { 
        pipelineType: routerOutput.pipelineType,
        reasoning: routerOutput.reasoning 
      });

      // Execute appropriate pipeline based on router decision
      switch (routerOutput.pipelineType) {
        case 'algorithm':
          return await this.executeAlgorithmPipeline(prompt, routerOutput);
        
        case 'simple_scene':
          return await this.executeSimpleScenePipeline(prompt, routerOutput);
        
        case 'direct_dsl':
          return await this.executeDirectDslPipeline(prompt, routerOutput);
        
        default:
          logger.error('llm-pipeline:unknown_pipeline_type', { type: routerOutput.pipelineType });
          return {
            success: false,
            error: `Unknown pipeline type: ${routerOutput.pipelineType}`
          };
      }

    } catch (error) {
      logger.error('llm-pipeline:error', { error: error instanceof Error ? error.message : String(error) });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Execute the full algorithm pipeline (original flow)
   */
  private async executeAlgorithmPipeline(prompt: string, routerResult: RouterResult): Promise<ChainedExecutionResult> {
    logger.info('llm-pipeline:executing_algorithm_pipeline');

    // Stage 1: Content Planner
    const contentPlanResult = await this.executeContentPlanner(prompt);
    if (!contentPlanResult.success) {
      logger.error('llm-pipeline:content_planner_failed', { error: contentPlanResult.error });
      return {
        success: false,
        error: `Content Planner failed: ${contentPlanResult.error}`,
        stage: 'planner',
        routerResult
      };
    }

    const contentPlan = contentPlanResult.content as ContentPlan;
    logger.info('llm-pipeline:content_planned', { 
      problemTitle: contentPlan.problem.title,
      edgeCasesCount: contentPlan.edgeCases.length 
    });

    // Stage 2: Animation Planner
    const animationPlanResult = await this.executeAnimationPlanner(contentPlan);
    if (!animationPlanResult.success) {
      logger.error('llm-pipeline:animation_planner_failed', { error: animationPlanResult.error });
      return {
        success: false,
        error: `Animation Planner failed: ${animationPlanResult.error}`,
        stage: 'animation',
        routerResult
      };
    }

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
        stage: 'dsl',
        routerResult
      };
    }

    const dsl = dslResult.content as string;
    logger.info('llm-pipeline:dsl_generated', { dslLength: dsl.length });

    return {
      success: true,
      routerResult,
      contentPlan,
      animationPlan,
      dsl
    };
  }

  /**
   * Execute simple scene pipeline (direct to DSL)
   */
  private async executeSimpleScenePipeline(prompt: string, routerResult: RouterResult): Promise<ChainedExecutionResult> {
    logger.info('llm-pipeline:executing_simple_scene_pipeline');

    const dslResult = await this.executeSimpleSceneGenerator(prompt, routerResult.extractedIntent);
    if (!dslResult.success) {
      logger.error('llm-pipeline:simple_scene_generator_failed', { error: dslResult.error });
      return {
        success: false,
        error: `Simple Scene Generator failed: ${dslResult.error}`,
        stage: 'dsl',
        routerResult
      };
    }

    const dsl = dslResult.content as string;
    logger.info('llm-pipeline:dsl_generated', { dslLength: dsl.length });

    return {
      success: true,
      routerResult,
      dsl
    };
  }

  /**
   * Execute direct DSL pipeline (similar to simple scene but with structure awareness)
   */
  private async executeDirectDslPipeline(prompt: string, routerResult: RouterResult): Promise<ChainedExecutionResult> {
    logger.info('llm-pipeline:executing_direct_dsl_pipeline');

    // For now, treat it the same as simple scene
    // Could add a dedicated prompt template later if needed
    const dslResult = await this.executeSimpleSceneGenerator(prompt, routerResult.extractedIntent);
    if (!dslResult.success) {
      logger.error('llm-pipeline:direct_dsl_generator_failed', { error: dslResult.error });
      return {
        success: false,
        error: `Direct DSL Generator failed: ${dslResult.error}`,
        stage: 'dsl',
        routerResult
      };
    }

    const dsl = dslResult.content as string;
    logger.info('llm-pipeline:dsl_generated', { dslLength: dsl.length });

    return {
      success: true,
      routerResult,
      dsl
    };
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
   * Execute Stage 0: Router
   */
  private async executeRouter(prompt: string): Promise<any> {
    logger.info('llm-pipeline:executing_router');
    const messages = PromptTemplates.router(prompt);
    return await this.client.callStage('planner', messages, { temperature: 0.1, json: true });
  }

  /**
   * Execute Simple Scene Generator
   */
  private async executeSimpleSceneGenerator(prompt: string, extractedIntent?: any): Promise<any> {
    logger.info('llm-pipeline:executing_simple_scene_generator');
    const messages = PromptTemplates.simpleSceneGenerator(prompt, extractedIntent);
    return await this.client.callStage('dsl', messages, { temperature: 0.0, json: false });
  }

  /**
   * Get the raw LLM client for custom usage
   */
  getClient(): LlmClient {
    return this.client;
  }
}
