/**
 * CONTENT-DRIVEN TIMELINE BUILDER
 * 
 * This TimelineBuilder automatically calculates timing based on content items.
 * Content items handle their own internal animations and timing:
 * - Lists: fade in items sequentially, total duration = sum of item animations  
 * - Demos: synchronized animations + captions in steps, duration = sum of all steps
 * - Codeblocks: simple fade transitions
 * - Headings: static (no timing)
 * 
 * Content items are agnostic - they don't know about specific types like "explanation" or "approach".
 * Timing emerges from content structure, not manual configuration.
 */

export interface TimelineItem {
  id: string;
  fadeInDuration: number;
  visibleTime: number;
  fadeOutDuration: number;
  startTime: number;
  fadeInEnd: number;
  visibleEnd: number;
  endTime: number;
  type: 'list' | 'demo' | 'codeblock' | 'heading';
}

export interface ListTimelineItem extends TimelineItem {
  type: 'list';
  itemCount: number;
  items: ListItemTiming[];
  // Timing for individual list items
  itemFadeInDuration: number;
  itemVisibleTime: number;
  itemFadeOutDuration: number;
}

export interface ListItemTiming {
  id: string;
  order: number;
  fadeInDuration: number;
  visibleTime: number;
  fadeOutDuration: number;
  startTime: number;
  fadeInEnd: number;
  visibleEnd: number;
  endTime: number;
}

export interface DemoTimelineItem extends TimelineItem {
  type: 'demo';
  stepCount: number;
  steps: DemoStep[];
  // Timing for individual demo steps
  animationDuration: number;
  captionFadeInDuration: number;
  captionVisibleTime: number;
  captionFadeOutDuration: number;
  animationOffset: number;
}

export interface DemoStep {
  id: string;
  order: number;
  animationStartTime: number;
  animationDuration: number;
  captionStartTime: number;
  captionFadeInDuration: number;
  captionVisibleTime: number;
  captionFadeOutDuration: number;
  captionEndTime: number;
}

export class TimelineBuilder {
  private items: TimelineItem[] = [];
  private currentTime: number = 0;

  // Default timing configuration - can be customized
  private timingConfig = {
    // List timing
    listItemFadeInDuration: 0.5,
    listItemVisibleTime: 2.0,
    listItemFadeOutDuration: 0.5,
    
    // Demo timing [[memory:7833618]]
    animationDuration: 1.5,
    captionFadeInDuration: 0.5,
    captionVisibleTime: 3.0,
    captionFadeOutDuration: 0.5,
    animationOffset: 0.5, // Animation starts when caption becomes visible
    
    // Codeblock timing
    codeblockFadeInDuration: 0.5,
    codeblockVisibleTime: 2.0,
    codeblockFadeOutDuration: 0.5,
    
    // Heading timing (static)
    headingFadeInDuration: 0.5,
    headingVisibleTime: 1.0
  };

  /**
   * Add a list content item
   * List timing = sum of all item animations (items fade in one by one)
   */
  addList(
    itemCount: number,
    customTiming?: {
      itemFadeInDuration?: number;
      itemVisibleTime?: number;  
      itemFadeOutDuration?: number;
    }
  ): ListTimelineItem {
    const listId = `list-${this.items.length}`;
    const listStartTime = this.currentTime;
    
    // Use custom timing or defaults
    const itemFadeInDuration = customTiming?.itemFadeInDuration ?? this.timingConfig.listItemFadeInDuration;
    const itemVisibleTime = customTiming?.itemVisibleTime ?? this.timingConfig.listItemVisibleTime;
    const itemFadeOutDuration = customTiming?.itemFadeOutDuration ?? this.timingConfig.listItemFadeOutDuration;
    
    // Create individual item timings - each item fades in sequentially
    const items: ListItemTiming[] = [];
    let itemCurrentTime = listStartTime;
    
    for (let i = 0; i < itemCount; i++) {
      const itemOrder = i + 1;
      const item: ListItemTiming = {
        id: `${listId}-item-${itemOrder}`,
        order: itemOrder,
        fadeInDuration: itemFadeInDuration,
        visibleTime: itemVisibleTime,
        fadeOutDuration: itemFadeOutDuration,
        startTime: itemCurrentTime,
        fadeInEnd: itemCurrentTime + itemFadeInDuration,
        visibleEnd: itemCurrentTime + itemFadeInDuration + itemVisibleTime,
        endTime: itemCurrentTime + itemFadeInDuration + itemVisibleTime + itemFadeOutDuration
      };
      
      items.push(item);
      itemCurrentTime = item.endTime;
    }
    
    // List duration = time from first item start to last item end
    const listEndTime = items.length > 0 ? items[items.length - 1]!.endTime : listStartTime;
    
    const listItem: ListTimelineItem = {
      id: listId,
      type: 'list',
      fadeInDuration: 0, // List container has instant appearance
      visibleTime: listEndTime - listStartTime,
      fadeOutDuration: 0, // List container doesn't fade out (items do)
      startTime: listStartTime,
      fadeInEnd: listStartTime,
      visibleEnd: listEndTime,
      endTime: listEndTime,
      itemCount,
      items,
      itemFadeInDuration,
      itemVisibleTime,
      itemFadeOutDuration
    };

    this.items.push(listItem);
    this.currentTime = listItem.endTime;

    return listItem;
  }

