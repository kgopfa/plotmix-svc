import type { Role } from '../../../types';

type LlmMessage = { role: Role; content: string };

export class PromptTemplates {
  /**
   * Content Planner (LLM #1) - turns abstract prompt into structured plan
   */
  static contentPlanner(prompt: string): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are a Content Planner that produces concise, structured plans for educational content.
  Focus on clarity and reusability. Do NOT simulate steps or include animations.
  
  OUTPUT REQUIREMENTS
  - Return ONLY valid JSON. No prose, no markdown fences.
  - Follow the schema EXACTLY. Do not add or remove fields.
  - Keep it concise: no rambling, no repetition.
  
  SCHEMA (strict)
  {
    "problem": {
      "title": "string",
      "description": "string (1–3 sentences)",
      "example": "string (optional)"
    },
    "approaches": {
      "naive": {
        "title": "string",
        "description": "string (1–2 sentences)",
        "complexity": "string (e.g., 'Time: O(n), Space: O(1)')"
      },
      "optimal": {
        "title": "string",
        "description": "string (1–2 sentences)",
        "complexity": "string (e.g., 'Time: O(log n), Space: O(1)')",
        "keyIdeas": ["string", "string", "... up to 7 items"]
      }
    },
    "algorithmExplanation": "string (4–7 sentences explaining HOW it works at the pointer/variable level; NO concrete arrays, NO indices, NO timing, NO step simulation). If the topic is not algorithmic, write a concise mechanism-of-action explanation instead.",
    "pseudocode": ["string lines of language-agnostic pseudocode; <= 12 lines. If non-algorithmic topic, return an empty array []"],
    "edgeCases": ["string", "string", "... up to 6 items"]
  }
  
