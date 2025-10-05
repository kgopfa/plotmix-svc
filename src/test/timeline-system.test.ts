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

      // Heading: 1.0s fade in, 2.0s visible, 1.0s fade out = 4.0s total
      expect(heading?.startTime).toBe(0);
      expect(heading?.fadeInDuration).toBe(1.0);
      expect(heading?.visibleTime).toBe(2.0);
      expect(heading?.fadeOutDuration).toBe(1.0);
      expect(heading?.endTime).toBe(4.0);

      // List should start after heading ends + gap
      expect(list?.startTime).toBe(4.2); // 4.0 + 0.2 gap
      expect(list?.fadeInDuration).toBe(1.0);
      expect(list?.visibleTime).toBe(2.0);
      expect(list?.fadeOutDuration).toBe(1.0);
    });

    test('should create internal animations for list items', () => {
      timelineBuilder.addList(3);

      const items = timelineBuilder.getAllContentItems();
      const list = items[0];
      
      expect(list?.internalAnimations).toHaveLength(3);
      
      // First item should start at list start time
      expect(list?.internalAnimations?.[0]?.startTime).toBe(list?.startTime);
      expect(list?.internalAnimations?.[0]?.fadeInDuration).toBe(1.0);
      
      // Second item should start after first item + spacing
      expect(list?.internalAnimations?.[1]?.startTime).toBe(list?.startTime! + 1.0 + 0.1);
      
      // Third item should start after second item + spacing
      expect(list?.internalAnimations?.[2]?.startTime).toBe(list?.startTime! + 2.0 + 0.2);
    });

    test('should create internal animations for demo steps', () => {
      timelineBuilder.addDemo(4);

      const items = timelineBuilder.getAllContentItems();
      const demo = items[0];
      
      expect(demo?.internalAnimations).toHaveLength(4);
      
      // First step should start at demo start time
      expect(demo?.internalAnimations?.[0]?.startTime).toBe(demo?.startTime);
      expect(demo?.internalAnimations?.[0]?.fadeInDuration).toBe(0.5);
      expect(demo?.internalAnimations?.[0]?.visibleTime).toBe(3.0);
      expect(demo?.internalAnimations?.[0]?.fadeOutDuration).toBe(0.5);
      
      // Second step should start after first step completes + spacing
      const firstStepEnd = demo?.startTime! + 0.5 + 3.0 + 0.5;
      expect(demo?.internalAnimations?.[1]?.startTime).toBe(firstStepEnd + 0.5);
    });
  });

  describe('List Animations', () => {
    test('should create list with sequential fade-in animations', () => {
      timelineBuilder.addList(3);
      
      const listElements = ElementFactory.createList({
        data: ['Item 1', 'Item 2', 'Item 3'],
        title: 'Test List'
      }, style, timelineBuilder, 0);

      expect(listElements).toHaveLength(4); // 1 title + 3 items

      // Check title has content item timing
      const title = listElements[0];
      expect(title?.animations).toHaveLength(2); // fade in + fade out
      expect(title?.animations?.[0]?.type).toBe('fade');
      expect(title?.animations?.[0]?.properties?.alpha).toBe(1);

      // Check list items have sequential timing
      const item1 = listElements[1];
      const item2 = listElements[2];
      const item3 = listElements[3];

      expect(item1?.animations).toHaveLength(2); // fade in + fade out
      expect(item2?.animations).toHaveLength(2);
      expect(item3?.animations).toHaveLength(2);

      // Fade-in times should be sequential
      const item1FadeIn = item1?.animations?.[0]?.startTime;
      const item2FadeIn = item2?.animations?.[0]?.startTime;
      const item3FadeIn = item3?.animations?.[0]?.startTime;

      expect(item2FadeIn).toBeGreaterThan(item1FadeIn!);
      expect(item3FadeIn).toBeGreaterThan(item2FadeIn!);
    });

    test('should have same fade-out timing for all list items', () => {
      timelineBuilder.addList(3);
      
      const listElements = ElementFactory.createList({
        data: ['Item 1', 'Item 2', 'Item 3'],
        title: 'Test List'
      }, style, timelineBuilder, 0);

      const item1 = listElements[1];
      const item2 = listElements[2];
      const item3 = listElements[3];

      // All items should fade out at the same time (content item timing)
      const item1FadeOut = item1?.animations?.[1]?.startTime;
      const item2FadeOut = item2?.animations?.[1]?.startTime;
      const item3FadeOut = item3?.animations?.[1]?.startTime;

      expect(item1FadeOut).toBe(item2FadeOut);
      expect(item2FadeOut).toBe(item3FadeOut);
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
      }, style, timelineBuilder);

      expect(codeblockString.groups).toHaveLength(1);
      expect(codeblockString.elements).toHaveLength(3); // title + rectangle + code editor

      // Test with array data
      const codeblockArray = ElementFactory.createCodeblock({
        data: ["function test():", "    return true"],
        title: "Test Code"
      }, style, timelineBuilder);

      expect(codeblockArray.groups).toHaveLength(1);
      expect(codeblockArray.elements).toHaveLength(3);
    });

    test('should calculate correct codeblock dimensions', () => {
      timelineBuilder.addCodeblock();

      const codeblock = ElementFactory.createCodeblock({
        data: "function test():\n    return true\n    end",
        title: "Test Code"
      }, style, timelineBuilder);

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
    test('should create demo with proper caption timing', () => {
      timelineBuilder.addDemo(3);

      const caption1 = ElementFactory.createCaption({
        text: "Step 1",
        order: 1
      }, style, timelineBuilder);

      const caption2 = ElementFactory.createCaption({
        text: "Step 2", 
        order: 2
      }, style, timelineBuilder);

      expect(caption1?.animations).toHaveLength(2); // fade in + fade out
      expect(caption2?.animations).toHaveLength(2);

      // Captions should have sequential timing
      const caption1FadeIn = caption1?.animations?.[0]?.startTime;
      const caption2FadeIn = caption2?.animations?.[0]?.startTime;

      expect(caption2FadeIn).toBeGreaterThan(caption1FadeIn!);
    });
  });

  describe('Positioning Tests', () => {
    test('should position elements using grid system', () => {
      timelineBuilder.addHeading();
      timelineBuilder.addList(2);

      const heading = ElementFactory.createHeading({
        text: "Test Heading"
      }, style);

      const listElements = ElementFactory.createList({
        data: ['Item 1', 'Item 2'],
        title: 'Test List'
      }, style, timelineBuilder, 0);

      // Elements should be positioned on grid
      expect(heading?.x).toBeDefined();
      expect(heading?.y).toBeDefined();
      expect(listElements[0]?.x).toBeDefined();
      expect(listElements[0]?.y).toBeDefined();
    });

    test('should not have overlapping elements', () => {
      timelineBuilder.addList(3);

      const listElements = ElementFactory.createList({
        data: ['Item 1', 'Item 2', 'Item 3'],
        title: 'Test List'
      }, style, timelineBuilder, 0);

      const title = listElements[0];
      const item1 = listElements[1];
      const item2 = listElements[2];
      const item3 = listElements[3];

      // Items should be positioned vertically with spacing
      expect(item1?.y).toBeLessThan(item2?.y!);
      expect(item2?.y).toBeLessThan(item3?.y!);
      
      // Title should be above items
      expect(title?.y).toBeLessThan(item1?.y!);
    });
  });
});
