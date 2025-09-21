/*
  Usage:
    pnpm ts-node src/scripts/test-pipeline.ts "Design a rate limiter"

  Requires env:
    - OPENAI_API_KEY
    - LLM_ROUTER_PROVIDER=openai
    - LLM_MODEL_PLANNER, LLM_MODEL_ENTITIES, LLM_MODEL_ACTIONS
*/

import { Orchestrator } from '../services/pipeline/orchestrator';

async function main() {
  const prompt = process.argv.slice(2).join(' ').trim() || 'Illustrate how to solve Search in a rotated sorted array';
  console.log('▶️  Running pipeline for prompt:', JSON.stringify(prompt));
  console.time('pipeline.total');

  try {
    console.time('pipeline.run');
    const { mainState, summary } = await Orchestrator.generateFromPrompt(prompt);
    console.timeEnd('pipeline.run');
    
    const scenes = mainState?.scenes || [];
    const totalElements = scenes.reduce((sum, scene) => sum + scene.sceneCanvas.elements.length, 0);
    const totalGroups = scenes.reduce((sum, scene) => sum + scene.sceneCanvas.groups.length, 0);
    const duration = scenes.length > 0 && scenes[0] ? Number(scenes[0].sceneCanvas.timeline?.duration) || 0 : 0;
    
    console.log('✅ Pipeline completed');
    console.log('Summary:', summary);
    console.log('Result:', { scenes: scenes.length, elements: totalElements, groups: totalGroups, duration });
    
    // Print first few element ids for sanity
    const allElements = scenes.flatMap(scene => scene.sceneCanvas.elements);
    const ids = allElements.slice(0, 5).map((e: any) => e.id);
    console.log('Preview element ids:', ids);
    console.timeEnd('pipeline.total');
  } catch (err) {
    console.error('❌ Pipeline failed:', err instanceof Error ? err.message : String(err));
    console.timeEnd('pipeline.total');
    process.exitCode = 1;
  }
}

main();


