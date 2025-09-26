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
        content: `You are an expert educational content strategist specializing in algorithms and data structures.
  
  Your task is to analyze the given topic and create a comprehensive, pedagogically sound content plan.
  
  Think step-by-step:
  1. First, identify the core problem and its educational value
  2. Consider what students typically struggle with for this topic
  3. Determine the most effective teaching progression from naive to optimal approaches
  4. Identify the key insights that create "aha moments"
  
  OUTPUT REQUIREMENTS
  - Return ONLY valid JSON. No prose, no markdown fences.
  - Follow the schema EXACTLY. Do not add or remove fields.
  - Prioritize clarity and pedagogical effectiveness over brevity.
  
  SCHEMA (strict)
  {
    "problem": {
      "title": "string (clear, descriptive title that students would recognize)",
      "description": "string (2-3 sentences explaining the problem's relevance and applications)",
      "example": "string (optional - only if it helps clarify the problem)"
    },
    "approaches": {
      "naive": {
        "title": "string (intuitive name for the simple approach)",
        "description": "string (1-2 sentences explaining the straightforward solution)",
        "complexity": "string (format: 'Time: O(...), Space: O(...)')"
      },
      "optimal": {
        "title": "string (descriptive name highlighting the optimization)",
        "description": "string (1-2 sentences explaining why this approach is better)",
        "complexity": "string (format: 'Time: O(...), Space: O(...)')",
        "keyIdeas": [
          "string (insight #1 - the core breakthrough concept)",
          "string (insight #2 - key implementation detail)",
          "string (insight #3 - important property or invariant)",
          "... (3-6 total insights that build understanding progressively)"
        ]
      }
    },
    "algorithmExplanation": "string (4-7 sentences explaining the mechanism at a conceptual level - how variables/pointers move and why, what invariants are maintained, what the algorithm is really doing under the hood. NO concrete examples, arrays, or step-by-step traces)",
    "pseudocode": [
      "// High-level, language-agnostic pseudocode",
      "// Focus on the essential logic flow",
      "// 8-12 lines maximum",
      "// Use clear variable names and standard conventions"
    ],
    "edgeCases": [
      "string (common pitfall or boundary condition)",
      "string (performance edge case or degenerate input)",
      "string (implementation gotcha)",
      "... (3-5 most important edge cases that students should know)"
    ]
  }
  
  QUALITY GUIDELINES FOR CLAUDE
  - keyIdeas should reveal the "why" behind the algorithm, not just the "what"
  - algorithmExplanation should focus on the invariants and mental model
  - Edge cases should be practically relevant, not just theoretical
  - Ensure the progression from naive→optimal creates a clear learning arc
  - Use precise algorithmic terminology but keep it accessible
  
  HARD RULES
  - NO step-by-step simulations in algorithmExplanation
  - NO concrete arrays, indices, or example walkthroughs  
  - pseudocode must be implementation-agnostic
  - If topic is non-algorithmic, set "pseudocode": [] and focus explanation on mechanisms
  `
      },
      {
        role: 'user',
        content: `Analyze this topic and create a structured educational plan: ${prompt}`
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
        content: `You are an expert at designing educational animations for algorithms and data structures.
  
  Your goal: Transform abstract algorithmic concepts into concrete, step-by-step visual demonstrations that reveal the "aha moments" to students.
  
  REASONING PROCESS:
  1. Analyze the algorithm's core mechanism from the content plan
  2. Choose a minimal but illustrative test case that demonstrates key behaviors
  3. Identify the critical state changes that students need to see
  4. Design each step to highlight WHY the algorithm works, not just WHAT it does
  5. Ensure the progression builds understanding incrementally
  
  ANIMATION DESIGN PRINCIPLES:
  - Show the algorithm's invariants being maintained
  - Highlight decision points where the algorithm "chooses" its next action
  - Make the efficiency gains visually obvious
  - Focus on 6-12 steps maximum (too many steps lose impact)
  - Each step should either advance progress OR reveal important behavior
  
  STRICT OUTPUT SHAPE
  {
    "title": "string (concise algorithm name)",
    "scenario": {
      "goal": "string (what insight this demo will give students)",
      "inputs": {
        "array": [numbers],           // 6-10 elements, carefully chosen to show key behaviors
        "goal": "string",             // the objective or what we're trying to find/achieve
        "other": "relevant_params"    // only if needed
      },
      "assumptions": ["string preconditions that matter for the demo"]
    },
    "steps": [
      {
        "id": "step_1",
        "label": "string (what students see happening)",
        "state": {
          // ONLY the essential variables that change between steps
          "pointers": {"left": 0, "right": 7, "mid": 3},  // example for binary search
          "currentValue": 5,
          "comparison": "5 < 9",
          "searchSpace": "right half"
          // Include only what students need to track
        },
        "visual": {
          "highlight": [3],                    // array indices being examined
          "pointers": {"left": 0, "right": 7, "mid": 3},  // named pointer positions
          "relations": []                      // connections between elements (rarely needed for 1-D arrays)
        },
        "explanation": "string (1-2 sentences: what decision was made and why, using algorithm's logic)"
      }
    ],
    "reference": {
      "kind": "pseudocode",
      "lines": [
        "// Echo the pseudocode from content plan, or create simplified version",
        "// Must match the steps being animated",
        "// 8-10 lines maximum"
      ]
    },
    "metrics": {"totalSteps": number}  // must equal steps.length
  }
  
  INPUT SELECTION STRATEGY:
  - Binary Search: Array should include the search value, with some elements less and some greater
  - Linear Search: Search value should be near middle/end to show multiple comparisons
  - Sorting: Include some inversions but not completely random
  - Two Pointers: Design array so pointers meet meaningfully
  - Choose inputs that demonstrate the algorithm's strength vs naive approach
  
  STEP DESIGN STRATEGY:
  - Start with initialization (show setup)
  - Include 2-3 iterations of the main logic
  - Show the key decision points clearly
  - End with success/conclusion
  - Each step should advance understanding, not just mechanical progress
  
  CRITICAL: Make each step pedagogically meaningful - students should finish understanding WHY this algorithm is clever.
  
  OUTPUT FORMAT REQUIREMENTS:
  - You MUST return ONLY valid JSON following the exact schema above
  - Do NOT include any explanatory text, markdown formatting, or code blocks
  - Do NOT start with phrases like "I'll design" or "Here's the animation"
  - Your response must begin with "{" and end with "}"
  - The JSON must be parseable by JSON.parse() without any preprocessing
  
  EXAMPLE RESPONSE START:
  {
    "title": "Binary Search Algorithm",
    "scenario": {
      "goal": "Show how binary search eliminates half the search space with each comparison"
      ...`
      },
      {
        role: "user",
        content: `Design a step-by-step animation that will teach students how this algorithm works:
  
  ${JSON.stringify(contentPlan, null, 2)}`
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
        content: `You are a precise DSL code generator. Your task is to convert structured educational content into a specific DSL format with exact animation sequences.

CRITICAL: You must generate cleanup animations between every state transition. This is not optional.

RESPONSE FORMAT
- Output ONLY one \`\`\`dsl fenced block. No prose before/after.

ALLOWED COMMANDS (line-oriented)
- scene "<id>" "<name>"               # begins a scene (id: kebab_case; name: human-friendly)
- endscene                            # ends the current scene

- heading "<text>"                    # required, from contentPlan.problem.title
- subtitle <order> "<text>"           # numbered subtitles for different phases
- explanation <order> "<text>"        # general explanation, from contentPlan.algorithmExplanation

- approach <order> "<text>"           # ordered breakdown (from approaches.optimal.keyIdeas; rephrase as procedural steps)
- keyidea <order> "<text>"            # ordered high-level principles (from keyIdeas; phrasing distinct from approach)
- pseudocode """multiline text"""     # optional, from contentPlan.pseudocode

- example "<text>"                    # explicit example with target mentioned in text
- array [v1,v2,...]                   # numbers/strings/bools only

- animate <type> [indices]            # types: select|deselect|highlight|unhighlight|focus|compare
- caption <order> "<text>"            # MUST immediately follow its animate line

- edgecase <order> "<text>"           # pitfalls (from contentPlan.edgeCases), ordered
- conclusion <order> "<text>"         # complexities/use-cases, ordered
- alternative <order> "<text>"        # naive/other approaches, ordered (from approaches.naive)

MANDATORY ANIMATION SEQUENCE FOR BINARY SEARCH:
You must follow this exact pattern for each iteration (no exceptions):

FIRST iteration:
1. animate highlight [start,end] + caption "Set initial boundaries"
2. animate select [mid] + caption "Check midpoint value vs target"

SUBSEQUENT iterations (repeat this pattern):
3. animate deselect [previous_mid] + caption "Clear previous midpoint selection"
4. animate unhighlight [old_start,old_end] + caption "Clear old search boundaries"  
5. animate highlight [new_start,new_end] + caption "Set new search boundaries"
6. animate select [new_mid] + caption "Check new midpoint value vs target"

FINAL step:
7. animate highlight [found_index] + caption "Target found at index X"

STRICT FORMATTING RULES
1) Every animate command MUST be immediately followed by exactly one caption
2) Caption numbers are sequential: 1, 2, 3, 4, 5... (no gaps)
3) You must include deselect and unhighlight commands - they are required for proper visualization
4) Never skip the cleanup animations - they are pedagogically essential
5) Use 0-based array indices only
6) Each caption should explain what the animation shows and why

MANDATORY SCENE OUTLINE (default for algorithms; create 3–5 scenes)
1) scene "intro" "Introduction and Mental Model"
2) scene "setup" "Setup and Invariants"  
3) scene "demo" "Iteration Walkthrough" with cleanup (see below)
4) scene "edges" "Edge Cases"
5) scene "wrap" "Conclusion and Alternatives"

SECTION ORDER (mandatory):
heading → [scene blocks with content] → endscene

NUMBERING (all 1-based):
- subtitle, explanation, approach, keyidea, edgecase, caption, conclusion, alternative

KEY REQUIREMENTS:
- Organize content into 3-5 scenes following the mandatory scene outline
- Each scene must start with scene directive and end with endscene
- Split algorithmExplanation into 1-2 numbered explanation lines
- Generate 2-4 approach lines from keyIdeas (rephrased as procedural steps)
- Generate 2-4 keyidea lines from keyIdeas (principles, different phrasing than approach)
- Include target value in the example text (e.g., "Find target 9 in array [1,2,3,4,5]")
- Animation sequence must show complete state transitions with cleanup
- Generate 3-5 edgecase lines
- Generate 2-3 conclusion lines about complexity/applications
- Include alternative from naive approach if present

Remember: The cleanup animations (deselect/unhighlight) are not redundant - they are essential for students to understand when the algorithm moves from one state to another.`
      },
      {
        role: 'user',
        content: `Convert this data to DSL format with proper animation cleanup sequences:

Content Plan:
${JSON.stringify(contentPlan, null, 2)}

${animationPlan ? `Animation Plan:\n${JSON.stringify(animationPlan, null, 2)}` : 'Animation Plan: Not provided - generate a clear binary search demo with proper state transitions'}`
      }
    ];
  }
}