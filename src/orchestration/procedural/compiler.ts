// Procedural Generation Compiler - Main orchestrator
// Integrates layout grammars, gesture compilers, and style resolution

import { TOKENS, selectThemeByTone, resolveStyle } from './tokens';
import { ThemePack } from './tokens';
import { 
  chooseIntroGesture, 
  GESTURE_COMPILERS, 
  INTRO_GESTURES,
  IntroGestureId,
  GestureContext 
} from './gestures';
import { LayoutGrammarEngine } from './layout-grammars';
import { CanvasElement, CanvasGroup, Timeline } from '../../types/canvas';
import { Entity, Relation, SceneOut } from '../pipeline/types';

// Compiler context
export interface CompilerContext {
  projectId: string;
  sceneId: string;
  archetype: string;
  tone: string;
  entities: Entity[];
  relations: Relation[];
  theme: ThemePack;
  seed: string;
}

// Compiler result
export interface CompilerResult {
  elements: CanvasElement[];
  groups: CanvasGroup[];
  timeline: Timeline;
  gestureHistory: IntroGestureId[];
}

export class ProceduralCompiler {
  public readonly theme: ThemePack;
  private layoutEngine: LayoutGrammarEngine;
  private gestureHistory: IntroGestureId[] = [];

  constructor(theme: ThemePack) {
    this.theme = theme;
    this.layoutEngine = new LayoutGrammarEngine(theme);
  }

