import type { StylePack } from "../types";

const STYLES: StylePack[] = [
  {
    name: "Minimal",
    cell: { w: 80, h: 80, radius: 6, strokeWidth: 2, stroke: "#000000", fill: "#ffffff", cornerRadius: 0 },
    shadow: { shadowBlur: 8, shadowColor: "#000000", shadowOffsetX: 8, shadowOffsetY: 8, shadowOpacity: 0.35, shadowEnabled: true },
    palette: { cellFill: "#ffffff", cellStroke: "#000000", text: "#000000", surface: "#f7f7f7" },
    typography: { family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', size: 24, weight: '600', align: "center" },
  },
  {
    name: "Monospace",
    cell: { w: 70, h: 70, radius: 0, strokeWidth: 1, stroke: "#222222", fill: "#ffffff", cornerRadius: 0 },
    shadow: { shadowBlur: 0, shadowColor: "#000000", shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 0, shadowEnabled: false },
    palette: { cellFill: "#ffffff", cellStroke: "#222222", text: "#111111", surface: "#ffffff" },
    typography: { family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', size: 22, weight: '500', align: "center" },
  },
  {
    name: "Compact",
    cell: { w: 60, h: 60, radius: 4, strokeWidth: 1, stroke: "#666666", fill: "#f8f9fa", cornerRadius: 0 },
    shadow: { shadowBlur: 4, shadowColor: "#000000", shadowOffsetX: 2, shadowOffsetY: 2, shadowOpacity: 0.1, shadowEnabled: true },
    palette: { cellFill: "#f8f9fa", cellStroke: "#666666", text: "#333333", surface: "#ffffff" },
    typography: { family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', size: 20, weight: '500', align: "center" },
  },
  // add more families (Chalkboard, Playful, etc.)
];

export default STYLES;