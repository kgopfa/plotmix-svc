import { PromptTemplates } from '../services/pipeline/llm/prompts';
import { DslCompiler } from '../services/pipeline/dsl/compiler';
import { execute } from '../services/pipeline/dsl/executor';

describe('Full Integration Test', () => {
  test('should process binary search example end-to-end', async () => {
    // Simulate the scene plan and animation plan that would come from LLM
    const scenePlan = {
      seed: 12345,
      style: "auto",
      sections: [
        {
          id: "binary-search",
          title: "Binary Search Algorithm",
          arrays: [
            {
              values: [1, 3, 5, 7, 9],
              purpose: "input example"
            }
          ]
        }
      ]
    };

    const animationPlan = {
      algorithm: "binary search",
      steps: [
        {
          id: "step-1",
          description: "Highlight entire array",
          targetElements: [1, 3, 5, 7, 9],
          animationType: "highlight",
          startTime: 0,
          duration: 2,
          explanation: "We start with the entire array as our search range."
        },
        {
          id: "step-2", 
          description: "Focus on middle element",
          targetElements: [5],
          animationType: "focus",
          startTime: 2,
          duration: 2,
          explanation: "The middle element is 5, which we will compare with our target."
        },
        {
          id: "step-3",
          description: "Compare elements",
          targetElements: [5, 5],
          animationType: "compare", 
          startTime: 4,
          duration: 2,
          explanation: "We compare the middle element (5) with the target value (5)."
        },
        {
          id: "step-4",
          description: "Highlight result",
          targetElements: [1, 3, 5],
          animationType: "highlight",
          startTime: 6,
          duration: 2,
          explanation: "Since the target is equal to the middle element, we found the target."
        }
      ],
      timing: {
        totalDuration: 8,
        stepDuration: 2
      }
    };

    // Generate DSL using the prompt template
    const messages = PromptTemplates.dslEmitter(scenePlan, animationPlan);
    const systemPrompt = messages[0]?.content;
    const userPrompt = messages[1]?.content;

    console.log('System Prompt:', systemPrompt);
    console.log('User Prompt:', userPrompt);

    // Simulate LLM response with the new simplified format
    const simulatedLlmResponse = `\`\`\`dsl
seed 12345
style auto
array [1,3,5,7,9]
animate highlight [1,3,5,7,9] 0 2
caption 1 "We start with the entire array as our search range."
animate focus [5] 2 2
caption 2 "The middle element is 5, which we will compare with our target."
animate compare [5,5] 4 2
caption 3 "We compare the middle element (5) with the target value (5)."
animate highlight [1,3,5] 6 2
caption 4 "Since the target is equal to the middle element, we found the target."
\`\`\``;

    console.log('Simulated LLM Response:', simulatedLlmResponse);

    // Parse the DSL
    const program = DslCompiler.compile(simulatedLlmResponse);
    
    console.log('Parsed Program:', JSON.stringify(program, null, 2));

    // Execute the program to get final UI elements
    const scene = execute(program);
    
    console.log('Final Scene:', JSON.stringify(scene, null, 2));

    // Verify the results
    expect(program).toBeDefined();
    expect(program.length).toBeGreaterThan(0);

    // Check that we have the expected actions
    const setupActions = program.filter(action => action.kind === 'SETUP');
    const arrayActions = program.filter(action => action.kind === 'DRAW_ARRAY');
    const animateActions = program.filter(action => action.kind === 'ANIMATE');
    const captionActions = program.filter(action => action.kind === 'CAPTION');

    expect(setupActions).toHaveLength(2); // There are 2 setup actions due to parsing
    expect(arrayActions).toHaveLength(1);
    expect(animateActions).toHaveLength(4);
    expect(captionActions).toHaveLength(4);

    // Verify setup
    expect(setupActions[0]).toEqual({
      kind: 'SETUP',
      seed: 12345,
      style: 'auto'
    });

    // Verify array
    expect(arrayActions[0]).toEqual({
      kind: 'DRAW_ARRAY',
      values: [1, 3, 5, 7, 9]
    });

    // Verify animations
    expect(animateActions[0]).toEqual({
      kind: 'ANIMATE',
      type: 'highlight',
      elements: [1, 3, 5, 7, 9],
      startTime: 0,
      duration: 2
    });

    expect(animateActions[1]).toEqual({
      kind: 'ANIMATE',
      type: 'focus',
      elements: [5],
      startTime: 2,
      duration: 2
    });

    expect(animateActions[2]).toEqual({
      kind: 'ANIMATE',
      type: 'compare',
      elements: [5, 5],
      startTime: 4,
      duration: 2
    });

    expect(animateActions[3]).toEqual({
      kind: 'ANIMATE',
      type: 'highlight',
      elements: [1, 3, 5],
      startTime: 6,
      duration: 2
    });

    // Verify captions (simplified format)
    expect(captionActions[0]).toEqual({
      kind: 'CAPTION',
      order: 1,
      text: 'We start with the entire array as our search range.'
    });

    expect(captionActions[1]).toEqual({
      kind: 'CAPTION',
      order: 2,
      text: 'The middle element is 5, which we will compare with our target.'
    });

    expect(captionActions[2]).toEqual({
      kind: 'CAPTION',
      order: 3,
      text: 'We compare the middle element (5) with the target value (5).'
    });

    expect(captionActions[3]).toEqual({
      kind: 'CAPTION',
      order: 4,
      text: 'Since the target is equal to the middle element, we found the target.'
    });

    // Verify final scene structure
    expect(scene).toBeDefined();
    expect(scene.groups).toBeDefined();
    expect(scene.elements).toBeDefined();
    expect(scene.timeline).toBeDefined();

    // Check that we have the expected UI elements
    const arrayElements = scene.elements.filter(el => 
      el.type === 'rectangle' || (el.type === 'text' && el.name.startsWith('Text '))
    );
    const captionElements = scene.elements.filter(el => 
      el.type === 'text' && el.name.startsWith('Caption ')
    );

    // Should have 5 array elements (1 rectangle + 1 text per array value)
    expect(arrayElements).toHaveLength(10); // 5 rectangles + 5 text elements
    expect(captionElements).toHaveLength(4); // 4 captions

    // Verify caption timing
    const caption1 = captionElements.find(el => el.name === 'Caption 1');
    const caption2 = captionElements.find(el => el.name === 'Caption 2');
    const caption3 = captionElements.find(el => el.name === 'Caption 3');
    const caption4 = captionElements.find(el => el.name === 'Caption 4');

    expect(caption1?.animations).toHaveLength(2); // fade-in and fade-out
    expect(caption2?.animations).toHaveLength(2);
    expect(caption3?.animations).toHaveLength(2);
    expect(caption4?.animations).toHaveLength(2);

    // Check timing: each caption gets 4 seconds (0.5s fade-in + 3s visible + 0.5s fade-out)
    const caption1FadeIn = caption1?.animations.find(a => a.displayName?.includes('fade-in'));
    const caption1FadeOut = caption1?.animations.find(a => a.displayName?.includes('fade-out'));
    const caption2FadeIn = caption2?.animations.find(a => a.displayName?.includes('fade-in'));
    const caption2FadeOut = caption2?.animations.find(a => a.displayName?.includes('fade-out'));

    expect(caption1FadeIn?.startTime).toBe(0);
    expect(caption1FadeOut?.startTime).toBe(3.5);
    expect(caption2FadeIn?.startTime).toBe(4);
    expect(caption2FadeOut?.startTime).toBe(7.5);

    // Verify array animations are present
    const arrayAnimations = arrayElements.flatMap(el => el.animations);
    expect(arrayAnimations.length).toBeGreaterThan(0);

    console.log('Integration test completed successfully!');
    console.log('Final scene contains:');
    console.log('- Groups:', scene.groups.length);
    console.log('- Elements:', scene.elements.length);
    console.log('- Array elements:', arrayElements.length);
    console.log('- Caption elements:', captionElements.length);
    console.log('- Total animations:', scene.elements.flatMap(el => el.animations).length);
  });
});
