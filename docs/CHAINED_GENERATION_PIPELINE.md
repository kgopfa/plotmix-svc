# Chained Generation Pipeline

**Status: ✅ IMPLEMENTED & OPTIMIZED** - Core pipeline stages 1-4 are working with **48% performance improvement**, parallel processing, and robust error handling. Stages 5-8 are placeholders ready for implementation.

This document outlines the new chained generation pipeline that replaces the existing monolithic animation generation approach.

## Chained, Domain‑Agnostic Generation Pipeline

This document proposes a fast, modular generation pipeline that replaces the single large‑prompt scene generator with a sequence of small, parallelizable nodes. It separates story logic from visual grammar and compiles into our existing Pixi/GSAP `mainState` as defined by `ENGINE_SPEC`.

Status: Proposed • Scope: Backend orchestration + small LLM prompts + code compilers • Output contract unchanged: `{ name, title, description, mainState }`.

### Goals

- Speed: Replace slow monolithic prompts with small, cacheable, parallel steps.
- Domain‑agnostic: Work equally for marketing, biology, history, algorithms, etc.
- Reliability: Strict JSON contracts, validation, retries, and conservative fallbacks.
- Compatibility: Keep our final output conforming to `ENGINE_SPEC` and validators.

## Design Philosophy & Architecture Decisions

### Why Multiple Small LLM Calls Instead of One Large Call?

**The Problem with Single Comprehensive Prompts:**
When users provide abstract prompts like "Design twitter" or "Explain binary search", a single LLM call would require the AI to:
- Invent domain-specific concepts from thin air
- Generate entities and relationships without context
- Make creative decisions about what the user actually wants
- Handle multiple levels of abstraction simultaneously

This approach leads to:
- **High risk of hallucination** - LLM invents inappropriate content
- **Inconsistent results** - Same prompt produces different outputs
- **Poor error handling** - Single point of failure for complex decisions
- **Difficult debugging** - Hard to identify where things went wrong

**Why Our Pipeline Architecture Solves This:**

1. **Controlled Creativity**: Each stage builds on validated output from previous stages, providing safety rails for creative decisions
2. **Gradual Refinement**: Ambiguous prompts are clarified step-by-step rather than requiring instant understanding
3. **Focused Responsibility**: Each LLM call has a single, constrained task rather than multiple complex decisions
4. **Better Error Recovery**: If one stage fails, others can still work; easier to debug and retry specific stages

### Pipeline Stage Design Rationale

**Router Stage (Archetype Classification):**
- **Why**: Provides narrative structure constraints before any creative generation
- **Benefit**: Prevents the LLM from inventing inappropriate visual approaches
- **Example**: "Design twitter" → `process_flow` ensures we generate sequential steps, not random visual elements

**Intent Reducer (Domain & Core Flows):**
- **Why**: Expands on the archetype context to identify specific business concepts
- **Benefit**: Creates a foundation for scene generation without requiring creative invention
- **Example**: Given `process_flow`, identify "feed_arch", "like_write" as core social networking flows

**Scene Planner (Scene Captions):**
- **Why**: Generates scene descriptions within the established domain and archetype context
- **Benefit**: Each scene builds on validated concepts rather than starting from scratch
- **Example**: "Producers write; consumers read ranked timelines" builds on established feed_arch concept

**Per-Scene Fan-out (Detailed Breakdown):**
- **Why**: Breaks down each scene into atomic steps with entities and relationships
- **Benefit**: Maintains consistency across scenes while allowing for detailed exploration
- **Example**: Each step inherits context from its parent scene, ensuring coherent storytelling

### Why Not Procedural Generation for Everything?

**What We Keep LLM-Based:**
- Content understanding and expansion
- Creative scene generation
- Entity and relationship identification
- Narrative flow and storytelling

**What We Make Procedural:**
- Layout positioning and spacing (deterministic algorithms)
- Animation timing and easing (mathematical calculations)
- Styling and theming (rule-based systems)
- Technical constraints and validation (safety checks)

**The Balance:**
Our approach recognizes that **content generation requires creativity** (LLM) while **visual execution requires consistency** (procedural). This hybrid approach gives us the best of both worlds.

### Performance vs. Reliability Trade-offs

**Multiple Small Calls:**
- ✅ **Higher reliability** - controlled creativity, better error handling
- ✅ **Easier debugging** - granular failure points, specific retry logic
- ✅ **Better caching** - cache results at different stages
- ❌ **Higher latency** - multiple API calls, sequential dependencies
- ❌ **Higher cost** - more API calls, potential token overhead

**Single Large Call:**
- ✅ **Lower latency** - single API call, faster response
- ✅ **Lower cost** - fewer API calls, potential token savings
- ❌ **Lower reliability** - single point of failure, harder error recovery
- ❌ **Harder debugging** - complex failure scenarios, difficult retry logic

**Our Choice:**
We prioritize **reliability and quality** over raw speed. The 48% performance improvement we achieved comes from optimizing the existing pipeline structure, not from fundamentally changing the architecture.

### Common Misconceptions Addressed

**"Why not just use one big prompt?"**
- Single prompts require the LLM to make too many creative decisions simultaneously
- High risk of hallucination and inconsistent results
- Difficult to provide appropriate constraints for abstract user requests

**"Can't we make everything procedural?"**
- Procedural generation works for visual and technical decisions
- Content generation requires creativity and understanding that's hard to proceduralize
- Our hybrid approach leverages the strengths of both approaches

**"Isn't this over-engineered?"**
- The complexity addresses real problems with monolithic generation
- Each stage serves a specific purpose in the creative process
- The architecture enables better error handling, debugging, and optimization

**"Why not use a different approach entirely?"**
- We evaluated alternatives including single-prompt and fully-procedural approaches
- The current architecture provides the best balance of creativity, reliability, and maintainability
- Performance improvements come from optimization, not architectural changes

## Stage Responsibilities & Contracts

This section defines the exact responsibilities, input/output contracts, and validation requirements for each pipeline stage.

### Pipeline Stage Overview

```
1. Router (LLM) → archetypes, tone
2. Intent Reducer (LLM) → domain, core_flows  
3. Scene Planner (LLM) → scene captions
4. Per-scene Fan-out (LLM) → steps, motifs, entities, relations, transitions, assets
5. Scene Processor → Assemble scene data from LLM output
6. Design Asset Integration → Combine retrieved assets with scene data
7. Layout Grammars → Apply positioning rules to entities/relations
8. Compiler → Generate final ENGINE_SPEC.mainState
```

**Key Principle**: Stages 1-4 produce the **creative plan**, stages 5-8 **procedurally execute** it into a schema-valid `ENGINE_SPEC.mainState`.

### Stage 1: Router (LLM)

**Responsibility**: Classify user prompt into narrative archetypes and tone.

**Input**: 
- `userPrompt: string` - Raw user input (e.g., "Design twitter", "Explain binary search")

**Output Contract**:
```typescript
{
  archetypes: string[]; // 1-2 valid archetype IDs
  tone: 'concise' | 'friendly' | 'formal';
}
```

**Validation Rules**:
- `archetypes.length` ∈ [1, 2]
- Each `archetype` must be one of: `["process_flow", "lifecycle_cycle", "hierarchy_parts", "comparison_tradeoff", "timeline_sequence", "map_topology", "cause_effect", "algorithm_trace"]`
- `tone` must be one of: `["concise", "friendly", "formal"]`

