#!/usr/bin/env ts-node

/**
 * Example: Using the Procedural Generation System
 * Shows how to integrate procedural generation into your pipeline
 */

import { logger } from '../utils/logger';
import { createProceduralCompiler } from '../orchestration/procedural';
import { Entity, Relation } from '../orchestration/pipeline/types';

// Example: Generate a simple process flow diagram
async function generateProcessFlow() {
  logger.info('🚀 Generating Process Flow Diagram');
  
  // Define your entities and relations
  const entities: Entity[] = [
    { id: 'start', type: 'event', label: 'Start' },
    { id: 'input', type: 'container', label: 'Input Data' },
    { id: 'process', type: 'process', label: 'Process Data' },
    { id: 'output', type: 'container', label: 'Output Result' },
    { id: 'end', type: 'event', label: 'End' }
  ];
  
  const relations: Relation[] = [
    { from: 'start', to: 'input', label: 'triggers' },
    { from: 'input', to: 'process', label: 'feeds' },
    { from: 'process', to: 'output', label: 'produces' },
    { from: 'output', to: 'end', label: 'completes' }
  ];
  
  // Create the scene
  // Note: SceneOut is defined but not used in this example
  // The compiler works directly with entities and relations
  
  // Create compiler and generate
  const compiler = createProceduralCompiler('concise');
  
  try {
    const result = await compiler.compileScene({
      projectId: 'example-project',
      sceneId: 'process-flow-example',
      archetype: 'process_flow',
      tone: 'concise',
      entities,
      relations,
      theme: compiler['theme'],
      seed: 'example-project:process-flow-example'
    });
    
    logger.info('✅ Process flow generated successfully!');
    logger.info('Generated elements:', result.elements.length);
    logger.info('Timeline duration:', result.timeline.duration, 'seconds');
    
    // Show element details
    result.elements.forEach((element, index) => {
      logger.info(`Element ${index + 1}: ${element.name} at (${element.x}, ${element.y})`);
    });
    
    return result;
    
  } catch (error) {
    logger.error('❌ Failed to generate process flow:', error);
    throw error;
  }
}

// Example: Generate a comparison diagram
async function generateComparisonDiagram() {
  logger.info('🔄 Generating Comparison Diagram');
  
  const entities: Entity[] = [
    { id: 'option1', type: 'container', label: 'Option A' },
    { id: 'option2', type: 'container', label: 'Option B' },
    { id: 'pro1a', type: 'process', label: 'Pro A1' },
    { id: 'pro1b', type: 'process', label: 'Pro A2' },
    { id: 'pro2a', type: 'process', label: 'Pro B1' },
    { id: 'pro2b', type: 'process', label: 'Pro B2' },
    { id: 'con1a', type: 'process', label: 'Con A1' },
    { id: 'con1b', type: 'process', label: 'Con A2' },
    { id: 'con2a', type: 'process', label: 'Con B1' },
    { id: 'con2b', type: 'process', label: 'Con B2' }
  ];
  
  const relations: Relation[] = [
    { from: 'option1', to: 'pro1a', label: 'has' },
    { from: 'option1', to: 'pro1b', label: 'has' },
    { from: 'option1', to: 'con1a', label: 'has' },
    { from: 'option1', to: 'con1b', label: 'has' },
    { from: 'option2', to: 'pro2a', label: 'has' },
    { from: 'option2', to: 'pro2b', label: 'has' },
    { from: 'option2', to: 'con2a', label: 'has' },
    { from: 'option2', to: 'con2b', label: 'has' }
  ];
  
  // Note: SceneOut is defined but not used in this example
  // The compiler works directly with entities and relations
  
  const compiler = createProceduralCompiler('formal');
  
  try {
    const result = await compiler.compileScene({
      projectId: 'example-project',
      sceneId: 'comparison-example',
      archetype: 'comparison_tradeoff',
      tone: 'formal',
      entities,
      relations,
      theme: compiler['theme'],
      seed: 'example-project:comparison-example'
    });
    
    logger.info('✅ Comparison diagram generated successfully!');
    logger.info('Generated elements:', result.elements.length);
    logger.info('Timeline duration:', result.timeline.duration, 'seconds');
    
    return result;
    
  } catch (error) {
    logger.error('❌ Failed to generate comparison diagram:', error);
    throw error;
  }
}

// Example: Generate a timeline sequence
async function generateTimelineSequence() {
  logger.info('⏰ Generating Timeline Sequence');
  
  const entities: Entity[] = [
    { id: 'phase1', type: 'container', label: 'Phase 1: Planning' },
    { id: 'phase2', type: 'container', label: 'Phase 2: Development' },
    { id: 'phase3', type: 'container', label: 'Phase 3: Testing' },
    { id: 'phase4', type: 'container', label: 'Phase 4: Deployment' },
    { id: 'milestone1', type: 'event', label: 'Requirements Complete' },
    { id: 'milestone2', type: 'event', label: 'Code Complete' },
    { id: 'milestone3', type: 'event', label: 'QA Complete' }
  ];
  
  const relations: Relation[] = [
    { from: 'phase1', to: 'phase2', label: 'precedes' },
    { from: 'phase2', to: 'phase3', label: 'precedes' },
    { from: 'phase3', to: 'phase4', label: 'precedes' },
    { from: 'phase1', to: 'milestone1', label: 'achieves' },
    { from: 'phase2', to: 'milestone2', label: 'achieves' },
    { from: 'phase3', to: 'milestone3', label: 'achieves' }
  ];
  
  // Note: SceneOut is defined but not used in this example
  // The compiler works directly with entities and relations
  
  const compiler = createProceduralCompiler('friendly');
  
  try {
    const result = await compiler.compileScene({
      projectId: 'example-project',
      sceneId: 'timeline-example',
      archetype: 'timeline_sequence',
      tone: 'friendly',
      entities,
      relations,
      theme: compiler['theme'],
      seed: 'example-project:timeline-example'
    });
    
    logger.info('✅ Timeline sequence generated successfully!');
    logger.info('Generated elements:', result.elements.length);
    logger.info('Timeline duration:', result.timeline.duration, 'seconds');
    
    return result;
    
  } catch (error) {
    logger.error('❌ Failed to generate timeline sequence:', error);
    throw error;
  }
}

// Main function to run all examples
async function runExamples() {
  logger.info('🎯 Procedural Generation Examples');
  logger.info('================================');
  
  try {
    // Run all examples
    const results = await Promise.all([
      generateProcessFlow(),
      generateComparisonDiagram(),
      generateTimelineSequence()
    ]);
    
    logger.info('\n🎉 All examples completed successfully!');
    logger.info('Total elements generated:', results.reduce((sum, r) => sum + r.elements.length, 0));
    
    // Show gesture variety
    logger.info('\n🎭 Gesture variety across examples:');
    results.forEach((result, index) => {
      const exampleNames = ['Process Flow', 'Comparison', 'Timeline'];
      logger.info(`${exampleNames[index]}: ${result.gestureHistory.join(', ')}`);
    });
    
  } catch (error) {
    logger.error('❌ Examples failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples().catch(error => {
    logger.error('Example suite failed:', error);
    process.exit(1);
  });
}
