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
        content: `You are a Content Planner that produces structured plans for educational content. You break down complex topics into clear, visualizable components.

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
      "complexity": "string (e.g., 'Time: O(n), Space: O(1)' or 'Simple but inefficient')"
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
        "values": [number|string|boolean],
        "purpose": "string (what this array demonstrates - e.g., 'input example', 'step visualization', 'result', 'data comparison')"
      }
    ],
    "animations": [
      {
        "type": "highlight|select|focus|compare",
        "elements": [number|string|boolean],
        "purpose": "string (what this animation demonstrates - e.g., 'search range', 'current element', 'comparison', 'data transformation')"
      }
    ]
  }
}

CRITICAL: In visualRequirements.arrays, include ONLY actual data arrays that should be visualized as boxes/cells. Do NOT include explanatory text, complexity information, or bullet points here. Those will be rendered as regular text.

Examples of what goes in arrays:
✓ [1, 3, 5, 7, 9] - actual data to visualize
✓ [2, 4, 6, 8] - another data example
✓ [true, false, true] - boolean data
✓ ["red", "blue", "green"] - string data
✓ [10, 20, 30, 40] - numeric data
✗ ["Time: O(n)", "Space: O(1)"] - this is text, not array data
✗ ["Binary search", "Divide and conquer"] - these are concepts, not array elements
✗ ["Target not found", "Array empty"] - these are explanations, not array data
✗ ["Divide and conquer", "Efficient searching"] - these are key ideas, not array data

ANIMATION GUIDELINES:
- Use animations for step-by-step processes that involve data progression or transformation
- highlight: Show ranges, focus areas, or elements being processed
- select: Highlight specific elements for comparison or selection
- focus: Emphasize the current element being examined
- compare: Show elements being compared side-by-side
- Do NOT include timing information (startTime, duration) - this is handled automatically
- Elements in animations must exist in the arrays defined above
- Animation styling (colors, scale factors, easing) is procedurally generated for consistent theming

SUPPORTED CONTENT TYPES:
- Algorithm explanations (sorting, searching, optimization, etc.)
- Data structure demonstrations (arrays, lists, trees, graphs)
- Mathematical concepts (sequences, patterns, operations)
- Process flows (step-by-step transformations, workflows)
- Statistical concepts (distributions, aggregations, comparisons)
- Scientific concepts (measurements, observations, experiments)
- Any educational content that benefits from visual array representation`
      },
      {
        role: 'user',
        content: `Create a structured plan for this educational content: ${prompt}`
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
          "elements": [number|string|boolean],
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
   * Animation Planner (LLM #3) - creates step-by-step animations for algorithm explanations
   */
  static animationPlanner(scenePlan: any, contentPlan: any): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are an Animation Planner that creates step-by-step animations for educational content.

CRITICAL: Your response MUST be valid JSON only. Do NOT include any explanatory text, markdown, or prose outside the JSON object.

Your task:
1. Analyze the content being explained
2. Create a logical sequence of animations that demonstrate the process
3. Map each animation step to specific array elements
4. Ensure animations tell a clear story

Your output MUST be valid JSON matching this exact schema:
{
  "algorithm": "string (algorithm name, e.g., 'binary search', 'two sum', 'sliding window')",
  "steps": [
    {
      "id": "string (unique identifier)",
      "description": "string (what this step demonstrates)",
      "targetElements": [number|string|boolean] (array elements to animate),
      "animationType": "highlight|select|focus|compare",
      "explanation": "string (text to show during this step)"
    }
  ],
  "timing": {
    "totalSteps": number (total number of animation steps)
  }
}

ANIMATION TYPES:
- highlight: Show ranges/areas being considered (e.g., search space, window)
- select: Emphasize current element being examined (e.g., middle element, pivot)
- focus: Draw attention to specific element (e.g., target found, comparison result)
- compare: Show elements being compared side-by-side (e.g., two sum pairs)

ANIMATION PATTERNS:
- Search algorithms: highlight search range → select current element → compare with target → highlight new range → repeat until found
- Comparison processes: highlight pair → compare elements → highlight result → select next pair
- Data transformation: highlight input → select elements → highlight output → repeat
- Step-by-step processes: select current → highlight change → select next → repeat
- Sorting algorithms: highlight unsorted → select pivot → compare elements → highlight sorted → repeat
- Mathematical concepts: highlight input → select operation → highlight result → repeat

TIMING GUIDELINES:
- Do NOT include timing information (startTime, duration) - this is handled automatically
- Focus on the logical sequence of steps
- Elements in targetElements must exist in the arrays from the scene plan

CRITICAL RULES:
- Only animate elements that exist in the scene plan arrays
- Each step should have a clear purpose in explaining the content
- Animation sequence should follow the logical flow of the process
- Use appropriate animation types for each step's purpose

CONTENT EXAMPLES:
Search algorithm: [1,3,5,7,9] → highlight range → select middle → compare → highlight new range
Comparison process: [2,4,6,8] → highlight pair → compare → highlight result → next pair
Data transformation: [10,20,30] → highlight input → select → highlight output
Mathematical concept: [1,2,3,4] → highlight input → select operation → highlight result

FINAL REMINDER: Return ONLY valid JSON. Do NOT include any text before or after the JSON object.`
      },
      {
        role: 'user',
        content: `Create animation plan for this educational content:

Content Plan: ${JSON.stringify(contentPlan, null, 2)}

Scene Plan: ${JSON.stringify(scenePlan, null, 2)}`
      }
    ];
  }

  /**
   * DSL Emitter (LLM #4) - turns Scene Plan JSON + Animation Plan into DSL program
   */
  static dslEmitter(scenePlan: any, animationPlan?: any): LlmMessage[] {
    return [
      {
        role: 'system',
        content: `You are a DSL Emitter that translates Scene Plan JSON + Animation Plan to DSL commands.

STRICT RULES:
1. Output ONLY the DSL inside one \`\`\`dsl fenced block
2. Do NOT specify grid positions - the procedural system will handle layout automatically
3. Use array command ONLY for actual data arrays (numbers/strings representing array elements)
4. Use animate command for animation steps from the animation plan
5. Use caption command for synchronized text explanations during animations
6. No prose, comments, or explanations outside the DSL block

DSL Syntax:
\`\`\`dsl
seed <int>
style <auto|Minimal|Monospace|...>

heading "<title>"
subtitle "<description>"
explanation "<general explanation of the concept>"
example "<problem example with target value>"
array [v1,v2,v3]
animate <type> [elements]
caption <order> "<text>"
conclusion <order> "<text>"
\`\`\`

Animation Types (for any 1-D array problem):
- highlight: Visual highlighting of array elements (background color change)
- select: Selection state (scaling for emphasis)
- focus: Focus state (subtle scaling for attention)
- compare: Comparison state (background color for comparison)

Heading Rules:
- Generate a clear, descriptive title for the algorithm or concept being demonstrated
- Keep headings concise but informative (e.g., "Binary Search Algorithm", "Bubble Sort Visualization")
- Use title case formatting
- Positioned at the top of the canvas, same distance from center as captions

Subtitle Rules:
- Generate a short, concise description of what the algorithm does
- Keep subtitles very brief - maximum 6-8 words (e.g., "Finding target value in sorted array", "Sorting by swapping adjacent pairs")
- Use sentence case formatting
- Avoid full sentences - use phrases instead
- Positioned below the heading, between heading and array content

Explanation Rules:
- Extract the general explanation from the content plan's problem.description field
- Provide a clear, concise explanation of the concept being demonstrated
- Use the exact text from the problem.description field
- Positioned below the subtitle, between subtitle and example
- Helps learners understand the concept before seeing the example

Example Rules:
- Extract the problem example from the content plan's problem.example field
- Show the complete example including the target value being searched for
- Use the exact text from the problem.example field
- Positioned below the explanation, between explanation and array content
- Helps learners understand what we're searching for before seeing the array

Caption Rules - CRITICAL:
- Captions are simplified to only include order and text
- DO NOT include any timing parameters, transition types, or animation specifications
- DO NOT include "fade-in", "fade-out", "slide-up", "slide-down" or any other transition keywords
- DO NOT include startTime, duration, exitTime, or any timing values
- Caption format is EXACTLY: caption <order> "<text>"
- Timing is automatically calculated based on caption order
- Each caption gets: fadeIn (0.5s) + visibleTime (3s) + fadeOut (0.5s) = 4s total
- Only one caption is visible at a time
- Captions appear sequentially: caption 1, then caption 2, then caption 3, etc.
- Entry/exit animations (fade in/out) are handled automatically by the system

Caption Content Guidelines:
- Captions should explain the ALGORITHMIC APPROACH, not just what's being highlighted
- Focus on HOW the algorithm solves the problem, not just what's visually happening
- Explain the reasoning behind each step (e.g., "Compare middle element with target to determine search direction")
- Avoid generic descriptions like "Highlight the array" or "Select element 5"
- Instead use: "Compare middle element with target to determine which half to search"
- Each caption should advance the learner's understanding of the algorithm's logic

Note: Animation styling (colors, scale factors, easing, duration) is procedurally generated based on the seed for consistent, theme-appropriate results.

CRITICAL: 
- Arrays are ONLY for visualizing actual data: [1,2,3], [5,10,15], [true,false]
- Arrays are NEVER for concepts, explanations, or text content
- Do NOT include grid positioning - the system will handle layout automatically
- Use animate commands to show step-by-step process progression
- Elements in animate commands must match values in the array
- Do NOT include timing parameters (startTime, duration) - timing is handled automatically
- Use caption commands for synchronized text explanations that appear during animations
- Caption order should be sequential (1, 2, 3, etc.)
- Caption timing is automatically synchronized with animation steps
- Only one caption should be visible at a time (handled automatically)
- Use conclusion command at the end to show time/space complexity and use cases
- Conclusion automatically fades out the array and displays complexity information

Conclusion Rules - CRITICAL:
- Use the new ordered format: conclusion <order> "<text>"
- Each conclusion renders over 2 rows with proper spacing
- Conclusions are grouped in pairs and displayed together
- Be explicit about complexity types: "Time Complexity: O(log n)", "Space Complexity: O(1)"
- Include use cases: "Use Case: Searching in sorted arrays"
- Make complexity analysis clear and educational
- Example format:
  conclusion 1 "Time Complexity: O(log n)"
  conclusion 2 "Space Complexity: O(1)" 
  conclusion 3 "Use Case: Searching in sorted arrays"

GENERIC ANIMATION GUIDELINES:
- Use animations for any process that involves step-by-step progression through data
- Show current focus/selection at each step
- Highlight relevant ranges or elements being processed
- Demonstrate comparisons, transformations, or other operations
- Do NOT include timing parameters - timing is handled automatically
- Elements in animate commands must exist in the array

Example Pattern (works for any 1-D array problem):
heading "Binary Search Algorithm"
subtitle "Finding target value in sorted array"
explanation "The binary search algorithm efficiently finds a target value within a sorted array by repeatedly dividing the search interval in half."
example "Given a sorted array [1, 3, 5, 7, 9] and a target value of 5, the algorithm will find the target in 3 steps."
array [1,2,3,4,5,6,7,8,9]
animate highlight [1,9]
caption 1 "Compare middle element with target to determine search direction"
animate select [5]
caption 2 "If target equals middle, we found our answer"
animate highlight [6,9]
caption 3 "If target is greater, search the right half"
conclusion 1 "Time Complexity: O(log n)"
conclusion 2 "Space Complexity: O(1)"
conclusion 3 "Use Case: Searching in sorted arrays"

Note: Timing is automatically calculated - animations start 0.5s after captions, captions appear sequentially, etc.
Conclusion appears after all animations complete and fades out the array to show complexity information.

Example of CORRECT usage:
heading "Binary Search Algorithm"
subtitle "Finding target value in sorted array"
explanation "The binary search algorithm efficiently finds a target value within a sorted array by repeatedly dividing the search interval in half."
example "Given a sorted array [1, 3, 5, 7, 9] and a target value of 5, the algorithm will find the target in 3 steps."
array [1,3,5,7,9]
animate highlight [1,9]
caption 1 "Compare middle element with target to determine search direction"
animate select [5]
caption 2 "If target equals middle, we found our answer"
conclusion 1 "Time Complexity: O(log n)"
conclusion 2 "Space Complexity: O(1)"
conclusion 3 "Use Case: Searching in sorted arrays"

Example of INCORRECT usage:
array ["Binary Search Problem"]  ❌ - This is a title, not array data
array ["Time: O(log n)","Space: O(1)"]  ❌ - This is complexity info, not array data
array ["Divide and conquer", "Efficient searching"]  ❌ - These are key ideas, not array data
array ["Target not found", "Array empty"]  ❌ - These are edge cases, not array data
animate highlight [10,11] 0 2  ❌ - Elements don't exist in array
caption 1 "Text" fade-in  ❌ - DO NOT include transition types
caption 1 "Text" 0 0.5 5  ❌ - DO NOT include timing parameters
caption 1 "Highlight the array"  ❌ - Too generic, explain the algorithmic approach
conclusion "O(log n)" "O(1)" "Searching in sorted arrays"  ❌ - Old format, use ordered format
conclusion 1 "O(log n)"  ❌ - Be explicit: "Time Complexity: O(log n)"

ANIMATION INTEGRATION:
- Use animation steps from the animation plan to generate animate commands
- Each animation step should become an animate command with the specified timing
- Use captions to provide explanations during animations
- Ensure animation elements match the arrays in the scene plan`
      },
      {
        role: 'user',
        content: `Convert this Scene Plan JSON and Animation Plan to DSL:

Scene Plan: ${JSON.stringify(scenePlan, null, 2)}

${animationPlan ? `Animation Plan: ${JSON.stringify(animationPlan, null, 2)}` : 'No animation plan provided - generate static content only'}`
      }
    ];
  }
}