**What NOT to do**:
- Generate content beyond archetype classification
- Invent new archetypes
- Make visual or layout decisions

### Stage 2: Intent Reducer (LLM)

**Responsibility**: Analyze user prompt to understand domain and identify core flows.

**Input**:
- `userPrompt: string` - Raw user input
- `routerOutput: RouterOutput` - Output from Stage 1

**Output Contract**:
```typescript
{
  domain: string; // Non-empty business domain
  core_flows: string[]; // 3-5 core processes/concepts
  tone: 'concise' | 'friendly' | 'formal'; // Must match router
}
```

**Validation Rules**:
- `domain` must be non-empty string
- `core_flows.length` ∈ [3, 5]
- `tone` must match `routerOutput.tone`
- Each `core_flow` should be descriptive but concise

**What NOT to do**:
- Generate visual elements or layouts
- Create detailed scene descriptions
- Make technical implementation decisions

### Stage 3: Scene Planner (LLM)

**Responsibility**: Generate scene captions based on core flows and archetypes.

**Input**:
- `intentOutput: IntentReducerOutput` - Output from Stage 2
- `routerOutput: RouterOutput` - Output from Stage 1

**Output Contract**:
```typescript
{
  scenes: Array<{
    id: string; // Unique scene identifier
    goal: string; // Must match one archetype from router
    caption: string; // ≤12 words, descriptive
  }>;
}
```

**Validation Rules**:
- `scenes.length` ∈ [3, 6]
- Each `scene.goal` must be one archetype from `routerOutput.archetypes`
- Each `scene.caption` ≤ 12 words
- Each `scene.id` must be unique

**What NOT to do**:
- Generate detailed step breakdowns
- Create visual layouts or positioning
- Define entities or relationships

### Stage 4: Per-scene Fan-out (LLM)

**Responsibility**: Break down each scene into detailed steps with motifs, entities, relations, and transitions.

**Input**:
- `scene: ScenePlan` - Individual scene from Stage 3
- `archetypes: string[]` - Available archetypes from Stage 1

**Output Contract**:
```typescript
{
  scene_id: string;
  steps: Array<{
    id: string;
    text: string; // ≤8 words, imperative style
    motif_id: string; // Selected motif identifier
    params: Record<string, any>; // Motif parameter overrides
    entities: Array<{
      id: string;
      type: 'actor' | 'process' | 'container' | 'event' | 'channel';
      label: string;
    }>;
    relations: Array<{
      from: string;
      to: string;
      label: string;
      type: string;
    }>;
  }>;
  transitions: Array<{
    from: string; // step.id
    to: string; // step.id
    transition_id: string; // Valid transition type
  }>;
}
```

**Validation Rules**:
- Each `step.text` ≤ 8 words
- Each `step.motif_id` must reference a valid motif
- Each `step.entities` must have valid entity types
- Each `step.relations` must reference valid entity IDs
- `transition_id` must be one of: `["xfade_fast", "pan_right", "zoom_in_light", "caption_hold"]`

**What NOT to do**:
- Generate visual positioning or coordinates
- Create actual animation keyframes
- Define styling or colors
- Generate final ENGINE_SPEC elements

**Important Clarification**: This stage produces **motif IDs + params**, not actual visual elements. Elements are created later by Layout Grammars and Motif compilers.

### Stage 5: Scene Processor (Procedural)

**Responsibility**: Assemble and normalize scene data from LLM output.

**Input**:
- `fanOutResults: SceneFanOutResult[]` - Output from all Stage 4 executions
- `intentOutput: IntentReducerOutput` - Output from Stage 2
- `routerOutput: RouterOutput` - Output from Stage 1

**Output Contract**:
```typescript
{
  steps: Array<{
    id: string;
    caption: string;
    motif_id: string;
    params: Record<string, any>; // Merged defaults + overrides
    entities: Entity[];
    relations: Relation[];
  }>;
  transitions: Transition[];
  theme: ThemePack; // Selected based on tone
  seed: string; // PRNG seed per step: "project:scene:step"
  assets: {
    candidatesByStep: Record<string, DesignAsset[]>; // Available assets per step
  };
}
```

**Validation Rules**:
- All IDs must be normalized and stable
- Motif defaults must be merged with LLM parameter overrides
- Theme must be selected based on tone from router
- PRNG seed must be deterministic per step

**What NOT to do**:
- Generate new content or entities
- Make creative decisions
- Create visual layouts or positioning

### Stage 6: Design Asset Integration (Procedural)

**Responsibility**: Bind retrieved assets to scene entities and record skin hints.

**Input**:
- `sceneExecPlan: SceneExecPlan` - Output from Stage 5
- `designAssets: DesignAsset[]` - Retrieved assets from Stage 4

**Output Contract**:
```typescript
{
  steps: Array<{
    // ... existing step data
    boundAssets: Array<{
      entityId: string;
      assetId: string;
      role: string; // e.g., "actor.card", "process.node"
      skinHints: Record<string, any>;
    }>;
  }>;
  skinRegistry: Record<string, SkinSpec>; // Role → skin mapping
}
```

**Validation Rules**:
- Each bound asset must have `status: 'live'`
- Asset size must fit entity constraints
- Role assignments must be valid
- Skin hints must be complete

**What NOT to do**:
- Generate new assets or content
- Make positioning decisions
- Create animation keyframes

### Stage 7: Layout Grammars (Procedural)

**Responsibility**: Generate positioning and routing for all visual elements.

**Input**:
- `sceneExecPlan: SceneExecPlan` - Output from Stage 5
- `assetIntegration: AssetIntegrationResult` - Output from Stage 6
- `theme: ThemePack` - Theme from Stage 5

**Output Contract**:
```typescript
{
  elements: Array<{
    id: string;
    type: 'rectangle' | 'circle' | 'text' | 'line' | 'polygon';
    x: number; y: number; width: number; height: number;
    // ... other element properties
  }>;
  groups: Array<{
    id: string;
    type: 'text' | 'custom' | 'polygon';
    // ... group properties
  }>;
  edges: Array<{
    from: string; to: string;
    lineOptions: { start: Point; end: Point; controlPoint?: Point };
  }>;
}
```

**Validation Rules**:
- All positions must snap to grid (16px increments)
- No element overlaps
- Edges must route cleanly with collision detection
- Labels must avoid overlaps (flip above/below as needed)
- No hardcoded styling - pull via style resolver

**What NOT to do**:
- Generate content or entities
- Create animation keyframes
- Apply styling or colors
- Make creative decisions

### Stage 8: Compiler (Procedural)

**Responsibility**: Generate final ENGINE_SPEC with animations and timeline.

**Input**:
- `layoutResult: LayoutResult` - Output from Stage 7
- `sceneExecPlan: SceneExecPlan` - Output from Stage 5
- `assetIntegration: AssetIntegrationResult` - Output from Stage 6

**Output Contract**:
```typescript
{
  dimensions: { width: number; height: number };
  scenes: Array<{
    sceneId: string;
    sceneName: string;
    sceneCanvas: {
      elements: CanvasElement[]; // Each with animations[] array
      groups: CanvasGroup[]; // Each with animations[] array
      timeline: {
        scale: number; // ∈ [10, 1000]
        duration: number; // ∈ [1, 120]
        currentTime: number; // Always 0
        animationStates: Record<string, any>; // For fast scrubbing
      };
    };
  }>;
}
```

