import { execute } from '../services/pipeline/dsl/executor';
import { DslCompiler } from '../services/pipeline/dsl/compiler';

describe('Text Width Calculation', () => {
  it('should calculate text widths close to manually adjusted values', () => {
    // DSL that generates the same text elements as your reference
    const dsl = `
      seed 12345 style auto
      heading "Binary Search Algorithm"
      subtitle "Finding target value in sorted array"
      caption 1 "Step 1: Highlight the current middle element."
      caption 2 "Step 2: Highlight the new middle element after adjusting search range."
      caption 3 "Step 3: Select the target value found in the array."
      conclusion 1 "Time: O(log n)"
      conclusion 2 "Space: O(1)"
      conclusion 3 "Use Case: Searching in sorted arrays"
    `;

    const program = DslCompiler.compile(dsl);
    const scene = execute(program);

    // Expected values from your reference (with +/- 5px tolerance)
    const expectedValues = {
      heading: {
        text: "Binary Search Algorithm",
        width: 737.55, // +/- 5px tolerance
        pivotX: 531.3
      },
      subtitle: {
        text: "Finding target value in sorted array", 
        width: 580.76, // +/- 5px tolerance
        pivotX: 498.96
      },
      caption1: {
        text: "Step 1: Highlight the current middle element.",
        width: 1386, // +/- 5px tolerance
        pivotX: 693
      },
      caption2: {
        text: "Step 2: Highlight the new middle element after adjusting search range.",
        width: 2156, // +/- 5px tolerance
        pivotX: 1078
      },
      caption3: {
        text: "Step 3: Select the target value found in the array.",
        width: 1570.8, // +/- 5px tolerance
        pivotX: 785.4
      },
      timeComplexity: {
        text: "Time: O(log n)",
        width: 260.49, // +/- 5px tolerance
        pivotX: 196
      },
      spaceComplexity: {
        text: "Space: O(1)",
        width: 216.42, // +/- 5px tolerance
        pivotX: 154
      },
      useCase: {
        text: "Use Case: Searching in sorted arrays",
        width: 644.29, // +/- 5px tolerance
        pivotX: 504
      }
    };

    // Find elements by name
    const heading = scene.elements.find(el => el.name === 'Heading') as any;
    const subtitle = scene.elements.find(el => el.name === 'Subtitle') as any;
    const caption1 = scene.elements.find(el => el.name === 'Caption 1') as any;
    const caption2 = scene.elements.find(el => el.name === 'Caption 2') as any;
    const caption3 = scene.elements.find(el => el.name === 'Caption 3') as any;
    const timeComplexity = scene.elements.find(el => el.name === 'Conclusion 1') as any;
    const spaceComplexity = scene.elements.find(el => el.name === 'Conclusion 2') as any;
    const useCase = scene.elements.find(el => el.name === 'Conclusion 3') as any;



    // Verify heading
    expect(heading).toBeDefined();
    expect(heading.text).toBe(expectedValues.heading.text);
    expect(heading.width).toBeCloseTo(expectedValues.heading.width, -1); // Within 5px
    expect(heading.pivotX).toBeCloseTo(expectedValues.heading.pivotX, -1); // Within 5px

    // Verify subtitle
    expect(subtitle).toBeDefined();
    expect(subtitle.text).toBe(expectedValues.subtitle.text);
    expect(subtitle.width).toBeCloseTo(expectedValues.subtitle.width, -1); // Within 5px
    expect(subtitle.pivotX).toBeCloseTo(expectedValues.subtitle.pivotX, -1); // Within 5px

    // Verify captions (now using dynamic width, max 700px)
    expect(caption1).toBeDefined();
    expect(caption1.text).toBe(expectedValues.caption1.text);
    expect(caption1.width).toBeLessThanOrEqual(700); // Dynamic width, max 700px
    expect(caption1.pivotX).toBe(caption1.width / 2); // Dynamic pivotX (width/2)

    expect(caption2).toBeDefined();
    expect(caption2.text).toBe(expectedValues.caption2.text);
    expect(caption2.width).toBeLessThanOrEqual(700); // Dynamic width, max 700px
    expect(caption2.pivotX).toBe(caption2.width / 2); // Dynamic pivotX (width/2)

    expect(caption3).toBeDefined();
    expect(caption3.text).toBe(expectedValues.caption3.text);
    expect(caption3.width).toBeLessThanOrEqual(700); // Dynamic width, max 700px
    expect(caption3.pivotX).toBe(caption3.width / 2); // Dynamic pivotX (width/2)

    // Verify conclusion elements (now using dynamic width, max 1200px)
    expect(timeComplexity).toBeDefined();
    expect(timeComplexity.text).toBe(expectedValues.timeComplexity.text);
    expect(timeComplexity.width).toBeLessThanOrEqual(1200); // Dynamic width, max 1200px
    expect(timeComplexity.pivotX).toBe(timeComplexity.width / 2); // Dynamic pivotX (width/2)
    expect(timeComplexity.fontWeight).toBe("normal"); // Should be normal weight, not bold

    expect(spaceComplexity).toBeDefined();
    expect(spaceComplexity.text).toBe(expectedValues.spaceComplexity.text);
    expect(spaceComplexity.width).toBeLessThanOrEqual(1200); // Dynamic width, max 1200px
    expect(spaceComplexity.pivotX).toBe(spaceComplexity.width / 2); // Dynamic pivotX (width/2)
    expect(spaceComplexity.fontWeight).toBe("normal"); // Should be normal weight, not bold

    expect(useCase).toBeDefined();
    expect(useCase.text).toBe(expectedValues.useCase.text);
    expect(useCase.width).toBeLessThanOrEqual(1200); // Dynamic width, max 1200px
    expect(useCase.pivotX).toBe(useCase.width / 2); // Dynamic pivotX (width/2)
    expect(useCase.fontWeight).toBe("normal"); // Should be normal weight, not bold


  });
});
