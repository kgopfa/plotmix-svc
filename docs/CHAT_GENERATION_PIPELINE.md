## Chat-driven Generation: Planner + DSL + Deterministic Executor

### System Flow (Single Scene • Hybrid: Entity Design + Procedural Layout + DSL)

This section documents the streamlined chat pipeline that tells a story in one scene while keeping visuals intentional and execution deterministic.

1) Router (LLM, tiny)
- Input: user prompt
- Output: `{ archetypes: string[], tone: 'concise'|'friendly'|'formal' }`

2) Intent Reducer (LLM, small)
- Input: prompt + router
- Output: `{ domain: string, core_flows: string[3..5], tone }`

3) Beat Planner (LLM, small)
- Input: router + intent
- Output: `{ beats: Array<{ id: string, caption: string /* ≤12 words */ }> }`

4) EntitySet (LLM, tiny) — semantics only
- Input: beats + domain
- Output: `{ entities: Entity[], relations: Relation[] }`
- Entities: `{ id: string, kind: 'actor'|'process'|'container'|'event'|'channel', label: string, iconIds?: string[] }`
- Relations: `{ from: string, to: string, label: string }`

5) EntityDesign (LLM, small) — “make it look good” (no geometry)
- Input: entities (+ optional theme/tone)
- Output per entity: `{ template, shape, palette, typography, icons/layout, ornament, padding, emphasis }`

6) Procedural Layout (code)
- Input: entities + relations + design specs
- Output: concrete geometry for groups and child visuals (rect/text/icon/image), edges routed with ports
- Rules: archetype-aware lanes (e.g., process_flow left→right), snap 16px, non-overlap, clamp to 1920×1080, label alignment

7) AnimationPlan (LLM, small) — entity-level motion
- Input: entities + beats (timing hints)
- Output: `{ animations: AnimationDirective[] }` targeting entity ids only
- Constraints: easing allowlist; duration caps; x/y deltas only (no raw geometry)

8) Compile to DSL (code)
- Build `ActionPlan`: `addElement` (background/label/icons), `groupElements` (grp-<entityId>), `setStyle` (highlight/emphasis), `animate` (on group ids), `setTimeline` (latest end)

9) Execute + Validate (code)
- Run via `DslExecutorService` → sanitize, clamp, validate, minimal fix loop → `mainState`

10) Render + Persist (UI)
- Hydrate canvas/timeline, render; user can save/overwrite

Roles: Procedural Layout vs DSL
- Procedural Layout decides geometry (positions, sizes, routing) deterministically.
- DSL executes the decided geometry and animations, and ensures schema validity.

---

#### Example outputs (abridged)

Router → Intent → Beats
```json
{
  "router": { "archetypes": ["process_flow"], "tone": "concise" },
  "intent": { "domain": "rate_limiter", "core_flows": ["ingress_to_gate","tokens_deplete","refill_cycle"], "tone": "concise" },
  "beats": [
    { "id": "b1", "caption": "Requests hit ingress" },
    { "id": "b2", "caption": "Token bucket checks capacity" }
  ]
}
```

EntitySet and EntityDesign (no geometry)
```json
{
  "entities": [
    { "id": "ent-clients", "kind": "actor", "label": "Clients", "iconIds": ["pc","laptop","phone"] },
    { "id": "ent-bucket",  "kind": "container", "label": "Token Bucket" },
    { "id": "ent-backend", "kind": "process", "label": "Backend" }
  ],
  "relations": [
    { "from": "ent-clients", "to": "ent-bucket", "label": "requests" },
    { "from": "ent-bucket",  "to": "ent-backend", "label": "allow" }
  ],
  "entityDesign": [
    {
      "entityId": "ent-clients",
      "template": "card.icons_grid",
      "shape": { "type": "rect", "cornerRadius": 10 },
      "palette": { "fill": "#FFFFFF", "stroke": "#CBD5E1", "accent": "#2563EB" },
      "typography": { "fontFamily": "Inter", "fontSize": 18, "weight": 700 },
      "icons": { "ids": ["pc","laptop","phone"], "layout": "grid_3", "size": 36, "gap": 12 },
      "emphasis": { "fill": "#EFF6FF", "stroke": "#60A5FA" }
    }
  ]
}
```

AnimationPlan (entity-level, no geometry)
```json
{
  "animations": [
    { "target": "ent-clients", "type": "fade", "startTime": 0.0, "duration": 0.5, "easing": "power2.out", "properties": { "opacity": 1 } },
    { "target": "ent-bucket",  "type": "pulse", "startTime": 0.6, "duration": 0.8, "easing": "power2.inOut", "properties": { "scaleX": 1.05, "scaleY": 1.05 } }
  ]
}
```

