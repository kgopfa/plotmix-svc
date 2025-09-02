import { DslCompiler } from '../services/pipeline/dsl/compiler';
import { execute } from '../services/pipeline/dsl/executor';

describe('Dynamic Caption Width', () => {
  test('should use calculated width when less than 700px', () => {
    const dsl = `
      seed 12345
      style auto
      array [1,2,3]
      caption 1 "Short text"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    const caption = scene.elements.find(el => el.name === 'Caption 1') as any;
    expect(caption).toBeDefined();
    expect(caption.text).toBe('Short text');
    
    // Short text should use calculated width (less than 700px)
    expect(caption.width).toBeLessThan(700);
    expect(caption.pivotX).toBe(caption.width / 2);
  });

  test('should cap width at 700px for long text', () => {
    const dsl = `
      seed 12345
      style auto
      array [1,2,3]
      caption 1 "This is a very long caption text that should definitely exceed 700 pixels in width when rendered"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    const caption = scene.elements.find(el => el.name === 'Caption 1') as any;
    expect(caption).toBeDefined();
    expect(caption.text).toBe('This is a very long caption text that should definitely exceed 700 pixels in width when rendered');
    
    // Long text should be capped at 700px
    expect(caption.width).toBe(700);
    expect(caption.pivotX).toBe(350); // 700 / 2
  });

  test('should handle multiple captions with different widths', () => {
    const dsl = `
      seed 12345
      style auto
      array [1,2,3]
      caption 1 "Short"
      caption 2 "This is a medium length caption that might be close to 700px"
      caption 3 "This is an extremely long caption text that should definitely exceed the 700 pixel limit and be capped at 700px maximum width"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    const caption1 = scene.elements.find(el => el.name === 'Caption 1') as any;
    const caption2 = scene.elements.find(el => el.name === 'Caption 2') as any;
    const caption3 = scene.elements.find(el => el.name === 'Caption 3') as any;

    expect(caption1).toBeDefined();
    expect(caption2).toBeDefined();
    expect(caption3).toBeDefined();

    // Short caption should use calculated width
    expect(caption1.width).toBeLessThan(700);
    expect(caption1.pivotX).toBe(caption1.width / 2);

    // Medium caption might use calculated width or be capped
    expect(caption2.width).toBeLessThanOrEqual(700);
    expect(caption2.pivotX).toBe(caption2.width / 2);

    // Long caption should be capped at 700px
    expect(caption3.width).toBe(700);
    expect(caption3.pivotX).toBe(350);
  });
});
