export type StylePack = {
  name: string;
  cell: { w: number; h: number; radius: number; strokeWidth: number, stroke: string, fill: string, cornerRadius: number };
  shadow: { shadowBlur: number; shadowColor: string; shadowOffsetX: number; shadowOffsetY: number; shadowOpacity: number; shadowEnabled: boolean };
  palette: { cellFill: string; cellStroke: string; text: string; surface: string };
  typography: { family: string; size: number; weight: string; align: "center"|"left"|"right" };
};
