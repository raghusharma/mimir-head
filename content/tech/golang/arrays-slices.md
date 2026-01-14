---
title: Go Arrays and Slices
status: half-baked
tags:
  - golang
---
# Array
- Collection of items of the same type
- Fixed size
Declare an array:
```go
var students [3]string
grades := [3]int{1, 2, 3} // Create and initialize
grades2 := [...]int{3, 4, 5} // don't need to specify the array length. compiler calculates it from the initilized value
```

multi-dimensional / array of arrays:
```go
var identityMatrix [3][3]int = [3][3]int{ [3]int{1, 0, 0}, [3]int{0, 1, 0}, [3]int{0, 0, 1} }
fmt.Println(identityMatrix)
```

cleaner way:
```go
var identityMatrix [3][3]int
identityMatrix[0] = [3]int{1, 0, 0}
identityMatrix[1] = [3]int{0, 1, 0}
identityMatrix[2] = [3]int{0, 0, 1}
fmt.Println(identityMatrix)
```

get the length of the array with `len`:
```go
a := [3]int{1, 2, 3}
fmt.Printf("Length of the array is: %v", len(a))
```

This(assignment) creates a copy of the array:
```go
a := [3]int{1, 2, 3}
b := a
a[1] = 5
fmt.Println(a) // [1, 5, 3]
fmt.Println(b) // [1, 2, 3]
```

# Slices
- Backed by array
- Slices size need not be defined at the declaration time. Calculated at runtime.
- Slice an existing array or slice to create a new slice

Create a slice:
```go
s := []int{1, 2, 3}
a := []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
b := a[:] // slice of all elements
c := a[3:] // slice from 4th element to the end
d := a[:6] // slice first 6 elements
e := a[3:6] // slice from index 3 upto (but not including) index 6; [4, 5, 6]
```

```go
a := make([]int, 10) // create slice with capacity and length 10
a := make([]int, 10, 100) // slice with length = 10, capacity = 100
```

- most of the operations that you can do on array can be done on slices
- Assignment to another variables does not create a copy, but points to the same slice
- `len` can be used to determine the length
- `cap` function returns the length of the underlying array/slice
```go
a := []int{1, 2, 3}
b := a // a & b are same slice
b[1] = 5
fmt.Println(a) // [1, 5, 3]
fmt.Println(b) // [1, 5, 3]
fmt.Printf("Length: %v\n", len(a))
```

```go
package main

import "fmt"

func main() {
	a := [3]int{1, 2, 3}
	b := a[:2]
	a[1] = 5
	fmt.Println(len(b)) // 2
	fmt.Println(cap(b)) // 3
}

```

- `append` function to add elements to slice
    - may cause expensive copy operation if underlying array is too small
