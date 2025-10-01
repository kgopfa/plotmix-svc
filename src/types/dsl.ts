// Content types for the unified format
export type ContentItem = 
  | { type: "heading"; data: string[] }
  | { type: "list"; data: string[]; title?: string }
  | { type: "codeblock"; data: string[]; title?: string }
  | { type: "demo"; dataStructure: DataStructure; steps: DemoStep[] };

export type DSLSceneStructure = {
  id: string;
  name: string;
  content: ContentItem[];
};

export type DataStructure = {
  type: "array";
  data: (number | string)[];
};

export type DemoAction = {
  type: "highlight" | "unhighlight" | "select" | "deselect" | "focus" | "compare" | "pointer";
  indices?: number[]; // For highlight/select actions
  name?: string; // For pointer actions (e.g., "left", "right")
  index?: number; // For pointer actions
};

export type DemoStep = {
  caption?: string; // Caption is now optional since it can be part of actions
  actions?: DemoAction[]; // Optional actions for this step
};

export type JsonAnimationProgram = {
  scenes?: DSLSceneStructure[];
  content?: ContentItem[]; // Legacy support
};

// Legacy types (kept for backward compatibility)
export type AnimationStep = {
  action: "highlight" | "unhighlight" | "select" | "deselect" | "focus" | "compare";
  indices: number[];
  caption: string;
  duration?: number;
  easing?: string;
  yoyo?: boolean;
  repeat?: number;
};

export type ListItem = {
  type: "list";
  data: string[];
  title?: string;
};

export type DemoSection = {
  dataStructure: DataStructure;
  steps: DemoStep[];
};

// Internal Action types for the executor (converted from JSON)
export type Action =
  | { kind: "SETUP"; seed: number; style: "auto"|string }
  | { kind: "DRAW_ARRAY"; values: (number|string)[]; gap?: number; cell?: number }
  | { kind: "ANIMATE"; type: "highlight"|"unhighlight"|"select"|"deselect"|"focus"|"compare"|"pointer"; elements: (number|string)[]; startTime: number; duration: number; pointerName?: string }
  | { kind: "CAPTION"; order: number; text: string }
  | { kind: "HEADING"; text: string }
  | { kind: "SUBTITLE"; order: number; text: string }
  | { kind: "DRAW_LIST"; data: string[]; title?: string }
  | { kind: "DRAW_CODEBLOCK"; data: string[]; title?: string };

// Central configuration for video timing and section organization
export interface VideoTimelineConfig {
  elementSections: {
    intro: string[];
    main: string[];
    conclusion: string[];
  };
  elementTiming?: {
    [elementType: string]: {
      fadeInDuration?: number;
      fadeOutDuration?: number;
      staggerDelay?: number;
      startTime?: number;
      endTime?: number;
      visibleTime?: number;
      fadeOutStartTime?: number;
    };
  };
}

// Configuration for caption timing
export interface CaptionConfig {
  visibleTime: number; // How long each caption stays visible (default: 3s)
  fadeInDuration: number; // Duration of fade-in animation (default: 0.5s)
  fadeOutDuration: number; // Duration of fade-out animation (default: 0.5s)
  transitionType: "fade" | "slide"; // Type of transition animation
}

export type AnimationPack = {
  name: string;
  highlight: {
    type: string;
    properties: Record<string, any>;
    duration: number;
    easing: string;
    yoyo: boolean;
    repeat: number;
  };
  unhighlight: {
    type: string;
    properties: Record<string, any>;
    duration: number;
    easing: string;
    yoyo: boolean;
    repeat: number;
  };
  select: {
    type: string;
    properties: Record<string, any>;
    duration: number;
    easing: string;
    yoyo: boolean;
    repeat: number;
  };
  deselect: {
    type: string;
    properties: Record<string, any>;
    duration: number;
    easing: string;
    yoyo: boolean;
    repeat: number;
  };
  focus: {
    type: string;
    properties: Record<string, any>;
    duration: number;
    easing: string;
    yoyo: boolean;
    repeat: number;
  };
  compare: {
    type: string;
    properties: Record<string, any>;
    duration: number;
    easing: string;
    yoyo: boolean;
    repeat: number;
  };
};


export interface AnimationPlan {
  title: string;
  scenario: {
    goal: string;
    inputs: any;
    assumptions: string[];
  };
  steps: Array<{
    id: string;
    label: string;
    state: any;
    visual?: {
      highlight?: (string | number)[];
      pointers?: any;
      relations?: string[][];
    };
    explanation: string;
  }>;
  reference: {
    kind: "pseudocode" | "outline";
    lines: string[];
  };
  metrics: {
    totalSteps: number;
  };
}

export type ActionProgram = Action[];

export type Group = {
  animations: any[]; elementIds: string[]; x: number; y: number; id: string; name: string;
  type: "custom"; opacity: number; rotation: number; isDefaultGroup: boolean;
};

export type Rect = {
  animations: any[]; fill: string; x: number; y: number; id: string; name: string; type: "rectangle";
  width: number; height: number; pivotX: number; pivotY: number; stroke: string; zIndex: number; groupId: string;
  opacity: number; visible: boolean; shadowBlur: number; shadowColor: string; strokeWidth: number; cornerRadius: number;
  shadowEnabled: boolean; shadowOffsetX: number; shadowOffsetY: number; shadowOpacity: number; isAnimationPath: boolean;
};

export type TextEl = {
  animations: any[]; fill: string; x: number; y: number; id: string; name: string; text: string; type: "text";
  width: number; height: number; pivotX: number; pivotY: number; zIndex: number; groupId: string; opacity: number; visible: boolean;
  fontSize: number; wordWrap: boolean; fontStyle: "normal"|"italic"; textAlign: "left"|"right"|"center";
  fontFamily: string; fontWeight: string|number; lineHeight: number; shadowBlur: number; shadowColor: string; strokeWidth: number;
  cornerRadius: number; letterSpacing: number; shadowEnabled: boolean; shadowOffsetX: number; shadowOffsetY: number; shadowOpacity: number;
  wordWrapWidth: number; textStrokeJoin: "round"|"miter"|"bevel"; isAnimationPath: boolean; textStrokeWidth: number;
};

export type CodeEditorEl = {
  animations: any[]; fill: string; x: number; y: number; id: string; name: string; text: string; type: "code-editor";
  width: number; height: number; pivotX: number; pivotY: number; zIndex: number; groupId: string; opacity: number; visible: boolean;
  fontSize: number; wordWrap: boolean; fontStyle: "normal"|"italic"; textAlign: "left"|"right"|"center";
  fontFamily: string; fontWeight: string|number; lineHeight: number; shadowBlur: number; shadowColor: string; strokeWidth: number;
  cornerRadius: number; letterSpacing: number; shadowEnabled: boolean; shadowOffsetX: number; shadowOffsetY: number; shadowOpacity: number;
  wordWrapWidth: number; textStrokeJoin: "round"|"miter"|"bevel"; isAnimationPath: boolean; textStrokeWidth: number;
  tabSize?: number; language?: string; syntaxTheme?: string; showLineNumbers?: boolean; showLineHighlight?: boolean;
};
