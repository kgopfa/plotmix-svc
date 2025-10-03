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

  timelineBuilder.addDemo(Math.max(captionCount, animationCount));

  for (const act of program) {
    if (act.kind === "CAPTION") {
      // Handle caption commands - create timed text elements with transitions
      const caption = ElementFactory.createCaption(act, style, timelineBuilder);

      // Store caption timing for animation synchronization using demo steps
      const demoItems = timelineBuilder.getAllDemoItems();
      const demoItem = demoItems[0]; // Get the first (and main) demo
      if (demoItem && demoItem.steps[act.order - 1]) {
        const step = demoItem.steps[act.order - 1]!;
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
      const listElements = ElementFactory.createList(act, style);
      elements.push(...listElements);
    }

    if (act.kind === "DRAW_CODEBLOCK") {
      const codeblockElements = ElementFactory.createCodeblock(act, style);
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
