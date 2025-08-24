import { 
  CanvasElement, 
  CanvasGroup, 
  Timeline, 
  ProjectDocument 
} from '../../types/canvas';

export type Tone = 'concise' | 'friendly' | 'formal';

export interface Brief {
  archetypes: string[];
  tone: Tone;
}

export interface ScenePlan {
  id: string;
  goal: string;
  caption: string;
}

// New types for per-scene fan-out
export interface Step {
  id: string;
  text: string;
}

export interface Entity {
  id: string;
  type: 'actor' | 'process' | 'container' | 'event' | 'channel';
  label: string;
}

export interface Relation {
  from: string;
  to: string;
  label: string;
}

export interface StepWithMotif extends Step {
  motif_id: string;
  params: Record<string, any>;
  entities: Entity[];
  relations: Relation[];
}

export interface StepTransition {
  from: string;
  to: string;
  transition_id: string;
}

export interface SceneOut {
  scene_id: string;
  steps: StepWithMotif[];
  transitions: StepTransition[];
  _procedural?: {
    theme: string;
    seed: string;
    archetype: string;
  };
}

export interface IntentReducerOutput {
  domain: string;
  core_flows: string[];
  tone: Tone;
}

export interface PipelineState {
  userText: string;
  brief?: Brief;
  intentReducer?: IntentReducerOutput;
  scenePlanner?: { scenes: ScenePlan[] };
  sceneOutputs?: SceneOut[];
  designAssets?: DesignSelection;
  layoutCompiler?: {
    elements: CanvasElement[];
    groups: CanvasGroup[];
    timeline: Timeline;
  };
  finalDoc?: ProjectDocument;
}

export type DesignSelection = {
  scene_id: string;
  backgrounds?: Array<{ asset_id: string; params?: Record<string, unknown> }>;
  ornaments?: Array<{ asset_id: string; params?: Record<string, unknown> }>;
};

// Node function types for pipeline execution
export type RouterNode = (state: PipelineState) => Promise<Partial<PipelineState>>;
export type ScenePlannerNode = (state: PipelineState) => Promise<Partial<PipelineState>>;
export type SceneProcessorNode = (state: PipelineState) => Promise<Partial<PipelineState>>;
export type LayoutCompilerNode = (state: PipelineState) => Promise<Partial<PipelineState>>;

// Pipeline runner type
export type PipelineRunner = (userText: string) => Promise<PipelineState>;


