// Procedural Generation Compiler - Main orchestrator
// Integrates layout grammars, gesture compilers, and style resolution

import { CanvasElement, CanvasGroup, ElementAnimation, Timeline } from '../../types/canvas';
import { ThemePack, TOKENS, resolveStyle, selectThemeByTone } from './tokens';
import { 
  INTRO_SLIDE_LEFT_V1, 
  INTRO_FADE_IN_V1,
  INTRO_BUBBLE_IN_V1,
  EMPHASIS_PULSE_V1,
  EMPHASIS_BOUNCE_V1,
  EMPHASIS_GLOW_V1,
  EMPHASIS_SCALE_V1,
  EMPHASIS_COLOR_FLASH_V1
} from './gestures';
import { LayoutGrammarEngine } from './layout-grammars';
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
  motifParams?: { step_id: string; params: Record<string, any> }[];
}

// Compiler result
export interface CompilerResult {
  elements: CanvasElement[];
  groups: CanvasGroup[];
  timeline: Timeline;
  gestureHistory: string[];
}

export class ProceduralCompiler {
  public readonly theme: ThemePack;
  private layoutEngine: LayoutGrammarEngine;
  private gestureHistory: string[] = [];

  constructor(theme: ThemePack, canvasDimensions?: { width?: number; height?: number }) {
    this.theme = theme;
    this.layoutEngine = new LayoutGrammarEngine(theme, canvasDimensions);
  }

  // Method to update canvas dimensions dynamically
  updateCanvasDimensions(width: number, height: number): void {
    this.layoutEngine.updateCanvasDimensions(width, height);
  }

  // Get current canvas dimensions
  getCanvasDimensions(): { width: number; height: number; aspectRatio: number } {
    return this.layoutEngine.getCanvasDimensions();
  }

  // Get coordinate system information
  getCoordinateSystemInfo(): {
    center: { x: number; y: number };
    bounds: { left: number; right: number; top: number; bottom: number };
    quadrants: {
      topLeft: { x: number; y: number };
      topRight: { x: number; y: number };
      bottomLeft: { x: number; y: number };
      bottomRight: { x: number; y: number };
    };
    description: string;
  } {
    return this.layoutEngine.getCoordinateSystemInfo();
  }

