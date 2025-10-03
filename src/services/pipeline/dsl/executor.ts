import type { ActionProgram, Group, Rect, TextEl, CodeEditorEl, CanvasElement } from '../../../types';
import type { StylePack } from '../../../types';
import STYLES from '../procedural/layout/styles';
import { TimelineBuilder } from './timeline-builder';
import { ElementFactory } from './element-factory';
import { Scene } from '../../../types';

// Executor core - Grid-based automatic positioning
export function execute(program: ActionProgram): Scene {
  let style: StylePack = STYLES[0]!;

  const groups: Group[] = [];
  const elements: (Rect | TextEl | CodeEditorEl)[] = [];

  const timelineBuilder = new TimelineBuilder();
  const captionTiming: Map<number, { startTime: number; endTime: number }> = new Map();
  
  // Process each action and build timeline based on content type
  for (const act of program) {
    if (act.kind === "HEADING") {
      timelineBuilder.addHeading();
    } else if (act.kind === "DRAW_LIST") {
      timelineBuilder.addList(act.data.length);
    } else if (act.kind === "DRAW_CODEBLOCK") {
      timelineBuilder.addCodeblock();
    } else if (act.kind === "DRAW_ARRAY") {
      // Arrays are part of demos, handled separately
    } else if (act.kind === "CAPTION") {
      // Captions are part of demos, handled separately
    } else if (act.kind === "ANIMATE") {
      // Animations are part of demos, handled separately
    }
  }

  // Count demos (array + caption/animation pairs)
  let currentDemoSteps = 0;
  
  for (const act of program) {
    if (act.kind === "DRAW_ARRAY") {
      // Start of a new demo
      if (currentDemoSteps > 0) {
        timelineBuilder.addDemo(currentDemoSteps);
        currentDemoSteps = 0;
      }
    } else if (act.kind === "CAPTION" || act.kind === "ANIMATE") {
      currentDemoSteps++;
    }
  }
  
  // Add the last demo if there are remaining steps
  if (currentDemoSteps > 0) {
    timelineBuilder.addDemo(currentDemoSteps);
  }

  // Process captions and build timing map
  let captionOrder = 0;
  for (const act of program) {
    if (act.kind === "CAPTION") {
      captionOrder++;
      // Handle caption commands - create timed text elements with transitions
      const caption = ElementFactory.createCaption(act, style, timelineBuilder);

      // Store caption timing for animation synchronization using demo steps
      const demoItems = timelineBuilder.getAllDemoItems();
      const demoItem = demoItems.find(demo => demo.stepCount >= captionOrder);
      if (demoItem && demoItem.steps[captionOrder - 1]) {
        const step = demoItem.steps[captionOrder - 1]!;
        captionTiming.set(act.order, {
          startTime: step.captionStartTime,
          endTime: step.captionStartTime + step.captionFadeInDuration + step.captionVisibleTime
        });
      }

      elements.push(caption);
    }
  }

  // Process all other actions (simplified for JSON format)
  for (const act of program) {
    if (act.kind === "SETUP" || act.kind === "CAPTION") {
      continue;
    }

    if (act.kind === "DRAW_ARRAY") {
      const arrayResult = ElementFactory.createArray(act, style);
      groups.push(...arrayResult.groups);
      elements.push(...arrayResult.elements);
    }

    if (act.kind === "HEADING") {
      const heading = ElementFactory.createHeading(act, style);
      elements.push(heading);
    }

    if (act.kind === "DRAW_LIST") {
      const listElements = ElementFactory.createList(act, style, timelineBuilder);
      elements.push(...listElements);
    }

    if (act.kind === "DRAW_CODEBLOCK") {
      const codeblockElements = ElementFactory.createCodeblock(act, style, timelineBuilder);
      elements.push(...codeblockElements);
    }
  }

  // Simplified return for JSON format (no scene processing needed)
  return {
    sceneId: "scene-1",
    sceneName: "Binary Search Demo",
    sceneCanvas: {
      groups,
      elements: elements as CanvasElement[],
      timeline: {
        scale: 1,
        duration: timelineBuilder.getTotalDuration(),
        currentTime: 0,
        animationStates: {}
      }
    }
  };
}
