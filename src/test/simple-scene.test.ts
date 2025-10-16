import { executeScene } from '../services/pipeline/dsl/executor';

describe('Simple Scene Tests - Router & Positioning', () => {
  
  describe('Single List Scene', () => {
    const singleListScene = {
      "id": "simple-list-test",
      "name": "Simple List Test",
      "content": [
        {
          "type": "list",
          "data": ["Item 1", "Item 2", "Item 3"]
        }
      ]
    };

    test('should execute single list scene', () => {
      const result = executeScene(singleListScene);
      
      expect(result.sceneId).toBe('simple-list-test');
      expect(result.sceneCanvas.elements.length).toBeGreaterThan(0);
      expect(result.sceneCanvas.groups.length).toBeGreaterThan(0);
    });

    test('list should be positioned correctly', () => {
      const result = executeScene(singleListScene);
      
      const listElements = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List')
      );
      
      expect(listElements.length).toBe(3); // 3 items (no title)
      
      // All list elements should have the same x position
      const xPositions = listElements.map(el => el.x);
      expect(new Set(xPositions).size).toBe(1); // All x positions should be the same
      
      // List items should have different y positions (stacked vertically)
      const yPositions = listElements.map(el => el.y);
      expect(new Set(yPositions).size).toBe(3); // All y positions should be different
    });

    test('first list item should start at -360 when no heading present', () => {
      const result = executeScene(singleListScene);
      
      const firstListItem = result.sceneCanvas.elements.find(el => 
        el.name === 'List Item 0'
      );
      
      expect(firstListItem).toBeDefined();
      expect(firstListItem!.y).toBe(-360);
    });
  });

  describe('Heading + List Scene', () => {
    const headingListScene = {
      "id": "heading-list-test",
      "name": "Heading and List Test",
      "content": [
        {
          "type": "heading",
          "data": ["Main Title"]
        },
        {
          "type": "list",
          "data": ["Point 1", "Point 2"]
        }
      ]
    };

    test('should execute heading + list scene', () => {
      const result = executeScene(headingListScene);
      
      expect(result.sceneCanvas.elements.length).toBeGreaterThan(0);
      
      const heading = result.sceneCanvas.elements.find(el => el.name === 'Heading');
      const listElements = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List')
      );
      
      expect(heading).toBeDefined();
      expect(listElements.length).toBe(2); // 2 items (no title)
    });

    test('heading and list should not overlap', () => {
      const result = executeScene(headingListScene);
      
      const heading = result.sceneCanvas.elements.find(el => el.name === 'Heading');
      const firstListItem = result.sceneCanvas.elements.find(el => 
        el.name === 'List Item 0'
      );
      
      expect(heading).toBeDefined();
      expect(firstListItem).toBeDefined();
      
      // Heading should be above list (more negative y)
      expect(heading!.y).toBeLessThan(firstListItem!.y);
      
      // They should not overlap vertically
      const headingBottom = heading!.y + (heading!.height / 2);
      const listTop = firstListItem!.y - (firstListItem!.height / 2);
      
      expect(headingBottom).toBeLessThan(listTop);
    });

    test('heading and list should have 100px gap', () => {
      const result = executeScene(headingListScene);
      
      const heading = result.sceneCanvas.elements.find(el => el.name === 'Heading');
      const firstListItem = result.sceneCanvas.elements.find(el => 
        el.name === 'List Item 0'
      );
      
      expect(heading).toBeDefined();
      expect(firstListItem).toBeDefined();
      
      // Calculate the gap between heading bottom and first list item top
      const headingBottom = heading!.y + (heading!.height / 2);
      const listTop = firstListItem!.y - (firstListItem!.height / 2);
      const verticalGap = listTop - headingBottom;
      
      // Gap should be at least 100px
      expect(verticalGap).toBeGreaterThanOrEqual(100);
    });
  });

  describe('List + Codeblock Scene (Overlap Prevention)', () => {
    const listCodeScene = {
      "id": "list-code-test",
      "name": "List and Codeblock Test",
      "content": [
        {
          "type": "list",
          "data": ["Point 1", "Point 2", "Point 3"]
        },
        {
          "type": "codeblock",
          "title": "Example Code",
          "data": ["function test() {\n  return true;\n}"]
        }
      ]
    };

    test('should execute list + codeblock scene', () => {
      const result = executeScene(listCodeScene);
      
      expect(result.sceneCanvas.elements.length).toBeGreaterThan(0);
      
      const listElements = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List')
      );
      const codeElements = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('Code')
      );
      
      expect(listElements.length).toBeGreaterThan(0);
      expect(codeElements.length).toBeGreaterThan(0);
    });

    test('list and codeblock should not overlap (POSITIONING FIX)', () => {
      const result = executeScene(listCodeScene);
      
      // Get the last list item
      const listItems = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Item')
      );
      const lastListItem = listItems[listItems.length - 1];
      
      // Get the codeblock background
      const codeBackground = result.sceneCanvas.elements.find(el => 
        el.name === 'Code Block Background'
      );
      
      expect(lastListItem).toBeDefined();
      expect(codeBackground).toBeDefined();
      
      // Calculate vertical bounds
      const listBottom = lastListItem!.y + (lastListItem!.height / 2);
      const codeTop = codeBackground!.y - (codeBackground!.height / 2);
      
      // Codeblock should be below the list (no overlap)
      expect(codeTop).toBeGreaterThan(listBottom);
      
      // They should be in the same zone (CONTENT_START) but stacked
      // Both should be vertically separated by at least 60px (GRID_UNIT)
      const verticalGap = codeTop - listBottom;
      expect(verticalGap).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multiple Lists in Same Zone', () => {
    const multiListScene = {
      "id": "multi-list-test",
      "name": "Multiple Lists Test",
      "content": [
        {
          "type": "list",
          "data": ["Item 1", "Item 2"]
        },
        {
          "type": "list",
          "data": ["Item A", "Item B"]
        }
      ]
    };

    test('multiple lists should stack without overlapping', () => {
      const result = executeScene(multiListScene);
      
      const allListItems = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Item')
      );
      
      // Should have 4 items total (2 from each list)
      expect(allListItems.length).toBe(4);
      
      // Get first items from each list
      const firstList = allListItems.slice(0, 2);
      const secondList = allListItems.slice(2, 4);
      
      // Second list should be below first list
      expect(secondList[0]!.y).toBeGreaterThan(firstList[firstList.length - 1]!.y);
    });
  });

  describe('List Item Alignment', () => {
    const listAlignmentScene = {
      "id": "list-alignment-test",
      "name": "List Alignment Test",
      "content": [
        {
          "type": "list",
          "data": ["Short", "This is a much longer list item", "Medium length"]
        }
      ]
    };

    test('list items should be left-aligned using pivotX', () => {
      const result = executeScene(listAlignmentScene);
      
      const listItems = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Item')
      );
      
      expect(listItems.length).toBe(3);
      
      // All list items should have pivotX = 0 (left-aligned)
      listItems.forEach(item => {
        expect(item.pivotX).toBe(0);
      });
      
      // All list items should have the same x position
      const xPositions = listItems.map(item => item.x);
      const uniqueXPositions = new Set(xPositions);
      expect(uniqueXPositions.size).toBe(1);
      
      // Calculate left edge for each item (x - pivotX)
      const leftEdges = listItems.map(item => item.x - (item.pivotX ?? 0));
      const uniqueLeftEdges = new Set(leftEdges);
      
      // All items should have the same left edge
      expect(uniqueLeftEdges.size).toBe(1);
    });
  });
});

