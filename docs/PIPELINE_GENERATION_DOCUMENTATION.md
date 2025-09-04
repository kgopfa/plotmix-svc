# Pipeline Generation Documentation

## Overview

The PlotMix pipeline generation system transforms abstract educational prompts into interactive visualizations through a multi-stage LLM pipeline. This document describes the complete flow from user prompt to final rendered output.

## Architecture Overview

The complete pipeline consists of **seven stages**:

### LLM Pipeline (4 stages)
1. **Content Planner** (LLM #1) - Converts abstract prompt to structured content plan
2. **Visual Planner** (LLM #2) - Transforms content plan into scene structure
3. **Animation Planner** (LLM #3) - Creates step-by-step animation sequences
4. **DSL Emitter** (LLM #4) - Generates domain-specific language (DSL) commands

### Processing Pipeline (3 stages)
5. **DSL Compilation** - Parses DSL commands into structured Action objects
6. **DSL Execution** - Generates UI elements and animations from Action program
7. **Project Creation** - Stores the generated scene as a project in the database

The complete flow transforms a user prompt into a fully functional canvas project with animations, ready for rendering.

## Stage 1: Content Planner

### Purpose
Converts abstract educational prompts into structured content plans with clear problem definitions, approaches, and visual requirements.

### Input
- Abstract prompt (e.g., "Explain binary search algorithm")

### Output
Structured JSON with:
- **Problem**: Title, description, and example
- **Approaches**: Naive and optimal solutions with complexity analysis
- **Edge Cases**: Potential failure scenarios
- **Visual Requirements**: Arrays and animations needed for visualization

### Key Features
- Enforces strict JSON schema validation
- Distinguishes between actual data arrays and explanatory content
- Defines animation types (highlight, select, focus, compare)
- Supports educational content types: algorithms, data structures, mathematical concepts, etc.

### Example Output
```json
{
  "problem": {
    "title": "Binary Search Algorithm",
    "description": "Efficiently finds target value in sorted array by dividing search space in half",
    "example": "Find 5 in [1,3,5,7,9]"
  },
  "approaches": {
    "optimal": {
      "title": "Binary Search",
      "description": "Divide and conquer approach",
      "complexity": "Time: O(log n), Space: O(1)",
      "keyIdeas": ["Two pointers", "Mid calculation", "Search space reduction"]
    }
  },
  "visualRequirements": {
    "arrays": [
      {
        "values": [1,3,5,7,9],
        "purpose": "Input example"
      }
    ],
    "animations": [
      {
        "type": "highlight",
        "elements": [0,4],
        "purpose": "Search range"
      }
    ]
  }
}
```

## Stage 2: Visual Planner

### Purpose
Converts content plans into scene structure with sections, text content, and visual elements.

### Input
- Content plan from Stage 1

### Output
Scene plan JSON with:
- **Seed**: Random seed for procedural generation
- **Style**: Visual theme (auto or specific style)
- **Sections**: Content sections with text, bullets, keyIdeas, complexity, and visuals

### Key Features
- Focuses on content structure, not positioning
- Separates actual data arrays from explanatory text
- Defines visual elements for procedural layout
- Handles different content types:
  - **text**: Paragraph content
  - **bullets**: Concept lists and key points
  - **keyIdeas**: Algorithm steps and core concepts
  - **complexity**: Time/space complexity information
- Supports bullets for concept lists and keyIdeas for algorithm steps

### Example Output
```json
{
  "seed": 42,
  "style": "auto",
  "sections": [
    {
      "id": "intro",
      "title": "Binary Search Algorithm",
      "text": "Efficiently finds target value in sorted array",
      "bullets": ["Divide and conquer approach", "Logarithmic time complexity"],
      "keyIdeas": ["Two pointers", "Mid calculation", "Search space reduction"],
      "complexity": "Time: O(log n), Space: O(1)",
      "visuals": [
        {
          "kind": "array",
          "values": [1,3,5,7,9],
          "purpose": "Input example"
        }
      ]
    }
  ]
}
```

## Stage 3: Animation Planner

### Purpose
Creates step-by-step animation sequences for algorithm explanations.

### Input
- Scene plan from Stage 2
- Content plan from Stage 1

### Output
Animation plan with:
- **Algorithm**: Algorithm name
- **Steps**: Sequential animation steps with timing
- **Timing**: Total duration and step timing

### Key Features
- Defines logical animation sequences
- Maps animations to specific array elements
- Supports animation types: highlight, select, focus, compare
- Ensures animations tell a clear story

### Example Output
```json
{
  "algorithm": "binary search",
  "steps": [
    {
      "id": "step1",
      "description": "Start with entire array",
      "targetElements": [0,4],
      "animationType": "highlight",
      "explanation": "Compare middle element with target"
    }
  ],
  "timing": {
    "totalSteps": 3
  }
}
```

## Stage 4: DSL Emitter

### Purpose
Translates scene plans and animation plans into domain-specific language (DSL) commands.

### Input
- Scene plan from Stage 2
- Animation plan from Stage 3

### Output
DSL program with commands for:
- **Setup**: Seed and style configuration
- **Content**: Headings, subtitles, explanations, approaches, examples
- **Visuals**: Array definitions with gap spacing and cell size
- **Animations**: Step-by-step animation commands
- **Captions**: Synchronized text explanations
- **Conclusions**: Complexity analysis and use cases

### Key Features
- Enforces strict DSL syntax
- Uses 0-based array indices for animations
- Automatically handles timing and transitions
- Supports caption synchronization with animations
- Supports array gap spacing and cell size customization
- Handles ordered content (approach, conclusion) with sequential numbering

### DSL Syntax Reference

The DSL supports the following commands:

```dsl
# Setup commands
seed <int>                    # Random seed for procedural generation
style <auto|Minimal|Monospace|...>  # Visual theme

# Content commands
heading "<title>"             # Main title
subtitle "<description>"       # Brief description
explanation "<text>"          # General concept explanation
approach <order> "<text>"     # Step-by-step breakdown
example "<text>"             # Problem example with target

# Visual commands
array [v1,v2,v3] gap <int> cell <int>  # Array with spacing and cell size
animate <type> [elements]     # Animation with 0-based indices

# Timing commands
caption <order> "<text>"      # Synchronized text explanations
conclusion <order> "<text>"   # Complexity analysis and use cases
```

**Animation Types:**
- `highlight`: Show ranges or areas being processed
- `select`: Emphasize specific elements (stronger than focus)
- `focus`: Draw attention to current element being examined
- `compare`: Show elements being compared side-by-side

**Array Parameters:**
- `gap <int>`: Spacing between array cells (default: 80)
- `cell <int>`: Cell size in pixels (default: style-based)

### Example DSL Output
```dsl
seed 42
style auto

heading "Binary Search Algorithm"
subtitle "Finding target value in sorted array"
explanation "The binary search algorithm efficiently finds a target value within a sorted array by repeatedly dividing the search interval in half."
approach 1 "Binary search is implemented using 2 boundary pointers, start and end"
approach 2 "The boundary pointers are used to find the mid position"
example "Given a sorted array [1, 3, 5, 7, 9] and a target value of 5, the algorithm will find the target in 3 steps."
array [1,3,5,7,9] gap 80 cell 100
animate highlight [0,4]
caption 1 "Start with the entire sorted array as our search range"
animate focus [2]
caption 2 "Find the middle element (5) and compare it with our target (5)"
conclusion 1 "Time Complexity: O(log n)"
conclusion 2 "Space Complexity: O(1)"
conclusion 3 "Use Case: Searching in sorted arrays"
```

## DSL Compilation and Execution

### DSL Compiler

The `DslCompiler` parses DSL commands into structured actions:

- **SETUP**: Seed and style configuration
- **DRAW_ARRAY**: Array visualization with values, gap spacing, and cell size
- **ANIMATE**: Animation commands with type and target elements
- **CAPTION**: Text explanations with timing
- **HEADING**: Main title text
- **SUBTITLE**: Brief description text
- **EXPLANATION**: General concept explanation
- **APPROACH**: Step-by-step breakdown with order
- **EXAMPLE**: Problem example with target value
- **CONCLUSION**: Complexity analysis and use cases with order

### DSL Executor

The `execute()` function processes the action program to create the final scene:

1. **Setup Processing**: Configures seed and style
2. **Content Generation**: Creates text elements with proper positioning
3. **Array Rendering**: Generates visual array elements with cells, gap spacing, and cell sizing
4. **Animation Setup**: Configures animation timelines
5. **Timing Management**: Synchronizes captions and animations

**Array Processing Details:**
- **Cell Dimensions**: Automatically calculated based on content and style
- **Gap Spacing**: Configurable spacing between array cells (default: 80px)
- **Cell Sizing**: Custom cell size override (default: style-based)
- **Positioning**: Center-origin positioning with symmetric spacing
- **Text Rendering**: Dynamic text sizing within cells with overflow handling

## Stages 5-7: Processing Pipeline

After the LLM pipeline generates DSL commands, the system continues with three additional processing stages:

### Stage 5: DSL Compilation

The `DslCompiler` parses DSL commands into structured `Action` objects:

```typescript
// DSL command: array [1,3,5,7,9] gap 80 cell 100
// Becomes:
{
  kind: "DRAW_ARRAY",
  values: [1, 3, 5, 7, 9],
  gap: 80,
  cell: 100
}

// DSL command: animate highlight [0,4]
// Becomes:
{
  kind: "ANIMATE",
  type: "highlight",
  elements: [0, 4],
  startTime: 0,
  duration: 2
}
```

### Stage 6: DSL Execution

The `execute(program)` function processes the compiled Action program to create a `Scene`:

```typescript
// In orchestrator.ts
const program = DslCompiler.compile(dsl);  // Stage 5: Compilation
const scene = execute(program);            // Stage 6: Execution
```

#### Execution Process

The `execute()` function performs a **two-pass execution**:

**First Pass: Setup and Timing**
- **Setup Processing**: Configures seed and style pack from SETUP actions
- **Caption Timing**: Creates caption text elements with fade-in/fade-out animations
- **Timeline Management**: Initializes timing for all content sections

**Second Pass: Content Generation**
- **Array Elements**: Creates visual array cells with rectangles and text
- **Text Elements**: Generates headings, subtitles, explanations, approaches, examples, conclusions
- **Animation Setup**: Configures animation timeline entries
- **Group Organization**: Groups related elements together

#### Execution Flow
1. **Program Input**: ActionProgram (compiled DSL commands)
2. **Element Generation**: Creates Rect and TextEl objects with proper positioning
3. **Animation Configuration**: Sets up animation timelines and properties
4. **Scene Assembly**: Combines elements, groups, and timeline into final Scene
5. **Element Validation**: Validates generated elements against schema requirements

### UI Element Creation Details

The `execute()` function creates UI elements through the two-pass execution system:

#### Element Creation Details

**Array Cells**: Each array value becomes a cell group containing:
```typescript
// Rectangle element (cell background)
{
  type: "rectangle",
  x: centerX, y: centerY,
  width: cellWidth, height: cellHeight,
  fill: style.cell.fill,
  stroke: style.cell.stroke,
  animations: [] // Fade-in/out animations
}

// Text element (cell content)
{
  type: "text",
  x: centerX, y: centerY,
  text: value.toString(),
  fontSize: style.typography.size,
  fontFamily: style.typography.family,
  animations: []
}
```

**Text Elements**: Content elements with automatic positioning:
- **Headings**: Top of canvas (y = -400), bold, large font
- **Subtitles**: Below headings, normal weight
- **Explanations**: Between subtitle and approach
- **Approaches**: Sequential numbered steps
- **Examples**: Before array content
- **Captions**: Bottom of canvas (y = 400), synchronized with animations
- **Conclusions**: After animations, grouped in pairs

### Stage 7: Project Creation

The generated scene becomes the project's `mainState` and is stored in the database:

```typescript
interface ProjectMainState {
  elements: CanvasElement[];    // Visual elements (rectangles, text, etc.)
  groups: CanvasGroup[];        // Element groupings
  timeline: Timeline;           // Animation timeline data
  dimensions: {
    width: number;              // Canvas width (1920)
    height: number;             // Canvas height (1080)
  };
}
```

#### Database Storage Process

1. **Project Creation**: `ProjectService.createProject()` creates the database record
2. **Data Structure**: Project stored with mainState, configuration, and metadata
3. **User Association**: Project linked to authenticated user
4. **Version Control**: Initial version 1.0.0 assigned
5. **Source Tracking**: Project marked as 'GENERATED' or 'DSL_GENERATED'

### Example Project Structure

```json
{
  "id": "project_123",
  "name": "Binary Search Algorithm",
  "mainState": {
    "elements": [
      {
        "id": "rect_1",
        "type": "rectangle",
        "x": 0,
        "y": 0,
        "width": 100,
        "height": 100,
        "fill": "#d9e194",
        "animations": []
      },
      {
        "id": "text_1",
        "type": "text",
        "x": 0,
        "y": -200,
        "text": "Binary Search Algorithm",
        "fontSize": 60,
        "animations": []
      }
    ],
    "groups": [
      {
        "id": "group_1",
        "name": "Array Cell 0",
        "elementIds": ["rect_1", "text_0"],
        "x": 0,
        "y": 0
      }
    ],
    "timeline": {
      "scale": 100,
      "duration": 1,
      "currentTime": 0,
      "animationStates": {}
    },
    "dimensions": {
      "width": 1920,
      "height": 1080
    }
  },
  "configuration": {
    "canvasSize": { "currentSizeId": "hd" },
    "ui": { "zoom": 1, "selectedElements": [] }
  },
  "version": "1.0.0",
  "userId": "user_456"
}
```

### Procedural Generation

The system uses procedural generation for:

- **Layout**: Automatic positioning using grid-based system
- **Styling**: Theme-consistent colors, fonts, and spacing
- **Animations**: Procedurally generated animation properties
- **Timing**: Automatic calculation of animation and caption timing

#### Layout System
- **Center-Origin Positioning**: All elements positioned relative to canvas center (0,0)
- **Grid-Based Layout**: Automatic spacing and alignment using mathematical calculations
- **Symmetric Array Positioning**: Arrays centered with equal spacing between cells
- **Dynamic Text Sizing**: Text width calculated based on content and font metrics

#### Cell Generation
```typescript
// Optimal cell dimensions calculation
function calculateOptimalCellDimensions(values, style, minCellSize) {
  const longestValue = values.reduce((longest, current) => 
    String(current).length > longest.length ? String(current) : longest, '');
  
  const charWidth = style.typography.family.includes('monospace') ? 0.6 : 0.7;
  const estimatedTextWidth = longestValue.length * style.typography.size * charWidth;
  const textWidthWithPadding = estimatedTextWidth * 1.4;
  
  const optimalWidth = Math.max(minCellSize, Math.ceil(textWidthWithPadding));
  const optimalHeight = Math.max(minCellSize, Math.ceil(style.typography.size * 1.2 * 1.4));
  
  return { width: optimalWidth, height: optimalHeight };
}
```

## Canvas Coordinate System

The system uses a center-origin coordinate system:

- **Canvas Size**: 1920x1080 pixels
- **Center**: (0, 0)
- **Left Edge**: x = -960
- **Right Edge**: x = 960
- **Top Edge**: y = -540 (negative Y is up)
- **Bottom Edge**: y = 540 (positive Y is down)

### Quadrants
- **Top-Left**: (-x, -y)
- **Top-Right**: (+x, -y)
- **Bottom-Left**: (-x, +y)
- **Bottom-Right**: (+x, +y)

## Animation System

### Animation Types

1. **highlight**: Shows ranges or areas being processed
2. **select**: Emphasizes specific elements (stronger than focus)
3. **focus**: Draws attention to current element being examined
4. **compare**: Shows elements being compared side-by-side

### Timing System

- **Caption Timing**: Each caption gets 4s total (0.5s fade-in + 3s visible + 0.5s fade-out)
- **Animation Timing**: Automatically synchronized with captions
- **Conclusion Timing**: Appears after all animations complete

### Animation Properties

Animations are procedurally generated based on:
- **Seed**: Ensures consistent theming
- **Style Pack**: Theme-appropriate colors and effects
- **Element Type**: Different properties for different animation types

### Animation Creation Process

The system creates animations through a sophisticated timing and configuration system:

#### Animation Configuration
```typescript
// Procedurally generated animation config
const animConfig = getAnimationConfig(seed, animationType);
{
  type: "color" | "scale",
  properties: { 
    fill: "#ff0000",     // For color animations
    scaleX: 1.2,        // For scale animations
    scaleY: 1.2
  },
  duration: 1.5,
  easing: "power1.inOut",
  yoyo: false,
  repeat: 0
}
```

#### Animation Application
- **Color Animations**: Applied to individual rectangle elements (background color changes)
- **Scale Animations**: Applied to groups (entire cell scaling)
- **Timing**: Synchronized with captions (starts 0.5s after caption becomes visible)
- **Targeting**: Uses 0-based array indices to find correct elements

#### Animation Types Implementation
- **highlight**: Color animation to background fill
- **select**: Scale animation to group (stronger emphasis)
- **focus**: Scale animation to group (subtle emphasis)
- **compare**: Color animation to background fill (side-by-side comparison)

#### Timeline Management
- **Caption Timing**: Each caption gets 4s total (0.5s fade-in + 3s visible + 0.5s fade-out)
- **Animation Timing**: Starts 0.5s after caption fade-in, duration 1.5s
- **Array Fade-out**: Occurs after last caption, before conclusions
- **Conclusion Timing**: Appears after all animations complete

## Style System

### Style Packs

The system supports multiple visual themes:

- **Minimal**: Clean, simple design with rounded corners
- **Monospace**: Technical, code-like appearance
- **Compact**: Space-efficient layout
- **Auto**: Automatically selected based on seed

### Style Properties

Each style pack defines:
- **Cell**: Dimensions, colors, stroke properties
- **Shadow**: Shadow effects and properties
- **Palette**: Color scheme for fills, strokes, text
- **Typography**: Font family, size, weight, alignment

## Error Handling and Validation

### Pipeline Validation

1. **Content Validation**: Ensures content plans match expected schema
2. **Scene Validation**: Validates scene structure and relationships
3. **Element Validation**: Validates generated elements against schema
4. **Timeline Validation**: Ensures proper animation timing

### Error Recovery

- **Stage Failures**: Pipeline stops and returns error with stage information
- **DSL Compilation**: Invalid DSL commands are logged and skipped
- **Element Generation**: Invalid elements trigger validation errors
- **Animation Timing**: Conflicting timing is automatically resolved

## Performance Considerations

### Rate Limiting

- **LLM Calls**: 1-second minimum interval between API calls
- **Batch Processing**: Content is processed in stages to manage API usage
- **Caching**: Generated content can be cached for repeated requests

### Optimization

- **Procedural Generation**: Deterministic output based on seed
- **Grid Layout**: Efficient positioning using mathematical calculations
- **Animation Batching**: Grouped animations for better performance

## Integration Points

### LLM Integration

- **Provider**: OpenAI with configurable models per stage
- **Temperature**: Low temperature (0.0-0.1) for consistent output
- **JSON Mode**: Enforced for structured output where needed

### Database Integration

- **Project Storage**: Generated scenes stored as project mainState
- **Version Control**: Changes tracked with jsondiffpatch
- **User Management**: Projects associated with authenticated users

### Rendering Integration

- **Canvas Rendering**: Final scene rendered by frontend canvas system
- **Animation Playback**: Timeline-based animation system
- **Export**: Scenes can be exported as video or static images

## Future Enhancements

### Planned Features

1. **Multi-dimensional Arrays**: Support for 2D and 3D data structures
2. **Advanced Animations**: Complex animation sequences and transitions
3. **Interactive Elements**: Clickable elements and user interactions
4. **Audio Integration**: Synchronized audio explanations
5. **Real-time Collaboration**: Multi-user editing and viewing

### Scalability Improvements

1. **Parallel Processing**: Concurrent LLM calls for faster generation
2. **Caching Layer**: Intelligent caching of common content patterns
3. **Template System**: Reusable content templates for common algorithms
4. **Custom DSL Extensions**: User-defined DSL commands and functions
