// Action-oriented DSL for building/updating mainState deterministically

export type EasingAllowlist =
  | 'none'
  | 'power1.in' | 'power1.out' | 'power1.inOut'
  | 'power2.in' | 'power2.out' | 'power2.inOut'
  | 'power3.in' | 'power3.out' | 'power3.inOut'
  | 'power4.in' | 'power4.out' | 'power4.inOut'
  | 'back.in' | 'back.out' | 'back.inOut'
  | 'elastic.in' | 'elastic.out' | 'elastic.inOut'
  | 'bounce.in' | 'bounce.out' | 'bounce.inOut'
  | 'sine.in' | 'sine.out' | 'sine.inOut'
  | 'expo.in' | 'expo.out' | 'expo.inOut'
  | 'circ.in' | 'circ.out' | 'circ.inOut';

export type GroupType = 'text' | 'custom' | 'polygon';

export interface DslContext {
  canvas?: { width?: number; height?: number };
  defaults?: {
    fontFamily?: string;
    easing?: EasingAllowlist;
    duration?: number;
  };
}

export interface AddElementAction {
  type: 'addElement';
  element: {
    id?: string;
    name?: string;
    type: 'rectangle' | 'circle' | 'triangle' | 'text' | 'image' | 'line' | 'path';
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    fill?: string; // "#RRGGBB" | "none"
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    zIndex?: number;
    // Shape-specific
    cornerRadius?: number; // rectangle
    radius?: number; // circle
    // Text-specific
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
    wordWrap?: boolean;
    wordWrapWidth?: number;
    // Line-specific
    lineOptions?: { points: { start: { x: number; y: number }; end: { x: number; y: number } } };
    // Path-specific
    pathPoints?: Array<{ x: number; y: number }>;
    // Shadows
    shadowEnabled?: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowOpacity?: number;
  };
}

export interface GroupElementsAction {
  type: 'groupElements';
  group: {
    id?: string;
    name?: string;
    type: GroupType;
    x?: number;
    y?: number;
    isDefaultGroup?: boolean;
    elementIds: string[];
  };
}

export interface SetStyleAction {
  type: 'setStyle';
  targetId: string;
  props: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
    fontFamily?: string;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
    cornerRadius?: number;
    // Shadows
    shadowEnabled?: boolean;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowOpacity?: number;
  };
}

export interface AnimateAction {
  type: 'animate';
  targetId: string;
  animation: {
    id?: string;
    name?: string;
    type: 'move' | 'scale' | 'rotate' | 'fade' | 'custom';
    startTime: number;
    duration: number;
    easing?: EasingAllowlist;
    properties: {
      x?: number;
      y?: number;
      opacity?: number;
      rotation?: number;
      scaleX?: number;
      scaleY?: number;
      [key: string]: unknown;
    };
  };
}

export interface SetTimelineAction {
  type: 'setTimeline';
  timeline: {
    scale?: number;
    duration?: number;
    currentTime?: number;
  };
}

export type Action =
  | AddElementAction
  | GroupElementsAction
  | SetStyleAction
  | AnimateAction
  | SetTimelineAction;

export interface ActionPlan {
  context?: DslContext;
  actions: Action[];
}


