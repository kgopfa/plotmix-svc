// Gesture Compiler Functions - Purpose-based animation patterns
// These can be used across presentations, websites, ads, and illustrative content

import { ElementAnimation, AnimatableProperties, GsapEase } from '../../types/canvas';

// Gesture context for animation generation
export interface GestureContext {
  elementId: string;
  startTime: number;
  duration: number;
  intensity?: 'subtle' | 'moderate' | 'dramatic';
  direction?: 'left' | 'right' | 'up' | 'down';
  easing?: GsapEase;
}

// ============================================================================
// SCENE-LEVEL ANIMATIONS
// ============================================================================

// Fade in / fade out
export function SCENE_FADE_IN_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `fade-in-${context.elementId}`,
    displayName: 'Scene Fade In',
    type: 'fade',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.out',
    properties: {
      opacity: { from: 0, to: 1 }
    } as AnimatableProperties
  }];
}

export function SCENE_FADE_OUT_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `fade-out-${context.elementId}`,
    displayName: 'Scene Fade Out',
    type: 'fade',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.in',
    properties: {
      opacity: { from: 1, to: 0 }
    } as AnimatableProperties
  }];
}

// Slide (left, right, up, down)
export function SCENE_SLIDE_IN_V1(context: GestureContext): ElementAnimation[] {
  const direction = context.direction || 'left';
  const offset = context.intensity === 'dramatic' ? 200 : context.intensity === 'moderate' ? 150 : 100;
  
  let xOffset = 0, yOffset = 0;
  switch (direction) {
    case 'left': xOffset = -offset; break;
    case 'right': xOffset = offset; break;
    case 'up': yOffset = -offset; break;
    case 'down': yOffset = offset; break;
  }
  
  return [{
    id: `slide-in-${context.elementId}`,
    displayName: `Scene Slide In ${direction}`,
    type: 'move',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'back.out',
    properties: {
      x: { from: xOffset, to: 0 },
      y: { from: yOffset, to: 0 }
    } as AnimatableProperties
  }];
}

// Zoom in / zoom out
export function SCENE_ZOOM_IN_V1(context: GestureContext): ElementAnimation[] {
  const scale = context.intensity === 'dramatic' ? 0.3 : context.intensity === 'moderate' ? 0.5 : 0.7;
  
  return [{
    id: `zoom-in-${context.elementId}`,
    displayName: 'Scene Zoom In',
    type: 'scale',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'back.out',
    properties: {
      scaleX: { from: scale, to: 1 },
      scaleY: { from: scale, to: 1 }
    } as AnimatableProperties
  }];
}

// ============================================================================
// ELEMENT REVEAL & POINT SWITCHING
// ============================================================================

// Slide in (any direction)
export function ELEMENT_SLIDE_IN_V1(context: GestureContext): ElementAnimation[] {
  const direction = context.direction || 'left';
  const offset = context.intensity === 'dramatic' ? 150 : context.intensity === 'moderate' ? 100 : 60;
  
  let xOffset = 0, yOffset = 0;
  switch (direction) {
    case 'left': xOffset = -offset; break;
    case 'right': xOffset = offset; break;
    case 'up': yOffset = -offset; break;
    case 'down': yOffset = offset; break;
  }
  
  return [{
    id: `element-slide-${context.elementId}`,
    displayName: `Element Slide In ${direction}`,
    type: 'move',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.out',
    properties: {
      x: { from: xOffset, to: 0 },
      y: { from: yOffset, to: 0 }
    } as AnimatableProperties
  }];
}

// Staggered slides for lists
export function ELEMENT_STAGGER_SLIDE_V1(context: GestureContext, staggerDelay: number = 0.1): ElementAnimation[] {
  return [{
    id: `stagger-slide-${context.elementId}`,
    displayName: 'Staggered Slide',
    type: 'move',
    startTime: context.startTime + staggerDelay,
    duration: context.duration,
    easing: context.easing || 'power2.out',
    properties: {
      x: { from: -100, to: 0 }
    } as AnimatableProperties
  }];
}

// Bubble / pop in
export function ELEMENT_BUBBLE_IN_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `bubble-${context.elementId}`,
    displayName: 'Bubble Pop In',
    type: 'scale',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'back.out',
    properties: {
      scaleX: { from: 0, to: 1.1, then: 1 },
      scaleY: { from: 0, to: 1.1, then: 1 }
    } as AnimatableProperties
  }];
}

