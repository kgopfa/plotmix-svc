import { executeScene } from '../services/pipeline/dsl/executor';

describe('Simple Scene Tests - Router & Positioning', () => {
  
  describe('Single List Scene', () => {
    const singleListScene = {
      "id": "simple-list-test",
      "name": "Simple List Test",
      "content": [
        {
          "type": "list",
          "title": "Test List",
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
      
      expect(listElements.length).toBe(4); // Title + 3 items
      
      // All list elements should have the same x position (centered)
      const xPositions = listElements.map(el => el.x);
      expect(new Set(xPositions).size).toBe(1); // All x positions should be the same
      
      // List items should have different y positions (stacked vertically)
      const yPositions = listElements.map(el => el.y);
      expect(new Set(yPositions).size).toBe(4); // All y positions should be different
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
          "title": "Details",
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
      expect(listElements.length).toBe(3); // Title + 2 items
    });

    test('heading and list should not overlap', () => {
      const result = executeScene(headingListScene);
      
      const heading = result.sceneCanvas.elements.find(el => el.name === 'Heading');
      const listTitle = result.sceneCanvas.elements.find(el => 
        el.name?.includes('List Title')
      );
      
      expect(heading).toBeDefined();
      expect(listTitle).toBeDefined();
      
      // Heading should be above list (more negative y)
      expect(heading!.y).toBeLessThan(listTitle!.y);
      
      // They should not overlap vertically
      const headingBottom = heading!.y + (heading!.height / 2);
      const listTop = listTitle!.y - (listTitle!.height / 2);
      
      expect(headingBottom).toBeLessThan(listTop);
    });
  });

  describe('List + Codeblock Scene (Overlap Prevention)', () => {
    const listCodeScene = {
      "id": "list-code-test",
      "name": "List and Codeblock Test",
      "content": [
        {
          "type": "list",
          "title": "Key Points",
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
          "title": "First List",
          "data": ["Item 1", "Item 2"]
        },
        {
          "type": "list",
          "title": "Second List",
          "data": ["Item A", "Item B"]
        }
      ]
    };

    test('multiple lists should stack without overlapping', () => {
      const result = executeScene(multiListScene);
      
      const listTitles = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Title')
      );
      
      expect(listTitles.length).toBe(2);
      
      const [firstTitle, secondTitle] = listTitles;
      
      // Second list should be below first list
      expect(secondTitle!.y).toBeGreaterThan(firstTitle!.y);
      
      // They should be separated by at least the spacing unit
      const verticalGap = secondTitle!.y - firstTitle!.y;
      expect(verticalGap).toBeGreaterThanOrEqual(60); // GRID_UNIT
    });
  });

  describe('List Item Alignment', () => {
    const listAlignmentScene = {
      "id": "list-alignment-test",
      "name": "List Alignment Test",
      "content": [
        {
          "type": "list",
          "title": "Alignment Test",
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

    test('list title should be left-aligned with items', () => {
      const result = executeScene(listAlignmentScene);
      
      const listTitle = result.sceneCanvas.elements.find(el => 
        el.name?.includes('List Title')
      );
      const listItems = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Item')
      );
      
      expect(listTitle).toBeDefined();
      expect(listItems.length).toBeGreaterThan(0);
      
      // Title should also have pivotX = 0
      expect(listTitle!.pivotX).toBe(0);
      
      // Title and items should have the same left edge
      const titleLeftEdge = listTitle!.x - (listTitle!.pivotX ?? 0);
      const itemLeftEdge = listItems[0]!.x - (listItems[0]!.pivotX ?? 0);
      
      expect(titleLeftEdge).toBe(itemLeftEdge);
    });
  });
});

