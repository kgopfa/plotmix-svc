// Project data structure types for the separated mainState and configuration approach

export interface ProjectMainState {
  // Canvas elements and groups
  elements: AnimatedCanvasObject[];
  groups: CanvasGroup[];
  
  // Timeline and animation data
  timeline: {
    scale: number;
    duration: number;
    currentTime: number;
    animationStates: Record<string, AnimationState>;
  };
  
  // Canvas dimensions
  dimensions: {
    width: number;
    height: number;
  };
}

export interface ProjectConfiguration {
  // Canvas size settings
  canvasSize: {
    currentSizeId: string;
    customSize?: { width: number; height: number } | null;
  };
  
  // UI state
  ui: {
    zoom: number;
    selectedElements: string[];
    selectedGroups: string[];
    panelState: {
      leftPanelVisible: boolean;
      rightPanelVisible: boolean;
      leftPanelWidth: number;
      rightPanelWidth: number;
      timelineHeight: number;
      isTimelineCollapsed: boolean;
    };
    toolState: {
      activeTool: string;
      isPathMode: boolean;
      showPaths: boolean;
    };
  };
  
  // Editor preferences
  editor: {
    selectedShape?: string;
    snappingEnabled: boolean;
    gridEnabled: boolean;
    gridSize: number;
    showGuides: boolean;
    // Extended snapping configuration
    snapping: {
      grid: {
        enabled: boolean;
        visible: boolean;
        size: number;
        snapThreshold: number;
      };
      elements: {
        enabled: boolean;
        snapThreshold: number;
        showGuides: boolean;
        enableSpacing: boolean;
        enableDistribution: boolean;
      };
    };
  };
  
  // Animation preferences
  animation: {
    playbackRate: number;
    isLooping: boolean;
    autoPlay: boolean;
  };
}

// Canvas element types
export interface AnimatedCanvasObject {
  id: string;
  name: string;
  type: 'rectangle' | 'circle' | 'triangle' | 'arc' | 'line' | 'path' | 'image' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  visible?: boolean;
  zIndex?: number;
  rotation?: number;
  pivotX?: number;
  pivotY?: number;
  animations: ElementAnimation[];
  groupId?: string;
  parent?: string | null;
  
  // Shape-specific properties
  cornerRadius?: number; // Rectangle
  radius?: number; // Circle
  lineOptions?: LineOptions; // Line
  pathPoints?: Array<{ x: number; y: number }>; // Path
  imageData?: string; // Image
  text?: string; // Text
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
  letterSpacing?: number;
  wordWrap?: boolean;
  wordWrapWidth?: number;
  
  // Shadow properties
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowAngle?: number;
  
  // Animation path flag
  isAnimationPath?: boolean;
}

export interface LineOptions {
  points: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
  controlPoint?: { x: number; y: number };
  arrow: boolean;
  dotted: boolean;
  isCurved?: boolean;
}

// Canvas group types
export interface CanvasGroup {
  id: string;
  name: string;
  elementIds: string[];
  x: number;
  y: number;
  rotation?: number;
  visible?: boolean;
  opacity?: number;
  type: 'text' | 'custom' | 'polygon';
  isDefaultGroup: boolean;
  isAnimationPath?: boolean;
  animations: ElementAnimation[];
  parent?: string | null;
  
  // Text-specific properties (when type === 'text')
  characters?: string[];
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  letterSpacing?: number;
  
  // Polygon-specific properties (when type === 'polygon')
  isClosed?: boolean;
}

// Animation types
export interface ElementAnimation {
  id: string;
  displayName: string;
  type: AnimationType;
  startTime: number;
  duration: number;
  properties: AnimatableProperties;
  easing?: GsapEase;
  repeat?: number;
  repeatDelay?: number;
  yoyo?: boolean;
  yoyoReturnEasing?: GsapEase;
  stagger?: number;
  staggerFrom?: 'start' | 'end' | 'center';
  staggerEase?: GsapEase;
}

export type AnimationType = 
  | 'rotate' 
  | 'scale' 
  | 'move' 
  | 'color' 
  | 'fade' 
  | 'path' 
  | 'typewriter' 
  | 'textScale' 
  | 'physics';

export interface AnimatableProperties {
  // Position and size
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  
  // Visual properties
  fillColor?: string;
  alpha?: number;
  
  // Transform properties
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  pivotX?: number;
  pivotY?: number;
  
  // Shape-specific properties
  radius?: number;
  cornerRadius?: number;
  
  // Shadow properties
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  
  // Path properties
  pathPoints?: Array<{x: number, y: number}>;
  pathDirection?: 'clockwise' | 'counterclockwise';
  pathElement?: AnimatedCanvasObject | CanvasGroup;
  isPolygonPath?: boolean;
  
  // Text properties
  text?: string;
  fontSize?: number;
  letterSpacing?: number;
  
  // Physics properties
  velocity?: number;
  angle?: number;
  gravity?: number;
  acceleration?: number;
  accelerationAngle?: number;
  friction?: number;
  xProp?: string;
  yProp?: string;
}

export interface AnimationState {
  // Source of truth
  baseDuration: number;
  repeat?: number;
  repeatDelay?: number;
  yoyo?: boolean;
  
  // Computed/cached values
  effectiveDuration: number;
  effectiveEndTime: number;
}

export type GsapEase = 
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

// Utility types for database operations
export interface ProjectSaveData {
  mainState: ProjectMainState;
  configuration: ProjectConfiguration;
}

export interface ProjectLoadData {
  mainState: ProjectMainState;
  configuration: ProjectConfiguration | null;
}
