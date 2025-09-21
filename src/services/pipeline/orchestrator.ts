import { DslCompiler } from './dsl/compiler';
import { execute } from './dsl/executor';
import { LlmPipeline } from './llm';
import type { ActionProgram, DslScene } from '../../types';
import { validateElementsArray } from '../../schema/elements';
import { logger } from '../../utils/logger';

export interface PipelineResult {
  success: boolean;
  mainState?: {
    dimensions: { width: number; height: number };
    scenes: Array<{
      sceneId: string;
      sceneName: string;
      sceneCanvas: {
        elements: any[];
        groups: any[];
        timeline: any;
      };
    }>;
  };
  error?: string;
  summary?: string;
}

export class Orchestrator {
  static async generateFromPrompt(prompt: string): Promise<PipelineResult> {
    const llm = new LlmPipeline();
    const result = await llm.execute(prompt);

    if (!result.success) {
      throw new Error(`LLM pipeline failed: ${result.error}`);
    }

    if (!result.dsl) {
      throw new Error('LLM pipeline produced no DSL');
    }

    const dslResult = this.generateFromDsl(result.dsl);
    
    // If DSL generation failed due to validation, throw error
    if (!dslResult.success) {
      throw new Error(`DSL execution failed: ${dslResult.error}`);
    }
    
    return dslResult;
  }

  /**
   * Generate a canvas scene from DSL input
   */
  static generateFromDsl(dsl: string): PipelineResult {
    try {
      logger.info(`Generating from DSL: ${dsl}`);
      const program = DslCompiler.compile(dsl);
      if (program.length === 0) {
        return { success: false, error: 'No valid actions found in DSL' };
      }

      const dslScene = execute(program) as unknown as DslScene;

      // Validate elements using schema validation
      const validationResult = validateElementsArray(dslScene.elements);
      if (!validationResult.valid) {
        logger.error('Element validation failed:', { errors: validationResult.errors });
        throw new Error(`Element validation failed: ${validationResult.errors.join('; ')}`);
      }
      
      // Convert flat DSL scene structure to scene-based mainState
      const mainState = {
        dimensions: { width: 1920, height: 1080 },
        scenes: [{
          sceneId: 'default-scene',
          sceneName: 'Default Scene',
          sceneCanvas: {
            elements: dslScene.elements,
            groups: dslScene.groups,
            timeline: dslScene.timeline
          }
        }]
      };
      
      return { success: true, mainState, summary: this.generateSummary(program, dslScene) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Human-readable summary (presentation-only)
   */
  private static generateSummary(program: ActionProgram, dslScene: DslScene): string {
    const setup = program.find(a => a.kind === 'SETUP');
    const seed = setup && setup.kind === 'SETUP' ? setup.seed : 0;

    const arrayElements = dslScene.elements.filter((el: any) => el.type === 'rectangle').length;
    const textElements = dslScene.elements.filter((el: any) => el.type === 'text').length;

    return `Generated visualization with ${arrayElements} array elements and ${textElements} text elements using seed ${seed}.`;
  }

  /**
   * Basic structural validation of the resulting scene
   */
  static validateScene(dslScene: DslScene): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dslScene.groups || dslScene.groups.length === 0) errors.push('Scene must contain at least one group');
    if (!dslScene.elements || dslScene.elements.length === 0) errors.push('Scene must contain at least one element');
    if (!dslScene.timeline) errors.push('Scene must have a timeline');

    for (const group of dslScene.groups) {
      if (!group.elementIds || group.elementIds.length === 0) errors.push(`Group ${group.id} has no elements`);
      for (const elementId of group.elementIds) {
        if (!dslScene.elements.find((el: any) => el.id === elementId)) errors.push(`Group ${group.id} references non-existent element ${elementId}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
