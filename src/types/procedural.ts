export type StylePack = {
  name: string;
  cell: { w: number; h: number; radius: number; stroke: number };
  shadow: { blur: number; dx: number; dy: number; opacity: number; enabled: boolean };
  palette: { cellFill: string; cellStroke: string; text: string; surface: string };
  typography: { family: string; size: number; weight: number; align: "center"|"left"|"right" };
};