  HARD RULES
  - NO step-by-step simulations, NO specific arrays, indices, or example walkthroughs in "algorithmExplanation". (That belongs in the animation planner.)
  - "pseudocode" must be language-agnostic and minimal (no imports, no language-specific quirks).
  - Keep "keyIdeas" and "edgeCases" crisp and de-duplicated.
  - If the user's topic is non-algorithmic, provide a clear "algorithmExplanation" as a mechanism/flow explanation and set "pseudocode": [].
  - Do not include fields other than those in the schema.
  `
      },
      {
        role: 'user',
        content: `Create a structured plan for this educational content: ${prompt}`
      }
    ];
  }


  /**
 * Animation Planner (LLM #2) — generic + minimal
 * - Consumes: contentPlan (expects algorithmExplanation and/or pseudocode)
 * - Produces: scenario, stepwise STATE evolution, minimal visual hints, and a reference (pseudocode or outline)
 * - No timing; JSON-only.
 */
  static animationPlanner(contentPlan: any): LlmMessage[] {
    return [
      {
        role: "system",
        content: `You convert conceptual teaching content into a concrete, state-driven demonstration.
Return JSON ONLY. No markdown, no comments, no extra fields.

GOALS
- Create a tiny, illustrative scenario.
- Produce a clear sequence of meaningful state changes.
- Include minimal visual hints (generic, renderer-agnostic).
- Include a compact reference (prefer pseudocode; if not suitable, provide a short outline).

STRICT OUTPUT SHAPE
{
  "title": "string",                     // concise name (algorithm or concept)
  "scenario": {
    "goal": "string",                    // what the demo aims to show
    "inputs": { },                       // small, self-contained demo inputs (any domain)
    "assumptions": ["string", "..."]     // preconditions relevant to the demo
  },
  "steps": [
    {
      "id": "string",
      "label": "string",                 // short, human-friendly caption
      "state": { },                      // small JSON: variables/components/status; only what's necessary
      "visual": {                        // optional, minimal hints; no styling, no timing
        "highlight": ["string|number"],  // ids/keys/indices/nodes/regions your renderer can map
        "pointers": { },                 // generic key→value pointers (e.g., low/high/mid, leader/followers)
        "relations": [["a","b"]]         // pairs/edges to emphasize (for flows/topologies)
      },
      "explanation": "string"            // 1–2 sentences: what changed and why
    }
  ],
  "reference": {
    "kind": "pseudocode|outline",
    "lines": ["string", "..."]           // concise; <= 12 lines
  },
  "metrics": { "totalSteps": number }    // must equal steps.length
}

RULES
- Keep everything compact and concrete; do not invent large data.
- No timing fields. No UI styles. No domain-specific keys unless needed in 'state'.
- 'state' should only include the minimal changing facts per step (variables, flags, active nodes, counters, etc.).
- Prefer echoing provided pseudocode; otherwise synthesize a minimal, correct reference.
- If pseudocode is inappropriate (e.g., system design), use 'outline' with crisp bullet-like lines.
- Ensure 'inputs' satisfy the concept’s preconditions (e.g., “sorted” if relevant).
- Validate: metrics.totalSteps === steps.length.
`
      },
      {
        role: "user",
        content: `Create an animation plan from this content plan:

${JSON.stringify(contentPlan)}`
      }
    ];
  }


  /**
   * DSL Emitter (LLM #3) - turns Content Plan + Animation Plan into DSL program
   */
  static dslEmitter(contentPlan: any, animationPlan?: any): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are a DSL Emitter that converts a Content Plan (+ optional Animation Plan) into a compact DSL.
  
  RESPONSE FORMAT
  - Output ONLY one \`\`\`dsl fenced block. No prose before/after.
  
  ALLOWED COMMANDS (line-oriented)
  - seed <int>
  - style <auto|Minimal|Monospace|...>
  
  - heading "<text>"                    # required, from contentPlan.problem.title
  - subtitle "<text>"                   # required, short tagline, from contentPlan.problem.description
  - explanation <order> "<text>"        # general explanation, from contentPlan.algorithmExplanation
  
  - approach <order> "<text>"           # ordered breakdown (from approaches.optimal.keyIdeas; rephrase as procedural steps)
  - keyidea <order> "<text>"            # ordered high-level principles (from keyIdeas; phrasing distinct from approach)
  - pseudocode """multiline text"""     # optional, from contentPlan.pseudocode
  
  - example "<text>"                    # explicit example with target and data structure (for example an array), from contentPlan.problem.example or synthesized
  
  - array [v1,v2,...]                   # numbers/strings/bools only
  - elements [E1,E2,...]                # named items for non-array demos
  
  - animate <type> [indices]            # types: select|highlight|focus|compare
  - caption <order> "<text>"            # MUST immediately follow its animate line
  
  - edgecase <order> "<text>"           # pitfalls (from contentPlan.edgeCases), ordered
  - conclusion <order> "<text>"         # complexities/use-cases, ordered
  - alternative <order> "<text>"        # naive/other approaches, ordered (from approaches.naive)
  
  STRICT RULES
  1) No coordinates, layout, styling, or timing — the runtime handles those.
  2) subtitle:
     - Derive from problem.description.
     - Keep it short (≈6–10 words), action-oriented (what the concept does).
  3) Demo context MUST precede animations:
     - Emit example (and target if relevant).
     - Then declare array [...] OR elements [...].
  4) Animations:
     - Use 0-based indices that exist in the most recent array/elements.
     - animate compare is ONLY for two array indices [i,j]. To compare against an external target, use animate focus [i].
     - Every caption <n> MUST immediately follow exactly one animate; caption numbers are sequential with no gaps.
  5) Canonical section order:
     heading → subtitle → explanation → approach* → keyidea* → pseudocode? → example → array|elements → [animate+caption]* → edgecase* → conclusion* → alternative*
  6) 1-based ordering ONLY:
     - approach, keyidea, edgecase, caption, conclusion, alternative all use 1..N with no gaps inside their own section.
  7) Key ideas are MANDATORY when present:
     - If contentPlan.approaches.optimal.keyIdeas exists, you MUST emit BOTH:
       a) approach <order> lines (procedural mechanics), and
       b) keyidea <order> lines (principles with distinct phrasing).
       Target 2–5 keyidea lines; avoid duplicating approach text.
  8) Alternatives are MANDATORY when naive exists:
     - If contentPlan.approaches.naive exists, emit at least one alternative <order> line:
       "<title> — <description> (<complexity>)".
  9) Edge cases placement:
     - Emit edgecase lines AFTER the animation section and BEFORE conclusions.
  10) Allowed commands ONLY:
     - Do NOT output unsupported commands (e.g., "animate relations ...", or any undeclared keyword).
  11) explanation lines:
    - Use explanation <order> "<text>".
    - Emit 1–4 lines total. Keep each line short (max ~20 words).
    - Lines should explain the mechanics at a high level (no arrays/indices).
  12) IMPORTANT: example MUST be explicit:
    - If animating an array, example MUST mention both the array and the target, e.g.:
      example "Search for target=a in array [a,b,c,d,e]"
  13) Captions must explain algorithmic reasoning (what changed & why), not generic descriptions.
  14) Keep all lines compact and educational; avoid duplication across lines.
  
  MAPPING SOURCES
  - heading ← contentPlan.problem.title
  - subtitle ← contentPlan.problem.description (shortened)
  - explanation ← contentPlan.algorithmExplanation
  - approach ← contentPlan.approaches.optimal.keyIdeas (rephrased as steps)
  - keyidea ← contentPlan.approaches.optimal.keyIdeas (principles, distinct phrasing)
  - pseudocode ← contentPlan.pseudocode (join as multiline)
  - example ← contentPlan.problem.example (or synthesize concise one-liner)
  - array/elements ← animationPlan.scenario.inputs if provided; otherwise synthesize small, valid inputs
  - edgecase ← contentPlan.edgeCases (de-duplicate)
  - conclusion ← complexities/use-cases (synthesize if absent)
  - alternative ← contentPlan.approaches.naive (title + description + complexity)
  
  OUTPUT ONLY:
  \`\`\`dsl
  ...your DSL...
  \`\`\``
      },
      {
        role: 'user',
        content: `Emit DSL for the following inputs.
  
  Content Plan:
  ${JSON.stringify(contentPlan, null, 2)}
  
  ${animationPlan ? `Animation Plan:\n${JSON.stringify(animationPlan, null, 2)}` : 'No Animation Plan provided (derive a minimal but clear demo).'}`
      }
    ];
  }

}