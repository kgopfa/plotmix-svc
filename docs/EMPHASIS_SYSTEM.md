# Enhanced Emphasis System

## Overview

The enhanced emphasis system provides sophisticated control over visual emphasis in your pipeline, allowing you to draw attention to specific elements through scaling, color changes, glow effects, and animations.

## Architecture

### 1. **Motif Parameters** (Per-Scene Fan-Out)

Emphasis is controlled through **Step 5** of the per-scene fan-out process, where the LLM generates motif parameters with emphasis controls:

```typescript
interface MotifParams {
  step_id: string;
  params: {
    // Basic emphasis controls
    emphasis?: 'low' | 'medium' | 'high';
    emphasisType?: 'scale' | 'color' | 'glow' | 'pulse' | 'bounce' | 'none';
    emphasisDuration?: 'short' | 'medium' | 'long';
    
    // Specific emphasis parameters
    scale?: 'subtle' | 'moderate' | 'dramatic';
    color?: 'accent' | 'primary' | 'warning' | 'success' | 'custom';
    customColor?: string; // hex color for custom emphasis
    glow?: 'none' | 'soft' | 'medium' | 'strong';
    pulse?: 'none' | 'gentle' | 'noticeable' | 'attention-grabbing';
    
    // Animation timing
    speed?: 'slow' | 'medium' | 'fast';
    stagger?: 'none' | 'minimal' | 'moderate' | 'pronounced';
  };
  overrides_only: boolean;
}
```

### 2. **Design Tokens**

The system includes emphasis-specific design tokens:

```typescript
export const TOKENS = {
  // ... existing tokens ...
  emphasis: {
    scale: {
      subtle: { min: 0.95, max: 1.05 },
      moderate: { min: 0.9, max: 1.1 },
      dramatic: { min: 0.8, max: 1.2 }
    },
    glow: {
      none: { blur: 0, opacity: 0 },
      soft: { blur: 4, opacity: 0.3 },
      medium: { blur: 8, opacity: 0.5 },
      strong: { blur: 12, opacity: 0.7 }
    },
    pulse: {
      none: { cycles: 0, intensity: 0 },
      gentle: { cycles: 1, intensity: 0.05 },
      noticeable: { cycles: 2, intensity: 0.1 },
      "attention-grabbing": { cycles: 3, intensity: 0.15 }
    },
    stagger: {
      none: 0,
      minimal: 0.05,
      moderate: 0.1,
      pronounced: 0.2
    }
  }
};
```

### 3. **Style Resolver**

The style resolver automatically applies emphasis styling based on motif parameters:

```typescript
export function resolveStyle({
  role, theme, tokens, skin, overrides
}) {
  // Determine if this element should have emphasis styling
  const hasEmphasis = overrides?.['emphasis'] && overrides['emphasis'] !== 'low';
  
  // Select base role (with or without emphasis)
  let baseRole = role;
  if (hasEmphasis && base[`${role}.emphasis`]) {
    baseRole = `${role}.emphasis`;
  }
  
  // Apply emphasis-specific overrides
  if (hasEmphasis) {
    // Apply custom color if specified
    if (overrides?.['color'] === 'custom' && overrides['customColor']) {
      merged.fill = overrides['customColor'];
    }
    
    // Apply glow effects
    if (overrides?.['glow'] && overrides['glow'] !== 'none') {
      const glowConfig = tokens.emphasis.glow[overrides['glow']];
      merged.shadowEnabled = true;
      merged.shadowBlur = glowConfig.blur;
      merged.shadowOpacity = glowConfig.opacity;
    }
  }
  
  return merged;
}
```

### 4. **Emphasis Gestures**

The system includes dedicated emphasis animation gestures:

#### **EMPHASIS_PULSE_V1**
Scales element up and down to draw attention:
```typescript
export function EMPHASIS_PULSE_V1(ctx: GestureContext): ElementAnimation[] {
  const emphasisLevel = ctx.params?.['emphasis'] || 'medium';
  const pulseConfig = TOKENS.emphasis.pulse[emphasisLevel];
  
  // Generate pulse cycles based on emphasis level
  for (let cycle = 0; cycle < pulseConfig.cycles; cycle++) {
    // Scale up
    animations.push({
      type: "scale",
      properties: { 
        scaleX: 1 + pulseConfig.intensity, 
        scaleY: 1 + pulseConfig.intensity 
      }
    });
    
    // Scale down
    animations.push({
      type: "scale",
      properties: { scaleX: 1, scaleY: 1 }
    });
  }
}
```

#### **EMPHASIS_BOUNCE_V1**
Bounces element with decreasing intensity:
```typescript
export function EMPHASIS_BOUNCE_V1(ctx: GestureContext): ElementAnimation[] {
  // Initial bounce up
  // Bounce down
  // Settle to normal
}
```

