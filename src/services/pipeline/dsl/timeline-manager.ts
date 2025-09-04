import type { VideoTimelineConfig } from '../../../types';

/**
 * ADAPTIVE TIMING SYSTEM
 * 
 * To modify timing, simply change the values in TIMING_CONFIG below:
 * 
 * Examples:
 * - Change all fade-in durations: modify fadeInDuration
 * - Change explanation visible time: modify explanationVisibleTime  
 * - Change caption visible time: modify captionVisibleTime
 * - Change animation duration: modify animationDuration
 * 
 * All timing will automatically recalculate based on your changes!
 */

// Timing configuration variables - easily adjustable
const TIMING_CONFIG = {
  // Fade durations
  fadeInDuration: 1.0,        // All fade-in durations
  fadeOutDuration: 1.0,        // All fade-out durations (except captions/conclusions)
  
  // Caption/Conclusion specific
  captionFadeInDuration: 0.5,  // Caption fade-in duration
  captionFadeOutDuration: 0.5, // Caption fade-out duration
  captionVisibleTime: 3.0,     // Time captions are fully visible
  
  // Animation
  animationDuration: 1.5,      // Array animation duration
  animationOffset: 0.5,        // Animation starts 0.5s after caption starts
  
  // Spacing
  arrayStartDelay: 0.5,        // Delay after example is fully removed before array starts
  
  // Initial timing
  headingStartTime: 0.5,       // When heading starts
  
  // Visible durations
  explanationVisibleTime: 3.0, // How long explanation is fully visible
  exampleVisibleTime: 3.0,      // How long example is fully visible
};

// Calculate all timing values based on configuration
function calculateTimingValues() {
  // Heading timing
  const headingEndTime = TIMING_CONFIG.headingStartTime + TIMING_CONFIG.fadeInDuration;
  
  // Subtitle timing
  const subtitleStartTime = headingEndTime;
  const subtitleEndTime = subtitleStartTime + TIMING_CONFIG.fadeInDuration;
  
  // Explanation timing
  const explanationStartTime = subtitleEndTime;
  const explanationEndTime = explanationStartTime + TIMING_CONFIG.explanationVisibleTime;
  const explanationRemovedTime = explanationEndTime + TIMING_CONFIG.fadeOutDuration;
  
  // Example timing
  const exampleStartTime = explanationRemovedTime;
  const exampleEndTime = exampleStartTime + TIMING_CONFIG.exampleVisibleTime;
  const exampleRemovedTime = exampleEndTime + TIMING_CONFIG.fadeOutDuration;
  
  // Array timing
  const arrayStartTime = exampleRemovedTime + TIMING_CONFIG.arrayStartDelay;
  const arrayFullyVisibleTime = arrayStartTime + TIMING_CONFIG.fadeInDuration;
  
  // Caption timing
  const firstCaptionStartTime = arrayFullyVisibleTime;
  const totalCaptionDuration = TIMING_CONFIG.captionFadeInDuration + TIMING_CONFIG.captionVisibleTime + TIMING_CONFIG.captionFadeOutDuration;
  
  return {
    headingEndTime,
    subtitleStartTime,
    subtitleEndTime,
    explanationStartTime,
    explanationEndTime,
    explanationRemovedTime,
    exampleStartTime,
    exampleEndTime,
    exampleRemovedTime,
    arrayStartTime,
    arrayFullyVisibleTime,
    firstCaptionStartTime,
    totalCaptionDuration
  };
}

