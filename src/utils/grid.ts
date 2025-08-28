import type { GridSpec, GridPosition } from '../types/dsl';

// ---- constants
const DEFAULT_BASELINE = 8;

// ---- helpers
function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function snapToBaseline(v: number, baseline?: number) {
  if (!baseline || baseline <= 0) return v;
  return Math.round(v / baseline) * baseline;
}

// Convert a top-left rect to center-origin rect (y grows downward)
function topLeftRectToCenter(
  rect: { x: number; y: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number
) {
  return {
    x: rect.x - canvasWidth / 2,
    y: rect.y - canvasHeight / 2,
    width: rect.width,
    height: rect.height,
  };
}

// Optional DPR rounding (avoids blur on canvas)
function roundDpr(v: number, integerPixels?: boolean, dpr = 1) {
  return integerPixels ? Math.round(v * dpr) / dpr : v;
}

// ---- core grid math (in TOP-LEFT space)
export function computeTrackWidths(spec: GridSpec, canvasWidth: number) {
  const { columns, gutterX, marginX } = spec;
  const trackWidth = (canvasWidth - 2 * marginX - (columns - 1) * gutterX) / columns;
  return { trackWidth };
}

type CoordSystem = 'top-left' | 'center';

export function gridToRect(
  spec: GridSpec,
  pos: GridPosition,
  canvasWidth: number,
  canvasHeight: number,
  opts?: {
    clampToCanvas?: boolean;
    integerPixels?: boolean;
    devicePixelRatio?: number;
    coordinateSystem?: CoordSystem; // NEW: default 'center'
  }
) {
  const {
    columns, gutterX, marginX,
    rows, rowHeight, gutterY, marginY, baseline = DEFAULT_BASELINE
  } = spec;

  const coordinateSystem = opts?.coordinateSystem ?? 'center';

  // Validate indices (1-based)
  if (pos.colStart < 1 || pos.colStart > columns) {
    throw new Error(`colStart ${pos.colStart} out of range [1, ${columns}]`);
  }
  if (pos.colSpan < 1 || pos.colStart + pos.colSpan - 1 > columns) {
    throw new Error(
      `colSpan ${pos.colSpan} exceeds columns (last col ${pos.colStart + pos.colSpan - 1} > ${columns})`
    );
  }
  if (pos.rowStart < 1 || pos.rowStart > rows) {
    throw new Error(`rowStart ${pos.rowStart} out of range [1, ${rows}]`);
  }
  if (pos.rowSpan < 1 || pos.rowStart + pos.rowSpan - 1 > rows) {
    throw new Error(
      `rowSpan ${pos.rowSpan} exceeds rows (last row ${pos.rowStart + pos.rowSpan - 1} > ${rows})`
    );
  }

  // Column math
  const { trackWidth } = computeTrackWidths(spec, canvasWidth);
  let x = marginX + (pos.colStart - 1) * (trackWidth + gutterX);
  let width = pos.colSpan * trackWidth + (pos.colSpan - 1) * gutterX;

  // Row math
  let y = marginY + (pos.rowStart - 1) * (rowHeight + gutterY);
  let height = pos.rowSpan * rowHeight + (pos.rowSpan - 1) * gutterY;

  // Clamp in top-left space to keep inside margins
  if (opts?.clampToCanvas ?? true) {
    const maxX = canvasWidth - marginX;
    const maxY = canvasHeight - marginY;
    x = clamp(x, marginX, maxX);
    width = clamp(width, 0, maxX - x);
    y = clamp(y, marginY, maxY);
    height = clamp(height, 0, maxY - y);
  }

  // Baseline snap (vertical rhythm) in top-left space
  y = snapToBaseline(y, baseline);
  height = Math.max(snapToBaseline(height, baseline), 0);

  // DPR rounding (optional)
  const dpr = opts?.devicePixelRatio ?? 1;
  x = roundDpr(x, opts?.integerPixels, dpr);
  y = roundDpr(y, opts?.integerPixels, dpr);
  width = roundDpr(width, opts?.integerPixels, dpr);
  height = roundDpr(height, opts?.integerPixels, dpr);

  // Convert to requested coordinate system
  if (coordinateSystem === 'center') {
    return topLeftRectToCenter({ x, y, width, height }, canvasWidth, canvasHeight);
  }
  return { x, y, width, height }; // top-left
}

// Convenience: center point within the computed rect (returns center-origin coords if you asked for 'center')
export function gridToCenter(
  spec: GridSpec,
  pos: GridPosition,
  canvasWidth: number,
  canvasHeight: number,
  opts?: Parameters<typeof gridToRect>[4]
) {
  const rect = gridToRect(spec, pos, canvasWidth, canvasHeight, opts);
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    width: rect.width,
    height: rect.height
  };
}
