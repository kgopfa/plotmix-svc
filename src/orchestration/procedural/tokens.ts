// Design Tokens - Invariant design system constants
// These provide the foundation for consistent procedural generation

export const TOKENS = {
  // Canvas dimensions - configurable with 1080p default
  canvas: {
    width: 1920,
    height: 1080,
    aspectRatio: 16/9
  },
  grid: { 
    snap: 16, 
    laneGap: 180, 
    labelGap: 12,
    margin: 32,
    padding: 16
  },
  // Default element sizes - fallback when themes don't specify
  elementSizes: {
    actor: { width: 120, height: 80 },
    container: { width: 120, height: 80 },
    process: { width: 120, height: 80 },
    event: { width: 120, height: 80 },
    channel: { width: 120, height: 80 }
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
    emphasis: "back.out(1.4)",
    pulse: "power2.inOut",
    bounce: "bounce.out"
  },
  dur: { 
    fast: 0.2, 
    base: 0.3, 
    move: 0.9,
    emphasis: {
      short: 0.4,
      medium: 0.8,
      long: 1.2
    }
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
  },
  emphasis: {
    scale: {
      subtle: { min: 0.95, max: 1.05 },
      moderate: { min: 0.9, max: 1.1 },
      dramatic: { min: 0.8, max: 1.2 }
    },
    glow: {
      none: { blur: 0, opacity: 0 },
      soft: { blur: 4, opacity: 0.3 },
      medium: { blur: 8, opacity: 0.5 },
      strong: { blur: 12, opacity: 0.7 }
    },
    pulse: {
      none: { cycles: 0, intensity: 0 },
      gentle: { cycles: 1, intensity: 0.05 },
      noticeable: { cycles: 2, intensity: 0.1 },
      "attention-grabbing": { cycles: 3, intensity: 0.15 }
    },
    stagger: {
      none: 0,
      minimal: 0.05,
      moderate: 0.1,
      pronounced: 0.2
    }
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
  elementSizes: {
    actor: { width: number; height: number };
    container: { width: number; height: number };
    process: { width: number; height: number };
    event: { width: number; height: number };
    channel: { width: number; height: number };
  };
};

export const THEMES: Record<string, ThemePack> = {
  "formal-light": {
    id: "formal-light",
    palette: { 
      text: "#1F2937",
      card: "#F9FAFB"
    },
    motion: { speedFactor: 0.95, stagger: 0.08, profile: "calm" },
    density: "normal", 
    ornaments: ["dots"],
    elementSizes: {
      actor: { width: 150, height: 100 },
      container: { width: 140, height: 90 },
      process: { width: 120, height: 80 },
      event: { width: 100, height: 70 },
      channel: { width: 110, height: 75 }
    }
  },
  "dark-formal": {
    id: "dark-formal",
    palette: { 
      text: "#F9FAFB",
      card: "#1F2937"
    },
    motion: { speedFactor: 1.0, stagger: 0.1, profile: "neutral" },
    density: "normal", 
    ornaments: ["none"],
    elementSizes: {
      actor: { width: 160, height: 110 },
      container: { width: 150, height: 100 },
      process: { width: 130, height: 85 },
      event: { width: 110, height: 75 },
      channel: { width: 120, height: 80 }
    }
  },
  "friendly": {
    id: "friendly",
    palette: { 
      text: "#374151",
      card: "#FEF3C7"
    },
    motion: { speedFactor: 1.1, stagger: 0.12, profile: "energetic" },
    density: "airy", 
    ornaments: ["dots", "gradient"],
    elementSizes: {
      actor: { width: 170, height: 120 },
      container: { width: 160, height: 110 },
      process: { width: 140, height: 90 },
      event: { width: 120, height: 80 },
      channel: { width: 130, height: 85 }
    }
  },
  "concise": {
    id: "concise",
    palette: { 
      text: "#111827",
      card: "#FFFFFF"
    },
    motion: { speedFactor: 0.9, stagger: 0.06, profile: "calm" },
    density: "compact", 
    ornaments: ["none"],
    elementSizes: {
      actor: { width: 130, height: 85 },
      container: { width: 120, height: 80 },
      process: { width: 100, height: 70 },
      event: { width: 90, height: 65 },
      channel: { width: 95, height: 68 }
    }
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
    "actor.card.emphasis": {
      fill: p.accent,
      stroke: p.primary,
      strokeWidth: tokens.stroke.strong,
      cornerRadius: tokens.radii.card,
      shadowEnabled: true,
      shadowColor: p.accent,
      shadowBlur: tokens.emphasis.glow.medium.blur,
      shadowOpacity: tokens.emphasis.glow.medium.opacity
    },
    "container.card": { 
      fill: p.card, 
      stroke: p.line, 
      strokeWidth: tokens.stroke.ui, 
      cornerRadius: tokens.radii.card 
    },
    "container.card.emphasis": {
      fill: p.primary,
      stroke: p.accent,
      strokeWidth: tokens.stroke.strong,
      cornerRadius: tokens.radii.card,
      shadowEnabled: true,
      shadowColor: p.primary,
      shadowBlur: tokens.emphasis.glow.medium.blur,
      shadowOpacity: tokens.emphasis.glow.medium.opacity
    },
    "process.node": { 
      fill: p.card, 
      stroke: p.line, 
      strokeWidth: tokens.stroke.ui, 
      cornerRadius: tokens.radii.soft 
    },
    "process.node.emphasis": {
      fill: p.success,
      stroke: p.accent,
      strokeWidth: tokens.stroke.strong,
      cornerRadius: tokens.radii.soft,
      shadowEnabled: true,
      shadowColor: p.success,
      shadowBlur: tokens.emphasis.glow.medium.blur,
      shadowOpacity: tokens.emphasis.glow.medium.opacity
    },
    "edge.flow": { 
      fill: "none", 
      stroke: p.line, 
      strokeWidth: tokens.stroke.ui 
    },
    "edge.flow.emphasis": {
      fill: "none",
      stroke: p.accent,
      strokeWidth: tokens.stroke.strong,
      shadowEnabled: true,
      shadowColor: p.accent,
      shadowBlur: tokens.emphasis.glow.soft.blur,
      shadowOpacity: tokens.emphasis.glow.soft.opacity
    },
    "label.caption": { 
      fill: p.text, 
      stroke: "none", 
      fontSize: Math.max(tokens.type.base, tokens.type.min), 
      fontFamily: tokens.type.font, 
      textAlign: "center" 
    },
    "label.caption.emphasis": {
      fill: p.primary,
      stroke: "none",
      fontSize: Math.max(tokens.type.base + 2, tokens.type.min), 
      fontFamily: tokens.type.font, 
      textAlign: "center",
      fontWeight: "bold",
      shadowEnabled: true,
      shadowColor: p.primary,
      shadowBlur: tokens.emphasis.glow.soft.blur,
      shadowOpacity: tokens.emphasis.glow.soft.opacity
    },
    "event.node": {
      fill: p.accent,
      stroke: p.primary,
      strokeWidth: tokens.stroke.strong,
      cornerRadius: tokens.radii.pill
    },
    "event.node.emphasis": {
      fill: p.warning,
      stroke: p.accent,
      strokeWidth: tokens.stroke.strong,
      cornerRadius: tokens.radii.pill,
      shadowEnabled: true,
      shadowColor: p.warning,
      shadowBlur: tokens.emphasis.glow.medium.blur,
      shadowOpacity: tokens.emphasis.glow.medium.opacity
    },
    "channel.node": {
      fill: p.bg,
      stroke: p.line,
      strokeWidth: tokens.stroke.hair,
      cornerRadius: tokens.radii.soft
    },
    "channel.node.emphasis": {
      fill: p.bg,
      stroke: p.accent,
      strokeWidth: tokens.stroke.strong,
      cornerRadius: tokens.radii.soft,
      shadowEnabled: true,
      shadowColor: p.accent,
      shadowBlur: tokens.emphasis.glow.soft.blur,
      shadowOpacity: tokens.emphasis.glow.soft.opacity
    }
  };
  
  // Determine if this element should have emphasis styling
  const hasEmphasis = overrides?.['emphasis'] && overrides['emphasis'] !== 'low';
  
  // Select base role (with or without emphasis)
  let baseRole = role;
  if (hasEmphasis && base[`${role}.emphasis`]) {
    baseRole = `${role}.emphasis`;
  }
  
  const merged = { 
    ...(base[baseRole] ?? base[role] ?? base["container.card"]), 
    ...(skin || {}), 
    ...(overrides || {}) 
  };
  
  // Apply emphasis-specific overrides
  if (hasEmphasis) {
    // Apply custom color if specified
    if (overrides?.['color'] === 'custom' && overrides['customColor']) {
      merged.fill = overrides['customColor'];
      if (merged.shadowEnabled) {
        merged.shadowColor = overrides['customColor'];
      }
    } else if (overrides?.['color'] && overrides['color'] !== 'custom') {
      const colorMap: Record<string, string> = {
        accent: p.accent,
        primary: p.primary,
        warning: p.warning,
        success: p.success
      };
      if (colorMap[overrides['color']]) {
        merged.fill = colorMap[overrides['color']];
        if (merged.shadowEnabled) {
          merged.shadowColor = colorMap[overrides['color']];
        }
      }
    }
    
    // Apply glow effects
    if (overrides?.['glow'] && overrides['glow'] !== 'none') {
      const glowConfig = tokens.emphasis.glow[overrides['glow'] as keyof typeof tokens.emphasis.glow];
      if (glowConfig) {
        merged.shadowEnabled = true;
        merged.shadowBlur = glowConfig.blur;
        merged.shadowOpacity = glowConfig.opacity;
      }
    }
  }
  
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
