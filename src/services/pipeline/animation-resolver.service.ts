type Beat = { id: string; narration: string; durationSec: number };

export class AnimationResolverService {
  static resolve(params: {
    abstract: Array<{ target: string; intent: string; beatId: string; relativeStart: number; relativeDuration: number; params?: Record<string, any> }>;
    beats: Beat[];
    groups: Array<{ id: string }>; // compiled group ids `grp-<entityId>`
  }): Array<{ type: 'animate'|'setStyle'; targetId: string; animation?: any; props?: Record<string, any> }>
  {
    const { abstract, beats, groups } = params;
    const groupSet = new Set(groups.map((g) => g.id));
    const beatById = new Map<string, Beat>(beats.map((b) => [b.id, b]));
    const out: Array<any> = [];

    for (const a of abstract || []) {
      const groupId = `grp-${a.target}`;
      if (!groupSet.has(groupId)) continue;
      const beat = beatById.get(a.beatId);
      if (!beat) continue;
      const start = Math.max(0, a.relativeStart);
      const dur = Math.max(0.1, Math.min(beat.durationSec, a.relativeDuration));
      const base = { startTime: start, duration: dur, easing: 'power2.out' as const };

      switch (a.intent) {
        case 'pulse': {
          const maxScale = Math.min(1.2, Math.max(1.05, Number(a.params?.['scale']) || 1.1));
          out.push({ type: 'animate', targetId: groupId, animation: { ...base, type: 'scale', properties: { scaleX: maxScale, scaleY: maxScale } } });
          out.push({ type: 'animate', targetId: groupId, animation: { ...base, startTime: start + dur * 0.5, duration: dur * 0.5, type: 'scale', properties: { scaleX: 1, scaleY: 1 } } });
          break;
        }
        case 'highlight': {
          const color = typeof a.params?.['fill'] === 'string' ? (a.params as any)['fill'] : '#FFE08A';
          out.push({ type: 'setStyle', targetId: `el-${a.target}-bg`, props: { fill: color } });
          break;
        }
        case 'pointer_move': {
          // expects a separate pointer entity resolved as params.pointerGroupId
          const pointerGroupId = typeof a.params?.['pointerGroupId'] === 'string' ? (a.params as any)['pointerGroupId'] : groupId;
          out.push({ type: 'animate', targetId: pointerGroupId, animation: { ...base, type: 'move', properties: { x: Number(a.params?.['x']) || 0, y: Number(a.params?.['y']) || 0 } } });
          break;
        }
        case 'emphasize': {
          out.push({ type: 'animate', targetId: groupId, animation: { ...base, type: 'scale', properties: { scaleX: 1.08, scaleY: 1.08 } } });
          break;
        }
        case 'focus': {
          // Optionally, could fade others; here we brighten target
          out.push({ type: 'setStyle', targetId: `el-${a.target}-bg`, props: { stroke: '#60A5FA' } });
          break;
        }
        case 'fade_in': {
          out.push({ type: 'animate', targetId: groupId, animation: { ...base, type: 'fade', properties: { opacity: 1 } } });
          break;
        }
        case 'fade_out': {
          out.push({ type: 'animate', targetId: groupId, animation: { ...base, type: 'fade', properties: { opacity: 0 } } });
          break;
        }
        default:
          // ignore unknown intents
          break;
      }
    }
    return out;
  }
}


