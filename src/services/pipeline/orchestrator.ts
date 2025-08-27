import { DslCompiler } from './dsl/compiler';
import { execute } from './dsl/executor';
import { LlmPipeline } from './llm';
import type { ActionProgram, Scene } from '../../types';

export interface PipelineResult {
  success: boolean;
  scene?: Scene;
  error?: string;
  summary?: string;
}

export class Orchestrator {
  /**
   * Generate a canvas scene from DSL input
   */
  static generateFromDsl(dsl: string): PipelineResult {
    try {
      const program = DslCompiler.compile(dsl);
      if (program.length === 0) {
        return { success: false, error: 'No valid actions found in DSL' };
      }

      const scene = execute(program);
      return { success: true, scene, summary: this.generateSummary(program, scene) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Generate a canvas scene using the full LLM pipeline (planner → visual → DSL → compile → execute)
   */
  static async generateFromPromptWithLLM(prompt: string): Promise<PipelineResult> {
    try {
      const llm = new LlmPipeline();
      const result = await llm.execute(prompt);

      if (!result.success) {
        return { success: false, error: `LLM pipeline failed: ${result.error}` };
      }

      if (!result.dsl) {
        return { success: false, error: 'LLM pipeline produced no DSL' };
      }

      const program = DslCompiler.compile(result.dsl);
      if (program.length === 0) {
        return { success: false, error: 'No valid actions found in LLM-generated DSL' };
      }

      const scene = execute(program);
      return { success: true, scene, summary: this.generateSummary(program, scene) };
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
    const canvas = setup && setup.kind === 'SETUP' ? setup.canvas : { width: 1280, height: 720 };

    const arrayElements = scene.elements.filter(el => el.type === 'rectangle').length;
    const textElements = scene.elements.filter(el => el.type === 'text').length;

    return `Generated visualization with ${arrayElements} array elements and ${textElements} text elements on ${canvas.width}x${canvas.height} canvas using seed ${seed}.`;
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