// Orbit in (curved spin-in)
export function ELEMENT_ORBIT_IN_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `orbit-${context.elementId}`,
    displayName: 'Orbit Spin In',
    type: 'move',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.out',
    properties: {
      x: { from: -100, to: 0 },
      y: { from: -50, to: 0 },
      rotation: { from: -180, to: 0 }
    } as AnimatableProperties
  }];
}

// ============================================================================
// EMPHASIS & ATTENTION
// ============================================================================

// Pulse (scale up + down)
export function ELEMENT_PULSE_V1(context: GestureContext): ElementAnimation[] {
  const intensity = context.intensity === 'dramatic' ? 0.3 : context.intensity === 'moderate' ? 0.2 : 0.1;
  
  return [{
    id: `pulse-${context.elementId}`,
    displayName: 'Element Pulse',
    type: 'scale',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.inOut',
    properties: {
      scaleX: { from: 1, to: 1 + intensity, then: 1 },
      scaleY: { from: 1, to: 1 + intensity, then: 1 }
    } as AnimatableProperties
  }];
}

// Bounce (elastic up/down)
export function ELEMENT_BOUNCE_V1(context: GestureContext): ElementAnimation[] {
  const intensity = context.intensity === 'dramatic' ? 0.4 : context.intensity === 'moderate' ? 0.3 : 0.2;
  
  return [{
    id: `bounce-${context.elementId}`,
    displayName: 'Element Bounce',
    type: 'scale',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'bounce.out',
    properties: {
      scaleX: { from: 1, to: 1 + intensity, then: 1 },
      scaleY: { from: 1, to: 1 + intensity, then: 1 }
    } as AnimatableProperties
  }];
}

// Shake / wiggle
export function ELEMENT_SHAKE_V1(context: GestureContext): ElementAnimation[] {
  const intensity = context.intensity === 'dramatic' ? 15 : context.intensity === 'moderate' ? 10 : 5;
  
  return [{
    id: `shake-${context.elementId}`,
    displayName: 'Element Shake',
    type: 'move',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.inOut',
    properties: {
      x: { from: -intensity, to: intensity, then: 0 }
    } as AnimatableProperties
  }];
}

// Flash highlight color
export function ELEMENT_FLASH_COLOR_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `flash-${context.elementId}`,
    displayName: 'Color Flash',
    type: 'color',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.inOut',
    properties: {
      fillColor: { from: '#FFFFFF', to: '#FFD700', then: '#FFFFFF' }
    } as AnimatableProperties
  }];
}

// ============================================================================
// TRANSITIONS BETWEEN POINTS
// ============================================================================

// Crossfade (soft swap)
export function POINT_CROSSFADE_V1(context: GestureContext): ElementAnimation[] {
  return [
    {
      id: `fade-out-${context.elementId}`,
      displayName: 'Point Fade Out',
      type: 'fade',
      startTime: context.startTime,
      duration: context.duration / 2,
      easing: context.easing || 'power2.in',
      properties: {
        opacity: { from: 1, to: 0 }
      } as AnimatableProperties
    },
    {
      id: `fade-in-${context.elementId}`,
      displayName: 'Point Fade In',
      type: 'fade',
      startTime: context.startTime + context.duration / 2,
      duration: context.duration / 2,
      easing: context.easing || 'power2.out',
      properties: {
        opacity: { from: 0, to: 1 }
      } as AnimatableProperties
    }
  ];
}

// Slide swap (deck-like)
export function POINT_SLIDE_SWAP_V1(context: GestureContext): ElementAnimation[] {
  const direction = context.direction || 'left';
  const offset = 200;
  
  let xOffset = 0, yOffset = 0;
  switch (direction) {
    case 'left': xOffset = -offset; break;
    case 'right': xOffset = offset; break;
    case 'up': yOffset = -offset; break;
    case 'down': yOffset = offset; break;
  }
  
  return [
    {
      id: `slide-out-${context.elementId}`,
      displayName: `Point Slide Out ${direction}`,
      type: 'move',
      startTime: context.startTime,
      duration: context.duration / 2,
      easing: context.easing || 'power2.in',
      properties: {
        x: { from: 0, to: xOffset },
        y: { from: 0, to: yOffset }
      } as AnimatableProperties
    },
    {
      id: `slide-in-${context.elementId}`,
      displayName: `Point Slide In ${direction}`,
      type: 'move',
      startTime: context.startTime + context.duration / 2,
      duration: context.duration / 2,
      easing: context.easing || 'power2.out',
      properties: {
        x: { from: xOffset, to: 0 },
        y: { from: yOffset, to: 0 }
      } as AnimatableProperties
    }
  ];
}

