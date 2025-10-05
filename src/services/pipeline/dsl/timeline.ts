/**
 * SIMPLE TIMELINE BUILDER
 * 
 * Works like an array - content items are added in order and get sequential timing.
 * Each content item has:
 * - Fade in duration
 * - Visible time 
 * - Fade out duration
 * - Calculated start/end times based on order
 * 
 * Content items can have their own internal animations (like list items fading in).
 */

export interface ContentItem {
  id: string;
  type: 'heading' | 'list' | 'codeblock' | 'demo';
  order: number;
  
  // Timing for the content item itself
  fadeInDuration: number;
  visibleTime: number;
  fadeOutDuration: number;
  
  // Calculated times
  startTime: number;
  fadeInEnd: number;
  visibleEnd: number;
  endTime: number;
  
  // Internal animations (like list items)
  internalAnimations?: InternalAnimation[];
}

export interface InternalAnimation {
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

export class TimelineBuilder {
  private contentItems: ContentItem[] = [];
  private currentTime = 0;
  
  
  // Type-specific timing - using the better values from previous system
  private readonly TIMING = {
    heading: { fadeIn: 1.0, visible: 2.0, fadeOut: 1.5 },
    list: { fadeIn: 1.0, visible: 2.0, fadeOut: 1.5 },
    codeblock: { fadeIn: 1.0, visible: 3.0, fadeOut: 1.5 },
    demo: { fadeIn: 1.0, visible: 2.0, fadeOut: 1.5 }
  };

  addHeading(): void {
    this.addContentItem('heading');
  }

  addList(itemCount: number): void {
    const contentItem = this.addContentItem('list', itemCount);
    
    // Add internal animations for list items - only fade in sequentially
    const itemFadeIn = 1.0;      // elementFadeInDuration
    const itemSpacing = 0.1;      // elementStaggerDelay
    
    contentItem.internalAnimations = [];
    
    // Title appears first at content item start time
    const titleAnimation: InternalAnimation = {
      id: 'list-title',
      order: -1, // Special order for title (appears first)
      fadeInDuration: itemFadeIn,
      visibleTime: 0, // No individual visible time - controlled by content item
      fadeOutDuration: 0, // No individual fade out - controlled by content item
      startTime: contentItem.startTime,
      fadeInEnd: contentItem.startTime + itemFadeIn,
      visibleEnd: contentItem.startTime + itemFadeIn,
      endTime: contentItem.startTime + itemFadeIn
    };
    
    contentItem.internalAnimations.push(titleAnimation);
    
    // Items appear sequentially after title
    let itemStartTime = contentItem.startTime + itemFadeIn + itemSpacing;
    
    for (let i = 0; i < itemCount; i++) {
      const itemAnimation: InternalAnimation = {
        id: `list-item-${i}`,
        order: i,
        fadeInDuration: itemFadeIn,
        visibleTime: 0, // No individual visible time - controlled by content item
        fadeOutDuration: 0, // No individual fade out - controlled by content item
        startTime: itemStartTime,
        fadeInEnd: itemStartTime + itemFadeIn,
        visibleEnd: itemStartTime + itemFadeIn, // Same as fadeInEnd since no visible time
        endTime: itemStartTime + itemFadeIn // Same as fadeInEnd since no fade out
      };
      
      contentItem.internalAnimations.push(itemAnimation);
      itemStartTime += itemFadeIn + itemSpacing;
    }
  }

  addCodeblock(): void {
    this.addContentItem('codeblock');
  }

  addDemo(stepCount: number): void {
    const contentItem = this.addContentItem('demo', stepCount);
    
    // Add internal animations for demo steps (captions) - using better values
    const stepFadeIn = 0.5;       // captionFadeInDuration
    const stepVisible = 3.0;      // captionVisibleTime
    const stepFadeOut = 0.5;      // captionFadeOutDuration
    const stepSpacing = 0.5;      // Gap between steps
    
    contentItem.internalAnimations = [];
    let stepStartTime = contentItem.startTime;
    
    for (let i = 0; i < stepCount; i++) {
      const stepAnimation: InternalAnimation = {
        id: `demo-step-${i}`,
        order: i,
        fadeInDuration: stepFadeIn,
        visibleTime: stepVisible,
        fadeOutDuration: stepFadeOut,
        startTime: stepStartTime,
        fadeInEnd: stepStartTime + stepFadeIn,
        visibleEnd: stepStartTime + stepFadeIn + stepVisible,
        endTime: stepStartTime + stepFadeIn + stepVisible + stepFadeOut
      };
      
      contentItem.internalAnimations.push(stepAnimation);
      stepStartTime += stepFadeIn + stepVisible + stepFadeOut + stepSpacing;
    }
  }

  private addContentItem(type: 'heading' | 'list' | 'codeblock' | 'demo', _itemCount?: number): ContentItem {
    const timing = this.TIMING[type];
    
    const contentItem: ContentItem = {
      id: `${type}-${this.contentItems.length}`,
      type,
      order: this.contentItems.length,
      fadeInDuration: timing.fadeIn,
      visibleTime: timing.visible,
      fadeOutDuration: timing.fadeOut,
      startTime: this.currentTime,
      fadeInEnd: this.currentTime + timing.fadeIn,
      visibleEnd: this.currentTime + timing.fadeIn + timing.visible,
      endTime: this.currentTime + timing.fadeIn + timing.visible + timing.fadeOut
    };
    
    this.contentItems.push(contentItem);
    
    // Move to next content item start time
    this.currentTime = contentItem.endTime + 0.2; // Small gap between content items
    
    return contentItem;
  }

  // Get timing for a specific content item by order
  getContentItemTiming(order: number): ContentItem | undefined {
    return this.contentItems.find(item => item.order === order);
  }

  // Get timing for internal animation (list item, demo step, etc.)
  getInternalAnimationTiming(contentOrder: number, internalOrder: number): InternalAnimation | undefined {
    const contentItem = this.getContentItemTiming(contentOrder);
    return contentItem?.internalAnimations?.find(anim => anim.order === internalOrder);
  }

  // Get all content items
  getAllContentItems(): ContentItem[] {
    return [...this.contentItems];
  }

  // Get total duration
  getTotalDuration(): number {
    if (this.contentItems.length === 0) return 0;
    const lastItem = this.contentItems[this.contentItems.length - 1]!;
    return lastItem.endTime;
  }

  // Get content item by type and order within that type
  getContentItemByType(type: 'heading' | 'list' | 'codeblock' | 'demo', typeOrder: number): ContentItem | undefined {
    const itemsOfType = this.contentItems.filter(item => item.type === type);
    return itemsOfType[typeOrder];
  }

  // Get list item timing (for backward compatibility)
  getListTiming(listOrder: number): ContentItem | undefined {
    return this.getContentItemByType('list', listOrder);
  }

  // Get demo step timing (for backward compatibility)  
  getDemoStepTiming(stepOrder: number): InternalAnimation | undefined {
    const demoItems = this.contentItems.filter(item => item.type === 'demo');
    if (demoItems.length === 0) return undefined;
    
    const demoItem = demoItems[0]!; // Get first demo
    return demoItem.internalAnimations?.[stepOrder];
  }
}