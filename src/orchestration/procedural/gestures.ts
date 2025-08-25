// Intro Gesture Catalog - JSON records for procedural animation generation
// Each gesture resolves to a procedural function at compile time via compiler_key

import { TOKENS } from './tokens';
import { ThemePack } from './tokens';
import { ElementAnimation, GsapEase } from '../../types/canvas';

// Gesture catalog record structure
export interface IntroGesture {
  id: string;
  one_liner: string;
  category: 'intro' | 'transition' | 'emphasis';
  tags: string[];
  compiler_key: string;
  defaults: Record<string, any>;
  constraints: { 
    cooldown: number; 
    maxElements?: number;
    onlyText?: boolean;
  };
  weight: number;
  version: number;
  status: 'live' | 'draft' | 'deprecated';
}

// Intro gesture catalog - these can be stored in DB/JSON
export const INTRO_GESTURES: IntroGesture[] = [
  {
    id: "intro.slide_left",
    one_liner: "Slide elements in from the left with fade.",
    category: "intro",
    tags: ["positional", "calm", "neutral"],
    compiler_key: "INTRO_SLIDE_LEFT_V1",
    defaults: { distance_ratio: 0.6, with_fade: true },
    constraints: { cooldown: 1, maxElements: 64 },
    weight: 1.0,
    version: 1,
    status: "live"
  },
  {
    id: "intro.slide_top",
    one_liner: "Slide in from the top.",
    category: "intro",
    tags: ["positional", "neutral"],
    compiler_key: "INTRO_SLIDE_TOP_V1",
    defaults: { distance_ratio: 0.5, with_fade: true },
    constraints: { cooldown: 1 },
    weight: 0.9,
    version: 1,
    status: "live"
  },
  {
    id: "intro.slide_bottom",
    one_liner: "Slide in from the bottom.",
    category: "intro",
    tags: ["positional", "energetic"],
    compiler_key: "INTRO_SLIDE_BOTTOM_V1",
    defaults: { distance_ratio: 0.5, with_fade: true },
    constraints: { cooldown: 1 },
    weight: 0.9,
    version: 1,
    status: "live"
  },
  {
    id: "intro.fade_in",
    one_liner: "Simple fade in.",
    category: "intro",
    tags: ["opacity", "calm", "accessible"],
    compiler_key: "INTRO_FADE_IN_V1",
    defaults: { duration_scale: 1.0 },
    constraints: { cooldown: 0 },
    weight: 1.2,
    version: 1,
    status: "live"
  },
  {
    id: "intro.bubble_in",
    one_liner: "Elastic scale-up pop with fade.",
    category: "intro",
    tags: ["scale", "energetic", "playful"],
    compiler_key: "INTRO_BUBBLE_IN_V1",
    defaults: { from_scale: 0.6, overshoot: true },
    constraints: { cooldown: 2, maxElements: 16 },
    weight: 1.1,
    version: 1,
    status: "live"
  },
  {
    id: "intro.orbit_in",
    one_liner: "Curved path fly-in with slight spin.",
    category: "intro",
    tags: ["curved", "dynamic"],
    compiler_key: "INTRO_ORBIT_IN_V1",
    defaults: { arc_degrees: 25, spin: 0.3 },
    constraints: { cooldown: 2, maxElements: 32 },
    weight: 0.7,
    version: 1,
    status: "live"
  },
  {
    id: "intro.typewriter",
    one_liner: "Character-by-character text reveal.",
    category: "intro",
    tags: ["text", "calm"],
    compiler_key: "INTRO_TYPEWRITER_V1",
    defaults: { chars_per_sec: 30 },
    constraints: { cooldown: 1, onlyText: true },
    weight: 0.8,
    version: 1,
    status: "live"
  }
];

// Gesture selector types
export type IntroGestureId = 
  | "intro.slide_left" 
  | "intro.slide_top" 
  | "intro.slide_bottom" 
  | "intro.fade_in" 
  | "intro.bubble_in" 
  | "intro.orbit_in" 
  | "intro.typewriter";

// Gesture compiler context
export interface GestureContext {
  now: number;
  targetIds: string[];
  frame: { width: number; height: number };
  theme: ThemePack;
  params?: Record<string, any>;
}

