import type { Role } from '../types';

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
        "purpose": "string",
        "position": {"x": number, "y": number}
      }
    ]
  }
}

Be precise and concise. Include which visuals are needed (only arrays are supported).`
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
  "sections": [
    {
      "id": "string",
      "title": "string",
      "text": "string (optional)",
      "bullets": ["string"] (optional),
      "keyIdeas": ["string"] (optional),
      "example": "string (optional)",
      "visuals": [
        {
          "kind": "array",
          "values": [number|string],
          "at": {"x": number, "y": number},
          "gap": number,
          "cell": number (optional)
        }
      ] (optional)
    }
  ]
}

Rules:
- Use canvas 1920x1080 unless specified otherwise
- Arrays are drawn horizontally with gap=16 and cell=60 unless specified
- Position text elements above arrays (y = array_y - 60 for titles, y = array_y - 24 for descriptions)
- Use seed=42 unless specified
- style="auto" for seeded style selection`
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
- Output ONLY the DSL inside one \`\`\`dsl fenced block
- Use defaults where unspecified
- For each section: emit a title text at (x_section, y_section - 60), then any body text as one-liners
- For visuals, support only: array
- No prose or comments

DSL Syntax:
\`\`\`dsl
seed <int>
canvas <width>x<height>
style <auto|Minimal|Monospace|...>

text at (<x>,<y>) w <px> size <px> weight <int> align <left|center|right> "<one-line content>"
array values [v1,v2,...] at (<x>,<y>) gap <px> cell <px>
\`\`\`

Defaults if omitted: size=28, weight=600, align=left, w=600.`
      },
      {
        role: 'user',
        content: `Convert this Scene Plan JSON to DSL:\n\n${JSON.stringify(scenePlan, null, 2)}`
      }
    ];
  }
}
