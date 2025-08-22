import { PipelineClient } from '../../clients/pipeline.client';
import { 
  RouterNode, 
  ScenePlannerNode, 
  SceneProcessorNode,
  LayoutCompilerNode,
  PipelineState 
} from './types';
import { logger } from '../../utils/logger';

export const routerNode: RouterNode = async (state: PipelineState): Promise<Partial<PipelineState>> => {
  const client = PipelineClient.getInstance();
  const system = 'Classify the prompt into 1–2 archetypes and a tone. Return JSON only.';
  const user = `Archetypes: ["process_flow","lifecycle_cycle","hierarchy_parts","comparison_tradeoff","timeline_sequence","map_topology","cause_effect","algorithm_trace"]\nReturn JSON: {"archetypes":[...], "tone":"concise|friendly|formal"}\nPrompt: ${state.userText}`;
  
  try {
    const result = await client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], 'router', { json: true, attempts: 2 });

    logger.info('Router node completed', { 
      archetypes: result.archetypes, 
      tone: result.tone 
    });

    return { brief: result };
  } catch (error) {
    logger.error('Router node failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};

export const scenePlannerNode: ScenePlannerNode = async (state: PipelineState): Promise<Partial<PipelineState>> => {
  if (!state.brief) {
    throw new Error('Router must complete before ScenePlanner');
  }

  const client = PipelineClient.getInstance();
  const archetypes = state.brief.archetypes?.length ? state.brief.archetypes : ['process_flow'];
  const system = 'Propose 3–6 scenes with short captions using only the provided archetypes. Return JSON only.';
  const user = `Archetypes: ${JSON.stringify(archetypes)}\nConstraints: Each scene.goal ∈ archetypes; captions ≤12 words; 3–6 scenes.\nReturn: {"scenes":[{"id":"...","goal":"...","caption":"..."}]}\nPrompt: ${state.userText}\nTone: ${state.brief.tone}`;
  
  try {
    const result = await client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], 'scenePlanner', { json: true, attempts: 2 });

    logger.info('ScenePlanner node completed', { 
      sceneCount: result.scenes?.length || 0,
      sceneIds: result.scenes?.map((s: any) => s.id) || []
    });

    return { scenePlanner: result };
  } catch (error) {
    logger.error('ScenePlanner node failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};

export const sceneProcessorNode: SceneProcessorNode = async (state: PipelineState): Promise<Partial<PipelineState>> => {
  if (!state.scenePlanner?.scenes) {
    throw new Error('ScenePlanner must complete before SceneProcessor');
  }

  logger.info('SceneProcessor node starting', { 
    sceneCount: state.scenePlanner.scenes.length 
  });

  // This is a placeholder for the full scene processing
  // In the full implementation, this would run all the per-scene nodes in parallel
  const sceneOutputs = state.scenePlanner.scenes.map(scene => ({
    scene_id: scene.id,
    steps: [],
    transitions: [],
  }));

  logger.info('SceneProcessor node completed', { 
    processedScenes: sceneOutputs.length 
  });

  return { sceneOutputs };
};

export const layoutCompilerNode: LayoutCompilerNode = async (state: PipelineState): Promise<Partial<PipelineState>> => {
  if (!state.sceneOutputs) {
    throw new Error('SceneProcessor must complete before LayoutCompiler');
  }

  logger.info('LayoutCompiler node starting', { 
    sceneCount: state.sceneOutputs.length 
  });

  // This is a placeholder for the layout grammar and compiler
  // In the full implementation, this would map archetypes to layouts and compile to ENGINE_SPEC
  const layoutCompiler = {
    elements: [],
    groups: [],
    timeline: { scale: 1, duration: 3, currentTime: 0, animationStates: {} },
  };

  logger.info('LayoutCompiler node completed');

  return { layoutCompiler };
};


