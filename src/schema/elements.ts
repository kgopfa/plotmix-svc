import type {
  AnimatedCanvasObject,
  AnimationType,
  ElementAnimation,
  LineOptions,
} from '../types/project';
import { validateElementAnimation } from './animations';
import { logger } from '../utils/logger';

export interface ValidationResult<T> {
  valid: boolean;
  errors: string[];
  value?: T;
}

// -------------------------
// Primitive guards
// -------------------------

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v);
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isNonNegativeNumber(v: unknown): v is number {
  return isNumber(v) && v >= 0;
}

function isPoint(v: any): v is { x: number; y: number } {
  return v && isNumber(v.x) && isNumber(v.y);
}

function isHexColorString(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  // Allow #RRGGBB or #RGB
  return /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(v);
}

function isColorStringOrNone(v: unknown): boolean {
  if (v === 'none') return true;
  return isHexColorString(v);
}

// -------------------------
// Common validators
// -------------------------

const ELEMENT_TYPES: Set<string> = new Set([
  'rectangle', 'circle', 'triangle', 'arc', 'line', 'path', 'image', 'text',
]);

// Pipeline/frontend-supported fonts allowlist
const FONT_ALLOWLIST: Set<string> = new Set([
  // Sans-serif
  'Inter','Roboto','Libre Franklin','Raleway','Source Sans Pro','Poppins','Open Sans','Lato','Arial','Helvetica','Helvetica Neue','Segoe UI','Montserrat','Nunito','Geist','Verdana','Tahoma','Trebuchet MS',
  // Serif
  'Playfair Display','Merriweather','Lora','Times New Roman','Georgia','Garamond','Palatino',
  // Script
  'Dancing Script','Pacifico','Great Vibes','Satisfy','Kaushan Script','Allura','Alex Brush',
  // Monospace
  'Geist Mono','Source Code Pro','Fira Code','JetBrains Mono','Inconsolata','Courier New','Consolas','Monaco','Menlo',
  // CSS Font Stacks
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
]);

function validateLineOptions(v: unknown): ValidationResult<LineOptions> {
  const errors: string[] = [];
  const o = (v ?? {}) as Record<string, unknown>;

  const points = o['points'] as any;
  if (!points || !isPoint(points.start) || !isPoint(points.end)) {
    errors.push('lineOptions.points must include start{x,y} and end{x,y} numbers');
  }
  if (o['arrow'] !== undefined && !isBoolean(o['arrow'])) errors.push('lineOptions.arrow must be a boolean');
  if (o['dotted'] !== undefined && !isBoolean(o['dotted'])) errors.push('lineOptions.dotted must be a boolean');
  if (o['isCurved'] !== undefined && !isBoolean(o['isCurved'])) errors.push('lineOptions.isCurved must be a boolean');
  if (o['controlPoint'] !== undefined && !isPoint(o['controlPoint'])) errors.push('lineOptions.controlPoint must be a {x,y}');

  return { valid: errors.length === 0, errors, value: (o as unknown) as LineOptions };
}

