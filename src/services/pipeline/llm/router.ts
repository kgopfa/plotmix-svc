import { LlmFactory } from '../../../clients/llm/factory';

export class Router {
  static async router(userPrompt: string): Promise<{ archetypes: string[]; tone: 'concise'|'friendly'|'formal' }> {
    const client = LlmFactory.create();
    const system = 'Classify the prompt into 1–2 archetypes and a tone. Archetypes: ["process_flow","lifecycle_cycle","hierarchy_parts","comparison_tradeoff","timeline_sequence","map_topology","cause_effect","algorithm_trace"]. Tone: ["concise","friendly","formal"]. Return only JSON {"archetypes":[],"tone":"..."}.';
    const res = await client.callStage('planner', [
      { role: 'system', content: system },
      { role: 'user', content: userPrompt }
    ], { json: true, temperature: 0.0 });
    if (!res || typeof res !== 'object') throw new Error('Router: invalid response');
    const archetypes: string[] = Array.isArray(res?.archetypes) ? res.archetypes : ['process_flow'];
    const tone = res?.tone === 'friendly' || res?.tone === 'formal' ? res.tone : 'concise';
    return { archetypes, tone };
  }

  static async intent(userPrompt: string, router: { archetypes: string[]; tone: string }): Promise<{ domain: string; core_flows: string[]; tone: 'concise'|'friendly'|'formal' }>
  {
    const client = LlmFactory.create();
    const system = 'Extract domain and 3–5 core_flows based on the prompt and archetypes. Return only JSON {"domain":"...","core_flows":["..."],"tone":"..."}.';
    const user = JSON.stringify({ prompt: userPrompt, archetypes: router.archetypes, tone: router.tone });
    const res = await client.callStage('planner', [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], { json: true, temperature: 0.1 });
    if (!res || typeof res !== 'object') throw new Error('Intent: invalid response');
    const domain: string = typeof res?.domain === 'string' && res.domain.trim() ? res.domain.trim() : 'general';
    const flows: string[] = (Array.isArray(res?.core_flows) ? res.core_flows : []).slice(0, 5);
    const tone = res?.tone === 'friendly' || res?.tone === 'formal' ? res.tone : 'concise';
    return { domain, core_flows: flows.length ? flows : ['flow_a','flow_b','flow_c'], tone };
  }

  static async beats(router: { archetypes: string[]; tone: string }, intent: { core_flows: string[] }): Promise<{ beats: Array<{ id: string; caption: string; narration: string; durationSec: number }> }>
  {
    const client = LlmFactory.create();
    const system = 'Create 4–6 beats consistent with the archetypes and flows for a single scene. Each beat must include: id, caption (≤12 words), narration (1 concise sentence), durationSec (2–5). Return only JSON {"beats":[{"id","caption","narration","durationSec"]}.';
    const user = JSON.stringify({ archetypes: router.archetypes, tone: router.tone, core_flows: intent.core_flows });
    const res = await client.callStage('planner', [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], { json: true, temperature: 0.2 });
    if (!res || typeof res !== 'object') throw new Error('Beats: invalid response');
    const beats: Array<any> = Array.isArray(res?.beats) ? res.beats : [];
    const out = beats
      .filter((b) => b && typeof b.id === 'string' && typeof b.caption === 'string')
      .map((b) => ({
        id: String(b.id),
        caption: String(b.caption),
        narration: typeof b.narration === 'string' ? b.narration : b.caption,
        durationSec: Math.min(5, Math.max(2, Number(b.durationSec) || 3))
      }));
    return { beats: out.slice(0, 6) };
  }

  static async entitySet(domain: string, beats: Array<{ id: string; caption: string }>): Promise<{ entities: any[]; relations: any[] }>
  {
    const client = LlmFactory.create();
    const system = 'List entities and relations (no geometry). Entities: {id,kind:actor|process|container|event|channel,label,iconIds?[]}. Relations: {from,to,label}. Return only JSON {"entities":[],"relations":[]}.';
    const user = JSON.stringify({ domain, beats });
    const res = await client.callStage('entities', [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], { json: true, temperature: 0.2 });
    if (!res || typeof res !== 'object') throw new Error('EntitySet: invalid response');
    return {
      entities: Array.isArray(res?.entities) ? res.entities : [],
      relations: Array.isArray(res?.relations) ? res.relations : []
    };
  }

