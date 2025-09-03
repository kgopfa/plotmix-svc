import type { ActionProgram, Scene, Group, Rect, TextEl, CaptionConfig } from '../../../types';
import type { StylePack } from '../../../types';
import { pickStyle } from '../procedural/seed';
import STYLES from '../procedural/layout/styles';
import { getAnimationConfig } from '../procedural/animation';
import { randomUUID } from 'crypto';
// Use center-origin helpers for array placement aligned to a center-based grid
import { computeCenteredXPositions } from '../../../utils/grid';

// Default caption configuration
const DEFAULT_CAPTION_CONFIG: CaptionConfig = {
  visibleTime: 3, // 3 seconds visible time
  fadeInDuration: 0.5, // 0.5 seconds fade in
  fadeOutDuration: 0.5, // 0.5 seconds fade out
  transitionType: "fade" // Use fade transitions
};

// Delay for main algorithm animations (after title sequence)
const ALGORITHM_START_DELAY = 1.5;

// Helper function to calculate text width for proper centering
function calculateTextWidth(text: string, fontSize: number, fontFamily: string): number {
  const isMonospace = fontFamily.includes('monospace');
  // Use different character widths based on font size for better accuracy
  let charWidth: number;
  if (isMonospace) {
    charWidth = 0.4;
  } else if (fontSize >= 60) {
    charWidth = 0.485; // For large fonts (headings)
  } else if (fontSize >= 44) {
    charWidth = 0.699; // For caption fonts (44px) - adjusted to match target
  } else if (fontSize >= 40) {
    charWidth = 0.465; // For conclusion fonts (40px) - adjusted to match target
  } else {
    charWidth = 0.407; // For subtitle fonts (39.6px) - calculated from target ratio
  }
  return text.length * (fontSize * charWidth);
}

