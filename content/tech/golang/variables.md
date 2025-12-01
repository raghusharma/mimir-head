---
title: Go Variables
publish: "true"
status: half-baked
tags:
  - golang
---
# Variable declaration and initialization
1. Variables can be declared with `var`
```go
var i int
i = 42
```
2. declare and initialize
```go
var i int = 42 // This is not recommended. Instead use walrus for declare and initialize
```
3. walrus (:=) to declare and initialize
```go
i := 42
```
This works only inside function. Does not work on package level.
```go
package main

import "fmt"

i := 5 // This will not work

func main() {
	fmt.Println(i)
}
```

On package level, multiple variables can be declared and initialized together:
```go
package main

import "fmt"

var (
	firstName string = "Raghu"
	lastName  string = "Sharma"
	age       int    = 35
)

func main() {
	fmt.Println(firstName, lastName, age)
}
```

Same variable name can be used on package level and function level. The one at the innermost scope will take precedence.
This is called shadowing.
```go
package main

import "fmt"

var i int = 42

func main() {
	fmt.Println(i)
	i := 27
	fmt.Println(i)
}
```
Above code will output:
```
42
27
```
This might be useful, for example, when you want to use a global region set to `us-east-1` in some AWS automation, and you need to use a different region for a specific scoped part of the program.
## When to use which variable declaration?
```go
i := 42 // mostly use this
var i int // maybe when you want to declare the variable in a different scope than where it is initialized
var i float32 = 42.0 // when compiler will guess wrong type of variable. For example, for float values, compiler will by default declare the variable as float64
```

# Exporting Variables
Variable names starting with uppercase are exported from the package (provided the variable is declared at package level)
```go
package main

import "fmt"

var Protagonist = "Kratos" // Variable Protagonist is exported as it starts with an uppercase

func main() {
	fmt.Println(i)
	i := 27
	fmt.Println(i)
}
```

# Convention / Best practice
1. The variable names with acronyms should be uppercase, for example:
    - `theURL` is preferred over `theUrl`
    - `theHTTPRequest` is preferred over `theHttpRequest`
2. The variables declared must always be used, else compiler will error if any unused variable is there in the code.

# Type conversion
You can convert variable of 1 type to another:
```go
var i int = 42
var j float32
j = float32(i)
```
But, the string conversion is different. If you try to do this:
```go
var i int = 42
var j string
j = string(i)
fmt.Printf("%T %v\n", j, j)
```
the value will be printed as `*`, because the unicode value corresponding to 42 is `*`. So to convert a variable to string, use the package `strconv` like this:
```go
package main

import (
	"fmt"
	"strconv"
)

func main() {
	var i int = 42
	var j string
	j = strconv.Itoa(i)
	fmt.Printf("%T %v\n", j, j)
}
```
This will output `string 42`, which is what you would expect