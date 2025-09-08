seed 1
style Minimal
heading "Binary Search"
subtitle "Efficiently finds a target in a sorted array"
explanation """Binary search starts by defining two pointers that represent the bounds of the search space. It calculates the middle point and compares the target value with the middle element. If they match, the search is complete. If the target is less than the middle element, the search continues in the lower half; if greater, it continues in the upper half. This process repeats until the target is found or the bounds converge, indicating the target is not present."""
approach 0 "Requires a sorted array"
approach 1 "Divides search space in half"
approach 2 "Compares target with middle element"
approach 3 "Adjusts search bounds based on comparison"
approach 4 "Iterates until target is found or bounds converge"
example "Demonstrate how binary search efficiently finds a target in a sorted array."
target 7
array [1,3,5,7,9,11]
animate highlight [0,5]
caption 1 "The search begins with pointers set to the start and end of the array."
animate highlight [2]
caption 2 "The midpoint is calculated as the average of low and high."
animate highlight [2]
animate relations [[0,2],[2,5]]
caption 3 "The value at the midpoint (5) is less than the target (7), so we adjust the low pointer."
animate highlight [3,5]
caption 4 "The low pointer is moved to the right of the midpoint."
animate highlight [4]
caption 5 "The midpoint is recalculated with the new bounds."
animate highlight [4]
animate relations [[3,4],[4,5]]
caption 6 "The value at the midpoint (9) is greater than the target (7), so we adjust the high pointer."
animate highlight [3]
caption 7 "The high pointer is moved to the left of the midpoint."
animate highlight [3]
caption 8 "The midpoint is recalculated again with the updated bounds."
animate highlight [3]
animate relations [[3,3]]
caption 9 "The value at the midpoint (7) matches the target, indicating success."
edgecase 0 "Empty array"
edgecase 1 "Target not present in the array"
edgecase 2 "Array with one element"
edgecase 3 "Array with duplicate elements"
edgecase 4 "Target is the first element"
edgecase 5 "Target is the last element"
pseudocode """function binarySearch(array, target):
  low = 0
  high = length(array) - 1
  while low <= high:
    mid = (low + high) / 2
    if array[mid] == target:
      return mid
    else if array[mid] < target:
      low = mid + 1
    else:
      high = mid - 1
  return -1"""