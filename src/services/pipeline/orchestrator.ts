import { DslCompiler } from './dsl/compiler';
import { execute } from './dsl/executor';
import { LlmPipeline } from './llm';
import type { ActionProgram, Scene } from '../../types';
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

      const scene = execute(program);

      // Validate elements using schema validation
      const validationResult = validateElementsArray(scene.sceneCanvas.elements);
      if (!validationResult.valid) {
        logger.error('Element validation failed:', { errors: validationResult.errors });
        throw new Error(`Element validation failed: ${validationResult.errors.join('; ')}`);
      }
      
      // Convert canvas scene to scene-based mainState
      if (!scene.sceneCanvas.elements || scene.sceneCanvas.elements.length === 0) {
        throw new Error('No elements found in scene. Scene must contain at least one element.');
      }

      const mainState = {
        dimensions: { width: 1920, height: 1080 },
        scenes: [{
          sceneId: scene.sceneId,
          sceneName: scene.sceneName,
          sceneCanvas: {
            elements: scene.sceneCanvas.elements,
            groups: scene.sceneCanvas.groups,
            timeline: scene.sceneCanvas.timeline
          }
        }]
      };
      
      return { success: true, mainState, summary: this.generateSummary(program, scene) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Human-readable summary (presentation-only)
   */
  private static generateSummary(program: ActionProgram, scene: Scene): string {
    const setup = program.find(a => a.kind === 'SETUP');
    const seed = setup && setup.kind === 'SETUP' ? setup.seed : 0;

    const arrayElements = scene.sceneCanvas.elements.filter((el: any) => el.type === 'rectangle').length;
    const textElements = scene.sceneCanvas.elements.filter((el: any) => el.type === 'text').length;

    return `Generated visualization with ${arrayElements} array elements and ${textElements} text elements using seed ${seed}.`;
  }

  /**
   * Basic structural validation of the resulting scene
   */
  static validateScene(scene: Scene): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!scene.sceneCanvas.groups || scene.sceneCanvas.groups.length === 0) errors.push('Scene must contain at least one group');
    if (!scene.sceneCanvas.elements || scene.sceneCanvas.elements.length === 0) errors.push('Scene must contain at least one element');
    if (!scene.sceneCanvas.timeline) errors.push('Scene must have a timeline');

    for (const group of scene.sceneCanvas.groups) {
      if (!group.elementIds || group.elementIds.length === 0) errors.push(`Group ${group.id} has no elements`);
      for (const elementId of group.elementIds) {
        if (!scene.sceneCanvas.elements.find((el: any) => el.id === elementId)) errors.push(`Group ${group.id} references non-existent element ${elementId}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