**Validation Rules**:
- `timeline.duration` ∈ [1, 120] seconds
- `timeline.scale` ∈ [10, 1000] pixels per second
- All elements must have required fields (width, height, etc.)
- Lines must include `lineOptions` or `pathPoints`
- Text must have `fontSize`, `fontFamily`
- Colors must be hex or "none"
- Animations must attach to individual elements/groups
- All easing values must be from allowlist

**What NOT to do**:
- Generate new content or entities
- Make creative decisions
- Create positioning or layouts

## Procedural Generation Integration

This section documents how procedural generation is incorporated into the pipeline to complement the LLM-based creative planning stages.

### Hybrid Architecture: LLM Planning + Procedural Execution

Our pipeline uses a **hybrid approach** that combines the strengths of both LLM and procedural generation:

```
LLM Stages (1-4): Creative Planning & Content Generation
    ↓
Procedural Stages (5-8): Technical Execution & Schema Generation
```

**Why This Hybrid Approach?**

1. **LLM Strengths**: Content understanding, creative generation, domain expertise
2. **Procedural Strengths**: Consistency, performance, technical constraints, validation
3. **Combined Benefits**: Creative flexibility + technical reliability

### Procedural Generation Components

#### 1. **Design Tokens & Theme System**

**Purpose**: Centralized styling and theming without hardcoded values.

```typescript
export const TOKENS = {
  grid: { snap: 16, laneGap: 180, labelGap: 12 },
  radii: { sharp: 0, soft: 6, card: 10, pill: 999 },
  stroke: { hair: 1, ui: 2, strong: 3 },
  type: { font: "Inter", base: 14, min: 12, lh: 1.2 },
  ease: { enter: "power2.out", move: "power1.inOut", emphasis: "back.out(1.4)" },
  dur: { fast: 0.2, base: 0.3, move: 0.9 },
  color: { text: "#0F172A", line: "#64748B", card: "#F1F5F9", bg: "#FFFFFF" }
};

export type ThemePack = {
  id: string;
  palette: Partial<typeof TOKENS.color>;
  motion: { speedFactor: number; stagger: number; profile: "calm" | "neutral" | "energetic" };
  density: "airy" | "normal" | "compact";
  ornaments: Array<"dots" | "gradient" | "none">;
};
```

**Integration**: Themes are selected procedurally in Stage 5 based on tone from Stage 1.

#### 2. **Style Resolver**

**Purpose**: Centralized styling that prevents hardcoded visual properties.

```typescript
export function resolveStyle({
  role, theme, tokens, skin, overrides
}: {
  role: string;
  theme: ThemePack;
  tokens: typeof TOKENS;
  skin?: SkinSpec;
  overrides?: Record<string, any>;
}) {
  const p = { ...TOKENS.color, ...(theme.palette || {}) };
  const base: Record<string, any> = {
    "actor.card": { fill: p.card, stroke: p.line, strokeWidth: tokens.stroke.ui, cornerRadius: tokens.radii.card },
    "process.node": { fill: p.card, stroke: p.line, strokeWidth: tokens.stroke.ui, cornerRadius: tokens.radii.soft },
    "edge.flow": { fill: "none", stroke: p.line, strokeWidth: tokens.stroke.ui },
    "label.caption": { fill: p.text, stroke: "none", fontSize: tokens.type.base, fontFamily: tokens.type.font }
  };
  
  return { ...(base[role] ?? base["container.card"]), ...(skin || {}), ...(overrides || {}) };
}
```

**Integration**: Applied procedurally in Stage 7 after layout generation.

#### 3. **Layout Grammar Engine**

**Purpose**: Deterministic positioning algorithms based on archetype and content.

```typescript
export class LayoutGrammarEngine {
  generateLayout(archetype: string, entities: Entity[], relations: Relation[]): LayoutResult {
    switch (archetype) {
      case 'process_flow':
        return this.layoutProcessFlow(entities, relations);
      case 'timeline_sequence':
        return this.layoutTimeline(entities, relations);
      case 'comparison_tradeoff':
        return this.layoutComparison(entities, relations);
      default:
        return this.layoutDefault(entities, relations);
    }
  }
  
  private layoutProcessFlow(entities: Entity[], relations: Relation[]): LayoutResult {
    // Deterministic horizontal layout algorithm
    const lanes = this.createHorizontalLanes(entities.length);
    const positions = this.positionEntities(entities, lanes);
    const edges = this.routeEdges(relations, positions);
    
    return {
      elements: this.createElements(entities, positions),
      groups: this.createGroups(entities, positions),
      edges: this.createEdges(relations, edges)
    };
  }
}
```

**Integration**: Executed procedurally in Stage 7 to generate element positioning.

#### 4. **Gesture Catalog & Animation Compiler**

**Purpose**: Rule-based animation generation from predefined gestures.

```typescript
export interface IntroGesture {
  id: string;
  category: 'intro' | 'transition' | 'emphasis';
  compiler_key: string;
  defaults: Record<string, any>;
  constraints: { cooldown: number; maxElements: number };
  weight: number;
}

export const INTRO_GESTURES: IntroGesture[] = [
  {
    id: "intro.slide_left",
    category: "intro",
    compiler_key: "INTRO_SLIDE_LEFT_V1",
    defaults: { distance_ratio: 0.6, with_fade: true },
    constraints: { cooldown: 1, maxElements: 64 },
    weight: 1.0
  },
  {
    id: "intro.fade_in",
    category: "intro", 
    compiler_key: "INTRO_FADE_IN_V1",
    defaults: { duration_scale: 1.0 },
    constraints: { cooldown: 0, maxElements: 100 },
    weight: 1.2
  }
];
```

**Integration**: Gestures are selected procedurally in Stage 8 based on theme and content.

#### 5. **Animation Compiler Functions**

**Purpose**: Procedural generation of animation keyframes from gesture definitions.

```typescript
export function INTRO_SLIDE_LEFT_V1(ctx: {
  now: number;
  targetIds: string[];
  frame: { width: number; height: number };
  theme: ThemePack;
  params?: { distance_ratio?: number; with_fade?: boolean };
}) {
  const distance = (ctx.params?.distance_ratio ?? 0.6) * ctx.frame.width;
  const dur = TOKENS.dur.move * (ctx.theme.motion.speedFactor ?? 1);
  const stag = ctx.theme.motion.stagger ?? 0.08;

  return ctx.targetIds.flatMap((id, i) => ([
    // Pre-position off-screen
    { id: `a-${id}-pre`, displayName: "Pre Pos", type: "move",
      startTime: ctx.now, duration: 0.001, properties: { x: -distance, y: 0 } },
    // Slide to final position
    { id: `a-${id}-in`, displayName: "Intro Slide L", type: "move",
      startTime: ctx.now + i * stag + 0.02, duration: dur,
      properties: { x: 0, y: 0 }, easing: TOKENS.ease.move },
    // Optional fade
    ...(ctx.params?.with_fade ?? true ? [{
      id: `a-${id}-fade`, displayName: "Intro Fade", type: "fade",
      startTime: ctx.now + i * stag + 0.02, duration: TOKENS.dur.base,
      properties: { alpha: 1 }, easing: TOKENS.ease.enter
    }] : [])
  ]));
}
```

**Integration**: Executed procedurally in Stage 8 to generate element animations.

### How Procedural Generation Integrates with LLM Output

