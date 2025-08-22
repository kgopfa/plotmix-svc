## Chained, Domain‑Agnostic Generation Pipeline

This document proposes a fast, modular generation pipeline that replaces the single large‑prompt scene generator with a sequence of small, parallelizable nodes. It separates story logic from visual grammar and compiles into our existing Pixi/GSAP `mainState` as defined by `ENGINE_SPEC`.

Status: Proposed • Scope: Backend orchestration + small LLM prompts + code compilers • Output contract unchanged: `{ name, title, description, mainState }`.

### Goals

- Speed: Replace slow monolithic prompts with small, cacheable, parallel steps.
- Domain‑agnostic: Work equally for marketing, biology, history, algorithms, etc.
- Reliability: Strict JSON contracts, validation, retries, and conservative fallbacks.
- Compatibility: Keep our final output conforming to `ENGINE_SPEC` and validators.

## End‑to‑end Flow

### 0) Inputs & Assets

- User prompt (free text) + optional audience/tone.
- Archetype catalog (fixed, small):
  `process_flow`, `lifecycle_cycle`, `hierarchy_parts`, `comparison_tradeoff`, `timeline_sequence`, `map_topology`, `cause_effect`, `algorithm_trace`.
- Motif catalog (per archetype). Each motif:
  `{ id, one_liner, compiler_key, inputs_schema, defaults, tags, status, version }`.
- In‑process ANN (HNSW) index over `(motif.one_liner + tags + archetype)` for fuzzy retrieval.

### 1) Topic & Archetype Router (tiny model)

Select 1–2 archetypes and a tone from a small enum. No domain knowledge required.

Output:

```json
{ "archetypes": ["process_flow", "comparison_tradeoff"], "tone": "concise" }
```

### 2) Scene Planner (small/medium model)

Produce 3–6 scenes as captions only, each assigned to one selected archetype.

Output:

```json
{ "scenes": [ { "id": "s1", "goal": "process_flow", "caption": "Inputs move through staged activities" } ] }
```

Constraints: use only provided archetype ids; captions ≤ 12 words; 3–6 scenes.

### 3) Per‑scene Fan‑out (parallel per scene and per step)

For each scene:

1. Caption → steps (tiny): split caption into 2–5 imperative steps (≤ 8 words).
   - Output: `[{ id, text }]`.
2. Retrieve motif candidates (code + vector): query = `"{archetype} {step.text}"`.
   - Vector search (k≈12) → filter `status=live` + archetype → MMR → keep 3–6.
   - Provide only `{ id, one_liner }` to LLM.
3. Motif picker (tiny): choose one motif id per step.
4. Entities & relations (tiny, generic vocab):
   - Types: `["actor","audience","input","output","process","stage","resource","asset","channel","container","metric","signal","decision","event","timeline","node","edge","group"]`.
   - Output example:
     ```json
     { "entities":[{ "id":"stage1","type":"stage","label":"Awareness" }],
       "relations":[{ "from":"stage1","to":"stage2","label":"passes" }] }
     ```
5. Motif params (rules first; tiny fallback): return overrides only for allowed keys from motif `inputs_schema`.
6. Step transitions (tiny or lookup): enum from `["xfade_fast","pan_right","zoom_in_light","caption_hold"]`.

All steps 1–6 run in parallel per scene/step.

### 4) Layout Grammars (code only)

Map archetype → layout grammar. Compute positions from `{entities, relations}` and motif defaults (no LLM):

- process_flow: horizontal lanes, left→right
- lifecycle_cycle: circular ring with phase marker
- hierarchy_parts: parent container + nested boxes
- comparison_tradeoff: two columns, pros/cons badges
- timeline_sequence: time axis + events
- map_topology: grouped regions or force grid
- cause_effect: inputs → mechanism → outputs
- algorithm_trace: structure + one or more cursors

### 5) Compiler (code only)

Convert `{steps, motifs, params, transitions}` into a `SceneProgram` with absolute times, then emit `mainState` per `ENGINE_SPEC`:

