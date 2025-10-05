import { createCanvas } from 'canvas';

/**
 * Accurately measure text width using Canvas API
 * This provides precise measurements that match browser rendering
 */
export function measureTextWidth(text: string, fontSize: number, fontFamily: string): number {
  // Create a canvas for measuring text
  const canvas = createCanvas(1, 1);
  const context = canvas.getContext('2d');
  
  // Set the font to match the desired text style
  context.font = `${fontSize}px ${fontFamily}`;
  
  // Measure the text width
  const metrics = context.measureText(text);
  return metrics.width;
}

/**
 * Measure text width with additional font properties (weight, style)
 */
export function measureTextWidthAdvanced(
  text: string, 
  fontSize: number, 
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): number {
  const canvas = createCanvas(1, 1);
  const context = canvas.getContext('2d');
  
  // Extract the first font from the font family stack for better compatibility
  const primaryFont = fontFamily.split(',')[0]?.trim().replace(/['"]/g, '') || 'sans-serif';
  
  // Build complete font string
  const fontString = `${fontStyle} ${fontWeight} ${fontSize}px ${primaryFont}`;
  context.font = fontString;
  
  const metrics = context.measureText(text);
  return metrics.width;
}

/**
 * Get text metrics including width, height, and other properties
 */
export function getTextMetrics(
  text: string, 
  fontSize: number, 
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
) {
  const canvas = createCanvas(1, 1);
  const context = canvas.getContext('2d');
  
  const fontString = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  context.font = fontString;
  
  return context.measureText(text);
}
