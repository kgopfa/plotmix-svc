type Point = { x: number; y: number };

export class LayoutGrammarService {
  static layoutProcessFlow(params: { entities: Array<{ id: string; kind: string }>; canvas?: { width?: number; height?: number } }) {
    const width = typeof params.canvas?.width === 'number' ? params.canvas!.width! : 1920;
    const height = typeof params.canvas?.height === 'number' ? params.canvas!.height! : 1080;
    const snap = 16;
    const laneY = [-160, 0, 160];
    const sizes: Record<string, { w: number; h: number }> = {
      actor: { w: 260, h: 160 },
      process: { w: 240, h: 160 },
      container: { w: 240, h: 200 },
      event: { w: 200, h: 120 },
      channel: { w: 220, h: 120 }
    };
    const clampCenter = (x: number, y: number, w: number, h: number) => {
      const halfW = w / 2, halfH = h / 2;
      const maxX = width / 2 - halfW, maxY = height / 2 - halfH;
      const minX = -maxX, minY = -maxY;
      return { x: Math.max(minX, Math.min(maxX, x)), y: Math.max(minY, Math.min(maxY, y)) };
    };
    const snapTo = (n: number) => Math.round(n / snap) * snap;

    const placed: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];
    let col = -720; // start left
    let laneIndex = 0;
    for (const e of params.entities) {
      const kindKey = (e.kind || '').toLowerCase();
      const base = sizes[kindKey] || { w: 220, h: 140 };
      const s = { w: Number(base.w) || 220, h: Number(base.h) || 140 };
      const lane = laneIndex % laneY.length;
      const yVal = laneY[lane] ?? 0;
      const { x, y } = clampCenter(col, yVal, s.w, s.h);
      placed.push({ id: e.id, x: snapTo(x), y: snapTo(y), width: s.w, height: s.h });
      col += 360; // column advance
      laneIndex += 1;
    }
    return { canvas: { width, height }, nodes: placed, edges: [] as Array<{ from: string; to: string; path?: Point[] }> };
  }
}


