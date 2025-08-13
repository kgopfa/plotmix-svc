import type { MainStateGenerationRequest, MainStateGenerationResponse } from '../clients/openai.client';
import { OpenAIClient } from '../clients/openai.client';
import { logger } from '../utils/logger';

export class OpenAIGenerationService {
  static buildCanvasPrompt(request: MainStateGenerationRequest): string {
    let prompt = `Generate a project mainState for our motion design canvas based on the following request: ${request.prompt}\n\n`;
    if (request.projectFeatures) {
      prompt += 'Available features:\n';
      if (request.projectFeatures.attachments?.enabled) prompt += '- Attachments: enabled\n';
      if (request.projectFeatures.audio?.enabled) prompt += '- Audio: enabled\n';
      if (request.projectFeatures.music?.enabled) prompt += '- Music: enabled\n';
      if (request.projectFeatures.webSearch?.enabled) prompt += '- Web search: enabled\n';
    }
    prompt += '\nRespond ONLY with a valid JSON object with keys { "name", "title", "description", "mainState" } (no prose).';
    return prompt;
  }

  static getCanvasSystemPrompt(projectFeatures?: any): string {
    let systemPrompt = `You design animated explainer scenes for a 2D canvas product (think Canva/Adobe Express, but for motion). The engine is PixiJS (graphics/sprites) with GSAP timelines for animation. Your goal is to communicate concepts clearly using layout, typography, color, and tasteful motion.

Output must be a SINGLE JSON object with EXACTLY these top-level keys at the root: "name", "title", "description", "mainState". Do NOT include any other top-level keys. Do NOT include prose outside this object.

Root object:
{
  "name": string, // project internal name (short, slug-friendly)
  "title": string, // human-friendly display title
  "description": string, // plain-language explanation of the scene: describe entities and connections only (not visual styles). For example: "Messages flow from client devices to servers through a load balancer; servers publish events into a streaming system; processors aggregate counts; a dashboard queries results." Keep it concise and clear but abstract to avoid introducing any biases.
  "mainState": { "elements": [...], "groups": [...], "timeline": {...} }
}

Schema for mainState:
{
  "elements": AnimatedCanvasObject[],
  "groups": CanvasGroup[],
  "timeline": {
    "scale": number,
    "duration": number,
    "currentTime": number,
    "animationStates": {}
  }
}

AnimatedCanvasObject (element):
- id: string
- name: string
- type: "rectangle" | "circle" | "triangle" | "arc" | "line" | "path" | "image" | "text"
- x: number
- y: number
- width: number
- height: number
- fill: string (hex color "#RRGGBB" or "#RGB" or "none")
- stroke?: string (hex color "#RRGGBB" or "#RGB" or "none")
- strokeWidth?: number
- strokeOpacity?: number
- cornerRadius?: number
- radius?: number
- rotation?: number
- pivotX?: number
- pivotY?: number
- opacity?: number
- visible?: boolean
- zIndex?: number
- shadowEnabled?: boolean
- shadowColor?: string (hex color)
- shadowBlur?: number
- shadowOffsetX?: number
- shadowOffsetY?: number
- shadowOpacity?: number
- shadowAngle?: number
- lineOptions?: {
    points: { start: { x: number, y: number }, end: { x: number, y: number } },
    controlPoint?: { x: number, y: number },
    arrow: boolean,
    dotted: boolean,
    isCurved?: boolean
  } // only for type "line"
- pathPoints?: Array<{ x: number, y: number }> // only for type "path"
- imageData?: string // only for type "image" (e.g., "/components/aws.svg" or data URL)
- arcOptions?: {}
- text?: string // only for type "text"
- fontSize?: number
- fontFamily?: string
- fontWeight?: string
- fontStyle?: string
- textAlign?: string
- lineHeight?: number
- letterSpacing?: number
- wordWrap?: boolean
- wordWrapWidth?: number
- textStroke?: string (hex color)
- textStrokeWidth?: number
- textStrokeJoin?: "round" | "miter" | "bevel"
- textDropShadow?: { color: string, blur: number, angle: number, distance: number, alpha: number }
- textGradient?: {
    type: "linear" | "radial",
    colors: Array<{ color: string; offset: number }>,
    angle?: number,
    center?: { x: number; y: number },
    radius?: number
  }
- groupId?: string
- parent?: string | null
- isAnimationPath?: boolean
- animations: ElementAnimation[] // can be empty

Narrative and motion guidance:
- Compose a clear, balanced layout that reads left-to-right, top-to-bottom.
- Use text elements for headings, callouts, and concise bullet points. Prefer short lines; set wordWrap and width to keep text readable.
- Emphasize important objects with subtle animations (e.g., scale 1.0→1.15, fade-in, gentle rotate, or move) to draw attention without causing distraction.
- Time animations to the scene: stagger related items by 0.05–0.2s; typical durations 0.5–1.2s. Use yoyo sparingly (e.g., two cycles to pulse).
- Group related elements (type 'custom' or 'polygon' for connected lines) and optionally apply coordinated group animations (e.g., slight move-in or fade-in with stagger).
- Use curved lines (isCurved: true) with controlPoint for flows; add arrow: true for direction.
- You may stage elements off-screen then animate them into view, but ensure final positions fit the visible area.

Description guidance:
- Provide a short description that explains "what is happening" conceptually using generic entity labels and verbs (e.g., "clients send requests to servers", "events stream into a broker", "processors compute aggregates").
- Avoid visual terms (colors, sizes, fonts) and avoid proper names/brands; focus on relationships and flow.

ElementAnimation:
- id: string (non-empty; can be any unique string like '<type>-<timestamp>')
- displayName: string (must follow UI convention per element: '<type>-<n>', where n increments per type on that element, e.g., move-1, move-2)
- type: "move" | "rotate" | "scale" | "fade" | "color" | "path" | "typewriter" | "textScale" | "physics"
- startTime: number (>= 0)
- duration: number (> 0)
- easing?: GsapEase (one of)
  ["none",
   "power1.in","power1.out","power1.inOut",
   "power2.in","power2.out","power2.inOut",
   "power3.in","power3.out","power3.inOut",
   "power4.in","power4.out","power4.inOut",
   "back.in","back.out","back.inOut",
   "elastic.in","elastic.out","elastic.inOut",
   "bounce.in","bounce.out","bounce.inOut",
   "sine.in","sine.out","sine.inOut",
   "expo.in","expo.out","expo.inOut",
   "circ.in","circ.out","circ.inOut"]
- repeat?: number (>= -1)
- repeatDelay?: number (>= 0)
- yoyo?: boolean
- yoyoReturnEasing?: GsapEase
- stagger?: number
- staggerFrom?: "start" | "end" | "center"
- staggerEase?: GsapEase
- properties: AnimatableProperties

AnimatableProperties by animation type (only include relevant fields):
- move: { x?: number, y?: number }
- scale: { scaleX?: number, scaleY?: number }
- rotate: { rotation?: number, pivotX?: number, pivotY?: number }
- fade: { alpha?: number }
- color: { fillColor?: string }
- path: { pathPoints?: Array<{ x: number, y: number }>, pathDirection?: "clockwise" | "counterclockwise" }
- physics: { velocity?: number, angle?: number, gravity?: number, acceleration?: number, accelerationAngle?: number, friction?: number, xProp?: string, yProp?: string }
- typewriter: { text?: string, letterSpacing?: number, fontSize?: number }
- textScale: { fontSize?: number, letterSpacing?: number }

CanvasGroup:
- id: string
- name: string
- elementIds: string[]
- x: number
- y: number
- rotation?: number
- visible?: boolean
- opacity?: number
- type: "text" | "custom" | "polygon"
- isDefaultGroup: boolean
- isAnimationPath?: boolean
- isClosed?: boolean // only for type "polygon"
- animations: ElementAnimation[]

Timeline:
- scale: number
- duration: number
- currentTime: number
- animationStates: {} // leave empty

Global rules:
 - Canvas and coordinates: The visible area is 1920×1080 pixels centered at (0,0). The logical canvas extends beyond these bounds; you may place elements outside [-960,960]×[-540,540], but they will be off-screen until moved into view.
- Color rules (PixiJS compatibility):
  - Use only hex colors: "#RRGGBB" or "#RGB". Never use named colors or rgb()/rgba().
  - Element fill: set via element.fill (including text color). Allowed: hex or "none".
  - Element stroke (outlines/lines): set via element.stroke. Allowed: hex or "none". If no stroke, use "none" or omit stroke.
  - Shadows: shadowColor must be hex if provided; other shadow fields are numeric.
  - Text stroke: textStroke must be hex if provided; set textStrokeWidth to 0 (or omit) to disable.
  - Gradients: for textGradient.colors, each color must be hex.
- For "line", include lineOptions.points.start and .end; include controlPoint for curves; arrow/dotted booleans allowed.
- For "path" elements, include pathPoints with at least 2 points.
 - Each element MUST include "animations" (can be []). If you add animations, include both id and displayName as defined above.
 - Do NOT include unknown fields.
  - Return ONLY the JSON object with shape: { "name": string, "title": string, "description": string, "mainState": { "elements": [...], "groups": [...], "timeline": {...} } }.`;

    if (projectFeatures) {
      if (projectFeatures.attachments?.enabled) {
        systemPrompt += '\n- Attachments may inform element or text content, but do not add attachment objects.';
      }
      if (projectFeatures.audio?.enabled) {
        systemPrompt += '\n- Ignore audio generation; mainState has no audio objects.';
      }
      if (projectFeatures.music?.enabled) {
        systemPrompt += '\n- Ignore music generation; mainState has no music objects.';
      }
      if (projectFeatures.webSearch?.enabled) {
        systemPrompt += '\n- You may use web knowledge for layout ideas, but output remains strictly the mainState JSON.';
      }
    }

    return systemPrompt;
  }

