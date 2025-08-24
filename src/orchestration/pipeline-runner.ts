import { logger } from '../utils/logger';
import { PipelineClient } from '../clients/pipeline.client';
import { PerSceneFanOutOrchestrator } from './per-scene-fanout';
import { Brief, IntentReducerOutput, ScenePlan, SceneOut, PipelineState } from './pipeline/types';
import {
  validateRouterOutput,
  validateIntentReducerOutput,
  validateScenePlannerOutput,
  logValidationResult,
  createValidationSummary
} from '../schema/pipeline-validation';
import { createProceduralCompiler } from './procedural';

export class PipelineRunner {
  private static client = PipelineClient.getInstance();

  static async runPipeline(userText: string): Promise<PipelineState> {
    try {
      logger.info('Starting pipeline execution', { userTextLength: userText.length });
      
      // 1. Router - determine archetypes and tone (universal structure first)
      const brief = await this.runRouter(userText);
      logger.info('Router completed', { archetypes: brief.archetypes, tone: brief.tone });
      
      // 2. Intent Reducer - understand domain and core flows (specific context second)
      const intentReducer = await this.runIntentReducer(userText, brief);
      logger.info('Intent Reducer completed', { 
        domain: intentReducer.domain, 
        coreFlows: intentReducer.core_flows, 
        tone: intentReducer.tone 
      });
      
      // 3. Scene Planner - produce scene captions based on core flows
      const scenePlanner = await this.runScenePlanner(brief, intentReducer, userText);
      logger.info('Scene Planner completed', { sceneCount: scenePlanner.scenes.length });

      // 4. Per-scene Fan-out - break down each scene into detailed steps (parallel)
      const sceneOutputs = await this.runPerSceneFanOut(scenePlanner.scenes, brief, intentReducer);
      logger.info('Per-scene Fan-out completed', { sceneCount: sceneOutputs.length });

      // 5. Scene Processor - process each scene using procedural generation
      const sceneProcessor = await this.runSceneProcessor(sceneOutputs, brief);
      logger.info('Scene Processor completed', { processedScenes: sceneProcessor.processedScenes });

      // 6. Layout Compiler - compile final layout using procedural generation
      const layoutCompiler = await this.runLayoutCompiler(sceneProcessor.processedScenes, brief);
      logger.info('Layout Compiler completed');

      const result: PipelineState = {
        userText,
        brief,
        intentReducer,
        scenePlanner,
        sceneOutputs,
        designAssets: {
          scene_id: 'default-scene'
        },
        layoutCompiler,
        finalDoc: {
          name: '1',
          title: sceneOutputs.map(s => s.steps.map(step => step.text).join('; ')).join('; '),
          description: sceneOutputs.map(s => s.steps.map(step => step.text).join('; ')).join('; '),
          mainState: {
            dimensions: {
              width: 1920,
              height: 1080
            },
            scenes: [{
              sceneId: 'default-scene',
              sceneName: 'Default Scene',
              sceneCanvas: {
                elements: layoutCompiler.elements,
                groups: layoutCompiler.groups,
                timeline: layoutCompiler.timeline
              }
            }]
          }
        }
      };
      
      logger.info('Pipeline execution completed successfully', {
        hasBrief: !!result.brief,
        hasIntentReducer: !!result.intentReducer,
        hasScenes: !!result.scenePlanner?.scenes,
        hasSceneOutputs: !!result.sceneOutputs,
        hasLayoutCompiler: !!result.layoutCompiler,
      });

      return result;
      
    } catch (error) {
      logger.error('Pipeline execution failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  private static async runIntentReducer(userText: string, brief: Brief): Promise<IntentReducerOutput> {
    if (!brief.archetypes?.length) {
      throw new Error('No archetypes available from Router stage');
    }
    
    const system = 'Extract domain and core flows from the prompt. Return ONLY valid JSON with exact format.';
    const user = `REQUIREMENTS:
- domain: Must be a non-empty descriptive string (e.g., "social_network", "ecommerce", "healthcare")
- core_flows: Must be an array with 3-5 flow names (descriptive strings)
- tone: Must match the provided tone exactly

REQUIRED FORMAT:
{"domain":"descriptive_domain","core_flows":["flow1","flow2","flow3"],"tone":"${brief.tone}"}

EXAMPLE:
{"domain":"user_authentication","core_flows":["credential_input","verification_process","response_generation"],"tone":"${brief.tone}"}

CONTEXT:
- User Prompt: ${userText}
- Selected Archetypes: ${JSON.stringify(brief.archetypes)}
- Required Tone: ${brief.tone}

Return valid JSON only - no explanation:`;
    
    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], 'intentReducer', { json: false, attempts: 2 });

    // Try to parse the result as JSON even if response_format wasn't used
    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      logger.error('Failed to parse intent reducer response as JSON', { 
        result, 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
      throw new Error(`Intent Reducer failed to generate valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // Validate the parsed result
    const validation = validateIntentReducerOutput(parsed);
    logValidationResult('Intent Reducer', validation);
    
    if (!validation.valid) {
      // Try to retry with validation error summary
      logger.warn('Intent Reducer validation failed, attempting retry with error summary', {
        errors: validation.errors,
        patchHints: validation.patchHints
      });
      
      const retryUser = `${user}\n\n${createValidationSummary(validation)}`;
      const retryResult = await this.client.callLLM([
        { role: 'system', content: system },
        { role: 'user', content: retryUser },
      ], 'intentReducer', { json: false, attempts: 1 });
      
      try {
        const retryParsed = JSON.parse(retryResult);
        const retryValidation = validateIntentReducerOutput(retryParsed);
        logValidationResult('Intent Reducer (retry)', retryValidation);
        
        if (retryValidation.valid && retryValidation.value) {
          return retryValidation.value;
        }
      } catch (retryParseError) {
        logger.error('Intent Reducer retry also failed to parse', { retryResult, error: retryParseError });
      }
      
      throw new Error(`Intent Reducer stage failed validation after retry: ${validation.errors.join('; ')}`);
    }

    return validation.value!;
  }

  private static async runRouter(userText: string): Promise<Brief> {
    const system = 'Classify the prompt into 1–2 archetypes and a tone. Return ONLY valid JSON with exact format.';
    const user = `VALID ARCHETYPES (choose 1-2): ["process_flow","lifecycle_cycle","hierarchy_parts","comparison_tradeoff","timeline_sequence","map_topology","cause_effect","algorithm_trace"]
VALID TONES (choose 1): ["concise","friendly","formal"]

REQUIRED FORMAT (return exactly this structure):
{"archetypes":["selected_archetype"],"tone":"selected_tone"}

EXAMPLE:
{"archetypes":["process_flow","hierarchy_parts"],"tone":"concise"}

USER PROMPT: ${userText}

Return valid JSON only - no explanation:`;
    
    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], 'router', { json: false, attempts: 2 });

    // Try to parse the result as JSON even if response_format wasn't used
    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      logger.error('Failed to parse router response as JSON', { 
        result, 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
      throw new Error(`Router failed to generate valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // Validate the parsed result
    const validation = validateRouterOutput(parsed);
    logValidationResult('Router', validation);
    
    if (!validation.valid) {
      // Try to retry with validation error summary
      logger.warn('Router validation failed, attempting retry with error summary', {
        errors: validation.errors,
        patchHints: validation.patchHints
      });
      
      const retryUser = `${user}\n\n${createValidationSummary(validation)}`;
      const retryResult = await this.client.callLLM([
        { role: 'system', content: system },
        { role: 'user', content: retryUser },
      ], 'router', { json: false, attempts: 1 });
      
      try {
        const retryParsed = JSON.parse(retryResult);
        const retryValidation = validateRouterOutput(retryParsed);
        logValidationResult('Router (retry)', retryValidation);
        
        if (retryValidation.valid && retryValidation.value) {
          return retryValidation.value;
        }
      } catch (retryParseError) {
        logger.error('Router retry also failed to parse', { retryResult, error: retryParseError });
      }
      
      throw new Error(`Router stage failed validation after retry: ${validation.errors.join('; ')}`);
    }

    return validation.value!;
  }

  private static async runScenePlanner(brief: Brief, intentReducer: IntentReducerOutput, userText: string): Promise<{ scenes: ScenePlan[] }> {
    if (!brief.archetypes?.length) {
      throw new Error('No archetypes available from Router stage');
    }
    
    if (!intentReducer.core_flows?.length) {
      throw new Error('No core flows available from Intent Reducer stage');
    }
    
    const system = 'Create scenes for each core flow. Return ONLY valid JSON with exact format.';
    const user = `REQUIREMENTS:
- Create exactly ${intentReducer.core_flows.length} scenes (one per core flow)
- Each scene must have: id (non-empty string), goal (from archetypes), caption (≤12 words)
- Scene count must be 3-6 scenes total
- Each goal must be one of the provided archetypes

VALID ARCHETYPES: ${JSON.stringify(brief.archetypes)}
CORE FLOWS: ${JSON.stringify(intentReducer.core_flows)}

REQUIRED FORMAT:
{"scenes":[{"id":"scene1","goal":"archetype_name","caption":"short description"}]}

EXAMPLE:
{"scenes":[{"id":"auth_flow","goal":"process_flow","caption":"User authentication process"},{"id":"data_proc","goal":"hierarchy_parts","caption":"Data processing workflow"}]}

CAPTION RULES:
- Maximum 12 words per caption
- Be concise and descriptive
- Focus on the core concept

USER PROMPT: ${userText}
TONE: ${brief.tone}

Return valid JSON only - no explanation:`;
    
    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], 'scenePlanner', { json: false, attempts: 2 });

    // Try to parse the result as JSON even if response_format wasn't used
    let parsed: any;
    try {
      parsed = JSON.parse(result);
    } catch (parseError) {
      logger.error('Failed to parse scene planner response as JSON', { 
        result, 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
      throw new Error(`Scene Planner failed to generate valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    // Validate the parsed result
    const validation = validateScenePlannerOutput(parsed);
    logValidationResult('Scene Planner', validation);
    
    if (!validation.valid) {
      // Try to retry with validation error summary
      logger.warn('Scene Planner validation failed, attempting retry with error summary', {
        errors: validation.errors,
        patchHints: validation.patchHints
      });
      
      const retryUser = `${user}\n\n${createValidationSummary(validation)}`;
      const retryResult = await this.client.callLLM([
        { role: 'system', content: system },
        { role: 'user', content: retryUser },
      ], 'scenePlanner', { json: false, attempts: 1 });
      
      try {
        const retryParsed = JSON.parse(retryResult);
        const retryValidation = validateScenePlannerOutput(retryParsed);
        logValidationResult('Scene Planner (retry)', retryValidation);
        
        if (retryValidation.valid && retryValidation.value) {
          return retryValidation.value;
        }
      } catch (retryParseError) {
        logger.error('Scene Planner retry also failed to parse', { retryResult, error: retryParseError });
      }
      
      throw new Error(`Scene Planner stage failed validation after retry: ${validation.errors.join('; ')}`);
    }

    return validation.value!;
  }

  private static async runPerSceneFanOut(scenes: ScenePlan[], brief: Brief, intentReducer: IntentReducerOutput): Promise<SceneOut[]> {
    if (!brief.archetypes?.length) {
      throw new Error('No archetypes available from Router stage');
    }
    
    if (!intentReducer.core_flows?.length) {
      throw new Error('No core flows available from Intent Reducer stage');
    }
    
    if (!scenes?.length) {
      throw new Error('No scenes available from Scene Planner stage');
    }

    const perSceneFanOutOrchestrator = PerSceneFanOutOrchestrator.getInstance();
    
    // Process all scenes in parallel for better performance
    const scenePromises = scenes.map(scene => 
      perSceneFanOutOrchestrator.processScene(scene, brief.archetypes)
    );
    
    const sceneOutputs = await Promise.all(scenePromises);
    return sceneOutputs;
  }

  private static async runSceneProcessor(sceneOutputs: SceneOut[], brief: Brief): Promise<{ processedScenes: SceneOut[] }> {
    // Process scenes using procedural generation
    logger.info('Processing scenes with procedural generation', { sceneCount: sceneOutputs.length });
    
    try {
      // Get tone from the brief
      const tone = brief.tone || 'concise';
      
      // Process each scene to add procedural enhancements
      const processedScenes = sceneOutputs.map(scene => {
        // For now, return the scene as-is but with procedural metadata
        // In the future, this could include:
        // - Asset binding
        // - Theme selection
        // - Scene-level processing
        return {
          ...scene,
          // Add procedural metadata
          _procedural: {
            theme: tone,
            seed: `scene:${scene.scene_id}`,
            archetype: this.determineSceneArchetype(scene)
          }
        };
      });
      
      logger.info('Scene processing completed', { processedCount: processedScenes.length });
      return { processedScenes };
      
    } catch (error) {
      logger.error('Scene processing failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Fallback to original scenes
      return { processedScenes: sceneOutputs };
    }
  }

  private static determineSceneArchetype(scene: SceneOut): string {
    // Determine archetype based on scene content
    // This is a simple heuristic - could be enhanced with more sophisticated logic
    if (scene.steps.some(step => step.text.toLowerCase().includes('flow') || step.text.toLowerCase().includes('process'))) {
      return 'process_flow';
    }
    if (scene.steps.some(step => step.text.toLowerCase().includes('compare') || step.text.toLowerCase().includes('vs'))) {
      return 'comparison_tradeoff';
    }
    if (scene.steps.some(step => step.text.toLowerCase().includes('timeline') || step.text.toLowerCase().includes('sequence'))) {
      return 'timeline_sequence';
    }
    if (scene.steps.some(step => step.text.toLowerCase().includes('hierarchy') || step.text.toLowerCase().includes('tree'))) {
      return 'hierarchy_parts';
    }
    if (scene.steps.some(step => step.text.toLowerCase().includes('map') || step.text.toLowerCase().includes('topology'))) {
      return 'map_topology';
    }
    if (scene.steps.some(step => step.text.toLowerCase().includes('cause') || step.text.toLowerCase().includes('effect'))) {
      return 'cause_effect';
    }
    if (scene.steps.some(step => step.text.toLowerCase().includes('algorithm') || step.text.toLowerCase().includes('trace'))) {
      return 'algorithm_trace';
    }
    if (scene.steps.some(step => step.text.toLowerCase().includes('lifecycle') || step.text.toLowerCase().includes('cycle'))) {
      return 'lifecycle_cycle';
    }
    
    // Default to process_flow
    return 'process_flow';
  }

  private static async runLayoutCompiler(sceneOutputs: SceneOut[], brief: Brief): Promise<{
    elements: any[];
    groups: any[];
    timeline: any;
  }> {
    // Use procedural generation to compile scenes to ENGINE_SPEC
    logger.info('Running procedural layout compiler', { sceneCount: sceneOutputs.length });
    
    try {
      // Get tone from the brief
      const tone = brief.tone || 'concise';
      
      // Create procedural compiler
      const compiler = createProceduralCompiler(tone);
      
      // Compile all scenes
      const result = await compiler.compileScenes(sceneOutputs, 'default-project', tone);
      
      logger.info('Procedural compilation completed', {
        elementCount: result.elements.length,
        groupCount: result.groups.length,
        timelineDuration: result.timeline.duration
      });
      
      return {
        elements: result.elements,
        groups: result.groups,
        timeline: result.timeline,
      };
      
    } catch (error) {
      logger.error('Procedural compilation failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Fallback to placeholder
      return {
        elements: [],
        groups: [],
        timeline: { scale: 1, duration: 3, currentTime: 0, animationStates: {} },
      };
    }
  }
}
