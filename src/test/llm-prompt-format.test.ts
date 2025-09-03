import { DslCompiler } from '../services/pipeline/dsl/compiler';
import { execute } from '../services/pipeline/dsl/executor';

describe('LLM Prompt Format Validation', () => {
  test('should generate correct DSL format with improved captions and ordered conclusions', () => {
    // This is what the LLM should generate with the updated prompt
    const expectedDsl = `
      seed 12345
      style auto
      heading "Binary Search Algorithm"
      subtitle "Finding target value in sorted array"
      array [1,3,5,7,9]
      animate highlight [1,3,5,7,9] 0 5
      caption 1 "Compare middle element with target to determine search direction"
      animate select [5] 5 5
      caption 2 "If target equals middle, we found our answer"
      animate compare [5,3] 10 5
      caption 3 "If target is less than middle, search the left half"
      animate highlight [1,3] 15 5
      caption 4 "Continue searching in the narrowed range"
      conclusion 1 "Time Complexity: O(log n)"
      conclusion 2 "Space Complexity: O(1)"
      conclusion 3 "Use Case: Searching in sorted arrays"
    `;

    const program = DslCompiler.compile(expectedDsl);
    const scene = execute(program);

    // Verify the program was parsed correctly
    expect(program).toHaveLength(16); // 2 setup + 1 heading + 1 subtitle + 1 array + 4 animate + 4 captions + 3 conclusions
    
    // Check that we have the right action types
    const captionActions = program.filter(action => action.kind === 'CAPTION');
    const conclusionActions = program.filter(action => action.kind === 'CONCLUSION');
    
    expect(captionActions).toHaveLength(4);
    expect(conclusionActions).toHaveLength(3);
    
    // Verify caption content is algorithmic (not just "highlight x")
    expect(captionActions[0]?.text).toContain('Compare middle element');
    expect(captionActions[1]?.text).toContain('If target equals');
    expect(captionActions[2]?.text).toContain('If target is less');
    expect(captionActions[3]?.text).toContain('Continue searching');
    
    // Verify conclusion format is explicit
    expect(conclusionActions[0]?.text).toBe('Time Complexity: O(log n)');
    expect(conclusionActions[1]?.text).toBe('Space Complexity: O(1)');
    expect(conclusionActions[2]?.text).toBe('Use Case: Searching in sorted arrays');
    
    // Verify conclusion orders
    expect(conclusionActions[0]?.order).toBe(1);
    expect(conclusionActions[1]?.order).toBe(2);
    expect(conclusionActions[2]?.order).toBe(3);
    
    // Verify scene has the expected elements
    expect(scene.elements.length).toBeGreaterThan(10);
    
    // Check that conclusion elements exist with correct names
    const conclusionElements = scene.elements.filter((el: any) => 
      el.type === 'text' && el.name.startsWith('Conclusion')
    );
    expect(conclusionElements).toHaveLength(3);
    
    // Verify conclusion elements have correct text
    const conclusion1 = conclusionElements.find((el: any) => el.name === 'Conclusion 1') as any;
    const conclusion2 = conclusionElements.find((el: any) => el.name === 'Conclusion 2') as any;
    const conclusion3 = conclusionElements.find((el: any) => el.name === 'Conclusion 3') as any;
    
    expect(conclusion1).toBeDefined();
    expect(conclusion2).toBeDefined();
    expect(conclusion3).toBeDefined();
    expect(conclusion1.text).toBe('Time Complexity: O(log n)');
    expect(conclusion2.text).toBe('Space Complexity: O(1)');
    expect(conclusion3.text).toBe('Use Case: Searching in sorted arrays');
    
    // Verify vertical positioning - conclusions appear one under the other, then next group appears in same positions
    expect(conclusion1.y).toBe(-60); // First conclusion at -60px (top position)
    expect(conclusion2.y).toBe(60);  // Second conclusion at 60px (bottom position)
    expect(conclusion3.y).toBe(-60); // Third conclusion at -60px (top position again)
    
    // Verify conclusion timing (should start after all 4 captions finish)
    // With 4 captions: conclusionStartTime = 1.5 + (4 * 4) - 0.5 = 17.0s
    // First group starts at 17.0 + 1.5 = 18.5s
    const conclusion1FadeIn = conclusion1.animations.find((anim: any) => anim.displayName === 'conclusion-1-fade-in');
    const conclusion2FadeIn = conclusion2.animations.find((anim: any) => anim.displayName === 'conclusion-2-fade-in');
    const conclusion3FadeIn = conclusion3.animations.find((anim: any) => anim.displayName === 'conclusion-3-fade-in');
    
    expect(conclusion1FadeIn).toBeDefined();
    expect(conclusion2FadeIn).toBeDefined();
    expect(conclusion3FadeIn).toBeDefined();
    expect(conclusion1FadeIn.startTime).toBe(18.5); // First group starts at 18.5s
    expect(conclusion2FadeIn.startTime).toBe(18.5); // Second conclusion in same group
    expect(conclusion3FadeIn.startTime).toBe(22.5); // Third conclusion in next group (18.5 + 4.0)
  });

  test('should reject old conclusion format', () => {
    const oldFormatDsl = `seed 12345
style auto
array [1,2,3]
conclusion "O(log n)" "O(1)" "Searching in sorted arrays"`;

    // The old format should not parse correctly - it should either throw or not produce conclusion actions
    let result;
    try {
      result = DslCompiler.compile(oldFormatDsl);
    } catch (e: any) {
      // If it throws, that's expected
      expect(e.message).toContain('Unknown DSL command');
      return;
    }
    
    // If it doesn't throw, it should not produce any conclusion actions
    const conclusionActions = result.filter(action => action.kind === 'CONCLUSION');
    expect(conclusionActions).toHaveLength(0);
  });
});
