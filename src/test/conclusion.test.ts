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
      conclusion 1 "Time Complexity: O(log n)"
      conclusion 2 "Space Complexity: O(1)"
    `;

    const program = DslCompiler.compile(dsl);
    
    expect(program).toHaveLength(7); // 6 original + 2 conclusion actions
    
    const conclusionActions = program.filter(action => action.kind === 'CONCLUSION');
    expect(conclusionActions).toHaveLength(2);
    
    expect(conclusionActions[0]).toEqual({
      kind: 'CONCLUSION',
      order: 1,
      text: 'Time Complexity: O(log n)'
    });
    
    expect(conclusionActions[1]).toEqual({
      kind: 'CONCLUSION',
      order: 2,
      text: 'Space Complexity: O(1)'
    });
  });

  test('should execute conclusion commands and create complexity elements', () => {
    const dsl = `
      seed 12345
      style auto
      heading "Binary Search Algorithm"
      subtitle "Finding target value in sorted array"
      array [1,3,5,7,9]
      conclusion 1 "Time Complexity: O(log n)"
      conclusion 2 "Space Complexity: O(1)"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    // Should have heading, subtitle, array elements, and conclusion elements
    expect(scene.elements.length).toBeGreaterThan(10);

    // Find conclusion elements
    const conclusionElements = scene.elements.filter((el: any) => 
      el.type === 'text' && el.name.startsWith('Conclusion')
    );

    expect(conclusionElements).toHaveLength(2);

    // Check first conclusion element
    const conclusion1 = conclusionElements.find((el: any) => el.name === 'Conclusion 1') as any;
    expect(conclusion1).toBeDefined();
    expect(conclusion1.text).toBe('Time Complexity: O(log n)');
    expect(conclusion1.x).toBe(0); // Center horizontally
    expect(conclusion1.y).toBe(-60); // First conclusion positioned at -60px
    expect(conclusion1.height).toBe(96); // Height for 2 rows
    expect(conclusion1.pivotY).toBe(48); // Center pivot for 2-row text
    expect(conclusion1.animations).toHaveLength(2); // fade-in and fade-out

    // Check second conclusion element
    const conclusion2 = conclusionElements.find((el: any) => el.name === 'Conclusion 2') as any;
    expect(conclusion2).toBeDefined();
    expect(conclusion2.text).toBe('Space Complexity: O(1)');
    expect(conclusion2.x).toBe(0); // Center horizontally
    expect(conclusion2.y).toBe(60); // Second conclusion positioned at 60px (120px spacing)
    expect(conclusion2.height).toBe(96); // Height for 2 rows
    expect(conclusion2.pivotY).toBe(48); // Center pivot for 2-row text
    expect(conclusion2.animations).toHaveLength(2); // fade-in and fade-out

    // Check animation timing (should be grouped by pairs)
    const conclusion1FadeIn = conclusion1.animations.find((anim: any) => anim.displayName === 'conclusion-1-fade-in');
    const conclusion2FadeIn = conclusion2.animations.find((anim: any) => anim.displayName === 'conclusion-2-fade-in');
    
    expect(conclusion1FadeIn).toBeDefined();
    expect(conclusion2FadeIn).toBeDefined();
    expect(conclusion1FadeIn.startTime).toBe(21.5); // First group starts at 21.5s
    expect(conclusion2FadeIn.startTime).toBe(21.5); // Second conclusion in same group also starts at 21.5s
  });

  test('should add fade-out animations to array elements', () => {
    const dsl = `
      seed 12345
      style auto
      array [1,2,3]
      conclusion 1 "Time Complexity: O(n)"
      conclusion 2 "Space Complexity: O(1)"
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
