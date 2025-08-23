import { logger } from '../../utils/logger';
import { PipelineClient } from '../../clients/pipeline.client';
import { MotifRetrievalService } from './motif-retrieval.service';
import {
  PerSceneFanOutState,
  SceneFanOutResult,
  AtomicStep,
  MotifSelection,
  StepEntities,
  MotifParams,
  StepTransition
} from './types';
import {
  validateAtomicStep,
  validateSceneFanOutResult,
  logValidationResult
} from '../../schema/pipeline-validation';

export class PerSceneFanOutOrchestrator {
  private static instance: PerSceneFanOutOrchestrator;
  private client: PipelineClient;
  private motifService: MotifRetrievalService;

  private constructor() {
    this.client = PipelineClient.getInstance();
    this.motifService = MotifRetrievalService.getInstance();
  }

  static getInstance(): PerSceneFanOutOrchestrator {
    if (!PerSceneFanOutOrchestrator.instance) {
      PerSceneFanOutOrchestrator.instance = new PerSceneFanOutOrchestrator();
    }
    return PerSceneFanOutOrchestrator.instance;
  }

  /**
   * Main orchestrator for per-scene fan-out process
   */
  async processScene(scene: { id: string; caption: string }, archetypes: string[]): Promise<SceneFanOutResult> {
    logger.info('Starting per-scene fan-out', { sceneId: scene.id, caption: scene.caption });

    const state: PerSceneFanOutState = {
      scene_id: scene.id,
      original_caption: scene.caption,
      atomic_steps: [],
      motif_candidates: [],
      motif_selections: [],
      step_entities: [],
      motif_params: [],
      step_transitions: []
    };

    try {
      // Step 1: Caption → Steps
      state.atomic_steps = await this.generateAtomicSteps(scene.caption);
      logger.debug('Generated atomic steps', { stepCount: state.atomic_steps.length });

      // Step 2: Retrieve candidate motifs
      state.motif_candidates = await this.retrieveMotifCandidates(state.atomic_steps, archetypes);
      logger.debug('Retrieved motif candidates', { candidateCount: state.motif_candidates.length });

      // Step 3: Pick motif per step
      state.motif_selections = await this.selectMotifsPerStep(state.atomic_steps, state.motif_candidates);
      logger.debug('Selected motifs per step', { selectionCount: state.motif_selections.length });

      // Step 4: Generate entities and relations
      state.step_entities = await this.generateEntitiesAndRelations(state.atomic_steps);
      logger.debug('Generated entities and relations', { entityCount: state.step_entities.length });

      // Step 5: Motif parameters
      state.motif_params = await this.generateMotifParams(state.motif_selections);
      logger.debug('Generated motif parameters', { paramCount: state.motif_params.length });

      // Step 6: Step transitions
      state.step_transitions = await this.generateStepTransitions(state.atomic_steps);
      logger.debug('Generated step transitions', { transitionCount: state.step_transitions.length });

      // Assemble final result
      return this.assembleResult(state);
    } catch (error) {
      logger.error('Per-scene fan-out failed', { sceneId: scene.id, error });
      throw new Error(`Per-scene fan-out failed for scene ${scene.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Step 1: Split caption into atomic, imperative steps (2-5 max, ≤8 words each)
   */
  private async generateAtomicSteps(caption: string): Promise<AtomicStep[]> {
    const system = 'Split caption into atomic steps. Return ONLY valid JSON array with exact format.';
    const user = `REQUIREMENTS:
- Create 2-5 atomic steps from the caption
- Each step: id (string), text (≤8 words, imperative style)
- Return valid JSON array only

REQUIRED FORMAT:
[{"id":"1","text":"short imperative step"},{"id":"2","text":"another short step"}]

EXAMPLE:
[{"id":"1","text":"Enter credentials"},{"id":"2","text":"Click submit button"}]

CAPTION: "${caption}"

Return valid JSON array only - no explanation:`;

    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], 'perSceneFanOut', { json: false, attempts: 2 });

    let parsed: any;
    try {
      // Try to parse as-is first
      parsed = JSON.parse(result);
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      try {
        // Try wrapping in array brackets if it's missing them (common issue)
        const wrappedResult = `[${result}]`;
        parsed = JSON.parse(wrappedResult);
        if (!Array.isArray(parsed)) {
          throw new Error('Wrapped response is not an array');
        }
      } catch (secondParseError) {
        logger.error('Failed to parse atomic steps response', { 
          result: result.substring(0, 200) + (result.length > 200 ? '...' : ''),
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        throw new Error(`Failed to parse atomic steps: Invalid JSON response`);
      }
    }

    // Validate each step
    const validatedSteps: AtomicStep[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < parsed.length; i++) {
      const stepValidation = validateAtomicStep(parsed[i]);
      if (stepValidation.valid && stepValidation.value) {
        validatedSteps.push(stepValidation.value);
      } else {
        errors.push(`Step ${i}: ${stepValidation.errors.join('; ')}`);
      }
    }

    if (errors.length > 0) {
      logger.warn('Some atomic steps failed validation', { errors });
      
      // Try to retry with validation error summary
      const retryUser = `${user}\n\nValidation failed: ${errors.join('; ')}`;
      const retryResult = await this.client.callLLM([
        { role: 'system', content: system },
        { role: 'user', content: retryUser }
      ], 'perSceneFanOut', { json: false, attempts: 1 });

      try {
        const retryParsed = JSON.parse(retryResult);
        if (Array.isArray(retryParsed)) {
          const retryValidatedSteps: AtomicStep[] = [];
          const retryErrors: string[] = [];
          
          for (let i = 0; i < retryParsed.length; i++) {
            const stepValidation = validateAtomicStep(retryParsed[i]);
            if (stepValidation.valid && stepValidation.value) {
              retryValidatedSteps.push(stepValidation.value);
            } else {
              retryErrors.push(`Step ${i}: ${stepValidation.errors.join('; ')}`);
            }
          }
          
          if (retryValidatedSteps.length > 0) {
            logger.info('Retry successful for atomic steps', { 
              originalErrors: errors.length, 
              retryErrors: retryErrors.length,
              finalValidSteps: retryValidatedSteps.length 
            });
            return retryValidatedSteps;
          }
        }
      } catch (retryParseError) {
        logger.error('Retry also failed for atomic steps', { retryResult, error: retryParseError });
      }
      
      // If we still have errors, throw with details
      throw new Error(`Atomic steps validation failed: ${errors.join('; ')}`);
    }

    return validatedSteps;
  }

  /**
   * Step 2: Retrieve candidate motifs using vector search + metadata filtering
   */
  private async retrieveMotifCandidates(steps: AtomicStep[], archetypes: string[]): Promise<any[]> {
    const allCandidates: any[] = [];
    
    for (const step of steps) {
      // Use the first archetype for now (could be enhanced to match step content)
      const archetype = archetypes[0];
      if (!archetype) {
        throw new Error('No archetypes available for motif retrieval');
      }
      
      const query = `${archetype} ${step.text}`;
      
      const candidates = await this.motifService.retrieveMotifCandidates(query, archetype, {
        maxCandidates: 6,
        minConfidence: 0.7
      });
      
      allCandidates.push(...candidates);
    }
    
    return allCandidates;
  }

  /**
   * Step 3: LLM selects ONE motif per step
   */
  private async selectMotifsPerStep(steps: AtomicStep[], candidates: any[]): Promise<MotifSelection[]> {
    // If no candidates, provide fallback motifs
    if (!candidates || candidates.length === 0) {
      logger.warn('No motif candidates available, using fallback motifs');
      return steps.map(step => ({
        step_id: step.id,
        motif_id: 'motif_process_flow_1',
        confidence: 0.7
      }));
    }

    const system = 'Select best motif per step from candidates. Return JSON only.';
    const user = `Steps: ${JSON.stringify(steps)}
Candidates: ${JSON.stringify(candidates)}
Example: [{"step_id":"1","motif_id":"motif_id","confidence":0.9}]`;

    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], 'perSceneFanOut', { json: false, attempts: 2 });

    try {
      const parsed = JSON.parse(result);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      
      // Fallback: assign default motifs if parsing fails or returns empty
      logger.warn('Motif selection failed, using fallback motifs');
      return steps.map(step => ({
        step_id: step.id,
        motif_id: 'motif_process_flow_1',
        confidence: 0.7
      }));
    } catch (parseError) {
      logger.error('Failed to parse motif selection response', { result, error: parseError });
      
      // Fallback: assign default motifs
      return steps.map(step => ({
        step_id: step.id,
        motif_id: 'motif_process_flow_1',
        confidence: 0.7
      }));
    }
  }

  /**
   * Step 4: Generate entities and relations using canonical generic vocabulary
   */
  private async generateEntitiesAndRelations(steps: AtomicStep[]): Promise<StepEntities[]> {
    const system = 'Generate entities and relations for each step. Return ONLY valid JSON array with exact format.';
    const user = `REQUIREMENTS:
- Generate entities and relations for each step
- Entity types: ["actor","process","container","event","channel"]
- Relation types: ["flows_to","interacts_with","contains","triggers","produces"]
- Return valid JSON array only

REQUIRED FORMAT:
[{"step_id":"step_id","entities":[{"id":"entity1","type":"actor","label":"Entity Name","description":"optional"}],"relations":[{"from":"entity1","to":"entity2","label":"relation description","type":"interacts_with"}]}]

EXAMPLE:
[{"step_id":"1","entities":[{"id":"user","type":"actor","label":"User"},{"id":"form","type":"container","label":"Login Form"}],"relations":[{"from":"user","to":"form","label":"interacts with","type":"interacts_with"}]}]

STEPS: ${JSON.stringify(steps)}

Return valid JSON array only - no explanation:`;

    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], 'perSceneFanOut', { json: false, attempts: 2 });

    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      // Check if the response was truncated (often ends mid-JSON)
      if (result.length > 300 && !result.trim().endsWith('}') && !result.trim().endsWith(']')) {
        logger.warn('Entities response appears truncated, retrying with simpler prompt', { 
          resultLength: result.length,
          lastChars: result.slice(-50)
        });
        
        // Retry with a simpler, more concise prompt
        const simpleSystem = 'Generate minimal entities per step. Return JSON array only.';
        const simpleUser = `Steps: ${JSON.stringify(steps)}
Format: [{"step_id":"1","entities":[{"entity_id":"1","type":"actor","name":"user"}],"relations":[]}]`;

        try {
          const retryResult = await this.client.callLLM([
            { role: 'system', content: simpleSystem },
            { role: 'user', content: simpleUser }
          ], 'perSceneFanOut', { json: false, attempts: 1 });
          
          const retryParsed = JSON.parse(retryResult);
          return Array.isArray(retryParsed) ? retryParsed : [];
        } catch (retryError) {
          logger.error('Retry also failed for entities response', { retryError });
        }
      }
      
      logger.error('Failed to parse entities response', { 
        result: result.substring(0, 500) + (result.length > 500 ? '...' : ''),
        error: parseError instanceof Error ? parseError.message : String(parseError)
      });
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Step 5: Generate motif parameters (only non-default overrides)
   */
  private async generateMotifParams(selections: MotifSelection[]): Promise<MotifParams[]> {
    const system = 'Generate motif parameters for each step. Return ONLY valid JSON array with exact format.';
    const user = `REQUIREMENTS:
- Generate motif parameters for each step
- Include step_id and params object
- Return valid JSON array only

REQUIRED FORMAT:
[{"step_id":"step_id","params":{"param_name":"value"},"overrides_only":true}]

EXAMPLE:
[{"step_id":"1","params":{"speed":"medium","emphasis":"high"},"overrides_only":true}]

MOTIF SELECTIONS: ${JSON.stringify(selections)}

Return valid JSON array only - no explanation:`;

    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], 'perSceneFanOut', { json: false, attempts: 2 });

    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      logger.error('Failed to parse motif params response', { result, error: parseError });
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Step 6: Generate step transitions from small enum
   */
  private async generateStepTransitions(steps: AtomicStep[]): Promise<StepTransition[]> {
    const system = 'Generate transitions between steps. Return ONLY valid JSON array with exact format.';
    const user = `REQUIREMENTS:
- Generate transitions between consecutive steps
- Use only valid transition types
- Return valid JSON array only

VALID TRANSITIONS: ["xfade_fast","pan_right","zoom_in_light","caption_hold"]

REQUIRED FORMAT:
[{"from":"step_id","to":"step_id","transition_id":"transition_type"}]

EXAMPLE:
[{"from":"1","to":"2","transition_id":"xfade_fast"},{"from":"2","to":"3","transition_id":"pan_right"}]

STEPS: ${JSON.stringify(steps)}

Return valid JSON array only - no explanation:`;

    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], 'perSceneFanOut', { json: false, attempts: 2 });

    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      logger.error('Failed to parse transitions response', { result, error: parseError });
      return []; // Return empty array instead of throwing
    }
  }

  /**
   * Assemble final result from all steps
   */
  private assembleResult(state: PerSceneFanOutState): SceneFanOutResult {
    // Ensure atomic_steps is always an array
    const atomicSteps = Array.isArray(state.atomic_steps) ? state.atomic_steps : [];
    
    const steps = atomicSteps.map(step => {
      const motifSelection = state.motif_selections.find(s => s.step_id === step.id);
      const stepEntities = state.step_entities.find(e => e.step_id === step.id);
      const motifParam = state.motif_params.find(p => p.step_id === step.id);

      return {
        id: step.id,
        text: step.text,
        motif_id: motifSelection?.motif_id || 'process_flow',
        params: motifParam?.params || {},
        entities: stepEntities?.entities || [],
        relations: stepEntities?.relations || []
      };
    });

    const result = {
      scene_id: state.scene_id,
      steps,
      transitions: Array.isArray(state.step_transitions) ? state.step_transitions : []
    };

    // Validate the final assembled result
    const validation = validateSceneFanOutResult(result);
    logValidationResult('Scene Fan-Out Result', validation);
    
    if (!validation.valid) {
      logger.warn('Final scene fan-out result validation failed', {
        errors: validation.errors,
        patchHints: validation.patchHints
      });
      
      // Try to fix common issues automatically
      const fixedResult = this.attemptAutoFix(result);
      const fixedValidation = validateSceneFanOutResult(fixedResult);
      
      if (fixedValidation.valid && fixedValidation.value) {
        logger.info('Auto-fix successful for scene fan-out result');
        return fixedValidation.value;
      }
      
      // If auto-fix fails, log the errors but return the result anyway
      // This allows the pipeline to continue with potentially invalid data
      logger.error('Auto-fix failed for scene fan-out result, returning original with validation errors');
    }

    return result;
  }

  /**
   * Attempt to automatically fix common validation issues
   */
  private attemptAutoFix(result: any): any {
    const fixed = { ...result };
    
    // Fix missing scene_id
    if (!fixed.scene_id || typeof fixed.scene_id !== 'string') {
      fixed.scene_id = 'scene_1';
    }
    
    // Fix missing or invalid steps
    if (!Array.isArray(fixed.steps)) {
      fixed.steps = [];
    }
    
    // Fix missing or invalid transitions
    if (!Array.isArray(fixed.transitions)) {
      fixed.transitions = [];
    }
    
    return fixed;
  }
}
