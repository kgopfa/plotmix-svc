import type { StylePack } from "../types";

const STYLES: StylePack[] = [
  {
    name: "Minimal",
    cell: { w: 60, h: 60, radius: 6, stroke: 2 },
    shadow: { blur: 8, dx: 8, dy: 8, opacity: 0.35, enabled: true },
    palette: { cellFill: "#ffffff", cellStroke: "#000000", text: "#000000", surface: "#f7f7f7" },
    typography: { family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', size: 30, weight: '600', align: "center" },
  },
  {
    name: "Monospace",
    cell: { w: 60, h: 60, radius: 0, stroke: 1 },
    shadow: { blur: 0, dx: 0, dy: 0, opacity: 0, enabled: false },
    palette: { cellFill: "#ffffff", cellStroke: "#222222", text: "#111111", surface: "#ffffff" },
    typography: { family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', size: 28, weight: '500', align: "center" },
  },
  // add more families (Chalkboard, Playful, etc.)
];

export default STYLES;