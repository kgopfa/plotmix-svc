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
  explanationVisibleTime: 2.0, // How long explanation is fully visible
  exampleVisibleTime: 2.0,      // How long example is fully visible
  approachVisibleTime: 1.0,      // How long each approach step is fully visible
  edgecaseVisibleTime: 1.0,     // How long each edgecase is fully visible
  alternativeVisibleTime: 1.0,  // How long each alternative is fully visible
  keyideaVisibleTime: 2.0,       // How long each keyidea is fully visible
  pseudocodeVisibleTime: 3.0,    // How long pseudocode is fully visible
};

// Calculate all timing values based on configuration
function calculateTimingValues(explanationCount: number = 1) {
  // Heading timing
  const headingEndTime = TIMING_CONFIG.headingStartTime + TIMING_CONFIG.fadeInDuration;
  
  // Subtitle timing
  const subtitleStartTime = headingEndTime;
  const subtitleEndTime = subtitleStartTime + TIMING_CONFIG.fadeInDuration;
  
  // Explanation timing - starts after subtitle
  // Each explanation takes: fadeIn + visibleTime + fadeOut
  const explanationStepDuration = TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.explanationVisibleTime + TIMING_CONFIG.fadeOutDuration;
  const totalExplanationDuration = explanationCount * explanationStepDuration;
  const explanationStartTime = subtitleEndTime;
  const explanationEndTime = explanationStartTime + totalExplanationDuration;
  const explanationRemovedTime = explanationEndTime;
  
  // Approach timing - starts after explanation is removed
  // Each approach step takes: fadeIn + visibleTime + fadeOut
  const approachStartTime = explanationRemovedTime;
  
  // Pseudocode timing - starts after approach is removed (will be calculated dynamically)
  const pseudocodeStartTime = 0; // Will be calculated dynamically
  const pseudocodeEndTime = 0; // Will be calculated dynamically
  const pseudocodeRemovedTime = 0; // Will be calculated dynamically
  // Note: approachEndTime will be calculated dynamically based on number of approach steps
  
  // Example timing - starts after all approach steps are complete
  // This will be calculated dynamically based on approach count
  const exampleStartTime = 0; // Will be calculated dynamically
  const exampleEndTime = 0; // Will be calculated dynamically
  const exampleRemovedTime = 0; // Will be calculated dynamically
  
  // Array timing - starts after example is fully removed
  const arrayStartTime = 0; // Will be calculated dynamically
  const arrayFullyVisibleTime = 0; // Will be calculated dynamically
  
  // Caption timing
  const firstCaptionStartTime = 0; // Will be calculated dynamically
  const totalCaptionDuration = TIMING_CONFIG.captionFadeInDuration + TIMING_CONFIG.captionVisibleTime + TIMING_CONFIG.captionFadeOutDuration;
  
  return {
    headingEndTime,
    subtitleStartTime,
    subtitleEndTime,
    explanationStartTime,
    explanationEndTime,
    explanationRemovedTime,
    pseudocodeStartTime,
    pseudocodeEndTime,
    pseudocodeRemovedTime,
    approachStartTime,
    approachEndTime: 0, // Will be calculated dynamically
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
    const timing = calculateTimingValues(1); // Default to 1 explanation for static config
    
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
      pseudocode: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.pseudocodeVisibleTime,
        startTime: timing.pseudocodeStartTime,
        endTime: timing.pseudocodeEndTime,
        fadeOutStartTime: timing.pseudocodeStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.pseudocodeVisibleTime
      },
      approach: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.approachVisibleTime,
        startTime: timing.approachStartTime,
        endTime: timing.approachEndTime,
        fadeOutStartTime: timing.approachStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.approachVisibleTime
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
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.captionVisibleTime,
        startTime: 0, // Will be calculated dynamically
        endTime: 0 // Will be calculated dynamically
      },
      edgecase: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.edgecaseVisibleTime,
        startTime: 0, // Will be calculated dynamically
        endTime: 0, // Will be calculated dynamically
        fadeOutStartTime: 0 // Will be calculated dynamically
      },
      alternative: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.alternativeVisibleTime,
        startTime: 0, // Will be calculated dynamically
        endTime: 0, // Will be calculated dynamically
        fadeOutStartTime: 0 // Will be calculated dynamically
      },
      keyidea: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.keyideaVisibleTime,
        startTime: 0, // Will be calculated dynamically
        endTime: 0, // Will be calculated dynamically
        fadeOutStartTime: 0 // Will be calculated dynamically
      }
    };
  }
};

