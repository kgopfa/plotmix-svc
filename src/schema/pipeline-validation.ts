import { logger } from '../utils/logger';

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  value?: T;
  patchHints?: string[];
}

// -------------------------
// Router Stage Validation
// -------------------------

export interface RouterOutput {
  archetypes: string[];
  tone: 'concise' | 'friendly' | 'formal';
}

const VALID_ARCHETYPES = new Set([
  'process_flow',
  'lifecycle_cycle', 
  'hierarchy_parts',
  'comparison_tradeoff',
  'timeline_sequence',
  'map_topology',
  'cause_effect',
  'algorithm_trace'
]);

const VALID_TONES = new Set(['concise', 'friendly', 'formal']);

export function validateRouterOutput(obj: unknown): ValidationResult<RouterOutput> {
  const errors: string[] = [];
  const hints: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Router output must be an object'], patchHints: [] };
  }

  const r = obj as any;

  // Validate archetypes
  if (!Array.isArray(r.archetypes)) {
    errors.push('archetypes must be an array');
  } else {
    if (r.archetypes.length === 0) {
      errors.push('archetypes array cannot be empty');
    } else if (r.archetypes.length > 2) {
      errors.push('archetypes array cannot have more than 2 items');
    }
    
    for (let i = 0; i < r.archetypes.length; i++) {
      const archetype = r.archetypes[i];
      if (!VALID_ARCHETYPES.has(archetype)) {
        errors.push(`archetypes[${i}] must be one of: ${Array.from(VALID_ARCHETYPES).join(', ')}`);
        hints.push(`Replace "${archetype}" with a valid archetype from the allowed list`);
      }
    }
  }

  // Validate tone
  if (!VALID_TONES.has(r.tone)) {
    errors.push(`tone must be one of: ${Array.from(VALID_TONES).join(', ')}`);
    hints.push(`Replace "${r.tone}" with a valid tone from the allowed list`);
  }

  return {
    valid: errors.length === 0,
    errors,
    value: r as RouterOutput,
    patchHints: hints
  };
}

// -------------------------
// Intent Reducer Stage Validation
// -------------------------

export interface IntentReducerOutput {
  domain: string;
  core_flows: string[];
  tone: 'concise' | 'friendly' | 'formal';
}

export function validateIntentReducerOutput(obj: unknown): ValidationResult<IntentReducerOutput> {
  const errors: string[] = [];
  const hints: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Intent reducer output must be an object'], patchHints: [] };
  }

  const ir = obj as any;

  // Validate domain
  if (typeof ir.domain !== 'string' || ir.domain.trim() === '') {
    errors.push('domain must be a non-empty string');
    hints.push('Provide a descriptive domain like "social_network", "ecommerce", "healthcare"');
  }

  // Validate core_flows
  if (!Array.isArray(ir.core_flows)) {
    errors.push('core_flows must be an array');
  } else {
    if (ir.core_flows.length < 3) {
      errors.push('core_flows must have at least 3 items');
    } else if (ir.core_flows.length > 5) {
      errors.push('core_flows cannot have more than 5 items');
    }
    
    for (let i = 0; i < ir.core_flows.length; i++) {
      const flow = ir.core_flows[i];
      if (typeof flow !== 'string' || flow.trim() === '') {
        errors.push(`core_flows[${i}] must be a non-empty string`);
        hints.push('Use descriptive flow names like "user_authentication", "data_processing"');
      }
    }
  }

  // Validate tone
  if (!VALID_TONES.has(ir.tone)) {
    errors.push(`tone must be one of: ${Array.from(VALID_TONES).join(', ')}`);
    hints.push(`Replace "${ir.tone}" with a valid tone from the allowed list`);
  }

  return {
    valid: errors.length === 0,
    errors,
    value: ir as IntentReducerOutput,
    patchHints: hints
  };
}

// -------------------------
// Scene Planner Stage Validation
// -------------------------

export interface ScenePlan {
  id: string;
  goal: string;
  caption: string;
}

export interface ScenePlannerOutput {
  scenes: ScenePlan[];
}