  /**
   * Add a demo content item
   * Demo timing = sum of all animation + caption step timings
   */
  addDemo(
    stepCount: number,
    customTiming?: {
      animationDuration?: number;
      captionFadeInDuration?: number;
      captionVisibleTime?: number;
      captionFadeOutDuration?: number;
      animationOffset?: number;
    }
  ): DemoTimelineItem {
    const demoId = `demo-${this.items.length}`;
    const demoStartTime = this.currentTime;
    
    // Use custom timing or defaults
    const animationDuration = customTiming?.animationDuration ?? this.timingConfig.animationDuration;
    const captionFadeInDuration = customTiming?.captionFadeInDuration ?? this.timingConfig.captionFadeInDuration;
    const captionVisibleTime = customTiming?.captionVisibleTime ?? this.timingConfig.captionVisibleTime;
    const captionFadeOutDuration = customTiming?.captionFadeOutDuration ?? this.timingConfig.captionFadeOutDuration;
    const animationOffset = customTiming?.animationOffset ?? this.timingConfig.animationOffset;
    
    // Create demo steps - each step combines animation + caption
    const steps: DemoStep[] = [];
    let stepCurrentTime = demoStartTime;
    
    for (let i = 0; i < stepCount; i++) {
      const stepOrder = i + 1;
      const animationStartTime = stepCurrentTime;
      const captionStartTime = animationStartTime + animationOffset;
      const captionEndTime = captionStartTime + captionFadeInDuration + captionVisibleTime + captionFadeOutDuration;
      
      // Step ends when both animation and caption are complete
      const stepEndTime = Math.max(
        animationStartTime + animationDuration,
        captionEndTime
      );
      
      const step: DemoStep = {
        id: `${demoId}-step-${stepOrder}`,
        order: stepOrder,
        animationStartTime,
        animationDuration,
        captionStartTime,
        captionFadeInDuration,
        captionVisibleTime,
        captionFadeOutDuration,
        captionEndTime
      };
      
      steps.push(step);
      stepCurrentTime = stepEndTime;
    }
    
    // Demo duration = time from first step start to last step end
    const demoEndTime = steps.length > 0 ? steps[steps.length - 1]!.captionEndTime : demoStartTime;
    
    const demoItem: DemoTimelineItem = {
      id: demoId,
      type: 'demo',
      fadeInDuration: 0, // Demo container has instant appearance
      visibleTime: demoEndTime - demoStartTime,
      fadeOutDuration: 0, // Demo container doesn't fade out
      startTime: demoStartTime,
      fadeInEnd: demoStartTime,
      visibleEnd: demoEndTime,
      endTime: demoEndTime,
      stepCount,
      steps,
      animationDuration,
      captionFadeInDuration,
      captionVisibleTime,
      captionFadeOutDuration,
      animationOffset
    };

    this.items.push(demoItem);
    this.currentTime = demoItem.endTime;

    return demoItem;
  }

