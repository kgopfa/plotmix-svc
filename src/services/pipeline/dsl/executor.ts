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

  // Track content item metadata (group IDs and element IDs) for animation
  const contentItemsMetadata: Array<{
    type: string;
    groupId?: string;
    elementIds: string[];
    arrayElementCount?: number; // For demo content items
  }> = [];

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
        contentItemsMetadata.push({
          type: 'heading',
          elementIds: [heading.id]
        });
        break;

      case "list":
        const listResult = ElementFactory.createList({
          data: item.data
        }, style, listOrder);
        groups.push(...listResult.groups);
        elements.push(...listResult.elements);
        
        // Find the content group (it's the first group in the list)
        const contentGroup = listResult.groups[0];
        if (contentGroup) {
          contentItemsMetadata.push({
            type: 'list',
            groupId: contentGroup.id,
            elementIds: contentGroup.elementIds
          });
        }
        listOrder++;
        break;

      case "codeblock":
        const codeblockResult = ElementFactory.createCodeblock({
          data: item.data,
          title: item.title
        }, style);
        groups.push(...codeblockResult.groups);
        elements.push(...codeblockResult.elements);
        
        // Find the code block group
        const codeGroup = codeblockResult.groups[0];
        if (codeGroup) {
          contentItemsMetadata.push({
            type: 'codeblock',
            groupId: codeGroup.id,
            elementIds: codeGroup.elementIds
          });
        }
        break;

      case "demo":
        const arrayResult = ElementFactory.createArray({
          values: item.dataStructure.data
        }, style);
        groups.push(...arrayResult.groups);
        elements.push(...arrayResult.elements);

        const captionIds: string[] = [];
        item.steps.forEach((step: any, stepIndex: number) => {
          if (step.caption) {
            const caption = ElementFactory.createCaption({
              order: stepIndex + 1,
              text: step.caption
            }, style);
            elements.push(caption);
            captionIds.push(caption.id);
          }
        });
        
        contentItemsMetadata.push({
          type: 'demo',
          // Store caption IDs separately for internal animations
          elementIds: captionIds,
          // Also store array element count for reference
          arrayElementCount: arrayResult.elements.length
        });
        break;
    }
  }

  const allContentItems = timelineBuilder.getAllContentItems();
  
  allContentItems.forEach((contentItem, contentIndex) => {
    const metadata = contentItemsMetadata[contentIndex];
    if (!metadata) return;

    const targetId = metadata.groupId || metadata.elementIds[0];
    if (!targetId) return;

    const targetType = metadata.groupId ? "group" : "element";
    const fadeInTimestamp = Date.now() + contentIndex;
    const fadeOutTimestamp = Date.now() + contentIndex + 10000;

    // Skip main fade-in/fade-out for demos since they handle animations via internal animations
    const skipMainAnimations = metadata.type === 'demo';

    // Fade in animation
    if (!skipMainAnimations) {
      timelineAnimations.push({
        id: `${targetId}-fade-${fadeInTimestamp}`,
        target: { 
          type: targetType, 
          id: targetId 
        },
        tracks: [
          {
            id: `fade-${fadeInTimestamp}`,
            type: "fade",
            yoyo: false,
            easing: "power1.inOut",
            repeat: 0,
            duration: contentItem.fadeInDuration,
            startTime: contentItem.startTime,
            properties: {
              opacity: 1
            },
            displayName: "fade-in",
            repeatDelay: 0
          }
        ],
        startAt: contentItem.startTime,
        displayName: `${contentItem.type} fade-in`
      });
    }

    // Fade out animation
    if (!skipMainAnimations) {
      timelineAnimations.push({
        id: `${targetId}-fade-${fadeOutTimestamp}`,
        target: { 
          type: targetType, 
          id: targetId 
        },
        tracks: [
          {
            id: `fade-${fadeOutTimestamp}`,
            type: "fade",
            yoyo: false,
            easing: "power1.inOut",
            repeat: 0,
            duration: contentItem.fadeOutDuration,
            startTime: contentItem.visibleEnd,
            properties: {
              opacity: 0
            },
            displayName: "fade-out",
            repeatDelay: 0
          }
        ],
        startAt: contentItem.visibleEnd,
        displayName: `${contentItem.type} fade-out`
      });
    }

    // Internal animations (for list items, captions, etc.)
    if (contentItem.internalAnimations && metadata.elementIds.length > 0) {
      contentItem.internalAnimations.forEach((internalAnim, animIndex) => {
        // Get the corresponding element ID from metadata
        // For lists: elementIds directly contains list item IDs starting at index 0
        // For demos: elementIds directly contains caption IDs starting at index 0
        let elementId: string | undefined;
        
        if (metadata.groupId) {
          // This is a list - elementIds are the list items
          elementId = metadata.elementIds[animIndex];
        } else {
          // For demos or headings (though headings don't have internal animations)
          elementId = metadata.elementIds[animIndex];
        }
        
        if (!elementId) return;

        const timestamp = Date.now() + contentIndex + animIndex + 20000;
        
        timelineAnimations.push({
          id: `${elementId}-fade-${timestamp}`,
          target: { 
            type: "element", 
            id: elementId 
          },
          tracks: [
            {
              id: `fade-${timestamp}`,
              type: "fade",
              yoyo: false,
              easing: "power1.inOut",
              repeat: 0,
              duration: internalAnim.fadeInDuration,
              startTime: internalAnim.startTime,
              properties: {
                opacity: 1
              },
              displayName: "fade-in",
              repeatDelay: 0
            }
          ],
          startAt: internalAnim.startTime,
          displayName: `element ${animIndex} fade-in`
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
      timeline: timelineAnimations,
      playback: {
        scale: 1,
        duration: timelineBuilder.getTotalDuration(),
        currentTime: 0,
        isPlaying: false
      }
    }
  };
}