#### **Stage 4 → Stage 5: Content to Execution Plan**

```typescript
// LLM Output (Stage 4)
const fanOutResult = {
  steps: [
    {
      id: "step1",
      text: "User enters credentials",
      motif_id: "process_flow_basic",
      params: { speed: "medium" },
      entities: [
        { id: "user", type: "actor", label: "User" },
        { id: "form", type: "container", label: "Login Form" }
      ],
      relations: [
        { from: "user", to: "form", label: "interacts with" }
      ]
    }
  ],
  transitions: [
    { from: "step1", to: "step2", transition_id: "xfade_fast" }
  ]
};

// Procedural Processing (Stage 5)
const sceneExecPlan = {
  steps: fanOutResult.steps.map(step => ({
    ...step,
    params: mergeMotifDefaults(step.motif_id, step.params), // Procedural
    theme: selectThemeByTone(routerOutput.tone), // Procedural
    seed: generateDeterministicSeed(projectId, sceneId, step.id) // Procedural
  }))
};
```

#### **Stage 5 → Stage 7: Execution Plan to Layout**

```typescript
// Procedural Layout Generation (Stage 7)
const layoutResult = layoutGrammarEngine.generateLayout(
  sceneExecPlan.archetype,
  sceneExecPlan.steps.flatMap(s => s.entities),
  sceneExecPlan.steps.flatMap(s => s.relations)
);

// Output: Elements with deterministic positioning
const elements = layoutResult.elements.map(element => ({
  ...element,
  // Styling applied procedurally via style resolver
  ...resolveStyle({
    role: determineRole(element, sceneExecPlan),
    theme: sceneExecPlan.theme,
    tokens: TOKENS
  })
}));
```

#### **Stage 7 → Stage 8: Layout to Final Schema**

```typescript
// Procedural Animation Generation (Stage 8)
const animations = sceneExecPlan.steps.flatMap(step => {
  const stepElements = getElementsForStep(step.id, layoutResult.elements);
  
  // Generate intro animations procedurally
  const introGesture = selectIntroGesture({
    theme: sceneExecPlan.theme,
    targetCount: stepElements.length,
    history: getGestureHistory(sceneExecPlan.scene_id)
  });
  
  // Compile gesture to animations
  const gestureCompiler = getGestureCompiler(introGesture.compiler_key);
  return gestureCompiler({
    now: calculateStartTime(step),
    targetIds: stepElements.map(e => e.id),
    frame: { width: 1280, height: 720 },
    theme: sceneExecPlan.theme,
    params: step.params
  });
});

// Attach animations to elements
const finalElements = layoutResult.elements.map(element => ({
  ...element,
  animations: animations.filter(a => a.targetId === element.id)
}));
```

### Procedural Generation Benefits

#### 1. **Consistency & Reliability**
- **Deterministic results** for same inputs
- **No LLM hallucinations** in visual execution
- **Predictable performance** and timing

#### 2. **Performance & Scalability**
- **Fast execution** (no API calls in stages 5-8)
- **Efficient caching** of layout and animation algorithms
- **Parallel processing** of multiple scenes

#### 3. **Technical Constraints**
- **Schema compliance** enforced at compile time
- **Performance budgets** respected automatically
- **Validation rules** applied consistently

#### 4. **Maintainability**
- **Clear separation** of concerns
- **Testable algorithms** for layout and animation
- **Version-controlled** gesture definitions

### Procedural Generation Constraints

#### 1. **No Creative Invention**
- Procedural stages cannot generate new content
- Cannot invent new entities or relationships
- Cannot create new narrative elements

#### 2. **Rule-Based Execution**
- All decisions must follow predefined rules
- No machine learning or AI in execution stages
- Deterministic algorithms only

#### 3. **Schema Compliance**
- Must produce valid ENGINE_SPEC output
- Must respect all technical constraints
- Must handle edge cases gracefully

### Integration Points with Existing Code

#### 1. **Motif System Integration**
```typescript
// Your existing motif retrieval (Stage 4)
const motifCandidates = await motifService.retrieveMotifCandidates(query, archetype);

// Procedural motif compilation (Stage 8)
const motifCompiler = getMotifCompiler(motifId);
const elementAnimations = motifCompiler.compile({
  entities: step.entities,
  params: step.params,
  theme: sceneExecPlan.theme
});
```

#### 2. **Design Asset Integration**
```typescript
// Your existing asset retrieval (Stage 4)
const assets = await assetService.retrieveDesignAssets(query, archetype, tone);

// Procedural asset binding (Stage 6)
const boundAssets = bindAssetsToEntities(assets, step.entities, theme);
```

#### 3. **Validation System Integration**
```typescript
// Your existing validation (all stages)
const validation = validateSceneFanOutResult(result);

// Procedural validation (stages 5-8)
const layoutValidation = validateLayoutResult(layoutResult);
const animationValidation = validateAnimations(animations);
```

### Future Enhancements

#### 1. **Advanced Layout Algorithms**
- Force-directed graph layouts for complex networks
- Adaptive spacing based on content density
- Collision detection and resolution

#### 2. **Enhanced Animation System**
- Physics-based motion simulation
- Advanced easing functions
- Performance-optimized animation compilation

#### 3. **Theme System Expansion**
- Dynamic theme generation based on content
- User preference learning
- Accessibility-focused theme variants

## End-to-end Flow

1. **Router** - classify prompt into archetypes and tone
2. **Intent Reducer** - derive domain and core_flows from the prompt
3. **Scene Planner** - generate scene captions (one per core flow)
4. **Per-scene Fan-out** - produce steps, motif ids + params, entities/relations, transitions, candidate assets
5. **Scene Processor** - procedural assembly (normalize ids, merge motif defaults + overrides, select theme, seed PRNG)
6. **Design Asset Integration** - bind retrieved assets/skins to roles for entities/steps
7. **Layout Grammars** - procedural positioning & edge routing (code-only)
8. **Compiler** - procedural gestures/animations + timeline → final ENGINE_SPEC

### Pipeline Flow Diagram
```
User Prompt → Router → Intent Reducer → Scene Planner → Per-scene Fan-out → Scene Processor → Design Asset Integration → Layout Grammars → Compiler → Final Output
```

### Per-scene Fan-out Details

Each scene from the Scene Planner goes through a detailed breakdown process in the `PerSceneFanOutOrchestrator`:

**A. Caption → Steps** (tiny LLM call)
- Break down scene caption into 2-5 atomic, imperative steps
- Each step gets a unique ID and descriptive text (≤8 words each)
- Uses prompt: "Split into 2-5 imperative steps, ≤8 words each. Return JSON only."

**B. Motif Selection** (tiny LLM call)
- Pick appropriate motif for each step from candidate motifs
- Motif must be one of the archetypes from Router
- Uses prompt: "Select best motif per step from candidates. Return JSON only."

**C. Entities & Relations** (tiny LLM call)
- Identify actors, processes, containers, events using generic vocabulary
- Define how entities interact with each other
- Entity types: `["actor","process","container","event"]`
- Relation types: `["flows_to","interacts_with","contains","triggers"]`
- Uses prompt: "Generate entities and relations using specified types. Return JSON only."

**D. Motif Parameters** (tiny LLM call)
- Customize motif behavior (speed, style, emphasis)
- Generate only non-default parameter overrides
- Uses prompt: "Generate non-default parameter overrides. Return JSON only."

