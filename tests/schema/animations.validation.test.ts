import {
  validateElementAnimation,
  validateAnimationArrayWithNaming,
  assignAnimationIdentifiersForElement,
} from '../../src/schema/animations';
import type { AnimatedCanvasObject, ElementAnimation } from '../../src/types/project';

describe('Animation schema validation', () => {
  it('validates a correct fade animation', () => {
    const anim: ElementAnimation = {
      id: 'fade-abc',
      displayName: 'fade-1',
      type: 'fade',
      startTime: 1.6,
      duration: 0.6,
      easing: 'power2.out',
      properties: { alpha: 0.35 },
    };
    const res = validateElementAnimation(anim);
    expect(res.valid).toBe(true);
  });

  it('rejects invalid easing and wrong displayName pattern', () => {
    const anim: ElementAnimation = {
      id: 'scale-xyz',
      displayName: 'ScaleOne',
      type: 'scale',
      startTime: 0.9,
      duration: 0.6,
      // @ts-expect-error testing invalid ease value
      easing: 'invalid.ease',
      properties: { scaleX: 1.12, scaleY: 1.12 },
    };
    const res = validateElementAnimation(anim);
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/easing must be a valid GSAP ease/);
  });

  it('validates an array with proper displayName numbering per type', () => {
    const arr: ElementAnimation[] = [
      { id: 'move-a', displayName: 'move-1', type: 'move', startTime: 0, duration: 1, properties: { x: 100 } },
      { id: 'move-b', displayName: 'move-2', type: 'move', startTime: 1, duration: 1, properties: { y: 50 } },
      { id: 'fade-a', displayName: 'fade-1', type: 'fade', startTime: 0.5, duration: 0.5, properties: { alpha: 0.5 } },
    ];
    const res = validateAnimationArrayWithNaming(arr);
    expect(res.valid).toBe(true);
  });

  it('rejects array when a displayName does not match type-n pattern', () => {
    const arr: ElementAnimation[] = [
      { id: 'move-a', displayName: 'move-1', type: 'move', startTime: 0, duration: 1, properties: { x: 100 } },
      // wrong name: should be move-2
      { id: 'move-b', displayName: 'move-two', type: 'move', startTime: 1, duration: 1, properties: { y: 50 } },
    ];
    const res = validateAnimationArrayWithNaming(arr);
    expect(res.valid).toBe(false);
    expect(res.errors.join(' ')).toMatch(/displayName must match pattern "move-<number>"/);
  });
});

describe('Animation identifier assignment', () => {
  it('assigns ids and display names when missing', () => {
    const element: AnimatedCanvasObject = {
      id: 'el-1',
      name: 'el-1',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
      fill: '#FFFFFF',
      animations: [
        // missing id/displayName on purpose
        { id: '', displayName: '', type: 'fade', startTime: 0, duration: 0.5, properties: { alpha: 0.5 } } as any,
        { id: '', displayName: '', type: 'fade', startTime: 0.6, duration: 0.4, properties: { alpha: 0.35 } } as any,
        { id: '', displayName: '', type: 'move', startTime: 0.4, duration: 0.6, properties: { x: 50 } } as any,
      ],
    };

    const updated = assignAnimationIdentifiersForElement(element);
    expect(updated.animations.length).toBe(3);
    // display names should be sequential per type
    const fadeNames = updated.animations.filter(a => a.type === 'fade').map(a => a.displayName);
    expect(fadeNames).toEqual(['fade-1', 'fade-2']);
    const moveNames = updated.animations.filter(a => a.type === 'move').map(a => a.displayName);
    expect(moveNames).toEqual(['move-1']);
    // ids should be non-empty strings
    updated.animations.forEach(a => {
      expect(typeof a.id).toBe('string');
      expect(a.id.trim().length).toBeGreaterThan(0);
    });
  });
});


