import type {
  TimelineAnimation,
  AnimationType,
  GsapEase,
} from '../types/canvas';
import { logger } from '../utils/logger';

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  value?: T;
}

const GSAP_EASES: Set<string> = new Set([
  'none',
  'power1.in', 'power1.out', 'power1.inOut',
  'power2.in', 'power2.out', 'power2.inOut',
  'power3.in', 'power3.out', 'power3.inOut',
  'power4.in', 'power4.out', 'power4.inOut',
  'back.in', 'back.out', 'back.inOut',
  'elastic.in', 'elastic.out', 'elastic.inOut',
  'bounce.in', 'bounce.out', 'bounce.inOut',
  'sine.in', 'sine.out', 'sine.inOut',
  'expo.in', 'expo.out', 'expo.inOut',
  'circ.in', 'circ.out', 'circ.inOut',
]);

const ANIMATION_TYPES: Set<string> = new Set([
  'rotate', 'scale', 'move', 'color', 'fade', 'path', 'typewriter', 'textScale', 'physics',
]);

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function isNonNegativeNumber(v: unknown): v is number {
  return isNumber(v) && v >= 0;
}

function isPositiveNumber(v: unknown): v is number {
  return isNumber(v) && v > 0;
}

function isGsapEase(v: unknown): v is GsapEase {
  return typeof v === 'string' && GSAP_EASES.has(v);
}

function isAnimationType(v: unknown): v is AnimationType {
  return typeof v === 'string' && ANIMATION_TYPES.has(v);
}


export function generateAnimationDisplayName(
  animationType: AnimationType,
  existingAnimations: TimelineAnimation[]
): string {
  // Count animations whose first track has this animation type
  const sameTypeCount = existingAnimations.filter(
    (a) => a.tracks.length > 0 && a.tracks[0]!.type === animationType
  ).length;
  return `${animationType}-${sameTypeCount + 1}`;
}


export function validateTimelineAnimation(obj: unknown): ValidationResult<TimelineAnimation> {
  const errors: string[] = [];
  const a = obj as Partial<TimelineAnimation>;

  if (!a || typeof a !== 'object') {
    logger.error('Animation validation failed: not an object', {
      animation: obj,
      errors: ['Animation must be an object'],
    });
    return { valid: false, errors: ['Animation must be an object'] };
  }

  // Validate top-level animation fields
  if (typeof a.id !== 'string' || a.id.trim() === '') errors.push('id must be a non-empty string');
  if (typeof a.displayName !== 'string' || a.displayName.trim() === '') errors.push('displayName must be a non-empty string');
  if (!isNonNegativeNumber(a.startAt)) errors.push('startAt must be a non-negative number');

  // Validate target
  if (!a.target || typeof a.target !== 'object') {
    errors.push('target must be an object');
  } else {
    if (!['element', 'group'].includes(a.target.type)) {
      errors.push('target.type must be "element" or "group"');
    }
    if (typeof a.target.id !== 'string' || a.target.id.trim() === '') {
      errors.push('target.id must be a non-empty string');
    }
  }

  // Validate tracks
  if (!Array.isArray(a.tracks)) {
    errors.push('tracks must be an array');
  } else if (a.tracks.length === 0) {
    errors.push('tracks must have at least one track');
  } else {
    a.tracks.forEach((track, index) => {
      if (!track || typeof track !== 'object') {
        errors.push(`tracks[${index}] must be an object`);
      } else {
        if (typeof track.id !== 'string' || track.id.trim() === '') {
          errors.push(`tracks[${index}].id must be a non-empty string`);
        }
        if (!isAnimationType(track.type)) {
          errors.push(`tracks[${index}].type must be one of: ${Array.from(ANIMATION_TYPES).join(', ')}`);
        }
        if (typeof track.yoyo !== 'boolean') {
          errors.push(`tracks[${index}].yoyo must be a boolean`);
        }
        if (!isGsapEase(track.easing)) {
          errors.push(`tracks[${index}].easing must be a valid GSAP ease`);
        }
        if (!(isNumber(track.repeat) && track.repeat >= -1)) {
          errors.push(`tracks[${index}].repeat must be a number >= -1`);
        }
        if (!isPositiveNumber(track.duration)) {
          errors.push(`tracks[${index}].duration must be a positive number`);
        }
        if (!isNonNegativeNumber(track.startTime)) {
          errors.push(`tracks[${index}].startTime must be a non-negative number`);
        }
        if (!track.properties || typeof track.properties !== 'object') {
          errors.push(`tracks[${index}].properties must be an object`);
        }
        if (typeof track.displayName !== 'string' || track.displayName.trim() === '') {
          errors.push(`tracks[${index}].displayName must be a non-empty string`);
        }
        if (!isNonNegativeNumber(track.repeatDelay)) {
          errors.push(`tracks[${index}].repeatDelay must be a non-negative number`);
        }
      }
    });
  }

  if (errors.length) {
    logger.error('Animation failed validation', {
      animation: a,
      errors,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    value: a as TimelineAnimation,
  };
}


export function validateTimelineAnimationArray(
  animations: unknown[]
): ValidationResult<TimelineAnimation[]> {
  const errors: string[] = [];
  if (!Array.isArray(animations)) {
    return { valid: false, errors: ['animations must be an array'] };
  }

  const validated: TimelineAnimation[] = [];
  for (let i = 0; i < animations.length; i++) {
    const res = validateTimelineAnimation(animations[i]);
    if (!res.valid) {
      errors.push(`animations[${i}] invalid: ${res.errors.join('; ')}`);
    } else if (res.value) {
      validated.push(res.value);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    value: validated,
  };
}


export function computeExpectedDisplayNames(
  animations: TimelineAnimation[]
): Record<string, string> {
  const expected: Record<string, string> = {};
  const counts: Partial<Record<AnimationType, number>> = {};

  for (const anim of animations) {
    // Use the first track's type as the animation type
    if (anim.tracks.length > 0) {
      const type = anim.tracks[0]!.type;
      counts[type] = (counts[type] ?? 0) + 1;
      expected[anim.id] = `${type}-${counts[type]}`;
    }
  }
  return expected;
}



export function generateAnimationId(animationType: AnimationType): string {
  const rnd = (globalThis as any).crypto?.randomUUID?.()
    ? (globalThis as any).crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${animationType}-${rnd}`;
}

function isValidDisplayNameForType(type: AnimationType, name: unknown): boolean {
  return typeof name === 'string' && new RegExp(`^${type}-\\d+$`).test(name);
}



export function assignAnimationIdentifiers(
  animations: TimelineAnimation[],
  options: { recomputeDisplayNames?: boolean; regenerateIds?: boolean } = {}
): TimelineAnimation[] {
  const { recomputeDisplayNames = false, regenerateIds = false } = options;
  const counts: Partial<Record<AnimationType, number>> = {};

  return animations.map((anim) => {
    // Use the first track's type as the animation type
    if (anim.tracks.length === 0) return anim;
    
    const type = anim.tracks[0]!.type;
    counts[type] = (counts[type] ?? 0) + 1;

    const needNewId = regenerateIds || typeof anim.id !== 'string' || anim.id.trim() === '';
    const id = needNewId ? generateAnimationId(type) : anim.id;

    const expectedDisplayName = `${type}-${counts[type]}`;
    const needDisplayName = recomputeDisplayNames || !isValidDisplayNameForType(type, anim.displayName);
    const displayName = needDisplayName ? expectedDisplayName : anim.displayName;

    return { ...anim, id, displayName };
  });
}


