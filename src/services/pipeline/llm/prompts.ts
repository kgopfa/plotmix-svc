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
  
  - heading "<text>"
  - subtitle "<text>"
  - explanation """multiline text"""
  
  - approach <order> "<text>"          # ordered breakdown of the approach
  - keyidea <order> "<text>"           # optional; ordered
  - edgecase <order> "<text>"          # optional; ordered
  
  - pseudocode """multiline text"""    # optional; language-agnostic
  
  - example "<text>"                   # one-liner naming the demo
  - target <scalar>                    # optional (search/look-up scenarios)
  - goal "<text>"                      # optional (non-search demos)
  
  - array [v1,v2,...]                  # define data by index (numbers/strings/bools only)
  - elements [E1,E2,...]               # define named elements for non-array demos (indices map to positions)
  
  - animate <type> [indices]           # types: select|highlight|focus|compare
  - caption <order> "<text>"           # MUST immediately follow its animate line
  
  - conclusion <order> "<text>"        # ordered summary items (complexities, use-cases, takeaways)
  
  STRICT RULES
  1) Do NOT include coordinates/layout/timing — the runtime handles those.
  2) Use array indices (0-based) in \`animate\`; indices MUST exist in the most recent \`array\` or \`elements\` declaration.
  3) \`animate compare\` is ONLY for comparing TWO array items (e.g., [i,j]). When comparing to an external value/target, use \`animate focus [i]\`.
  4) Every \`caption <n>\` MUST immediately follow exactly one \`animate ...\`. The caption’s <n> values must be 1..N in order.
  5) Keep captions explanatory (what changed & why), not purely descriptive (“highlight array” is too generic).
  6) Use \`approach <order>\` to present the method before the demo (derive from contentPlan.approaches.optimal.keyIdeas or synthesize concise mechanics).
  7) Always declare the demo context BEFORE animating:
     - Use \`example "..."\` (and \`target ...\` if relevant) OR \`goal "..." \`.
     - Then declare \`array [...]\` OR \`elements [...]\`.
  8) If \`animationPlan\` is provided, prefer its steps. If absent, derive a minimal, clear sequence (3–7 animate/caption pairs) from the content plan’s algorithmExplanation + pseudocode.
  9) \`pseudocode\` should be verbatim from the content plan when available; otherwise include a concise, language-agnostic version or omit if not applicable.
  10) Keep everything compact and valid per the grammar above.
  
  SIMULATION GUIDANCE (generic, not prescriptive)
  - If the topic has looped state (e.g., searches, passes, traversals), make each pair show a meaningful state change.
  - For search-like demos: highlight current range or focus area → select/focus the current item → explain the decision → narrow/focus next area → repeat → finish.
  - For system/process flows: highlight involved components/relations per step and explain the transition.
  
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