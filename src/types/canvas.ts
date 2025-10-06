
export type ElementType = 
  | "rectangle" 
  | "circle" 
  | "triangle" 
  | "arc" 
  | "line" 
  | "path" 
  | "image" 
  | "text" 
  | "code-editor"
  | "polygon";

export type FontWeight = "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900";
export type FontStyle = "normal" | "italic" | "oblique";
export type TextAlign = "left" | "center" | "right" | "justify";
export type TextStrokeJoin = "round" | "miter" | "bevel";
export type GroupType = "text" | "custom" | "polygon";
export type StaggerFrom = "start" | "end" | "center";
export type PathDirection = "clockwise" | "counterclockwise";

export type GsapEase = 
  | "none"
  | "power1.in" | "power1.out" | "power1.inOut"
  | "power2.in" | "power2.out" | "power2.inOut"
  | "power3.in" | "power3.out" | "power3.inOut"
  | "power4.in" | "power4.out" | "power4.inOut"
  | "back.in" | "back.out" | "back.inOut"
  | "elastic.in" | "elastic.out" | "elastic.inOut"
  | "bounce.in" | "bounce.out" | "bounce.inOut"
  | "sine.in" | "sine.out" | "sine.inOut"
  | "expo.in" | "expo.out" | "expo.inOut"
  | "circ.in" | "circ.out" | "circ.inOut";

export type AnimationType = 
  | "move" 
  | "rotate" 
  | "scale" 
  | "fade" 
  | "color" 
  | "path" 
  | "typewriter" 
  | "textScale" 
  | "physics";

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

export interface PathPoints {
  x: number;
  y: number;
}

export interface PolygonOptions {
  points: PathPoints[];
  isClosed: boolean;
}

export interface TextDropShadow {
  color: string;
  blur: number;
  angle: number;
  distance: number;
  alpha: number;
}

export interface TextGradientColor {
  color: string;
  offset: number;
}

export interface TextGradient {
  type: "linear" | "radial";
  colors: TextGradientColor[];
  angle?: number;
  center?: { x: number; y: number };
  radius?: number;
}

export interface TimelineAnimation {
  id: string;
  name: string;
  type: AnimationType;
  target: { type: "element" | "group"; id: string };
  tracks: Array<{
    property: string;
    from: number;
    to: number;
  }>;
  startTime: number;
  duration: number;
  easing?: GsapEase;
  repeat?: number;
  repeatDelay?: number;
  yoyo?: boolean;
  yoyoReturnEasing?: GsapEase;
  stagger?: number;
  staggerFrom?: StaggerFrom;
  staggerEase?: GsapEase;
}

export interface CanvasElement {
  id: string;
  name: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  cornerRadius?: number;
  radius?: number;
  rotation?: number;
  pivotX?: number;
  pivotY?: number;
  opacity?: number;
  visible?: boolean;
  zIndex?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shadowAngle?: number;
  lineOptions?: LineOptions;
  pathPoints?: PathPoints[];
  polygonOptions?: PolygonOptions;
  imageData?: string;
  arcOptions?: Record<string, unknown>;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  textAlign?: TextAlign;
  lineHeight?: number;
  letterSpacing?: number;
  wordWrap?: boolean;
  wordWrapWidth?: number;
  textStroke?: string;
  textStrokeWidth?: number;
  textStrokeJoin?: TextStrokeJoin;
  textDropShadow?: TextDropShadow;
  textGradient?: TextGradient;
  groupId?: string;
  parent?: string | null;
  isAnimationPath?: boolean;
}


export interface CanvasGroup {
  id: string;
  name: string;
  elementIds: string[];
  x: number;
  y: number;
  rotation?: number;
  visible?: boolean;
  opacity?: number;
  type: GroupType;
  isDefaultGroup?: boolean;
  isAnimationPath?: boolean;
  isClosed?: boolean;
  characters?: string[];
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: FontWeight;
  fontStyle?: FontStyle;
  textAlign?: TextAlign;
  letterSpacing?: number;
  parent?: string | null;
}


export interface PlaybackConfig {
  scale: number;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
}


export interface Timeline {
  animations: TimelineAnimation[];
}

export interface SceneCanvas {
  elements: CanvasElement[];
  groups: CanvasGroup[];
  timeline: Timeline;
  playback: PlaybackConfig;
}

export interface Scene {
  sceneId: string;
  sceneName: string;
  sceneCanvas: SceneCanvas;
}

export interface ProjectDimensions {
  width: number;
  height: number;
}

export interface MainState {
  elements: CanvasElement[];
  groups: CanvasGroup[];
  timeline: Timeline;
  playback: PlaybackConfig;
  dimensions: ProjectDimensions;
}

export interface ProjectDocument {
  name: string;
  title: string;
  description?: string;
  mainState: MainState;
}

export const isValidElementType = (type: string): type is ElementType => {
  return ["rectangle", "circle", "triangle", "arc", "line", "path", "image", "text", "code-editor", "polygon"].includes(type);
};

export const isValidAnimationType = (type: string): type is AnimationType => {
  return ["move", "rotate", "scale", "fade", "color", "path", "typewriter", "textScale", "physics"].includes(type);
};

export const isValidGsapEase = (ease: string): ease is GsapEase => {
  const validEases: GsapEase[] = [
    "none",
    "power1.in", "power1.out", "power1.inOut",
    "power2.in", "power2.out", "power2.inOut",
    "power3.in", "power3.out", "power3.inOut",
    "power4.in", "power4.out", "power4.inOut",
    "back.in", "back.out", "back.inOut",
    "elastic.in", "elastic.out", "elastic.inOut",
    "bounce.in", "bounce.out", "bounce.inOut",
    "sine.in", "sine.out", "sine.inOut",
    "expo.in", "expo.out", "expo.inOut",
    "circ.in", "circ.out", "circ.inOut"
  ];
  return validEases.includes(ease as GsapEase);
};