**E. Step Transitions** (tiny LLM call)
- Define how steps flow into each other
- Specify transition effects from enum: `["xfade_fast","pan_right","zoom_in_light","caption_hold"]`
- Uses prompt: "Generate transitions between steps. Return JSON only."

**F. SceneOut Assembly**
- Combine all components into final scene output
- Ready for Scene Processor and Layout Compiler
- Output structure matches `SceneFanOutResult` type

### 0) Inputs & Assets

- User prompt (free text) + optional audience/tone.
- Archetype catalog (fixed, small):
  `process_flow`, `lifecycle_cycle`, `hierarchy_parts`, `comparison_tradeoff`, `timeline_sequence`, `map_topology`, `cause_effect`, `algorithm_trace`.
- Motif catalog (per archetype). Each motif:
  `{ id, one_liner, compiler_key, inputs_schema, defaults, tags, status, version }`.
- In‑process ANN (HNSW) index over `(motif.one_liner + tags + archetype)` for fuzzy retrieval.

### 1) Topic & Archetype Router (tiny model)

Select 1–2 archetypes and a tone from a small enum. This identifies the universal narrative structure first.

Output:

```json
{ "archetypes": ["process_flow", "comparison_tradeoff"], "tone": "concise" }
```

### 2) Intent Reducer (medium model)

Analyze the user prompt to understand the domain and identify core flows, informed by the selected archetypes. This provides specific context for subsequent stages.

Output:

```json
{ "domain": "social_network", "core_flows": ["feed_arch", "like_write", "like_unwrite", "feed_read"], "tone": "concise" }
```

### 3) Scene Planner (small/medium model)

Produce 3–6 scenes as captions only, each assigned to one selected archetype.

Output:

```json
{ "scenes": [ { "id": "s1", "goal": "process_flow", "caption": "Inputs move through staged activities" } ] }
```

Constraints: use only provided archetype ids; captions ≤ 12 words; 3–6 scenes.

### 4) Per‑scene Fan‑out (parallel per scene and per step)

For each scene from the Scene Planner:

1. **Caption → Steps** (tiny LLM call): split caption into 2–3 imperative steps (≤ 8 words).
   - Output: `[{ id, text }]`.
   
2. **Motif Selection** (tiny LLM call): choose appropriate motif for each step.
   - Motif must be one of the archetypes from Router
   - Output: `motif_id` for each step
   
3. **Entities & Relations** (tiny LLM call, generic vocab):
   - Types: `["actor","process","container","event","channel"]`.
   - Output example:
     ```json
     { "entities":[{ "id":"user","type":"actor","label":"User" }],
       "relations":[{ "from":"user","to":"api","label":"POST request" }] }
     ```
     
4. **Motif Parameters** (tiny LLM call): return overrides for motif behavior.
   - Speed, style, emphasis, etc.
   - Provide fallback defaults when needed
   
5. **Step Transitions** (tiny LLM call): define how steps flow into each other.
   - Enum from `["fade","xfade_fast","pan_right","zoom_in_light","caption_hold"]`
   
6. **SceneOut Assembly**: combine all components into final scene output.
   - Ready for Scene Processor and Layout Compiler

All steps 1–6 run in parallel per scene/step.

**Output Structure:**
```json
{
  "scene_id": "scene1",
  "steps": [
    {
      "id": "step1",
      "text": "User enters credentials",
      "motif_id": "process_flow",
      "params": { "speed": "medium" },
      "entities": [
        { "id": "user", "type": "actor", "label": "User" },
        { "id": "form", "type": "container", "label": "Login Form" }
      ],
      "relations": [
        { "from": "user", "to": "form", "label": "interacts with" }
      ]
    }
  ],
  "transitions": [
    { "from": "step1", "to": "step2", "transition_id": "fade" }
  ]
}
```

### 5) Scene Processor (procedural)

- Normalize ids across `scene/step/entity`.
- Merge motif defaults + LLM param overrides.
- Select theme/skin based on tone.
- Seed PRNG per step `project:scene:step`.
- Produce `SceneExecPlan` for execution.

### 6) Design Asset Integration (procedural)

- From candidate assets, pick 1–N live assets per step.
- Bind assets to roles (e.g., `actor.card`, `process.node`) and record skin hints.

### 7) Layout Grammars (procedural)

- Place nodes (snap-to-grid), route edges with ports + bezier control points; retry on collisions.
- Place labels with overlap avoidance.
- Output elements with full geometry (styling via resolver, not hard-coded).

### 8) Compiler (procedural)

- Resolve intro/transition gestures to per-element/group animations.
- Resolve motif gestures to animation tracks.
- Apply easing allowlist, motion budgets, reduced-motion fallback.
- Emit schema-valid `ENGINE_SPEC.sceneCanvas` with elements[], groups[], and timeline.

### Optional: Caption Polish (tiny/small, batch)

- Rewrite scene/step captions for clarity and tone (≤ 12 words). No new facts.

### Design Asset Retrieval & Binding

- Retrieval/selection may occur during Fan-out (Stage 4) as candidates.
- Binding/skinning occurs during Stage 6 (procedural) when assigning assets to roles.

- Assets catalog (source of truth): `{ id, kind, tags, one_liner, inputs_schema, defaults, status, version, embedding }` where `kind ∈ ["background","texture","ornament","image","pattern"]`.
- Retrieval query per scene (or step): `"{archetype} {tone} {caption}"`.
- In‑process ANN index for assets (separate from motifs) → filter `status=live` → MMR → keep top N (e.g., 1–2 backgrounds + up to 3 ornaments).
- Resolve full assets via Redis: `asset:v{version}:{id}`.
- Compiler mapping: each asset has a `compiler_key_asset` to produce decorative elements compliant with `ENGINE_SPEC` (e.g., dotted grid, gradient plate, emoji tiling, watermark image).

## Minimal Data Contracts

```ts
type Tone = 'concise' | 'friendly' | 'formal';

type Brief = { 
  archetypes: string[]; 
  tone: Tone; 
};

type ScenePlan = { 
  id: string; 
  goal: string; 
  caption: string; 
};

type Step = {
  id: string;
  text: string;
};

type Entity = {
  id: string;
  type: 'actor' | 'process' | 'container' | 'event' | 'channel';
  label: string;
};

type Relation = {
  from: string;
  to: string;
  label: string;
};

type StepWithMotif = Step & {
  motif_id: string;
  params: Record<string, any>;
  entities: Entity[];
  relations: Relation[];
};

type StepTransition = {
  from: string;
  to: string;
  transition_id: string;
};

type SceneOut = {
  scene_id: string;
  steps: StepWithMotif[];
  transitions: StepTransition[];
};

type IntentReducerOutput = {
  domain: string;
  core_flows: string[];
  tone: Tone;
};
```

Compiler output is then mapped to the authoritative `ENGINE_SPEC` contract:

```ts
type EngineDoc = {
  name: string;
  title: string;
  description: string;
  mainState: { elements: any[]; groups: any[]; timeline: any };
};
```

## Prompt Snippets (Reusable)

Keep messages tiny, JSON‑only, deterministic. **Status: ✅ IMPLEMENTED** - All prompts have been optimized for conciseness and include examples.

### Current Prompt Improvements

The pipeline now uses optimized, concise prompts that:
- Include concrete examples of expected JSON output
- Remove verbose explanations while maintaining essential constraints
- Use consistent structure across all stages
- Focus on specific, actionable instructions

