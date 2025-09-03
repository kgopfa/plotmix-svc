import type { VideoTimelineConfig } from '../../../types';

// Central configuration for video timing and section organization
export const DEFAULT_TIMELINE_CONFIG: VideoTimelineConfig = {
  // Default timing values - matching executor times
  defaults: {
    captionVisibleTime: 3,
    captionFadeInDuration: 0.5,
    captionFadeOutDuration: 0.5,
    elementFadeInDuration: 1.0, // Heading/subtitle fade-in duration
    elementFadeOutDuration: 0.5,
    elementStaggerDelay: 0.1,
    animationDuration: 2.0
  },
  
  // Section timing - matching executor flow
  sections: {
    intro: { startTime: 0, endTime: 4 }, // 0-4s: heading, subtitle, explanation, example
    main: { startTime: 4, endTime: 18 }, // 4-18s: array, captions, animations
    conclusion: { startTime: 18, endTime: 22 } // 18-22s: conclusions
  },
  
  // Element section assignments - matching executor flow
  elementSections: {
    intro: ['heading', 'subtitle', 'explanation', 'example'],
    main: ['array', 'caption', 'animate'],
    conclusion: ['conclusion']
  },
  
  // Element-specific timing overrides - matching executor times
  elementTiming: {
    heading: { 
      fadeInDuration: 1.0,
      startTime: 0.5, // Appears at 0.5s (executor: startTime: 0.5)
      endTime: 4.0   // Stays visible until main section
    },
    subtitle: {
      fadeInDuration: 1.0,
      startTime: 1.0, // Appears at 1s (executor: startTime: 1)
      endTime: 4.0   // Stays visible until main section
    },
    explanation: {
      fadeInDuration: 1.0,
      startTime: 1.25, // Appears at 1.25s (executor: startTime: 1.25)
      endTime: 2.5    // Fades out at 2.5s (executor: startTime: 2.5)
    },
    example: {
      fadeInDuration: 1.0,
      startTime: 3.0, // Appears at 3.0s (executor: startTime: 3.0)
      endTime: 3.5    // Fades out at 3.5s (executor: startTime: 3.5)
    }
  }
};

export class TimelineManager {
  private config: VideoTimelineConfig;

  constructor(config: VideoTimelineConfig = DEFAULT_TIMELINE_CONFIG) {
    this.config = config;
  }

  /**
   * Get default timing values
   */
  getDefaults() {
    return this.config.defaults;
  }

  /**
   * Get which section an element type belongs to
   */
  getElementSection(elementType: string): string | null {
    for (const [sectionName, elements] of Object.entries(this.config.elementSections)) {
      if (elements.includes(elementType)) {
        return sectionName;
      }
    }
    return null;
  }

  /**
   * Get section timing
   */
  getSectionTiming(sectionName: string): { startTime: number; endTime: number } | null {
    return this.config.sections[sectionName as keyof typeof this.config.sections] ?? null;
  }

  /**
   * Calculate timing for an element within its section
   */
  calculateElementTiming(
    elementType: string,
    elementIndex: number
  ): { startTime: number; fadeInEndTime: number; fadeOutStartTime: number; endTime: number } | null {
    const sectionName = this.getElementSection(elementType);
    if (!sectionName) return null;

    const section = this.getSectionTiming(sectionName);
    if (!section) return null;

    const { startTime, endTime } = section;
    const defaults = this.config.defaults;
    
    const elementStartTime = startTime + (elementIndex * defaults.elementStaggerDelay);
    const fadeInEndTime = elementStartTime + defaults.elementFadeInDuration;
    const fadeOutStartTime = endTime - defaults.elementFadeOutDuration;
    
    return {
      startTime: elementStartTime,
      fadeInEndTime,
      fadeOutStartTime,
      endTime: endTime
    };
  }

  /**
   * Calculate timing for a caption within its section
   */
  calculateCaptionTiming(
    captionOrder: number
  ): { startTime: number; fadeInEndTime: number; fadeOutStartTime: number; endTime: number } | null {
    const sectionName = this.getElementSection('caption');
    if (!sectionName) return null;

    const section = this.getSectionTiming(sectionName);
    if (!section) return null;

    const { startTime, endTime } = section;
    const defaults = this.config.defaults;
    const totalCaptionDuration = defaults.captionFadeInDuration + defaults.captionVisibleTime + defaults.captionFadeOutDuration;
    
    // Start captions after elements have faded in
    const captionStartTime = startTime + defaults.elementFadeInDuration + (captionOrder - 1) * totalCaptionDuration;
    const fadeInEndTime = captionStartTime + defaults.captionFadeInDuration;
    const fadeOutStartTime = fadeInEndTime + defaults.captionVisibleTime;
    
    return {
      startTime: captionStartTime,
      fadeInEndTime,
      fadeOutStartTime,
      endTime: endTime
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: VideoTimelineConfig): void {
    this.config = newConfig;
  }

  /**
   * Get debug information
   */
  getDebugInfo(): object {
    return {
      config: this.config,
      totalDuration: Math.max(...Object.values(this.config.sections).map(s => s.endTime))
    };
  }
}
