# DSL Processing Guide

## Overview

The DSL (Domain Specific Language) processing system converts text-based commands into animated visualizations. This guide covers all available commands, animation types, and how the system processes them into interactive canvas elements.

## Table of Contents

1. [DSL Commands](#dsl-commands)
2. [Animation System](#animation-system)
3. [Pointer Animations](#pointer-animations)
4. [Timing and Synchronization](#timing-and-synchronization)
5. [Canvas Coordinate System](#canvas-coordinate-system)
6. [Processing Flow](#processing-flow)
7. [Examples](#examples)
8. [Best Practices](#best-practices)

## DSL Commands

### Setup Commands

#### `setup`
Configures the visualization environment.

```dsl
setup seed=42 style=auto
```

**Parameters:**
- `seed`: Random seed for consistent procedural styling (optional, defaults to 0)
- `style`: Visual theme (`auto` for random, or specific style name like `Minimal`, `Monospace`)

### Data Commands

#### `draw_array`
Creates an array visualization with cells and indices.

```dsl
draw_array [5, 2, 8, 1, 9]
draw_array [1, 2, 3] gap=100 cell=80
```

**Parameters:**
- `values`: Array of numbers or strings to display
- `gap`: Space between cells (optional, defaults to 80px)
- `cell`: Minimum cell size (optional, defaults to style default)

**Features:**
- Automatic centering on canvas
- Dynamic cell sizing based on content
- Array indices displayed below each cell
- Center-origin coordinate system

### Animation Commands

#### `animate`
Applies animations to array elements or creates pointer indicators.

```dsl
animate highlight [0, 2, 4]
animate pointer [0, 2]
animate move [1, 3]
```

**Animation Types:**
- `highlight`: Changes background color
- `select`: Scales elements for emphasis
- `focus`: Subtle scaling for attention
- `compare`: Special highlighting for comparisons
- `pointer`: Creates pointer indicators
- `move`: Moves existing pointers

### Content Commands

#### `caption`
Displays timed text overlays.

```dsl
caption 1 "This is the first step"
caption 2 "This is the second step"
```

**Features:**
- Sequential timing (only one visible at a time)
- Automatic fade-in/fade-out transitions
- Synchronized with animations

#### `heading`
Creates a main title.

```dsl
heading "Binary Search Algorithm"
```

#### `explanation`
Shows explanatory text.

```dsl
explanation 1 "We start by examining the middle element"
```

#### `approach`
Lists approach steps (shown in groups of 8).

```dsl
approach 1 "Initialize two pointers at the ends"
approach 2 "Calculate the middle index"
```

#### `conclusion`
Displays conclusion text (shown in pairs).

```dsl
conclusion 1 "The target was found at index 3"
```

#### `pseudocode`
Shows code blocks with syntax highlighting.

```dsl
pseudocode "function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    let mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}"
```

## Animation System

### Element Animations

Element animations affect individual array cells:

#### `highlight`
Changes the background color of specified elements.

```dsl
animate highlight [0, 2, 4]
```

**Visual Effect:**
- Background color changes to highlight color
- Applied to rectangle elements
- Duration: 1.5 seconds

#### `select`
Scales elements for emphasis.

```dsl
animate select [2]
```

**Visual Effect:**
- Element scales up slightly
- Applied to entire cell group
- Duration: 1.5 seconds

#### `focus`
Subtle scaling for attention.

```dsl
animate focus [1, 3]
```

**Visual Effect:**
- Gentle scaling animation
- Applied to entire cell group
- Duration: 1.5 seconds

#### `compare`
Special highlighting for comparisons.

```dsl
animate compare [2, 4]
```

**Visual Effect:**
- Special comparison highlighting
- Applied to rectangle elements
- Duration: 1.5 seconds

### Pointer Animations

Pointer animations create and move visual indicators to show algorithm state:

#### `pointer`
Creates pointer indicators at specified positions.

```dsl
animate pointer [0, 2]
animate pointer ["LOW", "HIGH"]
animate pointer [0, "MID", 4]
```

**Visual Elements:**
- **Triangle**: Gold colored (#FFD700), pointing down
- **Label**: Customizable text above triangle
- **Position**: 50px above target cell, centered horizontally
- **Animation**: Fade-in on creation (0.5s duration)

**Features:**
- **Customizable labels**: Use numbers, strings, or mixed
- **Multiple pointers**: Support for 1-3 pointers simultaneously
- **Automatic positioning**: Calculated based on target cell position
- **Z-index layering**: Appears above array cells but below captions

**Pointer Creation Process:**
1. Find target cell position
2. Calculate pointer position (50px above cell)
3. Create triangle element with gold color
4. Create label text element
5. Group triangle and label together
6. Apply fade-in animation

#### `move`
Moves existing pointers to new positions.

```dsl
animate move [1, 3]
animate move [2, 4, 6]
```

**Visual Effect:**
- **Smooth movement**: Power2 easing for natural motion
- **Maintains labels**: Pointer labels stay the same
- **Duration**: 1.0 seconds
- **Positioning**: Automatically calculates new position above target

**Move Animation Process:**
1. Find existing pointer groups
2. Calculate new target positions
3. Apply move animation to pointer groups
4. Maintain pointer labels and styling

#### Pointer State Management

Pointers are tracked by index in the elements array:

```dsl
# Step 1: Create pointers
animate pointer [0, 2]  # Creates pointer-0 and pointer-1

# Step 2: Move pointers
animate move [1, 3]     # Moves pointer-0 to index 1, pointer-1 to index 3

# Step 3: Move again
animate move [4, 0]     # Moves pointer-0 to index 4, pointer-1 to index 0
```

**Pointer Naming Convention:**
- `pointer-0`: First pointer in the array
- `pointer-1`: Second pointer in the array
- `pointer-2`: Third pointer in the array

#### Use Cases

**Binary Search:**
```dsl
animate pointer ["LOW", "HIGH"]  # Create low and high pointers
animate move [3, 3]              # Both pointers move to middle
animate move [1, 2]              # Narrow search range
```

**Two-Pointer Technique:**
```dsl
animate pointer [0, 6]           # Start at both ends
animate move [1, 5]              # Move inward
animate move [2, 4]              # Continue until they meet
```

**Array Traversal:**
```dsl
animate pointer [0]              # Single pointer
animate move [1]                 # Move to next element
animate move [2]                 # Continue traversal
```

## Timing and Synchronization

### Caption Timing

Captions use automatic sequential timing:

| Caption Order | Start Time | Fade-in End | Fade-out Start | End Time |
|---------------|------------|-------------|----------------|----------|
| 1 | 0s | 0.5s | 3.5s | 4s |
| 2 | 4s | 4.5s | 7.5s | 8s |
| 3 | 8s | 8.5s | 11.5s | 12s |

**Configuration:**
- Fade-in duration: 0.5s
- Visible time: 3.0s
- Fade-out duration: 0.5s
- Total per caption: 4.0s

### Animation Synchronization

Animations are synchronized with captions:

```dsl
caption 1 "Starting the search"
animate highlight [0, 1, 2, 3, 4]  # Starts 0.5s after caption 1
caption 2 "Checking the middle element"
animate select [2]                  # Starts 0.5s after caption 2
```

**Timing Rules:**
- Animations start 0.5s after caption becomes visible
- Duration: 1.5s for element animations, 1.0s for pointer moves
- No overlap between different caption phases

## Canvas Coordinate System

The canvas uses a center-origin coordinate system:

### Coordinate System
- **Center**: (0, 0)
- **Canvas Size**: 1920×1080 pixels
- **X-axis**: -960 (left) to +960 (right)
- **Y-axis**: -540 (top) to +540 (bottom)

### Element Positioning
- **Array cells**: Centered at y=0
- **Captions**: Bottom area (y=400)
- **Headings**: Top area (y=-400)
- **Pointers**: Above target cells (y=targetY-50)

### Z-Index Layering
- **Array cells**: 1-2
- **Array indices**: 5
- **Pointers**: 3-4
- **Captions/Text**: 10-15

## Processing Flow

The DSL processing system follows a clear pipeline:

```
DSL Text Input
      ↓
   Compiler
   (Parse DSL → Actions)
      ↓
   Executor
   (Actions → Canvas Elements)
      ↓
   Timeline Manager
   (Calculate Timing)
      ↓
   Canvas Elements
   (Groups + Elements + Animations)
```

### Step-by-Step Process

1. **Parsing Phase**
   - DSL text is parsed line by line
   - Each command becomes an Action object
   - Syntax validation and error checking

2. **Preprocessing Phase**
   - Count content types (captions, animations, etc.)
   - Initialize timeline manager with counts
   - Calculate maximum widths for alignment

3. **Element Creation Phase**
   - Process setup commands (seed, style)
   - Create array cells with indices
   - Generate text elements (captions, headings, etc.)
   - Create pointer indicators

4. **Animation Phase**
   - Apply element animations (highlight, select, etc.)
   - Create pointer animations (pointer, move)
   - Synchronize with caption timing

5. **Timeline Generation**
   - Calculate start/end times for all elements
   - Apply fade-in/fade-out animations
   - Ensure no timing conflicts

### Key Components

#### Compiler (`compiler.ts`)
- Parses DSL syntax into Action objects
- Handles different command types
- Validates syntax and parameters

#### Executor (`executor.ts`)
- Converts Actions into canvas elements
- Manages element positioning
- Applies animations and timing

#### Timeline Manager (`timeline-manager.ts`)
- Calculates timing for all elements
- Manages sequential caption display
- Handles animation synchronization

## Examples

### Binary Search Visualization

```dsl
setup seed=42 style=auto

draw_array [1, 3, 5, 7, 9, 11, 13, 15]

heading "Binary Search Algorithm"

caption 1 "We start with a sorted array and two pointers"
animate pointer [0, 7]

caption 2 "Calculate the middle index"
animate move [3, 3]

caption 3 "Compare middle element with target"
animate highlight [3]

caption 4 "Target found! Return the index"
animate select [3]
```

### Two-Pointer Technique

```dsl
setup seed=123 style=Minimal

draw_array [2, 7, 11, 15, 20, 25, 30]

heading "Two-Pointer Technique"

caption 1 "Initialize pointers at both ends"
animate pointer [0, 6]

caption 2 "Move pointers based on comparison"
animate move [1, 5]

caption 3 "Continue until pointers meet"
animate move [2, 4]

caption 4 "Pointers have crossed - search complete"
animate highlight [2, 3, 4]
```

### Sorting Algorithm

```dsl
setup seed=456 style=auto

draw_array [64, 34, 25, 12, 22, 11, 90]

heading "Bubble Sort Visualization"

caption 1 "Compare adjacent elements"
animate compare [0, 1]

caption 2 "Swap if out of order"
animate highlight [0, 1]

caption 3 "Move to next pair"
animate compare [1, 2]

caption 4 "Continue through the array"
animate highlight [1, 2]
```

## Best Practices

### DSL Writing

#### Do's
- ✅ Use sequential caption orders (1, 2, 3...)
- ✅ Keep captions concise and clear
- ✅ Align animations with caption content
- ✅ Use meaningful pointer labels
- ✅ Test timing synchronization

#### Don'ts
- ❌ Skip caption orders
- ❌ Overlap caption timing
- ❌ Use overly long captions
- ❌ Mix different timing patterns
- ❌ Forget to close quotes

### Animation Design

#### Effective Patterns
- **Progressive revelation**: Show one concept at a time
- **Visual hierarchy**: Use different animation types for different purposes
- **Consistent timing**: Maintain predictable animation timing
- **Clear transitions**: Smooth between different states

#### Common Mistakes
- Too many simultaneous animations
- Inconsistent pointer labeling
- Rushed timing that doesn't match content
- Overlapping visual elements

### Performance Considerations

- **Element count**: Limit to reasonable array sizes (< 20 elements)
- **Animation duration**: Keep animations under 2 seconds
- **Pointer count**: Use 1-3 pointers maximum for clarity
- **Text length**: Keep captions under 100 characters

## Implementation Details

### Parser Architecture

The DSL processing system consists of:

1. **Compiler** (`compiler.ts`): Parses DSL text into Action objects
2. **Executor** (`executor.ts`): Converts Actions into canvas elements
3. **Timeline Manager** (`timeline-manager.ts`): Handles timing and synchronization

### Element Creation

Elements are created through builder functions:

- `makeCell()`: Creates array cells with indices
- `makePointer()`: Creates pointer indicators
- Text elements: Created inline for captions, headings, etc.

### Animation System

Animations are applied through the procedural animation system:

- **Element animations**: Applied to individual elements
- **Group animations**: Applied to entire cell groups
- **Pointer animations**: Special handling for pointer movement

### Error Handling

The system includes comprehensive error handling:

- Invalid DSL syntax
- Missing required parameters
- Animation timing conflicts
- Element positioning errors

### Technical Deep Dive

#### Pointer Implementation

**Data Structures:**
```typescript
interface PointerGroup {
  id: string;
  name: string;
  elementIds: string[];
  animations: ElementAnimation[];
  x: number;
  y: number;
  opacity: number;
}

interface TriangleElement {
  type: "triangle";
  fill: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // ... other properties
}
```

**Pointer Creation Algorithm:**
1. Parse target indices from DSL
2. Find corresponding array cell positions
3. Calculate pointer position (50px above cell)
4. Create triangle element with gold color
5. Create label text element
6. Group elements together
7. Apply fade-in animation

**Pointer Movement Algorithm:**
1. Find existing pointer groups by name pattern
2. Calculate new target positions
3. Apply move animation to group
4. Maintain element relationships

#### Canvas Coordinate System

**Center-Origin System:**
- Origin (0,0) at canvas center
- X: -960 to +960 (left to right)
- Y: -540 to +540 (top to bottom)
- All elements positioned relative to center

**Element Positioning:**
```typescript
// Array cells
const arrayY = 0; // Center row
const centerXs = computeCenteredXPositions(length, stepX, canvasWidth, marginX);

// Pointers
const pointerY = targetY - (cellHeight / 2) - 50; // 50px above cell
const pointerX = targetX; // Center horizontally with cell

// Captions
const captionY = 400; // Bottom area
const captionX = 0; // Center horizontally
```

#### Animation Timing System

**Timeline Calculation:**
```typescript
// Caption timing
const totalDuration = fadeInDuration + visibleTime + fadeOutDuration;
const startTime = (order - 1) * totalDuration;

// Animation timing
const animationStartTime = captionStartTime + 0.5; // 0.5s after caption
```

**Animation Types:**
- `fade`: Opacity changes
- `move`: Position changes
- `scale`: Size changes
- `color`: Color changes

#### Memory Management

**Element Tracking:**
- Elements stored in flat array
- Groups contain element IDs
- Animations reference elements by ID
- UUIDs for unique identification

**Cleanup:**
- No explicit cleanup needed
- Elements removed when groups fade out
- Timeline manager handles animation lifecycle

### Performance Considerations

**Optimization Strategies:**
- Batch element creation
- Reuse animation configurations
- Limit simultaneous animations
- Use efficient data structures

**Scalability Limits:**
- Maximum 20 array elements recommended
- Maximum 3 pointers simultaneously
- Caption text under 100 characters
- Animation duration under 2 seconds

### Testing Strategy

**Unit Tests:**
- DSL parsing accuracy
- Element creation correctness
- Animation timing precision
- Error handling coverage

**Integration Tests:**
- End-to-end DSL processing
- Canvas element rendering
- Animation synchronization
- Performance benchmarks

**Visual Tests:**
- Screenshot comparisons
- Animation smoothness
- Layout consistency
- Cross-browser compatibility

## Troubleshooting

### Common Issues

**Captions not appearing:**
- Check caption order is sequential
- Verify quote marks are properly closed
- Ensure no timing conflicts

**Pointers not moving:**
- Verify pointer was created with `animate pointer`
- Check target indices exist in array
- Ensure move command targets correct pointer

**Animations out of sync:**
- Check caption timing configuration
- Verify animation start times
- Ensure no overlapping animations

### Debug Tips

- Use simple test cases first
- Check console for parsing errors
- Verify element positioning with coordinates
- Test timing with shorter durations

---

This guide covers the complete DSL processing system. For specific implementation details, refer to the source code in `src/services/pipeline/dsl/`.
