import { DslCompiler } from '../services/pipeline/dsl/compiler';
import { execute } from '../services/pipeline/dsl/executor';

describe('Dynamic Conclusion Width', () => {
  test('should use calculated width when less than 1200px', () => {
    const dsl = `
      seed 12345
      style auto
      array [1,2,3]
      conclusion 1 "Short conclusion"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    const conclusion = scene.elements.find(el => el.name === 'Conclusion 1') as any;
    expect(conclusion).toBeDefined();
    expect(conclusion.text).toBe('Short conclusion');
    
    // Short text should use calculated width (less than 1200px)
    expect(conclusion.width).toBeLessThan(1200);
    expect(conclusion.pivotX).toBe(conclusion.width / 2);
    expect(conclusion.fontWeight).toBe("normal");
  });

  test('should cap width at 1200px for long text', () => {
    const dsl = `
      seed 12345
      style auto
      array [1,2,3]
      conclusion 1 "This is an extremely long conclusion text that should definitely exceed 1200 pixels in width when rendered with 40px font size"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    const conclusion = scene.elements.find(el => el.name === 'Conclusion 1') as any;
    expect(conclusion).toBeDefined();
    expect(conclusion.text).toBe('This is an extremely long conclusion text that should definitely exceed 1200 pixels in width when rendered with 40px font size');
    
    // Long text should be capped at 1200px
    expect(conclusion.width).toBe(1200);
    expect(conclusion.pivotX).toBe(600); // 1200 / 2
    expect(conclusion.fontWeight).toBe("normal");
  });

  test('should handle multiple conclusions with different widths', () => {
    const dsl = `
      seed 12345
      style auto
      array [1,2,3]
      conclusion 1 "Short"
      conclusion 2 "This is a medium length conclusion that might be close to 1200px"
      conclusion 3 "This is an extremely long conclusion text that should definitely exceed the 1200 pixel limit and be capped at 1200px maximum width"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    const conclusion1 = scene.elements.find(el => el.name === 'Conclusion 1') as any;
    const conclusion2 = scene.elements.find(el => el.name === 'Conclusion 2') as any;
    const conclusion3 = scene.elements.find(el => el.name === 'Conclusion 3') as any;

    expect(conclusion1).toBeDefined();
    expect(conclusion2).toBeDefined();
    expect(conclusion3).toBeDefined();

    // Short conclusion should use calculated width
    expect(conclusion1.width).toBeLessThan(1200);
    expect(conclusion1.pivotX).toBe(conclusion1.width / 2);
    expect(conclusion1.fontWeight).toBe("normal");

    // Medium conclusion might use calculated width or be capped
    expect(conclusion2.width).toBeLessThanOrEqual(1200);
    expect(conclusion2.pivotX).toBe(conclusion2.width / 2);
    expect(conclusion2.fontWeight).toBe("normal");

    // Long conclusion should be capped at 1200px
    expect(conclusion3.width).toBe(1200);
    expect(conclusion3.pivotX).toBe(600);
    expect(conclusion3.fontWeight).toBe("normal");
  });
});
