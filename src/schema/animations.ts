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
  const sameTypeCount = existingAnimations.filter(
    (a) => a.type === animationType && typeof a.name === 'string' && a.name.startsWith(`${animationType}-`)
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

  if (typeof a.id !== 'string' || a.id.trim() === '') errors.push('id must be a non-empty string');
  if (typeof a.name !== 'string' || a.name.trim() === '') errors.push('name must be a non-empty string');

  if (!isAnimationType(a.type)) errors.push(`type must be one of: ${Array.from(ANIMATION_TYPES).join(', ')}`);
  if (!isNonNegativeNumber(a.startTime)) errors.push('startTime must be a non-negative number');
  if (!isPositiveNumber(a.duration)) errors.push('duration must be a positive number');

  if (a.easing !== undefined && !isGsapEase(a.easing)) errors.push('easing must be a valid GSAP ease');
  if (a.yoyoReturnEasing !== undefined && !isGsapEase(a.yoyoReturnEasing)) errors.push('yoyoReturnEasing must be a valid GSAP ease');

  if (a.repeat !== undefined && !(isNumber(a.repeat) && a.repeat >= -1)) errors.push('repeat must be a number >= -1');
  if (a.repeatDelay !== undefined && !isNonNegativeNumber(a.repeatDelay)) errors.push('repeatDelay must be a non-negative number');
  if (a.yoyo !== undefined && typeof a.yoyo !== 'boolean') errors.push('yoyo must be a boolean');

  if (a.stagger !== undefined && !isNonNegativeNumber(a.stagger)) errors.push('stagger must be a non-negative number');
  if (a.staggerFrom !== undefined && !['start', 'end', 'center'].includes(String(a.staggerFrom))) {
    errors.push("staggerFrom must be 'start' | 'end' | 'center'");
  }
  if (a.staggerEase !== undefined && !isGsapEase(a.staggerEase)) errors.push('staggerEase must be a valid GSAP ease');

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

  if (!Array.isArray(a.tracks)) {
    errors.push('tracks must be an array');
  } else {
    a.tracks.forEach((track, index) => {
      if (!track || typeof track !== 'object') {
        errors.push(`tracks[${index}] must be an object`);
      } else {
        if (typeof track.property !== 'string') {
          errors.push(`tracks[${index}].property must be a string`);
        }
        if (!isNumber(track.from)) {
          errors.push(`tracks[${index}].from must be a number`);
        }
        if (!isNumber(track.to)) {
          errors.push(`tracks[${index}].to must be a number`);
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
      // Enforce name matches "<type>-<number>"
      const { type, name } = res.value;
      const match = new RegExp(`^${type}-\\d+$`).test(name);
      if (!match) {
        errors.push(`animations[${i}].name must match pattern "${type}-<number>"`);
      }
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
    counts[anim.type] = (counts[anim.type] ?? 0) + 1;
    expected[anim.id] = `${anim.type}-${counts[anim.type]}`;
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
    const type = anim.type;
    counts[type] = (counts[type] ?? 0) + 1;

    const needNewId = regenerateIds || typeof anim.id !== 'string' || anim.id.trim() === '';
    const id = needNewId ? generateAnimationId(type) : anim.id;

    const expectedName = `${type}-${counts[type]}`;
    const needName = recomputeDisplayNames || !isValidDisplayNameForType(type, anim.name);
    const name = needName ? expectedName : anim.name;

    return { ...anim, id, name };
  });
}


