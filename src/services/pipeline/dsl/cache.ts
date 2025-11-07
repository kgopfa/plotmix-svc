'use strict';

const normalizePrompt = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const BINARY_SEARCH_PROMPT =
  'Create a visual representation of binary search algorithm. Show a sorted array and demonstrate how the algorithm finds a target value by repeatedly dividing the search interval in half.';

const BINARY_SEARCH_DSL = JSON.stringify(
  {
    name: 'Binary Search Algorithm',
    scenes: [
      {
        id: 'intro',
        name: 'Introduction',
        content: [
          {
            type: 'heading',
            data: ['Efficient Sorted Array Search'],
          },
          {
            type: 'list',
            data: [
              'Find target value in sorted array quickly',
              'Eliminate half the search space each iteration',
              'Dramatically reduce search time compared to linear search',
            ],
          },
          {
            type: 'list',
            data: [
              'Start with entire sorted array',
              'Compare target with middle element',
              'Eliminate half of remaining search space',
              'Repeat until target found or search space exhausted',
            ],
          },
        ],
      },
      {
        id: 'concepts',
        name: 'Key Concepts',
        content: [
          {
            type: 'list',
            data: [
              'Requires pre-sorted input array',
              'Logarithmic time complexity O(log n)',
              'Divide-and-conquer strategy reduces search space',
              'Midpoint calculation determines next search interval',
              'Efficient for large sorted datasets',
            ],
          },
          {
            type: 'codeblock',
            data: [
              'function binarySearch(arr, target):',
              '    left = 0',
              '    right = arr.length - 1',
              '    ',
              '    while left <= right:',
              '        mid = (left + right) / 2',
              '        if arr[mid] == target:',
              '            return mid  // Target found',
              '        if arr[mid] < target:',
              '            left = mid + 1  // Search right half',
              '        else:',
              '            right = mid - 1  // Search left half',
              '    return -1  // Target not found',
            ],
            title: 'Binary Search Pseudocode',
          },
        ],
      },
      {
        id: 'demo',
        name: 'Iteration Walkthrough',
        content: [
          {
            type: 'demo',
            dataStructure: {
              type: 'array',
              data: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91],
            },
            targetValue: 38,
            steps: [
              {
                actions: [{ type: 'highlight', indices: [0, 9] }],
                caption: 'Initial search: entire sorted array',
              },
              {
                actions: [{ type: 'select', indices: [4] }],
                caption: 'Select midpoint (16) - less than target',
              },
              {
                actions: [{ type: 'unhighlight', indices: [0, 4] }],
                caption: 'Eliminate left half of array',
              },
              {
                actions: [{ type: 'highlight', indices: [5, 9] }],
                caption: 'New search interval: right half',
              },
              {
                actions: [{ type: 'select', indices: [6] }],
                caption: 'Select new midpoint (38) - exact match',
              },
              {
                actions: [{ type: 'focus', indices: [6] }],
                caption: 'Target found at index 6',
              },
            ],
          },
        ],
      },
      {
        id: 'edge-cases',
        name: 'Edge Cases & Performance',
        content: [
          {
            type: 'list',
            data: [
              'Empty array returns -1',
              'Target not in array returns -1',
              'Single element array works correctly',
              'Duplicate values may return first or last occurrence',
            ],
          },
          {
            type: 'list',
            data: [
              'Time Complexity: O(log n)',
              'Space Complexity: O(1)',
              'Most efficient for large sorted datasets',
            ],
          },
        ],
      },
      {
        id: 'alternatives',
        name: 'Alternative Approaches',
        content: [
          {
            type: 'list',
            data: [
              'Linear Search — Check each element sequentially (Time: O(n))',
              'Recursive Binary Search — Same logic using function recursion (Space: O(log n))',
            ],
          },
        ],
      },
    ],
  },
  null,
  2
);

const PROMPT_CACHE = new Map<string, string>([
  [normalizePrompt(BINARY_SEARCH_PROMPT), BINARY_SEARCH_DSL],
]);

/**
 * Retrieve cached DSL for supported prompts to avoid repeating LLM work.
 */
export const getCachedDslForPrompt = (prompt: string): string | null => {
  const normalized = normalizePrompt(prompt);
  return PROMPT_CACHE.get(normalized) ?? null;
};

export const SUPPORTED_PROMPTS = {
  BINARY_SEARCH_PROMPT,
};

