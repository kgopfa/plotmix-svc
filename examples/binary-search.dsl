dsl
seed 42
style educational

heading "Binary Search Algorithm"
subtitle "Finding target value in sorted array"
explanation "An efficient search algorithm that finds a target value in a sorted array by repeatedly dividing the search interval in half"
example "Given a sorted array and a target value of 23, the algorithm will find the target efficiently"
array [2,5,8,12,16,23,38,56,72,91]
animate highlight [0,9]
caption 1 "Start with the entire sorted array as our search range"
animate focus [4]
caption 2 "Find the middle element (16) and compare it with our target (23)"
animate compare [4,5]
caption 3 "Since 16 < 23, we eliminate the left half and search only the right portion"
animate highlight [5,9]
caption 4 "Our new search range is narrowed to the right half of the array"
animate focus [6]
caption 5 "Find the new middle element (38) in our reduced search range"
animate select [5]
caption 6 "We found our target value 23 at index 5 of the array"
conclusion 1 "Time Complexity: O(log n)"
conclusion 2 "Space Complexity: O(1)"
conclusion 3 "Use Case: Searching in sorted arrays"
conclusion 4 "Requirement: Array must be sorted"
