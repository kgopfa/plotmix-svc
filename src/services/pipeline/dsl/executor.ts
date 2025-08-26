import { logger } from '../../../utils/logger';
import { sanitizeMovePropertiesInPlace } from '../../../utils/sanitize';
import { OpenAIGenerationService } from '../../openai-generation.service';
import type { ActionPlan, AddElementAction, GroupElementsAction, SetStyleAction, AnimateAction, SetTimelineAction, EasingAllowlist, GroupType } from '../../../types/dsl';

type MainState = { elements: any[]; groups: any[]; timeline: any };

export class Executor {
  static async apply(plan: ActionPlan, base?: Partial<MainState>): Promise<MainState> {
    if (!plan || !Array.isArray(plan.actions)) {
      throw new Error('Executor: invalid action plan');
    }
    const state: MainState = {
      elements: Array.isArray(base?.elements) ? [...base!.elements] : [],
      groups: Array.isArray(base?.groups) ? [...base!.groups] : [],
      timeline: typeof base?.timeline === 'object' && base?.timeline !== null
        ? { ...base!.timeline }
        : { scale: 1, duration: 0, currentTime: 0, animationStates: {} },
    };

    const ctx = plan.context || {};

    for (const action of plan.actions || []) {
      switch (action.type) {
        case 'addElement':
          this.addElement(state, action as AddElementAction, ctx);
          break;
        case 'groupElements':
          this.groupElements(state, action as GroupElementsAction);
          break;
        case 'setStyle':
          this.setStyle(state, action as SetStyleAction);
          break;
        case 'animate':
          this.addAnimation(state, action as AnimateAction, ctx);
          break;
        case 'setTimeline':
          this.setTimeline(state, action as SetTimelineAction);
          break;
        default:
          const t = (action as any)?.type;
          logger.error('Executor: unknown DSL action type', { type: t });
          throw new Error(`Executor: unknown action type ${String(t)}`);
      }
    }

    // Sanitize move arrays -> single values
    const wrapper = { name: 'dsl', title: 'dsl', description: 'dsl', mainState: state } as any;
    sanitizeMovePropertiesInPlace(wrapper);

    // Validate and fix using existing pipeline
    const engineSpec = OpenAIGenerationService.getAuthoritativeEngineSpec();
    // Reuse spec facts and strong validation through the public edit API path for minimal duplication
    // We call applyEditToMainState with a no-op prompt by wrapping the produced state
    // For performance, we directly use validate/fix helpers here instead of going back to LLM.
    // Build a doc wrapper for validation
    let doc: any = {
      name: 'dsl',
      title: 'dsl',
      description: 'dsl',
      mainState: state,
    };

    // Validate + Fix loop from OpenAIGenerationService
    // Expose minimal internal helpers via methods
    const validate = (root: any) => (OpenAIGenerationService as any).validateDoc(root, (OpenAIGenerationService as any)._specFactsCache?.get(String(engineSpec?.length ?? 0) + ':' + (engineSpec || '').slice(0, 64)));
    const fixer = async (errors: string[], patchHints: string[], broken: any) => (OpenAIGenerationService as any).runFixer(
      await (OpenAIGenerationService as any).getSpecFacts(engineSpec),
      errors,
      patchHints,
      broken,
    );

    const MAX_PASSES = 2;
    for (let i = 0; i < MAX_PASSES; i++) {
      const res = validate(doc);
      if (res?.valid) return doc.mainState as MainState;
      logger.warn('Executor: validation failed; invoking Fixer', { attempt: i + 1, errorCount: res?.errors?.length || 0 });
      doc = await fixer(res.errors, res.patchHints, doc) as any;
      // Ensure move properties sanitized
      sanitizeMovePropertiesInPlace(doc);
    }

    const final = validate(doc);
    if (!final?.valid) {
      logger.error('DSL validation failed after fixes', { errors: final?.errors });
      throw new Error(`DSL execution invalid: ${final?.errors?.join('; ')}`);
    }
    return doc.mainState as MainState;
  }