#### **EMPHASIS_GLOW_V1**
Fades shadow in and out for glow effect:
```typescript
export function EMPHASIS_GLOW_V1(ctx: GestureContext): ElementAnimation[] {
  // Glow in
  // Glow out
}
```

#### **EMPHASIS_SCALE_V1**
Scales element up and holds:
```typescript
export function EMPHASIS_SCALE_V1(ctx: GestureContext): ElementAnimation[] {
  // Scale up
  // Hold at scale
  // Scale back down
}
```

#### **EMPHASIS_COLOR_FLASH_V1**
Briefly changes color to draw attention:
```typescript
export function EMPHASIS_COLOR_FLASH_V1(ctx: GestureContext): ElementAnimation[] {
  // Flash color
  // Return to original
}
```

#### **EMPHASIS_STAGGER_V1**
Applies staggered emphasis to multiple elements:
```typescript
export function EMPHASIS_STAGGER_V1(ctx: GestureContext): ElementAnimation[] {
  // Scale up with stagger
  // Scale back down
}
```

## Usage Examples

### 1. **High Emphasis with Scale**

```typescript
const motifParams = {
  step_id: "1",
  params: {
    emphasis: "high",
    emphasisType: "scale",
    scale: "dramatic",
    color: "accent"
  },
  overrides_only: true
};
```

**Result**: Element scales from 0.8x to 1.2x with accent color and medium glow.

### 2. **Medium Emphasis with Pulse**

```typescript
const motifParams = {
  step_id: "2",
  params: {
    emphasis: "medium",
    emphasisType: "pulse",
    pulse: "noticeable",
    speed: "medium"
  },
  overrides_only: true
};
```

**Result**: Element pulses 2 cycles with 0.1 intensity scaling.

### 3. **Custom Color Emphasis**

```typescript
const motifParams = {
  step_id: "3",
  params: {
    emphasis: "high",
    emphasisType: "color",
    color: "custom",
    customColor: "#FF6B6B",
    glow: "strong"
  },
  overrides_only: true
};
```

**Result**: Element uses custom red color with strong glow effect.

## Integration Points

### 1. **Per-Scene Fan-Out Orchestrator**

The orchestrator generates emphasis parameters in Step 5:
```typescript
private async generateMotifParams(selections: MotifSelection[]): Promise<MotifParams[]> {
  const user = `EMPHASIS CONTROLS:
- emphasis: "low" | "medium" | "high" (overall emphasis level)
- emphasisType: "scale" | "color" | "glow" | "pulse" | "bounce" | "none"
- scale: "subtle" | "moderate" | "dramatic" (scaling intensity)
- color: "accent" | "primary" | "warning" | "success" | "custom"
- customColor: "#RRGGBB" (hex color for custom emphasis)
- glow: "none" | "soft" | "medium" | "strong" (glow effect)
- pulse: "none" | "gentle" | "noticeable" | "attention-grabbing"`;
}
```

### 2. **Procedural Compiler**

The compiler applies emphasis based on motif parameters:
```typescript
private generateEmphasisAnimations(
  element: CanvasElement, 
  context: CompilerContext
): ElementAnimation[] {
  const motifParams = context.motifParams?.find(p => p.step_id === element.id);
  const emphasis = motifParams?.params['emphasis'] || 'low';
  const emphasisType = motifParams?.params['emphasisType'] || 'none';
  
  // Select emphasis gesture based on type
  switch (emphasisType) {
    case 'pulse': return EMPHASIS_PULSE_V1(gestureContext);
    case 'bounce': return EMPHASIS_BOUNCE_V1(gestureContext);
    case 'glow': return EMPHASIS_GLOW_V1(gestureContext);
    case 'scale': return EMPHASIS_SCALE_V1(gestureContext);
    case 'color': return EMPHASIS_COLOR_FLASH_V1(gestureContext);
    default: return EMPHASIS_SCALE_V1(gestureContext);
  }
}
```

## Testing

Run the emphasis system test:

```bash
pnpm ts-node src/scripts/test-emphasis-system.ts
```

This will:
1. Generate a test scene with emphasis controls
2. Compile the scene with emphasis
3. Show the generated emphasis animations

## Benefits

1. **Declarative Control**: LLM specifies emphasis intent, system handles execution
2. **Consistent Styling**: Centralized emphasis tokens ensure consistency
3. **Flexible Animation**: Multiple emphasis types for different visual needs
4. **Performance Optimized**: Emphasis animations are generated procedurally
5. **Theme Integration**: Emphasis respects theme colors and timing
6. **Fallback Support**: Graceful degradation when emphasis parameters are missing

## Future Enhancements

1. **Contextual Emphasis**: Automatic emphasis based on content importance
2. **Emphasis Chaining**: Sequential emphasis across related elements
3. **Audio Integration**: Sound effects for emphasis animations
4. **Accessibility**: Emphasis alternatives for users with motion sensitivity
5. **Performance Metrics**: Track emphasis effectiveness and user engagement
