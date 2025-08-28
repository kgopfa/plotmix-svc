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

/** Track width in pixels (center or top-left agnostic) */
export function computeTrackWidths(spec: GridSpec, canvasWidth: number) {
  const { columns, gutterX, marginX } = spec;
  const trackWidth = (canvasWidth - 2 * marginX - (columns - 1) * gutterX) / columns;
  return { trackWidth };
}

/**
 * Center-origin grid -> pixel rect.
 * Canvas center is (0,0); top edge is y = -H/2; left edge is x = -W/2.
 */
export function gridToRect(
  spec: GridSpec,
  pos: GridPosition,
  canvasWidth: number,
  canvasHeight: number,
  opts?: { integerPixels?: boolean; devicePixelRatio?: number; clampToCanvas?: boolean }
) {
  const {
    columns, gutterX, marginX,
    rows, rowHeight, gutterY, marginY, baseline
  } = spec;

  // ---- Validate indices (1-based)
  if (pos.colStart < 1 || pos.colStart > columns) {
    throw new Error(`colStart ${pos.colStart} out of range [1, ${columns}]`);
  }
  if (pos.colSpan < 1 || pos.colStart + pos.colSpan - 1 > columns) {
    throw new Error(`colSpan ${pos.colSpan} exceeds columns (last col ${pos.colStart + pos.colSpan - 1} > ${columns})`);
  }
  if (pos.rowStart < 1 || pos.rowStart > rows) {
    throw new Error(`rowStart ${pos.rowStart} out of range [1, ${rows}]`);
  }
  if (pos.rowSpan < 1 || pos.rowStart + pos.rowSpan - 1 > rows) {
    throw new Error(`rowSpan ${pos.rowSpan} exceeds rows (last row ${pos.rowStart + pos.rowSpan - 1} > ${rows})`);
  }

  const W = canvasWidth;
  const H = canvasHeight;
  const xLeft = -W / 2;
  const xRight =  W / 2;
  const yTop =  -H / 2;
  const yBottom = H / 2;

  // ---- Horizontal math (center space)
  const { trackWidth: TW } = computeTrackWidths(spec, W);
  const xStart = xLeft + marginX;
  const maxX  = xRight - marginX;

  let x = xStart + (pos.colStart - 1) * (TW + gutterX);
  let width = pos.colSpan * TW + (pos.colSpan - 1) * gutterX;

  // ---- Vertical math (center space)
  const yStart = yTop + marginY;           // IMPORTANT: starts at -540 + marginY
  const maxY  = yBottom - marginY;

  let y = yStart + (pos.rowStart - 1) * (rowHeight + gutterY);
  let height = pos.rowSpan * rowHeight + (pos.rowSpan - 1) * gutterY;

  // ---- Clamp to canvas usable area (inside margins)
  if (opts?.clampToCanvas ?? true) {
    x = Math.min(Math.max(x, xStart), maxX);
    width = Math.min(Math.max(width, 0), maxX - x);

    y = Math.min(Math.max(y, yStart), maxY);
    height = Math.min(Math.max(height, 0), maxY - y);
  }

  // ---- Baseline snap (vertical rhythm) AFTER clamping
  if (baseline) {
    y = Math.round(y / baseline) * baseline;
    height = Math.max(Math.round(height / baseline) * baseline, 0);
  }

  // ---- DPR/integer rounding (optional)
  if (opts?.integerPixels) {
    const dpr = opts.devicePixelRatio ?? 1;
    const round = (v: number) => Math.round(v * dpr) / dpr;
    x = round(x);
    y = round(y);
    width = round(width);
    height = round(height);
  }

  return { x, y, width, height };
}

/** Convenience: center point within the computed rect (still center-origin) */
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
    height: rect.height,
  };
}

/**
 * Center-origin helpers for grid lines that start at the canvas center (x=0, y=0)
 * and expand outward left/right and up/down using a specified step (gap/pitch).
 * These are generic utilities not tied to column track widths. Useful for
 * aligning content (like array cells) to center-based grid lines.
 */
export function generateCenteredIndices(count: number): number[] {
  // Example: 5 -> [-2, -1, 0, 1, 2]; 4 -> [-1.5, -0.5, 0.5, 1.5]
  if (count <= 0) return [];
  const indices: number[] = [];
  const half = (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    indices.push(i - half);
  }
  return indices;
}

export function centeredIndexToCenterX(
  index: number,
  stepX: number,
  canvasWidth: number,
  marginX: number
): number {
  const halfW = canvasWidth / 2;
  const usableHalf = halfW - marginX;
  const x = index * stepX; // 0 at center; symmetric outward
  return Math.min(Math.max(x, -usableHalf), usableHalf);
}

export function centeredIndexToCenterY(
  index: number,
  stepY: number,
  canvasHeight: number,
  marginY: number
): number {
  const halfH = canvasHeight / 2;
  const usableHalf = halfH - marginY;
  const y = index * stepY; // 0 at center; positive is down
  return Math.min(Math.max(y, -usableHalf), usableHalf);
}
