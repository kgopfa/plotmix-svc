import type { StylePack } from "../../../../types";

const STYLES: StylePack[] = [
  {
    name: "Minimal",
    cell: { w: 100, h: 100, radius: 12, strokeWidth: 0, stroke: "#000000", fill: "#d9e194", cornerRadius: 0 },
    shadow: { shadowBlur: 8, shadowColor: "#000000", shadowOffsetX: 8, shadowOffsetY: 8, shadowOpacity: 0.35, shadowEnabled: false },
    palette: { cellFill: "#ffffff", cellStroke: "#000000", text: "#000000", surface: "#f7f7f7" },
    typography: { family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', size: 44, weight: '600', align: "center" },
  },
  {
    name: "Monospace",
    cell: { w: 100, h: 100, radius: 0, strokeWidth: 1, stroke: "#222222", fill: "#7fefc6", cornerRadius: 0 },
    shadow: { shadowBlur: 0, shadowColor: "#000000", shadowOffsetX: 0, shadowOffsetY: 0, shadowOpacity: 0, shadowEnabled: false },
    palette: { cellFill: "#ffffff", cellStroke: "#222222", text: "#111111", surface: "#ffffff" },
    typography: { family: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace', size: 44, weight: '500', align: "center" },
  },
  {
    name: "Compact",
    cell: { w: 100, h: 100, radius: 0, strokeWidth: 0, stroke: "#666666", fill: "#8a7cf4", cornerRadius: 0 },
    shadow: { shadowBlur: 0, shadowColor: "#000000", shadowOffsetX: 6, shadowOffsetY: 6, shadowOpacity: 0.5, shadowEnabled: false },
    palette: { cellFill: "#f8f9fa", cellStroke: "#666666", text: "#333333", surface: "#ffffff" },
    typography: { family: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif', size: 44, weight: '500', align: "center" },
  },
  // add more families (Chalkboard, Playful, etc.)
];

export default STYLES;