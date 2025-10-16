import type { Role } from '../../../types';

type LlmMessage = { role: Role; content: string };

export class PromptTemplates {
  /**
   * Router (LLM #0) - determines which pipeline to execute based on user intent
   */
  static router(prompt: string): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are a request router that analyzes user prompts and determines the appropriate pipeline to execute.

TASK:
Analyze the user's prompt and classify it into one of these pipeline types:

1. "algorithm" - Complex algorithmic/educational content requiring full pipeline
   Examples: "Binary search", "Two pointer technique", "Explain quicksort"
   
2. "simple_scene" - Direct scene creation with specific elements
   Examples: "Create a scene with a list", "Show a heading and codeblock", "Make an array with 5 elements"
   
3. "direct_dsl" - User provides explicit scene structure/DSL
   Examples: "Create 3 scenes with...", "Scene 1 should have...", structured instructions

RESPONSE FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "pipelineType": "algorithm|simple_scene|direct_dsl",
  "reasoning": "Brief explanation of why you chose this pipeline (1 sentence)",
  "extractedIntent": {
    "topic": "string (for algorithm)",
    "sceneRequirements": ["array of specific requirements (for simple_scene)"],
    "structure": "string (for direct_dsl)"
  }
}

CLASSIFICATION RULES:
- If prompt mentions algorithms, data structures, complexity, or educational concepts → "algorithm"
- If prompt is a simple request for specific elements/scenes without algorithmic context → "simple_scene"
- If prompt describes explicit scene structure or multiple scenes with specific content → "direct_dsl"
- Default to "simple_scene" if unclear

