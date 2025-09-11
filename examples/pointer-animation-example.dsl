setup seed=42 style=auto

draw_array [5, 2, 8, 1, 9]

caption 1 "Let's demonstrate pointer animations with array indices"

animate pointer [0, 2]
caption 2 "Pointers appear at indices 0 and 2"

animate move [1, 3]
caption 3 "Pointers move to indices 1 and 3"

animate highlight [2]
caption 4 "Highlight the middle element"

animate move [4, 0]
caption 5 "Pointers move to the last and first elements"