// Central configuration for video timing and section organization
export const DEFAULT_TIMELINE_CONFIG: VideoTimelineConfig = {
  
  // Element section assignments - matching executor flow
  elementSections: {
    intro: ['heading', 'subtitle', 'explanation', 'example'],
    main: ['array', 'caption', 'animate'],
    conclusion: ['conclusion']
  },
  
  // Element-specific timing - calculated from variables
  get elementTiming() {
    const timing = calculateTimingValues();
    
    return {
      heading: { 
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        startTime: TIMING_CONFIG.headingStartTime,
        endTime: 0
      },
      subtitle: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        startTime: timing.subtitleStartTime,
        endTime: 0
      },
      explanation: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.explanationVisibleTime,
        startTime: timing.explanationStartTime,
        endTime: timing.explanationEndTime,
        fadeOutStartTime: timing.explanationStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.explanationVisibleTime
      },
      example: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.exampleVisibleTime,
        startTime: timing.exampleStartTime,
        endTime: timing.exampleEndTime,
        fadeOutStartTime: timing.exampleStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.exampleVisibleTime
      },
      array: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        startTime: timing.arrayStartTime,
        endTime: 0 // Will be calculated dynamically based on content
      },
      caption: {
        fadeInDuration: TIMING_CONFIG.captionFadeInDuration,
        fadeOutDuration: TIMING_CONFIG.captionFadeOutDuration,
        visibleTime: TIMING_CONFIG.captionVisibleTime,
        startTime: timing.firstCaptionStartTime,
        endTime: 0 // Will be calculated dynamically based on number of captions
      },
      conclusion: {
        fadeInDuration: TIMING_CONFIG.captionFadeInDuration,
        fadeOutDuration: TIMING_CONFIG.captionFadeOutDuration,
        visibleTime: TIMING_CONFIG.captionVisibleTime,
        startTime: 0, // Will be calculated dynamically
        endTime: 0 // Will be calculated dynamically
      }
    };
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
    const timing = calculateTimingValues();
    
    // Calculate main section duration based on captions/animations
    const mainEndTime = timing.arrayFullyVisibleTime + (Math.max(this.captionCount, this.animationCount) * timing.totalCaptionDuration);
    
    // Calculate conclusion section timing
    const conclusionStartTime = mainEndTime;
    const conclusionEndTime = conclusionStartTime + (this.conclusionCount * timing.totalCaptionDuration);
    
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
    return {
      captionVisibleTime: 3.0,
      captionFadeInDuration: 0.5,
      captionFadeOutDuration: 0.5,
      elementFadeInDuration: 1.0,
      elementFadeOutDuration: 1.0,
      elementStaggerDelay: 0.1,
      animationDuration: 1.5
    };
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
    const timing = calculateTimingValues();
    
    // Calculate section timing based on sequential flow
    const sections = {
      intro: { startTime: 0, endTime: timing.exampleRemovedTime }, // Example fully removed
      main: { startTime: timing.arrayStartTime, endTime: 0 }, // Array starts, will be calculated dynamically
      conclusion: { startTime: 0, endTime: 0 } // Will be calculated dynamically
    };
    
    // Update main and conclusion timing if we have content counts
    if (this.captionCount > 0 || this.animationCount > 0) {
      const mainEndTime = timing.arrayFullyVisibleTime + (Math.max(this.captionCount, this.animationCount) * timing.totalCaptionDuration);
      sections.main.endTime = mainEndTime;
      
      if (this.conclusionCount > 0) {
        const conclusionEndTime = mainEndTime + (this.conclusionCount * timing.totalCaptionDuration);
        sections.conclusion.startTime = mainEndTime;
        sections.conclusion.endTime = conclusionEndTime;
      }
    }
    
    return sections[sectionName as keyof typeof sections] ?? null;
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
    const timing = calculateTimingValues();
    
    const startTime = timing.firstCaptionStartTime + (captionOrder - 1) * timing.totalCaptionDuration;
    
    return {
      startTime,
      fadeInEnd: startTime + TIMING_CONFIG.captionFadeInDuration,
      fadeOutStart: startTime + TIMING_CONFIG.captionFadeInDuration + TIMING_CONFIG.captionVisibleTime,
      endTime: startTime + timing.totalCaptionDuration
    };
  }

  /**
   * Calculate animation timing for a specific animation order
   */
  calculateAnimationTiming(animationOrder: number): { startTime: number; endTime: number } {
    const timing = calculateTimingValues();
    
    const startTime = timing.firstCaptionStartTime + (animationOrder - 1) * timing.totalCaptionDuration + TIMING_CONFIG.animationOffset;
    
    return {
      startTime,
      endTime: startTime + TIMING_CONFIG.animationDuration
    };
  }

  /**
   * Calculate conclusion timing for a specific conclusion order
   */
  calculateConclusionTiming(conclusionOrder: number): { startTime: number; fadeInEnd: number; fadeOutStart: number; endTime: number } {
    const timing = calculateTimingValues();
    
    // Calculate conclusion start time based on main section end
    const mainSectionEnd = this.getSectionTiming('main')?.endTime ?? 0;
    const startTime = mainSectionEnd + (conclusionOrder - 1) * timing.totalCaptionDuration;
    
    return {
      startTime,
      fadeInEnd: startTime + TIMING_CONFIG.captionFadeInDuration,
      fadeOutStart: startTime + TIMING_CONFIG.captionFadeInDuration + TIMING_CONFIG.captionVisibleTime,
      endTime: startTime + timing.totalCaptionDuration
    };
  }

  /**
   * Get total video duration
   */
  getTotalDuration(): number {
    const conclusionSection = this.getSectionTiming('conclusion');
    return conclusionSection?.endTime ?? 0;
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
