import OpenAI from 'openai';
// Intentionally no logging here; this is a thin connection singleton

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  provider: 'openai' | 'anthropic';
  baseURL?: string;
}

export interface MainStateGenerationRequest {
  prompt: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  projectFeatures?: {
    attachments?: { enabled: boolean };
    audio?: { enabled: boolean };
    music?: { enabled: boolean };
    webSearch?: { enabled: boolean };
  };
}

export interface MainStateGenerationResponse {
  success: boolean;
  mainState?: any;
  message?: string;
  error?: string;
  name?: string;
  title?: string;
  description?: string;
}

export class OpenAIClient {
  private static instance: OpenAIClient;
  private client: OpenAI | null = null;
  private config: OpenAIConfig;

  private constructor() {
    this.config = this.loadConfig();
    
    // Create OpenAI client (will be mocked in tests)
    const isAnthropic = this.config.provider === 'anthropic';
    const defaultHeaders = isAnthropic
      ? {
          'x-api-key': this.config.apiKey,
          'anthropic-version': process.env['ANTHROPIC_VERSION'] || '2023-06-01',
        }
      : undefined;

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL,
      defaultHeaders,
    });
  }

  public static getInstance(): OpenAIClient {
    if (!OpenAIClient.instance) {
      OpenAIClient.instance = new OpenAIClient();
    }
    return OpenAIClient.instance;
  }

  private loadConfig(): OpenAIConfig {
    const provider = (process.env['LLM_PROVIDER'] as 'openai' | 'anthropic') || 'openai';

    if (provider === 'anthropic') {
      const apiKey = process.env['ANTHROPIC_API_KEY'];
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required when LLM_PROVIDER=anthropic');
      }
      const model = process.env['ANTHROPIC_MODEL'];
      if (!model) {
        throw new Error('ANTHROPIC_MODEL environment variable is required when LLM_PROVIDER=anthropic');
      }
      return {
        apiKey,
        model,
        provider,
        baseURL: process.env['ANTHROPIC_BASE_URL'] || 'https://api.anthropic.com/v1/',
      };
    }

    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    const model = process.env['OPENAI_MODEL'];
    if (!model) {
      throw new Error('OPENAI_MODEL environment variable is required');
    }
    return {
      apiKey,
      model,
      provider,
    };
  }

  public getConfig(): OpenAIConfig {
    return { ...this.config };
  }

  public getSdk(): OpenAI {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }
    return this.client;
  }

  // ------------- Convenience wrappers -------------
  private async withRetry<T>(fn: () => Promise<T>, attempts = 2, baseDelayMs = 150): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (i < attempts - 1) {
          const delay = baseDelayMs * Math.pow(2, i);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  public async callLLMMessages(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: { json?: boolean; temperature?: number; modelOverride?: string; attempts?: number } = {}
  ): Promise<any> {
    const sdk = this.getSdk();
    const attempts = options.attempts ?? 2;
    return this.withRetry(async () => {
      const body: any = {
        model: options.modelOverride || this.config.model,
        messages,
        temperature: options.temperature ?? 0.2,
      };
      if (options.json !== false) {
        body.response_format = { type: 'json_object' } as const;
      }
      const res = await sdk.chat.completions.create(body);
      const text = res.choices[0]?.message?.content ?? (options.json === false ? '' : '{}');
      if (options.json === false) return text;
      try {
        return JSON.parse(text);
      } catch (e) {
        // Attempt to salvage JSON from common wrappers like Markdown fences
        const salvaged = tryExtractJson(text);
        if (salvaged) return salvaged;
        throw new LlmJsonParseError(text);
      }
    }, attempts);
  }

  public async callLLMPrompt(
    prompt: string,
    options: { json?: boolean; temperature?: number; modelOverride?: string; attempts?: number } = {}
  ): Promise<any> {
    return this.callLLMMessages([{ role: 'user', content: prompt }], options);
  }

  public async generateScript(prompt: string, projectState: any): Promise<string> {
    const systemPrompt = `You are a JavaScript code generator for a canvas-based design application. 
Your task is to generate JavaScript code that will be executed on the frontend to manipulate a project object.

The project object has this structure:
- project.elements: Array of canvas elements with properties like x, y, width, height, fill, etc.
- project.groups: Array of element groups with properties like elementIds, animations, etc.
- project.timeline: Object with scale, duration, currentTime, and animationStates

CRITICAL REQUIREMENTS:
1. Generate EXECUTABLE code, not function definitions
2. The code must IMMEDIATELY modify the project object
3. The code must call setResult(project) at the end
4. Do NOT define functions unless you also call them

EXAMPLES:

❌ WRONG (function definition without execution):
const moveElements = () => { project.elements.forEach(el => el.x += 100); };

✅ CORRECT (immediate execution):
project.elements.forEach(element => {
  element.x += 100;
});
setResult(project);

❌ WRONG (function definition):
function createText() { /* code */ }

✅ CORRECT (immediate execution):
const newElement = { /* element data */ };
project.elements.push(newElement);
setResult(project);

Generate ONLY the JavaScript code that accomplishes the user's request. Do not include explanations, comments, or markdown formatting.
The code should be ready to execute and should use the 'project' variable to access the data.
Return only the JavaScript code, nothing else.`;

    const userPrompt = `Project state: ${JSON.stringify(projectState, null, 2)}

User request: ${prompt}

Generate JavaScript code that accomplishes this request:`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    try {
      const response = await this.callLLMMessages(messages, { 
        json: false, 
        temperature: 0.3,
        attempts: 2 
      });
      
      // Clean up the response to ensure it's just JavaScript code
      let script = response.trim();
      
      // Remove markdown code blocks if present
      script = script.replace(/```(?:javascript|js)?\n?/gi, '');
      script = script.replace(/```\n?/gi, '');
      
      // Remove any explanatory text before or after the code
      const codeMatch = script.match(/([\s\S]*)/);
      if (codeMatch) {
        script = codeMatch[1].trim();
      }
      
      return script;
    } catch (error) {
      throw new Error(`Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Standalone helper (clean orchestrator usage)
export async function callLLM(prompt: string, json: boolean = true, temperature: number = 0.2, attempts: number = 2): Promise<any> {
  const client = OpenAIClient.getInstance();
  return client.callLLMPrompt(prompt, { json, temperature, attempts });
}

// Error type to expose raw LLM output for diagnostics on JSON parse failures
export class LlmJsonParseError extends Error {
  public rawText: string;
  constructor(rawText: string) {
    super('Failed to parse JSON from LLM response');
    this.name = 'LlmJsonParseError';
    this.rawText = rawText;
  }
}

// Best-effort extraction of a JSON object string from LLM output
function tryExtractJson(text: string): any | null {
  try {
    // Strip Markdown code fences if present
    const fenceMatch = text.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (fenceMatch && fenceMatch[1]) {
      const inner = fenceMatch[1].trim();
      return JSON.parse(inner);
    }
    // Fallback: take substring from first '{' to last '}'
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first !== -1 && last !== -1 && last > first) {
      const candidate = text.slice(first, last + 1);
      return JSON.parse(candidate);
    }
  } catch {}
  return null;
}