Compiled DSL (excerpt; positions come from procedural layout)
```json
{
  "context": { "canvas": { "width": 1920, "height": 1080 } },
  "actions": [
    { "type": "addElement", "element": { "id": "el-ent-clients-bg", "type": "rect", "name": "card-1", "x": -720, "y": -120, "width": 260, "height": 160, "fill": "#FFFFFF", "stroke": "#CBD5E1" } },
    { "type": "groupElements", "group": { "id": "grp-ent-clients", "name": "entity-clients", "type": "custom", "x": -720, "y": -120, "isDefaultGroup": false, "elementIds": ["el-ent-clients-bg"] } },
    { "type": "animate", "targetId": "grp-ent-clients", "animation": { "type": "fade", "startTime": 0.0, "duration": 0.5, "easing": "power2.out", "properties": { "opacity": 1 } } },
    { "type": "setTimeline", "timeline": { "scale": 100, "duration": 2.6, "currentTime": 0 } }
  ]
}
```

This document describes a reliable, fast, and auditable pipeline for generating a valid canvas `mainState` from a natural-language prompt in the chat page.

The approach replaces direct LLM JSON synthesis or free-form JS execution as the primary path with a staged process that keeps the LLM declarative and lets our code enforce correctness.

### Goals
- **Quality**: Produce valid, renderable `mainState` that passes schema validation consistently.
- **Determinism**: Reduce drift and make outputs reproducible and debuggable.
- **Latency**: Keep prompts short, cache heavy context, and avoid sending the full `mainState` on each step.
- **Safety**: Prevent arbitrary code from mutating state; enforce spec rules centrally.

### Summary of the Pipeline
1) **Intent Parsing (Planner)**: LLM converts user prompt (e.g., “Design twitter”) into a small set of concrete tasks (layout, components, styles, animations) with brief acceptance criteria.
2) **Entity Normalization**: LLM returns a compact list of entities (elements/components), roles, and relationships. No geometry yet.
3) **Action Plan (DSL)**: LLM emits a minimal, structured set of actions (see DSL below) to add/update elements, create groups, and attach animations.
4) **Deterministic Execution (Server/Executor)**: Our code applies the plan to a working `mainState`:
   - Generates stable ids and clamps values
   - Enforces allowlists (easing, fonts, colors)
   - Normalizes text and geometry
5) **Validation + Fix**: Run the strong validator and fixer loop to guarantee schema compliance.
6) **Render**: Return validated `mainState` to the UI renderer and proceed with normal save/version flows.

Notes:
- Steps 1–3 remain small, independent LLM calls; Steps 4–5 are deterministic code and existing validators.
- This is the primary path. A restricted-API JS mode is available as an alternative (see “Optional: Restricted JS Builder”).

---

## Stage Details

### 1) Intent Parsing (Planner)
- Input: user natural-language prompt.
- Output: JSON array of tasks with short descriptions and priorities.
- Keep short; avoid including the full spec or state. Example keys: `taskId`, `type` (layout|component|style|animation), `objective`, `notes?`.

### 2) Entity Normalization
- Input: tasks from the planner.
- Output: JSON describing entities to render and their roles (no coordinates):
  - `entities[]`: `{ idHint?, type, role, text?, paletteToken?, relationships?[] }`
  - Keeps the model declarative and short.

### 3) Action Plan (DSL)
- Input: entities + brief canvas rules (e.g., frame size, origin at center, margins), plus small style presets.
- Output: compact list of actions (ordered) that our executor can apply deterministically.
- Example DSL (shape):
  - `addElement`: `{ type, id?, name?, x?, y?, width?, height?, fill?, text?, fontFamily?, fontSize? }`
  - `groupElements`: `{ id?, name?, type: "text"|"custom"|"polygon", elementIds[] }`
  - `setStyle`: `{ targetId, props: { fill?, stroke?, strokeWidth?, opacity?, fontFamily?, fontSize? } }`
  - `animate`: `{ targetId, type, startTime, duration, easing?, properties: { ... } }`

Constraints communicated to the LLM when producing the DSL:
- Colors: hex `#RRGGBB` or `"none"`.
- Easing: allowlist (prefer `power2.out` or `none`).
- `move` animations: `properties.x` and `properties.y` MUST be single numbers (no arrays/ranges).
- Group `type`: one of `text`, `custom`, `polygon`.
- Keep ids stable when provided; otherwise suggest `el-<short>`.