function validateCommonElementFields(obj: any): string[] {
  const errors: string[] = [];
  if (!isString(obj.id) || obj.id.trim() === '') errors.push('id must be a non-empty string');
  if (!isString(obj.name)) errors.push('name must be a string');
  if (!ELEMENT_TYPES.has(obj.type)) errors.push(`type must be one of: ${Array.from(ELEMENT_TYPES).join(', ')}`);

  if (!isNumber(obj.x)) errors.push('x must be a number');
  if (!isNumber(obj.y)) errors.push('y must be a number');
  // width/height are not semantically required for line/path; default to 0 later
  const isLineOrPath = obj.type === 'line' || obj.type === 'path';
  if (!isLineOrPath) {
    if (!isNumber(obj.width)) errors.push('width must be a number');
    if (!isNumber(obj.height)) errors.push('height must be a number');
  } else {
    if (obj.width !== undefined && !isNumber(obj.width)) errors.push('width must be a number when provided');
    if (obj.height !== undefined && !isNumber(obj.height)) errors.push('height must be a number when provided');
  }

  if (!isString(obj.fill) || !isColorStringOrNone(obj.fill)) errors.push('fill must be a color string "#RRGGBB"/"#RGB" or "none"');
  if (obj.stroke !== undefined && (!isString(obj.stroke) || !isColorStringOrNone(obj.stroke))) errors.push('stroke must be a color string "#RRGGBB"/"#RGB" or "none"');
  if (obj.strokeWidth !== undefined && !isNumber(obj.strokeWidth)) errors.push('strokeWidth must be a number');

  if (obj.opacity !== undefined && !isNumber(obj.opacity)) errors.push('opacity must be a number');
  if (obj.visible !== undefined && !isBoolean(obj.visible)) errors.push('visible must be a boolean');
  if (obj.zIndex !== undefined && !isNumber(obj.zIndex)) errors.push('zIndex must be a number');
  if (obj.rotation !== undefined && !isNumber(obj.rotation)) errors.push('rotation must be a number');
  if (obj.pivotX !== undefined && !isNumber(obj.pivotX)) errors.push('pivotX must be a number');
  if (obj.pivotY !== undefined && !isNumber(obj.pivotY)) errors.push('pivotY must be a number');

  if (obj.groupId !== undefined && !isString(obj.groupId)) errors.push('groupId must be a string');
  if (obj.isAnimationPath !== undefined && !isBoolean(obj.isAnimationPath)) errors.push('isAnimationPath must be a boolean');

  // Shadow
  if (obj.shadowEnabled !== undefined && !isBoolean(obj.shadowEnabled)) errors.push('shadowEnabled must be a boolean');
  if (obj.shadowColor !== undefined && (!isString(obj.shadowColor) || !isHexColorString(obj.shadowColor))) errors.push('shadowColor must be a hex color string');
  if (obj.shadowBlur !== undefined && !isNonNegativeNumber(obj.shadowBlur)) errors.push('shadowBlur must be a non-negative number');
  if (obj.shadowOffsetX !== undefined && !isNumber(obj.shadowOffsetX)) errors.push('shadowOffsetX must be a number');
  if (obj.shadowOffsetY !== undefined && !isNumber(obj.shadowOffsetY)) errors.push('shadowOffsetY must be a number');
  if (obj.shadowOpacity !== undefined && !isNumber(obj.shadowOpacity)) errors.push('shadowOpacity must be a number');

  return errors;
}

// -------------------------
// Per-type validators
// -------------------------

function validateRectangle(obj: any): string[] {
  const errors: string[] = [];
  if (obj.cornerRadius !== undefined && !isNumber(obj.cornerRadius)) errors.push('cornerRadius must be a number');
  return errors;
}

function validateCircle(obj: any): string[] {
  const errors: string[] = [];
  if (obj.radius !== undefined && !isNumber(obj.radius)) errors.push('radius must be a number for circle');
  return errors;
}

function validateTriangle(_obj: any): string[] {
  const errors: string[] = [];
  return errors;
}

function validateArc(obj: any): string[] {
  const errors: string[] = [];
  // Minimal: require radius if present
  if (obj.radius !== undefined && !isNumber(obj.radius)) errors.push('radius must be a number for arc');
  return errors;
}

function validateLine(obj: any): string[] {
  const errors: string[] = [];
  const lineOptions = obj.lineOptions;
  const res = validateLineOptions(lineOptions);
  if (!res.valid) errors.push(...res.errors);
  return errors;
}

function validatePath(obj: any): string[] {
  const errors: string[] = [];
  if (!Array.isArray(obj.pathPoints) || !obj.pathPoints.every((pt: any) => isPoint(pt))) {
    errors.push('pathPoints must be an array of {x:number,y:number} for path');
  }
  return errors;
}

function validateImage(obj: any): string[] {
  const errors: string[] = [];
  if (!isString(obj.imageData)) errors.push('imageData must be a string for image');
  return errors;
}