  private static addElement(state: MainState, action: AddElementAction, ctx: ActionPlan['context']) {
    const e = action.element || ({} as any);
    const id = e.id && typeof e.id === 'string' ? e.id : this.generateId(e.type || 'el');
    const base: any = {
      id,
      name: e.name || `${e.type}-${state.elements.filter((x) => x.type === e.type).length + 1}`,
      type: e.type,
      x: toNumber(e.x, 0),
      y: toNumber(e.y, 0),
      width: toNumber(e.width, e.type === 'text' ? 400 : 100),
      height: toNumber(e.height, e.type === 'text' ? 60 : 100),
      rotation: toNumber(e.rotation, 0),
      fill: normalizeColor(e.fill, '#000000'),
      stroke: typeof e.stroke === 'string' ? e.stroke : undefined,
      strokeWidth: toNumber(e.strokeWidth, undefined),
      opacity: clamp(toNumber(e.opacity, 1), 0, 1),
      zIndex: toNumber(e.zIndex, undefined),
      animations: [],
    };
    // Clamp position within canvas bounds using element size
    const c = getCanvasSize(ctx);
    const clamped = clampWithinCanvas(base.x, base.y, base.width ?? 0, base.height ?? 0, c.width, c.height);
    base.x = clamped.x;
    base.y = clamped.y;
    if (e.type === 'text') {
      base.text = typeof e.text === 'string' ? e.text : '';
      base.fontFamily = e.fontFamily || ctx?.defaults?.fontFamily || 'Inter';
      base.fontSize = toNumber(e.fontSize, 24);
      base.wordWrap = !!e.wordWrap;
      base.wordWrapWidth = toNumber(e.wordWrapWidth, base.width);
    }
    if (e.type === 'line' && e.lineOptions) {
      base.lineOptions = e.lineOptions;
      base.width = toNumber(e.width, 0);
      base.height = toNumber(e.height, 0);
    }
    if (e.type === 'path' && Array.isArray(e.pathPoints)) {
      base.pathPoints = e.pathPoints.slice(0);
      base.width = toNumber(e.width, 0);
      base.height = toNumber(e.height, 0);
    }
    state.elements.push(base);
  }

  private static groupElements(state: MainState, action: GroupElementsAction) {
    const g = action.group || ({} as any);
    const id = g.id && typeof g.id === 'string' ? g.id : this.generateId('grp');
    const type: GroupType = (['text', 'custom', 'polygon'] as const).includes(g.type as any) ? (g.type as GroupType) : 'custom';
    const elementIds = Array.isArray(g.elementIds) ? g.elementIds.filter((id) => typeof id === 'string') : [];
    state.groups.push({
      id,
      name: typeof g.name === 'string' ? g.name : 'group',
      type,
      x: toNumber(g.x, 0),
      y: toNumber(g.y, 0),
      isDefaultGroup: typeof g.isDefaultGroup === 'boolean' ? g.isDefaultGroup : false,
      elementIds,
      animations: [],
    });
  }

  private static setStyle(state: MainState, action: SetStyleAction) {
    const el = state.elements.find((e) => e.id === action.targetId);
    if (!el) return;
    const p = action.props || {};
    if (typeof p.fill !== 'undefined') el.fill = normalizeColor(p.fill, el.fill);
    if (typeof p.stroke !== 'undefined') el.stroke = normalizeColor(p.stroke, el.stroke);
    if (typeof p.strokeWidth !== 'undefined') el.strokeWidth = toNumber(p.strokeWidth, el.strokeWidth);
    if (typeof p.opacity !== 'undefined') el.opacity = clamp(toNumber(p.opacity, el.opacity), 0, 1);
    if (typeof p.fontFamily !== 'undefined') el.fontFamily = String(p.fontFamily || 'Inter');
    if (typeof p.fontSize !== 'undefined') el.fontSize = toNumber(p.fontSize, el.fontSize);
  }