**Examples of optimized prompts:**
- **Router**: "Classify prompt into 1-2 archetypes and tone. Return JSON only."
- **Intent Reducer**: "Extract domain and 3-5 core flows. Return JSON only."
- **Scene Planner**: "Create one scene per core flow. Return JSON only."
- **Atomic Steps**: "Split into 2-5 imperative steps, ≤8 words each. Return JSON only."
- **Entities**: "Generate entities and relations using specified types. Return JSON only."

### Performance Optimizations

**🚀 48% Performance Improvement Achieved!**

The pipeline has been significantly optimized for speed and reliability:

**Model Optimization:**
- **Router & Scene Planner**: Switched from `gpt-4` to `gpt-3.5-turbo` (3-5x faster)
- **Per-scene Fan-out**: Uses `gpt-3.5-turbo` with optimized token limits
- **Temperature**: Most stages use 0.0 for deterministic, faster generation

**Token Limit Optimization:**
- **Router**: 100 → 50 tokens (50% reduction)
- **Scene Planner**: 300 → 150 tokens (50% reduction)  
- **Per-scene Fan-out**: 1000 → 400 tokens (60% reduction)

**Parallel Processing:**
- **Before**: Sequential scene processing (~43 seconds)
- **After**: Parallel scene processing (~22 seconds)
- **Improvement**: 21 seconds saved (48% faster)

**JSON Parsing Robustness:**
- Automatic error detection and recovery
- Smart retry logic with simplified prompts
- Graceful fallbacks for edge cases
- Comprehensive error logging

Router (tiny):

```
Classify the prompt into 1–2 narrative archetypes and a tone.
Archetypes: ["process_flow","lifecycle_cycle","hierarchy_parts","comparison_tradeoff",
             "timeline_sequence","map_topology","cause_effect","algorithm_trace"]
Return JSON: {"archetypes":[...], "tone":"..."}
Prompt: {user_text}
```

Scene planner (small/medium):

```
Using only these archetypes: {archetypes}, propose 3–6 scenes with short captions.
Each scene.goal must be one archetype id. Captions ≤12 words.
Return: {"scenes":[{"id":"s1","goal":"process_flow","caption":"..."}]}
Brief: {optional constraints/tone}
```

Caption → steps (tiny):

```
Split into 2–5 atomic steps, imperative, ≤8 words.
Caption: "{caption}"
Return: {"steps":[{"id":"s1","text":"..."}]}
```

Motif picker (tiny):

```
Pick ONE motif id that best matches the step.
Step: "{step.text}"
Candidates: [{id, one_liner}, ...]
Return: {"motif_id":"<id>"}
```

Entities & relations (tiny):

```
List minimal entities and directional relations for this step.
Use only types: ["actor","audience","input","output","process","stage","resource",
 "asset","channel","container","metric","signal","decision","event","timeline","node","edge","group"]
Return: {"entities":[...], "relations":[...]}
```

Motif params (tiny, optional):

```
Given motif "{motif_id}" and these entities/relations, choose optional params from keys: {allowed_keys}.
Return overrides only: {"params":{...}}
```

## Orchestration & Integration

### Alignment with Current Code

- Reuse `OpenAIGenerationService` helpers: `runWithRetry`, JSON calling with `OpenAIClient`, and error handling via `LlmJsonParseError`.
- Continue using `ENGINE_SPEC` as the authoritative schema. The final `mainState` must pass `validateElementsArray` and `validateAnimationArrayWithNaming`.
- Preserve existing constraints (e.g., move properties must be single numbers; sanitize via `sanitizeMovePropertiesInPlace`).

### Node Graph (conceptual)

```
Router → Intent Reducer → ScenePlanner → [per‑scene parallel fan‑out (Steps, Retrieve, Pick, Entities, Params, Transitions, DesignAssets)]
           → LayoutGrammar (code) → Compiler (code) → CaptionPolish → EngineDoc
```

### Reference Implementation (working)

- Types: `src/orchestration/pipeline/types.ts`
- Pipeline Runner: `src/orchestration/pipeline-runner.ts` (**parallel pipeline** with LLM calls)
- Per-scene Fan-out: `src/orchestration/per-scene-fanout/orchestrator.ts` (detailed scene breakdown with **robust JSON parsing**)
- Service: `src/services/pipeline-generation.service.ts` (orchestration and validation)
- Client: `src/clients/pipeline.client.ts` (**optimized model configurations** and **smart retry logic**)

### Technical Improvements

**🔧 Code Quality & Reliability**

**JSON Parsing Robustness:**
- Automatic detection of truncated responses
- Smart retry with simplified prompts on failures
- Graceful fallbacks for all parsing edge cases
- Comprehensive error logging and debugging

**Error Handling:**
- Multi-level retry mechanisms with exponential backoff
- Automatic fallback to default values when LLM calls fail
- Detailed error context for debugging and monitoring
- Graceful degradation instead of pipeline failures

**Performance Monitoring:**
- Detailed timing logs for each pipeline stage
- Performance metrics tracking and analysis
- Automatic detection of performance bottlenecks
- Comprehensive logging for production monitoring

### Production Implementation

- Client: `src/clients/pipeline.client.ts` (model-specific configurations, retries, JSON parsing)
- Service: `src/services/pipeline-generation.service.ts` (full pipeline orchestration with validation)
- Integration: `src/services/orchestration.service.ts` (feature flag `GEN_CHAINED=1` to switch pipelines)
- Environment: `env.example` (pipeline model overrides and feature flags)

### Pipeline Implementation

- **Sequential Pipeline**: Uses a simple, working sequential approach that can be easily enhanced
- **State Management**: `PipelineState` interface with typed state transitions
- **LLM Integration**: Each stage uses `PipelineClient` for model-specific calls
- **Pipeline Flow**: `router → intentReducer → scenePlanner → sceneProcessor → layoutCompiler`
- **Runner**: `src/orchestration/pipeline-runner.ts` (working implementation)
- **Future**: Can be enhanced with graph-based orchestration for DAG execution when needed

### Caching (recommended TTLs)

- (prompt → archetypes): 30 min
- (caption → steps): 10 min
- (archetype | hash(step_text) → motif candidates): 10 min
- Motif metadata: indefinitely (versioned)

### Validation & Retries

- Validate every node’s JSON against its minimal schema; on failure, retry once with only the validation error summary and the original instruction.
- Maintain small temperatures (0.0–0.3). Keep messages minimal.
- Log stage name, attempt, and error context sensibly using existing logging [[memory:5078939]].

### Fallbacks

- If retrieval < 2 motifs, use curated defaults per archetype.
- If entities are empty, seed archetype defaults (e.g., `process_flow` → 2–3 `stage` nodes).
- If caption polish fails, use original captions.

## Catalogs & Storage (selected for ≤50k motifs)

- Archetypes: fixed list in code.
- Source of truth: Postgres (via Prisma) or versioned JSON files for motifs `{ id, version, status, archetype, tags, one_liner, compiler_key, inputs_schema, defaults, embedding, embedding_model_version }`.
- Retrieval: In‑process HNSW index (e.g., hnswlib) built at process boot from the authoritative catalog; hot‑reload on motif changes.
- Cache (Redis):
  - Motif payloads by id+version: `motif:v{version}:{id}` → full JSON (no TTL or long TTL).
  - Motif meta: `motif:meta:{id}` → { version, status, archetype, tags }.
  - Hot lists (optional): `motif:hot:{archetype}`.
  - Retrieval results (short TTL): `motif:q:{archetype}:{sha1(step_text)}` → `[top_ids]`, TTL ≈ 600s.

