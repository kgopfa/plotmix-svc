import { OpenAIClient, LlmJsonParseError } from '../clients/openai.client';
import { logger } from '../utils/logger';
import { validateElementsArray } from '../schema/elements';
import { validateAnimationArrayWithNaming } from '../schema/animations';
import { ENGINE_SPEC } from '../specs/engine-spec';
import { sanitizeMovePropertiesInPlace } from '../utils/sanitize';

export class OpenAIGenerationService {
  // --------- NEW: Multi-step chain helpers ---------
  // Authoritative engine spec used for normalization
  static getAuthoritativeEngineSpec(): string {
    return ENGINE_SPEC;
  }
  private static async runWithRetry<T>(stage: string, fn: () => Promise<T>, attempts = 2): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        logger.warn('LLM stage attempt failed, retrying if attempts remain', { stage, attempt: i + 1, attempts, error: err instanceof Error ? err.message : String(err) });
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
  private static async chatJson(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    opts?: { temperature?: number }
  ): Promise<any> {
    const client = OpenAIClient.getInstance();
    return client.callLLMMessages(messages, { json: true, temperature: opts?.temperature ?? 0.2, attempts: 2 });
  }

  private static async runSpecNormalizer(engineSpec: string) {
    const system = 'You are extracting an actionable checklist from an engine spec.';
    const user = `You are extracting an actionable checklist from the following engine spec. Output JSON with these keys only:\n` +
      `typesAllowed, topLevelKeys, requiredPerType, colorRules, fontAllowlist, easingAllowlist, timelineRules, lineRules, pathRules, textRules, animationRules, groupTypeAllowlist, globalCanvas.\n\n` +
      `- Keep strings/enums compact; no explanations.\n- Echo all numeric ranges and exact enums verbatim.\n\n<ENGINE_SPEC>\n${engineSpec}\n</ENGINE_SPEC>`;
    return await this.runWithRetry('SpecNormalizer', () => this.chatJson([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], { temperature: 0.0 }));
  }

  private static async runSceneOutline(specFacts: any, userBrief: string) {
    const system = 'You produce a concise plan for an animated explainer scene. Do NOT emit final elements.';
    const user = `You produce a concise plan for an animated explainer scene. Do NOT emit final elements.\n` +
      `Use the Spec Facts below to stay within allowed enums and rules.\n\n` +
      `Output JSON with exactly these keys:\n` +
      `name, title, description,\n` +
      `narrative,           // array of short beats\n` +
      `layoutPlan,          // { frame:[1920,1080], flow:"ltr", zones:[{id, x,y,w,h, role}] }\n` +
      `objectPlan,          // array of { idHint, type, role, finalBounds:{x,y,w,h}, text? }\n` +
      `motionPlan           // array of { target:idHint, type, start, duration, easing?, properties:{...} }\n\n` +
      `Constraints:\n- Numbers should be integers where sensible.\n- Keep narrative/objectPlan/motionPlan short and focused (max 15 items total).\n- Coordinates: canvas origin is at center (0,0); place zones and object finalBounds relative to center.\n\n` +
      `<SPEC_FACTS>\n${JSON.stringify(specFacts)}\n</SPEC_FACTS>\n\n` +
      `<USER_BRIEF>\n${userBrief}\n</USER_BRIEF>`;
    return await this.runWithRetry('SceneOutline', () => this.chatJson([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], { temperature: 0.2 }));
  }

  private static async runElementsMaker(specFacts: any, objectPlan: any) {
    const system = 'You produce elements only, conforming to spec facts and object plan.';
    const user = `Produce "elements" ONLY, conforming to Spec Facts and this objectPlan.\n` +
      `Rules:\n` +
      `- Include required fields per type: id, name, type, x, y, fill; for non-line/non-path also width and height (>0).\n` +
      `- Colors: hex "#RRGGBB" or "none" only.\n` +
      `- Text: include fontFamily from allowlist (default "Inter"), fontSize, wordWrap and wordWrapWidth=width when wordWrap=true.\n` +
      `- For "line": include x,y, stroke+strokeWidth, lineOptions.points.start/end; width/height omitted or 0.\n` +
      `- For "path": include x,y and >=2 pathPoints; width/height omitted or 0.\n` +
      `- Every element MUST include "animations": [] (empty for now).\n` +
      `- Keep ids stable from idHint where provided.\n` +
      `- Coordinates: canvas origin is at center (0,0); x and y are relative to center.\n\n` +
      `Return JSON with exactly { "elements": [...] } and nothing else.\n\n` +
      `<SPEC_FACTS>\n${JSON.stringify(specFacts)}\n</SPEC_FACTS>\n` +
      `<OBJECT_PLAN>\n${JSON.stringify(objectPlan)}\n</OBJECT_PLAN>`;
    return await this.runWithRetry('ElementsMaker', () => this.chatJson([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], { temperature: 0.0 }));
  }

