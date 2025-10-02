/*
  Usage:
    pnpm ts-node src/scripts/test-pipeline.ts --dsl '{"scenes":[...]}'

  Requires env:
    - OPENAI_API_KEY
    - LLM_ROUTER_PROVIDER=openai
    - LLM_MODEL_PLANNER, LLM_MODEL_ENTITIES, LLM_MODEL_ACTIONS
*/

import { Orchestrator } from '../services/pipeline/orchestrator';

async function main() {
  const args = process.argv.slice(2);
  const isDslTest = args[0] === '--dsl';
  
  let result;
  let testType: string;
  
  if (isDslTest) {
    const dslInput = args.slice(1).join(' ').trim();
    if (!dslInput) {
      console.error('❌ --dsl flag requires DSL input');
      process.exit(1);
    }
    console.log('▶️  Testing DSL pipeline with scenes format');
    console.log('DSL Input:', dslInput.substring(0, 100) + (dslInput.length > 100 ? '...' : ''));
    testType = 'DSL';
    
    console.time('pipeline.total');
    console.time('pipeline.run');
    result = Orchestrator.generateFromDsl(dslInput);
    console.timeEnd('pipeline.run');
  } else {
    const prompt = args.join(' ').trim() || 'Illustrate how to solve Search in a rotated sorted array';
    console.log('▶️  Running LLM pipeline for prompt:', JSON.stringify(prompt));
    testType = 'LLM';
    
    console.time('pipeline.total');
    console.time('pipeline.run');
    result = await Orchestrator.generateFromPrompt(prompt);
    console.timeEnd('pipeline.run');
  }

  try {
    if (!result.success) {
      throw new Error(result.error || 'Pipeline failed');
    }

    const { mainState, summary } = result;
    const scenes = mainState?.scenes || [];
    const totalElements = scenes.reduce((sum, scene) => sum + scene.sceneCanvas.elements.length, 0);
    const totalGroups = scenes.reduce((sum, scene) => sum + scene.sceneCanvas.groups.length, 0);
    const duration = scenes.length > 0 && scenes[0] ? Number(scenes[0].sceneCanvas.timeline?.duration) || 0 : 0;
    
    console.log(`✅ ${testType} Pipeline completed successfully`);
    console.log('Summary:', summary);
    console.log('Result:', { 
      testType,
      scenes: scenes.length, 
      elements: totalElements, 
      groups: totalGroups, 
      duration: `${duration}s` 
    });
    
    // Detailed scene breakdown
    scenes.forEach((scene, index) => {
      const elementTypes = scene.sceneCanvas.elements.reduce((acc: any, el: any) => {
        acc[el.type] = (acc[el.type] || 0) + 1;
        return acc;
      }, {});
      
      console.log(`Scene ${index + 1}: ${scene.sceneName} (${scene.sceneId})`);
      console.log(`  - Elements: ${scene.sceneCanvas.elements.length} (${Object.entries(elementTypes).map(([type, count]) => `${count} ${type}`).join(', ')})`);
      console.log(`  - Groups: ${scene.sceneCanvas.groups.length}`);
      console.log(`  - Timeline: ${scene.sceneCanvas.timeline.duration}s`);
    });
    
    // Print first few element ids for sanity
    const allElements = scenes.flatMap(scene => scene.sceneCanvas.elements);
    const ids = allElements.slice(0, 5).map((e: any) => e.id);
    console.log('Preview element ids:', ids);
    console.timeEnd('pipeline.total');
  } catch (err) {
    console.error(`❌ ${testType || 'Pipeline'} failed:`, err instanceof Error ? err.message : String(err));
    console.timeEnd('pipeline.total');
    process.exitCode = 1;
  }
}

main();