- Elements: Pixi primitives and text with required fields.
- Groups: `text | custom | polygon` with animations.
- Timeline: `{ scale, duration, currentTime, animationStates: {} }`.
- Animation rules align with our validators and easing allowlist.

### 6) Caption Polish (tiny/small, batch)

Rewrite scene/step captions for clarity and tone (≤ 12 words). No new facts.

### 7) Design Asset Retrieval (new)

Fetch reusable design assets (backgrounds, textures, emoji patterns, image plates) in parallel with motif retrieval, then let layout/compilers materialize them into `elements`.

- Assets catalog (source of truth): `{ id, kind, tags, one_liner, inputs_schema, defaults, status, version, embedding }` where `kind ∈ ["background","texture","ornament","image","pattern"]`.
- Retrieval query per scene (or step): `"{archetype} {tone} {caption}"`.
- In‑process ANN index for assets (separate from motifs) → filter `status=live` → MMR → keep top N (e.g., 1–2 backgrounds + up to 3 ornaments).
- Resolve full assets via Redis (same pattern as motifs): `asset:v{version}:{id}`.
- Compiler mapping: each asset has a `compiler_key_asset` to produce decorative elements compliant with `ENGINE_SPEC` (e.g., dotted grid, gradient plate, emoji tiling, watermark image).

## Minimal Data Contracts

```ts
type Brief = { archetypes: string[]; tone: "concise" | "friendly" | "formal" };

type ScenePlan = { id: string; goal: string; caption: string };

type StepPlan = {
  id: string;
  text: string;
  motif_id: string;
  params?: Record<string, unknown>;
  entities: Array<{ id: string; type: string; label?: string }>;
  relations: Array<{ from: string; to: string; label?: string }>;
};

type SceneOut = {
  scene_id: string;
  steps: StepPlan[];
  transitions: Array<{ from: string; to: string; transition_id: string }>;
};

type ProgramOut = { scenes: SceneOut[]; totalDuration: number };
// New: design selections
type DesignSelection = {
  scene_id: string;
  backgrounds?: Array<{ asset_id: string; params?: Record<string, unknown> }>;
  ornaments?: Array<{ asset_id: string; params?: Record<string, unknown> }>;
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

Keep messages tiny, JSON‑only, deterministic.

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
Router → ScenePlanner → [per‑scene parallel fan‑out (Steps, Retrieve, Pick, Entities, Params, Transitions, DesignAssets)]
         → LayoutGrammar (code) → Compiler (code) → CaptionPolish → EngineDoc
```

### Reference Implementation (scaffold)

- Types: `src/orchestration/langgraph/types.ts`
- Nodes: `src/orchestration/langgraph/nodes.ts` (Router, ScenePlanner using `OpenAIClient`)
- Runner: `src/orchestration/langgraph/runner.ts` (`runPipeline(userText) → { brief, scenePlanner }`)

### Production Implementation

- Client: `src/clients/pipeline.client.ts` (model-specific configurations, retries, JSON parsing)
- Service: `src/services/pipeline-generation.service.ts` (full pipeline orchestration with validation)
- Integration: `src/services/orchestration.service.ts` (feature flag `GEN_CHAINED=1` to switch pipelines)
- Environment: `env.example` (pipeline model overrides and feature flags)

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

- Elements: enforce required fields per type (id, name, type, x, y, fill; width/height for non‑line/non‑path). Colors must be hex or "none". Text must use allowlisted fonts; default "Inter".
- Lines/paths: include required `lineOptions` or `pathPoints` per spec.
- Animations: set `displayName` as `<type>-<n>` per element; easing from allowlist; `move.properties` use single numbers (no ranges/arrays).
- Groups: `type` in `text | custom | polygon`; set `isDefaultGroup` appropriately.
- Timeline: `currentTime=0`; `duration` covers the latest animation end.

## Ops & Performance

