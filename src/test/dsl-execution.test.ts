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
      expect(result.sceneCanvas.elements).toHaveLength(8);
      expect(result.sceneCanvas.groups).toHaveLength(2);
    });

    test('should have correct timeline duration', () => {
      const result = executeScene(scene1);
      
      // Updated timing: heading (1.0+1.8+1.5=4.3) + gap (0.2) + list1 (3*1.2=3.6+1.8=5.4+1.5=6.9) + gap(0.2) + list2 (4*1.2=4.8+1.8=6.6+1.5=8.1) = 20.1
      expect(result.sceneCanvas.playback.duration).toBeCloseTo(19.7, 1);
    });

    test('should have list items with fade-in animations in timeline', () => {
      const result = executeScene(scene1);
      
      const listItems = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Item')
      );
      
      expect(listItems).toHaveLength(7);
      
      
      // Check that timeline animations exist for groups (not individual titles)
      const fadeInAnimations = result.sceneCanvas.timeline.filter(anim => 
        anim.displayName.includes('fade-in')
      );
      
      expect(fadeInAnimations.length).toBeGreaterThan(0);
      
      // Check fade-in animation properties - groups have calculated duration, elements have 1.2s
      fadeInAnimations.forEach(anim => {
        expect(anim.tracks).toHaveLength(1);
        expect(anim.tracks[0]?.type).toBe('fade');
        expect(anim.tracks[0]?.properties['alpha']).toBe("1");
        // Duration varies: group fade-ins use calculated duration based on items
        expect(anim.tracks[0]?.duration).toBeGreaterThan(0);
        expect(anim.tracks[0]?.easing).toBe('power1.inOut');
      });
      
      // Check that animations have different timing (different content items)
      const fadeIn1 = fadeInAnimations[0]?.startAt;
      const fadeIn2 = fadeInAnimations[1]?.startAt;
      
      if (fadeIn2 !== undefined && fadeIn1 !== undefined) {
        expect(fadeIn2).toBeGreaterThan(fadeIn1);
      }
    });

    test('should have list items with sequential animations in timeline', () => {
      const result = executeScene(scene1);
      
      const listItems = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Item')
      );
      
      expect(listItems).toHaveLength(7); // 3 + 4 items
      
      
      // Check that timeline animations exist for list items (internal animations for elements)
      const itemAnimations = result.sceneCanvas.timeline.filter(anim => 
        anim.target.type === 'element' && anim.displayName.includes('fade-in')
      );
      
      // We should have internal animations for list items
      expect(itemAnimations.length).toBeGreaterThan(0);
      
      // Check fade-in animation properties
      // List items fade in individually with duration 1.2s
      itemAnimations.forEach(anim => {
        expect(anim.tracks).toHaveLength(1);
        expect(anim.tracks[0]?.type).toBe('fade');
        expect(anim.tracks[0]?.properties['alpha']).toBe("1");
        // Duration is 1.2s for individual list item fade-ins (or calculated based on last item)
        expect(anim.tracks[0]?.duration).toBeGreaterThanOrEqual(1.0);
        expect(anim.tracks[0]?.easing).toBe('power1.inOut');
      });

      // Check sequential timing
      const fadeInTimes = itemAnimations.map(anim => anim.tracks[0]?.startTime || 0);
      
      for (let i = 1; i < fadeInTimes.length; i++) {
        expect(fadeInTimes[i]).toBeGreaterThan(fadeInTimes[i - 1]!);
      }
    });

    test('should have content item groups with fade-out animations in timeline', () => {
      const result = executeScene(scene1);
      
      // Check that we have content item groups
      const contentGroups = result.sceneCanvas.groups.filter(group => 
        group.name?.includes('List Content Item')
      );
      
      expect(contentGroups).toHaveLength(2);
      
      // Check that timeline animations exist for content group fade-outs
      const groupFadeOutAnimations = result.sceneCanvas.timeline.filter(anim => 
        anim.displayName.includes('fade-out') && anim.target.type === 'group'
      );
      
      expect(groupFadeOutAnimations).toHaveLength(2); // 2 lists = 2 content groups (heading is not in a group)
      
      // Each content group should have a fade-out animation
      groupFadeOutAnimations.forEach(anim => {
        expect(anim.tracks).toHaveLength(1);
        expect(anim.tracks[0]?.type).toBe('fade');
        expect(anim.tracks[0]?.properties['alpha']).toBe(0); // Fade to invisible
        expect(anim.tracks[0]?.duration).toBe(1.5); // 1.5 second fade out
        expect(anim.tracks[0]?.easing).toBe('power1.inOut');
      });
      
      // Verify that list elements are grouped properly
      const listElements = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('List Item')
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
      expect(result.sceneCanvas.elements).toHaveLength(7); // 4 list items + 3 codeblock elements
      expect(result.sceneCanvas.groups).toHaveLength(2);
    });

    test('should have codeblock with correct dimensions', () => {
      const result = executeScene(scene2);
      
      const codeblockGroup = result.sceneCanvas.groups.find(group => 
        group.name?.includes('Codeblock Content Item')
      );
      // Codeblock can have title + background + editor = 3 elements
      expect(codeblockGroup?.elementIds?.length).toBeGreaterThanOrEqual(2);
      
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
      expect(result.sceneCanvas.elements).toHaveLength(25);
      expect(result.sceneCanvas.groups).toHaveLength(7); // 7 array cells, each properly grouped
    });

    test('should have captions with proper timing in timeline', () => {
      const result = executeScene(scene3);
      
      const captions = result.sceneCanvas.elements.filter(el => 
        el.name?.includes('Caption')
      );
      
      expect(captions).toHaveLength(4);
      
      
      // Check that timeline animations exist for captions (displayName starts with "Caption")
      const captionAnimations = result.sceneCanvas.timeline.filter(anim => 
        anim.target.type === 'element' && anim.displayName.startsWith('Caption')
      );
      
      // We expect caption animations among element animations
      expect(captionAnimations.length).toBeGreaterThan(0);
      
      // All captions should have ONE animation with TWO tracks (fade-in + fade-out)
      captionAnimations.forEach(anim => {
        expect(anim.tracks).toHaveLength(2);
        
        // Track 1: Fade-in
        expect(anim.tracks[0]?.type).toBe('fade');
        expect(anim.tracks[0]?.properties['alpha']).toBe(1);
        expect(anim.tracks[0]?.duration).toBe(0.5); // Demo step fade-in duration
        expect(anim.tracks[0]?.easing).toBe('power1.inOut');
        
        // Track 2: Fade-out
        expect(anim.tracks[1]?.type).toBe('fade');
        expect(anim.tracks[1]?.properties['alpha']).toBe(0);
        expect(anim.tracks[1]?.duration).toBe(0.5); // Demo step fade-out duration
        expect(anim.tracks[1]?.easing).toBe('power1.inOut');
      });

      // Check sequential timing
      const fadeInTimes = captionAnimations.map(anim => anim.tracks[0]?.startTime || 0);
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
      expect(result1.sceneCanvas.playback.duration).toBeGreaterThan(0);
      expect(result2.sceneCanvas.playback.duration).toBeGreaterThan(0);
      
      // Both scenes should have proper durations  
      // Updated for new timing: heading (1.0+1.8+1.5=4.3) + gap (0.2) + list (1.2*2 items + 1.8 visible + 1.5 fadeout = 5.7) = 10.2
      expect(result1.sceneCanvas.playback.duration).toBeCloseTo(10.2, 1); // heading + list
      expect(result2.sceneCanvas.playback.duration).toBeCloseTo(5.5, 1); // codeblock
    });
  });
});
