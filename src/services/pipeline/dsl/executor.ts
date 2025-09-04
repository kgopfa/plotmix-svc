import type { ActionProgram, Scene, Group, Rect, TextEl } from '../../../types';
import type { StylePack } from '../../../types';
import { pickStyle } from '../procedural/seed';
import STYLES from '../procedural/layout/styles';
import { getAnimationConfig } from '../procedural/animation';
import { randomUUID } from 'crypto';
import { computeCenteredXPositions } from '../../../utils/grid';
import { TimelineManager } from './timeline-manager';

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
  cellHeight: number,
  index: number
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
    opacity: 1, // Elements inherit group opacity
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
    opacity: 1, // Elements inherit group opacity
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
    name: `Array Cell ${index}`,
    type: "custom",
    opacity: 0, // Start invisible for fade-in
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
  
  // Initialize TimelineManager for section-based timing
  const timelineManager = new TimelineManager();
  
  // Track caption timing to sync animations
  const captionTiming: Map<number, { startTime: number; endTime: number }> = new Map();
  
  // Track animation order for synchronization
  let animationOrder = 0;
  let explanationOrder = 0;
  let exampleOrder = 0;

  // Preprocessing: Count content for timeline manager initialization
  let captionCount = 0;
  let animationCount = 0;
  let conclusionCount = 0;
  let approachCount = 0;
  
  for (const act of program) {
    if (act.kind === "CAPTION") {
      captionCount++;
    } else if (act.kind === "ANIMATE") {
      animationCount++;
    } else if (act.kind === "CONCLUSION") {
      conclusionCount++;
    } else if (act.kind === "APPROACH") {
      approachCount++;
    }
  }
  
  // Initialize timeline manager with content counts
  timelineManager.setContentCounts(captionCount, animationCount, conclusionCount, approachCount);

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
      const captionConfig = timelineManager.getElementTiming('caption');
      
      if (captionConfig) {
        // Calculate staggered timing for each caption
        const totalCaptionDuration = captionConfig.fadeInDuration! + captionConfig.visibleTime! + captionConfig.fadeOutDuration!;
        const captionStartTime = captionConfig.startTime! + (act.order - 1) * totalCaptionDuration;
        
        // Create fade-in animation
        caption.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: captionStartTime,
          duration: captionConfig.fadeInDuration!,
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
          startTime: captionStartTime + captionConfig.fadeInDuration! + captionConfig.visibleTime!,
          duration: captionConfig.fadeOutDuration!,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `caption-${act.order}-fade-out`,
          repeatDelay: 0
        });

        // Store caption timing for animation synchronization
        captionTiming.set(act.order, {
          startTime: captionStartTime,
          endTime: captionStartTime + captionConfig.fadeInDuration! + captionConfig.visibleTime!
        });
      }

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
        const { group, rect, text } = makeCell(style, v, centerX, centerY, cellWidth, cellHeight, i);
        
        // Get timing from config
        const arrayTiming = timelineManager.getElementTiming('array');
        
        if (arrayTiming) {
          // Add fade-in animation
          group.animations.push({
            id: randomUUID(),
            type: "fade",
            startTime: arrayTiming.startTime!,
            duration: arrayTiming.fadeInDuration!,
            properties: { alpha: 1 },
            easing: "power1.inOut",
            yoyo: false,
            repeat: 0,
            displayName: `array-${i}-fade-in`,
            repeatDelay: 0
          });
          
          // Add fade-out animation - array should fade out after the last caption is fully faded out
          const fadeOutStartTime = conclusionCount > 0 ? 
            timelineManager.getSectionTiming('conclusion')!.startTime - arrayTiming.fadeOutDuration! : 
            timelineManager.calculateCaptionTiming(captionCount).endTime;
          
          group.animations.push({
            id: randomUUID(),
            type: "fade",
            startTime: fadeOutStartTime,
            duration: arrayTiming.fadeOutDuration!,
            properties: { alpha: 0 },
            easing: "power1.inOut",
            yoyo: false,
            repeat: 0,
            displayName: `array-fade-out`,
            repeatDelay: 0
          });
        }
        
        groups.push(group);
        elements.push(rect, text);
      });
    }

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
      const captionInfo = captionTiming.get(animationOrder)!;
      const animationStartTime = captionInfo.startTime + 0.5;

      // Create proper animation object using procedural configuration
      const animationEntry = {
        id: animationId,
        type: animConfig.type,
        yoyo: animConfig.yoyo,
        easing: animConfig.easing,
        repeat: animConfig.repeat,
        duration: 1.5, // Fixed 1.5s duration for array animations
        startTime: animationStartTime,
        properties: animConfig.properties,
        displayName: `${act.type}-1`,
        repeatDelay: 0
      };

      // Find the target elements that match the animation indices
      const targetElements = elements.filter(el => {
        if (el.type === "rectangle") {
          // For rectangles, we need to find the group and check if it matches the target index
          const group = groups.find(g => g.id === el.groupId);
          if (group) {
            // Extract the index from the group name (e.g., "Array Cell 4" -> index 4)
            const indexMatch = group.name.match(/Array Cell (\d+)/);
            if (indexMatch) {
              const groupIndex = parseInt(indexMatch[1]!);
              // Check if this group's index matches any of the target indices
              const matches = act.elements.some(target => {
                if (typeof target === 'number') {
                  return target === groupIndex;
                } else {
                  // If target is a string, try to parse it as a number
                  const targetNum = parseInt(target);
                  return !isNaN(targetNum) && targetNum === groupIndex;
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

      // Get timing from config
      const headingTiming = timelineManager.getElementTiming('heading');
      
      if (headingTiming) {
        // Add fade-in animation for heading
        heading.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: headingTiming.startTime!,
          duration: headingTiming.fadeInDuration!,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "heading-fade-in",
          repeatDelay: 0
        });
      }

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

      // Get timing from config
      const subtitleTiming = timelineManager.getElementTiming('subtitle');
      
      if (subtitleTiming) {
        // Add fade-in animation for subtitle
        subtitle.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: subtitleTiming.startTime!,
          duration: subtitleTiming.fadeInDuration!,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "subtitle-fade-in",
          repeatDelay: 0
        });
      }

      elements.push(subtitle);
    }

    if (act.kind === "EXPLANATION") {
      // Handle explanation commands - create static text element where array appears
      const explanationId = randomUUID();
      
      // Position explanation where array appears (y = 0)
      const explanationY = 0; // Same position as array
      const explanationX = 0; // Center horizontally
      
      // Create explanation text element with procedural styling
      const explanationFontSize = style.typography.size * 0.85;
      const calculatedExplanationWidth = calculateTextWidth(act.text, explanationFontSize, style.typography.family);
      const explanationWidth = Math.min(calculatedExplanationWidth, 1200); // Use calculated width, max 1200px
      const explanationHeight = style.typography.size * 1.3;
      
      const explanation: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: explanationX,
        y: explanationY,
        id: explanationId,
        name: `Explanation`,
        text: act.text,
        type: "text",
        width: explanationWidth, // Use calculated width, max 1200px
        height: explanationHeight,
        fontFamily: style.typography.family,
        fontSize: explanationFontSize,
        fontWeight: "normal", // Normal weight for explanations
        textAlign: "center",
        pivotX: explanationWidth / 2, // Center pivot (half of width)
        pivotY: explanationHeight / 2, // Center pivot (half of height)
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
        wordWrapWidth: explanationWidth, // Same as width like captions
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

      // Get timing from config
      explanationOrder++;
      const explanationTiming = timelineManager.getElementTiming('explanation');
      
      if (explanationTiming) {
        // Add fade-in animation for explanation
        explanation.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: explanationTiming.startTime!,
          duration: explanationTiming.fadeInDuration!,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "explanation-fade-in",
          repeatDelay: 0
        });

        // Add fade-out animation for explanation
        explanation.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: explanationTiming.fadeOutStartTime!,
          duration: explanationTiming.fadeOutDuration!,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "explanation-fade-out",
          repeatDelay: 0
        });
      }

      elements.push(explanation);
    }

    if (act.kind === "APPROACH") {
      // Handle approach commands - create static text elements with sequential ordering
      const approachId = randomUUID();
      
      // Position approach steps below explanation, with staggered positioning
      // Each step appears in the same position but at different times
      const approachY = 120; // Below explanation (which is at y=0)
      const approachX = 0; // Center horizontally
      
      // Create approach text element with procedural styling
      const approachFontSize = style.typography.size * 0.8;
      const calculatedApproachWidth = calculateTextWidth(act.text, approachFontSize, style.typography.family);
      const approachWidth = Math.min(calculatedApproachWidth, 1200); // Use calculated width, max 1200px
      const approachHeight = style.typography.size * 1.2;
      
      const approach: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: approachX,
        y: approachY,
        id: approachId,
        name: `Approach ${act.order}`,
        text: act.text,
        type: "text",
        width: approachWidth,
        height: approachHeight,
        fontFamily: style.typography.family,
        fontSize: approachFontSize,
        fontWeight: "normal",
        textAlign: "center",
        pivotX: approachWidth / 2,
        pivotY: approachHeight / 2,
        zIndex: 11, // Higher than explanation
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
        wordWrapWidth: approachWidth,
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

      // Get timing from config - approach steps should appear sequentially like captions
      const approachTiming = timelineManager.getElementTiming('approach');
      
      if (approachTiming) {
        // Calculate sequential timing for each approach step (same pattern as captions)
        const totalApproachDuration = approachTiming.fadeInDuration! + approachTiming.visibleTime! + approachTiming.fadeOutDuration!;
        const approachStartTime = approachTiming.startTime! + (act.order - 1) * totalApproachDuration;
        
        // Add fade-in animation for approach step
        approach.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: approachStartTime,
          duration: approachTiming.fadeInDuration!,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `approach-${act.order}-fade-in`,
          repeatDelay: 0
        });

        // Add fade-out animation for approach step
        approach.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: approachStartTime + approachTiming.fadeInDuration! + approachTiming.visibleTime!,
          duration: approachTiming.fadeOutDuration!,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `approach-${act.order}-fade-out`,
          repeatDelay: 0
        });
      }

      elements.push(approach);
    }

    if (act.kind === "EXAMPLE") {
      // Handle example commands - create static text element below subtitle
      const exampleId = randomUUID();
      
      // Position example below the subtitle, between subtitle and array
      const exampleY = 0; // Same position as explanation and array
      const exampleX = 0; // Center horizontally
      
      // Create example text element
      const exampleFontSize = style.typography.size * 0.8;
      const calculatedExampleWidth = calculateTextWidth(act.text, exampleFontSize, style.typography.family);
      const exampleWidth = Math.min(calculatedExampleWidth, 1200); // Use calculated width, max 1200px
      const exampleHeight = style.typography.size * 1.2;
      
      const example: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: exampleX,
        y: exampleY,
        id: exampleId,
        name: `Example`,
        text: act.text,
        type: "text",
        width: exampleWidth, // Use calculated width, max 1200px
        height: exampleHeight,
        fontFamily: style.typography.family,
        fontSize: exampleFontSize,
        fontWeight: "normal", // Normal weight for examples
        textAlign: "center",
        pivotX: exampleWidth / 2, // Center pivot (half of width)
        pivotY: exampleHeight / 2, // Center pivot (half of height)
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
        wordWrapWidth: exampleWidth, // Same as width like captions
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

      // Get timing from config
      exampleOrder++;
      const exampleTiming = timelineManager.getElementTiming('example');
      
      if (exampleTiming) {
        // Add fade-in animation for example
        example.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: exampleTiming.startTime!,
          duration: exampleTiming.fadeInDuration!,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "example-fade-in",
          repeatDelay: 0
        });

        // Add fade-out animation for example
        example.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: exampleTiming.fadeOutStartTime!,
          duration: exampleTiming.fadeOutDuration!,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: "example-fade-out",
          repeatDelay: 0
        });
      }

      elements.push(example);
    }

    if (act.kind === "CONCLUSION") {
      // Create conclusion text element (rendered over 2 rows)
      const conclusionId = randomUUID();
      const calculatedConclusionWidth = calculateTextWidth(act.text, 40, style.typography.family);
      const conclusionWidth = Math.min(calculatedConclusionWidth, 1200); // Use calculated width, max 1200px
      
      // Calculate proper conclusion timing using timeline manager
      const conclusionTiming = timelineManager.calculateConclusionTiming(act.order);
      const conclusionStartTime = conclusionTiming.startTime;
      
      // Position conclusions - within each group, conclusions appear one under the other
      // But each group appears in the same positions (since previous groups fade out)
      const isFirstInGroup = (act.order - 1) % 2 === 0; // Even orders (1,3,5...) are first in their group
      const conclusionY = isFirstInGroup ? -60 : 60; // First conclusion at -60, second at 60
      
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
        startTime: conclusionStartTime,
        duration: conclusionTiming.fadeInEnd - conclusionStartTime,
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
        startTime: conclusionTiming.fadeOutStart,
        duration: conclusionTiming.endTime - conclusionTiming.fadeOutStart,
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