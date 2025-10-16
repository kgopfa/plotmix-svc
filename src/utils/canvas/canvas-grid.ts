import { measureTextWidthAdvanced } from './text-width';

// Canvas dimensions and center origin
export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const CANVAS_CENTER_X = 0;
export const CANVAS_CENTER_Y = 0;

// Grid system constants
export const GRID_UNIT = 60; // Base unit for spacing (60px)
export const GRID_MARGIN = 40; // Margin from canvas edges

// Vertical zones for different content types
export const ZONES = {
  TOP: -400,           // Heading area
  SUBTITLE: -320,      // Subtitle area  
  CAPTION: -280,       // Caption area
  CONTENT_START: -210, // Start of main content
  CONTENT_MID: 0,      // Center content (arrays)
  CONTENT_END: 280,    // End of main content
  BOTTOM: 400          // Bottom area
} as const;

// Text width caps for different element types
export const TEXT_WIDTH_CAPS = {
  HEADING: 1200,
  SUBTITLE: 1000,
  CAPTION: 700,
  LIST_TITLE: 800,
  LIST_ITEM: 800,
  CODE_TITLE: 800,
  CODE_LINE: 800,
  EXAMPLE: 1200,
  ALTERNATIVE: 1000,
  EDGECASE: 1000,
  APPROACH: 1000
} as const;

/**
 * Calculate text width with proper font weight support
 */
export function calculateTextWidth(
  text: string, 
  fontSize: number, 
  fontFamily: string, 
  fontWeight: string = 'normal'
): number {
  return measureTextWidthAdvanced(text, fontSize, fontFamily, fontWeight);
}

/**
 * Calculate the height of text accounting for word wrapping
 * Returns the actual height the text will occupy when rendered
 */
export function calculateTextHeight(
  text: string,
  fontSize: number,
  fontFamily: string,
  maxWidth: number,
  fontWeight: string = 'normal',
  lineHeight: number = 1.2
): { height: number; lineCount: number } {
  // Calculate actual text width
  const actualWidth = calculateTextWidth(text, fontSize, fontFamily, fontWeight);
  
  // If text fits within maxWidth, it's single line
  if (actualWidth <= maxWidth) {
    return {
      height: fontSize * lineHeight,
      lineCount: 1
    };
  }
  
  // Estimate number of lines needed by word wrapping
  // This is an approximation: split by words and measure
  const words = text.split(/\s+/);
  let currentLineWidth = 0;
  let lineCount = 1;
  const spaceWidth = calculateTextWidth(' ', fontSize, fontFamily, fontWeight);
  
  for (const word of words) {
    const wordWidth = calculateTextWidth(word, fontSize, fontFamily, fontWeight);
    
    // Check if adding this word would exceed maxWidth
    if (currentLineWidth + wordWidth + (currentLineWidth > 0 ? spaceWidth : 0) > maxWidth) {
      // Start new line
      lineCount++;
      currentLineWidth = wordWidth;
    } else {
      // Add to current line
      currentLineWidth += wordWidth + (currentLineWidth > 0 ? spaceWidth : 0);
    }
  }
  
  return {
    height: fontSize * lineHeight * lineCount,
    lineCount
  };
}

/**
 * Calculate word wrap width for text elements
 * This determines the maximum width before text should wrap
 */
export function calculateWordWrapWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: string = 'normal'
): number {
  // For word wrap, we calculate based on character count and font size
  // This is a heuristic approach since we can't easily measure wrapped text
  
  // If text is short enough to fit on one line, return the actual width
  const actualWidth = calculateTextWidth(text, fontSize, fontFamily, fontWeight);
  if (actualWidth <= TEXT_WIDTH_CAPS.HEADING) {
    return actualWidth;
  }
  
  // Otherwise, return a reasonable wrap width
  return Math.min(actualWidth, TEXT_WIDTH_CAPS.HEADING);
}

/**
 * Get capped text width for specific element types
 */
export function getCappedTextWidth(
  text: string,
  fontSize: number,
  fontFamily: string,
  elementType: keyof typeof TEXT_WIDTH_CAPS,
  fontWeight: string = 'normal'
): number {
  const calculatedWidth = calculateTextWidth(text, fontSize, fontFamily, fontWeight);
  const maxWidth = TEXT_WIDTH_CAPS[elementType];
  return Math.min(calculatedWidth, maxWidth);
}

/**
 * Position elements in a vertical stack with proper spacing
 */
