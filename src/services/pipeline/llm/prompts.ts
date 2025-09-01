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
        content: `You are a Content Planner that produces structured plans to explain DSA problems to learners. 

Your output MUST be valid JSON matching this exact schema:
{
  "problem": {
    "title": "string",
    "description": "string", 
    "example": "string (optional)"
  },
  "approaches": {
    "naive": {
      "title": "string",
      "description": "string",
      "complexity": "string (e.g., 'Time: O(n), Space: O(1)')"
    },
    "optimal": {
      "title": "string", 
      "description": "string",
      "complexity": "string",
      "keyIdeas": ["string", "string"]
    }
  },
  "edgeCases": ["string", "string"],
  "visualRequirements": {
    "arrays": [
      {
        "values": [number|string],
        "purpose": "string (what this array demonstrates - e.g., 'input example', 'step visualization', 'result')"
      }
    ],
    "animations": [
      {
        "type": "highlight|select|focus|compare",
        "elements": [number|string],
        "startTime": number,
        "duration": number,
        "purpose": "string (what this animation demonstrates - e.g., 'search range', 'current element', 'comparison')"
      }
    ]
  }
}

CRITICAL: In visualRequirements.arrays, include ONLY actual data arrays that should be visualized as boxes/cells. Do NOT include explanatory text, complexity information, or bullet points here. Those will be rendered as regular text.

Examples of what goes in arrays:
✓ [1, 3, 5, 7, 9] - actual data to visualize
✓ [2, 4, 6, 8] - another data example
✗ ["Time: O(n)", "Space: O(1)"] - this is text, not array data
✗ ["Binary search", "Divide and conquer"] - these are concepts, not array elements

ANIMATION GUIDELINES:
- Use animations for algorithms that involve step-by-step progression through an array
- highlight: Show search ranges, current focus areas, or elements being processed
- select: Highlight specific elements for comparison or selection
- focus: Emphasize the current element being examined
- compare: Show elements being compared side-by-side
- Start times should be sequential (0, 2, 4, 6, etc.) for smooth progression
- Duration should be consistent (usually 2 seconds per step)
- Elements in animations must exist in the arrays defined above
- Animation styling (colors, scale factors, easing) is procedurally generated for consistent theming`
      },
      {
        role: 'user',
        content: `Explain this problem using the structure above: ${prompt}`
      }
    ];
  }

  /**
   * Visual Planner (LLM #2) - converts content plan into Scene Plan JSON
   */
  static visualPlanner(contentPlan: any): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are a Visual Planner that converts content plans into Scene Plan JSON for educational visualizations.

Your output MUST be valid JSON matching this exact schema:
{
  "seed": number,
  "style": "auto"|string,
  "sections": [
    {
      "id": "string",
      "title": "string",
      "text": "string (for paragraph content)",
      "bullets": ["string"] (for bullet points - will be rendered as separate text elements),
      "complexity": "string (for complexity info like 'Time: O(n), Space: O(1)')",
      "keyIdeas": ["string"] (for concept lists),
      "visuals": [
        {
          "kind": "array",
          "values": [number|string],
          "purpose": "string"
        },
        {
          "kind": "animation",
          "type": "highlight|select|focus|compare",
          "elements": [number|string],
          "startTime": number,
          "duration": number,
          "purpose": "string"
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Focus on content structure, not positioning
2. Arrays are ONLY for actual data visualization (numbers/strings that represent array elements)
3. All other content (titles, descriptions, complexity, concepts) goes in text/bullets/complexity/keyIdeas fields
4. The procedural system will handle layout automatically

Content Organization Strategy:
- Problem title and description
- Example arrays and explanations  
- Approach comparisons
- Edge cases and complexity info

The procedural system will automatically:
- Create appropriate layout
- Position elements for optimal visual flow
- Handle spacing and alignment
- Ensure no overlapping or cramped layouts`
      },
      {
        role: 'user',
        content: `Convert this content plan to a Scene Plan JSON:\n\n${JSON.stringify(contentPlan, null, 2)}`
      }
    ];
  }

  /**
   * DSL Emitter (LLM #3) - turns Scene Plan JSON into DSL program
   */
  static dslEmitter(scenePlan: any): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are a DSL Emitter that translates Scene Plan JSON to DSL commands.

STRICT RULES:
1. Output ONLY the DSL inside one \`\`\`dsl fenced block
2. Do NOT specify grid positions - the procedural system will handle layout automatically
3. Use text command for titles, descriptions, bullets, complexity info, keyIdeas
4. Use array command ONLY for actual data arrays (numbers/strings representing array elements)
5. No prose, comments, or explanations outside the DSL block

DSL Syntax:
\`\`\`dsl
seed <int>
style <auto|Minimal|Monospace|...>

text "<content>"
text "<content>" size <px> weight <int>
array [v1,v2,v3]
animate <type> [elements] <startTime> <duration>
\`\`\`

Animation Types (for any 1-D array problem):
- highlight: Visual highlighting of array elements (background color change)
- select: Selection state (scaling for emphasis)
- focus: Focus state (subtle scaling for attention)
- compare: Comparison state (background color for comparison)

Note: Animation styling (colors, scale factors, easing, duration) is procedurally generated based on the seed for consistent, theme-appropriate results.

CRITICAL: 
- Emit ONE text command per piece of content (title, description, each bullet point, complexity info, each key idea)
- Do NOT put explanatory text in array commands
- Arrays are ONLY for visualizing actual data: [1,2,3], ["a","b","c"], [5,10,15]
- Text like "Time: O(n)" or "Binary search concept" goes in text commands, NOT arrays
- Do NOT include grid positioning - the system will handle layout automatically
- Use animate commands to show step-by-step algorithm progression
- Elements in animate commands must match values in the array
- Start times should be sequential (0, 2, 4, 6, etc.) for smooth progression
- Duration should be consistent (usually 2 seconds per step)

GENERIC ANIMATION GUIDELINES:
- Use animations for any algorithm that involves step-by-step progression through an array
- Show current focus/selection at each step
- Highlight relevant ranges or elements being processed
- Demonstrate comparisons, swaps, or other operations
- Use consistent timing: start times should be sequential (0, 2, 4, 6...)
- Use consistent duration: usually 2 seconds per step
- Elements in animate commands must exist in the array

Example Pattern (works for any 1-D array problem):
text "Algorithm: [Problem Name]"
array [1,2,3,4,5,6,7,8,9]
animate highlight [1,9] 0 2
text "Step 1: [Description]"
animate select [5] 2 2
text "Step 2: [Description]"
animate highlight [6,9] 4 2
text "Step 3: [Description]"

Example of CORRECT usage:
text "Binary Search Problem" size 32 weight 700
text "Find target in sorted array"
array [1,3,5,7,9]
animate highlight [1,9] 0 2
text "Initial search range: entire array"
animate select [5] 2 2
text "Check middle element: 5"
text "Time: O(log n), Space: O(1)"

Example of INCORRECT usage:
array ["Binary Search Problem"]  ❌ - This is a title, use text
array ["Time: O(log n)","Space: O(1)"]  ❌ - This is complexity info, use text
text "Title" grid 1 12 1 1  ❌ - No grid positioning needed
animate highlight [10,11] 0 2  ❌ - Elements don't exist in array`
      },
      {
        role: 'user',
        content: `Convert this Scene Plan JSON to DSL:\n\n${JSON.stringify(scenePlan, null, 2)}`
      }
    ];
  }
}