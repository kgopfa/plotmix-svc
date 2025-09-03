import type { VideoTimelineConfig } from '../../../types';

const DELTA: number = 2.5;
const ANIMATION_DURATION: number = 0.5;
const ANIMATION_START: number = 0.5;

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

  // Section timing - intro fixed, main and conclusion calculated dynamically
  sections: {
    intro: { startTime: 0, endTime: 14 }, // 0-14s: heading, subtitle, explanation, example (fixed)
    main: { startTime: 14, endTime: 0 }, // 14s+: array, captions, animations (calculated)
    conclusion: { startTime: 0, endTime: 0 } // After main: conclusions (calculated)
  },
  
  // Element section assignments - matching executor flow
  elementSections: {
    intro: ['heading', 'subtitle', 'explanation', 'example'],
    main: ['array', 'caption', 'animate'],
    conclusion: ['conclusion']
  },
  
  // Element-specific timing overrides - sequential flow
  elementTiming: {
    heading: { 
      fadeInDuration: ANIMATION_DURATION,
      startTime: ANIMATION_START,
      endTime: 0
    },
    subtitle: {
      fadeInDuration: ANIMATION_DURATION,
      startTime: ANIMATION_DURATION + ANIMATION_START,
      endTime: 0
    },
    explanation: {
      fadeInDuration: ANIMATION_DURATION,
      fadeOutDuration: ANIMATION_DURATION * 2,
      startTime: DELTA,
      endTime: DELTA * 2
    },
    example: {
      fadeInDuration: ANIMATION_DURATION,
      fadeOutDuration: ANIMATION_DURATION * 2,
      startTime: DELTA * 2 + ANIMATION_DURATION * 2,
      endTime: DELTA * 4 - 1
    },
    array: {
      fadeInDuration: ANIMATION_DURATION,
      fadeOutDuration: ANIMATION_DURATION,
      startTime: DELTA * 4,
      endTime: 0 // Will be calculated dynamically based on content
    },
    caption: {
      fadeInDuration: ANIMATION_DURATION,
      fadeOutDuration: ANIMATION_DURATION,
      visibleTime: DELTA,
      startTime: DELTA * 4,
      endTime: 0 // Will be calculated dynamically based on number of captions
    },
    conclusion: {
      fadeInDuration: ANIMATION_DURATION,
      fadeOutDuration: ANIMATION_DURATION,
      visibleTime: DELTA,
      startTime: 0, // Will be calculated dynamically
      endTime: 0 // Will be calculated dynamically
    }
  }
};

export class TimelineManager {
  private config: VideoTimelineConfig;
  private captionCount: number = 0;
  private animationCount: number = 0;
  private conclusionCount: number = 0;

  constructor(config: VideoTimelineConfig = DEFAULT_TIMELINE_CONFIG) {
    this.config = config;
  }

  /**
   * Set content counts for dynamic timing calculation
   */
  setContentCounts(captionCount: number, animationCount: number, conclusionCount: number = 0): void {
    this.captionCount = captionCount;
    this.animationCount = animationCount;
    this.conclusionCount = conclusionCount;
    this.calculateDynamicTiming();
  }

  /**
   * Calculate dynamic timing for main and conclusion sections only
   */
  private calculateDynamicTiming(): void {
    const { defaults } = this.config;
    
    // Main section starts after intro (fixed at 14s)
    const mainStartTime = this.config.sections.intro.endTime;
    
    // Calculate main section duration based on captions/animations
    const totalCaptionDuration = defaults.captionFadeInDuration + defaults.captionVisibleTime + defaults.captionFadeOutDuration;
    const mainEndTime = mainStartTime + (Math.max(this.captionCount, this.animationCount) * totalCaptionDuration);
    this.config.sections.main = { startTime: mainStartTime, endTime: mainEndTime };
    
    // Calculate conclusion section timing
    const conclusionStartTime = mainEndTime;
    const totalConclusionDuration = defaults.captionFadeInDuration + defaults.captionVisibleTime + defaults.captionFadeOutDuration;
    const conclusionEndTime = conclusionStartTime + (this.conclusionCount * totalConclusionDuration);
    this.config.sections.conclusion = { startTime: conclusionStartTime, endTime: conclusionEndTime };
    
    // Update element timing with calculated end times
    if (this.config.elementTiming) {
      // Main elements - array and captions
      if (this.config.elementTiming['array']) {
        this.config.elementTiming['array'].endTime = mainEndTime;
      }
      if (this.config.elementTiming['caption']) {
        this.config.elementTiming['caption'].endTime = mainEndTime;
      }
      
      // Conclusion elements
      if (this.config.elementTiming['conclusion']) {
        this.config.elementTiming['conclusion'].startTime = conclusionStartTime;
        this.config.elementTiming['conclusion'].endTime = conclusionEndTime;
      }
    }
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
   * Get element timing from config
   */
  getElementTiming(elementType: string) {
    return this.config.elementTiming?.[elementType];
  }

  /**
   * Calculate caption timing for a specific caption order
   */
  calculateCaptionTiming(captionOrder: number): { startTime: number; fadeInEnd: number; fadeOutStart: number; endTime: number } {
    const { defaults } = this.config;
    const totalDuration = defaults.captionFadeInDuration + defaults.captionVisibleTime + defaults.captionFadeOutDuration;
    const startTime = this.config.sections.main.startTime + (captionOrder - 1) * totalDuration;
    
    return {
      startTime,
      fadeInEnd: startTime + defaults.captionFadeInDuration,
      fadeOutStart: startTime + defaults.captionFadeInDuration + defaults.captionVisibleTime,
      endTime: startTime + totalDuration
    };
  }

  /**
   * Calculate animation timing for a specific animation order
   */
  calculateAnimationTiming(animationOrder: number): { startTime: number; endTime: number } {
    const { defaults } = this.config;
    const totalDuration = defaults.captionFadeInDuration + defaults.captionVisibleTime + defaults.captionFadeOutDuration;
    const startTime = this.config.sections.main.startTime + (animationOrder - 1) * totalDuration + 0.5; // 0.5s after caption starts
    
    return {
      startTime,
      endTime: startTime + defaults.animationDuration
    };
  }

  /**
   * Calculate conclusion timing for a specific conclusion order
   */
  calculateConclusionTiming(conclusionOrder: number): { startTime: number; fadeInEnd: number; fadeOutStart: number; endTime: number } {
    const { defaults } = this.config;
    const totalDuration = defaults.captionFadeInDuration + defaults.captionVisibleTime + defaults.captionFadeOutDuration;
    
    // Group conclusions in pairs (1,2), (3,4), (5,6), etc.
    const groupIndex = Math.floor((conclusionOrder - 1) / 2);
    const startTime = this.config.sections.conclusion.startTime + groupIndex * totalDuration;
    
    return {
      startTime,
      fadeInEnd: startTime + defaults.captionFadeInDuration,
      fadeOutStart: startTime + defaults.captionFadeInDuration + defaults.captionVisibleTime,
      endTime: startTime + totalDuration
    };
  }

  /**
   * Get total video duration
   */
  getTotalDuration(): number {
    return this.config.sections.conclusion.endTime;
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
      contentCounts: {
        captions: this.captionCount,
        animations: this.animationCount,
        conclusions: this.conclusionCount
      },
      totalDuration: this.getTotalDuration()
    };
  }
}
