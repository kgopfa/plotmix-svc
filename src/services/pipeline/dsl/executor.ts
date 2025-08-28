import type { ActionProgram, Scene, Group, Rect, TextEl, GridSpec } from '../../../types';
import type { StylePack } from '../../../types';
import { pickStyle } from '../procedural/seed';
import STYLES from '../../../specs/styles';
import { randomUUID } from 'crypto';
import { gridToRect } from '../../../utils/grid';



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

// Element builders (cell group)
function makeCell(
  style: StylePack, 
  value: string|number, 
  x: number, 
  y: number,
  cellWidth: number,
  cellHeight: number
): { group: Group; rect: Rect; text: TextEl } {
  const gid = randomUUID();
  const rid = randomUUID();
  const tid = randomUUID();

  const rect: Rect = {
    animations: [],
    fill: style.cell.fill,
    x, y,
    id: rid,
    name: `Rectangle ${value}`,
    type: "rectangle",
    width: cellWidth, 
    height: cellHeight,
    pivotX: cellWidth / 2, 
    pivotY: cellHeight / 2,
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

  const text: TextEl = {
    animations: [],
    fill: style.palette.text,
    x: x, // Same as cell center
    y: y, // Same as cell center
    id: tid,
    name: `Text ${value}`,
    text: textStr,
    type: "text",
    width: textWidth,
    height: textHeight,
    pivotX: 0, // No pivot offset - we calculate exact position
    pivotY: 0, // No pivot offset - we calculate exact position
    zIndex: 2,
    groupId: gid,
    opacity: 1, 
    visible: true,
    fontSize: style.typography.size,
    wordWrap: true,
    fontStyle: "normal",
    textAlign: style.typography.align,
    fontFamily: style.typography.family,
    fontWeight: style.typography.weight, // Now a string, no conversion needed
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
    wordWrapWidth: textWidth, // Match actual text width
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
  let style: StylePack = STYLES[0]!;
  let grid: GridSpec | undefined = undefined;
  let canvasWidth = 1920;
  let canvasHeight = 1080;

  const groups: Group[] = [];
  const elements: (Rect|TextEl)[] = [];
  
  // Automatic layout state (fallback when grid not used)
  let currentY = 0; // Start at center
  const verticalSpacing = 120; // Space between different elements

  for (const act of program) {
    if (act.kind === "SETUP") {
      // Only update seed when it is a meaningful value (non-zero)
      if (typeof act.seed === 'number' && !Number.isNaN(act.seed) && act.seed !== 0) {
        seed = act.seed;
      }

      // Update canvas dimensions
      canvasWidth = act.canvas.width;
      canvasHeight = act.canvas.height;

      // Recompute style if a style directive is present
      if (typeof act.style === 'string') {
        style = act.style === "auto" ? pickStyle(seed) : (STYLES.find(s => s.name === act.style) ?? STYLES[0]!);
      }

      // Set up grid system
      if (act.grid) {
        grid = act.grid;
      } 
    }

    if (act.kind === "DRAW_ARRAY") {
      if (act.gridPosition && grid) {
        // Use grid-based positioning
        const rect = gridToRect(grid, act.gridPosition, canvasWidth, canvasHeight);
        const cellWidth = rect.width / act.values.length;
        const cellHeight = rect.height;
        
        act.values.forEach((v, i) => {
          const x = rect.x + i * cellWidth + cellWidth / 2;
          const y = rect.y + cellHeight / 2;
          const { group, rect: cellRect, text } = makeCell(style, v, x, y, cellWidth, cellHeight);
          groups.push(group);
          elements.push(cellRect, text);
        });
      } else {
        // Fallback to automatic positioning
        const gap = act.gap ?? 16; // Default gap
        const minCellSize = act.cell ?? style.cell.w;

        // Calculate optimal cell dimensions based on content
        const { width: cellWidth, height: cellHeight } = calculateOptimalCellDimensions(
          act.values, 
          style, 
          minCellSize
        );

        // Calculate total width and position array at center
        const totalWidth = act.values.length * cellWidth + (act.values.length - 1) * gap;
        const startX = -totalWidth / 2; // Center the array horizontally

        act.values.forEach((v, i) => {
          const x = startX + i * (cellWidth + gap) + cellWidth / 2;
          const y = currentY;
          const { group, rect, text } = makeCell(style, v, x, y, cellWidth, cellHeight);
          groups.push(group);
          elements.push(rect, text);
        });
        
        currentY += verticalSpacing; // Move down for next element
      }
    }

    if (act.kind === "DRAW_TEXT") {
      if (act.gridPosition && grid) {
        // Use grid-based positioning
        const rect = gridToRect(grid, act.gridPosition, canvasWidth, canvasHeight);
        const width = act.width ?? rect.width;
        const size = act.size ?? 28;
        const weight = act.weight ?? 600;
        const align = act.align ?? "left";
        
        // Calculate actual text dimensions for proper centering
        const textStr = act.text;
        const isMonospace = style.typography.family.includes('monospace');
        const charWidth = isMonospace ? 0.6 : 0.7;
        const estimatedTextWidth = textStr.length * size * charWidth;
        const textWidth = Math.min(estimatedTextWidth, width);
        const textHeight = Math.max(size * 1.2, 40);

        const textEl: TextEl = {
          animations: [],
          fill: style.palette.text,
          x: rect.x + rect.width / 2, // Center of grid cell
          y: rect.y + rect.height / 2, // Center of grid cell
          id: randomUUID(),
          name: `Text ${act.text.slice(0, 20)}`,
          text: textStr,
          type: "text",
          width: textWidth,
          height: textHeight,
          pivotX: 0, // No pivot offset - we calculate exact position
          pivotY: 0,
          zIndex: 3,
          groupId: "",
          opacity: 1,
          visible: true,
          fontSize: size,
          wordWrap: false, // Disable word wrap for single-line text
          fontStyle: "normal",
          textAlign: align,
          fontFamily: style.typography.family,
          fontWeight: String(weight),
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
          wordWrapWidth: width,
          textStrokeJoin: "round",
          isAnimationPath: false,
          textStrokeWidth: 0,
        };
        
        elements.push(textEl);
      } else {
        // Fallback to automatic positioning
        const width = act.width ?? 600;
        const size = act.size ?? 28;
        const weight = act.weight ?? 600;
        const align = act.align ?? "left";
        
        // Calculate actual text dimensions for proper centering
        const textStr = act.text;
        const isMonospace = style.typography.family.includes('monospace');
        const charWidth = isMonospace ? 0.6 : 0.7;
        const estimatedTextWidth = textStr.length * size * charWidth;
        const textWidth = Math.min(estimatedTextWidth, width);
        const textHeight = Math.max(size * 1.2, 40);
        
        const textEl: TextEl = {
          animations: [],
          fill: style.palette.text,
          x: 0, // Center horizontally
          y: currentY,
          id: randomUUID(),
          name: `Text ${act.text.slice(0, 20)}`,
          text: textStr,
          type: "text",
          width: textWidth,
          height: textHeight,
          pivotX: 0, // No pivot offset - we calculate exact position
          pivotY: 0,
          zIndex: 3,
          groupId: "",
          opacity: 1,
          visible: true,
          fontSize: size,
          wordWrap: false, // Disable word wrap for single-line text
          fontStyle: "normal",
          textAlign: align,
          fontFamily: style.typography.family,
          fontWeight: String(weight),
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
          wordWrapWidth: width,
          textStrokeJoin: "round",
          isAnimationPath: false,
          textStrokeWidth: 0,
        };
        
        elements.push(textEl);
        currentY += verticalSpacing; // Move down for next element
      }
    }

    // (future) DRAW_STACK, DRAW_QUEUE, DRAW_LINKED_LIST, DRAW_TREE...
  }

  return {
    groups,
    elements,
    timeline: { scale: 100, duration: 1, currentTime: 0, animationStates: {} },
  };
}
