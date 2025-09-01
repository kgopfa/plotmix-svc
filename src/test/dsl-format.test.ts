import { DslCompiler } from '../services/pipeline/dsl/compiler';
import { execute } from '../services/pipeline/dsl/executor';

describe('New DSL Format', () => {
  test('should parse simplified caption format', () => {
    const dsl = `
seed 12345
style auto
array [1,3,5,7,9]
animate highlight [1,3,5,7,9]
caption 1 "We start with the entire array as our search range."
animate select [5]
caption 2 "The middle element is 5, which we will compare with the target."
animate compare [5,5]
caption 3 "We compare the middle element (5) with the target value (5)."
animate highlight [1,3,5]
caption 4 "Since the target is equal to the middle element, we found the target."
`;

    const program = DslCompiler.compile(dsl);
    
    // Check that captions are parsed correctly
    const captions = program.filter(action => action.kind === 'CAPTION');
    expect(captions).toHaveLength(4);
    
    expect(captions[0]).toEqual({
      kind: 'CAPTION',
      order: 1,
      text: 'We start with the entire array as our search range.'
    });
    
    expect(captions[1]).toEqual({
      kind: 'CAPTION',
      order: 2,
      text: 'The middle element is 5, which we will compare with the target.'
    });
    
    expect(captions[2]).toEqual({
      kind: 'CAPTION',
      order: 3,
      text: 'We compare the middle element (5) with the target value (5).'
    });
    
    expect(captions[3]).toEqual({
      kind: 'CAPTION',
      order: 4,
      text: 'Since the target is equal to the middle element, we found the target.'
    });
  });

  test('should execute with automatic caption timing', () => {
    const dsl = `
seed 12345
style auto
array [1,3,5,7,9]
caption 1 "First caption"
caption 2 "Second caption"
caption 3 "Third caption"
`;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);
    
    // Find caption elements
    const captionElements = scene.elements.filter(el => 
      el.type === 'text' && el.name.startsWith('Caption ')
    );
    
    expect(captionElements).toHaveLength(3);
    
    // Check that timing is calculated correctly
    // Each caption gets: fadeIn (0.5s) + visibleTime (3s) + fadeOut (0.5s) = 4s total
    const caption1 = captionElements.find(el => el.name === 'Caption 1');
    const caption2 = captionElements.find(el => el.name === 'Caption 2');
    const caption3 = captionElements.find(el => el.name === 'Caption 3');
    
    expect(caption1?.animations).toHaveLength(2); // fade-in and fade-out
    expect(caption2?.animations).toHaveLength(2);
    expect(caption3?.animations).toHaveLength(2);
    
    // Check timing for caption 1
    const caption1FadeIn = caption1?.animations.find(a => a.displayName?.includes('fade-in'));
    const caption1FadeOut = caption1?.animations.find(a => a.displayName?.includes('fade-out'));
    
    expect(caption1FadeIn?.startTime).toBe(0);
    expect(caption1FadeIn?.duration).toBe(0.5);
    expect(caption1FadeOut?.startTime).toBe(3.5); // 0.5 + 3
    expect(caption1FadeOut?.duration).toBe(0.5);
    
    // Check timing for caption 2
    const caption2FadeIn = caption2?.animations.find(a => a.displayName?.includes('fade-in'));
    const caption2FadeOut = caption2?.animations.find(a => a.displayName?.includes('fade-out'));
    
    expect(caption2FadeIn?.startTime).toBe(4); // 4s after caption 1 starts
    expect(caption2FadeIn?.duration).toBe(0.5);
    expect(caption2FadeOut?.startTime).toBe(7.5); // 4 + 0.5 + 3
    expect(caption2FadeOut?.duration).toBe(0.5);
    
    // Check timing for caption 3
    const caption3FadeIn = caption3?.animations.find(a => a.displayName?.includes('fade-in'));
    const caption3FadeOut = caption3?.animations.find(a => a.displayName?.includes('fade-out'));
    
    expect(caption3FadeIn?.startTime).toBe(8); // 8s after caption 1 starts
    expect(caption3FadeIn?.duration).toBe(0.5);
    expect(caption3FadeOut?.startTime).toBe(11.5); // 8 + 0.5 + 3
    expect(caption3FadeOut?.duration).toBe(0.5);
  });

  test('should handle animations with captions', () => {
    const dsl = `
seed 12345
style auto
array [1,3,5,7,9]
animate highlight [1,3,5,7,9] 0 5
caption 1 "We start with the entire array as our search range."
animate select [5] 5 5
caption 2 "The middle element is 5, which we will compare with the target."
`;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);
    
    // Check that animations are present
    const arrayElements = scene.elements.filter(el => 
      el.type === 'rectangle' || (el.type === 'text' && el.name.startsWith('Text '))
    );
    
    expect(arrayElements.length).toBeGreaterThan(0);
    
    // Check that captions are present
    const captions = scene.elements.filter(el => 
      el.type === 'text' && el.name.startsWith('Caption ')
    );
    
    expect(captions).toHaveLength(2);
  });

  test('should work with simplified caption format', () => {
    const dsl = `
seed 12345
style auto
array [1,3,5,7,9]
animate highlight [1,3,5,7,9] 0 2
caption 1 "Step 1: We start with the entire array as our search range."
animate focus [5] 2 2
caption 2 "Step 2: The middle element is 5, which we will compare with our target."
`;

    const program = DslCompiler.compile(dsl);
    
    // Check that captions are parsed correctly with simplified format
    const captions = program.filter(action => action.kind === 'CAPTION');
    expect(captions).toHaveLength(2);
    
    expect(captions[0]).toEqual({
      kind: 'CAPTION',
      order: 1,
      text: 'Step 1: We start with the entire array as our search range.'
    });
    
    expect(captions[1]).toEqual({
      kind: 'CAPTION',
      order: 2,
      text: 'Step 2: The middle element is 5, which we will compare with our target.'
    });
    
    // Execute and verify timing
    const scene = execute(program);
    const captionElements = scene.elements.filter(el => 
      el.type === 'text' && el.name.startsWith('Caption ')
    );
    
    expect(captionElements).toHaveLength(2);
    
    // Check that timing is calculated correctly
    const caption1 = captionElements.find(el => el.name === 'Caption 1');
    const caption2 = captionElements.find(el => el.name === 'Caption 2');
    
    expect(caption1?.animations).toHaveLength(2); // fade-in and fade-out
    expect(caption2?.animations).toHaveLength(2); // fade-in and fade-out
    
    // Caption 1: 0s - 4s
    // Caption 2: 4s - 8s
    const caption1FadeIn = caption1?.animations.find(a => a.displayName?.includes('fade-in'));
    const caption1FadeOut = caption1?.animations.find(a => a.displayName?.includes('fade-out'));
    const caption2FadeIn = caption2?.animations.find(a => a.displayName?.includes('fade-in'));
    const caption2FadeOut = caption2?.animations.find(a => a.displayName?.includes('fade-out'));
    
    expect(caption1FadeIn?.startTime).toBe(0);
    expect(caption1FadeOut?.startTime).toBe(3.5);
    expect(caption2FadeIn?.startTime).toBe(4);
    expect(caption2FadeOut?.startTime).toBe(7.5);
  });
});
