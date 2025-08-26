import type { ActionPlan, Action } from '../../../types/dsl';

export class Compiler {
  static build(params: {
    layout: { canvas: { width: number; height: number }, nodes: Array<{ id: string; x: number; y: number; width: number; height: number }> };
    entities: Array<{ id: string; label?: string }>;
    design: Array<any>;
    animations: Array<any>;
  }): ActionPlan {
    const { layout, entities, design, animations } = params;
    if (!layout || !layout.canvas || !Array.isArray(layout.nodes)) {
      throw new Error('Compiler: invalid layout input');
    }
    if (!Array.isArray(entities)) {
      throw new Error('Compiler: entities must be an array');
    }
    if (!Array.isArray(design)) {
      throw new Error('Compiler: design must be an array');
    }
    if (!Array.isArray(animations)) {
      throw new Error('Compiler: animations must be an array');
    }
    const actions: Action[] = [] as any;

    const designById = new Map<string, any>(design.map((d: any) => [d.entityId, d]));
    const labelById = new Map<string, string>((entities || []).map((e) => [e.id, e.label || e.id]));
    const groupIds: Set<string> = new Set();

    for (const n of layout.nodes) {
      if (!n || typeof n.id !== 'string') throw new Error('Compiler: layout node missing id');
      if (typeof n.x !== 'number' || typeof n.y !== 'number') throw new Error(`Compiler: layout node ${n.id} missing coordinates`);
      if (typeof n.width !== 'number' || typeof n.height !== 'number') throw new Error(`Compiler: layout node ${n.id} missing size`);
      const d = designById.get(n.id) || {};
      const palette = d.palette || {};
      const typography = d.typography || {};
      const styleDefaults = {
        fill: palette.fill || '#FFFFFF',
        stroke: palette.stroke || '#E2E8F0',
        text: '#0F172A',
        fontFamily: typography.fontFamily || 'Inter',
        fontSize: typography.fontSize || 16,
        cornerRadius: typeof d.cornerRadius === 'number' ? d.cornerRadius : (d.template === 'card' ? 12 : 0),
        shadow: d.emphasis === 'elevated' || d.shadow
          ? { enabled: true, color: '#000000', blur: 12, offsetX: 0, offsetY: 8, opacity: 0.12 }
          : { enabled: false }
      } as const;
      const bgId = `el-${n.id}-bg`;
      actions.push({
        type: 'addElement',
        element: {
          id: bgId,
          type: 'rectangle',
          name: 'entity-bg',
          x: n.x,
          y: n.y,
          width: n.width,
          height: n.height,
          fill: styleDefaults.fill,
          stroke: styleDefaults.stroke,
          cornerRadius: styleDefaults.cornerRadius,
          shadowEnabled: styleDefaults.shadow.enabled,
          shadowColor: (styleDefaults.shadow as any).color,
          shadowBlur: (styleDefaults.shadow as any).blur,
          shadowOffsetX: (styleDefaults.shadow as any).offsetX,
          shadowOffsetY: (styleDefaults.shadow as any).offsetY,
          shadowOpacity: (styleDefaults.shadow as any).opacity,
          animations: []
        }
      } as any);
      const labelId = `el-${n.id}-label`;
      actions.push({
        type: 'addElement',
        element: {
          id: labelId,
          type: 'text',
          name: 'entity-label',
          x: n.x,
          y: n.y,
          width: Math.max(120, n.width - 24),
          height: Math.max(40, Math.round(n.height * 0.5)),
          fill: styleDefaults.text,
          text: labelById.get(n.id),
          fontFamily: styleDefaults.fontFamily,
          fontSize: styleDefaults.fontSize,
          textAlign: 'center',
          wordWrap: true,
          wordWrapWidth: Math.max(120, n.width - 24),
          animations: []
        }
      } as any);
      actions.push({
        type: 'groupElements',
        group: {
          id: `grp-${n.id}`,
          name: `entity-${n.id}`,
          type: 'custom',
          x: n.x,
          y: n.y,
          isDefaultGroup: false,
          elementIds: [bgId, labelId],
          animations: []
        }
      } as any);
      groupIds.add(`grp-${n.id}`);
    }

    // Animations now come as abstract intents; resolved after this block by AnimationResolver

    actions.push({ type: 'setTimeline', timeline: { scale: 100, duration: this.computeDuration(animations), currentTime: 0 } } as any);

    if (actions.length === 0) {
      throw new Error('Compiler: generated empty action list');
    }

    return { context: { canvas: { width: layout.canvas.width, height: layout.canvas.height } }, actions };
  }

  private static computeDuration(anims: Array<any>): number {
    let latest = 0;
    for (const a of anims || []) {
      const end = (Number(a?.startTime) || 0) + (Number(a?.duration) || 0);
      if (end > latest) latest = end;
    }
    return Math.max(1, Math.min(60, Math.round((latest + 0.2) * 100) / 100));
  }
}


