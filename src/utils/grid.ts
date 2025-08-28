import type { GridSpec, GridPosition } from '../types/dsl';

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

function snapBaseline(v: number, baseline?: number) {
  if (!baseline || baseline <= 0) return v;
  return Math.round(v / baseline) * baseline;
}

// New interfaces for grid line generation
interface GridLine {
  type: 'vertical' | 'horizontal';
  position: number;
  label?: string;
}

interface GridConfig {
  canvasWidth: number;
  canvasHeight: number;
  columns?: number;
  rows?: number;
  baselineGrid?: number;
  useRuleOfThirds?: boolean;
  use8PointGrid?: boolean;
}

class CenterOriginGridGenerator {
  private width: number;
  private height: number;
  private halfWidth: number;
  private halfHeight: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.halfWidth = width / 2;
    this.halfHeight = height / 2;
  }

  // Generate vertical lines (columns) along X-axis
  generateVerticalLines(columns: number): GridLine[] {
    const lines: GridLine[] = [];
    const spacing = this.width / columns;

    // Add center line
    lines.push({ type: 'vertical', position: 0, label: 'center' });

    // Add lines on both sides of center
    for (let i = 1; i <= columns / 2; i++) {
      const pos = i * spacing;
      lines.push({ type: 'vertical', position: pos, label: `+${pos}` });
      lines.push({ type: 'vertical', position: -pos, label: `${-pos}` });
    }

    return lines.filter(line => 
      Math.abs(line.position) <= this.halfWidth
    ).sort((a, b) => a.position - b.position);
  }

  // Generate horizontal lines (rows) along Y-axis
  generateHorizontalLines(rows: number): GridLine[] {
    const lines: GridLine[] = [];
    const spacing = this.height / rows;

    // Add center line
    lines.push({ type: 'horizontal', position: 0, label: 'center' });

    // Add lines on both sides of center
    for (let i = 1; i <= rows / 2; i++) {
      const pos = i * spacing;
      lines.push({ type: 'horizontal', position: pos, label: `+${pos}` });
      lines.push({ type: 'horizontal', position: -pos, label: `${-pos}` });
    }

    return lines.filter(line => 
      Math.abs(line.position) <= this.halfHeight
    ).sort((a, b) => a.position - b.position);
  }

  // Generate baseline grid (typography)
  generateBaselineGrid(baselineSize: number): GridLine[] {
    const lines: GridLine[] = [];
    
    // Start from center and go outward
    lines.push({ type: 'horizontal', position: 0, label: 'baseline-center' });
    
    let pos = baselineSize;
    while (pos <= this.halfHeight) {
      lines.push({ type: 'horizontal', position: pos, label: `baseline+${pos}` });
      lines.push({ type: 'horizontal', position: -pos, label: `baseline${-pos}` });
      pos += baselineSize;
    }

    return lines.sort((a, b) => a.position - b.position);
  }

  // Generate 8-point grid
  generate8PointGrid(): GridLine[] {
    const lines: GridLine[] = [];
    
    // Vertical 8-point lines
    for (let x = -this.halfWidth; x <= this.halfWidth; x += 8) {
      if (x % 8 === 0) {
        lines.push({ type: 'vertical', position: x, label: `8pt-${x}` });
      }
    }

    // Horizontal 8-point lines  
    for (let y = -this.halfHeight; y <= this.halfHeight; y += 8) {
      if (y % 8 === 0) {
        lines.push({ type: 'horizontal', position: y, label: `8pt-${y}` });
      }
    }

    return lines;
  }

  // Generate rule of thirds
  generateRuleOfThirds(): GridLine[] {
    const lines: GridLine[] = [];
    
    // Vertical thirds
    const xThird = this.width / 3;
    lines.push({ type: 'vertical', position: -xThird/2, label: 'third-left' });
    lines.push({ type: 'vertical', position: xThird/2, label: 'third-right' });

    // Horizontal thirds
    const yThird = this.height / 3;
    lines.push({ type: 'horizontal', position: -yThird/2, label: 'third-bottom' });
    lines.push({ type: 'horizontal', position: yThird/2, label: 'third-top' });

    return lines;
  }

  // Main method to generate complete grid
  generateGrid(config: GridConfig): GridLine[] {
    let allLines: GridLine[] = [];

    // Standard column/row grid
    if (config.columns) {
      allLines = allLines.concat(this.generateVerticalLines(config.columns));
    }
    
    if (config.rows) {
      allLines = allLines.concat(this.generateHorizontalLines(config.rows));
    }

    // Baseline grid
    if (config.baselineGrid) {
      allLines = allLines.concat(this.generateBaselineGrid(config.baselineGrid));
    }

    // 8-point grid
    if (config.use8PointGrid) {
      allLines = allLines.concat(this.generate8PointGrid());
    }

    // Rule of thirds
    if (config.useRuleOfThirds) {
      allLines = allLines.concat(this.generateRuleOfThirds());
    }

    return allLines;
  }

  // Helper method to get canvas bounds
  getBounds() {
    return {
      left: -this.halfWidth,
      right: this.halfWidth,
      top: this.halfHeight,
      bottom: -this.halfHeight,
      width: this.width,
      height: this.height
    };
  }
}

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
    x = clamp(x, xStart, maxX);
    width = clamp(width, 0, maxX - x);

    y = clamp(y, yStart, maxY);
    height = clamp(height, 0, maxY - y);
  }

  // ---- Baseline snap (vertical rhythm) AFTER clamping
  y = snapBaseline(y, baseline);
  height = Math.max(snapBaseline(height, baseline), 0);

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

// ---- NEW GRID LINE GENERATION FUNCTIONS ----

/**
 * Generate grid lines for rendering grid guides
 */
export function generateGridLines(config: GridConfig): GridLine[] {
  const generator = new CenterOriginGridGenerator(config.canvasWidth, config.canvasHeight);
  return generator.generateGrid(config);
}

/**
 * Generate simple column/row grid lines
 */
export function generateStandardGrid(
  canvasWidth: number, 
  canvasHeight: number, 
  columns: number, 
  rows: number
): GridLine[] {
  return generateGridLines({
    canvasWidth,
    canvasHeight,
    columns,
    rows
  });
}

/**
 * Generate baseline grid for typography
 */
export function generateBaselineGrid(
  canvasWidth: number,
  canvasHeight: number,
  baselineSize: number
): GridLine[] {
  return generateGridLines({
    canvasWidth,
    canvasHeight,
    baselineGrid: baselineSize
  });
}

/**
 * Generate 8-point design system grid
 */
export function generate8PointGrid(canvasWidth: number, canvasHeight: number): GridLine[] {
  return generateGridLines({
    canvasWidth,
    canvasHeight,
    use8PointGrid: true
  });
}

/**
 * Generate rule of thirds overlay
 */
export function generateRuleOfThirdsGrid(canvasWidth: number, canvasHeight: number): GridLine[] {
  return generateGridLines({
    canvasWidth,
    canvasHeight,
    useRuleOfThirds: true
  });
}

// Export types for external use
export type { GridLine, GridConfig };