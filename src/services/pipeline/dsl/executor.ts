import type { ActionProgram, Scene, Group, Rect, TextEl } from '../../../types';
import type { StylePack } from '../../../types';
import { pickStyle } from '../procedural/seed';
import STYLES from '../procedural/layout/styles';
import { randomUUID } from 'crypto';
// Use center-origin helpers for array placement aligned to a center-based grid
import { computeCenteredXPositions } from '../../../utils/grid';
 
// Calculate optimal cell dimensions based on content
function calculateOptimalCellDimensions(
  values: (string | number)[], 
  style: StylePack,
  minCellSize: number = 60
): { width: number; height: number } {
  // Find the longest text value
  const longestValue = values.reduce((longest: string, current) => {
    const currentStr = String(current);
    return currentStr.length > longest.length ? currentStr : longest;
  }, '');

  // Estimate text width based on font metrics
  // For monospace fonts, each character is roughly 0.6x the font size
  // For proportional fonts, estimate 0.7x the font size per character
  const isMonospace = style.typography.family.includes('monospace');
  const charWidth = isMonospace ? 0.6 : 0.7;
  const estimatedTextWidth = longestValue.length * style.typography.size * charWidth;
  
  // Add padding for visual comfort (20% on each side)
  const textWidthWithPadding = estimatedTextWidth * 1.4;
  
  // Ensure minimum cell size while accommodating text
  const optimalWidth = Math.max(minCellSize, Math.ceil(textWidthWithPadding));
  
  // Height should accommodate font size with line height and padding
  const textHeightWithPadding = style.typography.size * 1.2 * 1.4;
  const optimalHeight = Math.max(minCellSize, Math.ceil(textHeightWithPadding));
  
  return { width: optimalWidth, height: optimalHeight };
}

// Element builders (cell group) - CORRECTED to use consistent center-origin positioning
function makeCell(
  style: StylePack, 
  value: string|number, 
  centerX: number, 
  centerY: number,
  cellWidth: number,
  cellHeight: number
): { group: Group; rect: Rect; text: TextEl } {
  const gid = randomUUID();
  const rid = randomUUID();
  const tid = randomUUID();

  // Rectangle positioned at center with center pivots
  const rect: Rect = {
    animations: [],
    fill: style.cell.fill,
    x: centerX, 
    y: centerY,
    id: rid,
    name: `Rectangle ${value}`,
    type: "rectangle",
    width: cellWidth, 
    height: cellHeight,
    pivotX: cellWidth / 2,  // Center pivot
    pivotY: cellHeight / 2, // Center pivot
    stroke: style.cell.stroke,
    zIndex: 1,
    groupId: gid,
    opacity: 1, 
    visible: true,
    shadowBlur: style.shadow.shadowBlur,
    shadowColor: style.shadow.shadowColor,
    strokeWidth: style.cell.strokeWidth,
    cornerRadius: style.cell.radius,
    shadowEnabled: style.shadow.shadowEnabled,
    shadowOffsetX: style.shadow.shadowOffsetX,
    shadowOffsetY: style.shadow.shadowOffsetY,
    shadowOpacity: style.shadow.shadowOpacity,
    isAnimationPath: false,
  };

  // Calculate actual text dimensions based on font metrics
  const textStr = String(value);
  const isMonospace = style.typography.family.includes('monospace');
  const charWidth = isMonospace ? 0.6 : 0.7;
  const estimatedTextWidth = textStr.length * style.typography.size * charWidth;
  const textWidth = Math.min(estimatedTextWidth, cellWidth * 0.9); // Cap at 90% of cell width
  const textHeight = style.typography.size * 1.2; // Line height based on font size

  // Text positioned at center with center pivots
  const text: TextEl = {
    animations: [],
    fill: style.palette.text,
    x: centerX, // Center position
    y: centerY, // Center position
    id: tid,
    name: `Text ${value}`,
    text: textStr,
    type: "text",
    width: textWidth,
    height: textHeight,
    pivotX: textWidth / 2,  // Center pivot
    pivotY: textHeight / 2, // Center pivot
    zIndex: 2,
    groupId: gid,
    opacity: 1,
    visible: true,
    fontSize: style.typography.size,
    wordWrap: false,
    fontStyle: "normal",
    textAlign: "center",
    fontFamily: style.typography.family,
    fontWeight: String(style.typography.weight),
    lineHeight: 1.2,
    shadowBlur: style.shadow.shadowBlur,
    shadowColor: style.shadow.shadowColor,
    strokeWidth: 0,
    cornerRadius: 0,
    letterSpacing: 0,
    shadowEnabled: style.shadow.shadowEnabled,
    shadowOffsetX: style.shadow.shadowOffsetX,
    shadowOffsetY: style.shadow.shadowOffsetY,
    shadowOpacity: style.shadow.shadowOpacity,
    wordWrapWidth: 0,
    textStrokeJoin: "round",
    isAnimationPath: false,
    textStrokeWidth: 0,
  };

  const group: Group = {
    animations: [],
    elementIds: [rid, tid],
    x: 0,
    y: 0,
    id: gid,
    name: `Array Cell ${value}`,
    type: "custom",
    opacity: 1,
    rotation: 0,
    isDefaultGroup: false,
  };

  return { group, rect, text };
}

// Text element function removed - only arrays are processed

// Executor core - Grid-based automatic positioning
export function execute(program: ActionProgram): Scene {
  // Defaults
  let seed = 0;
  let style: StylePack = STYLES[0]!;
  
  const groups: Group[] = [];
  const elements: (Rect|TextEl)[] = [];
  
  // Canvas constants (center-origin) not needed for center placement

  for (const act of program) {
    if (act.kind === "SETUP") {
      // Only update seed when it is a meaningful value (non-zero)
      if (typeof act.seed === 'number' && !Number.isNaN(act.seed) && act.seed !== 0) {
        seed = act.seed;
      }

      // Recompute style if a style directive is present
      if (typeof act.style === 'string') {
        style = act.style === "auto" ? pickStyle(seed) : (STYLES.find(s => s.name === act.style) ?? STYLES[0]!);
      }
    }

    if (act.kind === "DRAW_ARRAY") {
      // Center-origin positioning for arrays aligned to center-start grid lines
      const minCellSize = act.cell ?? style.cell.w;
      const gap = act.gap ?? 16;

      // Calculate optimal cell dimensions based on content
      const { width: cellWidth, height: cellHeight } = calculateOptimalCellDimensions(
        act.values, 
        style, 
        minCellSize
      );

      // Place middle item at x=0 using symmetric spacing (gap + cell width as step)
      const stepX = cellWidth + gap;
      const arrayY = 0; // center row per requirement
      const canvasWidth = 1920;
      const marginX = 40;
      const centerXs = computeCenteredXPositions(act.values.length, stepX, canvasWidth, marginX);
      
      act.values.forEach((v, i) => {
        const centerX = centerXs[i]!;
        const centerY = arrayY;
        const { group, rect, text } = makeCell(style, v, centerX, centerY, cellWidth, cellHeight);
        groups.push(group);
        elements.push(rect, text);
      });
      
      // All arrays share center row
    }

    // Only process arrays for now - text elements are ignored

    // (future) DRAW_STACK, DRAW_QUEUE, DRAW_LINKED_LIST, DRAW_TREE...
  }

  return {
    groups,
    elements,
    timeline: { scale: 100, duration: 1, currentTime: 0, animationStates: {} },
  };
}