import { TimelineBuilder } from '../services/pipeline/dsl/timeline';
import { ElementFactory, resetCanvasGrid } from '../utils/canvas/factory';
import STYLES from '../services/pipeline/procedural/layout/styles';

describe('Timeline System Tests', () => {
  let timelineBuilder: TimelineBuilder;
  let style: any;

  beforeEach(() => {
    timelineBuilder = new TimelineBuilder();
    style = STYLES[0];
    resetCanvasGrid();
  });

  describe('Timeline Builder', () => {
    test('should create content items in correct order', () => {
      timelineBuilder.addHeading();
      timelineBuilder.addList(3);
      timelineBuilder.addCodeblock();
      timelineBuilder.addDemo(2);

      const items = timelineBuilder.getAllContentItems();
      expect(items).toHaveLength(4);
      expect(items[0]?.type).toBe('heading');
      expect(items[1]?.type).toBe('list');
      expect(items[2]?.type).toBe('codeblock');
      expect(items[3]?.type).toBe('demo');
    });

    test('should calculate correct timing for content items', () => {
      timelineBuilder.addHeading();
      timelineBuilder.addList(3);

      const items = timelineBuilder.getAllContentItems();
      const heading = items[0];
      const list = items[1];

      // Heading: 1.0s fade in, 1.8s visible, 1.5s fade out = 4.3s total
      expect(heading?.startTime).toBe(0);
      expect(heading?.fadeInDuration).toBe(1.0);
      expect(heading?.visibleTime).toBe(1.8);
      expect(heading?.fadeOutDuration).toBe(1.5);
      expect(heading?.endTime).toBe(4.3);

      // List should start after heading ends + gap
      expect(list?.startTime).toBe(4.5); // 4.3 + 0.2 gap
      // List fadeInDuration is now calculated based on last item fading in
      // 3 items: item 0 at 4.5, item 1 at 4.5+1.2=5.7, item 2 at 5.7+1.2=6.9
      // Last item ends at 6.9 + 1.2 = 8.1
      // So fadeInDuration should be 8.1 - 4.5 = 3.6
      expect(list?.fadeInDuration).toBeCloseTo(3.6, 1);
      expect(list?.visibleTime).toBe(1.8);
      expect(list?.fadeOutDuration).toBe(1.5);
    });

    test('should create internal animations for list items', () => {
      timelineBuilder.addList(3);

      const items = timelineBuilder.getAllContentItems();
      const list = items[0];
      
      expect(list?.internalAnimations).toHaveLength(3);
      
      // First item should start at list start time
      expect(list?.internalAnimations?.[0]?.id).toBe('list-item-0');
      expect(list?.internalAnimations?.[0]?.startTime).toBe(list?.startTime);
      expect(list?.internalAnimations?.[0]?.fadeInDuration).toBe(1.2);
      
      // Second item should start after first item finishes (no spacing)
      expect(list?.internalAnimations?.[1]?.id).toBe('list-item-1');
      expect(list?.internalAnimations?.[1]?.startTime).toBeCloseTo(list?.startTime! + 1.2, 1);
      
      // Third item should start after second item finishes (no spacing)
      expect(list?.internalAnimations?.[2]?.id).toBe('list-item-2');
      expect(list?.internalAnimations?.[2]?.startTime).toBeCloseTo(list?.startTime! + 2.4, 1);
    });

    test('should create internal animations for demo steps', () => {
      timelineBuilder.addDemo(4);

      const items = timelineBuilder.getAllContentItems();
      const demo = items[0];
      
      expect(demo?.internalAnimations).toHaveLength(4);
      
      // First step should start at demo start time
      expect(demo?.internalAnimations?.[0]?.startTime).toBe(demo?.startTime);
      expect(demo?.internalAnimations?.[0]?.fadeInDuration).toBe(0.5);
      expect(demo?.internalAnimations?.[0]?.visibleTime).toBe(2.0);
      expect(demo?.internalAnimations?.[0]?.fadeOutDuration).toBe(0.5);
      
      // Second step should start after first step completes + spacing
      const firstStepEnd = demo?.startTime! + 0.5 + 2.0 + 0.5;
      expect(demo?.internalAnimations?.[1]?.startTime).toBe(firstStepEnd + 0.1);
    });
  });

  describe('List Animations', () => {
    test('should create list with sequential fade-in animations in timeline', () => {
      timelineBuilder.addList(3);
      
      const listResult = ElementFactory.createList({
        data: ['Item 1', 'Item 2', 'Item 3']
      }, style, 0);

      const listElements = listResult.elements;
      expect(listElements).toHaveLength(3); // 3 items (no title)

      // Check that timeline animations exist for list items
      const allContentItems = timelineBuilder.getAllContentItems();
      const listItem = allContentItems[0];
      
      expect(listItem?.internalAnimations).toHaveLength(3); // 3 items (no title)
      
      // First item should start at list start time
      expect(listItem?.internalAnimations?.[0]?.id).toBe('list-item-0');
      expect(listItem?.internalAnimations?.[0]?.startTime).toBe(listItem?.startTime);
      expect(listItem?.internalAnimations?.[0]?.fadeInDuration).toBe(1.2);
      
      // Second item should start after first item finishes (no spacing)
      expect(listItem?.internalAnimations?.[1]?.id).toBe('list-item-1');
      expect(listItem?.internalAnimations?.[1]?.startTime).toBeCloseTo(listItem?.startTime! + 1.2, 1);
      
      // Third item should start after second item finishes (no spacing)
      expect(listItem?.internalAnimations?.[2]?.id).toBe('list-item-2');
      expect(listItem?.internalAnimations?.[2]?.startTime).toBeCloseTo(listItem?.startTime! + 2.4, 1);
    });

    test('should have same fade-out timing for all list items in timeline', () => {
      timelineBuilder.addList(3);

      // Check that timeline animations exist for content group fade-outs
      const allContentItems = timelineBuilder.getAllContentItems();
      const listItem = allContentItems[0];
      
      // The list content item should have proper timing for fade-out
      expect(listItem?.fadeOutDuration).toBe(1.5);
      expect(listItem?.visibleEnd).toBeDefined();
    });
  });

  describe('Animation Overlap Prevention', () => {
    test('should not have overlapping animations between content items', () => {
      timelineBuilder.addHeading();
      timelineBuilder.addList(2);
      timelineBuilder.addCodeblock();

      const items = timelineBuilder.getAllContentItems();
      const heading = items[0];
      const list = items[1];
      const codeblock = items[2];

      // Heading should end before list starts
      expect(heading?.endTime).toBeLessThanOrEqual(list?.startTime!);
      
      // List should end before codeblock starts
      expect(list?.endTime).toBeLessThanOrEqual(codeblock?.startTime!);
    });

    test('should have proper gaps between content items', () => {
      timelineBuilder.addHeading();
      timelineBuilder.addList(2);

      const items = timelineBuilder.getAllContentItems();
      const heading = items[0];
      const list = items[1];

      // Should have 0.2s gap between content items
      const gap = list?.startTime! - heading?.endTime!;
      expect(gap).toBeCloseTo(0.2, 1);
    });
  });

  describe('Codeblock Tests', () => {
    test('should handle both string and array data formats', () => {
      timelineBuilder.addCodeblock();

      // Test with string data (like in DSL)
      const codeblockString = ElementFactory.createCodeblock({
        data: "function test():\n    return true",
        title: "Test Code"
      }, style);

      expect(codeblockString.groups).toHaveLength(1);
      expect(codeblockString.elements).toHaveLength(3); // title + rectangle + code editor

      // Test with array data
      const codeblockArray = ElementFactory.createCodeblock({
        data: ["function test():", "    return true"],
        title: "Test Code"
      }, style);

      expect(codeblockArray.groups).toHaveLength(1);
      expect(codeblockArray.elements).toHaveLength(3);
    });

    test('should calculate correct codeblock dimensions', () => {
      timelineBuilder.addCodeblock();

      const codeblock = ElementFactory.createCodeblock({
        data: "function test():\n    return true\n    end",
        title: "Test Code"
      }, style);

      const rectangle = codeblock.elements[1]; // Skip title
      const codeEditor = codeblock.elements[2];

      // Rectangle should be larger than code editor (with padding)
      expect(rectangle?.width).toBeGreaterThan(codeEditor?.width!);
      expect(rectangle?.height).toBeGreaterThan(codeEditor?.height!);

      // Code editor should be positioned with padding offset
      expect(codeEditor?.x).toBe(rectangle?.x! + 40);
      expect(codeEditor?.y).toBe(rectangle?.y! + 40);
    });
  });

  describe('Demo Tests', () => {
    test('should create demo with proper caption timing in timeline', () => {
      timelineBuilder.addDemo(3);

      // Check that timeline animations exist for demo steps
      const allContentItems = timelineBuilder.getAllContentItems();
      const demoItem = allContentItems[0];
      
      expect(demoItem?.internalAnimations).toHaveLength(3);
      
      // First step should start at demo start time
      expect(demoItem?.internalAnimations?.[0]?.startTime).toBe(demoItem?.startTime);
      expect(demoItem?.internalAnimations?.[0]?.fadeInDuration).toBe(0.5);
      expect(demoItem?.internalAnimations?.[0]?.visibleTime).toBe(2.0);
      expect(demoItem?.internalAnimations?.[0]?.fadeOutDuration).toBe(0.5);
      
      // Second step should start after first step completes + spacing
      const firstStepEnd = demoItem?.startTime! + 0.5 + 2.0 + 0.5;
      expect(demoItem?.internalAnimations?.[1]?.startTime).toBe(firstStepEnd + 0.1);
    });
  });

  describe('Positioning Tests', () => {
    test('should position elements using grid system', () => {
      timelineBuilder.addHeading();
      timelineBuilder.addList(2);

      const heading = ElementFactory.createHeading({
        text: "Test Heading"
      }, style);

      const listResult = ElementFactory.createList({
        data: ['Item 1', 'Item 2'],
      }, style, 0);

      const listElements = listResult.elements;

      // Elements should be positioned on grid
      expect(heading?.x).toBeDefined();
      expect(heading?.y).toBeDefined();
      expect(listElements[0]?.x).toBeDefined();
      expect(listElements[0]?.y).toBeDefined();
    });

    test('should not have overlapping elements', () => {
      timelineBuilder.addList(3);

      const listResult = ElementFactory.createList({
        data: ['Item 1', 'Item 2', 'Item 3']
      }, style, 0);

      const listElements = listResult.elements;
      expect(listElements).toHaveLength(3); // 3 items (no title)

      const item1 = listElements[0];
      const item2 = listElements[1];
      const item3 = listElements[2];

      // Items should be positioned vertically with spacing
      expect(item1?.y).toBeLessThan(item2?.y!);
      expect(item2?.y).toBeLessThan(item3?.y!);
    });
  });
});
