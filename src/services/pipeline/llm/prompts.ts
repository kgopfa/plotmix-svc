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
  "canvas": {"width": number, "height": number},
  "style": "auto"|string,
  "grid": {
    "columns": number,
    "rows": number, 
    "gutterX": number,
    "gutterY": number,
    "marginX": number,
    "marginY": number
  },
  "sections": [
    {
      "id": "string",
      "title": "string",
      "text": "string (for paragraph content)",
      "bullets": ["string"] (for bullet points - will be rendered as separate text elements),
      "complexity": "string (for complexity info like 'Time: O(n), Space: O(1)')",
      "keyIdeas": ["string"] (for concept lists),
      "gridPosition": {"colStart": number, "colSpan": number, "rowStart": number, "rowSpan": number},
      "visuals": [
        {
          "kind": "array",
          "values": [number|string],
          "purpose": "string",
          "gridPosition": {"colStart": number, "colSpan": number, "rowStart": number, "rowSpan": number}
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. Use canvas 1920x1080 with a 12-column, 8-row grid system
2. Always specify gridPosition for ALL elements (title, text, bullets, complexity, keyIdeas, visuals)
3. Distribute content across rows to avoid stacking everything vertically
4. Arrays are ONLY for actual data visualization (numbers/strings that represent array elements)
5. All other content (titles, descriptions, complexity, concepts) goes in text/bullets/complexity/keyIdeas fields
6. Use appropriate colSpan (1-12) and rowSpan (usually 1) for each element
7. Start from row 1, distribute elements across multiple rows

Grid Layout Strategy:
- Row 1-2: Problem title and description  
- Row 3-4: Example arrays and explanations
- Row 5-6: Approach comparisons
- Row 7-8: Edge cases and complexity info

Example gridPosition usage:
- Title: {"colStart": 1, "colSpan": 12, "rowStart": 1, "rowSpan": 1}
- Array visual: {"colStart": 3, "colSpan": 6, "rowStart": 3, "rowSpan": 1}
- Complexity text: {"colStart": 1, "colSpan": 6, "rowStart": 7, "rowSpan": 1}`
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
2. Always emit a grid setup command first
3. Always specify grid positions for ALL elements
4. Use text command for titles, descriptions, bullets, complexity info, keyIdeas
5. Use array command ONLY for actual data arrays (numbers/strings representing array elements)
6. No prose, comments, or explanations outside the DSL block

DSL Syntax:
\`\`\`dsl
seed <int>
canvas <width>x<height>
style <auto|Minimal|Monospace|...>
grid <cols> cols <rows> rows <gutterX> gutter <marginX> margin

text "<content>" grid <colStart> <colSpan> <rowStart> <rowSpan>
text "<content>" size <px> weight <int> grid <colStart> <colSpan> <rowStart> <rowSpan>
array [v1,v2,v3] grid <colStart> <colSpan> <rowStart> <rowSpan>
\`\`\`

CRITICAL: 
- Emit ONE text command per piece of content (title, description, each bullet point, complexity info, each key idea)
- Do NOT put explanatory text in array commands
- Arrays are ONLY for visualizing actual data: [1,2,3], ["a","b","c"], [5,10,15]
- Text like "Time: O(n)" or "Binary search concept" goes in text commands, NOT arrays

Example of CORRECT usage:
text "Binary Search Problem" size 32 weight 700 grid 1 12 1 1
text "Find target in sorted array" grid 1 12 2 1  
array [1,3,5,7,9] grid 3 6 3 1
text "Time: O(log n), Space: O(1)" grid 1 6 7 1

Example of INCORRECT usage:
array ["Binary Search Problem"] grid 1 12 1 1  ❌ - This is a title, use text
array ["Time: O(log n)","Space: O(1)"] grid 1 6 7 1  ❌ - This is complexity info, use text`
      },
      {
        role: 'user',
        content: `Convert this Scene Plan JSON to DSL:\n\n${JSON.stringify(scenePlan, null, 2)}`
      }
    ];
  }
}