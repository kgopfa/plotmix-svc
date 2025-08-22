import { logger } from '../utils/logger';
import { ENGINE_SPEC } from '../specs/engine-spec';
import { sanitizeMovePropertiesInPlace } from '../utils/sanitize';
import { PipelineRunner } from '../orchestration/pipeline-runner';

export class PipelineGenerationService {
  // --------- Pipeline orchestration ---------
  
  // Main public entry for the chained pipeline
  static async generateScene(userBrief: string): Promise<{
    name: string;
    title: string;
    description: string;
    mainState: { elements: any[]; groups: any[]; timeline: any };
  }> {
    try {
      logger.info('Starting pipeline execution', { promptLength: userBrief.length });
      
      // Execute the pipeline
      const pipelineResult = await PipelineRunner.runPipeline(userBrief);
      
      logger.info('Pipeline completed', {
        hasBrief: !!pipelineResult.brief,
        hasScenes: !!pipelineResult.scenePlanner?.scenes,
        hasSceneOutputs: !!pipelineResult.sceneOutputs,
        hasLayoutCompiler: !!pipelineResult.layoutCompiler,
      });

      // Extract the compiled result
      const composed = pipelineResult.layoutCompiler || {
        elements: [],
        groups: [],
        timeline: { scale: 1, duration: 3, currentTime: 0, animationStates: {} },
      };

      // Assemble final document
      let doc = {
        name: pipelineResult.scenePlanner?.scenes?.[0]?.id ?? 'scene',
        title: pipelineResult.scenePlanner?.scenes?.[0]?.caption ?? 'Scene',
        description: this.generateDescription(pipelineResult.scenePlanner?.scenes || []),
        mainState: {
          elements: composed.elements || [],
          groups: composed.groups || [],
          timeline: composed.timeline || { 
            scale: 1, 
            duration: 3, 
            currentTime: 0, 
            animationStates: {} 
          },
        },
      };

      // Sanitize move arrays -> single values before validation
      sanitizeMovePropertiesInPlace(doc);

      // Validate the result
      const validationResult = this.validateDoc(doc);
      if (!validationResult.valid) {
        logger.error('Pipeline output validation failed', { errors: validationResult.errors });
        throw new Error(`Pipeline output validation failed:\n- ${validationResult.errors.join('\n- ')}`);
      }

      logger.info('Pipeline generation completed successfully', {
        elementCount: doc.mainState.elements.length,
        groupCount: doc.mainState.groups.length,
      });

      return doc;
      
    } catch (error) {
      logger.error('Pipeline generation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  // --------- Helper methods ---------

  static getAuthoritativeEngineSpec(): string {
    return ENGINE_SPEC;
  }

  private static validateDoc(doc: any) {
    // Placeholder - would validate against ENGINE_SPEC
    // For now, just check if doc has the required structure
    const hasRequiredStructure = doc && 
      typeof doc === 'object' && 
      doc.mainState && 
      Array.isArray(doc.mainState.elements);
    
    return { 
      valid: hasRequiredStructure, 
      errors: hasRequiredStructure ? [] : ['Missing required structure'], 
      patchHints: [] 
    };
  }

  private static generateDescription(scenes: any[]): string {
    if (!scenes.length) return 'A short conceptual flow.';
    return scenes.map(s => s.caption).join('; ');
  }
}