  static async entityDesign(entities: any[], tone: string): Promise<{ entityDesign: any[] }>
  {
    const client = LlmFactory.create();
    const system = 'For each entity, pick a visual spec (no geometry). Aim for cohesive, website-quality styling (not whiteboard). Defaults: center non-label text inside containers; prefer varied corner radii (0, 8, 12) rather than always rounded; use subtle shadows only when emphasis is required; consistent palette and typography across entities. IMPORTANT: typography.fontFamily MUST be chosen STRICTLY from this allowlist and nothing else: ["Inter","Roboto","Open Sans","Lato","Arial","Helvetica","Helvetica Neue","Segoe UI","Montserrat","Nunito","Libre Franklin","Raleway","Source Sans Pro","Poppins","Verdana","Tahoma","Trebuchet MS","Geist","Geist Mono","Source Code Pro","Fira Code","JetBrains Mono","Inconsolata","Courier New","Consolas","Monaco","Menlo"]. If unsure, use "Inter" for general text, or "Geist Mono" for code-like text. Return only JSON {"entityDesign":[{"entityId","template","shape","palette":{"fill","stroke"},"typography":{"fontFamily","fontSize"},"cornerRadius"?,"shadow"?:{"enabled":boolean,"color"?:string,"blur"?:number,"offsetX"?:number,"offsetY"?:number,"opacity"?:number},"icons"|"icon"?,"ornament"?,"padding"?,"emphasis"?}]}.';
    const user = JSON.stringify({ entities, tone });
    const res = await client.callStage('entities', [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], { json: true, temperature: 0.2 });
    if (!res || typeof res !== 'object') throw new Error('EntityDesign: invalid response');
    return { entityDesign: Array.isArray(res?.entityDesign) ? res.entityDesign : [] };
  }

  static async animationPlan(entities: any[], beats: any[]): Promise<{ animations: Array<{ target: string; intent: string; beatId: string; relativeStart: number; relativeDuration: number; params?: Record<string, any> }> }>
  {
    const client = LlmFactory.create();
    const system = 'Produce abstract animation intents per entity (no geometry). Each item MUST include: target (from provided entity ids), intent (one of: "pulse","highlight","pointer_move","emphasize","focus","fade_in","fade_out"), beatId (from provided beats), relativeStart (0..beat.durationSec), relativeDuration (>0), optional params (object). Return only JSON {"animations":[]}.';
    const user = JSON.stringify({ entities, beats });
    const res = await client.callStage('actions', [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], { json: true, temperature: 0.2 });
    if (!res || typeof res !== 'object') throw new Error('Animations: invalid response');
    const anims: any[] = Array.isArray(res?.animations) ? res.animations : [];
    const allowedIntents = new Set(['pulse','highlight','pointer_move','emphasize','focus','fade_in','fade_out']);
    const entityIds = new Set<string>((entities || []).map((e: any) => String(e.id)));
    anims.forEach((a, idx) => {
      if (!a || typeof a !== 'object') throw new Error(`Animations: item ${idx} is not an object`);
      if (typeof a.target !== 'string' || !entityIds.has(a.target)) throw new Error(`Animations: invalid target at index ${idx}`);
      if (typeof a.intent !== 'string' || !allowedIntents.has(a.intent)) throw new Error(`Animations: invalid intent at index ${idx}`);
      if (typeof a.beatId !== 'string') throw new Error(`Animations: missing beatId at index ${idx}`);
      if (typeof a.relativeStart !== 'number' || a.relativeStart < 0) throw new Error(`Animations: invalid relativeStart at index ${idx}`);
      if (typeof a.relativeDuration !== 'number' || a.relativeDuration <= 0) throw new Error(`Animations: invalid relativeDuration at index ${idx}`);
      if (a.params && typeof a.params !== 'object') throw new Error(`Animations: params must be object at index ${idx}`);
    });
    return { animations: anims };
  }
}


