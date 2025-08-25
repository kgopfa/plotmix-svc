// Step 1: Caption → Steps
export interface AtomicStep {
  id: string;
  text: string;
}

// Step 2: Motif Candidates
export interface MotifCandidate {
  id: string;
  one_liner: string;
  archetype: string;
  status: 'live' | 'draft' | 'deprecated';
}

// Step 3: Motif Selection
export interface MotifSelection {
  step_id: string;
  motif_id: string;
  confidence: number;
}

// Step 4: Entities and Relations
export interface CanonicalEntity {
  id: string;
  type: 'actor' | 'process' | 'container' | 'event' | 'channel';
  label: string;
  description?: string;
}

export interface CanonicalRelation {
  from: string;
  to: string;
  label: string;
  type: 'flows_to' | 'interacts_with' | 'contains' | 'triggers' | 'produces';
}

export interface StepEntities {
  step_id: string;
  entities: CanonicalEntity[];
  relations: CanonicalRelation[];
}

// Step 5: Motif Parameters
export interface MotifParams {
  step_id: string;
  params: {
    // Basic emphasis controls
    emphasis?: 'low' | 'medium' | 'high';
    emphasisType?: 'scale' | 'color' | 'glow' | 'pulse' | 'bounce' | 'none';
    emphasisDuration?: 'short' | 'medium' | 'long';
    
    // Specific emphasis parameters
    scale?: 'subtle' | 'moderate' | 'dramatic';
    color?: 'accent' | 'primary' | 'warning' | 'success' | 'custom';
    customColor?: string; // hex color for custom emphasis
    glow?: 'none' | 'soft' | 'medium' | 'strong';
    pulse?: 'none' | 'gentle' | 'noticeable' | 'attention-grabbing';
    
    // Animation timing
    speed?: 'slow' | 'medium' | 'fast';
    stagger?: 'none' | 'minimal' | 'moderate' | 'pronounced';
    
    // Legacy support - keep existing params
    [key: string]: any;
  };
  overrides_only: boolean; // true if only non-default values
}

// Enhanced emphasis configuration
export interface EmphasisConfig {
  level: 'low' | 'medium' | 'high';
  type: 'scale' | 'color' | 'glow' | 'pulse' | 'bounce' | 'none';
  duration: 'short' | 'medium' | 'long';
  scale: 'subtle' | 'moderate' | 'dramatic';
  color: 'accent' | 'primary' | 'warning' | 'success' | 'custom';
  customColor?: string;
  glow: 'none' | 'soft' | 'medium' | 'strong';
  pulse: 'none' | 'gentle' | 'noticeable' | 'attention-grabbing';
}

// Step 6: Step Transitions
export type TransitionType = 'xfade_fast' | 'pan_right' | 'zoom_in_light' | 'caption_hold';

export interface StepTransition {
  from: string;
  to: string;
  transition_id: TransitionType;
}

// Intermediate state for the fan-out process
export interface PerSceneFanOutState {
  scene_id: string;
  original_caption: string;
  atomic_steps: AtomicStep[];
  motif_candidates: MotifCandidate[];
  motif_selections: MotifSelection[];
  step_entities: StepEntities[];
  motif_params: MotifParams[];
  step_transitions: StepTransition[];
}

// Final output assembly
export interface SceneFanOutResult {
  scene_id: string;
  steps: Array<{
    id: string;
    text: string;
    motif_id: string;
    params: Record<string, any>;
    entities: CanonicalEntity[];
    relations: CanonicalRelation[];
  }>;
  transitions: StepTransition[];
}