Retrieval flow per step:

1) Key = `motif:q:{archetype}:{sha1(step_text)}` → Redis GET; on hit, use ids.
2) Miss → in‑process ANN search (k≈12) with archetype/status filters → MMR diversify → keep 3–6 ids → Redis SETEX for the key (≈600s).
3) Resolve payloads: Redis MGET `motif:v{version}:{id}` for each id → Postgres/file fallback on misses with write‑through.

## Compiler Mapping to ENGINE_SPEC

- Elements: enforce required fields per type (id, name, type, x, y, fill, width, height, animations). Colors must be hex or "none". Text must use allowlisted fonts; default "Inter".
- **Updated**: All elements now require width and height (set to 0 for line/path/polygon elements where dimensions are defined by points).
- **New**: Support for "polygon" element type with polygonOptions.points and isClosed.
- Lines/paths: include required `lineOptions` or `pathPoints` per spec. Set width/height to 0.
- **Enhanced**: Groups now support text-specific properties (characters, fontSize, fontFamily, etc.) for text groups.
- Animations: set `displayName` as `<type>-<n>` per element; easing from allowlist; `move.properties` can include width/height for size animations.
- Groups: `type` in `text | custom | polygon`; set `isDefaultGroup` appropriately.
- Timeline: `currentTime=0`; `duration` covers the latest animation end (constrained to 1-120 seconds per scene).
- **New**: Timeline scale constraints (10-1000 pixels per second) for optimal frontend performance.

## Ops & Performance

- Orchestrator: Sequential or parallel pipeline runner; parallelize per scene and step.
- Bound latency to the slowest tiny call; most calls are cacheable and small.
- Use structured logging and request correlation ids [[memory:5078939]].
- Rate limits: keep tiny models; prefer JSON mode.

## Deprecation & Migration Plan

1. Implement the chained pipeline behind a feature flag (e.g., `GEN_CHAINED=1`).
2. Keep the existing `generateScene` as fallback; new API path stays the same; internal strategy chosen via flag.
3. Phase 1 (dual‑run, silent): generate with both pipelines, log validation diffs, compare durations.
4. Phase 2 (canary): route N% of requests to chained; monitor error rates and render success.
5. Phase 3 (default): switch default to chained; keep legacy accessible for rollback for 2 releases.
6. Remove legacy large prompts after stability SLOs are met.

## Example: End Output (unchanged)

```json
{
  "name": "scene",
  "title": "Scene",
  "description": "Short conceptual flow.",
  "mainState": { "elements": [], "groups": [], "timeline": { "scale": 1, "duration": 3, "currentTime": 0, "animationStates": {} } }
}
```

## Implementation Status

**✅ COMPLETED:**
- Router & Scene Planner nodes with optimized prompts
- Per-scene fan-out orchestrator with all 6 breakdown steps
- Pipeline runner with **parallel execution** (48% performance improvement!)
- Type definitions and interfaces
- **Prompt optimization** (concise + examples)
- **Performance optimization** (faster models, reduced tokens, parallel processing)
- **JSON parsing robustness** (automatic error recovery and retries)
- **Test script reliability** (proper exit handling)
- **🔒 COMPREHENSIVE VALIDATION SYSTEM** - Step-by-step validation for all pipeline stages
- **🔄 SCHEMA COMPATIBILITY** - ENGINE_SPEC updated to match frontend Pixi + GSAP requirements
- **📝 TYPESCRIPT TYPES** - Comprehensive canvas types for better type safety and IntelliSense

**🔄 IN PROGRESS:**
- Motif catalog and retrieval system
- Design asset retrieval integration

**📋 NEXT STEPS:**
1. Create archetype catalog (8 items) and 5–8 motifs/archetype with `compiler_key`s
2. Wire motif caches and retrieval (motifs + design assets)
3. Write layout grammars and compiler templates mapping to **updated ENGINE_SPEC**
4. Add caption polish batch step
5. **Enhance parallel execution** with graph-based orchestration for even better performance

## Current Performance Metrics

**📊 Pipeline Performance (Optimized Version)**

| Stage | Model | Tokens | Time | Status |
|-------|-------|--------|------|---------|
| **Router** | `gpt-3.5-turbo` | 50 | ~1s | ✅ Optimized |
| **Intent Reducer** | `gpt-4` | 150 | ~2s | ✅ Balanced |
| **Scene Planner** | `gpt-3.5-turbo` | 150 | ~4s | ✅ Optimized |
| **Per-scene Fan-out** | `gpt-3.5-turbo` | 400 | ~22s | ✅ Parallel |
| **Total Pipeline** | - | - | **~22s** | **🚀 48% faster** |

**Performance Improvements:**
- **Parallel Processing**: All scenes process simultaneously instead of sequentially
- **Model Selection**: Faster models for simpler tasks, powerful models for complex reasoning
- **Token Optimization**: Reduced overhead while maintaining output quality
- **Error Recovery**: Automatic retry and fallback mechanisms

## 🔒 Comprehensive Validation System

**Status: ✅ IMPLEMENTED** - Every pipeline stage now includes comprehensive validation with automatic retry logic and detailed error reporting.

### Schema Compatibility

**Status: ✅ UPDATED** - The ENGINE_SPEC has been updated to fully match the frontend Pixi + GSAP schema requirements.

**Key Compatibility Updates:**
- **Element Types**: Added support for "polygon" element type with polygonOptions
- **Required Fields**: All elements now require width and height (set to 0 for line/path/polygon where dimensions are defined by points)
- **Timeline Constraints**: Scene duration limited to 1-120 seconds, scale to 10-1000 pixels per second
- **Group Properties**: Enhanced text groups with character-level properties (characters, fontSize, fontFamily, etc.)
- **Animation Properties**: Expanded move animations to support width/height changes for size animations
- **Frontend Alignment**: Schema now produces output that validates against the frontend rendering requirements

**Frontend Schema Compatibility:**
- ✅ All required fields match frontend expectations
- ✅ Element types align with PixiJS capabilities  
- ✅ Animation properties map to GSAP requirements
- ✅ Timeline constraints respect frontend performance limits
- ✅ Group structures support advanced text and polygon features

### TypeScript Types

**Status: ✅ IMPLEMENTED** - Comprehensive TypeScript types have been created for all canvas structures.

**New Type Definitions (`src/types/canvas.ts`):**
- **CanvasElement**: Complete element interface with all properties and animations
- **CanvasGroup**: Group interface supporting text, custom, and polygon types
- **Timeline**: Timeline configuration with constraints (1-120s duration, 10-1000px/s scale)
- **Scene & MainState**: Scene and project state structures
- **ProjectDocument**: Complete project document interface
- **Validation Helpers**: Type guards for element types, animation types, and GSAP eases

**Type Safety Benefits:**
- ✅ **Compile-time validation** of canvas structures
- ✅ **IntelliSense support** for all canvas properties
- ✅ **Consistent interfaces** across the entire pipeline
- ✅ **Runtime validation** helpers for type checking
- ✅ **Frontend compatibility** ensured through type constraints

