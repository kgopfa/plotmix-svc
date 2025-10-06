import type { CanvasElement, CanvasGroup, TimelineAnimation } from '../../../types';
import type { StylePack } from '../../../types';
import STYLES from '../procedural/layout/styles';
import { TimelineBuilder } from './timeline';
import { ElementFactory, resetCanvasGrid } from '../../../utils/canvas/factory';
import { Scene } from '../../../types';

export function executeScene(scene: any): Scene {
  let style: StylePack = STYLES[0]!;

  const groups: CanvasGroup[] = [];
  const elements: CanvasElement[] = [];
  const timelineAnimations: TimelineAnimation[] = [];

  const timelineBuilder = new TimelineBuilder();

  resetCanvasGrid();

  // Track list order for proper title timing
  let listOrder = 0;

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
        const listResult = ElementFactory.createList({
          data: item.data,
          title: item.title
        }, style, listOrder);
        groups.push(...listResult.groups);
        elements.push(...listResult.elements);
        listOrder++;
        break;

      case "codeblock":
        const codeblockResult = ElementFactory.createCodeblock({
          data: item.data,
          title: item.title
        }, style);
        groups.push(...codeblockResult.groups);
        elements.push(...codeblockResult.elements);
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
        }, style);
            elements.push(caption);
          }
        });
        break;
    }
  }

  const allContentItems = timelineBuilder.getAllContentItems();
  
  allContentItems.forEach((contentItem, contentIndex) => {
    timelineAnimations.push({
      id: `content-${contentIndex}-fade-in`,
      name: `${contentItem.type} fade-in`,
      type: "fade",
      target: { type: "group", id: `content-group-${contentIndex}` },
      tracks: [
        {
          property: "opacity",
          from: 0,
          to: 1
        }
      ],
      startTime: contentItem.startTime,
      duration: contentItem.fadeInDuration,
      easing: "power1.inOut",
      repeat: 0,
      repeatDelay: 0,
      yoyo: false
    });

    timelineAnimations.push({
      id: `content-${contentIndex}-fade-out`,
      name: `${contentItem.type} fade-out`,
      type: "fade",
      target: { type: "group", id: `content-group-${contentIndex}` },
      tracks: [
        {
          property: "opacity",
          from: 1,
          to: 0
        }
      ],
      startTime: contentItem.visibleEnd,
      duration: contentItem.fadeOutDuration,
      easing: "power1.inOut",
      repeat: 0,
      repeatDelay: 0,
      yoyo: false
    });

    if (contentItem.internalAnimations) {
      contentItem.internalAnimations.forEach((internalAnim, animIndex) => {
        timelineAnimations.push({
          id: `content-${contentIndex}-internal-${animIndex}`,
          name: `${internalAnim.id} fade-in`,
          type: "fade",
          target: { type: "element", id: `${internalAnim.id}-element` },
          tracks: [
            {
              property: "opacity",
              from: 0,
              to: 1
            }
          ],
          startTime: internalAnim.startTime,
          duration: internalAnim.fadeInDuration,
          easing: "power1.inOut",
          repeat: 0,
          repeatDelay: 0,
          yoyo: false
        });
      });
    }
  });

  return {
    sceneId: scene.id,
    sceneName: scene.name,
    sceneCanvas: {
      groups,
      elements: elements as CanvasElement[],
      timeline: {
        animations: timelineAnimations
      },
      playback: {
        scale: 1,
        duration: timelineBuilder.getTotalDuration(),
        currentTime: 0,
        isPlaying: false
      }
    }
  };
}