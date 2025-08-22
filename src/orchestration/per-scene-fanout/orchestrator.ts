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
    const system = 'Split into 2-5 imperative steps. Return JSON array only.';
    const user = `Caption: "${caption}"
Format: [{"id":"1","text":"Enter credentials"},{"id":"2","text":"Submit form"}]`;

    const result = await this.client.callLLM([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], 'perSceneFanOut', { json: false, attempts: 2 });

    try {
      // Try to parse as-is first
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      try {
        // Try wrapping in array brackets if it's missing them (common issue)
        const wrappedResult = `[${result}]`;
        const parsed = JSON.parse(wrappedResult);
        return Array.isArray(parsed) ? parsed : [];
      } catch (secondParseError) {
        logger.error('Failed to parse atomic steps response', { 
          result: result.substring(0, 200) + (result.length > 200 ? '...' : ''),
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        return []; // Return empty array as last resort
      }
    }
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
    const system = 'Generate 1-2 entities per step. Return JSON array only.';
    const user = `Steps: ${JSON.stringify(steps)}
Types: actor, process, container, event
Format: [{"step_id":"1","entities":[{"entity_id":"1","type":"actor","name":"user"}],"relations":[]}]`;

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
    const system = 'Generate non-default parameter overrides. Return JSON only.';
    const user = `Motif selections: ${JSON.stringify(selections)}
Example: [{"step_id":"1","params":{},"overrides_only":true}]`;

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
    const system = 'Generate transitions between steps. Return JSON only.';
    const user = `Steps: ${JSON.stringify(steps)}
Transitions: ["xfade_fast","pan_right","zoom_in_light","caption_hold"]
Example: [{"from":"1","to":"2","transition_id":"xfade_fast"}]`;

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

    return {
      scene_id: state.scene_id,
      steps,
      transitions: Array.isArray(state.step_transitions) ? state.step_transitions : []
    };
  }
}
