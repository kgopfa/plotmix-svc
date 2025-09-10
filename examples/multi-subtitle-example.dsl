seed 42
style auto

heading "Binary Search Algorithm"

subtitle 1 intro "How Binary Search works"
subtitle 2 demo "Find target=7 in array [1,3,5,7,9,11]"
subtitle 3 edgecases "Edge cases and limitations"
subtitle 4 conclusion "Summary and key takeaways"

explanation 1 "Binary search is an efficient algorithm for finding a target value in a sorted array."
explanation 2 "It works by repeatedly dividing the search space in half."

approach 1 "Compare target with middle element"
approach 2 "If equal, return the index"
approach 3 "If target is smaller, search left half"
approach 4 "If target is larger, search right half"
approach 5 "Repeat until found or search space is empty"

pseudocode """
function binarySearch(arr, target):
    left = 0
    right = arr.length - 1
    
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1
"""

example "Searching for 7 in [1,3,5,7,9,11]"

array [1,3,5,7,9,11]

animate select [2]
caption 1 "Start at middle element (index 2): value 5"

animate select [4]
caption 2 "Target 7 > 5, so search right half"

animate select [5]
caption 3 "Check middle of right half (index 4): value 9"

animate select [3]
caption 4 "Target 7 < 9, so search left of this range"

animate focus [3]
caption 5 "Found target 7 at index 3!"

edgecase 1 "Array not sorted - algorithm fails"
edgecase 2 "Target not in array - returns -1"
edgecase 3 "Empty array - returns -1 immediately"

conclusion 1 "Binary search has O(log n) time complexity"
conclusion 2 "Requires sorted input array"
conclusion 3 "Much faster than linear search for large datasets"

alternative 1 "Linear Search — O(n) time, works on unsorted arrays"
alternative 2 "Hash Table — O(1) average time, requires extra memory"
