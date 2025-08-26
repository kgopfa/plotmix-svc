import { logger } from '../utils/logger';
import { ENGINE_SPEC } from '../specs/engine-spec';
import { sanitizeMovePropertiesInPlace } from '../utils/sanitize';
import { PipelineRunner } from '../orchestration/pipeline-runner';
import { validateLayoutCompilerOutput, logValidationResult } from '../schema/pipeline-validation';
import { validateElementsArray } from '../schema/elements';
import { assignAnimationIdentifiers } from '../schema/animations';

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

      // Final schema validation at end of pipeline (elements + animation identifiers)
      try {
        const sceneCanvas = doc.mainState?.scenes?.[0]?.sceneCanvas;
        if (!sceneCanvas) {
          logger.warn('Missing sceneCanvas in final document; skipping end-of-pipeline validation');
        } else {
          const elemRes = validateElementsArray(sceneCanvas.elements || []);
          if (!elemRes.valid || !elemRes.value) {
            logger.warn('Element array validation failed at pipeline end', { errors: elemRes.errors });
          } else {
            const assigned = assignAnimationIdentifiers(elemRes.value, sceneCanvas.groups || [], { recomputeDisplayNames: true });
            sceneCanvas.elements = assigned.elements;
            sceneCanvas.groups = assigned.groups;
          }
        }
      } catch (e) {
        logger.warn('Final element validation pass threw', { error: e instanceof Error ? e.message : String(e) });
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

  // validateDoc removed; validation now happens at the end of the pipeline

  private static generateDescription(scenes: any[]): string {
    if (!scenes.length) return 'A short conceptual flow.';
    return scenes.map(s => s.caption).join('; ');
  }
}