  // Main compilation method
  async compileScene(context: CompilerContext): Promise<CompilerResult> {
    try {
      // 0. Normalize entity IDs to ensure consistency
      const normalizedEntities = this.normalizeEntityIds(context.entities);
      const normalizedRelations = this.normalizeRelationIds(context.relations, normalizedEntities);

      // 1. Generate layout using layout grammar engine
      const layoutResult = this.layoutEngine.generateLayout(
        context.archetype,
        normalizedEntities,
        normalizedRelations
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

  // Normalize entity IDs to ensure consistency
  private normalizeEntityIds(entities: Entity[]): Entity[] {
    return entities.map((entity, index) => {
      // Handle different ID formats from LLM responses
      let normalizedId = entity.id;
      
      // If entity has entity_id instead of id, use that
      if ('entity_id' in entity && typeof entity.entity_id === 'string' && entity.entity_id) {
        normalizedId = entity.entity_id;
      }
      
      // If entity has name instead of label, use that
      let normalizedLabel = entity.label;
      if ('name' in entity && typeof entity.name === 'string' && entity.name) {
        normalizedLabel = entity.name;
      }
      
      // Ensure ID is a string and not empty
      if (!normalizedId || typeof normalizedId !== 'string') {
        normalizedId = `entity_${index + 1}`;
      }
      
      // Ensure label is a string and not empty
      if (!normalizedLabel || typeof normalizedLabel !== 'string') {
        normalizedLabel = `Entity ${index + 1}`;
      }
      
      return {
        ...entity,
        id: normalizedId,
        label: normalizedLabel
      };
    });
  }

  // Normalize relation IDs to match normalized entity IDs
  private normalizeRelationIds(relations: Relation[], normalizedEntities: Entity[]): Relation[] {
    return relations.map(relation => {
      // Find the normalized entity IDs for from and to
      const fromEntity = normalizedEntities.find(e => 
        e.id === relation.from || 
        ('entity_id' in e && typeof e.entity_id === 'string' && e.entity_id === relation.from) ||
        ('name' in e && typeof e.name === 'string' && e.name === relation.from)
      );
      
      const toEntity = normalizedEntities.find(e => 
        e.id === relation.to || 
        ('entity_id' in e && typeof e.entity_id === 'string' && e.entity_id === relation.to) ||
        ('name' in e && typeof e.name === 'string' && e.name === relation.to)
      );
      
      if (!fromEntity || !toEntity) {
        // Skip invalid relations instead of throwing
        return null;
      }
      
      return {
        ...relation,
        from: fromEntity.id,
        to: toEntity.id
      };
    }).filter(Boolean) as Relation[]; // Remove null relations
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
    return elements.map(element => {
      const animations: ElementAnimation[] = [];
      
      // Generate intro animation based on element type and position
      const introAnimation = this.selectIntroAnimation(element);
      if (introAnimation) {
        animations.push(...this.normalizeToOnlyAnimations(introAnimation));
      }
      
      // Generate emphasis animations based on motif parameters
      const emphasisAnimations = this.generateEmphasisAnimations(element, context);
      if (emphasisAnimations.length > 0) {
        animations.push(...this.normalizeToOnlyAnimations(emphasisAnimations));
      }
      
      return {
        ...element,
        animations
      };
    });
  }

  // Adapter: normalize animations to "to"-only schema and clamp/support properties
  private normalizeToOnlyAnimations(anims: ElementAnimation[]): ElementAnimation[] {
    return anims.map(a => {
      const clamped: ElementAnimation = { ...a };
      // Clamp alpha
      if (clamped.type === 'fade') {
        const p: any = clamped.properties || {};
        if (typeof p.alpha === 'number') {
          p.alpha = Math.max(0, Math.min(1, p.alpha));
        }
        clamped.properties = p;
      }
      // Strip unsupported numeric properties for typewriter/path/physics if any sneaked in
      if (clamped.type === 'typewriter' || clamped.type === 'path' || clamped.type === 'physics' || clamped.type === 'color') {
        clamped.properties = clamped.properties || {};
      }
      return clamped;
    });
  }

  // Generate emphasis animations based on motif parameters
  private generateEmphasisAnimations(
    element: CanvasElement, 
    context: CompilerContext
  ): ElementAnimation[] {
    const motifParams = context.motifParams?.find(p => p.step_id === element.id);
    if (!motifParams || !motifParams.params) return [];
    
    const params = motifParams.params;
    const emphasis = params['emphasis'] || 'low';
    const emphasisType = params['emphasisType'] || 'none';
    
    if (emphasis === 'low' || emphasisType === 'none') return [];
    
    // Create gesture context for emphasis animations using new interface
    const gestureContext = {
      elementId: element.id,
      startTime: 0.5, // Start emphasis after intro
      duration: 0.8, // Default emphasis duration
      intensity: (params['scale'] === 'high' ? 'dramatic' : params['scale'] === 'low' ? 'subtle' : 'moderate') as 'dramatic' | 'subtle' | 'moderate',
      direction: 'left' as const, // Default direction
      easing: 'power2.out' as const
    };
    
    // Select emphasis gesture based on type
    switch (emphasisType) {
      case 'pulse':
        return EMPHASIS_PULSE_V1(gestureContext);
      case 'bounce':
        return EMPHASIS_BOUNCE_V1(gestureContext);
      case 'glow':
        return EMPHASIS_GLOW_V1(gestureContext);
      case 'scale':
        return EMPHASIS_SCALE_V1(gestureContext);
      case 'color':
        return EMPHASIS_COLOR_FLASH_V1(gestureContext);
      default:
        // Default to scale emphasis
        return EMPHASIS_SCALE_V1(gestureContext);
    }
  }

  // Select appropriate intro animation based on element properties
  private selectIntroAnimation(
    element: CanvasElement
  ): ElementAnimation[] | null {
    // Create gesture context using new interface
    const gestureContext = {
      elementId: element.id,
      startTime: 0,
      duration: 0.6, // Default intro duration
      intensity: 'moderate' as const,
      direction: 'left' as const,
      easing: 'power2.out' as const
    };
    
    // Choose intro based on element type
    switch (element.type) {
      case 'text':
        return INTRO_FADE_IN_V1(gestureContext);
      case 'rectangle':
      case 'circle':
        return INTRO_BUBBLE_IN_V1(gestureContext);
      case 'line':
      case 'path':
        return INTRO_SLIDE_LEFT_V1(gestureContext);
      default:
        return INTRO_FADE_IN_V1(gestureContext);
    }
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
    const scale = Math.max(10, Math.min(1000, Math.floor(this.layoutEngine.getCanvasDimensions().width / duration)));

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
      scale: Math.max(10, Math.min(1000, Math.floor(this.layoutEngine.getCanvasDimensions().width / maxDuration))),
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
  getGestureHistory(): string[] {
    return [...this.gestureHistory];
  }
}

// Factory function to create compiler with theme and optional canvas dimensions
export function createProceduralCompiler(tone: string, canvasDimensions?: { width?: number; height?: number }): ProceduralCompiler {
  const theme = selectThemeByTone(tone);
  return new ProceduralCompiler(theme, canvasDimensions);
}
