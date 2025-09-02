import { DslCompiler } from '../services/pipeline/dsl/compiler';
import { execute } from '../services/pipeline/dsl/executor';

describe('Conclusion DSL Commands', () => {
  test('should parse conclusion commands', () => {
    const dsl = `
      seed 12345
      style auto
      heading "Test Algorithm"
      subtitle "Test description"
      array [1,2,3]
      conclusion "O(log n)" "O(1)" "Searching in sorted arrays"
    `;

    const program = DslCompiler.compile(dsl);
    
    expect(program).toHaveLength(6);
    
    const conclusionAction = program.find(action => action.kind === 'CONCLUSION');
    expect(conclusionAction).toBeDefined();
    expect(conclusionAction).toEqual({
      kind: 'CONCLUSION',
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(1)',
      useCase: 'Searching in sorted arrays'
    });
  });

  test('should execute conclusion commands and create complexity elements', () => {
    const dsl = `
      seed 12345
      style auto
      heading "Binary Search Algorithm"
      subtitle "Finding target value in sorted array"
      array [1,3,5,7,9]
      conclusion "O(log n)" "O(1)" "Searching in sorted arrays"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    // Should have heading, subtitle, array elements, and conclusion elements
    expect(scene.elements.length).toBeGreaterThan(10);

    // Find conclusion elements
    const timeComplexityElement = scene.elements.find((el: any) => 
      el.type === 'text' && el.name === 'Time Complexity'
    );
    const spaceComplexityElement = scene.elements.find((el: any) => 
      el.type === 'text' && el.name === 'Space Complexity'
    );
    const useCaseElement = scene.elements.find((el: any) => 
      el.type === 'text' && el.name === 'Use Case Caption'
    );

    expect(timeComplexityElement).toBeDefined();
    expect(spaceComplexityElement).toBeDefined();
    expect(useCaseElement).toBeDefined();

    // Check text content
    expect((timeComplexityElement as any).text).toBe('Time: O(log n)');
    expect((spaceComplexityElement as any).text).toBe('Space: O(1)');
    expect((useCaseElement as any).text).toBe('Use Case: Searching in sorted arrays');

    // Check positioning
    expect((timeComplexityElement as any).x).toBe(-200); // Left side
    expect((spaceComplexityElement as any).x).toBe(200); // Right side
    expect((useCaseElement as any).x).toBe(0); // Center
    expect((useCaseElement as any).y).toBe(400); // Bottom area

    // Check animations
    expect((timeComplexityElement as any).animations).toHaveLength(1);
    expect((spaceComplexityElement as any).animations).toHaveLength(1);
    expect((useCaseElement as any).animations).toHaveLength(1);

    // Check animation timing (should start at 21.5s - 20s + 1.5s delay)
    const timeComplexityAnimation = (timeComplexityElement as any).animations[0];
    const spaceComplexityAnimation = (spaceComplexityElement as any).animations[0];
    const useCaseAnimation = (useCaseElement as any).animations[0];

    expect(timeComplexityAnimation.startTime).toBe(21.5);
    expect(spaceComplexityAnimation.startTime).toBe(21.5);
    expect(useCaseAnimation.startTime).toBe(21.5);
  });

  test('should add fade-out animations to array elements', () => {
    const dsl = `
      seed 12345
      style auto
      array [1,2,3]
      conclusion "O(n)" "O(1)" "Linear search"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    // Find array elements (rectangles and text elements with groupId)
    const arrayElements = scene.elements.filter((el: any) => 
      el.type === 'rectangle' || (el.type === 'text' && el.groupId)
    );

    expect(arrayElements.length).toBeGreaterThan(0);

    // Check that array elements have fade-out animations
    arrayElements.forEach((element: any) => {
      const fadeOutAnimation = element.animations.find((anim: any) => 
        anim.displayName === 'array-fade-out'
      );
      expect(fadeOutAnimation).toBeDefined();
      expect(fadeOutAnimation.startTime).toBe(20); // Conclusion start time
      expect(fadeOutAnimation.properties.alpha).toBe(0);
    });

    // Check that groups have fade-out animations
    scene.groups.forEach((group: any) => {
      const fadeOutAnimation = group.animations.find((anim: any) => 
        anim.displayName === 'group-fade-out'
      );
      expect(fadeOutAnimation).toBeDefined();
      expect(fadeOutAnimation.startTime).toBe(20);
      expect(fadeOutAnimation.properties.alpha).toBe(0);
    });
  });
});
