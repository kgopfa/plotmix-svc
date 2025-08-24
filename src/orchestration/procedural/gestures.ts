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
  const stag = ctx.theme.motion.stagger ?? 0.1;
  const arcDegrees = ctx.params?.['arc_degrees'] ?? 25;
  const spin = ctx.params?.['spin'] ?? 0.3;

  return ctx.targetIds.flatMap((id, i) => ([
    {
      id: `a-${id}-pre-orbit`,
      displayName: "Pre Orbit",
      type: "move" as const,
      startTime: ctx.now + i * stag,
      duration: 0.001,
      properties: { 
        x: Math.cos(arcDegrees * Math.PI / 180) * 200, 
        y: Math.sin(arcDegrees * Math.PI / 180) * 200 
      },
      easing: "none"
    },
    {
      id: `a-${id}-in-orbit`,
      displayName: "Orbit In",
      type: "move" as const,
      startTime: ctx.now + i * stag + 0.001,
      duration: dur,
      properties: { x: 0, y: 0 },
      easing: TOKENS.ease.move as GsapEase
    },
    {
      id: `a-${id}-spin`,
      displayName: "Orbit Spin",
      type: "rotate" as const,
      startTime: ctx.now + i * stag + 0.001,
      duration: dur,
      properties: { rotation: spin * 360 },
      easing: TOKENS.ease.move as GsapEase
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
