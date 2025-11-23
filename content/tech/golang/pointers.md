#golang 
# Creating pointers
- Pointers store the memory address
- Pointer types use an asterisk(\*) as a prefix to type pointed to
    - `*int` - a pointer to an integer
    - Pointer to an integer (`var b *int`) will store the address (in memory) of an integer
- Use "address-of" operator (`&`) to get the address of the variable (e.g. integer you want to store in the pointer (`b := &a`))
- Dereference a pointer to get the value stored at the address in the pointer (`*b`)
```go
package main

import "fmt"

func main() {
	a := 42
	var b *int = &a
	fmt.Println(a, *b)
	a = 27
	fmt.Println(a, *b)
	*b = 14
	fmt.Println(a, *b)
}
```
## Multiple ways to create pointers
- ﻿Can use the addressof operator (&) if value type already exists
    - ms := mystruct{foo: 42}
      p := &ms
- Use addressof operator before initializer
    - &myStruct{foo: 42}
- ﻿﻿Use the new keyword
      Can't initialize fields at the same time

```go
package main

import "fmt"

type myStruct struct {
	foo int
}

func main() {
	var ms *myStruct
	ms = &myStruct{foo: 42}
	fmt.Println(*ms)
	
	var ms2 *myStruct
	ms2 = new(myStruct)
	fmt.Println(*ms2)
}
```
- Pointers are initialized with `nil` value
```go
package main

import "fmt"

func main() {
	a := 42
	var b *int
	fmt.Println(a, b) // Output - 42 <nil>
}
```
- complex types (e.g. structs) are dereferenced automatically
    - Shorthand way of using pointers with complex types such as struct:
```go
package main

import "fmt"

type myStruct struct {
	foo int
}

func main() {
	var ms *myStruct
	ms = new(myStruct)
	(*ms).foo = 27 // clumsy
	fmt.Println((*ms).foo)

	var ms2 *myStruct
	ms2 = new(myStruct)
	ms2.foo = 30 // shorthand way of using the same as above statement
	fmt.Println(ms2.foo)
}
```

## Types with internal pointers
- All assignment operations in Go are copy operations
- Slices & maps maps contain internal pointers, so copies point to same underlying data.
    - Slices and maps have pointers to the underlying data, and not data themselves. So when slices are passed, the pointers are passed, which will make changes in the actual data. Be careful when working with these types.