  // Main compilation method
  async compileScene(context: CompilerContext): Promise<CompilerResult> {
    try {
      // 1. Generate layout using layout grammar engine
      const layoutResult = this.layoutEngine.generateLayout(
        context.archetype,
        context.entities,
        context.relations
      );

      // 2. Apply styling to elements
      const styledElements = this.applyStyling(layoutResult.elements, context);

      // 3. Generate intro animations
      const elementsWithAnimations = this.generateIntroAnimations(
        styledElements,
        context
      );

      // 4. Create timeline
      const timeline = this.createTimeline(elementsWithAnimations);

      // 5. Create groups (enhanced from layout)
      const groups = this.createEnhancedGroups(layoutResult.elements);

      return {
        elements: elementsWithAnimations,
        groups,
        timeline,
        gestureHistory: [...this.gestureHistory]
      };

    } catch (error) {
      throw new Error(`Compilation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Apply styling to elements using style resolver
  private applyStyling(elements: CanvasElement[], context: CompilerContext): CanvasElement[] {
    return elements.map(element => {
      // Determine role based on element properties and context
      const role = this.determineElementRole(element);
      
      // Resolve style using the centralized style resolver
      const style = resolveStyle({
        role,
        theme: context.theme,
        tokens: TOKENS
      });

      // Apply resolved style
      return {
        ...element,
        fill: style.fill || element.fill,
        stroke: style.stroke || element.stroke,
        strokeWidth: style.strokeWidth || element.strokeWidth,
        cornerRadius: style.cornerRadius || element.cornerRadius,
        fontSize: style.fontSize || element.fontSize,
        fontFamily: style.fontFamily || element.fontFamily,
        textAlign: style.textAlign || element.textAlign
      };
    });
  }

  // Generate intro animations for elements
  private generateIntroAnimations(
    elements: CanvasElement[], 
    context: CompilerContext
  ): CanvasElement[] {
    if (elements.length === 0) return elements;

    // Choose intro gesture based on theme and content
    const introGesture = chooseIntroGesture({
      theme: context.theme,
      seed: context.seed,
      targetCount: elements.length,
      history: this.gestureHistory,
      contentType: this.determineContentType(elements)
    });

    // Record gesture usage
    this.gestureHistory.push(introGesture);

    // Get gesture compiler function
    // First, find the gesture in the catalog to get the compiler_key
    const gesture = INTRO_GESTURES.find(g => g.id === introGesture);
    
    if (!gesture) {
      throw new Error(`Gesture not found in catalog: ${introGesture}`);
    }
    
    const gestureCompiler = GESTURE_COMPILERS[gesture.compiler_key];
    if (!gestureCompiler) {
      throw new Error(`Gesture compiler not found for: ${gesture.compiler_key}`);
    }

    // Generate animations for each element
    const elementsWithAnimations = elements.map((element, index) => {
      const gestureContext: GestureContext = {
        now: index * 0.1, // Stagger start times
        targetIds: [element.id],
        frame: { width: 1280, height: 720 },
        theme: context.theme,
        params: this.getGestureParams(introGesture)
      };

      const animations = gestureCompiler(gestureContext);
      
      return {
        ...element,
        animations: [
          ...element.animations,
          ...animations
        ]
      };
    });

    return elementsWithAnimations;
  }

  // Create timeline with proper constraints
  private createTimeline(
    elements: CanvasElement[]
  ): Timeline {
    // Calculate total duration from animations
    let maxEndTime = 0;
    elements.forEach(element => {
      element.animations.forEach(animation => {
        const endTime = animation.startTime + animation.duration;
        maxEndTime = Math.max(maxEndTime, endTime);
      });
    });

    // Apply timeline constraints (1-120 seconds)
    const duration = Math.max(1, Math.min(120, maxEndTime + 1));
    
    // Calculate appropriate scale (10-1000 pixels per second)
    const scale = Math.max(10, Math.min(1000, Math.floor(1280 / duration)));

    return {
      scale,
      duration,
      currentTime: 0,
      animationStates: {}
    };
  }

  // Create enhanced groups
  private createEnhancedGroups(
    elements: CanvasElement[]
  ): CanvasGroup[] {
    // For now, create minimal groups - can be enhanced with more sophisticated grouping logic
    const groups: CanvasGroup[] = [];
    
    // Group text elements if they exist
    const textElements = elements.filter(e => e.type === 'text');
    if (textElements.length > 0) {
      groups.push({
        id: 'group-text-default',
        name: 'Text Elements',
        elementIds: textElements.map(e => e.id),
        x: 0,
        y: 0,
        type: 'text',
        isDefaultGroup: false,
        isAnimationPath: false,
        isClosed: false,
        animations: []
      });
    }

    return groups;
  }

  // Determine element role for styling
  private determineElementRole(element: CanvasElement): string {
    // Map element properties to roles
    if (element.type === 'text') {
      return 'label.caption';
    }
    
    // You can enhance this with more sophisticated role determination
    // based on element properties, context, or entity types
    return 'container.card';
  }

  // Determine content type for gesture selection
  private determineContentType(elements: CanvasElement[]): 'text' | 'mixed' {
    const textCount = elements.filter(e => e.type === 'text').length;
    const totalCount = elements.length;
    
    if (textCount === totalCount) return 'text';
    return 'mixed';
  }

  // Get gesture parameters based on element and context
  private getGestureParams(
    gestureId: IntroGestureId
  ): Record<string, any> {
    // Default parameters - can be enhanced with more sophisticated logic
    const baseParams: Record<string, any> = {};
    
    switch (gestureId) {
      case 'intro.slide_left':
        baseParams['distance_ratio'] = 0.6;
        baseParams['with_fade'] = true;
        break;
      case 'intro.slide_top':
        baseParams['distance_ratio'] = 0.5;
        baseParams['with_fade'] = true;
        break;
      case 'intro.slide_bottom':
        baseParams['distance_ratio'] = 0.5;
        baseParams['with_fade'] = true;
        break;
      case 'intro.fade_in':
        baseParams['duration_scale'] = 1.0;
        break;
      case 'intro.bubble_in':
        baseParams['from_scale'] = 0.6;
        baseParams['overshoot'] = true;
        break;
      case 'intro.orbit_in':
        baseParams['arc_degrees'] = 25;
        baseParams['spin'] = 0.3;
        break;
      case 'intro.typewriter':
        baseParams['chars_per_sec'] = 30;
        break;
    }
    
    return baseParams;
  }

  // Compile multiple scenes
  async compileScenes(
    scenes: SceneOut[], 
    projectId: string, 
    tone: string
  ): Promise<{
    elements: CanvasElement[];
    groups: CanvasGroup[];
    timeline: Timeline;
  }> {
    const allElements: CanvasElement[] = [];
    const allGroups: CanvasGroup[] = [];
    let maxDuration = 0;
    let currentTime = 0;

    for (const scene of scenes) {
      const context: CompilerContext = {
        projectId,
        sceneId: scene.scene_id,
        archetype: this.determineSceneArchetype(scene),
        tone,
        entities: scene.steps.flatMap(s => s.entities),
        relations: scene.steps.flatMap(s => s.relations),
        theme: selectThemeByTone(tone),
        seed: `${projectId}:${scene.scene_id}`
      };

      const result = await this.compileScene(context);
      
      // Adjust timing for sequential scenes
      const adjustedElements = result.elements.map(element => ({
        ...element,
        animations: element.animations.map(animation => ({
          ...animation,
          startTime: animation.startTime + currentTime
        }))
      }));

      allElements.push(...adjustedElements);
      allGroups.push(...result.groups);
      maxDuration = Math.max(maxDuration, result.timeline.duration);
      currentTime += result.timeline.duration + 0.5; // Add gap between scenes
    }

    // Create combined timeline
    const combinedTimeline: Timeline = {
      scale: Math.max(10, Math.min(1000, Math.floor(1280 / maxDuration))),
      duration: currentTime,
      currentTime: 0,
      animationStates: {}
    };

    return {
      elements: allElements,
      groups: allGroups,
      timeline: combinedTimeline
    };
  }

  // Determine scene archetype from scene content
  private determineSceneArchetype(scene: SceneOut): string {
    // Analyze scene content to determine archetype
    // This is a simplified version - can be enhanced with more sophisticated analysis
    
    const hasProcesses = scene.steps.some(s => 
      s.entities.some(e => e.type === 'process')
    );
    
    const hasActors = scene.steps.some(s => 
      s.entities.some(e => e.type === 'actor')
    );
    
    const hasEvents = scene.steps.some(s => 
      s.entities.some(e => e.type === 'event')
    );
    
    if (hasProcesses && hasActors) return 'process_flow';
    if (hasEvents && hasActors) return 'cause_effect';
    if (hasProcesses) return 'algorithm_trace';
    
    return 'process_flow'; // Default fallback
  }

  // Reset gesture history (useful for new projects)
  resetGestureHistory(): void {
    this.gestureHistory = [];
  }

  // Get current gesture history
  getGestureHistory(): IntroGestureId[] {
    return [...this.gestureHistory];
  }
}

// Factory function to create compiler with theme
export function createProceduralCompiler(tone: string): ProceduralCompiler {
  const theme = selectThemeByTone(tone);
  return new ProceduralCompiler(theme);
}
