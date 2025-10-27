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

  // Track order for each content type for proper positioning and timing
  let headingOrder = 0;
  let listOrder = 0;
  let codeblockOrder = 0;

  const contentItemsMetadata: Array<{
    type: string;
    groupId?: string;
    elementIds: string[];
    arrayElementCount?: number;
    arrayCellGroupIds?: string[];
    demoSteps?: any[];
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
        }, style, headingOrder);
        elements.push(heading);
        contentItemsMetadata.push({
          type: 'heading',
          elementIds: [heading.id]
        });
        headingOrder++;
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
        }, style, codeblockOrder);
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
        codeblockOrder++;
        break;

      case "demo":
        const arrayResult = ElementFactory.createArray({
          values: item.dataStructure.data
        }, style);
        groups.push(...arrayResult.groups);
        elements.push(...arrayResult.elements);

        const arrayCellGroups = arrayResult.groups.filter(g => 
          g.name.includes('Array Cell')
        );

        const captionIds: string[] = [];
        item.steps.forEach((step: any, stepIndex: number) => {
          if (step.caption) {
            const caption = ElementFactory.createCaption({
              order: stepIndex + 1,
              text: step.caption
            }, style);
            caption.y = 320;
            elements.push(caption);
            captionIds.push(caption.id);
          }
        });
        
        contentItemsMetadata.push({
          type: 'demo',
          elementIds: captionIds,
          arrayElementCount: arrayCellGroups.length,
          arrayCellGroupIds: arrayCellGroups.map(g => g.id),
          demoSteps: item.steps
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

    const skipMainAnimations = metadata.type === 'demo';

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
              alpha: "1"
            },
            displayName: "fade-in",
            repeatDelay: 0
          }
        ],
        startAt: contentItem.startTime,
        displayName: `${contentItem.type} fade-in`
      });
    }

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
              alpha: 0
            },
            displayName: "fade-out",
            repeatDelay: 0
          }
        ],
        startAt: contentItem.visibleEnd,
        displayName: `${contentItem.type} fade-out`
      });
    }

    if (contentItem.internalAnimations && metadata.elementIds.length > 0) {
      contentItem.internalAnimations.forEach((internalAnim, animIndex) => {
        let elementId: string | undefined;
        
        if (metadata.groupId) {
          elementId = metadata.elementIds[animIndex];
        } else {
          elementId = metadata.elementIds[animIndex];
        }
        
        if (!elementId) return;

        const timestamp = Date.now() + contentIndex + animIndex + 20000;
        
        const isDemoCaption = metadata.type === 'demo';
        
        if (isDemoCaption) {
          // For demo captions: one animation with two tracks (fade in + fade out)
          timelineAnimations.push({
            id: `${elementId}-timeline-${timestamp}`,
            target: { 
              type: "element", 
              id: elementId 
            },
            tracks: [
              {
                id: `fade-in-${timestamp}`,
                type: "fade",
                yoyo: false,
                easing: "power1.inOut",
                repeat: 0,
                duration: internalAnim.fadeInDuration,
                startTime: internalAnim.startTime,
                properties: {
                  alpha: 1
                },
                displayName: "fade-in",
                repeatDelay: 0
              },
              {
                id: `fade-out-${timestamp}`,
                type: "fade",
                yoyo: false,
                easing: "power1.inOut",
                repeat: 0,
                duration: internalAnim.fadeOutDuration,
                startTime: internalAnim.visibleEnd,
                properties: {
                  alpha: 0
                },
                displayName: "fade-out",
                repeatDelay: 0
              }
            ],
            startAt: internalAnim.startTime,
            displayName: `Caption ${animIndex + 1}`
          });
        } else {
          // For list items: single track fade-in only
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
                  alpha: "1"
                },
                displayName: "fade-in",
                repeatDelay: 0
              }
            ],
            startAt: internalAnim.startTime,
            displayName: `element ${animIndex} fade-in`
          });
        }
      });
    }

    // Add array fade-in animation for demos
    if (metadata.type === 'demo' && metadata.arrayCellGroupIds) {
      const arrayFadeInTimestamp = Date.now() + contentIndex + 40000;
      metadata.arrayCellGroupIds.forEach((cellGroupId: string) => {
        timelineAnimations.push({
          id: `${cellGroupId}-array-fade-${arrayFadeInTimestamp}`,
          target: { 
            type: "group", 
            id: cellGroupId 
          },
          tracks: [
            {
              id: `array-fade-${arrayFadeInTimestamp}`,
              type: "fade",
              yoyo: false,
              easing: "power1.inOut",
              repeat: 0,
              duration: contentItem.fadeInDuration,
              startTime: contentItem.startTime,
              properties: {
                alpha: "1"
              },
              displayName: "array-fade-in",
              repeatDelay: 0
            }
          ],
          startAt: contentItem.startTime,
          displayName: `Array fade-in`
        });
      });
    }

    if (metadata.type === 'demo' && metadata.demoSteps && metadata.arrayCellGroupIds) {
      metadata.demoSteps.forEach((step: any, stepIndex: number) => {
        const stepTiming = contentItem.internalAnimations?.[stepIndex];
        if (!stepTiming || !step.actions) return;

        const actionStartTime = stepTiming.startTime;
        const actionDuration = 0.5;
        
        step.actions.forEach((action: any, actionIndex: number) => {
          if (!action.type || !action.indices) return;

          action.indices.forEach((cellIndex: number) => {
            const cellGroupId = metadata.arrayCellGroupIds![cellIndex];
            if (!cellGroupId) return;

            const timestamp = Date.now() + contentIndex + stepIndex + actionIndex + cellIndex + 30000;
            
            let animationProperties: any = {};
            let animationType: string = 'color';

            switch (action.type) {
              case 'highlight':
                animationProperties = { fillColor: '#e1d799' }; // Light yellow
                break;
              case 'unhighlight':
                animationProperties = { fillColor: '#8a7cf4' }; // Original purple
                break;
              case 'select':
                animationProperties = { fillColor: '#d94338' }; // Red
                break;
              case 'deselect':
                animationProperties = { fillColor: '#8a7cf4' }; // Original purple
                break;
              case 'focus':
                animationProperties = { fillColor: '#f4a261' }; // Orange
                break;
              case 'compare':
                animationProperties = { fillColor: '#ff6b6b' }; // Soft red
                break;
              default:
                return;
            }

            // Find the rectangle element within this cell group for color animations
            const cellGroup = groups.find(g => g.id === cellGroupId);
            if (!cellGroup) return;

            const rectElementId = cellGroup.elementIds[0];
            if (!rectElementId) return;

            timelineAnimations.push({
              id: `${rectElementId}-${action.type}-${timestamp}`,
              target: { 
                type: "element", 
                id: rectElementId 
              },
              tracks: [
                {
                  id: `${action.type}-${timestamp}`,
                  type: animationType as any,
                  yoyo: false,
                  easing: "power1.inOut",
                  repeat: 0,
                  duration: actionDuration,
                  startTime: actionStartTime,
                  properties: animationProperties,
                  displayName: action.type,
                  repeatDelay: 0
                }
              ],
              startAt: actionStartTime,
              displayName: `array[${cellIndex}] ${action.type}`
            });
          });
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