  private static addAnimation(state: MainState, action: AnimateAction, ctx: ActionPlan['context']) {
    const target = state.elements.find((e) => e.id === action.targetId) || state.groups.find((g) => g.id === action.targetId);
    if (!target) return;
    const a = action.animation || ({} as any);
    const easing: EasingAllowlist = (a.easing as any) || (ctx?.defaults?.easing as any) || 'power2.out';
    const props = sanitizeMoveProps(a.properties || {});
    // Clamp target x/y if present (elements only; groups have no size)
    if ((target as any).type && (typeof props['x'] !== 'undefined' || typeof props['y'] !== 'undefined')) {
      const c = getCanvasSize(ctx);
      const width = toNumber((target as any).width, 0) || 0;
      const height = toNumber((target as any).height, 0) || 0;
      const currentX = toNumber((target as any).x, 0);
      const currentY = toNumber((target as any).y, 0);
      const desiredX = typeof props['x'] !== 'undefined' ? toNumber(props['x'], currentX) : currentX;
      const desiredY = typeof props['y'] !== 'undefined' ? toNumber(props['y'], currentY) : currentY;
      const clamped = clampWithinCanvas(desiredX, desiredY, width, height, c.width, c.height);
      if (typeof props['x'] !== 'undefined') props['x'] = clamped.x;
      if (typeof props['y'] !== 'undefined') props['y'] = clamped.y;
    }
    const anim: any = {
      id: a.id || this.generateId('anim'),
      name: a.name || a.type,
      type: a.type,
      startTime: clamp(toNumber(a.startTime, 0), 0, 1e6),
      duration: clamp(toNumber(a.duration, ctx?.defaults?.duration ?? 0.6), 0.01, 10),
      easing,
      properties: props,
      displayName: `${a.type}-1`,
    };
    if (!Array.isArray((target as any).animations)) (target as any).animations = [];
    (target as any).animations.push(anim);

    // Update timeline duration
    const end = anim.startTime + anim.duration;
    if (end > state.timeline.duration) state.timeline.duration = end;
  }

  private static setTimeline(state: MainState, action: SetTimelineAction) {
    const t = action.timeline || {};
    if (typeof t.scale === 'number') state.timeline.scale = t.scale;
    if (typeof t.duration === 'number') state.timeline.duration = Math.max(state.timeline.duration, t.duration);
    if (typeof t.currentTime === 'number') state.timeline.currentTime = Math.max(0, t.currentTime);
  }

  private static generateId(prefix: string): string {
    const short = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${short}`;
  }
}

function toNumber<T>(v: any, fallback: T): any {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return fallback as any;
}

function clamp(n: number | undefined, min: number, max: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function normalizeColor(v: any, fallback: string | undefined): string | undefined {
  if (typeof v !== 'string') return fallback;
  const s = v.trim();
  if (s.toLowerCase() === 'none') return 'none';
  const hex = /^#([0-9a-fA-F]{6})$/;
  return hex.test(s) ? s : fallback;
}

function sanitizeMoveProps(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...props };
  if (Array.isArray(out['x'] as any)) out['x'] = (out['x'] as any)[1];
  if (Array.isArray(out['y'] as any)) out['y'] = (out['y'] as any)[1];
  return out;
}

function getCanvasSize(ctx: ActionPlan['context'] | undefined): { width: number; height: number } {
  const w = toNumber(ctx?.canvas?.width, 1920);
  const h = toNumber(ctx?.canvas?.height, 1080);
  return { width: typeof w === 'number' ? w : 1920, height: typeof h === 'number' ? h : 1080 } as any;
}

// Clamp an element center position so that the element's bounds remain inside the canvas
function clampWithinCanvas(x: number, y: number, width: number, height: number, canvasWidth: number, canvasHeight: number) {
  const halfW = (typeof width === 'number' ? width : 0) / 2;
  const halfH = (typeof height === 'number' ? height : 0) / 2;
  const maxX = (canvasWidth / 2) - halfW;
  const minX = -maxX;
  const maxY = (canvasHeight / 2) - halfH;
  const minY = -maxY;
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}