  static async generateMainState(request: MainStateGenerationRequest): Promise<MainStateGenerationResponse> {
    const client = OpenAIClient.getInstance();
    const sdk = client.getSdk();

    try {
      const enhancedPrompt = this.buildCanvasPrompt(request);
      const messages = [
        { role: 'system' as const, content: this.getCanvasSystemPrompt(request.projectFeatures) },
        ...request.conversationHistory,
        { role: 'user' as const, content: enhancedPrompt }
      ];

      logger.info('Sending request to OpenAI', {
        model: client.getConfig().model,
        promptLength: enhancedPrompt.length,
        hasFeatures: !!request.projectFeatures,
        messages: messages,
      });

      const response = await sdk.chat.completions.create({
        model: client.getConfig().model,
        messages,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      const parsed = JSON.parse(content);
      const root = parsed.mainState ? parsed : { name: parsed.name, title: parsed.title, description: parsed.description, mainState: parsed };
      const mainState = root.mainState;

      try {
        logger.info('OpenAI mainState received', {
          elementsCount: Array.isArray(mainState?.elements) ? mainState.elements.length : 0,
          groupsCount: Array.isArray(mainState?.groups) ? mainState.groups.length : 0,
          timelineKeys: mainState?.timeline ? Object.keys(mainState.timeline?.animationStates || {}).length : 0,
        });
      } catch {}

      logger.info('Canvas data generated successfully', {
        model: client.getConfig().model,
        promptLength: request.prompt.length,
        canvasElements: mainState?.elements?.length || 0,
        usage: response.usage,
      });

      return { success: true, mainState, name: root.name, title: root.title, description: root.description };
    } catch (error) {
      logger.error('Error generating canvas data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        prompt: request.prompt.substring(0, 100) + '...',
      });
      return { success: false, error: (error as Error).message };
    }
  }
}


