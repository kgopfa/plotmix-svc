import type { Group, Rect, TextEl, CodeEditorEl, CanvasElement } from '../../../types';
import type { StylePack } from '../../../types';
import STYLES from '../procedural/layout/styles';
import { TimelineBuilder } from './timeline-builder';
import { ElementFactory } from './element-factory';
import { Scene } from '../../../types';

export function executeScene(scene: any): Scene {
  let style: StylePack = STYLES[0]!;

  const groups: Group[] = [];
  const elements: (Rect | TextEl | CodeEditorEl)[] = [];

  const timelineBuilder = new TimelineBuilder();
  
  for (const item of scene.content) {
    switch (item.type) {
      case "heading":
        timelineBuilder.addHeading();
        break;
      case "list":
        timelineBuilder.addList(item.data.length);
        break;
      case "codeblock":
        timelineBuilder.addCodeblock();
        break;
      case "demo":
        timelineBuilder.addDemo(item.steps.length);
        break;
    }
  }

  for (const item of scene.content) {
    switch (item.type) {
      case "heading":
        const heading = ElementFactory.createHeading({
          text: item.data[0]
        }, style);
        elements.push(heading);
        break;

      case "list":
        const listElements = ElementFactory.createList({
          data: item.data,
          title: item.title
        }, style, timelineBuilder);
        elements.push(...listElements);
        break;

      case "codeblock":
        const codeblockElements = ElementFactory.createCodeblock({
          data: item.data,
          title: item.title
        }, style, timelineBuilder);
        elements.push(...codeblockElements);
        break;

      case "demo":
        const arrayResult = ElementFactory.createArray({
          values: item.dataStructure.data
        }, style);
        groups.push(...arrayResult.groups);
        elements.push(...arrayResult.elements);

        item.steps.forEach((step: any, stepIndex: number) => {
          if (step.caption) {
            const caption = ElementFactory.createCaption({
              order: stepIndex + 1,
              text: step.caption
            }, style, timelineBuilder);
            elements.push(caption);
          }
        });
        break;
    }
  }

  return {
    sceneId: scene.id,
    sceneName: scene.name,
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