export function validateScenePlannerOutput(obj: unknown): ValidationResult<ScenePlannerOutput> {
  const errors: string[] = [];
  const hints: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Scene planner output must be an object'], patchHints: [] };
  }

  const sp = obj as any;

  // Validate scenes array
  if (!Array.isArray(sp.scenes)) {
    errors.push('scenes must be an array');
  } else {
    if (sp.scenes.length < 3) {
      errors.push('scenes must have at least 3 items');
    } else if (sp.scenes.length > 6) {
      errors.push('scenes cannot have more than 6 items');
    }
    
    for (let i = 0; i < sp.scenes.length; i++) {
      const scene = sp.scenes[i];
      if (!scene || typeof scene !== 'object') {
        errors.push(`scenes[${i}] must be an object`);
        continue;
      }

      // Validate scene.id
      if (typeof scene.id !== 'string' || scene.id.trim() === '') {
        errors.push(`scenes[${i}].id must be a non-empty string`);
        hints.push('Use short, unique identifiers like "s1", "feed_arch", "auth_flow"');
      }

      // Validate scene.goal
      if (typeof scene.goal !== 'string' || scene.goal.trim() === '') {
        errors.push(`scenes[${i}].goal must be a non-empty string`);
        hints.push('Goal should match one of the archetypes from the router stage');
      }

      // Validate scene.caption
      if (typeof scene.caption !== 'string' || scene.caption.trim() === '') {
        errors.push(`scenes[${i}].caption must be a non-empty string`);
      } else {
        const wordCount = scene.caption.split(/\s+/).length;
        if (wordCount > 12) {
          errors.push(`scenes[${i}].caption must be 12 words or fewer (got ${wordCount})`);
          hints.push('Make the caption more concise while preserving the key concept');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: sp as ScenePlannerOutput,
    patchHints: hints
  };
}

// -------------------------
// Per-Scene Fan-out Stage Validation
// -------------------------

export interface AtomicStep {
  id: string;
  text: string;
}

export interface MotifSelection {
  step_id: string;
  motif_id: string;
}

export interface Entity {
  id: string;
  type: 'actor' | 'process' | 'container' | 'event' | 'channel';
  label: string;
  description?: string;
}

export interface Relation {
  from: string;
  to: string;
  label: string;
  type: 'flows_to' | 'interacts_with' | 'contains' | 'triggers' | 'produces';
}

export interface StepEntities {
  step_id: string;
  entities: Entity[];
  relations: Relation[];
}

export interface MotifParams {
  step_id: string;
  params: Record<string, any>;
}

export interface StepTransition {
  from: string;
  to: string;
  transition_id: 'xfade_fast' | 'pan_right' | 'zoom_in_light' | 'caption_hold';
}

export interface SceneFanOutResult {
  scene_id: string;
  steps: Array<{
    id: string;
    text: string;
    motif_id: string;
    params: Record<string, any>;
    entities: Entity[];
    relations: Relation[];
  }>;
  transitions: StepTransition[];
}

const VALID_ENTITY_TYPES = new Set(['actor', 'process', 'container', 'event', 'channel']);
const VALID_TRANSITION_IDS = new Set(['fade', 'xfade_fast', 'pan_right', 'zoom_in_light', 'caption_hold']);

export function validateAtomicStep(obj: unknown): ValidationResult<AtomicStep> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Atomic step must be an object'] };
  }

  const step = obj as any;

  if (typeof step.id !== 'string' || step.id.trim() === '') {
    errors.push('id must be a non-empty string');
  }

  if (typeof step.text !== 'string' || step.text.trim() === '') {
    errors.push('text must be a non-empty string');
  } else {
    const wordCount = step.text.split(/\s+/).length;
    if (wordCount > 8) {
      errors.push(`text must be 8 words or fewer (got ${wordCount})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: step as AtomicStep
  };
}

export function validateMotifSelection(obj: unknown): ValidationResult<MotifSelection> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Motif selection must be an object'] };
  }

  const ms = obj as any;

  if (typeof ms.step_id !== 'string' || ms.step_id.trim() === '') {
    errors.push('step_id must be a non-empty string');
  }

  if (typeof ms.motif_id !== 'string' || ms.motif_id.trim() === '') {
    errors.push('motif_id must be a non-empty string');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: ms as MotifSelection
  };
}

export function validateEntity(obj: unknown): ValidationResult<Entity> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Entity must be an object'] };
  }

  const entity = obj as any;

  if (typeof entity.id !== 'string' || entity.id.trim() === '') {
    errors.push('id must be a non-empty string');
  }

  if (!VALID_ENTITY_TYPES.has(entity.type)) {
    errors.push(`type must be one of: ${Array.from(VALID_ENTITY_TYPES).join(', ')}`);
  }

  if (typeof entity.label !== 'string' || entity.label.trim() === '') {
    errors.push('label must be a non-empty string');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: entity as Entity
  };
}

export function validateRelation(obj: unknown): ValidationResult<Relation> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Relation must be an object'] };
  }

  const relation = obj as any;

  if (typeof relation.from !== 'string' || relation.from.trim() === '') {
    errors.push('from must be a non-empty string');
  }

  if (typeof relation.to !== 'string' || relation.to.trim() === '') {
    errors.push('to must be a non-empty string');
  }

  if (typeof relation.label !== 'string' || relation.label.trim() === '') {
    errors.push('label must be a non-empty string');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: relation as Relation
  };
}

export function validateStepEntities(obj: unknown): ValidationResult<StepEntities> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Step entities must be an object'] };
  }

  const se = obj as any;

  if (typeof se.step_id !== 'string' || se.step_id.trim() === '') {
    errors.push('step_id must be a non-empty string');
  }

  if (!Array.isArray(se.entities)) {
    errors.push('entities must be an array');
  } else {
    for (let i = 0; i < se.entities.length; i++) {
      const entityRes = validateEntity(se.entities[i]);
      if (!entityRes.valid) {
        errors.push(`entities[${i}] invalid: ${entityRes.errors.join('; ')}`);
      }
    }
  }

  if (!Array.isArray(se.relations)) {
    errors.push('relations must be an array');
  } else {
    for (let i = 0; i < se.relations.length; i++) {
      const relationRes = validateRelation(se.relations[i]);
      if (!relationRes.valid) {
        errors.push(`relations[${i}] invalid: ${relationRes.errors.join('; ')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: se as StepEntities
  };
}

export function validateMotifParams(obj: unknown): ValidationResult<MotifParams> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Motif params must be an object'] };
  }

  const mp = obj as any;

  if (typeof mp.step_id !== 'string' || mp.step_id.trim() === '') {
    errors.push('step_id must be a non-empty string');
  }

  if (!mp.params || typeof mp.params !== 'object') {
    errors.push('params must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: mp as MotifParams
  };
}

export function validateStepTransition(obj: unknown): ValidationResult<StepTransition> {
  const errors: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Step transition must be an object'] };
  }

  const st = obj as any;

  if (typeof st.from !== 'string' || st.from.trim() === '') {
    errors.push('from must be a non-empty string');
  }

  if (typeof st.to !== 'string' || st.to.trim() === '') {
    errors.push('to must be a non-empty string');
  }

  if (!VALID_TRANSITION_IDS.has(st.transition_id)) {
    errors.push(`transition_id must be one of: ${Array.from(VALID_TRANSITION_IDS).join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    value: st as StepTransition
  };
}

export function validateSceneFanOutResult(obj: unknown): ValidationResult<SceneFanOutResult> {
  const errors: string[] = [];
  const hints: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Scene fan-out result must be an object'], patchHints: [] };
  }

  const sfr = obj as any;

  if (typeof sfr.scene_id !== 'string' || sfr.scene_id.trim() === '') {
    errors.push('scene_id must be a non-empty string');
  }

  // Validate steps array
  if (!Array.isArray(sfr.steps)) {
    errors.push('steps must be an array');
  } else {
    if (sfr.steps.length < 1) {
      errors.push('steps must have at least 1 item');
    } else if (sfr.steps.length > 5) {
      errors.push('steps cannot have more than 5 items');
    }
    
    for (let i = 0; i < sfr.steps.length; i++) {
      const step = sfr.steps[i];
      
      // Validate each step structure
      if (!step || typeof step !== 'object') {
        errors.push(`steps[${i}] must be an object`);
        continue;
      }
      
      if (typeof step.id !== 'string' || step.id.trim() === '') {
        errors.push(`steps[${i}].id must be a non-empty string`);
      }
      
      if (typeof step.text !== 'string' || step.text.trim() === '') {
        errors.push(`steps[${i}].text must be a non-empty string`);
      }
      
      if (typeof step.motif_id !== 'string' || step.motif_id.trim() === '') {
        errors.push(`steps[${i}].motif_id must be a non-empty string`);
      }
      
      if (!step.params || typeof step.params !== 'object') {
        errors.push(`steps[${i}].params must be an object`);
      }
      
      // Validate entities array
      if (!Array.isArray(step.entities)) {
        errors.push(`steps[${i}].entities must be an array`);
      } else {
        for (let j = 0; j < step.entities.length; j++) {
          const entityRes = validateEntity(step.entities[j]);
          if (!entityRes.valid) {
            errors.push(`steps[${i}].entities[${j}] invalid: ${entityRes.errors.join('; ')}`);
          }
        }
      }
      
      // Validate relations array
      if (!Array.isArray(step.relations)) {
        errors.push(`steps[${i}].relations must be an array`);
      } else {
        for (let j = 0; j < step.relations.length; j++) {
          const relationRes = validateRelation(step.relations[j]);
          if (!relationRes.valid) {
            errors.push(`steps[${i}].relations[${j}] invalid: ${relationRes.errors.join('; ')}`);
          }
        }
      }
    }
  }

  // Validate transitions array
  if (!Array.isArray(sfr.transitions)) {
    errors.push('transitions must be an array');
  } else {
    for (let i = 0; i < sfr.transitions.length; i++) {
      const stRes = validateStepTransition(sfr.transitions[i]);
      if (!stRes.valid) {
        errors.push(`transitions[${i}] invalid: ${stRes.errors.join('; ')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: sfr as SceneFanOutResult,
    patchHints: hints
  };
}

// -------------------------
// Layout Compiler Stage Validation
// -------------------------

export interface LayoutCompilerOutput {
  elements: any[];
  groups: any[];
  timeline: {
    scale: number;
    duration: number;
    currentTime: number;
    animationStates: Record<string, any>;
  };
}

export function validateLayoutCompilerOutput(obj: unknown): ValidationResult<LayoutCompilerOutput> {
  const errors: string[] = [];
  const hints: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Layout compiler output must be an object'], patchHints: [] };
  }

  const lc = obj as any;

  // Validate elements array
  if (!Array.isArray(lc.elements)) {
    errors.push('elements must be an array');
  }

  // Validate groups array
  if (!Array.isArray(lc.groups)) {
    errors.push('groups must be an array');
  }

  // Validate timeline
  if (!lc.timeline || typeof lc.timeline !== 'object') {
    errors.push('timeline must be an object');
  } else {
    const timeline = lc.timeline;
    
    if (typeof timeline.scale !== 'number' || timeline.scale <= 0) {
      errors.push('timeline.scale must be a positive number');
    }
    
    if (typeof timeline.duration !== 'number' || timeline.duration <= 0) {
      errors.push('timeline.duration must be a positive number');
    }
    
    if (typeof timeline.currentTime !== 'number' || timeline.currentTime < 0) {
      errors.push('timeline.currentTime must be a non-negative number');
    }
    
    if (!timeline.animationStates || typeof timeline.animationStates !== 'object') {
      errors.push('timeline.animationStates must be an object');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: lc as LayoutCompilerOutput,
    patchHints: hints
  };
}

// -------------------------
// Pipeline State Validation
// -------------------------

export interface PipelineState {
  userText: string;
  brief?: RouterOutput;
  intentReducer?: IntentReducerOutput;
  scenePlanner?: ScenePlannerOutput;
  sceneOutputs?: SceneFanOutResult[];
  designAssets?: any[];
  layoutCompiler?: LayoutCompilerOutput;
  finalDoc?: {
    name: string;
    title: string;
    description: string;
    mainState: { elements: any[]; groups: any[]; timeline: any };
  };
}

export function validatePipelineState(obj: unknown): ValidationResult<PipelineState> {
  const errors: string[] = [];
  const hints: string[] = [];
  
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['Pipeline state must be an object'], patchHints: [] };
  }

  const ps = obj as any;

  if (typeof ps.userText !== 'string' || ps.userText.trim() === '') {
    errors.push('userText must be a non-empty string');
  }

  // Validate optional fields if they exist
  if (ps.brief !== undefined) {
    const briefRes = validateRouterOutput(ps.brief);
    if (!briefRes.valid) {
      errors.push(`brief invalid: ${briefRes.errors.join('; ')}`);
    }
  }

  if (ps.intentReducer !== undefined) {
    const irRes = validateIntentReducerOutput(ps.intentReducer);
    if (!irRes.valid) {
      errors.push(`intentReducer invalid: ${irRes.errors.join('; ')}`);
    }
  }

  if (ps.scenePlanner !== undefined) {
    const spRes = validateScenePlannerOutput(ps.scenePlanner);
    if (!spRes.valid) {
      errors.push(`scenePlanner invalid: ${spRes.errors.join('; ')}`);
    }
  }

  if (ps.sceneOutputs !== undefined) {
    if (!Array.isArray(ps.sceneOutputs)) {
      errors.push('sceneOutputs must be an array');
    } else {
      for (let i = 0; i < ps.sceneOutputs.length; i++) {
        const soRes = validateSceneFanOutResult(ps.sceneOutputs[i]);
        if (!soRes.valid) {
          errors.push(`sceneOutputs[${i}] invalid: ${soRes.errors.join('; ')}`);
        }
      }
    }
  }

  if (ps.layoutCompiler !== undefined) {
    const lcRes = validateLayoutCompilerOutput(ps.layoutCompiler);
    if (!lcRes.valid) {
      errors.push(`layoutCompiler invalid: ${lcRes.errors.join('; ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: ps as PipelineState,
    patchHints: hints
  };
}

// -------------------------
// Utility Functions
// -------------------------

/**
 * Logs validation results with appropriate log levels
 */
export function logValidationResult(stage: string, result: ValidationResult<any>): void {
  if (result.valid) {
    logger.debug(`Validation passed for ${stage}`);
  } else {
    logger.warn(`Validation failed for ${stage}`, {
      errors: result.errors,
      patchHints: result.patchHints
    });
  }
}

/**
 * Creates a summary of validation errors for retry prompts
 */
export function createValidationSummary(result: ValidationResult<any>): string {
  if (result.valid) return '';
  
  const summary = result.errors.join('; ');
  const hints = result.patchHints?.length ? `\nHints: ${result.patchHints.join('; ')}` : '';
  
  return `Validation failed: ${summary}${hints}`;
}
