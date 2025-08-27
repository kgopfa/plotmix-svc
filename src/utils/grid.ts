import type { GridSpec, GridPosition } from '../types/dsl';

/**
 * Grid system utilities for converting grid positions to pixel coordinates
 * Based on CSS Grid and design system principles
 */

export function computeTrackWidths(spec: GridSpec, canvasWidth: number) {
  const { columns, gutterX, marginX } = spec;
  const trackWidth = (canvasWidth - 2 * marginX - (columns - 1) * gutterX) / columns;
  return { trackWidth };
}

function snap(value: number, baseline?: number) {
  if (!baseline || baseline <= 0) return value;
  return Math.round(value / baseline) * baseline;
}

export function gridToRect(
  spec: GridSpec, 
  pos: GridPosition, 
  canvasWidth: number, 
  canvasHeight: number
) {
  const {
    columns, gutterX, marginX,
    rows, rowHeight, gutterY, marginY, baseline
  } = spec;

  // Validate grid position
  if (pos.colStart < 1 || pos.colStart > columns) {
    throw new Error(`colStart ${pos.colStart} out of range [1, ${columns}]`);
  }
  if (pos.colSpan < 1 || pos.colStart + pos.colSpan - 1 > columns) {
    throw new Error(`colSpan ${pos.colSpan} exceeds available columns`);
  }
  if (pos.rowStart < 1 || pos.rowStart > rows) {
    throw new Error(`rowStart ${pos.rowStart} out of range [1, ${rows}]`);
  }
  if (pos.rowSpan < 1 || pos.rowStart + pos.rowSpan - 1 > rows) {
    throw new Error(`rowSpan ${pos.rowSpan} exceeds available rows`);
  }

  // Calculate column positioning
  const trackWidth = (canvasWidth - 2 * marginX - (columns - 1) * gutterX) / columns;
  const x = marginX + (pos.colStart - 1) * (trackWidth + gutterX);
  const width = pos.colSpan * trackWidth + (pos.colSpan - 1) * gutterX;

  // Calculate row positioning
  const yRaw = marginY + (pos.rowStart - 1) * (rowHeight + gutterY);
  const heightRaw = pos.rowSpan * rowHeight + (pos.rowSpan - 1) * gutterY;
  
  // Ensure we don't exceed canvas bounds
  const maxY = canvasHeight - marginY;
  const clampedY = Math.min(yRaw, maxY);
  const clampedHeight = Math.min(heightRaw, maxY - clampedY);

  // Snap to baseline if specified
  const y = snap(clampedY, baseline);
  const height = Math.max(snap(clampedHeight, baseline), 0);

  return { x, y, width, height };
}

/**
 * Apply minimum height constraint while respecting baseline snapping
 */
export function applyMinHeight(
  rect: { x: number; y: number; width: number; height: number },
  minHeight: number,
  baseline?: number
) {
  const snappedMin = snap(minHeight, baseline);
  return { ...rect, height: Math.max(rect.height, snappedMin) };
}

/**
 * Get default grid specification for common canvas sizes
 */
export function getDefaultGrid(canvasWidth: number, canvasHeight: number): GridSpec {
  // Adaptive grid based on canvas size
  const isWide = canvasWidth > canvasHeight;
  
  if (isWide) {
    // Wide screens: more columns, fewer rows
    return {
      columns: 12,
      gutterX: Math.max(20, Math.floor(canvasWidth * 0.01)),
      marginX: Math.max(80, Math.floor(canvasWidth * 0.04)),
      rows: Math.max(16, Math.floor(canvasHeight / 60)),
      rowHeight: 40,
      gutterY: Math.max(16, Math.floor(canvasHeight * 0.015)),
      marginY: Math.max(60, Math.floor(canvasHeight * 0.06)),
      baseline: 8
    };
  } else {
    // Tall screens: fewer columns, more rows
    return {
      columns: 8,
      gutterX: Math.max(16, Math.floor(canvasWidth * 0.015)),
      marginX: Math.max(60, Math.floor(canvasWidth * 0.05)),
      rows: Math.max(20, Math.floor(canvasHeight / 50)),
      rowHeight: 36,
      gutterY: Math.max(12, Math.floor(canvasHeight * 0.012)),
      marginY: Math.max(50, Math.floor(canvasHeight * 0.05)),
      baseline: 6
    };
  }
}

/**
 * Convert grid position to center coordinates for element positioning
 */
export function gridToCenter(
  spec: GridSpec, 
  pos: GridPosition, 
  canvasWidth: number, 
  canvasHeight: number
) {
  const rect = gridToRect(spec, pos, canvasWidth, canvasHeight);
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
    width: rect.width,
    height: rect.height
  };
}
