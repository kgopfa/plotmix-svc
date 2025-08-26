import { Executor } from './dsl/executor';
import { Compiler } from './dsl/compiler';
import { LayoutGrammarService } from './layout-grammar.service';
import { Router as LlmRouter } from './llm/router';
import { AnimationResolverService } from './animation-resolver.service';
// (no direct DSL type usage here)
import { logger } from '../../utils/logger';

// role type used by LLM router submodule

export class Orchestrator {
  static async generateFromPrompt(params: { prompt: string; canvas?: { width?: number; height?: number }; tone?: 'concise'|'friendly'|'formal' }) {
    const prompt = params.prompt;
    const canvas = { width: Number(params.canvas?.width) || 1920, height: Number(params.canvas?.height) || 1080 };
    logger.info('pipeline:start', { promptLength: prompt.length, canvas });

    const router = await LlmRouter.router(prompt);
    logger.info('pipeline:stage_complete', { stage: 'router', archetypes: router.archetypes, tone: router.tone });

    const intent = await LlmRouter.intent(prompt, router);
    logger.info('pipeline:stage_complete', { stage: 'intent', domain: intent.domain, coreFlowsCount: intent.core_flows.length });

    const beats = await LlmRouter.beats(router, intent);
    logger.info('pipeline:stage_complete', { stage: 'beats', beatsCount: beats.beats.length });

    const { entities } = await LlmRouter.entitySet(intent.domain, beats.beats);
    logger.info('pipeline:stage_complete', { stage: 'entitySet', entitiesCount: entities.length });

    const design = await LlmRouter.entityDesign(entities, router.tone);
    logger.info('pipeline:stage_complete', { stage: 'entityDesign', designsCount: Array.isArray(design?.entityDesign) ? design.entityDesign.length : 0 });

    const layout = LayoutGrammarService.layoutProcessFlow({ entities, canvas });
    logger.info('pipeline:stage_complete', { stage: 'layout', nodesCount: layout.nodes.length });

    const anim = await LlmRouter.animationPlan(entities, beats.beats);
    logger.info('pipeline:stage_complete', { stage: 'animations_plan', animationsCount: Array.isArray(anim?.animations) ? anim.animations.length : 0 });

    const resolved = AnimationResolverService.resolve({
      abstract: anim.animations,
      beats: beats.beats.map((b) => ({ id: b.id, narration: b.narration, durationSec: b.durationSec })),
      groups: layout.nodes.map((n) => ({ id: `grp-${n.id}` }))
    });
    logger.info('pipeline:stage_complete', { stage: 'animations_resolved', tracks: resolved.length });

    const dsl = Compiler.build({ layout, entities, design: design.entityDesign, animations: resolved });
    logger.info('pipeline:stage_complete', { stage: 'compile', actionsCount: dsl.actions.length });

    const mainState = await Executor.apply(dsl);
    logger.info('pipeline:stage_complete', {
      stage: 'execute+validate',
      elementsCount: Array.isArray((mainState as any)?.elements) ? (mainState as any).elements.length : 0,
      groupsCount: Array.isArray((mainState as any)?.groups) ? (mainState as any).groups.length : 0,
      timelineDuration: Number((mainState as any)?.timeline?.duration) || 0
    });
    
    return { mainState, summary: 'Generated single-scene illustrative canvas with validated animations.' };
  }
}


