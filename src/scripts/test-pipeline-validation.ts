#!/usr/bin/env ts-node

import { logger } from '../utils/logger';
import {
  validateRouterOutput,
  validateIntentReducerOutput,
  validateScenePlannerOutput,
  validateAtomicStep,
  validateMotifSelection,
  validateEntity,
  validateRelation,
  validateStepEntities,
  validateMotifParams,
  validateStepTransition,
  validateSceneFanOutResult,
  validateLayoutCompilerOutput,
  validatePipelineState,
  logValidationResult,
  createValidationSummary
} from '../schema/pipeline-validation';

/**
 * Test script to demonstrate the validation system for each pipeline stage
 */
async function testPipelineValidation() {
  logger.info('Starting pipeline validation tests');

  // Test 1: Router Output Validation
  logger.info('\n=== Testing Router Output Validation ===');
  const validRouterOutput = {
    archetypes: ['process_flow', 'comparison_tradeoff'],
    tone: 'concise'
  };
  
  const invalidRouterOutput = {
    archetypes: ['invalid_archetype'],
    tone: 'invalid_tone'
  };
  
  const routerValidation = validateRouterOutput(validRouterOutput);
  logValidationResult('Router (Valid)', routerValidation);
  
  const invalidRouterValidation = validateRouterOutput(invalidRouterOutput);
  logValidationResult('Router (Invalid)', invalidRouterValidation);
  
  console.log('Router Validation Summary:', createValidationSummary(invalidRouterValidation));

  // Test 2: Intent Reducer Output Validation
  logger.info('\n=== Testing Intent Reducer Output Validation ===');
  const validIntentReducer = {
    domain: 'social_network',
    core_flows: ['feed_arch', 'like_write', 'like_unwrite'],
    tone: 'friendly'
  };
  
  const invalidIntentReducer = {
    domain: '',
    core_flows: ['flow1'], // Too few flows
    tone: 'concise'
  };
  
  const intentValidation = validateIntentReducerOutput(validIntentReducer);
  logValidationResult('Intent Reducer (Valid)', intentValidation);
  
  const invalidIntentValidation = validateIntentReducerOutput(invalidIntentReducer);
  logValidationResult('Intent Reducer (Invalid)', invalidIntentValidation);
  
  console.log('Intent Reducer Validation Summary:', createValidationSummary(invalidIntentValidation));

  // Test 3: Scene Planner Output Validation
  logger.info('\n=== Testing Scene Planner Output Validation ===');
  const validScenePlanner = {
    scenes: [
      { id: 's1', goal: 'process_flow', caption: 'User authentication flow' },
      { id: 's2', goal: 'comparison_tradeoff', caption: 'Feature comparison' },
      { id: 's3', goal: 'timeline_sequence', caption: 'Data processing timeline' }
    ]
  };
  
  const invalidScenePlanner = {
    scenes: [
      { id: '', goal: '', caption: 'This caption is way too long and exceeds the twelve word limit that is required' }
    ]
  };
  
  const scenePlannerValidation = validateScenePlannerOutput(validScenePlanner);
  logValidationResult('Scene Planner (Valid)', scenePlannerValidation);
  
  const invalidScenePlannerValidation = validateScenePlannerOutput(invalidScenePlanner);
  logValidationResult('Scene Planner (Invalid)', invalidScenePlannerValidation);
  
  console.log('Scene Planner Validation Summary:', createValidationSummary(invalidScenePlannerValidation));

  // Test 4: Atomic Step Validation
  logger.info('\n=== Testing Atomic Step Validation ===');
  const validStep = {
    id: 'step1',
    text: 'Enter credentials'
  };
  
  const invalidStep = {
    id: '',
    text: 'This step text is way too long and exceeds the eight word limit'
  };
  
  const stepValidation = validateAtomicStep(validStep);
  logValidationResult('Atomic Step (Valid)', stepValidation);
  
  const invalidStepValidation = validateAtomicStep(invalidStep);
  logValidationResult('Atomic Step (Invalid)', invalidStepValidation);
  
  console.log('Atomic Step Validation Summary:', createValidationSummary(invalidStepValidation));

  // Test 5: Motif Selection Validation
  logger.info('\n=== Testing Motif Selection Validation ===');
  const validMotifSelection = {
    step_id: 'step1',
    motif_id: 'process_flow_1'
  };
  
  const invalidMotifSelection = {
    step_id: '',
    motif_id: ''
  };
  
  const motifValidation = validateMotifSelection(validMotifSelection);
  logValidationResult('Motif Selection (Valid)', motifValidation);
  
  const invalidMotifValidation = validateMotifSelection(invalidMotifSelection);
  logValidationResult('Motif Selection (Invalid)', invalidMotifValidation);
  
  console.log('Motif Selection Validation Summary:', createValidationSummary(invalidMotifValidation));

  // Test 6: Entity Validation
  logger.info('\n=== Testing Entity Validation ===');
  const validEntity = {
    id: 'user',
    type: 'actor',
    label: 'User'
  };
  
  const invalidEntity = {
    id: '',
    type: 'invalid_type',
    label: ''
  };
  
  const entityValidation = validateEntity(validEntity);
  logValidationResult('Entity (Valid)', entityValidation);
  
  const invalidEntityValidation = validateEntity(invalidEntity);
  logValidationResult('Entity (Invalid)', invalidEntityValidation);
  
  console.log('Entity Validation Summary:', createValidationSummary(invalidEntityValidation));

  // Test 7: Relation Validation
  logger.info('\n=== Testing Relation Validation ===');
  const validRelation = {
    from: 'user',
    to: 'form',
    label: 'interacts with'
  };
  
  const invalidRelation = {
    from: '',
    to: '',
    label: ''
  };
  
  const relationValidation = validateRelation(validRelation);
  logValidationResult('Relation (Valid)', relationValidation);
  
  const invalidRelationValidation = validateRelation(invalidRelation);
  logValidationResult('Relation (Invalid)', invalidRelationValidation);
  
  console.log('Relation Validation Summary:', createValidationSummary(invalidRelationValidation));

  // Test 8: Step Entities Validation
  logger.info('\n=== Testing Step Entities Validation ===');
  const validStepEntities = {
    step_id: 'step1',
    entities: [validEntity],
    relations: [validRelation]
  };
  
  const invalidStepEntities = {
    step_id: '',
    entities: [invalidEntity],
    relations: [invalidRelation]
  };
  
  const stepEntitiesValidation = validateStepEntities(validStepEntities);
  logValidationResult('Step Entities (Valid)', stepEntitiesValidation);
  
  const invalidStepEntitiesValidation = validateStepEntities(invalidStepEntities);
  logValidationResult('Step Entities (Invalid)', invalidStepEntitiesValidation);
  
  console.log('Step Entities Validation Summary:', createValidationSummary(invalidStepEntitiesValidation));

  // Test 9: Motif Params Validation
  logger.info('\n=== Testing Motif Params Validation ===');
  const validMotifParams = {
    step_id: 'step1',
    params: { speed: 'medium', emphasis: 'high' }
  };
  
  const invalidMotifParams = {
    step_id: '',
    params: null
  };
  
  const motifParamsValidation = validateMotifParams(validMotifParams);
  logValidationResult('Motif Params (Valid)', motifParamsValidation);
  
  const invalidMotifParamsValidation = validateMotifParams(invalidMotifParams);
  logValidationResult('Motif Params (Invalid)', invalidMotifParamsValidation);
  
  console.log('Motif Params Validation Summary:', createValidationSummary(invalidMotifParamsValidation));

  // Test 10: Step Transition Validation
  logger.info('\n=== Testing Step Transition Validation ===');
  const validTransition = {
    from: 'step1',
    to: 'step2',
    transition_id: 'xfade_fast'
  };
  
  const invalidTransition = {
    from: '',
    to: '',
    transition_id: 'invalid_transition'
  };
  
  const transitionValidation = validateStepTransition(validTransition);
  logValidationResult('Step Transition (Valid)', transitionValidation);
  
  const invalidTransitionValidation = validateStepTransition(invalidTransition);
  logValidationResult('Step Transition (Invalid)', invalidTransitionValidation);
  
  console.log('Step Transition Validation Summary:', createValidationSummary(invalidTransitionValidation));

  // Test 11: Scene Fan-Out Result Validation
  logger.info('\n=== Testing Scene Fan-Out Result Validation ===');
  const validSceneFanOut = {
    scene_id: 'scene1',
    steps: [
      {
        id: 'step1',
        text: 'Enter credentials',
        motif_id: 'process_flow_1',
        params: { speed: 'medium' },
        entities: [validEntity],
        relations: [validRelation]
      }
    ],
    transitions: [validTransition]
  };
  
  const invalidSceneFanOut = {
    scene_id: '',
    steps: [],
    transitions: []
  };
  
  const sceneFanOutValidation = validateSceneFanOutResult(validSceneFanOut);
  logValidationResult('Scene Fan-Out (Valid)', sceneFanOutValidation);
  
  const invalidSceneFanOutValidation = validateSceneFanOutResult(invalidSceneFanOut);
  logValidationResult('Scene Fan-Out (Invalid)', invalidSceneFanOutValidation);
  
  console.log('Scene Fan-Out Validation Summary:', createValidationSummary(invalidSceneFanOutValidation));

  // Test 12: Layout Compiler Output Validation
  logger.info('\n=== Testing Layout Compiler Output Validation ===');
  const validLayoutCompiler = {
    elements: [],
    groups: [],
    timeline: {
      scale: 1,
      duration: 3,
      currentTime: 0,
      animationStates: {}
    }
  };
  
  const invalidLayoutCompiler = {
    elements: null,
    groups: null,
    timeline: null
  };
  
  const layoutCompilerValidation = validateLayoutCompilerOutput(validLayoutCompiler);
  logValidationResult('Layout Compiler (Valid)', layoutCompilerValidation);
  
  const invalidLayoutCompilerValidation = validateLayoutCompilerOutput(invalidLayoutCompiler);
  logValidationResult('Layout Compiler (Invalid)', invalidLayoutCompilerValidation);
  
  console.log('Layout Compiler Validation Summary:', createValidationSummary(invalidLayoutCompilerValidation));

  // Test 13: Pipeline State Validation
  logger.info('\n=== Testing Pipeline State Validation ===');
  const validPipelineState = {
    userText: 'Create a user authentication flow',
    brief: validRouterOutput,
    intentReducer: validIntentReducer,
    scenePlanner: validScenePlanner,
    sceneOutputs: [validSceneFanOut],
    layoutCompiler: validLayoutCompiler
  };
  
  const invalidPipelineState = {
    userText: '',
    brief: invalidRouterOutput,
    intentReducer: invalidIntentReducer
  };
  
  const pipelineStateValidation = validatePipelineState(validPipelineState);
  logValidationResult('Pipeline State (Valid)', pipelineStateValidation);
  
  const invalidPipelineStateValidation = validatePipelineState(invalidPipelineState);
  logValidationResult('Pipeline State (Invalid)', invalidPipelineStateValidation);
  
  console.log('Pipeline State Validation Summary:', createValidationSummary(invalidPipelineStateValidation));

  logger.info('\n=== Pipeline Validation Tests Completed ===');
  logger.info('All validation functions have been tested with both valid and invalid inputs');
  logger.info('Check the logs above for detailed validation results and error messages');
}

// Run the tests
if (require.main === module) {
  testPipelineValidation()
    .then(() => {
      logger.info('Pipeline validation tests completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Pipeline validation tests failed', { error });
      process.exit(1);
    });
}
