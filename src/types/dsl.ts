export type Action =
  | { kind: "SETUP"; seed: number; style: "auto"|string }
  | { kind: "DRAW_ARRAY"; values: (number|string)[]; gap?: number; cell?: number }
  | { kind: "ANIMATE"; type: "highlight"|"select"|"focus"|"compare"; elements: (number|string)[]; startTime: number; duration: number }
  | { kind: "CAPTION"; order: number; text: string }
  | { kind: "HEADING"; text: string }
  | { kind: "SUBTITLE"; text: string } 
  | { kind: "EXPLANATION"; order: number; text: string }
  | { kind: "APPROACH"; order: number; text: string }
  | { kind: "EXAMPLE"; text: string }
  | { kind: "CONCLUSION"; order: number; text: string }
  | { kind: "EDGECASE"; order: number; text: string }
  | { kind: "ALTERNATIVE"; order: number; text: string }
  | { kind: "PSEUDOCODE"; text: string }
  | { kind: "KEYIDEA"; order: number; text: string };

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
  select: {
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

export interface AnimationStep {
  id: string;
  description: string;
  targetElements: (number | string)[];
  animationType: "highlight" | "select" | "focus" | "compare";
  startTime: number;
  duration: number;
  explanation: string;
}

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

export type Scene = {
  groups: Group[];
  elements: (Rect|TextEl|CodeEditorEl)[];
  timeline: { scale: number; duration: number; currentTime: number; animationStates: Record<string, unknown> };
};
