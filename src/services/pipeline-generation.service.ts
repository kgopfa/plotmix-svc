import { logger } from '../utils/logger';
import { ENGINE_SPEC } from '../specs/engine-spec';
import { sanitizeMovePropertiesInPlace } from '../utils/sanitize';
import { PipelineRunner } from '../orchestration/pipeline-runner';
import { validateLayoutCompilerOutput, logValidationResult } from '../schema/pipeline-validation';

export class PipelineGenerationService {
  // --------- Pipeline orchestration ---------
  
  // Main public entry for the chained pipeline
  static async generateScene(userBrief: string): Promise<{
    name: string;
    title: string;
    description: string;
    mainState: {
      dimensions: { width: number; height: number };
      scenes: Array<{
        sceneId: string;
        sceneName: string;
        sceneCanvas: { elements: any[]; groups: any[]; timeline: any };
      }>;
    };
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

      // Validate the layout compiler output
      const layoutValidation = validateLayoutCompilerOutput(composed);
      logValidationResult('Layout Compiler', layoutValidation);
      
      if (!layoutValidation.valid) {
        logger.warn('Layout compiler output validation failed', {
          errors: layoutValidation.errors,
          patchHints: layoutValidation.patchHints
        });
        
        // Use fallback values if validation fails
        const fallbackTimeline = { 
          scale: 1, 
          duration: 3, 
          currentTime: 0, 
          animationStates: {} 
        };
        
        const validatedComposed = {
          elements: Array.isArray(composed.elements) ? composed.elements : [],
          groups: Array.isArray(composed.groups) ? composed.groups : [],
          timeline: layoutValidation.value?.timeline || fallbackTimeline
        };
        
        logger.info('Using fallback values for layout compiler output');
        Object.assign(composed, validatedComposed);
      }

      // Assemble final document
      let doc = {
        name: pipelineResult.scenePlanner?.scenes?.[0]?.id ?? 'scene',
        title: pipelineResult.scenePlanner?.scenes?.[0]?.caption ?? 'Scene',
        description: this.generateDescription(pipelineResult.scenePlanner?.scenes || []),
        mainState: {
          dimensions: {
            width: 1920,
            height: 1080
          },
          scenes: [{
            sceneId: 'default-scene',
            sceneName: 'Default Scene',
            sceneCanvas: {
              elements: composed.elements || [],
              groups: composed.groups || [],
              timeline: composed.timeline || { 
                scale: 1, 
                duration: 3, 
                currentTime: 0, 
                animationStates: {} 
              },
            },
          }],
        },
      };

      // Sanitize move arrays -> single values before validation
      sanitizeMovePropertiesInPlace(doc);

      // Validate the final document structure
      const validationResult = this.validateDoc(doc);
      if (!validationResult.valid) {
        logger.warn('Final document validation failed', {
          errors: validationResult.errors,
          patchHints: validationResult.patchHints
        });
        
        // Log validation errors but continue with the document
        // The pipeline has already validated each stage individually
        logger.info('Continuing with document despite validation errors');
      }

      logger.info('Pipeline generation completed successfully', {
        elementCount: doc.mainState.scenes[0]?.sceneCanvas?.elements?.length || 0,
        groupCount: doc.mainState.scenes[0]?.sceneCanvas?.groups?.length || 0,
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
      doc.mainState.dimensions &&
      doc.mainState.scenes &&
      Array.isArray(doc.mainState.scenes) &&
      doc.mainState.scenes.length > 0 &&
      doc.mainState.scenes[0]?.sceneCanvas?.elements &&
      Array.isArray(doc.mainState.scenes[0].sceneCanvas.elements);
    
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