function validateText(obj: any): string[] {
  const errors: string[] = [];
  if (!isString(obj.text)) errors.push('text must be a string for text element');
  if (obj.fontSize !== undefined && !isNumber(obj.fontSize)) errors.push('fontSize must be a number');
  if (obj.fontFamily !== undefined) {
    if (!isString(obj.fontFamily)) {
      errors.push('fontFamily must be a string');
    } else if (!FONT_ALLOWLIST.has(obj.fontFamily)) {
      errors.push('fontFamily not in allowlist');
    }
  }
  if (obj.fontWeight !== undefined && !isString(obj.fontWeight)) errors.push('fontWeight must be a string');
  if (obj.fontStyle !== undefined && !isString(obj.fontStyle)) errors.push('fontStyle must be a string');
  if (obj.textAlign !== undefined && !isString(obj.textAlign)) errors.push('textAlign must be a string');
  if (obj.letterSpacing !== undefined && !isNumber(obj.letterSpacing)) errors.push('letterSpacing must be a number');
  if (obj.lineHeight !== undefined && !isNumber(obj.lineHeight)) errors.push('lineHeight must be a number');
  if (obj.wordWrap !== undefined && !isBoolean(obj.wordWrap)) errors.push('wordWrap must be a boolean');
  if (obj.wordWrapWidth !== undefined && !isNumber(obj.wordWrapWidth)) errors.push('wordWrapWidth must be a number');
  if (obj.wordWrap === true && isNumber(obj.width) && obj.wordWrapWidth !== obj.width) {
    errors.push('when wordWrap=true, wordWrapWidth must equal width');
  }
  if (obj.textStroke !== undefined && (!isString(obj.textStroke) || !isHexColorString(obj.textStroke))) errors.push('textStroke must be a hex color string');
  if (obj.textStrokeWidth !== undefined && !isNumber(obj.textStrokeWidth)) errors.push('textStrokeWidth must be a number');
  if (obj.textStrokeJoin !== undefined && !isString(obj.textStrokeJoin)) errors.push('textStrokeJoin must be a string');
  if (obj.textDropShadow?.color !== undefined && !isHexColorString(obj.textDropShadow.color)) errors.push('textDropShadow.color must be a hex color string');
  if (obj.textGradient?.colors !== undefined) {
    const colors = obj.textGradient.colors as any[];
    if (!Array.isArray(colors) || !colors.every(c => c && isHexColorString(c.color) && isNumber(c.offset))) {
      errors.push('textGradient.colors must be an array of { color: "#RRGGBB", offset: number }');
    }
  }
  return errors;
}

// -------------------------
// Public validators
// -------------------------

export function validateAnimatedCanvasObject(obj: unknown): ValidationResult<AnimatedCanvasObject> {
  const errors: string[] = [];
  if (!obj || typeof obj !== 'object') {
    return { valid: false, errors: ['element must be an object'] };
  }
  const o = obj as any;

  errors.push(...validateCommonElementFields(o));

  // Type-specific
  switch (o.type as AnimationType | string) {
    case 'rectangle':
      errors.push(...validateRectangle(o));
      break;
    case 'circle':
      errors.push(...validateCircle(o));
      break;
    case 'triangle':
      errors.push(...validateTriangle(o));
      break;
    case 'arc':
      errors.push(...validateArc(o));
      break;
    case 'line':
      errors.push(...validateLine(o));
      break;
    case 'path':
      errors.push(...validatePath(o));
      break;
    case 'image':
      errors.push(...validateImage(o));
      break;
    case 'text':
      errors.push(...validateText(o));
      break;
    default:
      // Unknown type already handled in common fields
      break;
  }

  // Animations
  if (!Array.isArray(o.animations)) {
    errors.push('animations must be an array');
  } else {
    for (let i = 0; i < o.animations.length; i++) {
      const res = validateElementAnimation(o.animations[i] as ElementAnimation);
      if (!res.valid) {
        logger.error('Animation failed validation', {
          elementId: o.id,
          animationIndex: i,
          animation: o.animations[i],
          errors: res.errors,
        });
        errors.push(`animations[${i}] invalid: ${res.errors.join('; ')}`);
      }
    }
  }

  // Defaults for line/path: ensure width/height exist as numbers
  if (o.type === 'line' || o.type === 'path') {
    if (!isNumber(o.width)) o.width = 0;
    if (!isNumber(o.height)) o.height = 0;
  }

  if (errors.length) {
    logger.error('Element failed validation', {
      elementId: o.id,
      name: o.name,
      type: o.type,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      errors,
    });
  }

  return { valid: errors.length === 0, errors, value: o as AnimatedCanvasObject };
}

export function validateElementsArray(elements: unknown): ValidationResult<AnimatedCanvasObject[]> {
  if (!Array.isArray(elements)) {
    return { valid: false, errors: ['elements must be an array'] };
  }
  const errors: string[] = [];
  const out: AnimatedCanvasObject[] = [];
  elements.forEach((el, idx) => {
    const res = validateAnimatedCanvasObject(el);
    if (!res.valid || !res.value) {
      errors.push(`elements[${idx}] invalid: ${res.errors.join('; ')}`);
    } else {
      out.push(res.value);
    }
  });
  return { valid: errors.length === 0, errors, value: out };
}


