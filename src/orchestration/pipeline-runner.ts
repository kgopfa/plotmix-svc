import { logger } from '../utils/logger';
import { PipelineClient } from '../clients/pipeline.client';
import { PerSceneFanOutOrchestrator } from './per-scene-fanout';
import { Brief, IntentReducerOutput, ScenePlan, SceneOut, PipelineState } from './langgraph/types';

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

      // 5. Scene Processor - process each scene (placeholder for now)
      const sceneProcessor = await this.runSceneProcessor(sceneOutputs);
      logger.info('Scene Processor completed', { processedScenes: sceneProcessor.processedScenes });

      // 6. Layout Compiler - compile final layout (placeholder for now)
      const layoutCompiler = await this.runLayoutCompiler(sceneProcessor.processedScenes);
      logger.info('Layout Compiler completed');

      const result: PipelineState = {
        userText,
        brief,
        intentReducer,
        scenePlanner,
        sceneOutputs,
        designAssets: [],
        layoutCompiler,
        finalDoc: {
          name: '1',
          title: sceneOutputs.map(s => s.steps.map(step => step.text).join('; ')).join('; '),
          description: sceneOutputs.map(s => s.steps.map(step => step.text).join('; ')).join('; '),
          mainState: {
            elements: layoutCompiler.elements,
            groups: layoutCompiler.groups,
            timeline: layoutCompiler.timeline
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
    
    const system = 'Reduce the prompt to a single domain and 3–5 core flows. Return JSON only.';
    const user = `Domain: ["process_flow","lifecycle_cycle","hierarchy_parts","comparison_tradeoff","timeline_sequence","map_topology","cause_effect","algorithm_trace"]\nCore Flows: ["flow1","flow2","flow3"]\nReturn JSON: {"domain":"...","core_flows":[...], "tone":"concise|friendly|formal"}\nPrompt: ${userText}\nArchetypes: ${JSON.stringify(brief.archetypes)}\nTone: ${brief.tone}`;
    
    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], 'intentReducer', { json: false, attempts: 2 });

    // Try to parse the result as JSON even if response_format wasn't used
    try {
      return JSON.parse(result) as IntentReducerOutput;
    } catch (parseError) {
      logger.error('Failed to parse intent reducer response as JSON', { 
        result, 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
      throw new Error(`Intent Reducer failed to generate valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  }

  private static async runRouter(userText: string): Promise<Brief> {
    const system = 'Classify the prompt into 1–2 archetypes and a tone. Return JSON only.';
    const user = `Archetypes: ["process_flow","lifecycle_cycle","hierarchy_parts","comparison_tradeoff","timeline_sequence","map_topology","cause_effect","algorithm_trace"]\nReturn JSON: {"archetypes":[...], "tone":"concise|friendly|formal"}\nPrompt: ${userText}\nConstraints: Archetypes must be relevant to the prompt and the tone must be appropriate.`;
    
    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], 'router', { json: false, attempts: 2 });

    // Try to parse the result as JSON even if response_format wasn't used
    try {
      return JSON.parse(result);
    } catch (parseError) {
      logger.error('Failed to parse router response as JSON', { 
        result, 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
      throw new Error(`Router failed to generate valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  }

  private static async runScenePlanner(brief: Brief, intentReducer: IntentReducerOutput, userText: string): Promise<{ scenes: ScenePlan[] }> {
    if (!brief.archetypes?.length) {
      throw new Error('No archetypes available from Router stage');
    }
    
    if (!intentReducer.core_flows?.length) {
      throw new Error('No core flows available from Intent Reducer stage');
    }
    
    const system = 'Create one scene per core flow. Each scene should represent a specific flow and use an appropriate archetype. Return JSON only.';
    const user = `Archetypes: ${JSON.stringify(brief.archetypes)}\nCore Flows: ${JSON.stringify(intentReducer.core_flows)}\nConstraints: Create exactly ${intentReducer.core_flows.length} scenes, one per core flow; each scene.goal ∈ archetypes; captions ≤12 words.\nReturn: {"scenes":[{"id":"...","goal":"...","caption":"..."}]}\nPrompt: ${userText}\nTone: ${brief.tone}`;
    
    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], 'scenePlanner', { json: false, attempts: 2 });

    // Try to parse the result as JSON even if response_format wasn't used
    try {
      return JSON.parse(result);
    } catch (parseError) {
      logger.error('Failed to parse scene planner response as JSON', { 
        result, 
        error: parseError instanceof Error ? parseError.message : String(parseError) 
      });
      throw new Error(`Scene Planner failed to generate valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
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

  private static async runSceneProcessor(sceneOutputs: SceneOut[]): Promise<{ processedScenes: SceneOut[] }> {
    // This is a placeholder for the full scene processing
    // In the full implementation, this would run all the per-scene nodes in parallel
    logger.info('Processing scenes', { sceneCount: sceneOutputs.length });
    
    return { processedScenes: sceneOutputs };
  }

  private static async runLayoutCompiler(sceneOutputs: SceneOut[]): Promise<{
    elements: any[];
    groups: any[];
    timeline: any;
  }> {
    // This is a placeholder for the layout grammar and compiler
    // In the full implementation, this would map archetypes to layouts and compile to ENGINE_SPEC
    logger.info('Running layout compiler', { sceneCount: sceneOutputs.length });
    
    return {
      elements: [],
      groups: [],
      timeline: { scale: 1, duration: 3, currentTime: 0, animationStates: {} },
    };
  }
}
