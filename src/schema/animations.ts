import type {
  AnimatedCanvasObject,
  ElementAnimation,
  AnimationType,
  AnimatableProperties,
  GsapEase,
  CanvasGroup,
} from '../types/project';

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

/**
 * Mirrors the UI's display-name convention: `${type}-${n}` where n is
 * the count of existing animations of the same type plus one.
 */
export function generateAnimationDisplayName(
  animationType: AnimationType,
  existingAnimations: ElementAnimation[]
): string {
  const sameTypeCount = existingAnimations.filter(
    (a) => a.type === animationType && typeof a.displayName === 'string' && a.displayName.startsWith(`${animationType}-`)
  ).length;
  return `${animationType}-${sameTypeCount + 1}`;
}

/**
 * Structural validation of properties per animation type.
 * Allows extra properties but enforces required ones.
 */
function validateAnimatableProperties(
  type: AnimationType,
  props: unknown
): ValidationResult<AnimatableProperties> {
  const errors: string[] = [];
  const p = (props ?? {}) as Record<string, unknown>;

  switch (type) {
    case 'move':
      if (p['x'] !== undefined && !isNumber(p['x'])) errors.push('properties.x must be a number');
      if (p['y'] !== undefined && !isNumber(p['y'])) errors.push('properties.y must be a number');
      break;

    case 'scale':
      if (p['scaleX'] !== undefined && !isNumber(p['scaleX'])) errors.push('properties.scaleX must be a number');
      if (p['scaleY'] !== undefined && !isNumber(p['scaleY'])) errors.push('properties.scaleY must be a number');
      break;

    case 'rotate':
      if (p['rotation'] !== undefined && !isNumber(p['rotation'])) errors.push('properties.rotation must be a number');
      if (p['pivotX'] !== undefined && !isNumber(p['pivotX'])) errors.push('properties.pivotX must be a number');
      if (p['pivotY'] !== undefined && !isNumber(p['pivotY'])) errors.push('properties.pivotY must be a number');
      break;

    case 'fade':
      if (p['alpha'] !== undefined && !isNumber(p['alpha'])) errors.push('properties.alpha must be a number');
      break;

    case 'color':
      if (p['fillColor'] !== undefined && typeof p['fillColor'] !== 'string') {
        errors.push('properties.fillColor must be a string');
      }
      break;

    case 'path':
      if (
        p['pathPoints'] !== undefined &&
        !(
          Array.isArray(p['pathPoints']) &&
          (p['pathPoints'] as any[]).every((pt: any) => pt && isNumber(pt.x) && isNumber(pt.y))
        )
      ) {
        errors.push('properties.pathPoints must be an array of {x:number,y:number}');
      }
      if (p['pathDirection'] !== undefined && !['clockwise', 'counterclockwise'].includes(String(p['pathDirection']))) {
        errors.push("properties.pathDirection must be 'clockwise' or 'counterclockwise'");
      }
      break;

    case 'physics':
      if (p['velocity'] !== undefined && !isNumber(p['velocity'])) errors.push('properties.velocity must be a number');
      if (p['angle'] !== undefined && !isNumber(p['angle'])) errors.push('properties.angle must be a number');
      if (p['gravity'] !== undefined && !isNumber(p['gravity'])) errors.push('properties.gravity must be a number');
      if (p['acceleration'] !== undefined && !isNumber(p['acceleration'])) errors.push('properties.acceleration must be a number');
      if (p['accelerationAngle'] !== undefined && !isNumber(p['accelerationAngle'])) errors.push('properties.accelerationAngle must be a number');
      if (p['friction'] !== undefined && !isNumber(p['friction'])) errors.push('properties.friction must be a number');
      if (p['xProp'] !== undefined && typeof p['xProp'] !== 'string') errors.push('properties.xProp must be a string');
      if (p['yProp'] !== undefined && typeof p['yProp'] !== 'string') errors.push('properties.yProp must be a string');
      break;

    case 'typewriter':
    case 'textScale':
      // Accept optional props for now
      break;

    default:
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    value: p as AnimatableProperties,
  };
}

