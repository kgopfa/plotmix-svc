export interface TimelineItem {
  id: string;
  fadeInDuration: number;
  visibleTime: number;
  fadeOutDuration: number;
  startTime: number;
  fadeInEnd: number;
  visibleEnd: number;
  endTime: number;
}

export interface ListTimelineItem extends TimelineItem {
  type: 'list';
  items: TimelineItem[];
  itemType: 'explanation' | 'approach' | 'keyidea' | 'edgecase' | 'alternative';
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

export interface DemoTimelineItem extends TimelineItem {
  type: 'demo';
  steps: DemoStep[];
}

export class TimelineBuilder {
  private items: TimelineItem[] = [];
  private currentTime: number = 0;

  /**
   * Add an item to the timeline with automatic sequential timing
   * @param fadeInDuration Duration for fade-in animation (seconds)
   * @param visibleTime Duration item stays visible (seconds)
   * @param fadeOutDuration Duration for fade-out animation (seconds)
   * @returns The created timeline item
   */
  addItem(fadeInDuration: number, visibleTime: number, fadeOutDuration: number): TimelineItem {
    const item: TimelineItem = {
      id: `item-${this.items.length}`,
      fadeInDuration,
      visibleTime,
      fadeOutDuration,
      startTime: this.currentTime,
      fadeInEnd: this.currentTime + fadeInDuration,
      visibleEnd: this.currentTime + fadeInDuration + visibleTime,
      endTime: this.currentTime + fadeInDuration + visibleTime + fadeOutDuration
    };

    this.items.push(item);
    
    // Move current time to the end of this item
    this.currentTime = item.endTime;

    return item;
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
   * Add a wait duration (advances current time without creating an item)
   */
  addWaitDuration(duration: number): void {
    this.currentTime += duration;
  }

  /**
   * Add a list with sequential items (for explanation, approach, keyidea, etc.)
   * @param itemType The type of list items
   * @param itemCount Number of items in the list
   * @param itemFadeInDuration Duration for each item's fade-in animation
   * @param itemVisibleTime Duration each item stays visible
   * @param itemFadeOutDuration Duration for each item's fade-out animation
   * @param listFadeInDuration Duration for the list container fade-in (optional)
   * @param listFadeOutDuration Duration for the list container fade-out (optional)
   * @returns The created list timeline item
   */
  addList(
    itemType: 'explanation' | 'approach' | 'keyidea' | 'edgecase' | 'alternative',
    itemCount: number,
    itemFadeInDuration: number,
    itemVisibleTime: number,
    itemFadeOutDuration: number,
    listFadeInDuration: number = 0,
    listFadeOutDuration: number = 0
  ): ListTimelineItem {
    const listId = `${itemType}-list-${this.items.length}`;
    const listStartTime = this.currentTime;
    
    // Create individual items within the list
    const items: TimelineItem[] = [];
    let itemCurrentTime = listStartTime + listFadeInDuration;
    
    for (let i = 0; i < itemCount; i++) {
      const item: TimelineItem = {
        id: `${itemType}-item-${i + 1}`,
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
    
    // Calculate total list duration
    const totalItemDuration = items.length > 0 ? items[items.length - 1]!.endTime - listStartTime - listFadeInDuration : 0;
    const listEndTime = listStartTime + listFadeInDuration + totalItemDuration + listFadeOutDuration;
    
    const listItem: ListTimelineItem = {
      id: listId,
      type: 'list',
      itemType,
      fadeInDuration: listFadeInDuration,
      visibleTime: totalItemDuration,
      fadeOutDuration: listFadeOutDuration,
      startTime: listStartTime,
      fadeInEnd: listStartTime + listFadeInDuration,
      visibleEnd: listEndTime - listFadeOutDuration,
      endTime: listEndTime,
      items
    };

    this.items.push(listItem);
    
    // Move current time to the end of this list
    this.currentTime = listItem.endTime;

    return listItem;
  }

  /**
   * Get a list timeline item by ID
   */
  getListItem(id: string): ListTimelineItem | undefined {
    const item = this.items.find(item => item.id === id);
    return item && 'type' in item && item.type === 'list' ? item as ListTimelineItem : undefined;
  }

  /**
   * Get all list timeline items
   */
  getAllListItems(): ListTimelineItem[] {
    return this.items.filter(item => 'type' in item && item.type === 'list') as ListTimelineItem[];
  }

  /**
   * Add a demo with animate + caption sequences
   * @param stepCount Number of animate + caption steps in the demo
   * @param animationDuration Duration for each animation (seconds)
   * @param captionFadeInDuration Duration for caption fade-in (seconds)
   * @param captionVisibleTime Duration caption stays visible (seconds)
   * @param captionFadeOutDuration Duration for caption fade-out (seconds)
   * @param animationOffset Delay between animation start and caption start (seconds)
   * @param stepGap Duration between steps (seconds)
   * @returns The created demo timeline item
   */
  addDemo(
    stepCount: number,
    animationDuration: number = 1.5,
    captionFadeInDuration: number = 0.5,
    captionVisibleTime: number = 3.0,
    captionFadeOutDuration: number = 0.5,
    animationOffset: number = 0.5,
    stepGap: number = 0.0
  ): DemoTimelineItem {
    const demoId = `demo-${this.items.length}`;
    const demoStartTime = this.currentTime;
    
    // Create individual steps within the demo
    const steps: DemoStep[] = [];
    let stepCurrentTime = demoStartTime;
    
    for (let i = 0; i < stepCount; i++) {
      const stepOrder = i + 1;
      const animationStartTime = stepCurrentTime;
      const captionStartTime = animationStartTime + animationOffset;
      const captionEndTime = captionStartTime + captionFadeInDuration + captionVisibleTime + captionFadeOutDuration;
      const stepEndTime = Math.max(animationStartTime + animationDuration, captionEndTime);
      
      const step: DemoStep = {
        id: `demo-step-${stepOrder}`,
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
      stepCurrentTime = stepEndTime + stepGap;
    }
    
    // Calculate total demo duration
    const totalDemoDuration = steps.length > 0 ? steps[steps.length - 1]!.captionEndTime - demoStartTime : 0;
    const demoEndTime = demoStartTime + totalDemoDuration;
    
    const demoItem: DemoTimelineItem = {
      id: demoId,
      type: 'demo',
      fadeInDuration: 0, // Demos don't have container fade-in
      visibleTime: totalDemoDuration,
      fadeOutDuration: 0, // Demos don't have container fade-out
      startTime: demoStartTime,
      fadeInEnd: demoStartTime,
      visibleEnd: demoEndTime,
      endTime: demoEndTime,
      steps
    };

    this.items.push(demoItem);
    
    // Move current time to the end of this demo
    this.currentTime = demoItem.endTime;

    return demoItem;
  }

  /**
   * Get a demo timeline item by ID
   */
  getDemoItem(id: string): DemoTimelineItem | undefined {
    const item = this.items.find(item => item.id === id);
    return item && 'type' in item && item.type === 'demo' ? item as DemoTimelineItem : undefined;
  }

  /**
   * Get all demo timeline items
   */
  getAllDemoItems(): DemoTimelineItem[] {
    return this.items.filter(item => 'type' in item && item.type === 'demo') as DemoTimelineItem[];
  }

  /**
   * Get a specific demo step by demo ID and step order
   */
  getDemoStep(demoId: string, stepOrder: number): DemoStep | undefined {
    const demo = this.getDemoItem(demoId);
    return demo?.steps.find(step => step.order === stepOrder);
  }
}
