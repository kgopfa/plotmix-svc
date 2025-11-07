// Lazy-load canvas to avoid native module issues if dependencies aren't available
let canvasModule: any = null;

function getCanvas(): any {
  if (canvasModule === null) {
    try {
      canvasModule = require('canvas');
    } catch (error) {
      // Canvas not available, will use fallback estimation
      canvasModule = false;
    }
  }
  return canvasModule;
}

/**
 * Fallback text width estimation when canvas is not available
 */
function estimateTextWidth(text: string, fontSize: number): number {
  // Simple estimation: average character width * character count
  // This is a rough approximation but works when canvas isn't available
  const avgCharWidth = fontSize * 0.6; // Rough average for most fonts
  return text.length * avgCharWidth;
}

/**
 * Accurately measure text width using Canvas API
 * Falls back to estimation if canvas is not available
 */
export function measureTextWidth(text: string, fontSize: number, fontFamily: string): number {
  const canvas = getCanvas();
  if (!canvas) {
    return estimateTextWidth(text, fontSize);
  }

  try {
    // Create a canvas for measuring text
    const canvasInstance = canvas.createCanvas(1, 1);
    const context = canvasInstance.getContext('2d');
    
    // Set the font to match the desired text style
    context.font = `${fontSize}px ${fontFamily}`;
    
    // Measure the text width
    const metrics = context.measureText(text);
    return metrics.width;
  } catch (error) {
    // If canvas fails, fall back to estimation
    return estimateTextWidth(text, fontSize);
  }
}

/**
 * Measure text width with additional font properties (weight, style)
 * Falls back to estimation if canvas is not available
 */
export function measureTextWidthAdvanced(
  text: string, 
  fontSize: number, 
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
): number {
  const canvas = getCanvas();
  if (!canvas) {
    return estimateTextWidth(text, fontSize);
  }

  try {
    const canvasInstance = canvas.createCanvas(1, 1);
    const context = canvasInstance.getContext('2d');
    
    // Extract the first font from the font family stack for better compatibility
    const primaryFont = fontFamily.split(',')[0]?.trim().replace(/['"]/g, '') || 'sans-serif';
    
    // Build complete font string
    const fontString = `${fontStyle} ${fontWeight} ${fontSize}px ${primaryFont}`;
    context.font = fontString;
    
    const metrics = context.measureText(text);
    return metrics.width;
  } catch (error) {
    // If canvas fails, fall back to estimation
    return estimateTextWidth(text, fontSize);
  }
}

/**
 * Get text metrics including width, height, and other properties
 * Falls back to basic metrics if canvas is not available
 */
export function getTextMetrics(
  text: string, 
  fontSize: number, 
  fontFamily: string,
  fontWeight: string = 'normal',
  fontStyle: string = 'normal'
) {
  const canvas = getCanvas();
  if (!canvas) {
    // Return basic metrics when canvas is not available
    const width = estimateTextWidth(text, fontSize);
    return {
      width,
      actualBoundingBoxAscent: fontSize * 0.8,
      actualBoundingBoxDescent: fontSize * 0.2,
      fontBoundingBoxAscent: fontSize,
      fontBoundingBoxDescent: 0,
    };
  }

  try {
    const canvasInstance = canvas.createCanvas(1, 1);
    const context = canvasInstance.getContext('2d');
    
    const fontString = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    context.font = fontString;
    
    return context.measureText(text);
  } catch (error) {
    // If canvas fails, return basic metrics
    const width = estimateTextWidth(text, fontSize);
    return {
      width,
      actualBoundingBoxAscent: fontSize * 0.8,
      actualBoundingBoxDescent: fontSize * 0.2,
      fontBoundingBoxAscent: fontSize,
      fontBoundingBoxDescent: 0,
    };
  }
}