- Orchestrator: LangGraph or equivalent directed graph runner; parallelize per scene and step.
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

## Next Steps

1. Create archetype catalog (8 items) and 5–8 motifs/archetype with `compiler_key`s.
2. Build Router & Scene Planner nodes (tiny/small prompts).
3. Implement per‑scene fan‑out nodes + validators; wire caches (motifs + design assets).
4. Write layout grammars and compiler templates mapping to `ENGINE_SPEC`.
5. Add caption polish batch step.

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

Step transitions:

```json
[
  { "from": "s1", "to": "s2", "transition_id": "pan_right" }
]
```

SceneOut (compiler input):

```json
{
  "scene_id": "feed_arch",
  "steps": [
    {
      "id": "s1",
      "text": "Write producer events",
      "motif_id": "flow_basic",
      "params": { "trail": "dots", "speed": "medium" },
      "entities": [
        { "id": "producer", "type": "actor", "label": "Producer Service" },
        { "id": "stream",   "type": "event", "label": "Event Stream" }
      ],
      "relations": [
        { "from": "producer", "to": "stream", "label": "emit" }
      ]
    },
    {
      "id": "s2",
      "text": "Read ranked timelines",
      "motif_id": "rank_stack",
      "params": { "enter": "slide_up", "emphasize_top": 3 },
      "entities": [
        { "id": "timeline", "type": "container", "label": "Timeline Store" },
        { "id": "ranker",   "type": "process",   "label": "Ranking" }
      ],
      "relations": [
        { "from": "timeline", "to": "ranker", "label": "select top-N" }
      ]
    }
  ],
  "transitions": [
    { "from": "s1", "to": "s2", "transition_id": "pan_right" }
  ]
}
```

#### Scene B — like_write

```json
{
  "scene_id": "like_write",
  "steps": [
    { "id": "s1", "text": "Accept like request" },
    { "id": "s2", "text": "Persist like and emit event" },
    { "id": "s3", "text": "Update like counters" }
  ]
}
```

```json
[
  { "step_id": "s1", "motif_id": "flow_basic" },
  { "step_id": "s2", "motif_id": "db_write" },
  { "step_id": "s3", "motif_id": "counter_tick" }
]
```

```json
[
  {
    "step_id": "s1",
    "entities": [
      { "id": "user",     "type": "actor",   "label": "User" },
      { "id": "api",      "type": "channel", "label": "API" },
      { "id": "like_svc", "type": "process", "label": "Like Service" }
    ],
    "relations": [
      { "from": "user", "to": "api", "label": "POST /likes" },
      { "from": "api",  "to": "like_svc", "label": "forward" }
    ]
  },
  {
    "step_id": "s2",
    "entities": [
      { "id": "like_svc", "type": "process" },
      { "id": "like_db",  "type": "container", "label": "Likes DB" },
      { "id": "events",   "type": "event",     "label": "Events" }
    ],
    "relations": [
      { "from": "like_svc", "to": "like_db", "label": "insert if-not-exists" },
      { "from": "like_svc", "to": "events",  "label": "emit" }
    ]
  },
  {
    "step_id": "s3",
    "entities": [
      { "id": "counter_worker", "type": "process",   "label": "Counter Worker" },
      { "id": "counter_store",  "type": "container", "label": "Counter Store" }
    ],
    "relations": [
      { "from": "events", "to": "counter_worker", "label": "consume" },
      { "from": "counter_worker", "to": "counter_store", "label": "increment" }
    ]
  }
]
```

```json
[
  { "step_id": "s2", "params": { "emphasis": "db_pulse" } },
  { "step_id": "s3", "params": { "tick_rate": "fast" } }
]
```

```json
[
  { "from": "s1", "to": "s2", "transition_id": "xfade_fast" },
  { "from": "s2", "to": "s3", "transition_id": "zoom_in_light" }
]
```

#### Scene C — like_unwrite (mirrors like_write with delete/decrement)

