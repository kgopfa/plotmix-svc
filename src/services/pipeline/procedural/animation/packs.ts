import type { AnimationPack } from "../../../../types";

// Animation packs define different styles of animations
const ANIMATION_PACKS: AnimationPack[] = [
  {
    name: "Minimal",
    highlight: {
      type: "color",
      properties: { fillColor: "#e1d799" }, // Light yellow
      duration: 2.0,
      easing: "power1.inOut",
      yoyo: false,
      repeat: 0
    },
    select: {
      type: "scale",
      properties: { scaleX: 1.2, scaleY: 1.2 }, // Subtle scale
      duration: 2.0,
      easing: "power1.inOut",
      yoyo: false,
      repeat: 0
    },
    focus: {
      type: "scale",
      properties: { scaleX: 1.15, scaleY: 1.15 }, // Very subtle
      duration: 2.0,
      easing: "power1.inOut",
      yoyo: false,
      repeat: 0
    },
    compare: {
      type: "color",
      properties: { fillColor: "#ff6b6b" }, // Soft red
      duration: 2.0,
      easing: "power1.inOut",
      yoyo: false,
      repeat: 0
    }
  },
  {
    name: "Playful",
    highlight: {
      type: "color",
      properties: { fillColor: "#4ecdc4" }, // Teal
      duration: 1.5,
      easing: "back.out",
      yoyo: true,
      repeat: 1
    },
    select: {
      type: "scale",
      properties: { scaleX: 1.4, scaleY: 1.4 }, // More dramatic
      duration: 1.5,
      easing: "elastic.out",
      yoyo: true,
      repeat: 1
    },
    focus: {
      type: "scale",
      properties: { scaleX: 1.25, scaleY: 1.25 },
      duration: 1.5,
      easing: "back.out",
      yoyo: false,
      repeat: 0
    },
    compare: {
      type: "color",
      properties: { fillColor: "#ff8e8e" }, // Bright red
      duration: 1.5,
      easing: "power2.inOut",
      yoyo: true,
      repeat: 1
    }
  },
  {
    name: "Dramatic",
    highlight: {
      type: "color",
      properties: { fillColor: "#f39c12" }, // Orange
      duration: 1.0,
      easing: "power3.out",
      yoyo: false,
      repeat: 0
    },
    select: {
      type: "scale",
      properties: { scaleX: 1.5, scaleY: 1.5 }, // Large scale
      duration: 1.0,
      easing: "back.out",
      yoyo: false,
      repeat: 0
    },
    focus: {
      type: "scale",
      properties: { scaleX: 1.3, scaleY: 1.3 },
      duration: 1.0,
      easing: "power2.out",
      yoyo: false,
      repeat: 0
    },
    compare: {
      type: "color",
      properties: { fillColor: "#e74c3c" }, // Strong red
      duration: 1.0,
      easing: "power3.inOut",
      yoyo: false,
      repeat: 0
    }
  }
];

// Simple PRNG for deterministic animation selection
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t>>>15), t|1);
    t ^= t + Math.imul(t ^ (t>>>7), t|61);
    return ((t ^ (t>>>14))>>>0)/4294967296;
  };
}

/**
 * Pick an animation pack based on seed for deterministic results
 */
export function pickAnimationPack(seed: number): AnimationPack {
  const r = mulberry32(seed)();
  const index = Math.floor(r * ANIMATION_PACKS.length);
  return ANIMATION_PACKS[index]!;
}

/**
 * Get animation configuration for a specific animation type
 */
export function getAnimationConfig(seed: number, animationType: "highlight" | "select" | "deselect" | "focus" | "compare") {
  const pack = pickAnimationPack(seed);
  // For deselect, we can reuse the select animation but with different properties
  if (animationType === "deselect") {
    return pack["select"]; // Use select animation config for deselect
  }
  return pack[animationType];
}

export default ANIMATION_PACKS;