  private static async runGroupsTimelineMaker(specFacts: any, elementsFrozen: any, motionPlan: any) {
    const system = 'You add groups, timeline, and populate element animations without changing element geometry or ids.';
    const user = `Given these FROZEN elements (do not change geometry or ids) and a motionPlan, produce:\n` +
      `- groups[]\n- timeline { scale, duration, currentTime, animationStates:{} }\n- Populate animations INSIDE each element per motionPlan.\n\n` +
      `Rules:\n` +
      `- Easing must be from allowlist. Use "power2.out" by default; use "none" for linear.\n` +
      `- displayName must be "<type>-<n>" per element (n starts at 1 and increments per type).\n` +
      `- Stagger related items by 0.05–0.2s when helpful.\n` +
      `- timeline.currentTime should be 0; duration should cover the latest animation end.\n` +
      `- Do not introduce new elements or ids.\n` +
      `- Coordinates: canvas origin is at center (0,0); groups.x/y are relative to center.\n` +
      `- For type="move", properties.x and properties.y MUST be single numbers (absolute targets). Do NOT return arrays (e.g., [from, to]) and do NOT use ranges.\n` +
      `- Group "type" must be one of: "text" | "custom" | "polygon".\n` +
      `  Use "text" only if ALL elementIds are text.\n` +
      `  Use "polygon" only when representing a closed connector shape.\n` +
      `  Otherwise use "custom". (Default = "custom")\n\n` +
      `Return JSON with exactly { "groups": [...], "timeline": {...}, "elements": [...] }.\n\n` +
      `<SPEC_FACTS>\n${JSON.stringify(specFacts)}\n</SPEC_FACTS>\n` +
      `<ELEMENTS_FROZEN>\n${JSON.stringify(elementsFrozen)}\n</ELEMENTS_FROZEN>\n` +
      `<MOTION_PLAN>\n${JSON.stringify(motionPlan)}\n</MOTION_PLAN>`;
    return await this.runWithRetry('GroupsTimelineMaker', () => this.chatJson([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], { temperature: 0.2 }));
  }

  // New: Edit the existing mainState using a natural-language prompt
  private static async runEditMaker(specFacts: any, currentMainState: any, userPrompt: string) {
    const system = 'You are an editor for a canvas animation JSON. Apply the requested change with minimal edits.';
    const user = `You will update an existing mainState according to a user instruction.
Return ONLY JSON with exactly { "elements": [...], "groups": [...], "timeline": { ... } }.

Rules:
- Keep existing element ids stable; do not modify geometry or properties unless necessary for the request.
- When adding new elements, generate unique ids (e.g., "el-<short>"), set required fields (id,name,type,x,y,fill,width,height where applicable) and animations: [].
- Colors must be hex "#RRGGBB" or "none".
- For text elements include fontFamily from allowlist; default to "Inter".
- For lines include stroke+strokeWidth and lineOptions.points.start/end.
- For paths include >=2 pathPoints.
- Maintain or extend groups appropriately; elementIds must reference existing or newly added ids.
- Timeline: keep currentTime, scale; if new animations are added, extend duration to cover latest end, else keep duration.
- Easing must be from allowlist; prefer "power2.out" or "none" when unspecified.

<SPEC_FACTS>
${JSON.stringify(specFacts)}
</SPEC_FACTS>

<CURRENT_MAIN_STATE>
${JSON.stringify(currentMainState)}
</CURRENT_MAIN_STATE>

<USER_PROMPT>
${userPrompt}
</USER_PROMPT>`;
    return await this.runWithRetry('EditMaker', () => this.chatJson([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ], { temperature: 0.2 }));
  }

  // Removed legacy basic validator (replaced by validateDoc)

