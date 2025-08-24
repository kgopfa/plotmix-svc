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
  INTRO_GESTURES,
  chooseIntroGesture,
  GESTURE_COMPILERS,
  type IntroGesture,
  type IntroGestureId,
  type GestureContext,
  type GestureCompiler
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
