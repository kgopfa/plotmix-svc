seed 12345
style auto

heading "Binary Search Algorithm"
subtitle "Finding target value in sorted array"
explanation "The binary search algorithm efficiently finds a target value within a sorted array by repeatedly dividing the search interval in half."
example "Given a sorted array [1, 3, 5, 7, 9] and a target value of 5, the algorithm will find the target in 4 steps."
array [1,3,5,7,9]
animate highlight [1,3,5,7,9]
caption 1 "We start with the entire array as our search range."
animate select [5]
caption 2 "The middle element is 5, which we will compare with the target."
animate compare [3,5]
caption 3 "We compare the middle element (5) with the target value (5)."
animate focus [5]
caption 4 "The target value has been found at index 2."
conclusion 1 "Time Complexity: O(log n)"
conclusion 2 "Space Complexity: O(1)"
conclusion 3 "Use Case: Searching in sorted arrays"