// Gesture compiler function type
export type GestureCompiler = (ctx: GestureContext) => ElementAnimation[];

// Gesture compiler registry
export const GESTURE_COMPILERS: Record<string, GestureCompiler> = {
  "INTRO_SLIDE_LEFT_V1": INTRO_SLIDE_LEFT_V1,
  "INTRO_SLIDE_TOP_V1": INTRO_SLIDE_TOP_V1,
  "INTRO_SLIDE_BOTTOM_V1": INTRO_SLIDE_BOTTOM_V1,
  "INTRO_FADE_IN_V1": INTRO_FADE_IN_V1,
  "INTRO_BUBBLE_IN_V1": INTRO_BUBBLE_IN_V1,
  "INTRO_ORBIT_IN_V1": INTRO_ORBIT_IN_V1,
  "INTRO_TYPEWRITER_V1": INTRO_TYPEWRITER_V1
};

// Utility function to create a seeded random number generator
function makeRng(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  let state = Math.abs(hash);
  return () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

// Utility function to check when a gesture was last used
function sinceLast(history: IntroGestureId[], gestureId: string): number {
  const lastIndex = history.lastIndexOf(gestureId as IntroGestureId);
  return lastIndex === -1 ? Infinity : history.length - lastIndex;
}

// Gesture selector with variety policy
export function chooseIntroGesture({
  theme, 
  seed, 
  targetCount, 
  history,
  contentType = 'mixed'
}: { 
  theme: ThemePack; 
  seed: string; 
  targetCount: number; 
  history: IntroGestureId[];
  contentType?: 'text' | 'mixed';
}): IntroGestureId {
  const rnd = makeRng(seed);
  
  // Filter gestures based on constraints
  const pool = INTRO_GESTURES.filter(g => {
    // Check cooldown
    if ((g.constraints?.cooldown ?? 0) > sinceLast(history, g.id)) {
      return false;
    }
    
    // Check max elements
    if (g.constraints?.maxElements && targetCount > g.constraints.maxElements) {
      return false;
    }
    
    // Check text-only constraint
    if (g.constraints?.onlyText && contentType !== 'text') {
      return false;
    }
    
    return true;
  }).map(g => ({
    id: g.id,
    w: g.weight * (
      theme.motion.profile === "calm" 
        ? (g.id === "intro.fade_in" || g.id === "intro.typewriter" ? 1.3 : 0.85)
        : theme.motion.profile === "energetic" 
          ? (["intro.bubble_in", "intro.slide_bottom", "intro.orbit_in"].includes(g.id) ? 1.35 : 0.9)
          : 1.0
    )
  }));
  
  if (pool.length === 0) {
    return "intro.fade_in"; // Fallback
  }
  
  // Weighted random selection
  const total = pool.reduce((s, p) => s + p.w, 0);
  let t = rnd() * total;
  
  for (const p of pool) {
    if ((t -= p.w) <= 0) return p.id as IntroGestureId;
  }
  
  return pool[0]?.id as IntroGestureId || "intro.fade_in";
}

// Gesture compiler implementations

export function INTRO_SLIDE_LEFT_V1(ctx: GestureContext): ElementAnimation[] {
  const distance = (ctx.params?.['distance_ratio'] ?? 0.6) * ctx.frame.width;
  const dur = TOKENS.dur.move * (ctx.theme.motion.speedFactor ?? 1);
  const stag = ctx.theme.motion.stagger ?? 0.08;

  return ctx.targetIds.flatMap((id, i) => ([
    // Pre-position off-screen
    {
      id: `a-${id}-pre`,
      displayName: "Pre Pos",
      type: "move" as const,
      startTime: ctx.now,
      duration: 0.001,
      properties: { x: -distance, y: 0 },
      easing: "none"
    },
    // Slide to final position
    {
      id: `a-${id}-in`,
      displayName: "Intro Slide L",
      type: "move" as const,
      startTime: ctx.now + i * stag + 0.02,
      duration: dur,
      properties: { x: 0, y: 0 },
      easing: TOKENS.ease.move as GsapEase
    },
    // Optional fade
    ...(ctx.params?.['with_fade'] ?? true ? [{
      id: `a-${id}-fade`,
      displayName: "Intro Fade",
      type: "fade" as const,
      startTime: ctx.now + i * stag + 0.02,
      duration: TOKENS.dur.base,
      properties: { alpha: 1 },
      easing: TOKENS.ease.enter as GsapEase
    }] : [])
  ]));
}

export function INTRO_SLIDE_TOP_V1(ctx: GestureContext): ElementAnimation[] {
  const distance = (ctx.params?.['distance_ratio'] ?? 0.5) * ctx.frame.height;
  const dur = TOKENS.dur.move * (ctx.theme.motion.speedFactor ?? 1);
  const stag = ctx.theme.motion.stagger ?? 0.08;

  return ctx.targetIds.flatMap((id, i) => ([
    // Pre-position off-screen
    {
      id: `a-${id}-pre`,
      displayName: "Pre Pos",
      type: "move" as const,
      startTime: ctx.now,
      duration: 0.001,
      properties: { x: 0, y: -distance },
      easing: "none"
    },
    // Slide to final position
    {
      id: `a-${id}-in`,
      displayName: "Intro Slide T",
      type: "move" as const,
      startTime: ctx.now + i * stag + 0.02,
      duration: dur,
      properties: { x: 0, y: 0 },
      easing: TOKENS.ease.move as GsapEase
    },
    // Optional fade
    ...(ctx.params?.['with_fade'] ?? true ? [{
      id: `a-${id}-fade`,
      displayName: "Intro Fade",
      type: "fade" as const,
      startTime: ctx.now + i * stag + 0.02,
      duration: TOKENS.dur.base,
      properties: { alpha: 1 },
      easing: TOKENS.ease.enter as GsapEase
    }] : [])
  ]));
}

export function INTRO_SLIDE_BOTTOM_V1(ctx: GestureContext): ElementAnimation[] {
  const distance = (ctx.params?.['distance_ratio'] ?? 0.5) * ctx.frame.height;
  const dur = TOKENS.dur.move * (ctx.theme.motion.speedFactor ?? 1);
  const stag = ctx.theme.motion.stagger ?? 0.08;

  return ctx.targetIds.flatMap((id, i) => ([
    // Pre-position off-screen
    {
      id: `a-${id}-pre`,
      displayName: "Pre Pos",
      type: "move" as const,
      startTime: ctx.now,
      duration: 0.001,
      properties: { x: 0, y: distance },
      easing: "none"
    },
    // Slide to final position
    {
      id: `a-${id}-in`,
      displayName: "Intro Slide B",
      type: "move" as const,
      startTime: ctx.now + i * stag + 0.02,
      duration: dur,
      properties: { x: 0, y: 0 },
      easing: TOKENS.ease.move as GsapEase
    },
    // Optional fade
    ...(ctx.params?.['with_fade'] ?? true ? [{
      id: `a-${id}-fade`,
      displayName: "Intro Fade",
      type: "fade" as const,
      startTime: ctx.now + i * stag + 0.02,
      duration: TOKENS.dur.base,
      properties: { alpha: 1 },
      easing: TOKENS.ease.enter as GsapEase
    }] : [])
  ]));
}

export function INTRO_FADE_IN_V1(ctx: GestureContext): ElementAnimation[] {
  const dur = TOKENS.dur.base * (ctx.params?.['duration_scale'] ?? 1) * (ctx.theme.motion.speedFactor ?? 1);
  const stag = ctx.theme.motion.stagger ?? 0.08;
  
  return ctx.targetIds.map((id, i) => ({
    id: `a-${id}-in-fade`,
    displayName: "Intro Fade",
    type: "fade" as const,
    startTime: ctx.now + i * stag,
    duration: dur,
    properties: { alpha: 1 },
    easing: TOKENS.ease.enter as GsapEase
  }));
}

export function INTRO_BUBBLE_IN_V1(ctx: GestureContext): ElementAnimation[] {
  const dur = TOKENS.dur.base * 1.2 * (ctx.theme.motion.speedFactor ?? 1);
  const stag = Math.max(0.06, ctx.theme.motion.stagger ?? 0.1);
  const from = ctx.params?.['from_scale'] ?? 0.6;

  return ctx.targetIds.flatMap((id, i) => ([
    {
      id: `a-${id}-pre-scale`,
      displayName: "Prep Scale 0",
      type: "scale" as const,
      startTime: ctx.now + i * stag,
      duration: 0.001,
      properties: { scaleX: from, scaleY: from },
      easing: "none"
    },
    {
      id: `a-${id}-in-scale`,
      displayName: "Bubble In",
      type: "scale" as const,
      startTime: ctx.now + i * stag + 0.001,
      duration: dur,
      properties: { scaleX: 1, scaleY: 1 },
      easing: TOKENS.ease.emphasis as GsapEase
    },
    {
      id: `a-${id}-in-fade`,
      displayName: "Bubble Fade",
      type: "fade" as const,
      startTime: ctx.now + i * stag,
      duration: dur * 0.8,
      properties: { alpha: 1 },
      easing: TOKENS.ease.enter as GsapEase
    }
  ]));
}

export function INTRO_ORBIT_IN_V1(ctx: GestureContext): ElementAnimation[] {
  const dur = TOKENS.dur.move * 1.1 * (ctx.theme.motion.speedFactor ?? 1);
  const stag = Math.max(0.06, ctx.theme.motion.stagger ?? 0.1);
  const radius = (ctx.params?.['orbit_radius'] ?? 0.3) * Math.min(ctx.frame.width, ctx.frame.height);

  return ctx.targetIds.flatMap((id, i) => ([
    // Pre-position off-screen
    {
      id: `a-${id}-pre`,
      displayName: "Pre Pos",
      type: "move" as const,
      startTime: ctx.now,
      duration: 0.001,
      properties: { x: 0, y: -radius },
      easing: "none"
    },
    // Orbit in
    {
      id: `a-${id}-orbit`,
      displayName: "Orbit In",
      type: "move" as const,
      startTime: ctx.now + i * stag,
      duration: dur,
      properties: { x: 0, y: 0 },
      easing: TOKENS.ease.move as GsapEase
    },
    // Optional fade
    ...(ctx.params?.['with_fade'] ?? true ? [{
      id: `a-${id}-fade`,
      displayName: "Orbit Fade",
      type: "fade" as const,
      startTime: ctx.now + i * stag,
      duration: dur * 0.8,
      properties: { alpha: 1 },
      easing: TOKENS.ease.enter as GsapEase
    }] : [])
  ]));
}

// ===== EMPHASIS GESTURES =====

/**
 * Emphasis pulse animation - scales element up and down to draw attention
 */
export function EMPHASIS_PULSE_V1(ctx: GestureContext): ElementAnimation[] {
  const emphasisLevel = ctx.params?.['emphasis'] || 'medium';
  const pulseConfig = TOKENS.emphasis.pulse[emphasisLevel as keyof typeof TOKENS.emphasis.pulse] || TOKENS.emphasis.pulse.noticeable;
  
  if (pulseConfig.cycles === 0) return [];
  
  const baseDuration = TOKENS.dur.emphasis.medium;
  const totalDuration = baseDuration * pulseConfig.cycles;
  const cycleDuration = totalDuration / pulseConfig.cycles;
  
  return ctx.targetIds.flatMap((id, i) => {
    const animations: ElementAnimation[] = [];
    
    for (let cycle = 0; cycle < pulseConfig.cycles; cycle++) {
      const startTime = ctx.now + i * 0.1 + cycle * cycleDuration;
      
      // Scale up
      animations.push({
        id: `a-${id}-pulse-up-${cycle}`,
        displayName: `Pulse Up ${cycle + 1}`,
        type: "scale" as const,
        startTime,
        duration: cycleDuration * 0.4,
        properties: { 
          scaleX: 1 + pulseConfig.intensity, 
          scaleY: 1 + pulseConfig.intensity 
        },
        easing: TOKENS.ease.pulse as GsapEase
      });
      
      // Scale down
      animations.push({
        id: `a-${id}-pulse-down-${cycle}`,
        displayName: `Pulse Down ${cycle + 1}`,
        type: "scale" as const,
        startTime: startTime + cycleDuration * 0.4,
        duration: cycleDuration * 0.6,
        properties: { scaleX: 1, scaleY: 1 },
        easing: TOKENS.ease.pulse as GsapEase
      });
    }
    
    return animations;
  });
}

/**
 * Emphasis bounce animation - bounces element with decreasing intensity
 */
export function EMPHASIS_BOUNCE_V1(ctx: GestureContext): ElementAnimation[] {
  const emphasisLevel = ctx.params?.['emphasis'] || 'medium';
  const scaleConfig = TOKENS.emphasis.scale[emphasisLevel as keyof typeof TOKENS.emphasis.scale] || TOKENS.emphasis.scale.moderate;
  
  const baseDuration = TOKENS.dur.emphasis.medium;
  const bounceDuration = baseDuration * 0.8;
  
  return ctx.targetIds.flatMap((id, i) => ([
    // Initial bounce up
    {
      id: `a-${id}-bounce-up`,
      displayName: "Bounce Up",
      type: "scale" as const,
      startTime: ctx.now + i * 0.1,
      duration: bounceDuration * 0.4,
      properties: { 
        scaleX: scaleConfig.max, 
        scaleY: scaleConfig.max 
      },
      easing: TOKENS.ease.bounce as GsapEase
    },
    // Bounce down
    {
      id: `a-${id}-bounce-down`,
      displayName: "Bounce Down",
      type: "scale" as const,
      startTime: ctx.now + i * 0.1 + bounceDuration * 0.4,
      duration: bounceDuration * 0.3,
      properties: { 
        scaleX: scaleConfig.min, 
        scaleY: scaleConfig.min 
      },
      easing: TOKENS.ease.bounce as GsapEase
    },
    // Settle to normal
    {
      id: `a-${id}-bounce-settle`,
      displayName: "Bounce Settle",
      type: "scale" as const,
      startTime: ctx.now + i * 0.1 + bounceDuration * 0.7,
      duration: bounceDuration * 0.3,
      properties: { scaleX: 1, scaleY: 1 },
      easing: TOKENS.ease.emphasis as GsapEase
    }
  ]));
}

/**
 * Emphasis glow animation - fades shadow in and out
 */
export function EMPHASIS_GLOW_V1(ctx: GestureContext): ElementAnimation[] {
  const emphasisLevel = ctx.params?.['emphasis'] || 'medium';
  const glowConfig = TOKENS.emphasis.glow[emphasisLevel as keyof typeof TOKENS.emphasis.glow] || TOKENS.emphasis.glow.medium;
  
  if (glowConfig.blur === 0) return [];
  
  const baseDuration = TOKENS.dur.emphasis.medium;
  const glowDuration = baseDuration * 1.2;
  
  return ctx.targetIds.flatMap((id, i) => ([
    // Glow in
    {
      id: `a-${id}-glow-in`,
      displayName: "Glow In",
      type: "fade" as const,
      startTime: ctx.now + i * 0.1,
      duration: glowDuration * 0.5,
      properties: { alpha: 1 },
      easing: TOKENS.ease.enter as GsapEase
    },
    // Glow out
    {
      id: `a-${id}-glow-out`,
      displayName: "Glow Out",
      type: "fade" as const,
      startTime: ctx.now + i * 0.1 + glowDuration * 0.5,
      duration: glowDuration * 0.5,
      properties: { alpha: 0.8 },
      easing: TOKENS.ease.enter as GsapEase
    }
  ]));
}

/**
 * Emphasis scale animation - scales element up and holds
 */
export function EMPHASIS_SCALE_V1(ctx: GestureContext): ElementAnimation[] {
  const emphasisLevel = ctx.params?.['emphasis'] || 'medium';
  const scaleConfig = TOKENS.emphasis.scale[emphasisLevel as keyof typeof TOKENS.emphasis.scale] || TOKENS.emphasis.scale.moderate;
  
  const baseDuration = TOKENS.dur.emphasis.medium;
  const scaleDuration = baseDuration * 0.6;
  const holdDuration = baseDuration * 0.4;
  
  return ctx.targetIds.flatMap((id, i) => ([
    // Scale up
    {
      id: `a-${id}-scale-up`,
      displayName: "Scale Up",
      type: "scale" as const,
      startTime: ctx.now + i * 0.1,
      duration: scaleDuration,
      properties: { 
        scaleX: scaleConfig.max, 
        scaleY: scaleConfig.max 
      },
      easing: TOKENS.ease.emphasis as GsapEase
    },
    // Hold at scale
    {
      id: `a-${id}-scale-hold`,
      displayName: "Scale Hold",
      type: "scale" as const,
      startTime: ctx.now + i * 0.1 + scaleDuration,
      duration: holdDuration,
      properties: { 
        scaleX: scaleConfig.max, 
        scaleY: scaleConfig.max 
      },
      easing: "none"
    },
    // Scale back down
    {
      id: `a-${id}-scale-down`,
      displayName: "Scale Down",
      type: "scale" as const,
      startTime: ctx.now + i * 0.1 + scaleDuration + holdDuration,
      duration: scaleDuration,
      properties: { scaleX: 1, scaleY: 1 },
      easing: TOKENS.ease.emphasis as GsapEase
    }
  ]));
}

/**
 * Emphasis color flash animation - briefly changes color to draw attention
 */
export function EMPHASIS_COLOR_FLASH_V1(ctx: GestureContext): ElementAnimation[] {
  const baseDuration = TOKENS.dur.emphasis.medium;
  const flashDuration = baseDuration * 0.3;
  
  return ctx.targetIds.flatMap((id, i) => ([
    // Flash color
    {
      id: `a-${id}-color-flash`,
      displayName: "Color Flash",
      type: "color" as const,
      startTime: ctx.now + i * 0.1,
      duration: flashDuration,
      properties: { fillColor: "#FF6B6B" }, // Bright red flash
      easing: "none"
    },
    // Return to original
    {
      id: `a-${id}-color-return`,
      displayName: "Color Return",
      type: "color" as const,
      startTime: ctx.now + i * 0.1 + flashDuration,
      duration: flashDuration,
      properties: { fillColor: "#4F46E5" }, // Return to primary
      easing: "none"
    }
  ]));
}

/**
 * Emphasis stagger animation - applies staggered emphasis to multiple elements
 */
export function EMPHASIS_STAGGER_V1(ctx: GestureContext): ElementAnimation[] {
  const emphasisLevel = ctx.params?.['emphasis'] || 'medium';
  const staggerConfig = TOKENS.emphasis.stagger[emphasisLevel as keyof typeof TOKENS.emphasis.stagger] || TOKENS.emphasis.stagger.moderate;
  
  if (staggerConfig === 0) return [];
  
  const baseDuration = TOKENS.dur.emphasis.medium;
  const scaleConfig = TOKENS.emphasis.scale[emphasisLevel as keyof typeof TOKENS.emphasis.scale] || TOKENS.emphasis.scale.moderate;
  
  return ctx.targetIds.flatMap((id, i) => ([
    // Scale up with stagger
    {
      id: `a-${id}-stagger-up`,
      displayName: "Stagger Up",
      type: "scale" as const,
      startTime: ctx.now + i * staggerConfig,
      duration: baseDuration * 0.5,
      properties: { 
        scaleX: scaleConfig.max, 
        scaleY: scaleConfig.max 
      },
      easing: TOKENS.ease.emphasis as GsapEase
    },
    // Scale back down
    {
      id: `a-${id}-stagger-down`,
      displayName: "Stagger Down",
      type: "scale" as const,
      startTime: ctx.now + i * staggerConfig + baseDuration * 0.5,
      duration: baseDuration * 0.5,
      properties: { scaleX: 1, scaleY: 1 },
      easing: TOKENS.ease.emphasis as GsapEase
    }
  ]));
}

export function INTRO_TYPEWRITER_V1(ctx: GestureContext): ElementAnimation[] {
  const charsPerSec = ctx.params?.['chars_per_sec'] ?? 30;
  const stag = ctx.theme.motion.stagger ?? 0.08;

  return ctx.targetIds.map((id, i) => ({
    id: `a-${id}-typewriter`,
    displayName: "Typewriter",
    type: "typewriter" as const,
    startTime: ctx.now + i * stag,
    duration: 0.5, // This will be calculated based on actual text length
    properties: { chars_per_sec: charsPerSec } as any, // Type assertion for now
    easing: "none"
  }));
}