// Helper function to calculate word wrap width (used for pivotX calculation)
function calculateWordWrapWidth(text: string, fontSize: number, fontFamily: string): number {
  const isMonospace = fontFamily.includes('monospace');
  const charWidth = isMonospace ? 0.6 : 0.7; // Original character width for word wrap
  return text.length * (fontSize * charWidth);
}
 
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
  
  // Track caption timing to sync animations
  const captionTiming: Map<number, { startTime: number; endTime: number }> = new Map();
  
  // Track animation order for synchronization
  let animationOrder = 0;
  
  // Text positioning removed - only arrays and captions supported
  
  // Canvas constants (center-origin) not needed for center placement

  // First pass: process setup and build caption timing map
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

    if (act.kind === "CAPTION") {
      // Handle caption commands - create timed text elements with transitions
      const captionId = randomUUID();
      
      // Position caption at the bottom of the canvas, near the end
      const captionY = 400; // Bottom area of 1920x1080 canvas (center is 0, so bottom is around 400-500)
      const captionX = 0; // Center horizontally
      
      // Create caption text element with dynamic width based on content
      const captionFontSize = style.typography.size;
      const calculatedCaptionWidth = calculateTextWidth(act.text, captionFontSize, style.typography.family);
      const captionWidth = Math.min(calculatedCaptionWidth, 700); // Use calculated width, max 700px
      const captionHeight = style.typography.size * 1.5;
      
      const caption: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: captionX,
        y: captionY,
        id: captionId,
        name: `Caption ${act.order}`,
        text: act.text,
        type: "text",
        width: captionWidth, // Fixed width like reference data
        height: captionHeight,
        fontFamily: style.typography.family,
        fontSize: captionFontSize,
        fontWeight: style.typography.weight,
        textAlign: "center",
        pivotX: captionWidth / 2, // Center pivot (half of dynamic width)
        pivotY: captionHeight / 2, // Center pivot (half of height)
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
        wordWrapWidth: captionWidth, // Same as width like reference data
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

      // Calculate timing based on caption order
      // Each caption gets: fadeIn + visibleTime + fadeOut
      const totalCaptionDuration = DEFAULT_CAPTION_CONFIG.fadeInDuration + DEFAULT_CAPTION_CONFIG.visibleTime + DEFAULT_CAPTION_CONFIG.fadeOutDuration;
      const startTime = (act.order - 1) * totalCaptionDuration + ALGORITHM_START_DELAY; // Add delay for title sequence
      const fadeInEndTime = startTime + DEFAULT_CAPTION_CONFIG.fadeInDuration;
      const fadeOutStartTime = fadeInEndTime + DEFAULT_CAPTION_CONFIG.visibleTime;
      
      // Store caption timing for animation synchronization
      captionTiming.set(act.order, {
        startTime: startTime,
        endTime: fadeOutStartTime + DEFAULT_CAPTION_CONFIG.fadeOutDuration
      });
      
      // Create fade-in animation
      caption.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: startTime,
        duration: DEFAULT_CAPTION_CONFIG.fadeInDuration,
        properties: { alpha: 1 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: `caption-${act.order}-fade-in`,
        repeatDelay: 0
      });
      
      // Create fade-out animation
      caption.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: fadeOutStartTime,
        duration: DEFAULT_CAPTION_CONFIG.fadeOutDuration,
        properties: { alpha: 0 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: `caption-${act.order}-fade-out`,
        repeatDelay: 0
      });

      elements.push(caption);
    }
  }

  // Second pass: process all other actions
  for (const act of program) {
    if (act.kind === "SETUP" || act.kind === "CAPTION") {
      // Skip these as they were processed in first pass
      continue;
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
      
      // Increment animation order for this animation
      animationOrder++;
      
      // Calculate animation timing based on corresponding caption
      // Animation should start 0.5s after the caption starts (when caption becomes visible)
      const captionInfo = captionTiming.get(animationOrder);
      
      let animationStartTime: number;
      if (captionInfo) {
        // Start animation 0.5s after caption starts (when caption becomes visible)
        animationStartTime = captionInfo.startTime + 0.5;
      } else {
        // Fallback: use original timing if no caption found
        animationStartTime = act.startTime + ALGORITHM_START_DELAY;
      }
      
      // Create proper animation object using procedural configuration
      const animationEntry = {
        id: animationId,
        type: animConfig.type,
        yoyo: animConfig.yoyo,
        easing: animConfig.easing,
        repeat: animConfig.repeat,
        duration: act.duration, // Use DSL duration, but could override with config
        startTime: animationStartTime,
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



    if (act.kind === "HEADING") {
      // Handle heading commands - create static text element at top of canvas
      const headingId = randomUUID();
      
      // Position heading at the top of the canvas, same distance from center as captions
      const headingY = -400; // Top area of 1920x1080 canvas (center is 0, so top is around -400)
      const headingX = 0; // Center horizontally
      
      // Create heading text element
      const headingFontSize = style.typography.size * 1.5;
      const headingTextWidth = calculateTextWidth(act.text, headingFontSize, style.typography.family);
      const headingWordWrapWidth = calculateWordWrapWidth(act.text, headingFontSize, style.typography.family);
      const headingHeight = style.typography.size * 2;
      
      const heading: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: headingX,
        y: headingY,
        id: headingId,
        name: `Heading`,
        text: act.text,
        type: "text",
        width: headingTextWidth, // Use calculated text width
        height: headingHeight,
        fontFamily: style.typography.family,
        fontSize: headingFontSize,
        fontWeight: "bold", // Bold for headings
        textAlign: "center",
        pivotX: headingWordWrapWidth / 2, // Center pivot (half of word wrap width)
        pivotY: headingHeight / 2, // Center pivot (half of height)
        zIndex: 10, // High z-index to appear above other elements
        opacity: 0, // Start invisible for fade-in
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
        wordWrapWidth: headingWordWrapWidth,
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

      // Add fade-in animation for heading
      heading.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: 0.5, // Start at 0.5s
        duration: 1, // 1 second fade-in
        properties: { alpha: 1 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: "heading-fade-in",
        repeatDelay: 0
      });

      elements.push(heading);
    }

    if (act.kind === "SUBTITLE") {
      // Handle subtitle commands - create static text element below heading
      const subtitleId = randomUUID();
      
      // Position subtitle below the heading, same distance from center as captions
      const subtitleY = -320; // Below heading, positioned between heading and array
      const subtitleX = 0; // Center horizontally
      
      // Create subtitle text element
      const subtitleFontSize = style.typography.size * 0.9;
      const subtitleTextWidth = calculateTextWidth(act.text, subtitleFontSize, style.typography.family);
      const subtitleWordWrapWidth = calculateWordWrapWidth(act.text, subtitleFontSize, style.typography.family);
      const subtitleHeight = style.typography.size * 1.5;
      
      const subtitle: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: subtitleX,
        y: subtitleY,
        id: subtitleId,
        name: `Subtitle`,
        text: act.text,
        type: "text",
        width: subtitleTextWidth, // Use calculated text width
        height: subtitleHeight,
        fontFamily: style.typography.family,
        fontSize: subtitleFontSize,
        fontWeight: "normal", // Normal weight for subtitles
        textAlign: "center",
        pivotX: subtitleWordWrapWidth / 2, // Center pivot (half of word wrap width)
        pivotY: subtitleHeight / 2, // Center pivot (half of height)
        zIndex: 10, // High z-index to appear above other elements
        opacity: 0, // Start invisible for fade-in
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
        wordWrapWidth: subtitleWordWrapWidth,
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

      // Add fade-in animation for subtitle (starts after heading)
      subtitle.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: 1, // Start at 1s
        duration: 1, // 1 second fade-in
        properties: { alpha: 1 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: "subtitle-fade-in",
        repeatDelay: 0
      });

      elements.push(subtitle);
    }

    if (act.kind === "CONCLUSION") {
      // Handle conclusion commands - fade out array and show complexity info
      // Calculate when all captions finish: 1.5s start + (numCaptions * 4s) - 0.5s overlap
      const captionActions = program.filter(action => action.kind === "CAPTION");
      const numCaptions = captionActions.length;
      const conclusionStartTime = 1.5 + (numCaptions * 4) - 0.5; // Start after all captions finish
      
      // Fade out all array elements
      elements.forEach(element => {
        if (element.type === "rectangle" || (element.type === "text" && element.groupId)) {
          element.animations.push({
            id: randomUUID(),
            type: "fade",
            startTime: conclusionStartTime,
            duration: DEFAULT_CAPTION_CONFIG.fadeOutDuration, // Use same duration as other fade animations
            properties: { alpha: 0 },
            easing: "power1.inOut",
            yoyo: false,
            repeat: 0,
            displayName: "array-fade-out",
            repeatDelay: 0
          });
        }
      });

      // Fade out all groups
      groups.forEach(group => {
        group.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: conclusionStartTime,
          duration: DEFAULT_CAPTION_CONFIG.fadeOutDuration, // Use same duration as other fade animations
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "group-fade-out",
          repeatDelay: 0
        });
      });

      // Create conclusion text element (rendered over 2 rows)
      const conclusionId = randomUUID();
      const calculatedConclusionWidth = calculateTextWidth(act.text, 40, style.typography.family);
      const conclusionWidth = Math.min(calculatedConclusionWidth, 1200); // Use calculated width, max 1200px
      
      // Calculate timing based on conclusion order (group by pairs)
      const totalConclusionDuration = DEFAULT_CAPTION_CONFIG.fadeInDuration + DEFAULT_CAPTION_CONFIG.visibleTime + DEFAULT_CAPTION_CONFIG.fadeOutDuration;
      const groupIndex = Math.floor((act.order - 1) / 2); // Group by pairs (0, 1, 2, ...)
      const startTime = conclusionStartTime + 1.5 + groupIndex * totalConclusionDuration;
      
      // Position conclusions vertically to avoid overlap
      // Each conclusion is 96px high, so space them 120px apart for good spacing
      const conclusionSpacing = 120;
      const conclusionY = (act.order - 1) * conclusionSpacing - 60; // Center the group around y=0
      
      const conclusion: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: 0, // Center horizontally
        y: conclusionY, // Position vertically to avoid overlap
        id: conclusionId,
        name: `Conclusion ${act.order}`,
        text: act.text,
        type: "text",
        width: conclusionWidth, // Use dynamic width (max 1200px)
        height: 96, // Height for 2 rows (40px * 1.2 line height * 2 rows)
        fontFamily: style.typography.family,
        fontSize: 40,
        fontWeight: "normal", // Use normal weight instead of bold
        textAlign: "center",
        pivotX: conclusionWidth / 2, // Center pivot (half of dynamic width)
        pivotY: 48, // Center pivot for 2-row text
        zIndex: 15,
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
        wordWrapWidth: conclusionWidth, // Use dynamic width for word wrap
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

      // Add fade-in animation for conclusion
      conclusion.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: startTime,
        duration: DEFAULT_CAPTION_CONFIG.fadeInDuration,
        properties: { alpha: 1 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: `conclusion-${act.order}-fade-in`,
        repeatDelay: 0
      });

      // Add fade-out animation for conclusion
      conclusion.animations.push({
        id: randomUUID(),
        type: "fade",
        startTime: startTime + DEFAULT_CAPTION_CONFIG.fadeInDuration + DEFAULT_CAPTION_CONFIG.visibleTime,
        duration: DEFAULT_CAPTION_CONFIG.fadeOutDuration,
        properties: { alpha: 0 },
        easing: "power1.inOut",
        yoyo: false,
        repeat: 0,
        displayName: `conclusion-${act.order}-fade-out`,
        repeatDelay: 0
      });

      elements.push(conclusion);
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