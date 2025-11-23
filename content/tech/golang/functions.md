#golang 
# Functions Basic Syntax
- start with `func` keyword, followed by name of the function
- function names starting with small letters are not exported (internal to the package), while the ones starting with capital letters are exported (from outside of package).
- Opening curly braces have to be on the same line as the function definition (required by compiler)
- Closing curly braces will be on its own line
```go
package main

import "fmt"

func main() {
	for i := 0; i < 5; i++ {
		sayGreetings("Hello Go!", i)
	}
}

func sayGreetings(msg string, idx int) {
	fmt.Println(msg)
	fmt.Println("Value of idx is:", idx)
}
```

# Parameters
- Comma delimited list of variables and types
    - `func foo(bar string, baz int)`
- If the parameters are of the same type, list type once
    - `func foo(bar, baz int)`
```go
package main

import "fmt"

func main() {
	for i := 0; i < 5; i++ {
		sayGreetings("Hello", "Go", i, 42)
	}
}
// Instead of writing like this:
// func sayGreetings(msg string, msg2 string, idx int, idx2 int) {
// you can chose to write as follows:
func sayGreetings(msg, msg2 string, idx, idx2 int) {
	fmt.Println(msg, msg2, idx, idx2)
}
```

## Passing Pointers (pass by reference?)
- You can pass pointers, which if changed in the function will cause the value in the caller to be changed:
    - slices & maps are always passed as pointers
```go
package main

import "fmt"

func main() {
	greet := "Hello"
	name := "Stacy"
	fmt.Println(greet, name)
	sayGreetings(&greet, &name)
	fmt.Println(greet, name)
}

func sayGreetings(greeting, passedName *string) {
	fmt.Println("In sayGreetings:", *greeting, *passedName)
	*passedName = "Raghu"
	fmt.Println("In sayGreetings:", *greeting, *passedName)
}
```
Output:
```text
Hello Stacy
In sayGreetings: Hello Stacy
In sayGreetings: Hello Raghu
Hello Raghu
```

## Variadic Parameters
- Use variadic parameters to send list of same types
    - Must be last parameter
    - Received as a slice
```go
package main

import "fmt"

func main() {
	sum("The sum is:", 1, 2, 5, 4, 3)
}

func sum(msg string, values ...int) {
	fmt.Println(values)
	result := 0
	for _, v := range values {
		result += v
	}
	fmt.Println(msg, result)
}
```
Output:
```text
[1 2 5 4 3]
The sum is: 15
```

# Return Values
## Syntax:
- `func <functionName>() <returnType> {}`
- `return` keyword for returning the value.

```go
package main

import "fmt"

func main() {
	fmt.Println(sum(1, 2, 5, 4, 3))
}

func sum(values ...int) int {
	result := 0
	for _, v := range values {
		result += v
	}
	return result
}
```

## Return a local variable as pointer
- Not many languages support this
- You can return address of the variable, and the receiving variable becomes a pointer
    - Automatically promoted from local memory (stack) to shared memory (heap)
```go
package main

import "fmt"

func sum(values ...int) *int {
	fmt.Println(values)
	result := 0
	for _, v := range values {
		result += v
	}
	return &result
}

func main() {
	s := sum(1, 3, 2, 5, 4)
	fmt.Println(*s)
}

```

## Return multiple values
- Syntax: `func foo() (<type>, <type>)`. 
- Can be used to return error along with value
    - You can create error by using `fmt.Errorf()`
```go
package main

import "fmt"

func divide(a, b float64) (float64, error) {
	if b == 0.0 {
		return 0.0, fmt.Errorf("Divide by 0 not allowed")
	}
	return a / b, nil
}

func main() {
	d, err := divide(5.0, 1.0)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(d)
}

```

# Anonymous functions
- Functions are treated as any other types
- Anonymous functions don't have names
- Syntax: `func () {<body>}`
```go
package main

import "fmt"

func main() {
	func() {
		fmt.Println("Hello go")
	}() // the paranthesis are for invoking the function
}

```
- Anonymous functions can be assigned to variables
```go
package main

import "fmt"

func main() {
	sf1 := func() { // simple function
		fmt.Println("Hello go")
	}
	sf1()

	var sf2 func() = func() { // long way to declare function
		fmt.Println("Hello again")
	}
	sf2()

	var divide func(float64, float64) (float64, error) // takes 2 floats as parameters, returns a float & an error (2 return values)
	divide = func(a, b float64) (float64, error) {
		if b == 0.0 {
			return 0.0, fmt.Errorf("Cannot divide by zero")
		} else {
			return a / b, nil
		}
	}
	d, err := divide(5.0, 3.0)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(d)
}
```
- The difference between this type of function (assigned to a variable) and normal function is that this function cannot be invoked before the variable is declared.
## Functions as types
- Can assign functions to variables or use as arguments and return types in functions
- Type signature is like function signature with no parameter name (line 16 above)
    - `var f func(string, string, int) (int, error)`
