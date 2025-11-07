/**
 * Character width multipliers for more accurate text width estimation
 * Based on typical proportional font character widths
 */
const CHAR_WIDTH_MULTIPLIERS: Record<string, number> = {
  // Narrow characters
  'i': 0.25, 'l': 0.25, 't': 0.3, 'f': 0.35, 'j': 0.3, 'r': 0.35,
  'I': 0.35, 'J': 0.4, 'L': 0.4, 'T': 0.5, 'F': 0.45,
  // Normal width
  ' ': 0.3, // Space
  // Wide characters
  'W': 1.0, 'M': 1.0, 'Q': 0.95, 'O': 0.9, 'D': 0.85, 'G': 0.85,
  'w': 0.9, 'm': 0.95,
  // Very wide
  '@': 1.1, '#': 0.85,
};

/**
 * Calculate text width estimation based on font properties
 * This is a pure JavaScript solution that doesn't require native dependencies
 */
function estimateTextWidth(
  text: string, 
  fontSize: number, 
  fontFamily: string,
  fontWeight: string = 'normal'
): number {
  // Check if monospace font
  const isMonospace = /mono|courier|consolas|menlo|inconsolata/i.test(fontFamily);
  
  // Base character width multiplier
  let baseMultiplier = 0.6; // Average for proportional fonts
  if (isMonospace) {
    baseMultiplier = 0.6; // Monospace is more consistent
  }
  
  // Adjust for font weight
  const weightMultiplier = fontWeight === 'bold' || fontWeight === '700' || parseInt(fontWeight) >= 700 
    ? 1.1 
    : 1.0;
  
  // Calculate width character by character for better accuracy
  let totalWidth = 0;
  for (const char of text) {
    const charMultiplier = CHAR_WIDTH_MULTIPLIERS[char] || baseMultiplier;
    totalWidth += fontSize * charMultiplier * weightMultiplier;
  }
  
  // Add spacing for proportional fonts (kerning approximation)
  if (!isMonospace && text.length > 1) {
    totalWidth += (text.length - 1) * fontSize * 0.05;
  }
  
  return totalWidth;
}

/**
 * Measure text width using estimation algorithm
 * Pure JavaScript solution - no native dependencies required
 */
export function measureTextWidth(text: string, fontSize: number, fontFamily: string): number {
  return estimateTextWidth(text, fontSize, fontFamily, 'normal');
}

/**
 * Measure text width with additional font properties (weight, style)
 * Pure JavaScript solution - no native dependencies required
 */
export function measureTextWidthAdvanced(
  text: string, 
  fontSize: number, 
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): number {
  // Extract the first font from the font family stack
  const primaryFont = fontFamily.split(',')[0]?.trim().replace(/['"]/g, '') || 'sans-serif';
  
  // Adjust for italic (slightly wider due to character slant)
  const styleMultiplier = fontStyle === 'italic' ? 1.05 : 1.0;
  const baseWidth = estimateTextWidth(text, fontSize, primaryFont, fontWeight);
  
  return baseWidth * styleMultiplier;
}

/**
 * Get text metrics including width, height, and other properties
 * Pure JavaScript solution - no native dependencies required
 */
export function getTextMetrics(
  text: string, 
  fontSize: number, 
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
) {
  const width = measureTextWidthAdvanced(text, fontSize, fontFamily, fontWeight, fontStyle);
  
  // Return estimated metrics
  return {
    width,
    actualBoundingBoxAscent: fontSize * 0.8,
    actualBoundingBoxDescent: fontSize * 0.2,
    fontBoundingBoxAscent: fontSize,
    fontBoundingBoxDescent: 0,
    alphabeticBaseline: fontSize * 0.8,
    emHeightAscent: fontSize * 0.8,
    emHeightDescent: fontSize * 0.2,
    hangingBaseline: fontSize * 0.7,
    ideographicBaseline: fontSize * 0.8,
  };
}