export function getStackedPosition(
  baseY: number,
  index: number,
  spacing: number = GRID_UNIT
): number {
  return baseY + (index * spacing);
}

/**
 * Position elements in groups of 8 with proper spacing
 * Used for alternatives, edgecases, and approaches
 */
export function getGroupedPosition(
  order: number,
  baseY: number,
  spacing: number = GRID_UNIT
): number {
  const positionInGroup = (order - 1) % 8; // 0-7 positions within group
  return baseY + (positionInGroup * spacing);
}

/**
 * Get horizontal position for centered content
 */
export function getCenteredX(): number {
  return CANVAS_CENTER_X;
}

/**
 * Get horizontal position for left-aligned content
 */
export function getLeftAlignedX(offset: number = 0): number {
  return -CANVAS_WIDTH / 2 + GRID_MARGIN + offset;
}

/**
 * Get horizontal position for right-aligned content
 */
export function getRightAlignedX(offset: number = 0): number {
  return CANVAS_WIDTH / 2 - GRID_MARGIN - offset;
}

/**
 * Position array elements with proper centering
 */
export function getArrayPositions(
  count: number,
  cellWidth: number,
  gap: number = 80
): number[] {
  const stepX = cellWidth + gap;
  const totalWidth = (count - 1) * stepX;
  const startX = -totalWidth / 2;
  
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    positions.push(startX + (i * stepX));
  }
  
  return positions;
}

/**
 * Get zone-based Y position
 */
export function getZoneY(zone: keyof typeof ZONES, offset: number = 0): number {
  return ZONES[zone] + offset;
}

/**
 * Calculate optimal cell dimensions for arrays
 */
export function calculateOptimalCellDimensions(
  values: (string | number)[],
  fontSize: number,
  fontFamily: string,
  minCellSize: number = 60
): { width: number; height: number } {
  let maxTextWidth = 0;
  
  for (const value of values) {
    const textStr = String(value);
    const textWidth = calculateTextWidth(textStr, fontSize, fontFamily);
    maxTextWidth = Math.max(maxTextWidth, textWidth);
  }
  
  // Add padding and ensure minimum size
  const optimalWidth = Math.max(maxTextWidth + 20, minCellSize);
  const optimalHeight = Math.max(fontSize * 1.5, minCellSize);

  return { width: optimalWidth, height: optimalHeight };
}

/**
 * Grid positioning system for canvas elements
 */
export class CanvasGrid {
  private zoneCounts: Record<string, number> = {};
  private zoneCurrentY: Record<string, number> = {};
  
  /**
   * Get next position for a specific zone
   * Multiple element types can share the same zone
   */
  getNextPosition(
    _elementType: string,
    zone: keyof typeof ZONES,
    spacing: number = GRID_UNIT
  ): { x: number; y: number } {
    // Use cumulative Y position if available, otherwise use base zone Y
    const currentY = this.zoneCurrentY[zone];
    const y = currentY !== undefined ? currentY : ZONES[zone];
    const x = getCenteredX();
    
    // Update cumulative Y for next element (will be overridden by advanceZone if height is known)
    this.zoneCurrentY[zone] = y + spacing;
    this.zoneCounts[zone] = (this.zoneCounts[zone] || 0) + 1;
    
    return { x, y };
  }
  
  /**
   * Advance the Y position in a zone by a specific height
   * Call this after creating an element to account for its actual height
   */
  advanceZone(
    zone: keyof typeof ZONES,
    height: number,
    spacing: number = GRID_UNIT
  ): void {
    const currentY = this.zoneCurrentY[zone];
    if (currentY !== undefined) {
      this.zoneCurrentY[zone] = currentY + height + spacing;
    }
  }
  
  /**
   * Get grouped position for elements that appear in groups of 8
   */
  getGroupedPosition(
    _elementType: string,
    order: number,
    zone: keyof typeof ZONES,
    spacing: number = GRID_UNIT
  ): { x: number; y: number } {
    const y = getGroupedPosition(order, ZONES[zone], spacing);
    const x = getCenteredX();
    
    return { x, y };
  }
  
  /**
   * Reset counters for new scene
   */
  reset(): void {
    this.zoneCounts = {};
    this.zoneCurrentY = {};
  }
  
  /**
   * Get current count for zone
   */
  getCount(zone: keyof typeof ZONES): number {
    return this.zoneCounts[zone] || 0;
  }
}
