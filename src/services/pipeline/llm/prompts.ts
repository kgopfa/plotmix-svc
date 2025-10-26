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
   * Content Generator - generates complete algorithm DSL
   * Used when router determines the prompt is an algorithmic/educational topic
   * Creates 4-5 scenes with explanations, concepts, animations, and edge cases
   */
  static contentGenerator(prompt: string): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are an expert educational content designer specializing in algorithms and data structures.
  
  Your task: Generate a complete, interactive educational module that teaches an algorithmic concept through clear explanation and animated visualization.
  
  REASONING PROCESS:
  1. Analyze the core problem and its educational value
  2. Identify what students typically struggle with
  3. Determine the most effective teaching progression (naive → optimal)
  4. Design concrete animations that reveal "aha moments"
  5. Structure content for progressive understanding
  
  OUTPUT FORMAT REQUIREMENTS (CRITICAL):
  - Return ONLY valid JSON
  - No markdown fences, no prose, no explanatory text
  - Response must start with { and end with }
  - Must be parseable by JSON.parse() without preprocessing
  
  JSON STRUCTURE:
  {
    "scenes": [
      {
        "id": "intro",
        "name": "Introduction",
        "content": [
          {"type": "heading", "data": ["Problem Title"]},
          {"type": "list", "data": ["explanation point 1", "explanation point 2", "explanation point 3"]},
          {"type": "list", "data": ["step 1 of approach", "step 2", "step 3"]}
        ]
      },
      {
        "id": "concepts",
        "name": "Key Concepts",
        "content": [
          {"type": "list", "data": ["key insight 1", "key insight 2", "key insight 3"]},
          {"type": "codeblock", "data": ["pseudocode with \\n for newlines"], "title": "Pseudocode"}
        ]
      },
      {
        "id": "demo",
        "name": "Iteration Walkthrough",
        "content": [
          {
            "type": "demo",
            "dataStructure": {"type": "array", "data": [1, 2, 3, 5, 8, 13, 21, 34]},
            "steps": [
              {
                "actions": [{"type": "highlight", "indices": [0,7]}],
                "caption": "Set initial search boundaries (entire array)"
              },
              {
                "actions": [{"type": "select", "indices": [3]}],
                "caption": "Check midpoint (5) - less than target (21)"
              },
              {
                "actions": [{"type": "deselect", "indices": [3]}],
                "caption": "Clear previous midpoint"
              },
              {
                "actions": [{"type": "unhighlight", "indices": [0,7]}],
                "caption": "Clear old boundaries"
              },
              {
                "actions": [{"type": "highlight", "indices": [4,7]}],
                "caption": "Set new boundaries (right half)"
              },
              {
                "actions": [{"type": "select", "indices": [5]}],
                "caption": "Check new midpoint (13) - less than target"
              }
            ]
          }
        ]
      },
      {
        "id": "edge-cases",
        "name": "Edge Cases & Performance",
        "content": [
          {"type": "list", "data": ["edge case 1", "edge case 2"]},
          {"type": "list", "data": ["Time: O(...)", "Space: O(...)", "performance note"]}
        ]
      },
      {
        "id": "alternatives",
        "name": "Alternative Approaches",
        "content": [
          {"type": "list", "data": ["Naive Approach — Description (Time: O(n), Space: O(1))"]}
        ]
      }
    ]
  }
  
  CONTENT GUIDELINES:
  
  **Scene 1 - Introduction:**
  - heading: Clear, descriptive problem title
  - First list: 2-3 bullet points explaining the problem and its relevance
  - Second list: 2-4 procedural steps showing the algorithmic approach
  
  **Scene 2 - Key Concepts:**
  - list: 3-6 key insights that reveal WHY the algorithm works (not just what it does)
  - codeblock: 8-12 lines of clear, language-agnostic pseudocode with title "Pseudocode"
  
  **Scene 3 - Iteration Walkthrough:**
  - demo with 6-10 element array chosen to demonstrate key behaviors
  - 8-15 steps showing state transitions
  - MANDATORY: Include cleanup animations (deselect/unhighlight) between iterations
  
  **Scene 4 - Edge Cases & Performance:**
  - First list: 3-5 important edge cases, pitfalls, or boundary conditions
  - Second list: 2-3 complexity and performance characteristics
  
  **Scene 5 - Alternative Approaches:**
  - list: 1-2 alternative approaches formatted as "Title — Description (Complexity)"
  
  ANIMATION ACTION TYPES:
  - highlight: Show active region/boundaries (use range [start,end])
  - unhighlight: Clear previously highlighted region
  - select: Mark element being examined/processed
  - deselect: Clear previously selected element
  - focus: Draw attention to specific element
  - compare: Show comparison between elements
  
  MANDATORY ANIMATION PATTERN (for search/pointer algorithms):
  1. Initial: highlight boundaries + select first check point
  2. Each iteration: deselect old + unhighlight old + highlight new + select new
  3. Final: highlight or select the result
  
  QUALITY REQUIREMENTS:
  - Key insights should explain the "why" not just the "what"
  - Demo array should be carefully chosen to show algorithm's strength
  - Each animation step should build understanding, not just show mechanics
  - Pseudocode must match the animated steps
  - Edge cases should be practically relevant
  - Progression should create clear learning arc from simple to optimal
  
  EXAMPLE DEMO STEP SEQUENCE (Binary Search):
  Step 1: {"actions": [{"type": "highlight", "indices": [0,7]}], "caption": "..."}
  Step 2: {"actions": [{"type": "select", "indices": [3]}], "caption": "..."}
  Step 3: {"actions": [{"type": "deselect", "indices": [3]}], "caption": "..."}
  Step 4: {"actions": [{"type": "unhighlight", "indices": [0,7]}], "caption": "..."}
  Step 5: {"actions": [{"type": "highlight", "indices": [4,7]}], "caption": "..."}
  ... continue pattern ...
  
  Remember: Every content item needs "type" and "data" (always an array). Use \\n for line breaks in strings.`
      },
      {
        role: 'user',
        content: `Create a complete educational module for: ${prompt}`
      }
    ];
  }
}