// Design Tokens - Invariant design system constants
// These provide the foundation for consistent procedural generation

export const TOKENS = {
  grid: { 
    snap: 16, 
    laneGap: 180, 
    labelGap: 12,
    margin: 32,
    padding: 16
  },
  radii: { 
    sharp: 0, 
    soft: 6, 
    card: 10, 
    pill: 999 
  },
  stroke: { 
    hair: 1, 
    ui: 2, 
    strong: 3 
  },
  type: { 
    font: "Inter", 
    base: 14, 
    min: 12, 
    lh: 1.2 
  },
  ease: { 
    enter: "power2.out", 
    move: "power1.inOut", 
    emphasis: "back.out(1.4)" 
  },
  dur: { 
    fast: 0.2, 
    base: 0.3, 
    move: 0.9 
  },
  color: { 
    text: "#0F172A", 
    line: "#64748B", 
    card: "#F1F5F9", 
    bg: "#FFFFFF",
    primary: "#4F46E5", 
    accent: "#22C55E", 
    danger: "#EF4444",
    warning: "#F59E0B",
    success: "#10B981"
  }
};

// Theme packs - swappable per scene/project
export type ThemePack = {
  id: string;
  palette: Partial<typeof TOKENS.color>;
  motion: { 
    speedFactor: number; 
    stagger: number; 
    profile: "calm" | "neutral" | "energetic" 
  };
  density: "airy" | "normal" | "compact";
  ornaments: Array<"dots" | "gradient" | "none">;
};

export const THEMES: Record<string, ThemePack> = {
  "formal-light": {
    id: "formal-light",
    palette: { 
      primary: "#4F46E5", 
      accent: "#22C55E", 
      card: "#F8FAFC", 
      line: "#94A3B8", 
      text: "#0F172A", 
      bg: "#FFFFFF" 
    },
    motion: { speedFactor: 0.95, stagger: 0.08, profile: "calm" },
    density: "normal", 
    ornaments: ["dots"]
  },
  "dark-formal": {
    id: "dark-formal",
    palette: { 
      text: "#E5E7EB", 
      card: "#0B1220", 
      bg: "#0B1020", 
      line: "#334155", 
      primary: "#7C9BFF", 
      accent: "#34D399" 
    },
    motion: { speedFactor: 1.0, stagger: 0.1, profile: "neutral" },
    density: "normal", 
    ornaments: ["none"]
  },
  "friendly": {
    id: "friendly",
    palette: { 
      primary: "#8B5CF6", 
      accent: "#F59E0B", 
      card: "#FEF3C7", 
      line: "#FCD34D", 
      text: "#1F2937", 
      bg: "#FEFCE8" 
    },
    motion: { speedFactor: 1.1, stagger: 0.12, profile: "energetic" },
    density: "airy", 
    ornaments: ["dots", "gradient"]
  },
  "concise": {
    id: "concise",
    palette: { 
      primary: "#374151", 
      accent: "#6B7280", 
      card: "#F9FAFB", 
      line: "#D1D5DB", 
      text: "#111827", 
      bg: "#FFFFFF" 
    },
    motion: { speedFactor: 0.9, stagger: 0.06, profile: "calm" },
    density: "compact", 
    ornaments: ["none"]
  }
};

// Skin specifications for role-based styling
export type SkinSpec = {
  kind: "primitive" | "icon" | "photo";
  shape?: "rect" | "circle" | "pill";
  fill?: string; 
  stroke?: string; 
  strokeWidth?: number; 
  cornerRadius?: number;
  textStyle?: Partial<{ 
    fontSize: number; 
    fontFamily: string; 
    fontWeight: string; 
    textAlign: "left" | "center" | "right" 
  }>;
  assetId?: string; // optional icon/photo
};

export type SkinRegistry = Record<string, SkinSpec>; // e.g. "actor.card", "edge.flow", "label.caption"

// Style resolver - single source of truth for styling
export function resolveStyle({
  role, 
  theme, 
  tokens, 
  skin, 
  overrides
}: { 
  role: string; 
  theme: ThemePack; 
  tokens: typeof TOKENS; 
  skin?: SkinSpec; 
  overrides?: Record<string, any> 
}) {
  const p = { ...TOKENS.color, ...(theme.palette || {}) };
  
  const base: Record<string, any> = {
    "actor.card": { 
      fill: p.card, 
      stroke: p.line, 
      strokeWidth: tokens.stroke.ui, 
      cornerRadius: tokens.radii.card 
    },
    "container.card": { 
      fill: p.card, 
      stroke: p.line, 
      strokeWidth: tokens.stroke.ui, 
      cornerRadius: tokens.radii.card 
    },
    "process.node": { 
      fill: p.card, 
      stroke: p.line, 
      strokeWidth: tokens.stroke.ui, 
      cornerRadius: tokens.radii.soft 
    },
    "edge.flow": { 
      fill: "none", 
      stroke: p.line, 
      strokeWidth: tokens.stroke.ui 
    },
    "label.caption": { 
      fill: p.text, 
      stroke: "none", 
      fontSize: Math.max(tokens.type.base, tokens.type.min), 
      fontFamily: tokens.type.font, 
      textAlign: "center" 
    },
    "event.node": {
      fill: p.accent,
      stroke: p.primary,
      strokeWidth: tokens.stroke.strong,
      cornerRadius: tokens.radii.pill
    },
    "channel.node": {
      fill: p.bg,
      stroke: p.line,
      strokeWidth: tokens.stroke.hair,
      cornerRadius: tokens.radii.soft
    }
  };
  
  const merged = { 
    ...(base[role] ?? base["container.card"]), 
    ...(skin || {}), 
    ...(overrides || {}) 
  };
  
  return merged;
}

// Utility function to select theme based on tone
export function selectThemeByTone(tone: string): ThemePack {
  switch (tone) {
    case 'formal':
      return THEMES['formal-light']!;
    case 'friendly':
      return THEMES['friendly']!;
    case 'concise':
      return THEMES['concise']!;
    default:
      return THEMES['formal-light']!;
  }
}