## Why anonymous function?
**Q:** What is the point of creating a function, and then assigning it to a variable, when you can just call the function by its name the same way?
**A:** With the function assigned to a variable, it can be passed around. For example, you can pass the variable as a parameter to another function.

**Q:** Why/When would you want to pass the function as parameter to another function?
**A:** For example, you want to perform different functions on same set of variables, then you would pass the function as parameter to the other function. Here is an example:

```go
package main

import (
	"fmt"
	"math"
)

func compute(fn func(float64, float64) float64) float64 {
	return fn(3, 4)
}

func main() {
	hypot := func(x, y float64) float64 {
		return math.Sqrt(x*x + y*y)
	}
	fmt.Println(hypot(5, 12)) // 13

	fmt.Println(compute(hypot)) //5
	fmt.Println(compute(math.Pow)) //81
}

```
> [!Note]
> Above code taken from "Go by example"> [Function Values](https://go.dev/tour/moretypes/24)

## Closures
The anonymous functions inside another function can access the variables from the block above. These are called closures.
```go
func adder() func(int) int {
	sum := 0
	return func(x int) int {
		sum += x
		return sum
	}
}
```
The `sum` variable is available to the function at line 3.
Try avoiding closures, as they can have side effects when using [[goroutines|goroutines]]
# Methods
- Methods are functions that execute in context of a type
    - Commonly that type is struct, ([[#Methods on Types|but not necessarily]]).
```go
package main

import "fmt"

func main() {
	g := greeter{
		greeting: "Hello",
		name:     "Go",
	}
	g.greet()
}

type greeter struct {
	greeting string
	name     string
}

func (g greeter) greet() {
	fmt.Println(g.greeting, g.name)
}
```

- A method is a function with a receiver placed between func and the method name, giving the function a known context (a type).
- **The receiver** appears in parentheses before the method name. e.g. `func (g Greeter) Greet()`. The receiver makes fields of the type accessible inside the method.
- Call a method on a value like accessing a field: `value.Method(args)`. It looks like field access but includes parameters.
- **Value receiver:** Using a non-pointer receiver (e.g., `greeter`) passes a copy. Changes inside the method do not affect the original value; good for read-only behavior but can be costly for large structs.
- Methods can be defined only on the types available in the same package as method.
## Methods on Types
- Methods can be defined on types, not just structs. For example `Abs` is a method on the type/alias `MyFloat`:
```go
package main

import (
	"fmt"
	"math"
)

type MyFloat float64

func (f MyFloat) Abs() float64 {
	if f < 0 {
		fmt.Println(f)
		return float64(-f)
	}
	return float64(f)
}

func main() {
	f := MyFloat(-math.Sqrt2)
	fmt.Println(f.Abs())
}

```
## Pointer receiver for a Method:
- Using a pointer receiver (e.g., `*greeter`) receives a pointer, allowing mutation of the original and avoiding large copies; Go implicitly dereferences on call.
- Choose **value receiver** for immutability/read-only access, **pointer receiver** for mutation or performance on large types.
- Example of Pointer receiver method:
```go
package main

import "fmt"

func main() {
	g1 := greeter{
		greeting: "Hello",
		name:     "Go",
	}
	fmt.Println(g1.name) // prints "Go"
	g1.greet()
	fmt.Println(g1.name) // prints "no go"
}

type greeter struct {
	greeting string
	name     string
}

func (g *greeter) greet() {
	fmt.Println(g.greeting, g.name)
	g.name = "no go"
}
```
- No need to explicitly mention the pointer reference for the type when calling the pointer receiver method. For example, on line 11, you are actually calling `(&g1).greet()`, but Go allows you to just mention `g1.greet()`, and it works.
- Conversely you can have a value receiver method, which you can call using pointer variable (`&g1`).