export class TimelineManager {
  private config: VideoTimelineConfig;
  private captionCount: number = 0;
  private animationCount: number = 0;
  private conclusionCount: number = 0;
  private approachCount: number = 0;
  private explanationCount: number = 0;
  private edgecaseCount: number = 0;
  private alternativeCount: number = 0;
  private keyideaCount: number = 0;

  constructor(config: VideoTimelineConfig = DEFAULT_TIMELINE_CONFIG) {
    this.config = config;
  }

  /**
   * Override elementTiming to use dynamically calculated values
   */
  get elementTiming() {
    const timing = calculateTimingValues(this.explanationCount);
    
    // Calculate dynamic timing based on content counts
    const approachStepDuration = TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.approachVisibleTime + TIMING_CONFIG.fadeOutDuration;
    const totalApproachDuration = this.approachCount * approachStepDuration;
    const approachEndTime = timing.approachStartTime + totalApproachDuration;
    
    // Calculate pseudocode timing - starts after approach is complete
    const pseudocodeStartTime = approachEndTime;
    const pseudocodeEndTime = pseudocodeStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.pseudocodeVisibleTime;
    
    const exampleStartTime = pseudocodeEndTime + TIMING_CONFIG.fadeOutDuration;
    const exampleEndTime = exampleStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.exampleVisibleTime;
    const exampleRemovedTime = exampleEndTime + TIMING_CONFIG.fadeOutDuration;
    
    const arrayStartTime = exampleRemovedTime + TIMING_CONFIG.arrayStartDelay;
    const arrayFullyVisibleTime = arrayStartTime + TIMING_CONFIG.fadeInDuration;
    
    const mainEndTime = arrayFullyVisibleTime + (Math.max(this.captionCount, this.animationCount) * timing.totalCaptionDuration);
    
    // Calculate edgecase timing - starts after main section ends, before conclusions
    const edgecaseStartTime = mainEndTime;
    const edgecaseEndTime = edgecaseStartTime + (this.edgecaseCount * timing.totalCaptionDuration);
    
    // Calculate conclusion timing - starts after edgecases
    const conclusionStartTime = edgecaseEndTime;
    const conclusionEndTime = conclusionStartTime + (this.conclusionCount * timing.totalCaptionDuration);
    
    // Calculate alternative timing - starts after conclusions
    const alternativeStartTime = conclusionEndTime;
    const alternativeEndTime = alternativeStartTime + (this.alternativeCount * timing.totalCaptionDuration);
    
    return {
      heading: { 
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        startTime: TIMING_CONFIG.headingStartTime,
        endTime: timing.headingEndTime
      },
      subtitle: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        startTime: timing.subtitleStartTime,
        endTime: timing.subtitleEndTime
      },
      explanation: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.explanationVisibleTime,
        startTime: timing.explanationStartTime,
        endTime: timing.explanationEndTime,
        fadeOutStartTime: timing.explanationStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.explanationVisibleTime
      },
      approach: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.approachVisibleTime,
        startTime: timing.approachStartTime,
        endTime: approachEndTime,
        fadeOutStartTime: timing.approachStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.approachVisibleTime
      },
      pseudocode: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.pseudocodeVisibleTime,
        startTime: pseudocodeStartTime,
        endTime: pseudocodeEndTime,
        fadeOutStartTime: pseudocodeStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.pseudocodeVisibleTime
      },
      example: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.exampleVisibleTime,
        startTime: exampleStartTime,
        endTime: exampleEndTime,
        fadeOutStartTime: exampleStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.exampleVisibleTime
      },
      array: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        startTime: arrayStartTime,
        endTime: mainEndTime
      },
      caption: {
        fadeInDuration: TIMING_CONFIG.captionFadeInDuration,
        fadeOutDuration: TIMING_CONFIG.captionFadeOutDuration,
        visibleTime: TIMING_CONFIG.captionVisibleTime,
        startTime: arrayFullyVisibleTime,
        endTime: mainEndTime
      },
      edgecase: {
        fadeInDuration: TIMING_CONFIG.captionFadeInDuration,
        fadeOutDuration: TIMING_CONFIG.captionFadeOutDuration,
        visibleTime: TIMING_CONFIG.captionVisibleTime,
        startTime: edgecaseStartTime,
        endTime: edgecaseEndTime,
        fadeOutStartTime: edgecaseStartTime + TIMING_CONFIG.captionFadeInDuration + TIMING_CONFIG.captionVisibleTime
      },
      conclusion: {
        fadeInDuration: TIMING_CONFIG.fadeInDuration,
        fadeOutDuration: TIMING_CONFIG.fadeOutDuration,
        visibleTime: TIMING_CONFIG.captionVisibleTime,
        startTime: conclusionStartTime,
        endTime: conclusionEndTime,
        fadeOutStartTime: conclusionStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.captionVisibleTime
      },
      alternative: {
        fadeInDuration: TIMING_CONFIG.captionFadeInDuration,
        fadeOutDuration: TIMING_CONFIG.captionFadeOutDuration,
        visibleTime: TIMING_CONFIG.captionVisibleTime,
        startTime: alternativeStartTime,
        endTime: alternativeEndTime,
        fadeOutStartTime: alternativeStartTime + TIMING_CONFIG.captionFadeInDuration + TIMING_CONFIG.captionVisibleTime
      }
    };
  }

  /**
   * Set content counts for dynamic timing calculation
   */
  setContentCounts(
    captionCount: number, 
    animationCount: number, 
    conclusionCount: number = 0, 
    approachCount: number = 0,
    explanationCount: number = 0,
    edgecaseCount: number = 0,
    alternativeCount: number = 0,
    keyideaCount: number = 0,
    _pseudocodeCount: number = 0
  ): void {
    this.captionCount = captionCount;
    this.animationCount = animationCount;
    this.conclusionCount = conclusionCount;
    this.approachCount = approachCount;
    this.explanationCount = explanationCount;
    this.edgecaseCount = edgecaseCount;
    this.alternativeCount = alternativeCount;
    this.keyideaCount = keyideaCount;
    this.calculateDynamicTiming();
  }

  /**
   * Calculate dynamic timing for all sections based on content counts
   */
  private calculateDynamicTiming(): void {
    const timing = calculateTimingValues(this.explanationCount);
    
    // Calculate approach section duration based on number of approach steps
    const approachStepDuration = TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.approachVisibleTime + TIMING_CONFIG.fadeOutDuration;
    const totalApproachDuration = this.approachCount * approachStepDuration;
    const approachEndTime = timing.approachStartTime + totalApproachDuration;
    
    // Calculate example timing - starts after all approach steps are complete
    const exampleStartTime = approachEndTime;
    const exampleEndTime = exampleStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.exampleVisibleTime;
    const exampleRemovedTime = exampleEndTime + TIMING_CONFIG.fadeOutDuration;
    
    // Calculate array timing - starts after example is fully removed
    const arrayStartTime = exampleRemovedTime + TIMING_CONFIG.arrayStartDelay;
    const arrayFullyVisibleTime = arrayStartTime + TIMING_CONFIG.fadeInDuration;
    
    // Calculate main section duration based on captions/animations
    const mainEndTime = arrayFullyVisibleTime + (Math.max(this.captionCount, this.animationCount) * timing.totalCaptionDuration);
    
    // Calculate final section timing: keyidea -> edgecase -> alternative -> conclusion
    const finalSectionStartTime = mainEndTime;
    
    // Keyidea timing
    const keyideaStartTime = finalSectionStartTime;
    const keyideaEndTime = keyideaStartTime + (this.keyideaCount * (TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.keyideaVisibleTime + TIMING_CONFIG.fadeOutDuration));
    
    // Edgecase timing
    const edgecaseStartTime = keyideaEndTime;
    const edgecaseEndTime = edgecaseStartTime + (this.edgecaseCount * (TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.edgecaseVisibleTime + TIMING_CONFIG.fadeOutDuration));
    
    // Alternative timing
    const alternativeStartTime = edgecaseEndTime;
    const alternativeEndTime = alternativeStartTime + (this.alternativeCount * (TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.alternativeVisibleTime + TIMING_CONFIG.fadeOutDuration));
    
    // Conclusion timing
    const conclusionStartTime = alternativeEndTime;
    const conclusionEndTime = conclusionStartTime + (this.conclusionCount * timing.totalCaptionDuration);
    
    // Update element timing with calculated values
    if (this.config.elementTiming) {
      // Approach elements
      if (this.config.elementTiming['approach']) {
        this.config.elementTiming['approach'].endTime = approachEndTime;
      }
      
      // Example elements
      if (this.config.elementTiming['example']) {
        this.config.elementTiming['example'].startTime = exampleStartTime;
        this.config.elementTiming['example'].endTime = exampleEndTime;
        this.config.elementTiming['example'].fadeOutStartTime = exampleStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.exampleVisibleTime;
      }
      
      // Main elements - array and captions
      if (this.config.elementTiming['array']) {
        this.config.elementTiming['array'].startTime = arrayStartTime;
        this.config.elementTiming['array'].endTime = mainEndTime;
      }
      if (this.config.elementTiming['caption']) {
        this.config.elementTiming['caption'].startTime = arrayFullyVisibleTime;
        this.config.elementTiming['caption'].endTime = mainEndTime;
      }
      
      // Final section elements
      if (this.config.elementTiming['keyidea']) {
        this.config.elementTiming['keyidea'].startTime = keyideaStartTime;
        this.config.elementTiming['keyidea'].endTime = keyideaEndTime;
        this.config.elementTiming['keyidea'].fadeOutStartTime = keyideaStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.keyideaVisibleTime;
      }
      
      if (this.config.elementTiming['edgecase']) {
        this.config.elementTiming['edgecase'].startTime = edgecaseStartTime;
        this.config.elementTiming['edgecase'].endTime = edgecaseEndTime;
        this.config.elementTiming['edgecase'].fadeOutStartTime = edgecaseStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.edgecaseVisibleTime;
      }
      
      if (this.config.elementTiming['alternative']) {
        this.config.elementTiming['alternative'].startTime = alternativeStartTime;
        this.config.elementTiming['alternative'].endTime = alternativeEndTime;
        this.config.elementTiming['alternative'].fadeOutStartTime = alternativeStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.alternativeVisibleTime;
      }
      
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
    const timing = calculateTimingValues(this.explanationCount);
    
    // Calculate approach section duration based on number of approach steps
    const approachStepDuration = TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.approachVisibleTime + TIMING_CONFIG.fadeOutDuration;
    const totalApproachDuration = this.approachCount * approachStepDuration;
    const approachEndTime = timing.approachStartTime + totalApproachDuration;
    
    // Calculate example timing - starts after all approach steps are complete
    const exampleStartTime = approachEndTime;
    const exampleEndTime = exampleStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.exampleVisibleTime;
    const exampleRemovedTime = exampleEndTime + TIMING_CONFIG.fadeOutDuration;
    
    // Calculate array timing - starts after example is fully removed
    const arrayStartTime = exampleRemovedTime + TIMING_CONFIG.arrayStartDelay;
    const arrayFullyVisibleTime = arrayStartTime + TIMING_CONFIG.fadeInDuration;
    
    // Calculate main section duration based on captions/animations
    const mainEndTime = arrayFullyVisibleTime + (Math.max(this.captionCount, this.animationCount) * timing.totalCaptionDuration);
    
    // Calculate edgecase section timing
    const edgecaseStartTime = mainEndTime;
    const edgecaseEndTime = edgecaseStartTime + (this.edgecaseCount * timing.totalCaptionDuration);
    
    // Calculate conclusion section timing
    const conclusionStartTime = edgecaseEndTime;
    const conclusionEndTime = conclusionStartTime + (this.conclusionCount * timing.totalCaptionDuration);
    
    // Calculate alternative section timing
    const alternativeStartTime = conclusionEndTime;
    const alternativeEndTime = alternativeStartTime + (this.alternativeCount * timing.totalCaptionDuration);
    
    // Calculate section timing based on sequential flow
    const sections = {
      intro: { startTime: 0, endTime: exampleRemovedTime }, // Example fully removed
      main: { startTime: arrayStartTime, endTime: mainEndTime }, // Array starts to main end
      edgecase: { startTime: edgecaseStartTime, endTime: edgecaseEndTime }, // Edgecase section
      conclusion: { startTime: conclusionStartTime, endTime: conclusionEndTime }, // Conclusion section
      alternative: { startTime: alternativeStartTime, endTime: alternativeEndTime } // Alternative section
    };
    
    return sections[sectionName as keyof typeof sections] ?? null;
  }

  /**
   * Get element timing from config
   */
  getElementTiming(elementType: string) {
    return (this.elementTiming as any)?.[elementType];
  }

  /**
   * Calculate caption timing for a specific caption order
   */
  calculateCaptionTiming(captionOrder: number): { startTime: number; fadeInEnd: number; fadeOutStart: number; endTime: number } {
    const timing = calculateTimingValues(this.explanationCount);
    
    // Calculate array timing - starts after example is fully removed
    const approachStepDuration = TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.approachVisibleTime + TIMING_CONFIG.fadeOutDuration;
    const totalApproachDuration = this.approachCount * approachStepDuration;
    const approachEndTime = timing.approachStartTime + totalApproachDuration;
    
    const exampleStartTime = approachEndTime;
    const exampleEndTime = exampleStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.exampleVisibleTime;
    const exampleRemovedTime = exampleEndTime + TIMING_CONFIG.fadeOutDuration;
    
    const arrayStartTime = exampleRemovedTime + TIMING_CONFIG.arrayStartDelay;
    const arrayFullyVisibleTime = arrayStartTime + TIMING_CONFIG.fadeInDuration;
    
    const firstCaptionStartTime = arrayFullyVisibleTime;
    const startTime = firstCaptionStartTime + (captionOrder - 1) * timing.totalCaptionDuration;
    
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
    const timing = calculateTimingValues(this.explanationCount);
    
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
    const timing = calculateTimingValues(this.explanationCount);
    
    // Use the edgecase end time to ensure conclusions start after edgecases finish
    const edgecaseTiming = this.getElementTiming('edgecase');
    const edgecaseEndTime = edgecaseTiming ? edgecaseTiming.endTime : this.getElementTiming('array').endTime;
    
    // Calculate conclusion start time based on edgecase section end
    // Group conclusions in pairs (1,2), (3,4), (5,6), etc.
    const groupIndex = Math.floor((conclusionOrder - 1) / 2);
    const startTime = edgecaseEndTime + groupIndex * timing.totalCaptionDuration;
    
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
    const timing = calculateTimingValues(this.explanationCount);
    
    // Calculate approach section duration based on number of approach steps
    const approachStepDuration = TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.approachVisibleTime + TIMING_CONFIG.fadeOutDuration;
    const totalApproachDuration = this.approachCount * approachStepDuration;
    const approachEndTime = timing.approachStartTime + totalApproachDuration;
    
    // Calculate example timing - starts after all approach steps are complete
    const exampleStartTime = approachEndTime;
    const exampleEndTime = exampleStartTime + TIMING_CONFIG.fadeInDuration + TIMING_CONFIG.exampleVisibleTime;
    const exampleRemovedTime = exampleEndTime + TIMING_CONFIG.fadeOutDuration;
    
    // Calculate array timing - starts after example is fully removed
    const arrayStartTime = exampleRemovedTime + TIMING_CONFIG.arrayStartDelay;
    const arrayFullyVisibleTime = arrayStartTime + TIMING_CONFIG.fadeInDuration;
    
    // Calculate main section duration based on captions/animations
    const mainEndTime = arrayFullyVisibleTime + (Math.max(this.captionCount, this.animationCount) * timing.totalCaptionDuration);
    
    // Calculate conclusion section timing
    const conclusionEndTime = mainEndTime + (this.conclusionCount * timing.totalCaptionDuration);
    
    return conclusionEndTime;
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
