# New DSL Format Specification

## Overview

The new DSL format simplifies caption handling while maintaining synchronization with animations. Captions now use automatic timing calculation based on their order, ensuring only one caption is visible at any time.

## DSL Syntax

### Basic Commands

```dsl
seed <int>                    # Random seed for consistent styling
style <auto|Minimal|Monospace|...>  # Visual style theme
array [v1,v2,v3,...]          # Array of values to visualize
animate <type> [elements] <startTime> <duration>  # Animation commands
caption <order> "<text>"       # Simplified caption format
```

### Animation Types

- `highlight`: Visual highlighting of array elements (background color change)
- `select`: Selection state (scaling for emphasis)
- `focus`: Focus state (subtle scaling for attention)
- `compare`: Comparison state (background color for comparison)

## Caption Timing Rules

### Automatic Timing Calculation

Captions use automatic timing based on their order:

- **Fade-in duration**: 0.5 seconds
- **Visible time**: 3 seconds (configurable)
- **Fade-out duration**: 0.5 seconds
- **Total duration per caption**: 4 seconds

### Timing Formula

For caption with order `n`:
- **Start time**: `(n - 1) × 4` seconds
- **Fade-in end**: `startTime + 0.5` seconds
- **Fade-out start**: `startTime + 3.5` seconds
- **End time**: `startTime + 4` seconds

### Sequential Display

Only one caption is visible at any time:
- Caption 1: 0s - 4s
- Caption 2: 4s - 8s
- Caption 3: 8s - 12s
- etc.

## Example: Binary Search Visualization

```dsl
seed 12345
style auto
array [1,3,5,7,9]
animate highlight [1,3,5,7,9]
caption 1 "We start with the entire array as our search range."
animate select [5]
caption 2 "The middle element is 5, which we will compare with the target."
animate compare [5,5]
caption 3 "We compare the middle element (5) with the target value (5)."
animate highlight [1,3,5]
caption 4 "Since the target is equal to the middle element, we found the target."
```

### Timing Breakdown

| Caption | Order | Start Time | Fade-in End | Fade-out Start | End Time |
|---------|-------|------------|-------------|----------------|----------|
| 1 | 1 | 0s | 0.5s | 3.5s | 4s |
| 2 | 2 | 4s | 4.5s | 7.5s | 8s |
| 3 | 3 | 8s | 8.5s | 11.5s | 12s |
| 4 | 4 | 12s | 12.5s | 15.5s | 16s |

## Animation Synchronization

### Key Principles

1. **Sequential Timing**: Animations and captions are synchronized through sequential timing
2. **No Overlap**: Only one caption is visible at any time
3. **Automatic Transitions**: Entry/exit animations are handled automatically
4. **Configurable Duration**: Caption visible time is configurable (default: 3s)

### Animation Alignment

Animations should be timed to align with caption visibility:

```dsl
# Good: Animation starts when caption becomes visible
animate highlight [1,3,5,7,9] 0 5
caption 1 "We start with the entire array as our search range."

# Good: Animation starts when caption becomes visible
animate select [5] 4 5
caption 2 "The middle element is 5, which we will compare with the target."
```

## Configuration

### CaptionConfig Interface

```typescript
interface CaptionConfig {
  visibleTime: number;        // How long each caption stays visible (default: 3s)
  fadeInDuration: number;     // Duration of fade-in animation (default: 0.5s)
  fadeOutDuration: number;    // Duration of fade-out animation (default: 0.5s)
  transitionType: "fade" | "slide"; // Type of transition animation
}
```

### Default Configuration

```typescript
const DEFAULT_CAPTION_CONFIG: CaptionConfig = {
  visibleTime: 3,           // 3 seconds visible time
  fadeInDuration: 0.5,       // 0.5 seconds fade in
  fadeOutDuration: 0.5,      // 0.5 seconds fade out
  transitionType: "fade"     // Use fade transitions
};
```

## Migration from Old Format

### Old Format
```dsl
caption 1 "Text" 0 0.5 5 fade-in
caption 2 "Text" 5 0.5 10 fade-in
```

### New Format
```dsl
caption 1 "Text"
caption 2 "Text"
```

### Benefits

1. **Simplified Syntax**: No need to specify timing parameters
2. **Automatic Synchronization**: Timing is calculated automatically
3. **No Overlap**: Ensures only one caption is visible at a time
4. **Consistent Behavior**: Predictable timing across all captions
5. **Easier Maintenance**: Less complex DSL parsing and execution

## Best Practices

### Do's

- ✅ Use sequential caption orders (1, 2, 3, ...)
- ✅ Align animation start times with caption visibility
- ✅ Keep caption text concise and clear
- ✅ Use appropriate animation types for each step
- ✅ Test timing synchronization

### Don'ts

- ❌ Skip caption orders (1, 3, 5...)
- ❌ Overlap animation timing with caption transitions
- ❌ Use overly long caption text
- ❌ Mix different timing patterns
- ❌ Assume manual timing control

## Implementation Details

### Parser Changes

The caption parser now only extracts order and text:
```typescript
private static parseCaption(line: string): Action | null {
  const captionMatch = line.match(/^caption\s+(\d+)\s+"([^"]+)"/);
  
  if (!captionMatch) {
    return null;
  }

  const order = parseInt(captionMatch[1]!);
  const text = captionMatch[2]!;

  return {
    kind: "CAPTION",
    order,
    text
  };
}
```

### Executor Changes

The executor automatically calculates timing:
```typescript
// Calculate timing based on caption order
const totalCaptionDuration = DEFAULT_CAPTION_CONFIG.fadeInDuration + 
                           DEFAULT_CAPTION_CONFIG.visibleTime + 
                           DEFAULT_CAPTION_CONFIG.fadeOutDuration;
const startTime = (act.order - 1) * totalCaptionDuration;
const fadeInEndTime = startTime + DEFAULT_CAPTION_CONFIG.fadeInDuration;
const fadeOutStartTime = fadeInEndTime + DEFAULT_CAPTION_CONFIG.visibleTime;
```

## Testing

The new format includes comprehensive tests to ensure:
- Correct parsing of simplified caption format
- Accurate automatic timing calculation
- Proper synchronization with animations
- No timing conflicts or overlaps
