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
    ]
  }
}

CRITICAL: In visualRequirements.arrays, include ONLY actual data arrays that should be visualized as boxes/cells. Do NOT include explanatory text, complexity information, or bullet points here. Those will be rendered as regular text.

Examples of what goes in arrays:
✓ [1, 3, 5, 7, 9] - actual data to visualize
✓ [2, 4, 6, 8] - another data example
✗ ["Time: O(n)", "Space: O(1)"] - this is text, not array data
✗ ["Binary search", "Divide and conquer"] - these are concepts, not array elements`
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
\`\`\`

CRITICAL: 
- Emit ONE text command per piece of content (title, description, each bullet point, complexity info, each key idea)
- Do NOT put explanatory text in array commands
- Arrays are ONLY for visualizing actual data: [1,2,3], ["a","b","c"], [5,10,15]
- Text like "Time: O(n)" or "Binary search concept" goes in text commands, NOT arrays
- Do NOT include grid positioning - the system will handle layout automatically

Example of CORRECT usage:
text "Binary Search Problem" size 32 weight 700
text "Find target in sorted array"
array [1,3,5,7,9]
text "Time: O(log n), Space: O(1)"

Example of INCORRECT usage:
array ["Binary Search Problem"]  ❌ - This is a title, use text
array ["Time: O(log n)","Space: O(1)"]  ❌ - This is complexity info, use text
text "Title" grid 1 12 1 1  ❌ - No grid positioning needed`
      },
      {
        role: 'user',
        content: `Convert this Scene Plan JSON to DSL:\n\n${JSON.stringify(scenePlan, null, 2)}`
      }
    ];
  }
}