// ============================================================================
// TEXT-SPECIFIC ANIMATIONS
// ============================================================================

// Typewriter (char by char)
export function TEXT_TYPEWRITER_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `typewriter-${context.elementId}`,
    displayName: 'Typewriter Text',
    type: 'typewriter',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'none',
    properties: {
      textReveal: { from: 0, to: 1 }
    } as AnimatableProperties
  }];
}

// Word stagger (one at a time)
export function TEXT_WORD_STAGGER_V1(context: GestureContext, wordCount: number): ElementAnimation[] {
  const staggerDelay = context.duration / wordCount;
  
  return Array.from({ length: wordCount }, (_, i) => ({
    id: `word-${i}-${context.elementId}`,
    displayName: `Word ${i + 1} Reveal`,
    type: 'typewriter',
    startTime: context.startTime + (i * staggerDelay),
    duration: staggerDelay,
    easing: context.easing || 'power2.out',
    properties: {
      wordReveal: { from: 0, to: 1, wordIndex: i }
    } as AnimatableProperties
  }));
}

// ============================================================================
// DATA / DIAGRAMMATIC ANIMATIONS
// ============================================================================

// Line draw (with arrow, dashed, curved)
export function DATA_LINE_DRAW_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `line-draw-${context.elementId}`,
    displayName: 'Line Draw',
    type: 'path',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.out',
    properties: {
      pathProgress: { from: 0, to: 1 }
    } as AnimatableProperties
  }];
}

// Bar grow (for charts)
export function DATA_BAR_GROW_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `bar-grow-${context.elementId}`,
    displayName: 'Bar Chart Growth',
    type: 'scale',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.out',
    properties: {
      scaleY: { from: 0, to: 1 }
    } as AnimatableProperties
  }];
}

// Counter tick (numbers animate up)
export function DATA_COUNTER_TICK_V1(context: GestureContext, finalValue: number): ElementAnimation[] {
  return [{
    id: `counter-${context.elementId}`,
    displayName: 'Counter Animation',
    type: 'scale',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.out',
    properties: {
      value: { from: 0, to: finalValue }
    } as AnimatableProperties
  }];
}

// ============================================================================
// BRAND / MARKETING POLISH
// ============================================================================

// Logo reveal (build from shapes/letters)
export function BRAND_LOGO_REVEAL_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `logo-reveal-${context.elementId}`,
    displayName: 'Logo Build',
    type: 'scale',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.out',
    properties: {
      buildProgress: { from: 0, to: 1 }
    } as AnimatableProperties
  }];
}

// CTA emphasis (button pulse, shake, shine sweep)
export function BRAND_CTA_EMPHASIS_V1(context: GestureContext): ElementAnimation[] {
  return [
    {
      id: `cta-pulse-${context.elementId}`,
      displayName: 'CTA Pulse',
      type: 'scale',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'power2.inOut',
      properties: {
        scaleX: { from: 1, to: 1.1, then: 1 },
        scaleY: { from: 1, to: 1.1, then: 1 }
      } as AnimatableProperties
    },
    {
      id: `cta-shine-${context.elementId}`,
      displayName: 'CTA Shine Sweep',
      type: 'fade',
      startTime: context.startTime + context.duration / 2,
      duration: context.duration / 2,
      easing: context.easing || 'power2.out',
      properties: {
        shineProgress: { from: 0, to: 1 }
      } as AnimatableProperties
    }
  ];
}

// ============================================================================
// LEGACY SUPPORT (keeping for backward compatibility)
// ============================================================================

// Keep the old emphasis functions for backward compatibility
export const EMPHASIS_PULSE_V1 = ELEMENT_PULSE_V1;
export const EMPHASIS_BOUNCE_V1 = ELEMENT_BOUNCE_V1;
export const EMPHASIS_GLOW_V1 = ELEMENT_FLASH_COLOR_V1;
export const EMPHASIS_SCALE_V1 = ELEMENT_PULSE_V1;
export const EMPHASIS_COLOR_FLASH_V1 = ELEMENT_FLASH_COLOR_V1;

// Keep old intro functions for backward compatibility
export const INTRO_SLIDE_LEFT_V1 = ELEMENT_SLIDE_IN_V1;
export const INTRO_FADE_IN_V1 = ELEMENT_SLIDE_IN_V1;
export const INTRO_BUBBLE_IN_V1 = ELEMENT_BUBBLE_IN_V1;
export const INTRO_ORBIT_IN_V1 = ELEMENT_ORBIT_IN_V1;
