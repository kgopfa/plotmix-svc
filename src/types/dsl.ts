export type Action =
  | { kind: "SETUP"; seed: number; canvas: { width: number; height: number }; style: "auto"|string; grid?: GridSpec }
  | { kind: "DRAW_ARRAY"; values: (number|string)[]; gap?: number; cell?: number; gridPosition?: GridPosition }
  | { kind: "DRAW_TEXT"; text: string; width?: number; size?: number; weight?: number; align?: "left"|"center"|"right"; gridPosition?: GridPosition };

export type ActionProgram = Action[];

export type GridSpec = {
  columns: number;
  gutterX: number;
  marginX: number;
  rows: number;
  rowHeight: number;
  gutterY: number;
  marginY: number;
  baseline?: number; // optional
};

export type GridPosition = {
  colStart: number; // 1-based
  colSpan: number;
  rowStart: number; // 1-based
  rowSpan: number;
};

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

export type Scene = {
  groups: Group[];
  elements: (Rect|TextEl)[];
  timeline: { scale: number; duration: number; currentTime: number; animationStates: Record<string, unknown> };
};
