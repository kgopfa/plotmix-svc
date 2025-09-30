import type { ActionProgram, DslScene, Group, Rect, TextEl, CodeEditorEl } from '../../../types';
import type { StylePack } from '../../../types';
import { pickStyle } from '../procedural/seed';
import STYLES from '../procedural/layout/styles';
import { getAnimationConfig } from '../procedural/animation';
import { randomUUID } from 'crypto';
import { TimelineManager } from './timeline-manager';
import { ElementFactory } from './element-factory';

// Executor core - Grid-based automatic positioning
export function execute(program: ActionProgram): DslScene {
  // Defaults
  let seed = 0;
  let style: StylePack = STYLES[0]!;

  const groups: Group[] = [];
  const elements: (Rect | TextEl | CodeEditorEl)[] = [];

  // Initialize TimelineManager for section-based timing
  const timelineManager = new TimelineManager();

  // No scene tracking needed for JSON format

  // Track caption timing to sync animations
  const captionTiming: Map<number, { startTime: number; endTime: number }> = new Map();

  // Track animation order for synchronization
  let animationOrder = 0;

  // Track cumulative wait duration to affect subsequent animations
  let cumulativeWaitDuration = 0;

  // Simplified content counting for JSON format
  let captionCount = 0;
  let animationCount = 0;
  let subtitleCount = 0;

  for (const act of program) {
    if (act.kind === "CAPTION") {
      captionCount++;
    } else if (act.kind === "ANIMATE") {
      animationCount++;
    } else if (act.kind === "SUBTITLE") {
      subtitleCount++;
    }
  }

  // Initialize timeline manager with simplified content counts
  timelineManager.setContentCounts(
    captionCount,
    animationCount,
    0, // conclusionCount
    0, // approachCount
    0, // explanationCount
    0, // edgecaseCount
    0, // alternativeCount
    0, // keyideaCount
    0, // pseudocodeCount
    subtitleCount
  );

  // No width calculations needed for simplified JSON format

  // Second pass: process setup and build caption timing map
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
      const caption = ElementFactory.createCaption(act, style, timelineManager);
      
      // Store caption timing for animation synchronization
      const captionConfig = timelineManager.getElementTiming('caption');
      if (captionConfig) {
        const totalCaptionDuration = captionConfig.fadeInDuration! + captionConfig.visibleTime! + captionConfig.fadeOutDuration!;
        const captionStartTime = captionConfig.startTime! + (act.order - 1) * totalCaptionDuration;
        
        captionTiming.set(act.order, {
          startTime: captionStartTime,
          endTime: captionStartTime + captionConfig.fadeInDuration! + captionConfig.visibleTime!
        });
      }

      elements.push(caption);
    }
  }

  // Process all other actions (simplified for JSON format)
  for (const act of program) {
    if (act.kind === "SETUP" || act.kind === "CAPTION") {
      // Skip these as they were processed in first pass
      continue;
    }

    if (act.kind === "DRAW_ARRAY") {
      // Use ElementFactory to create array elements
      const arrayResult = ElementFactory.createArray(act, style);
      groups.push(...arrayResult.groups);
      elements.push(...arrayResult.elements);
    }

    if (act.kind === "ANIMATE") {
      // Handle animation commands - create animation timeline entries
      // This will be processed by the frontend to show step-by-step progression
      const animationId = randomUUID();

      // Increment animation order for this animation
      animationOrder++;

      // Calculate animation timing based on corresponding caption
      // Animation should start 0.5s after the caption starts (when caption becomes visible)
      const captionInfo = captionTiming.get(animationOrder);
      let animationStartTime: number;
      if (!captionInfo) {
        // If no caption timing found, use a default timing
        const defaultStartTime = 2 + (animationOrder - 1) * 3; // Start at 2s, then 5s, 8s, etc.
        animationStartTime = defaultStartTime + 0.5;
      } else {
        animationStartTime = captionInfo.startTime + 0.5;
      }

      // Add cumulative wait duration to delay this animation
      animationStartTime += cumulativeWaitDuration;
      
      // Get animation config for non-pointer animations
      let animConfig;
      if (act.type === "pointer") {
        // Pointer animations use a simple highlight-style config
        animConfig = {
          type: "color",
          properties: { fill: "#ff6b6b" }, // Red color for pointers
          duration: 1.5,
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0
        };
      } else {
        // Handle other animation types (highlight, select, focus, compare)
        animConfig = getAnimationConfig(seed, act.type);
      }

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
      if (act.type === "pointer") {
        // Pointer animations are special - they create visual pointers/labels
        // For now, we'll treat them as highlight animations but with special naming
        const pointerAnimationEntry = {
          ...animationEntry,
          displayName: `${act.type}-${act.pointerName}-${animationOrder}`
        };
        
        targetElements.forEach(element => {
          element.animations.push(pointerAnimationEntry);
        });
      } else if (animConfig.type === "color") {
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
      const heading = ElementFactory.createHeading(act, style);
      elements.push(heading);
    }

    if (act.kind === "SUBTITLE") {
      // Handle subtitle commands - create dynamic subtitle with transitions
      const subtitleId = randomUUID();
      
      // Position subtitle below the heading, same distance from center as captions
      const subtitleY = -320; // Below heading, positioned between heading and array
      const subtitleX = 0; // Center horizontally
      
      // Create subtitle text element
      const subtitleFontSize = style.typography.size * 0.9;
      const subtitleHeight = style.typography.size * 1.5;
      
      const subtitle: TextEl = {
        animations: [],
        fill: style.palette.text,
        x: subtitleX,
        y: subtitleY,
        id: subtitleId,
        name: `Subtitle ${act.order}`,
        text: act.text,
        type: "text",
        width: 1200, // Max width for subtitles
        height: subtitleHeight,
        fontFamily: style.typography.family,
        fontSize: subtitleFontSize,
        fontWeight: "normal", // Normal weight for subtitles
        textAlign: "center",
        pivotX: 600, // Center pivot (half of max width)
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
        wordWrapWidth: 1200,
        textStrokeJoin: "round",
        isAnimationPath: false,
        textStrokeWidth: 0
      };

      // Get timing for this specific subtitle order
      const subtitleTiming = timelineManager.getSubtitleTiming(act.order);
      
      if (subtitleTiming) {
        // Add fade-in animation for subtitle
        subtitle.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: subtitleTiming.startTime,
          duration: subtitleTiming.fadeInDuration,
          properties: { alpha: 1 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `subtitle-${act.order}-fade-in`,
          repeatDelay: 0
        });

        // Add fade-out animation for subtitle
        subtitle.animations.push({
          id: randomUUID(),
          type: "fade",
          startTime: subtitleTiming.fadeOutStartTime,
          duration: subtitleTiming.fadeOutDuration,
          properties: { alpha: 0 },
          easing: "power1.inOut",
          yoyo: false,
          repeat: 0,
          displayName: `subtitle-${act.order}-fade-out`,
          repeatDelay: 0
        });
      }

      elements.push(subtitle);
    }

    if (act.kind === "DRAW_LIST") {
      // Handle list commands - create simple text elements for each list item
      const listElements = ElementFactory.createList(act, style);
      elements.push(...listElements);
    }

    // Only process arrays for now - text elements are ignored

    // (future) DRAW_STACK, DRAW_QUEUE, DRAW_LINKED_LIST, DRAW_TREE...
  }

  // Simplified return for JSON format (no scene processing needed)
  return {
    groups,
    elements,
    timeline: {
      scale: 1,
      duration: timelineManager.getTotalDuration(),
      currentTime: 0,
      animationStates: {}
    }
  };
}
