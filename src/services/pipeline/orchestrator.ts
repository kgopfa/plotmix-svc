import { DslCompiler } from './dsl/compiler';
import { execute } from './dsl/executor';
import { LlmPipeline } from './llm';
import type { ActionProgram, Scene } from '../../types';
import { validateElementsArray } from '../../schema/elements';
import { logger } from '../../utils/logger';

export interface PipelineResult {
  success: boolean;
  mainState?: Scene;
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
  private static generateFromDsl(dsl: string): PipelineResult {
    try {
      logger.info(`Generating from DSL: ${dsl}`);
      const program = DslCompiler.compile(dsl);
      if (program.length === 0) {
        return { success: false, error: 'No valid actions found in DSL' };
      }

      logger.info(`Compiled program: ${program}`);

      const scene = execute(program);

      logger.info(`Executed program: ${scene}`);

      // Validate elements using schema validation
      const validationResult = validateElementsArray(scene.elements);
      if (!validationResult.valid) {
        logger.error('Element validation failed:', { errors: validationResult.errors });
        throw new Error(`Element validation failed: ${validationResult.errors.join('; ')}`);
      }
      
      // TEMPORARY DEBUG LOG - log the generated scene after validation
      logger.info('🔍 DEBUG: Generated scene after validation:', {
        elementsCount: scene.elements.length,
        groupsCount: scene.groups.length,
        elements: scene.elements.map(el => ({
          id: el.id,
          type: el.type,
          name: el.name,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          fontFamily: el.type === 'text' ? (el as any).fontFamily : undefined,
          fontWeight: el.type === 'text' ? (el as any).fontWeight : undefined
        })),
        groups: scene.groups.map(g => ({
          id: g.id,
          name: g.name,
          elementIds: g.elementIds,
          elementCount: g.elementIds.length
        }))
      });
      
      return { success: true, mainState: scene, summary: this.generateSummary(program, scene) };
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

    const arrayElements = scene.elements.filter(el => el.type === 'rectangle').length;
    const textElements = scene.elements.filter(el => el.type === 'text').length;

    return `Generated visualization with ${arrayElements} array elements and ${textElements} text elements using seed ${seed}.`;
  }

  /**
   * Basic structural validation of the resulting scene
   */
  static validateScene(scene: Scene): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!scene.groups || scene.groups.length === 0) errors.push('Scene must contain at least one group');
    if (!scene.elements || scene.elements.length === 0) errors.push('Scene must contain at least one element');
    if (!scene.timeline) errors.push('Scene must have a timeline');

    for (const group of scene.groups) {
      if (!group.elementIds || group.elementIds.length === 0) errors.push(`Group ${group.id} has no elements`);
      for (const elementId of group.elementIds) {
        if (!scene.elements.find(el => el.id === elementId)) errors.push(`Group ${group.id} references non-existent element ${elementId}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