/**
 * Validates a single ElementAnimation structurally.
 * Does not require knowledge of sibling animations.
 */
export function validateElementAnimation(obj: unknown): ValidationResult<ElementAnimation> {
  const errors: string[] = [];
  const a = obj as Partial<ElementAnimation>;

  if (!a || typeof a !== 'object') {
    return { valid: false, errors: ['Animation must be an object'] };
  }

  if (typeof a.id !== 'string' || a.id.trim() === '') errors.push('id must be a non-empty string');
  if (typeof a.displayName !== 'string' || a.displayName.trim() === '') errors.push('displayName must be a non-empty string');

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

  // Properties per type
  if (a.type) {
    const propsResult = validateAnimatableProperties(a.type, a.properties);
    if (!propsResult.valid) errors.push(...propsResult.errors);
  } else {
    errors.push('type is required to validate properties');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: a as ElementAnimation,
  };
}

/**
 * Validates an array of animations structurally and enforces displayName format:
 * `${type}-${n}` where n is a positive integer.
 */
export function validateAnimationArrayWithNaming(
  animations: unknown[]
): ValidationResult<ElementAnimation[]> {
  const errors: string[] = [];
  if (!Array.isArray(animations)) {
    return { valid: false, errors: ['animations must be an array'] };
  }

  const validated: ElementAnimation[] = [];
  for (let i = 0; i < animations.length; i++) {
    const res = validateElementAnimation(animations[i]);
    if (!res.valid) {
      errors.push(`animations[${i}] invalid: ${res.errors.join('; ')}`);
    } else if (res.value) {
      // Enforce displayName matches "<type>-<number>"
      const { type, displayName } = res.value;
      const match = new RegExp(`^${type}-\\d+$`).test(displayName);
      if (!match) {
        errors.push(`animations[${i}].displayName must match pattern "${type}-<number>"`);
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

/**
 * Given all animations on an element, compute expected display names
 * per the UI convention. Useful for prompts or renaming passes.
 */
export function computeExpectedDisplayNames(
  animations: ElementAnimation[]
): Record<string, string> {
  const expected: Record<string, string> = {};
  const counts: Partial<Record<AnimationType, number>> = {};

  for (const anim of animations) {
    counts[anim.type] = (counts[anim.type] ?? 0) + 1;
    expected[anim.id] = `${anim.type}-${counts[anim.type]}`;
  }
  return expected;
}

/**
 * Validates a single animation against an element context:
 * - Structural checks
 * - Display name pattern (type-<number>)
 */
export function validateAnimationAgainstElement(
  animation: unknown,
  element: AnimatedCanvasObject
): ValidationResult<ElementAnimation> {
  void element; // placeholder for future contextual checks

  const base = validateElementAnimation(animation);
  if (!base.valid || !base.value) return base;

  const errors: string[] = [...base.errors];

  // Basic pattern enforcement
  const nameOk = new RegExp(`^${base.value.type}-\\d+$`).test(base.value.displayName);
  if (!nameOk) {
    errors.push(`displayName must match pattern "${base.value.type}-<number>"`);
  }

  return {
    valid: errors.length === 0,
    errors,
    value: base.value,
  };
}

// -------------------------
// Identifier utilities
// -------------------------

/**
 * Generate an animation ID similar to UI behavior. UI mixes strategies; for
 * backend default to a unique ID prefixed by type.
 */
export function generateAnimationId(animationType: AnimationType): string {
  const rnd = (globalThis as any).crypto?.randomUUID?.()
    ? (globalThis as any).crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${animationType}-${rnd}`;
}

function isValidDisplayNameForType(type: AnimationType, name: unknown): boolean {
  return typeof name === 'string' && new RegExp(`^${type}-\\d+$`).test(name);
}

/**
 * Assign IDs and UI-style display names to an element's animations.
 * - By default only fills missing identifiers;
 * - Optionally recomputes display names and/or regenerates IDs.
 */
export function assignAnimationIdentifiersForElement(
  element: AnimatedCanvasObject,
  options: { recomputeDisplayNames?: boolean; regenerateIds?: boolean } = {}
): AnimatedCanvasObject {
  const { recomputeDisplayNames = false, regenerateIds = false } = options;
  const counts: Partial<Record<AnimationType, number>> = {};

  const updatedAnimations: ElementAnimation[] = (element.animations || []).map((anim) => {
    const type = anim.type;
    counts[type] = (counts[type] ?? 0) + 1;

    const needNewId = regenerateIds || typeof anim.id !== 'string' || anim.id.trim() === '';
    const id = needNewId ? generateAnimationId(type) : anim.id;

    const expectedName = `${type}-${counts[type]}`;
    const needName = recomputeDisplayNames || !isValidDisplayNameForType(type, (anim as any).displayName);
    const displayName = needName ? expectedName : (anim as any).displayName;

    return { ...anim, id, displayName } as ElementAnimation;
  });

  return { ...element, animations: updatedAnimations };
}

/**
 * Assign IDs and UI-style display names to a group's animations.
 */
export function assignAnimationIdentifiersForGroup(
  group: CanvasGroup,
  options: { recomputeDisplayNames?: boolean; regenerateIds?: boolean } = {}
): CanvasGroup {
  const { recomputeDisplayNames = false, regenerateIds = false } = options;
  const counts: Partial<Record<AnimationType, number>> = {};

  const updated: ElementAnimation[] = (group.animations || []).map((anim) => {
    const type = anim.type;
    counts[type] = (counts[type] ?? 0) + 1;

    const needNewId = regenerateIds || typeof anim.id !== 'string' || anim.id.trim() === '';
    const id = needNewId ? generateAnimationId(type) : anim.id;

    const expectedName = `${type}-${counts[type]}`;
    const needName = recomputeDisplayNames || !isValidDisplayNameForType(type, (anim as any).displayName);
    const displayName = needName ? expectedName : (anim as any).displayName;

    return { ...anim, id, displayName } as ElementAnimation;
  });

  return { ...group, animations: updated };
}

/**
 * Bulk assignment for arrays of elements and groups.
 */
export function assignAnimationIdentifiers(
  elements: AnimatedCanvasObject[],
  groups: CanvasGroup[],
  options: { recomputeDisplayNames?: boolean; regenerateIds?: boolean } = {}
): { elements: AnimatedCanvasObject[]; groups: CanvasGroup[] } {
  return {
    elements: elements.map((e) => assignAnimationIdentifiersForElement(e, options)),
    groups: groups.map((g) => assignAnimationIdentifiersForGroup(g, options)),
  };
}

// -------------------------
// Prompt helpers (strip identifiers)
// -------------------------

export type PromptAnimation = Omit<ElementAnimation, 'id' | 'displayName'>;
export type PromptElement = Omit<AnimatedCanvasObject, 'animations'> & { animations: PromptAnimation[] };
export type PromptGroup = Omit<CanvasGroup, 'animations'> & { animations: PromptAnimation[] };

export function toPromptElement(element: AnimatedCanvasObject): PromptElement {
  return {
    ...(element as any),
    animations: (element.animations || []).map((a) => {
      const { id: _id, displayName: _dn, ...rest } = a as any;
      return rest as PromptAnimation;
    }),
  } as PromptElement;
}

export function toPromptGroup(group: CanvasGroup): PromptGroup {
  return {
    ...(group as any),
    animations: (group.animations || []).map((a) => {
      const { id: _id, displayName: _dn, ...rest } = a as any;
      return rest as PromptAnimation;
    }),
  } as PromptGroup;
}