### 4) Deterministic Executor (Server)
- Applies actions to build/modify `mainState`.
- Enforces:
  - Stable id generation; geometry clamping and defaults
  - Easing/font/animation allowlists
  - Required fields per element type
  - Timeline bounds; `duration` must cover latest animation end
- Produces `mainState` with `{ elements, groups, timeline }`.

### 5) Validation + Fix
- Run the strong validator (leveraging `validateElementsArray`, `validateAnimationArrayWithNaming`, easing/font/group allowlists).
- Sanitize move arrays to scalars; coerce numeric strings; ensure timeline coverage.
- If invalid, invoke the Fixer with patch hints (minimal edits only). Loop a small, fixed number of passes.

### 6) Render
- Return the validated `mainState` and a short, human-readable summary.
- UI hydrates canvas/timeline and proceeds with normal save/version via existing stores.

---

## Optional: Restricted JS Builder Mode

If code-generation is preferred for parts of the flow (e.g., fine layout or staggered animations), use a safe, **restricted builder API** instead of mutating `project` directly.

- Provide to the model: `builder` methods like `addRect`, `addText`, `group`, `animate`, and a `commit()` that returns the updated `mainState`.
- Each builder method enforces schema constraints and allowlists; no imports, async, or network calls permitted.
- The generated script must call `builder.commit()` at the end. We validate the result immediately.

Example target code for the model (shortened):
```javascript
const title = builder.addText({ id: "el-title", x: -480, y: -420, width: 600, height: 60, text: "Twitter", fontFamily: "Inter", fontSize: 48, fill: "#FFFFFF" });
builder.animate(title.id, { type: "fade", startTime: 0.0, duration: 0.6, easing: "power2.out", properties: { opacity: 1 } });
builder.commit();
```

This mode keeps the LLM in its comfort zone (code) while ensuring outputs are valid and auditable.

---

## API Sketch (Server)

- `POST /api/chat/plan`
  - Body: `{ prompt: string }`
  - Returns: `{ tasks: Task[] }`

- `POST /api/chat/entities`
  - Body: `{ tasks: Task[] }`
  - Returns: `{ entities: Entity[] }`

- `POST /api/chat/plan-actions`
  - Body: `{ entities: Entity[], canvas: { width, height }, style?: Presets }`
  - Returns: `{ actions: Action[] }`

- `POST /api/chat/execute`
  - Body: `{ actions: Action[], baseMainState?: MainState }`
  - Returns: `{ mainState, summary }` (validated/fixed)

- `POST /api/chat/execute-code` (optional builder mode)
  - Body: `{ script: string, baseMainState?: MainState }`
  - Returns: `{ mainState, summary }` (validated/fixed)

Notes:
- Internally cache spec facts once per server lifetime.
- Keep each request body minimal; avoid sending full `mainState` except to `execute*` endpoints.

---

## Validation & Rules Enforcement

The executor and validators must enforce at least:
- **Elements**: required fields by type; `fill`/`stroke` formats; text fonts from allowlist (default `Inter`).
- **Animations**: `displayName` naming; easing allowlist; `move` properties as single numbers; bounded `duration` and non-negative `startTime`.
- **Groups**: `type` ∈ {`text`,`custom`,`polygon`}; `elementIds` refer to existing elements; `isDefaultGroup` is boolean.
- **Timeline**: `scale` number; `duration` covers latest animation end; `currentTime` ≥ 0.

If validation fails after the Fixer, return clear error messages and avoid persisting.

---

## Security & Safety
- Never execute free-form code on the server.
- For builder mode on the client, forbid imports/eval/new Function/fetch/async and restrict to the builder API.
- Add execution timeouts and basic loop guards for client-side code snippets.
- Log/trace all plans/actions/scripts and diffs for auditability.

---

## Performance Guidelines
- Keep prompts short and task-scoped; reuse cached spec facts.
- Send only relevant subsets of state to each step; avoid full dumps until execute.
- Limit passes in the fixer loop (e.g., 2–3). Fail fast with actionable hints.

---

## Migration Notes
- This pipeline can coexist with the current single-shot generator.
- Start by integrating Planner + DSL + Executor, reusing the existing validator/fixer from `OpenAIGenerationService`.
- Add restricted builder mode only if needed for local, procedural fine-tuning.

---

## FAQs
- **Why not just generate JSON?** Declarative JSON is good, but splitting into small steps and enforcing rules in code improves determinism and error recovery.
- **Why not pure code-gen?** It’s harder to constrain and debug. The restricted builder mode is a safe compromise when code is beneficial.


