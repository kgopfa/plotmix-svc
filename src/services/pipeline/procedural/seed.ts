import type { StylePack } from "../../../types";
import STYLES from "../../../specs/styles";

// Simple PRNG
function mulberry32(seed: number){ 
  return function(){ 
    let t = seed += 0x6D2B79F5; 
    t = Math.imul(t ^ (t>>>15), t|1); 
    t ^= t + Math.imul(t ^ (t>>>7), t|61); 
    return ((t ^ (t>>>14))>>>0)/4294967296; 
  };
}

export function pickStyle(seed: number): StylePack {
  const r = mulberry32(seed)();
  const index = Math.floor(r * STYLES.length);
  return STYLES[index]!;
}