OUTPUT REQUIREMENTS:
- ONLY JSON, no markdown, no explanations outside JSON
- Must be parseable by JSON.parse()
- Response must start with { and end with }`
      },
      {
        role: 'user',
        content: prompt
      }
    ];
  }

  /**
   * Simple Scene Generator - for direct scene creation requests
   */
  static simpleSceneGenerator(prompt: string, extractedIntent?: any): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are a JSON generator that creates simple educational scenes based on user requests.

RESPONSE FORMAT:
- Output ONLY valid JSON. No prose, no markdown fences, no explanations.
- Your response must start with { and end with }
- The JSON must be parseable by JSON.parse() without preprocessing

OUTPUT STRUCTURE:
{
  "scenes": [
    {
      "id": "scene-id-kebab-case",
      "name": "Human Friendly Scene Name",
      "content": [
        {
          "type": "heading|list|codeblock|demo",
          "data": [...],
          "title": "optional title for codeblocks only"
        }
      ]
    }
  ]
}

CONTENT ITEM TYPES:
{
  "type": "heading",
  "data": ["Single title string"]
}

{
  "type": "list",
  "data": ["item1", "item2", "item3"]
}

{
  "type": "codeblock",
  "data": ["code as single string with \\n for newlines"],
  "title": "Code Title"
}

{
  "type": "demo",
  "dataStructure": {
    "type": "array",
    "data": [1, 2, 3, 4, 5]
  },
  "steps": [
    {
      "actions": [
        {"type": "highlight", "indices": [0]}
      ],
      "caption": "What's happening"
    }
  ]
}

RULES:
1. Every scene must have id (kebab-case), name (human-friendly), and content array
2. Every content item must have a "type" field
3. heading data is an array with one string
4. list data is an array of strings (2-5 items) - NO title field for lists
5. codeblock data is an array with one string (use \\n for line breaks)
6. All data fields must be arrays
7. Keep it simple - create exactly what the user asked for
8. If user didn't specify content, use placeholder/example content
9. Use 0-based array indices for demos

EXAMPLES:
Request: "Create a scene with a list"
Response:
{
  "scenes": [{
    "id": "simple-list-scene",
    "name": "Example List",
    "content": [{
      "type": "list",
      "data": ["First item", "Second item", "Third item"]
    }]
  }]
}

Request: "Show a heading and a list"
Response:
{
  "scenes": [{
    "id": "heading-and-list",
    "name": "Example Scene",
    "content": [
      {
        "type": "heading",
        "data": ["Main Title"]
      },
      {
        "type": "list",
        "data": ["Point one", "Point two", "Point three"]
      }
    ]
  }]
}`
      },
      {
        role: 'user',
        content: extractedIntent ? 
          `Create a scene based on this request:\n\nOriginal prompt: ${prompt}\n\nExtracted requirements: ${JSON.stringify(extractedIntent)}` :
          prompt
      }
    ];
  }

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
 * JSON Emitter (LLM #3) - turns Content Plan + Animation Plan into JSON structure
 */
  static dslEmitter(contentPlan: any, animationPlan?: any): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are a JSON generator that converts educational content plans into a structured JSON format with scenes.

CRITICAL: You must generate cleanup animations between every state transition. This is not optional.

RESPONSE FORMAT
- Output ONLY valid JSON. No prose, no markdown fences, no explanations.
- Your response must start with { and end with }
- The JSON must be parseable by JSON.parse() without preprocessing

OUTPUT STRUCTURE:
{
  "scenes": [
    {
      "id": "scene-id-kebab-case",
      "name": "Human Friendly Scene Name",
      "content": [
        {
          "type": "heading|list|codeblock|demo",
          "data": [...],
          "title": "optional title for codeblocks only"
        }
      ]
    }
  ]
}

SCENE STRUCTURE (create 4-5 scenes):
1. Scene "intro" - Introduction
   - heading
   - list with explanation items
   - list with step-by-step approach items

2. Scene "concepts" - Key Concepts  
   - list with key ideas
   - codeblock with pseudocode (title: "Pseudocode")

3. Scene "demo" - Iteration Walkthrough
   - demo with animated steps

4. Scene "edge-cases" - Edge Cases & Performance
   - list with edge cases
   - list with performance notes

5. Scene "alternatives" - Alternative Approaches
   - list with alternative approaches

CONTENT ITEM TYPES:
{
  "type": "heading",
  "data": ["Single title string"]
}

{
  "type": "list",
  "data": ["item1", "item2", "item3"]
}

{
  "type": "codeblock",
  "data": ["code as single string with \\n for newlines"],
  "title": "Pseudocode"
}

{
  "type": "demo",
  "dataStructure": {
    "type": "array",
    "data": [1, 2, 3, ...]
  },
  "steps": [
    {
      "actions": [
        {"type": "highlight|select|deselect|unhighlight|focus|compare", "indices": [0,1]}
      ],
      "caption": "What's happening and why"
    }
  ]
}

MANDATORY ANIMATION SEQUENCE FOR BINARY SEARCH:
Follow this exact pattern for each iteration (no exceptions):

FIRST iteration:
1. {"type": "highlight", "indices": [start,end]} + caption "Set initial boundaries"
2. {"type": "select", "indices": [mid]} + caption "Check midpoint value vs target"

SUBSEQUENT iterations (repeat this pattern):
3. {"type": "deselect", "indices": [previous_mid]} + caption "Clear previous midpoint"
4. {"type": "unhighlight", "indices": [old_start,old_end]} + caption "Clear old boundaries"
5. {"type": "highlight", "indices": [new_start,new_end]} + caption "Set new boundaries"
6. {"type": "select", "indices": [new_mid]} + caption "Check new midpoint"

FINAL step:
7. {"type": "highlight", "indices": [found_index]} + caption "Target found"

STRICT RULES:
1. Every scene must have id (kebab-case), name (human-friendly), and content array
2. Every content item must have a "type" field
3. heading data is an array with one string
4. list data is an array of strings
5. codeblock data is an array with one string (use \\n for line breaks)
6. All data fields must be arrays for consistency
7. Demo steps must include cleanup animations (deselect/unhighlight)
8. Use 0-based array indices
9. Demo array should have 6-10 elements

MAPPING FROM CONTENT PLAN:
- heading: contentPlan.problem.title
- explanation list: split contentPlan.algorithmExplanation into 2-3 bullet points
- approach list: rephrase contentPlan.approaches.optimal.keyIdeas as procedural steps (2-4 items)
- key ideas list: contentPlan.approaches.optimal.keyIdeas (2-4 items, different wording than approach)
- pseudocode: contentPlan.pseudocode joined with \\n
- demo: from animationPlan or synthesize a clear demo with 6-10 element array
- edge cases list: contentPlan.edgeCases (3-5 items)
- performance list: generate 2-3 complexity/performance points
- alternatives list: contentPlan.approaches.naive formatted as "Title — Description (Complexity)"

Remember: Cleanup animations are essential for visualization - never skip them.`
      },
      {
        role: 'user',
        content: `Convert this data to JSON format with scenes and proper animation cleanup sequences:

Content Plan:
${JSON.stringify(contentPlan, null, 2)}

${animationPlan ? `Animation Plan:\n${JSON.stringify(animationPlan, null, 2)}` : 'Animation Plan: Not provided - generate a clear demo with proper state transitions'}`
      }
    ];
  }
}