import type { ActionProgram, Scene, Group, Rect, TextEl } from '../../../types';
import type { StylePack } from '../../../types';
import { pickStyle } from '../procedural/seed';
import STYLES from '../../../specs/styles';

// Deterministic ID generation
function hashStr(s: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { 
    h ^= s.charCodeAt(i); 
    h = Math.imul(h, 16777619) >>> 0; 
  }
  return h.toString(16);
}

function idFor(seed: number, parts: string[]): string { 
  return `${parts[0]}-${hashStr([seed, ...parts].join("|"))}`; 
}

// Element builders (cell group)
function makeCell(
  seed: number, 
  style: StylePack, 
  idx: number, 
  value: string|number, 
  x: number, 
  y: number
): { group: Group; rect: Rect; text: TextEl } {
  const gid = idFor(seed, ["group", "idx", String(idx)]);
  const rid = idFor(seed, ["rect", "idx", String(idx)]);
  const tid = idFor(seed, ["text", "idx", String(idx)]);

  const rect: Rect = {
    animations: [],
    fill: style.palette.cellFill,
    x, y,
    id: rid,
    name: `Rectangle ${value}`,
    type: "rectangle",
    width: style.cell.w, 
    height: style.cell.h,
    pivotX: 50, 
    pivotY: 50,
    stroke: style.palette.cellStroke,
    zIndex: 1,
    groupId: gid,
    opacity: 1, 
    visible: true,
    shadowBlur: style.shadow.blur,
    shadowColor: "#000000",
    strokeWidth: style.cell.stroke,
    cornerRadius: style.cell.radius,
    shadowEnabled: style.shadow.enabled,
    shadowOffsetX: style.shadow.dx,
    shadowOffsetY: style.shadow.dy,
    shadowOpacity: style.shadow.opacity,
    isAnimationPath: false,
  };

  const text: TextEl = {
    animations: [],
    fill: style.palette.text,
    x, y,
    id: tid,
    name: `Text ${value}`,
    text: String(value),
    type: "text",
    width: Math.max(20, 0.33 * style.cell.w), // sensible default
    height: 0.51 * style.cell.h,
    pivotX: 220, 
    pivotY: 100,
    zIndex: 2,
    groupId: gid,
    opacity: 1, 
    visible: true,
    fontSize: style.typography.size,
    wordWrap: true,
    fontStyle: "normal",
    textAlign: style.typography.align,
    fontFamily: style.typography.family,
    fontWeight: style.typography.weight,
    lineHeight: 1.2,
    shadowBlur: 0, 
    shadowColor: "#000000",
    strokeWidth: 0,
    cornerRadius: 0,
    letterSpacing: 0,
    shadowEnabled: false,
    shadowOffsetX: 10, 
    shadowOffsetY: 10,
    shadowOpacity: 0.5,
    wordWrapWidth: 440,
    textStrokeJoin: "round",
    isAnimationPath: false,
    textStrokeWidth: 0,
  };

  const group: Group = {
    animations: [],
    elementIds: [rid, tid],
    x, y,
    id: gid,
    name: `Cell ${value}`,
    type: "custom",
    opacity: 1,
    rotation: 0,
    isDefaultGroup: false,
  };

  return { group, rect, text };
}

// Executor core
export function execute(program: ActionProgram): Scene {
  // Defaults
  let seed = 0;
  let canvas = { width: 1280, height: 720 };
  let style: StylePack = STYLES[0]!;

  const groups: Group[] = [];
  const elements: (Rect|TextEl)[] = [];

  for (const act of program) {
    if (act.kind === "SETUP") {
      seed = act.seed;
      canvas = act.canvas ?? canvas;
      style = act.style === "auto" ? pickStyle(seed) : (STYLES.find(s => s.name === act.style) ?? STYLES[0]!);
    }

    if (act.kind === "DRAW_ARRAY") {
      const gap = act.gap;
      const cellW = act.cell ?? style.cell.w;
      const { x: x0, y: y0 } = act.at;

      act.values.forEach((v, i) => {
        const x = x0 + i * (cellW + gap);
        const y = y0;
        const { group, rect, text } = makeCell(seed, style, i, v, x, y);
        groups.push(group);
        elements.push(rect, text);
      });
    }

    if (act.kind === "DRAW_TEXT") {
      const textEl: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: act.at.x,
        y: act.at.y,
        id: idFor(seed, ["text", "standalone", String(elements.length)]),
        name: `Text ${act.text.slice(0, 20)}`,
        text: act.text,
        type: "text",
        width: act.width,
        height: Math.max(act.size * 1.2, 40),
        pivotX: 0,
        pivotY: 0,
        zIndex: 3,
        groupId: "",
        opacity: 1,
        visible: true,
        fontSize: act.size,
        wordWrap: true,
        fontStyle: "normal",
        textAlign: act.align,
        fontFamily: style.typography.family,
        fontWeight: act.weight,
        lineHeight: 1.2,
        shadowBlur: 0,
        shadowColor: "#000000",
        strokeWidth: 0,
        cornerRadius: 0,
        letterSpacing: 0,
        shadowEnabled: false,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        shadowOpacity: 0,
        wordWrapWidth: act.width,
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0,
      };
      
      elements.push(textEl);
    }

    // (future) DRAW_STACK, DRAW_QUEUE, DRAW_LINKED_LIST, DRAW_TREE...
  }

  return {
    groups,
    elements,
    timeline: { scale: 100, duration: 1, currentTime: 0, animationStates: {} },
  };
}