  /**
   * Add a codeblock content item  
   * Simple fade in/out timing
   */
  addCodeblock(customTiming?: {
    fadeInDuration?: number;
    visibleTime?: number;
    fadeOutDuration?: number;
  }): TimelineItem {
    const codeblockFadeInDuration = customTiming?.fadeInDuration ?? this.timingConfig.codeblockFadeInDuration;
    const codeblockVisibleTime = customTiming?.visibleTime ?? this.timingConfig.codeblockVisibleTime;  
    const codeblockFadeOutDuration = customTiming?.fadeOutDuration ?? this.timingConfig.codeblockFadeOutDuration;
    
    const item: TimelineItem = {
      id: `codeblock-${this.items.length}`,
      fadeInDuration: codeblockFadeInDuration,
      visibleTime: codeblockVisibleTime,
      fadeOutDuration: codeblockFadeOutDuration,
      startTime: this.currentTime,
      fadeInEnd: this.currentTime + codeblockFadeInDuration,
      visibleEnd: this.currentTime + codeblockFadeInDuration + codeblockVisibleTime,
      endTime: this.currentTime + codeblockFadeInDuration + codeblockVisibleTime + codeblockFadeOutDuration,
      type: 'codeblock'
    };

    this.items.push(item);
    this.currentTime = item.endTime;

    return item;
  }

  /**
   * Add a heading content item
   * Static positioning, no fade transitions
   */
  addHeading(): TimelineItem {
    const item: TimelineItem = {
      id: `heading-${this.items.length}`,
      fadeInDuration: this.timingConfig.headingFadeInDuration,
      visibleTime: this.timingConfig.headingVisibleTime,
      fadeOutDuration: 0, // Headings stay visible
      startTime: this.currentTime,
      fadeInEnd: this.currentTime + this.timingConfig.headingFadeInDuration,
      visibleEnd: this.currentTime + this.timingConfig.headingFadeInDuration + this.timingConfig.headingVisibleTime,
      endTime: this.currentTime + this.timingConfig.headingFadeInDuration + this.timingConfig.headingVisibleTime,
      type: 'heading'
    };

    this.items.push(item);
    this.currentTime = item.endTime;

    return item;
  }

  /**
   * Add a wait duration (no content, just advances timeline)
   */
  addWaitDuration(duration: number): void {
    this.currentTime += duration;
  }

  /**
   * Get a timeline item by ID
   */
  getItem(id: string): TimelineItem | undefined {
    return this.items.find(item => item.id === id);
  }

  /**
   * Get all timeline items
   */
  getAllItems(): TimelineItem[] {
    return [...this.items];
  }

  /**
   * Get the total duration of the timeline
   */
  getTotalDuration(): number {
    return this.currentTime;
  }

  /**
   * Get the current time position
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  /**
   * Reset the timeline builder
   */
  reset(): void {
    this.items = [];
    this.currentTime = 0;
  }

  /**
   * Get all list timeline items
   */
  getAllListItems(): ListTimelineItem[] {
    return this.items.filter(item => item.type === 'list') as ListTimelineItem[];
  }

  /**
   * Get all demo timeline items
   */
  getAllDemoItems(): DemoTimelineItem[] {
    return this.items.filter(item => item.type === 'demo') as DemoTimelineItem[];
  }

  /**
   * Get a specific list item timing by list ID and item order
   */
  getListItemTiming(listId: string, itemOrder: number): ListItemTiming | undefined {
    const list = this.items.find(item => item.id === listId && item.type === 'list') as ListTimelineItem;
    return list?.items.find(item => item.order === itemOrder);
  }

  /**
   * Update timing configuration
   */
  updateTimingConfig(newConfig: Partial<typeof this.timingConfig>): void {
    this.timingConfig = { ...this.timingConfig, ...newConfig };
  }

  /**
   * Compatibility method for caption timing (used by element-factory)
   * Returns default caption timing for legacy compatibility
   */
  getElementTiming(elementType: string) {
    if (elementType === 'caption') {
      return {
        fadeInDuration: this.timingConfig.captionFadeInDuration,
        visibleTime: this.timingConfig.captionVisibleTime,
        fadeOutDuration: this.timingConfig.captionFadeOutDuration,
        startTime: 0 // Will be calculated by caller
      };
    }
    return null;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): object {
    return {
      totalDuration: this.getTotalDuration(),
      itemCount: this.items.length,
      items: this.items.map(item => ({
        id: item.id,
        type: item.type,
        startTime: item.startTime,
        endTime: item.endTime,
        duration: item.endTime - item.startTime
      })),
      timingConfig: this.timingConfig
    };
  }
}