  // Strong validator leveraging existing schema validators
  private static deepClone<T>(v: T): T {
    if (typeof (globalThis as any).structuredClone === 'function') {
      return (globalThis as any).structuredClone(v);
    }
    return JSON.parse(JSON.stringify(v));
  }

  private static coerceNumbersInPlace(doc: any): void {
    const numericKeys = new Set<string>([
      'x','y','width','height','rotation','opacity','fontSize','lineHeight','letterSpacing','strokeWidth',
      'scale','duration','currentTime','radius','pivotX','pivotY','zIndex','shadowBlur','shadowOffsetX','shadowOffsetY','shadowOpacity','shadowAngle',
      'startTime','repeat','repeatDelay','stagger'
    ]);
    const walk = (node: any) => {
      if (Array.isArray(node)) {
        for (const item of node) walk(item);
        return;
      }
      if (node && typeof node === 'object') {
        for (const key of Object.keys(node)) {
          const val = node[key];
          if (numericKeys.has(key) && typeof val === 'string' && val.trim() !== '' && !Number.isNaN(Number(val))) {
            node[key] = Number(val);
          } else {
            walk(val);
          }
        }
      }
    };
    walk(doc);
  }

  private static validateDoc(root: any, specFacts?: any): { valid: boolean; errors: string[]; patchHints: string[] } {
    const errors: string[] = [];
    const hints: string[] = [];
    if (!root || typeof root !== 'object') {
      return { valid: false, errors: ['Root must be an object'], patchHints: [] };
    }
    const keys = Object.keys(root).sort();
    const expectedTop = ['description', 'mainState', 'name', 'title'].sort();
    const sameTop = keys.length === expectedTop.length && keys.every((k, i) => k === expectedTop[i]);
    if (!sameTop) errors.push('Top-level keys must be exactly name,title,description,mainState');

    if (typeof root.name !== 'string' || root.name.trim() === '') errors.push('name must be a non-empty string');
    if (typeof root.title !== 'string' || root.title.trim() === '') errors.push('title must be a non-empty string');
    if (typeof root.description !== 'string') errors.push('description must be a string');

    // Clone so downstream validators cannot mutate the original root
    const cloned: any = this.deepClone(root);
    const ms = cloned.mainState;
    if (!ms || typeof ms !== 'object') errors.push('mainState must be an object');

    const elements = Array.isArray(ms?.elements) ? ms.elements : [];
    const groups = Array.isArray(ms?.groups) ? ms.groups : [];
    const timeline = ms?.timeline;

    // Elements validation
    const elemRes = validateElementsArray(elements);
    if (!elemRes.valid) errors.push(...elemRes.errors);

    // Animation naming enforcement per element
    // Allowlist fallbacks
    const easingAllow = Array.isArray(specFacts?.easingAllowlist) && specFacts.easingAllowlist.length
      ? specFacts.easingAllowlist
      : [
          'none',
          'power1.in','power1.out','power1.inOut',
          'power2.in','power2.out','power2.inOut',
          'power3.in','power3.out','power3.inOut',
          'power4.in','power4.out','power4.inOut',
          'back.in','back.out','back.inOut',
          'elastic.in','elastic.out','elastic.inOut',
          'bounce.in','bounce.out','bounce.inOut',
          'sine.in','sine.out','sine.inOut',
          'expo.in','expo.out','expo.inOut',
          'circ.in','circ.out','circ.inOut',
        ];
    const fontAllow = Array.isArray(specFacts?.fontAllowlist) && specFacts.fontAllowlist.length
      ? specFacts.fontAllowlist
      : ['Inter','Roboto','Open Sans','Lato','Arial'];
    const groupTypeAllow = Array.isArray(specFacts?.groupTypeAllowlist) && specFacts.groupTypeAllowlist.length
      ? specFacts.groupTypeAllowlist
      : ['text','custom','polygon'];

    if (Array.isArray(elements)) {
      for (let i = 0; i < elements.length; i++) {
        const anims = elements[i]?.animations || [];
        const res = validateAnimationArrayWithNaming(anims);
        if (!res.valid) {
          errors.push(...res.errors.map((e) => `elements[${i}]: ${e}`));
          hints.push('Ensure displayName matches "<type>-<n>" and ids are non-empty');
        }
        // Easing allowlist
        for (let j = 0; j < anims.length; j++) {
          const ez = anims[j]?.easing;
          if (ez && !easingAllow.includes(ez)) {
            errors.push(`elements[${i}].animations[${j}].easing not in allowlist`);
            hints.push('Use "power2.out" or "none" for linear');
          }
        }
        // Font allowlist for text elements
        if (elements[i]?.type === 'text' && elements[i]?.fontFamily) {
          if (!fontAllow.includes(elements[i].fontFamily)) {
            errors.push(`elements[${i}].fontFamily not in allowlist`);
            hints.push('Use a font from allowlist; default to "Inter"');
          }
        }
      }
    }

    // Groups validation (lightweight)
    if (!Array.isArray(groups)) errors.push('mainState.groups must be an array');
    if (Array.isArray(groups)) {
      const elementsById = new Map<string, any>((elements || []).map((e: any) => [e.id, e]));
      const suggestGroupType = (g: any): 'text'|'custom'|'polygon' => {
        const els = (g.elementIds || []).map((id: string) => elementsById.get(id)).filter(Boolean);
        const allText = els.length > 0 && els.every((e: any) => e.type === 'text');
        if (allText) return 'text';
        return 'custom';
      };
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i] || {};
        if (typeof g.id !== 'string' || !g.id) errors.push(`groups[${i}].id required`);
        if (typeof g.name !== 'string') errors.push(`groups[${i}].name must be a string`);
        if (!Array.isArray(g.elementIds)) errors.push(`groups[${i}].elementIds must be an array`);
        if (typeof g.x !== 'number' || typeof g.y !== 'number') errors.push(`groups[${i}].x/y must be numbers`);
        if (!groupTypeAllow.includes(String(g.type))) {
          errors.push(`groups[${i}].type invalid`);
          const suggested = suggestGroupType(g);
          hints.push(`Set groups[${i}].type to "${suggested}" (allowed: "text","custom","polygon")`);
        }
        if (typeof g.isDefaultGroup !== 'boolean') errors.push(`groups[${i}].isDefaultGroup must be boolean`);
        const res = validateAnimationArrayWithNaming(g.animations || []);
        if (!res.valid) errors.push(...res.errors.map((e) => `groups[${i}]: ${e}`));
      }
    }

    // Timeline validation
    if (!timeline || typeof timeline !== 'object') {
      errors.push('mainState.timeline must be an object');
    } else {
      if (typeof timeline.scale !== 'number') errors.push('timeline.scale must be a number');
      if (typeof timeline.duration !== 'number' || timeline.duration < 0) errors.push('timeline.duration must be a non-negative number');
      if (typeof timeline.currentTime !== 'number' || timeline.currentTime < 0) errors.push('timeline.currentTime must be a non-negative number');
      if (timeline.animationStates && typeof timeline.animationStates !== 'object') errors.push('timeline.animationStates must be an object');
      // Duration should cover the latest animation end
      let latestEnd = 0;
      if (Array.isArray(elements)) {
        for (const el of elements) {
          for (const a of (el?.animations || [])) {
            const end = (Number(a?.startTime) || 0) + (Number(a?.duration) || 0);
            if (end > latestEnd) latestEnd = end;
          }
        }
      }
      if (Array.isArray(groups)) {
        for (const g of groups) {
          for (const a of (g?.animations || [])) {
            const end = (Number(a?.startTime) || 0) + (Number(a?.duration) || 0);
            if (end > latestEnd) latestEnd = end;
          }
        }
      }
      if (timeline.duration + 1e-6 < latestEnd) {
        errors.push(`timeline.duration too short (latest animation end ${latestEnd})`);
        hints.push('Increase timeline.duration to cover the latest animation end');
      }
    }

    return { valid: errors.length === 0, errors, patchHints: hints };
  }

  private static async runFixer(specFacts: any, errors: string[], patchHints: string[], brokenJson: any) {
    const system = 'You are a strict JSON fixer for a known schema. Apply minimal edits only.';
    const user = `The JSON below failed validation. You must return a corrected FULL JSON for the final schema.\n` +
      `Apply MINIMAL edits only: keep ids, order, geometry, and text content stable unless required.\n\n` +
      `Errors:\n${JSON.stringify(errors)}\n\n` +
      `Patch hints (what to change, not how):\n${JSON.stringify(patchHints)}\n\n` +
      `Spec Facts:\n${JSON.stringify(specFacts)}\n\n` +
      `Allowed shape for move: properties.x?: number, properties.y?: number (no arrays).\n` +
      `Allowed group.type values: "text", "custom", "polygon". If unsure, use "custom".\n` +
      `Return ONLY the corrected full JSON object with top-level keys exactly:\n"name","title","description","mainState".\nNo explanations, no extra keys, no comments.\n\n` +
      `<BROKEN_JSON>\n${JSON.stringify(brokenJson)}\n</BROKEN_JSON>`;
    return await this.runWithRetry('Fixer', () => this.chatJson([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]));
  }

  // ---------- Orchestrator & memoized spec facts ----------
  private static _specFactsCache: Map<string, any> = new Map();

  private static async getSpecFacts(engineSpec: string): Promise<any> {
    const key = String(engineSpec?.length ?? 0) + ':' + (engineSpec || '').slice(0, 64);
    if (this._specFactsCache.has(key)) return this._specFactsCache.get(key)!;
    const facts = await this.runSpecNormalizer(engineSpec);
    this._specFactsCache.set(key, facts);
    return facts;
  }

  private static snapshotGeometry(elements: any[]): Record<string, { x: number; y: number; width: number; height: number; type: string }> {
    const snap: Record<string, { x: number; y: number; width: number; height: number; type: string }> = {};
    for (const el of elements || []) {
      snap[el.id] = { x: el.x, y: el.y, width: el.width ?? 0, height: el.height ?? 0, type: el.type };
    }
    return snap;
  }

  private static freezeGeometry(original: any[], returned: any[]): any[] {
    const snap = this.snapshotGeometry(original);
    const byIdReturned: Record<string, any> = {};
    for (const el of returned || []) byIdReturned[el.id] = el;
    const out: any[] = [];
    for (const base of original || []) {
      const ret = byIdReturned[base.id] || {};
      const kept = {
        ...ret,
        id: base.id,
        name: ret.name ?? base.name,
        type: base.type,
        x: snap[base.id]?.x ?? base.x,
        y: snap[base.id]?.y ?? base.y,
        width: snap[base.id]?.width ?? base.width,
        height: snap[base.id]?.height ?? base.height,
        fill: ret.fill ?? base.fill,
        animations: Array.isArray(ret.animations) ? ret.animations : (base.animations || []),
      };
      out.push(kept);
    }
    return out;
  }

  // Main public entry for the chained pipeline
  static async generateScene(userBrief: string): Promise<{
    name: string;
    title: string;
    description: string;
    mainState: { elements: any[]; groups: any[]; timeline: any };
  }> {
    const engineSpec = this.getAuthoritativeEngineSpec();
    // Helper to wrap a stage with minimal diagnostics
    const runStage = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      try {
        return await fn();
      } catch (err) {
        if (err instanceof LlmJsonParseError) {
          const snippet = err.rawText?.slice(0, 300) || '';
          logger.error(`LLM JSON parse at ${name}`, { snippetLength: snippet.length, snippet });
        } else {
          logger.error(`Stage failed: ${name}`, { error: err instanceof Error ? err.message : String(err) });
        }
        throw err;
      }
    };

    // 0) Normalize spec once
    const specFacts = await runStage('SpecNormalizer', () => this.getSpecFacts(engineSpec));

    // 1) Outline
    const outline = await runStage('SceneOutline', () => this.runSceneOutline(specFacts, userBrief));
    logger.info('Outline produced', {
      narrativeCount: Array.isArray(outline?.narrative) ? outline.narrative.length : 0,
      zonesCount: Array.isArray(outline?.layoutPlan?.zones) ? outline.layoutPlan.zones.length : 0,
      objectPlanCount: Array.isArray(outline?.objectPlan) ? outline.objectPlan.length : 0,
      motionPlanCount: Array.isArray(outline?.motionPlan) ? outline.motionPlan.length : 0,
    });

    // 2) Elements
    const elementsOnly = await runStage('ElementsMaker', () => this.runElementsMaker(specFacts, outline.objectPlan));
    if (!elementsOnly?.elements || !Array.isArray(elementsOnly.elements)) {
      throw new Error('ElementsMaker returned no elements[]');
    }
    this.coerceNumbersInPlace(elementsOnly);
    logger.info('Elements produced', { elementCount: elementsOnly.elements.length });

    // 3) Groups & Timeline (+ populate animations on elements)
    const composed = await runStage('GroupsTimelineMaker', () => this.runGroupsTimelineMaker(
      specFacts,
      { elements: elementsOnly.elements },
      outline.motionPlan
    ));
    this.coerceNumbersInPlace(composed);

    // Freeze: preserve ids and geometry exactly as produced by Elements step
    const freezedElements = this.freezeGeometry(elementsOnly.elements, composed.elements || []);

    // 4) Assemble full doc
    let doc = {
      name: outline.name ?? 'scene',
      title: outline.title ?? 'Scene',
      description: outline.description ?? 'A short conceptual flow.',
      mainState: {
        elements: freezedElements,
        groups: composed.groups ?? [],
        timeline: composed.timeline ?? { scale: 1, duration: 3, currentTime: 0, animationStates: {} },
      },
    };
    // Sanitize move arrays -> single values before validation
    sanitizeMovePropertiesInPlace(doc);

    // 5) Validate + Fix loop (minimal edits)
    const MAX_PASSES = 3;
    for (let i = 0; i < MAX_PASSES; i++) {
      const res = this.validateDoc(doc, specFacts);
      if (res.valid) return doc;
      logger.warn('Validation failed; invoking Fixer', { attempt: i + 1, errorCount: res.errors.length });
      doc = await runStage('Fixer', () => this.runFixer(specFacts, res.errors, res.patchHints, doc));
      // Guard output shape
      const hasTop = doc && typeof doc === 'object' && ['name','title','description','mainState'].every((k) => Object.prototype.hasOwnProperty.call(doc, k));
      if (!hasTop) {
        throw new Error('Fixer returned invalid top-level structure');
      }
      // Coerce numeric strings and re-freeze geometry to element snapshot
      this.coerceNumbersInPlace(doc);
      doc.mainState.elements = this.freezeGeometry(elementsOnly.elements, doc.mainState.elements || []);
      // Sanitize move arrays again after fixer
      sanitizeMovePropertiesInPlace(doc);
    }

    // Final check after fixes
    const final = this.validateDoc(doc, specFacts);
    if (!final.valid) {
      logger.error('Validation failed after fixer loop', { errors: final.errors });
      throw new Error(`Validation failed after fixes:\n- ${final.errors.join('\n- ')}`);
    }
    return doc as any;
  }

  // Public: apply an edit instruction to an existing mainState and return an updated, validated mainState
  static async applyEditToMainState(userPrompt: string, currentMainState: any): Promise<{ elements: any[]; groups: any[]; timeline: any }>
  {
    const engineSpec = this.getAuthoritativeEngineSpec();
    const specFacts = await this.getSpecFacts(engineSpec);

    // Ask the model to minimally update the provided mainState
    const edited = await this.runEditMaker(specFacts, currentMainState || {}, userPrompt);

    // Normalize numeric strings
    this.coerceNumbersInPlace(edited);

    // Build a doc wrapper for validation reusing the strong validator
    let doc = {
      name: 'edit',
      title: 'Edit',
      description: 'AI edit to existing mainState',
      mainState: {
        elements: Array.isArray(edited?.elements) ? edited.elements : Array.isArray((currentMainState || {}).elements) ? (currentMainState as any).elements : [],
        groups: Array.isArray(edited?.groups) ? edited.groups : Array.isArray((currentMainState || {}).groups) ? (currentMainState as any).groups : [],
        timeline: edited?.timeline && typeof edited.timeline === 'object'
          ? edited.timeline
          : ((currentMainState || {}).timeline || { scale: 1, duration: 3, currentTime: 0, animationStates: {} }),
      },
    } as any;

    // Ensure move properties are sanitized pre-validate
    sanitizeMovePropertiesInPlace(doc);

    // Validate + Fix loop to enforce schema rules
    const MAX_PASSES = 2;
    for (let i = 0; i < MAX_PASSES; i++) {
      const res = this.validateDoc(doc, specFacts);
      if (res.valid) break;
      doc = await this.runFixer(specFacts, res.errors, res.patchHints, doc);
      this.coerceNumbersInPlace(doc);
      sanitizeMovePropertiesInPlace(doc);
    }

    const final = this.validateDoc(doc, specFacts);
    if (!final.valid) {
      logger.error('AI Edit validation failed', { errors: final.errors });
      throw new Error(`AI Edit invalid: ${final.errors.join('; ')}`);
    }
    return doc.mainState;
  }
}