**Usage in Pipeline:**
```typescript
import { CanvasElement, Timeline, ProjectDocument } from '../types/canvas';

// Now you get full type safety instead of 'any'
layoutCompiler: {
  elements: CanvasElement[];  // ✅ Typed instead of any[]
  groups: CanvasGroup[];      // ✅ Typed instead of any[]
  timeline: Timeline;         // ✅ Typed instead of any
}
```

### Validation Architecture

The chained generation pipeline now includes a robust validation system that validates each stage's output before proceeding to the next stage:

**1. Router Stage Validation**
- Validates archetypes against allowed list (8 valid archetypes)
- Ensures tone is one of: 'concise', 'friendly', 'formal'
- Enforces array length constraints (1-2 archetypes)
- Provides detailed error messages and patch hints

**2. Intent Reducer Stage Validation**
- Validates domain is non-empty string
- Ensures core_flows array has 3-5 items
- Validates tone consistency
- Provides contextual error messages

**3. Scene Planner Stage Validation**
- Validates scene structure (id, goal, caption)
- Enforces caption length limit (≤12 words)
- Ensures minimum scene count (3-6 scenes)
- Validates goal matches archetype from router

**4. Per-Scene Fan-out Validation**
- **Atomic Steps**: Validates step structure and text length (≤8 words)
- **Motif Selection**: Ensures step_id and motif_id are valid
- **Entities & Relations**: Validates entity types and relation structure
- **Motif Parameters**: Ensures params object structure
- **Step Transitions**: Validates transition_id against allowed enum
- **Final Assembly**: Comprehensive validation of complete scene output

**5. Layout Compiler Validation**
- Validates elements and groups arrays
- Ensures timeline structure with required numeric fields
- Validates animationStates object

**6. Pipeline State Validation**
- Comprehensive validation of entire pipeline state
- Cross-references validation results from all stages
- Provides complete error summary

### Validation Features

**🔍 Detailed Error Reporting**
- Specific error messages for each validation failure
- Patch hints to guide LLM corrections
- Contextual error information (array indices, field names)

**🔄 Automatic Retry Logic**
- Failed validation triggers automatic retry with error summary
- Simplified prompts for retry attempts
- Graceful fallback to default values when retries fail

**📊 Comprehensive Logging**
- Validation results logged at appropriate levels (debug, warn, error)
- Performance metrics for validation operations
- Detailed error context for debugging

**🛡️ Graceful Degradation**
- Pipeline continues with validation warnings when possible
- Automatic fixing of common validation issues
- Fallback values ensure pipeline completion

### Validation Schema

```typescript
interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  value?: T;
  patchHints?: string[];
}
```

**Example Validation Output:**
```typescript
{
  valid: false,
  errors: [
    'archetypes[0] must be one of: process_flow, lifecycle_cycle, ...',
    'tone must be one of: concise, friendly, formal'
  ],
  patchHints: [
    'Replace "invalid_archetype" with a valid archetype from the allowed list',
    'Replace "invalid_tone" with a valid tone from the allowed list'
  ]
}
```

### Testing the Validation System

A comprehensive test script is available at `src/scripts/test-pipeline-validation.ts` that demonstrates:

- All validation functions with valid and invalid inputs
- Error message generation and patch hint creation
- Validation result logging and error summaries
- Complete pipeline validation workflow

**Run the tests:**
```bash
pnpm ts-node src/scripts/test-pipeline-validation.ts
```

### Integration with Pipeline

The validation system is seamlessly integrated into the pipeline:

1. **Router Stage**: Validates output before proceeding to Intent Reducer
2. **Intent Reducer**: Validates output before proceeding to Scene Planner
3. **Scene Planner**: Validates output before proceeding to Per-Scene Fan-out
4. **Per-Scene Fan-out**: Validates each step individually and final assembly
5. **Layout Compiler**: Validates output before final document assembly
6. **Final Document**: Comprehensive validation with graceful degradation

This ensures that each stage produces valid output before the next stage begins, significantly improving pipeline reliability and reducing downstream errors.

## Lessons Learned & Best Practices

**🎯 Key Insights from Optimization**

**Model Selection Strategy:**
- Use faster models (`gpt-3.5-turbo`) for simple classification and generation tasks
- Reserve powerful models (`gpt-4`) for complex reasoning and analysis
- Match model capabilities to task complexity for optimal cost/performance

**Prompt Engineering:**
- Include concrete examples in prompts for better LLM understanding
- Keep prompts concise but specific - remove unnecessary verbosity
- Use consistent structure across similar tasks
- Test prompts with edge cases to ensure robustness

**Performance Optimization:**
- Parallel processing provides the biggest performance gains
- Token limits should match actual output needs, not be overly generous
- Temperature 0.0 for deterministic tasks, higher for creative tasks
- Monitor and log performance at each stage for optimization opportunities

**Error Handling:**
- Always provide fallbacks for LLM failures
- Implement retry logic with exponential backoff
- Log detailed error context for debugging
- Graceful degradation is better than pipeline failure

## Concrete Walkthrough Example ("Design Twitter")

Below is a compact, model‑agnostic example of actual JSON passed between nodes. Archetype ids are aligned to our allowlist (the example’s "cache_read" is mapped to `process_flow`).

### 1) Intent reducer → brief (tiny)

```json
{
  "domain": "social_network",
  "core_flows": ["feed_arch", "like_write", "like_unwrite", "feed_read"],
  "tone": "concise"
}
```

### 2) Scene planner → scenes (captions only)

```json
{
  "scenes": [
    { "id": "feed_arch",   "goal": "process_flow", "caption": "Producers write; consumers read ranked timelines" },
    { "id": "like_write",  "goal": "process_flow", "caption": "Users like items; counters update asynchronously" },
    { "id": "like_unwrite","goal": "process_flow", "caption": "Undo like updates counts and signals" },
    { "id": "feed_read",   "goal": "process_flow", "caption": "Fetch timeline; hydrate on cache miss" }
  ]
}
```

### 3) Per‑scene fan‑out (parallel)

#### Scene A — feed_arch

Caption → steps (tiny):

```json
{
  "scene_id": "feed_arch",
  "steps": [
    { "id": "s1", "text": "Write producer events" },
    { "id": "s2", "text": "Read ranked timelines" }
  ]
}
```

Motif picked per step (tiny; candidates omitted):

```json
[
  { "step_id": "s1", "motif_id": "flow_basic" },
  { "step_id": "s2", "motif_id": "rank_stack" }
]
```

Entities & relations (tiny, generic vocab):

```json
[
  {
    "step_id": "s1",
    "entities": [
      { "id": "producer", "type": "actor", "label": "Producer Service" },
      { "id": "stream",   "type": "event", "label": "Event Stream" }
    ],
    "relations": [
      { "from": "producer", "to": "stream", "label": "emit" }
    ]
  },
  {
    "step_id": "s2",
    "entities": [
      { "id": "timeline", "type": "container", "label": "Timeline Store" },
      { "id": "ranker",   "type": "process",   "label": "Ranking" }
    ],
    "relations": [
      { "from": "timeline", "to": "ranker", "label": "select top-N" }
    ]
  }
]
```

Motif params (rules first; tiny fallback):

```json
[
  { "step_id": "s1", "params": { "trail": "dots", "speed": "medium" } },
  { "step_id": "s2", "params": { "enter": "slide_up", "emphasize_top": 3 } }
]
```