```json
{
  "scene_id": "like_unwrite",
  "steps": [
    { "id": "s1", "text": "Accept unlike request" },
    { "id": "s2", "text": "Remove like and emit event" },
    { "id": "s3", "text": "Decrement like counters" }
  ]
}
```

```json
[
  { "step_id": "s1", "motif_id": "flow_basic" },
  { "step_id": "s2", "motif_id": "db_write" },
  { "step_id": "s3", "motif_id": "counter_tick" }
]
```

```json
[
  {
    "step_id": "s2",
    "entities": [
      { "id": "like_svc", "type": "process" },
      { "id": "like_db",  "type": "container" },
      { "id": "events",   "type": "event" }
    ],
    "relations": [
      { "from": "like_svc", "to": "like_db", "label": "delete if-exists" },
      { "from": "like_svc", "to": "events",  "label": "emit undo" }
    ]
  },
  {
    "step_id": "s3",
    "entities": [
      { "id": "counter_worker", "type": "process" },
      { "id": "counter_store",  "type": "container" }
    ],
    "relations": [
      { "from": "events", "to": "counter_worker", "label": "consume" },
      { "from": "counter_worker", "to": "counter_store", "label": "decrement" }
    ]
  }
]
```

```json
[
  { "step_id": "s2", "params": { "emphasis": "db_pulse" } },
  { "step_id": "s3", "params": { "tick_rate": "medium" } }
]
```

```json
[
  { "from": "s1", "to": "s2", "transition_id": "xfade_fast" },
  { "from": "s2", "to": "s3", "transition_id": "caption_hold" }
]
```

#### Scene D — feed_read

```json
{
  "scene_id": "feed_read",
  "steps": [
    { "id": "s1", "text": "Read timeline from cache" },
    { "id": "s2", "text": "Load missing items from database" }
  ]
}
```

```json
[
  { "step_id": "s1", "motif_id": "cache_pulse" },
  { "step_id": "s2", "motif_id": "db_read" }
]
```

```json
[
  {
    "step_id": "s1",
    "entities": [
      { "id": "client",  "type": "actor",     "label": "Client" },
      { "id": "cache",   "type": "container", "label": "Timeline Cache" }
    ],
    "relations": [
      { "from": "client", "to": "cache", "label": "GET timeline" }
    ]
  },
  {
    "step_id": "s2",
    "entities": [
      { "id": "cache", "type": "container" },
      { "id": "db",    "type": "container", "label": "Timeline DB" }
    ],
    "relations": [
      { "from": "cache", "to": "db", "label": "miss → hydrate" }
    ]
  }
]
```

```json
[
  { "step_id": "s1", "params": { "pulse_repeats": 2 } },
  { "step_id": "s2", "params": { "fallback_style": "dashed" } }
]
```

```json
[
  { "from": "s1", "to": "s2", "transition_id": "zoom_in_light" }
]
```

### 4) Caption polish (batch; optional)

```json
[
  { "scope": "scene", "id": "feed_arch",   "caption": "Producers write; consumers read ranked timelines" },
  { "scope": "scene", "id": "like_write",  "caption": "Users like items; counters update asynchronously" },
  { "scope": "scene", "id": "like_unwrite","caption": "Undo like updates counts and signals" },
  { "scope": "scene", "id": "feed_read",   "caption": "Fetch timeline; hydrate on cache miss" }
]
```

### 5) Assemble & compile (code; no LLM)

The compiler maps `motif_id` → `compiler_key` templates, positions from `entities/relations`, `params` to animation overrides, and `transitions` to cross‑step effects. The end result is converted to our `ENGINE_SPEC` document.

```json
{
  "program": {
    "scenes": ["feed_arch","like_write","like_unwrite","feed_read"],
    "estimated_total_duration_sec": 28.0,
    "per_scene_sec": { "feed_arch": 6.5, "like_write": 8.0, "like_unwrite": 6.5, "feed_read": 7.0 }
  }
}
```



