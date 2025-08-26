import { LlmFactory } from '../../../clients/llm/factory';
import { logger } from '../../../utils/logger';
import type { ActionPlan, Action } from '../../../types/dsl';

export class Planner {
  static async planTasks(userPrompt: string): Promise<{ tasks: Array<{ taskId: string; type: string; objective: string; notes?: string }> }> {
    const client = LlmFactory.create();
    const system = 'You are a planner. Split the design request into 3-6 small tasks (layout, components, style, animation). Return JSON with { tasks:[{taskId,type,objective,notes?}] } and nothing else.';
    const user = `Request: ${userPrompt}`;
    const res = await client.callStage('planner', [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], { json: true, temperature: 0.2 });
    logger.info('Planner produced tasks', { count: Array.isArray(res?.tasks) ? res.tasks.length : 0 });
    return { tasks: Array.isArray(res?.tasks) ? res.tasks : [] };
  }

  static async normalizeEntities(tasks: Array<any>): Promise<{ entities: Array<any> }> {
    const client = LlmFactory.create();
    const system = 'You enumerate entities to render without geometry. Return JSON { entities:[{ idHint?, type, role, text?, paletteToken?, relationships?[] }] }';
    const user = `Tasks: ${JSON.stringify(tasks)}`;
    const res = await client.callStage('entities', [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], { json: true, temperature: 0.2 });
    return { entities: Array.isArray(res?.entities) ? res.entities : [] };
  }

  static async planActions(entities: Array<any>, canvas: { width: number; height: number }): Promise<ActionPlan> {
    const client = LlmFactory.create();
    const system = 'You produce a compact action plan DSL to add elements, set styles, group, and animate. Return JSON { context, actions } only.';
    const user = `Canvas: ${JSON.stringify(canvas)}\nEntities: ${JSON.stringify(entities)}\nRules:\n- Colors hex #RRGGBB or "none"\n- Easing allowlist; prefer power2.out or none\n- move.properties.x/y must be single numbers\n- group.type in {text,custom,polygon}`;
    const res = await client.callStage('actions', [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ], { json: true, temperature: 0.2 });
    const plan: ActionPlan = {
      context: { canvas },
      actions: Array.isArray(res?.actions) ? (res.actions as Action[]) : []
    };
    return plan;
  }
}


