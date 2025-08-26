// Gesture Compiler Functions - Purpose-based animation patterns
// These can be used across presentations, websites, ads, and illustrative content

import { ElementAnimation, GsapEase } from '../../types/canvas';

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
  return [
    {
      id: `preset-alpha-0-${context.elementId}`,
      displayName: 'Preset Alpha 0',
      type: 'fade',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { alpha: 0 }
    },
    {
      id: `fade-in-${context.elementId}`,
      displayName: 'Scene Fade In',
      type: 'fade',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'power2.out',
      properties: { alpha: 1 }
    }
  ];
}

export function SCENE_FADE_OUT_V1(context: GestureContext): ElementAnimation[] {
  return [{
    id: `fade-out-${context.elementId}`,
    displayName: 'Scene Fade Out',
    type: 'fade',
    startTime: context.startTime,
    duration: context.duration,
    easing: context.easing || 'power2.in',
    properties: { alpha: 0 }
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
  
  return [
    {
      id: `preset-pos-${context.elementId}`,
      displayName: 'Preset Position',
      type: 'move',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { x: xOffset, y: yOffset }
    },
    {
      id: `slide-in-${context.elementId}`,
      displayName: `Scene Slide In ${direction}`,
      type: 'move',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'back.out',
      properties: { x: 0, y: 0 }
    }
  ];
}

// Zoom in / zoom out
export function SCENE_ZOOM_IN_V1(context: GestureContext): ElementAnimation[] {
  const scale = context.intensity === 'dramatic' ? 0.3 : context.intensity === 'moderate' ? 0.5 : 0.7;
  
  return [
    {
      id: `preset-scale-${context.elementId}`,
      displayName: 'Preset Scale',
      type: 'scale',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { scaleX: scale, scaleY: scale }
    },
    {
      id: `zoom-in-${context.elementId}`,
      displayName: 'Scene Zoom In',
      type: 'scale',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'back.out',
      properties: { scaleX: 1, scaleY: 1 }
    }
  ];
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
  
  return [
    {
      id: `preset-pos-${context.elementId}`,
      displayName: 'Preset Position',
      type: 'move',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { x: xOffset, y: yOffset }
    },
    {
      id: `element-slide-${context.elementId}`,
      displayName: `Element Slide In ${direction}`,
      type: 'move',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'power2.out',
      properties: { x: 0, y: 0 }
    }
  ];
}

// Staggered slides for lists
export function ELEMENT_STAGGER_SLIDE_V1(context: GestureContext, staggerDelay: number = 0.1): ElementAnimation[] {
  return [
    {
      id: `preset-pos-${context.elementId}`,
      displayName: 'Preset Position',
      type: 'move',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { x: -100 }
    },
    {
      id: `stagger-slide-${context.elementId}`,
      displayName: 'Staggered Slide',
      type: 'move',
      startTime: context.startTime + staggerDelay,
      duration: context.duration,
      easing: context.easing || 'power2.out',
      properties: { x: 0 }
    }
  ];
}

// Bubble / pop in
export function ELEMENT_BUBBLE_IN_V1(context: GestureContext): ElementAnimation[] {
  return [
    {
      id: `preset-scale-${context.elementId}`,
      displayName: 'Preset Scale',
      type: 'scale',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { scaleX: 0, scaleY: 0 }
    },
    {
      id: `bubble-${context.elementId}`,
      displayName: 'Bubble Pop In',
      type: 'scale',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'back.out',
      yoyo: true,
      repeat: 1,
      properties: { scaleX: 1.1, scaleY: 1.1 }
    }
  ];
}

// Orbit in (curved spin-in)
export function ELEMENT_ORBIT_IN_V1(context: GestureContext): ElementAnimation[] {
  return [
    {
      id: `preset-orbit-${context.elementId}`,
      displayName: 'Preset Orbit',
      type: 'move',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { x: -100, y: -50, rotation: -180 }
    },
    {
      id: `orbit-${context.elementId}`,
      displayName: 'Orbit Spin In',
      type: 'move',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'power2.out',
      properties: { x: 0, y: 0, rotation: 0 }
    }
  ];
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
    yoyo: true,
    repeat: 1,
    properties: { scaleX: 1 + intensity, scaleY: 1 + intensity }
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
    yoyo: true,
    repeat: 1,
    properties: { scaleX: 1 + intensity, scaleY: 1 + intensity }
  }];
}

