import { executeScene } from '../services/pipeline/dsl/executor';

describe('DSL Execution Tests', () => {

  describe('Scene 1: Search in Rotated Sorted Array', () => {
    const scene1 = {
      "id": "intro-rotated-array-search",
      "name": "Search in Rotated Sorted Array",
      "content": [
        {
          "type": "heading",
          "data": ["Search in Rotated Sorted Array"]
        },
        {
          "type": "list", 
          "title": "How It Works",
          "data": [
            "Find a target element in a sorted array that has been rotated",
            "Efficiently search by eliminating half the search space in each iteration",
            "Leverage the partially sorted nature of the rotated array"
          ]
        },
        {
          "type": "list",
          "title": "Step-by-Step Approach", 
          "data": [
            "Initialize search boundaries with left and right pointers",
            "Compute midpoint and identify which half remains sorted",
            "Determine if target exists in the sorted half",
            "Recursively narrow down search space"
          ]
        }
      ]
    };

    test('should execute scene 1 correctly', () => {
      const result = executeScene(scene1);

      expect(result.sceneId).toBe('intro-rotated-array-search');
      expect(result.sceneName).toBe('Search in Rotated Sorted Array');
      expect(result.sceneCanvas.elements).toHaveLength(10); // 1 heading + 2 titles + 7 list items
      expect(result.sceneCanvas.groups).toHaveLength(2); // 2 content groups for lists
    });

    test('should have correct timeline duration', () => {
      const result = executeScene(scene1);
      
      // Heading: 4.0s, List 1: 4.0s, List 2: 4.0s = 13.9s total (with gaps and 1.5s fade-out)
      expect(result.sceneCanvas.timeline.duration).toBeCloseTo(13.9, 1);
    });

    test('should have list titles with fade-in animations', () => {
      const result = executeScene(scene1);
      
      const titles = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Title')
      );
      
      expect(titles).toHaveLength(2);
      
      // Both titles should have fade-in animations (fade-out handled by group)
      titles.forEach(title => {
        expect(title.animations).toHaveLength(1); // Only fade-in animation
        
        // Check fade-in animation
        const fadeInAnimation = title.animations?.[0];
        expect(fadeInAnimation?.type).toBe('fade');
        expect((fadeInAnimation?.properties as any)?.alpha).toBe(1); // Fade to visible
        expect(fadeInAnimation?.duration).toBe(1.0); // 1 second fade in
        expect(fadeInAnimation?.easing).toBe('power1.inOut');
      });
      
      // Check that titles have different timing (different lists)
      const title1FadeIn = titles[0]?.animations?.[0]?.startTime;
      const title2FadeIn = titles[1]?.animations?.[0]?.startTime;
      
      expect(title2FadeIn).toBeGreaterThan(title1FadeIn!);
    });

    test('should have list items with sequential animations', () => {
      const result = executeScene(scene1);
      
      const listItems = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Item')
      );
      
      expect(listItems).toHaveLength(7); // 3 + 4 items
      
      // All list items should have fade-in animations (fade-out handled by group)
      listItems.forEach(item => {
        expect(item.animations).toHaveLength(1); // Only fade-in animation
        
        // Check fade-in animation properties
        const fadeInAnimation = item.animations?.[0];
        expect(fadeInAnimation?.type).toBe('fade');
        expect((fadeInAnimation?.properties as any)?.alpha).toBe(1); // Fade to visible
        expect(fadeInAnimation?.duration).toBe(1.0); // 1 second fade in
        expect(fadeInAnimation?.easing).toBe('power1.inOut');
      });

      // Check sequential timing for first list
      const firstListItems = listItems.slice(0, 3);
      const fadeInTimes = firstListItems.map(item => item.animations?.[0]?.startTime);
      
      for (let i = 1; i < fadeInTimes.length; i++) {
        expect(fadeInTimes[i]).toBeGreaterThan(fadeInTimes[i - 1]!);
      }
      
      // Verify stagger delay between items (should be 0.1s)
      for (let i = 1; i < fadeInTimes.length; i++) {
        const timeDiff = fadeInTimes[i]! - fadeInTimes[i - 1]!;
        expect(timeDiff).toBeCloseTo(1.1, 1); // 1.0s fade duration + 0.1s stagger delay
      }
    });

    test('should have content item groups with fade-out animations', () => {
      const result = executeScene(scene1);
      
      // Check that we have content item groups
      const contentGroups = result.sceneCanvas.groups.filter(group => 
        group.name?.includes('List Content Item')
      );
      
      expect(contentGroups).toHaveLength(2); // Two lists in scene 1
      
      // Each content group should have a fade-out animation
      contentGroups.forEach(group => {
        expect(group.animations).toHaveLength(1); // Only fade-out animation
        
        const fadeOutAnimation = group.animations[0];
        expect(fadeOutAnimation?.type).toBe('fade');
        expect((fadeOutAnimation?.properties as any)?.alpha).toBe(0); // Fade to invisible
        expect(fadeOutAnimation?.duration).toBe(1.5); // 1.5 second fade out
        expect(fadeOutAnimation?.easing).toBe('power1.inOut');
        expect(fadeOutAnimation?.displayName).toBe('list-content-fade-out');
      });
      
      // Verify that list elements are grouped properly
      const listElements = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Title') || el.name?.includes('List Item')
      );
      
      // All list elements should have the same groupId as their content group
      listElements.forEach(element => {
        const contentGroup = contentGroups.find(group => 
          group.elementIds.includes(element.id)
        );
        expect(contentGroup).toBeDefined();
        expect(element.groupId).toBe(contentGroup?.id);
      });
    });
  });

  describe('Scene 2: Key Concepts', () => {
    const scene2 = {
      "id": "concepts-rotated-array-search",
      "name": "Key Concepts",
      "content": [
        {
          "type": "list",
          "title": "Key Ideas",
          "data": [
            "At least one half of the array remains sorted after rotation",
            "Compare target with sorted subarray boundaries",
            "Eliminate large portions of array in each iteration",
            "Handle pivot point as a special boundary condition"
          ]
        },
        {
          "type": "codeblock", 
          "title": "Pseudocode",
          "data": ["function rotatedArraySearch(arr, target):\n    left = 0\n    right = arr.length - 1\n    while left <= right:\n        mid = (left + right) / 2\n        if arr[mid] == target: return mid\n        if left half is sorted:\n            check if target in sorted left half\n        else right half is sorted:\n            check if target in sorted right half\n    return -1  // Target not found"]
        }
      ]
    };

    test('should execute scene 2 with codeblock', () => {
      const result = executeScene(scene2);

      expect(result.sceneId).toBe('concepts-rotated-array-search');
      expect(result.sceneCanvas.elements).toHaveLength(8); // 1 list title + 4 list items + 1 codeblock title + 2 codeblock elements
      expect(result.sceneCanvas.groups).toHaveLength(2); // 1 list group + 1 codeblock group
    });

    test('should have codeblock with correct dimensions', () => {
      const result = executeScene(scene2);
      
      const codeblockGroup = result.sceneCanvas.groups.find(group => 
        group.name === 'Code Block'
      );
      expect(codeblockGroup?.elementIds).toHaveLength(2); // rectangle + code editor
      
      const rectangle = result.sceneCanvas.elements.find(el => 
        el.name === 'Code Block Background'
      );
      const codeEditor = result.sceneCanvas.elements.find(el => 
        el.name === 'Code Editor'
      );
      
      expect(rectangle).toBeDefined();
      expect(codeEditor).toBeDefined();
      
      // Rectangle should be larger than code editor
      expect(rectangle?.width).toBeGreaterThan(codeEditor?.width!);
      expect(rectangle?.height).toBeGreaterThan(codeEditor?.height!);
    });
  });

  describe('Scene 3: Demo Walkthrough', () => {
    const scene3 = {
      "id": "demo-rotated-array-search",
      "name": "Iteration Walkthrough",
      "content": [
        {
          "type": "demo",
          "dataStructure": {
            "type": "array", 
            "data": [4, 5, 6, 7, 0, 1, 2]
          },
          "steps": [
            {
              "actions": [
                {"type": "highlight", "indices": [0, 6]},
                {"type": "select", "indices": [3]},
                {"type": "compare", "indices": [3, 7]}
              ],
              "caption": "Set initial boundaries and check midpoint"
            },
            {
              "actions": [
                {"type": "deselect", "indices": [3]},
                {"type": "unhighlight", "indices": [0, 6]},
                {"type": "highlight", "indices": [0, 3]},
                {"type": "select", "indices": [1]},
                {"type": "compare", "indices": [1, 0]}
              ],
              "caption": "Identify sorted left half"
            },
            {
              "actions": [
                {"type": "deselect", "indices": [1]},
                {"type": "unhighlight", "indices": [0, 3]},
                {"type": "highlight", "indices": [4, 6]},
                {"type": "select", "indices": [5]},
                {"type": "compare", "indices": [5, 0]}
              ],
              "caption": "Adjust search boundaries to right half"
            },
            {
              "actions": [
                {"type": "deselect", "indices": [5]},
                {"type": "unhighlight", "indices": [4, 6]},
                {"type": "highlight", "indices": [4]},
                {"type": "select", "indices": [4]},
                {"type": "compare", "indices": [4, 0]}
              ],
              "caption": "Target found at index 4"
            }
          ]
        }
      ]
    };

    test('should execute demo scene with array and captions', () => {
      const result = executeScene(scene3);

      expect(result.sceneId).toBe('demo-rotated-array-search');
      expect(result.sceneCanvas.elements).toHaveLength(25); // 7 array cells + 7 index texts + 4 captions + 7 array cells
      expect(result.sceneCanvas.groups).toHaveLength(14); // 7 array groups + 7 index groups
    });

    test('should have captions with proper timing', () => {
      const result = executeScene(scene3);
      
      const captions = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('Caption')
      );
      
      expect(captions).toHaveLength(4);
      
      // All captions should have animations
      captions.forEach(caption => {
        expect(caption.animations).toHaveLength(2); // fade in + fade out
      });

      // Check sequential timing
      const fadeInTimes = captions.map(caption => caption.animations?.[0]?.startTime);
      for (let i = 1; i < fadeInTimes.length; i++) {
        expect(fadeInTimes[i]).toBeGreaterThan(fadeInTimes[i - 1]!);
      }
    });
  });

  describe('Animation Overlap Tests', () => {
    test('should not have overlapping animations across scenes', () => {
      const scene1 = {
        "id": "test-scene-1",
        "name": "Test Scene 1",
        "content": [
          {
            "type": "heading",
            "data": ["Test Heading"]
          },
          {
            "type": "list",
            "title": "Test List",
            "data": ["Item 1", "Item 2"]
          }
        ]
      };

      const scene2 = {
        "id": "test-scene-2", 
        "name": "Test Scene 2",
        "content": [
          {
            "type": "codeblock",
            "title": "Test Code",
            "data": ["function test():\n    return true"]
          }
        ]
      };

      const result1 = executeScene(scene1);
      const result2 = executeScene(scene2);

      // Each scene should have its own timeline starting from 0
      expect(result1.sceneCanvas.timeline.duration).toBeGreaterThan(0);
      expect(result2.sceneCanvas.timeline.duration).toBeGreaterThan(0);
      
      // Both scenes should have proper durations
      expect(result1.sceneCanvas.timeline.duration).toBeCloseTo(9.2, 1); // heading + list
      expect(result2.sceneCanvas.timeline.duration).toBeCloseTo(5.5, 1); // codeblock
    });
  });
});
