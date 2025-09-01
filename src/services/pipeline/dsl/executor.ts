import type { ActionProgram, Scene, Group, Rect, TextEl } from '../../../types';
import type { StylePack } from '../../../types';
import { pickStyle } from '../procedural/seed';
import STYLES from '../procedural/layout/styles';
import { getAnimationConfig } from '../procedural/animation';
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
  
  // Text positioning removed - only arrays and captions supported
  
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
      const gap = 80;

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

    // Text commands removed - only arrays and captions supported

    if (act.kind === "ANIMATE") {
      // Handle animation commands - create animation timeline entries
      // This will be processed by the frontend to show step-by-step progression
      const animationId = randomUUID();
      
      // Get animation configuration from procedural system
      const animConfig = getAnimationConfig(seed, act.type);
      
      // Create proper animation object using procedural configuration
      const animationEntry = {
        id: animationId,
        type: animConfig.type,
        yoyo: animConfig.yoyo,
        easing: animConfig.easing,
        repeat: animConfig.repeat,
        duration: act.duration, // Use DSL duration, but could override with config
        startTime: act.startTime,
        properties: animConfig.properties,
        displayName: `${act.type}-1`,
        repeatDelay: 0
      };

      // Find the target elements that match the animation values
      const targetElements = elements.filter(el => {
        if (el.type === "rectangle") {
          // For rectangles, we need to find the group and check the text element's value
          const group = groups.find(g => g.id === el.groupId);
          if (group) {
            const textElement = elements.find(e => e.type === "text" && e.groupId === group.id);
            if (textElement && textElement.type === "text") {
              // Convert text to number for comparison, since act.elements might be numbers
              const textValue = Number(textElement.text);
              const matches = act.elements.some(target => {
                if (typeof target === 'number') {
                  return target === textValue;
                } else {
                  return target === textElement.text;
                }
              });
              
              return matches;
            }
          }
        }
        return false;
      });

      // Apply animations based on type
      if (animConfig.type === "color") {
        // Color animations go to individual rectangle elements (background)
        targetElements.forEach(element => {
          element.animations.push(animationEntry);
        });
      } else if (animConfig.type === "scale") {
        // Scale animations go to the group (affects entire cell)
        targetElements.forEach(element => {
          const group = groups.find(g => g.id === element.groupId);
          if (group) {
            group.animations.push(animationEntry);
          }
        });
      } else {
        // Default: add to group
        targetElements.forEach(element => {
          const group = groups.find(g => g.id === element.groupId);
          if (group) {
            group.animations.push(animationEntry);
          }
        });
      }
    }

    if (act.kind === "CAPTION") {
      // Handle caption commands - create timed text elements with transitions
      const captionId = randomUUID();
      
      // Position caption at the bottom of the canvas, near the end
      const captionY = 400; // Bottom area of 1920x1080 canvas (center is 0, so bottom is around 400-500)
      const captionX = 0; // Center horizontally
      
      // Create caption text element
      const caption: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: captionX,
        y: captionY,
        id: captionId,
        name: `Caption ${act.order}`,
        text: act.text,
        type: "text",
        width: 800, // Fixed width for captions
        height: style.typography.size * 1.5,
        fontFamily: style.typography.family,
        fontSize: style.typography.size,
        fontWeight: style.typography.weight,
        textAlign: "center",
        pivotX: 400, // Center pivot
        pivotY: (style.typography.size * 1.5) / 2,
        zIndex: 10, // High z-index to appear above other elements
        opacity: 0, // Start invisible
        visible: true,
        groupId: "",
        wordWrap: true,
        fontStyle: "normal",
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
        wordWrapWidth: 800,
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

      // Create transition animations based on transition type
      const fadeInDuration = 0.5; // Quick fade in
      const fadeOutDuration = 0.5; // Quick fade out
      
      if (act.transition === "fade-in") {
        // Fade in animation
        caption.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: act.startTime,
          duration: fadeInDuration,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `caption-${act.order}-fade-in`,
          repeatDelay: 0
        });
        
        // Fade out animation (starts at exitTime)
        caption.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: act.exitTime,
          duration: fadeOutDuration,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `caption-${act.order}-fade-out`,
          repeatDelay: 0
        });
      } else if (act.transition === "fade-out") {
        // Start visible, then fade out
        caption.opacity = 1;
        
        // Fade out animation
        caption.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: act.exitTime,
          duration: fadeOutDuration,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `caption-${act.order}-fade-out`,
          repeatDelay: 0
        });
      } else if (act.transition === "slide-up") {
        // Slide up from below
        caption.y = captionY + 50; // Start below final position
        caption.opacity = 0;
        
        // Slide up and fade in
        caption.animations.push({
          id: randomUUID(),
          type: "move",
          startTime: act.startTime,
          duration: fadeInDuration,
          properties: { y: captionY, alpha: 1 },
          easing: "power1.out",
          yoyo: false,
          repeat: 0,
          displayName: `caption-${act.order}-slide-up`,
          repeatDelay: 0
        });
        
        // Slide down and fade out
        caption.animations.push({
          id: randomUUID(),
          type: "move",
          startTime: act.exitTime,
          duration: fadeOutDuration,
          properties: { y: captionY - 50, alpha: 0 },
          easing: "power1.in",
          yoyo: false,
          repeat: 0,
          displayName: `caption-${act.order}-slide-down`,
          repeatDelay: 0
        });
      } else if (act.transition === "slide-down") {
        // Slide down from above
        caption.y = captionY - 50; // Start above final position
        caption.opacity = 0;
        
        // Slide down and fade in
        caption.animations.push({
          id: randomUUID(),
          type: "move",
          startTime: act.startTime,
          duration: fadeInDuration,
          properties: { y: captionY, alpha: 1 },
          easing: "power1.out",
          yoyo: false,
          repeat: 0,
          displayName: `caption-${act.order}-slide-down`,
          repeatDelay: 0
        });
        
        // Slide up and fade out
        caption.animations.push({
          id: randomUUID(),
          type: "move",
          startTime: act.exitTime,
          duration: fadeOutDuration,
          properties: { y: captionY + 50, alpha: 0 },
          easing: "power1.in",
          yoyo: false,
          repeat: 0,
          displayName: `caption-${act.order}-slide-up`,
          repeatDelay: 0
        });
      }

      elements.push(caption);
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