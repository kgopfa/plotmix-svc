import type { Action, ActionProgram, DslScene, Group, Rect, TextEl, CodeEditorEl } from '../../../types';
import type { StylePack } from '../../../types';
import { pickStyle } from '../procedural/seed';
import STYLES from '../procedural/layout/styles';
import { getAnimationConfig } from '../procedural/animation';
import { randomUUID } from 'crypto';
import { TimelineManager } from './timeline-manager';
import { ElementFactory } from './element-factory';
import { measureTextWidthAdvanced } from '../../../utils/text-width';

// Helper function to calculate text width using Canvas API for accurate measurements
function calculateTextWidth(text: string, fontSize: number, fontFamily: string, fontWeight: string = 'normal'): number {
  return measureTextWidthAdvanced(text, fontSize, fontFamily, fontWeight);
}

// Executor core - Grid-based automatic positioning
export function execute(program: ActionProgram): DslScene {
  // Defaults
  let seed = 0;
  let style: StylePack = STYLES[0]!;

  const groups: Group[] = [];
  const elements: (Rect | TextEl | CodeEditorEl)[] = [];

  // Initialize TimelineManager for section-based timing
  const timelineManager = new TimelineManager();

  // Scene tracking
  let currentScene: { id: string; name: string } | null = null;
  const scenes: Array<{ id: string; name: string; startTime: number; endTime?: number }> = [];
  let sceneStartTime = 0;
  
  // Scene-based content tracking
  const sceneContent: Map<string, Action[]> = new Map();
  let currentSceneActions: Action[] = [];

  // Track caption timing to sync animations
  const captionTiming: Map<number, { startTime: number; endTime: number }> = new Map();

  // Track animation order for synchronization
  let animationOrder = 0;
  let exampleOrder = 0;

  // Track cumulative wait duration to affect subsequent animations
  let cumulativeWaitDuration = 0;

  // Preprocessing: Count content for timeline manager initialization
  let captionCount = 0;
  let animationCount = 0;
  let conclusionCount = 0;
  let approachCount = 0;
  let explanationCount = 0;
  let edgecaseCount = 0;
  let alternativeCount = 0;
  let keyideaCount = 0;
  let pseudocodeCount = 0;
  // let subtitleCount = 0; // Commented out for now

  for (const act of program) {
    if (act.kind === "CAPTION") {
      captionCount++;
    } else if (act.kind === "ANIMATE") {
      animationCount++;
    } else if (act.kind === "CONCLUSION") {
      conclusionCount++;
    } else if (act.kind === "APPROACH") {
      approachCount++;
    } else if (act.kind === "EXPLANATION") {
      explanationCount++;
    } else if (act.kind === "EDGECASE") {
      edgecaseCount++;
    } else if (act.kind === "ALTERNATIVE") {
      alternativeCount++;
    } else if (act.kind === "KEYIDEA") {
      keyideaCount++;
    } else if (act.kind === "PSEUDOCODE") {
      pseudocodeCount++;
    } else if (act.kind === "SUBTITLE") {
      // Skip subtitle counting for now
      // subtitleCount++;
    }
  }

  // Initialize timeline manager with content counts
  timelineManager.setContentCounts(
    captionCount,
    animationCount,
    conclusionCount,
    approachCount,
    explanationCount,
    edgecaseCount,
    alternativeCount,
    keyideaCount,
    pseudocodeCount,
    0 // subtitleCount - commented out for now
  );

  // First pass: calculate maximum widths for alignment
  let maxApproachWidth = 0;
  let maxEdgecaseWidth = 0;
  let maxAlternativeWidth = 0;

  for (const act of program) {
    if (act.kind === "APPROACH") {
      const numberedText = `${act.order}. ${act.text}`;
      const approachFontSize = style.typography.size * 0.8;
      const calculatedWidth = calculateTextWidth(numberedText, approachFontSize, style.typography.family);
      maxApproachWidth = Math.max(maxApproachWidth, calculatedWidth);
    } else if (act.kind === "EDGECASE") {
      const numberedText = `${act.order}. ${act.text}`;
      const edgecaseFontSize = style.typography.size * 0.8; // Match approach font size
      const calculatedWidth = calculateTextWidth(numberedText, edgecaseFontSize, style.typography.family);
      maxEdgecaseWidth = Math.max(maxEdgecaseWidth, calculatedWidth);
    } else if (act.kind === "ALTERNATIVE") {
      const numberedText = `${act.order}. ${act.text}`;
      const alternativeFontSize = style.typography.size * 0.8; // Match approach font size
      const calculatedWidth = calculateTextWidth(numberedText, alternativeFontSize, style.typography.family);
      maxAlternativeWidth = Math.max(maxAlternativeWidth, calculatedWidth);
    }
  }

  // Cap the maximum widths at 1200px
  maxApproachWidth = Math.min(maxApproachWidth, 1200);
  maxEdgecaseWidth = Math.min(maxEdgecaseWidth, 1200);
  maxAlternativeWidth = Math.min(maxAlternativeWidth, 1200);

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

  // Second pass: process all other actions
  for (const act of program) {
    if (act.kind === "SETUP" || act.kind === "CAPTION") {
      // Skip these as they were processed in first pass
      continue;
    }

    if (act.kind === "SCENE") {
      // Handle scene start
      if (currentScene) {
        // End previous scene if one was active
        const lastScene = scenes[scenes.length - 1];
        if (lastScene) {
          lastScene.endTime = sceneStartTime;
        }
        // Store the previous scene's content
        if (currentSceneActions.length > 0) {
          sceneContent.set(currentScene.id, [...currentSceneActions]);
        }
      }
      
      currentScene = { id: act.id, name: act.name };
      sceneStartTime = timelineManager.getCurrentTime();
      scenes.push({ id: act.id, name: act.name, startTime: sceneStartTime });
      currentSceneActions = [];
      continue;
    }

    if (act.kind === "ENDSCENE") {
      // Handle scene end
      if (currentScene) {
        const lastScene = scenes[scenes.length - 1];
        if (lastScene) {
          lastScene.endTime = timelineManager.getCurrentTime();
        }
        // Store the current scene's content
        if (currentSceneActions.length > 0) {
          sceneContent.set(currentScene.id, [...currentSceneActions]);
        }
        currentScene = null;
        currentSceneActions = [];
      }
      continue;
    }

    // Check if this action belongs to a scene
    if (act.sceneId && currentScene && act.sceneId === currentScene.id) {
      // This action is part of the current scene - process it normally
      currentSceneActions.push(act);
      // Continue processing the action normally
    } else if (act.sceneId && !currentScene) {
      // This action has a sceneId but no current scene - skip it
      continue;
    }

    if (act.kind === "DRAW_ARRAY") {
      // Use ElementFactory to create array elements
      const arrayResult = ElementFactory.createArray(act, style, timelineManager);
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
      // Handle other animation types (highlight, select, focus, compare)
      const animConfig = getAnimationConfig(seed, act.type);

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
      const heading = ElementFactory.createHeading(act, style, timelineManager);
      elements.push(heading);
    }

    if (act.kind === "SUBTITLE") {
      /*
      // Handle subtitle commands - create dynamic subtitle with transitions
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
        name: `Subtitle ${act.order}`,
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
      */
      continue;
    }

    if (act.kind === "EXPLANATION") {
      // Handle explanation commands - create static text element where array appears
      const explanation = ElementFactory.createExplanation(act, style, timelineManager);
      elements.push(explanation);
    }

    if (act.kind === "APPROACH") {
      // Handle approach commands - show 8 approaches at a time in vertical layout
      const approach = ElementFactory.createApproach(act, style, timelineManager, maxApproachWidth, approachCount);
      elements.push(approach);
    }

    if (act.kind === "EXAMPLE") {
      // Handle example commands - create static text element below subtitle
      exampleOrder++;
      const example = ElementFactory.createExample(act, style, timelineManager);
      elements.push(example);
    }

    if (act.kind === "CONCLUSION") {
      // Create conclusion text element (rendered over 2 rows)
      const conclusion = ElementFactory.createConclusion(act, style, timelineManager);
      elements.push(conclusion);
    }

    if (act.kind === "EDGECASE") {
      // Handle edgecase commands - create static text elements with numbering and alignment
      const edgecase = ElementFactory.createEdgecase(act, style, timelineManager, maxEdgecaseWidth, edgecaseCount);
      elements.push(edgecase);
    }

    if (act.kind === "ALTERNATIVE") {
      // Handle alternative commands - create static text elements with numbering and alignment
      const alternative = ElementFactory.createAlternative(act, style, timelineManager, maxAlternativeWidth, alternativeCount);
      elements.push(alternative);
    }

    if (act.kind === "PSEUDOCODE") {
      // Handle pseudocode commands - create code block with background rectangle and code text
      const pseudocodeResult = ElementFactory.createPseudocode(act, style, timelineManager);
      groups.push(pseudocodeResult.group);
      elements.push(...pseudocodeResult.elements);
    }

    if (act.kind === "KEYIDEA") {
      // Handle keyidea commands - create static text elements
      const keyidea = ElementFactory.createKeyidea(act, style, timelineManager);
      elements.push(keyidea);
    }

    if (act.kind === "WAIT") {
      // Handle wait commands - add to cumulative wait duration
      // This will delay all subsequent animations
      cumulativeWaitDuration += act.duration;
      timelineManager.addWaitDuration(act.duration);
    }

    // Only process arrays for now - text elements are ignored

    // (future) DRAW_STACK, DRAW_QUEUE, DRAW_LINKED_LIST, DRAW_TREE...
  }

  // Close any open scene
  if (currentScene) {
    const lastScene = scenes[scenes.length - 1];
    if (lastScene) {
      lastScene.endTime = timelineManager.getTotalDuration();
    }
    // Store the final scene's content
    if (currentSceneActions.length > 0) {
      sceneContent.set(currentScene.id, [...currentSceneActions]);
    }
  }

  // Process each scene's content to create separate scene objects
  const processedScenes: Array<{
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    groups: Group[];
    elements: (Rect | TextEl | CodeEditorEl)[];
    timeline: { scale: number; duration: number; currentTime: number; animationStates: Record<string, unknown> };
  }> = [];

  for (const scene of scenes) {
    const sceneActions = sceneContent.get(scene.id);
    if (sceneActions) {
      // Create a new executor instance for this scene's actions
      const sceneResult = execute(sceneActions);
      
      processedScenes.push({
        id: scene.id,
        name: scene.name,
        startTime: scene.startTime,
        endTime: scene.endTime ?? timelineManager.getTotalDuration(),
        groups: sceneResult.groups,
        elements: sceneResult.elements,
        timeline: sceneResult.timeline
      });
    }
  }

  // Ensure at least one scene was processed
  if (processedScenes.length === 0) {
    throw new Error('No scenes were processed from DSL. DSL must contain at least one scene block.');
  }

  // Return the first scene as the main scene, but include all scenes in metadata
  const mainScene = processedScenes[0]!;
  return {
    groups: mainScene.groups,
    elements: mainScene.elements,
    timeline: mainScene.timeline,
    scenes: processedScenes.map(s => ({ id: s.id, name: s.name, startTime: s.startTime, endTime: s.endTime ?? timelineManager.getTotalDuration() }))
  };
}