// Shake / wiggle
export function ELEMENT_SHAKE_V1(context: GestureContext): ElementAnimation[] {
  const intensity = context.intensity === 'dramatic' ? 15 : context.intensity === 'moderate' ? 10 : 5;
  
  return [
    {
      id: `preset-shake-${context.elementId}`,
      displayName: 'Preset Shake',
      type: 'move',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { x: -intensity }
    },
    {
      id: `shake-${context.elementId}`,
      displayName: 'Element Shake',
      type: 'move',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'power2.inOut',
      yoyo: true,
      repeat: 1,
      properties: { x: intensity }
    },
    {
      id: `shake-return-${context.elementId}`,
      displayName: 'Shake Return',
      type: 'move',
      startTime: context.startTime + context.duration,
      duration: 0.1,
      easing: 'none',
      properties: { x: 0 }
    }
  ];
}

// Flash highlight color
export function ELEMENT_FLASH_COLOR_V1(_context: GestureContext): ElementAnimation[] {
  return [];
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
      properties: { alpha: 0 }
    },
    {
      id: `preset-alpha-0-${context.elementId}`,
      displayName: 'Preset Alpha 0',
      type: 'fade',
      startTime: context.startTime + context.duration / 2 - 0.1,
      duration: 0.1,
      easing: 'none',
      properties: { alpha: 0 }
    },
    {
      id: `fade-in-${context.elementId}`,
      displayName: 'Point Fade In',
      type: 'fade',
      startTime: context.startTime + context.duration / 2,
      duration: context.duration / 2,
      easing: context.easing || 'power2.out',
      properties: { alpha: 1 }
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
      properties: { x: xOffset, y: yOffset }
    },
    {
      id: `preset-pos-${context.elementId}`,
      displayName: 'Preset Position',
      type: 'move',
      startTime: context.startTime + context.duration / 2 - 0.1,
      duration: 0.1,
      easing: 'none',
      properties: { x: xOffset, y: yOffset }
    },
    {
      id: `slide-in-${context.elementId}`,
      displayName: `Point Slide In ${direction}`,
      type: 'move',
      startTime: context.startTime + context.duration / 2,
      duration: context.duration / 2,
      easing: context.easing || 'power2.out',
      properties: { x: 0, y: 0 }
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
    properties: {}
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
    properties: {}
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
    properties: {}
  }];
}

// Bar grow (for charts)
export function DATA_BAR_GROW_V1(context: GestureContext): ElementAnimation[] {
  return [
    {
      id: `preset-scale-${context.elementId}`,
      displayName: 'Preset Scale',
      type: 'scale',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { scaleY: 0 }
    },
    {
      id: `bar-grow-${context.elementId}`,
      displayName: 'Bar Chart Growth',
      type: 'scale',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'power2.out',
      properties: { scaleY: 1 }
    }
  ];
}

// Counter tick (numbers animate up)
export function DATA_COUNTER_TICK_V1(_context: GestureContext, _finalValue: number): ElementAnimation[] {
  return [];
}

// ============================================================================
// BRAND / MARKETING POLISH
// ============================================================================

// Logo reveal (build from shapes/letters)
export function BRAND_LOGO_REVEAL_V1(context: GestureContext): ElementAnimation[] {
  return [
    {
      id: `preset-scale-${context.elementId}`,
      displayName: 'Preset Scale',
      type: 'scale',
      startTime: 0,
      duration: 0.1,
      easing: 'none',
      properties: { scaleX: 0, scaleY: 0 }
    },
    {
      id: `logo-reveal-${context.elementId}`,
      displayName: 'Logo Build',
      type: 'scale',
      startTime: context.startTime,
      duration: context.duration,
      easing: context.easing || 'power2.out',
      properties: { scaleX: 1, scaleY: 1 }
    }
  ];
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
      yoyo: true,
      repeat: 1,
      properties: { scaleX: 1.1, scaleY: 1.1 }
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
