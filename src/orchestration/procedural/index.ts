// Procedural Generation System - Main exports
// Provides deterministic layout, animation, and styling generation

export * from './tokens';
export * from './gestures';
export * from './layout-grammars';
export * from './compiler';

// Main entry points
export { 
  TOKENS, 
  THEMES, 
  selectThemeByTone, 
  resolveStyle,
  type ThemePack,
  type SkinSpec,
  type SkinRegistry
} from './tokens';

export {
  // New purpose-based animation system
  SCENE_FADE_IN_V1,
  SCENE_FADE_OUT_V1,
  SCENE_SLIDE_IN_V1,
  SCENE_ZOOM_IN_V1,
  ELEMENT_SLIDE_IN_V1,
  ELEMENT_STAGGER_SLIDE_V1,
  ELEMENT_BUBBLE_IN_V1,
  ELEMENT_ORBIT_IN_V1,
  ELEMENT_PULSE_V1,
  ELEMENT_BOUNCE_V1,
  ELEMENT_SHAKE_V1,
  ELEMENT_FLASH_COLOR_V1,
  POINT_CROSSFADE_V1,
  POINT_SLIDE_SWAP_V1,
  TEXT_TYPEWRITER_V1,
  TEXT_WORD_STAGGER_V1,
  DATA_LINE_DRAW_V1,
  DATA_BAR_GROW_V1,
  DATA_COUNTER_TICK_V1,
  BRAND_LOGO_REVEAL_V1,
  BRAND_CTA_EMPHASIS_V1,
  // Legacy support
  EMPHASIS_PULSE_V1,
  EMPHASIS_BOUNCE_V1,
  EMPHASIS_GLOW_V1,
  EMPHASIS_SCALE_V1,
  EMPHASIS_COLOR_FLASH_V1,
  INTRO_SLIDE_LEFT_V1,
  INTRO_FADE_IN_V1,
  INTRO_BUBBLE_IN_V1,
  INTRO_ORBIT_IN_V1,
  type GestureContext
} from './gestures';

export {
  LayoutGrammarEngine,
  type LayoutResult
} from './layout-grammars';

export {
  ProceduralCompiler,
  createProceduralCompiler,
  type CompilerContext,
  type CompilerResult
} from './compiler';
