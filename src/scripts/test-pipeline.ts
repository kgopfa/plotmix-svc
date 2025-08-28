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
    const elements = Array.isArray(mainState?.elements) ? mainState.elements.length : 0;
    const groups = Array.isArray(mainState?.groups) ? mainState.groups.length : 0;
    const duration = Number(mainState?.timeline?.duration) || 0;
    console.log('✅ Pipeline completed');
    console.log('Summary:', summary);
    console.log('Result:', { elements, groups, duration });
    // Print first few element ids for sanity
    const ids = (mainState?.elements || []).slice(0, 5).map((e: any) => e.id);
    console.log('Preview element ids:', ids);
    console.timeEnd('pipeline.total');
  } catch (err) {
    console.error('❌ Pipeline failed:', err instanceof Error ? err.message : String(err));
    console.timeEnd('pipeline.total');
    process.exitCode = 1;
  }
}

main();


