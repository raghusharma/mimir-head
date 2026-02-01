#golang 
# if - else

## simple if-else block
```go
package main

import "fmt"

func main() {
	if false {
		fmt.Println("This is true")
	} else {
		fmt.Println("This is false")
	}
}
```

## Initializer syntax:
```go
package main

import "fmt"

func main() {
	statePopulations := map[string]int{
		"California": 87543869,
		"Texas":      87634526789,
		"Florida":    967854233,
		"New York":   6785423867,
	}

	if pop, ok := statePopulations["Florida"]; ok { 
	// The variables pop & ok are only available within the if block.
	// They are not available outside the scope of if statement block.
		fmt.Println(pop)
	}
}
```
Here, 2 parts of if statement, separated by semicolon(;). First part (`pop, ok := statePopulations["Florida"]`) is initializer, and the second part is boolean test.

## Comparison operators:
`<, <=, >, >=, == !=, ` work with numeric types
Logical operators:
`||, &&, !` - Or, And, Not

# switch
```go
package main

import "fmt"

func main() {
	switch 2 {
	case 1:
        fmt.Println("one")
	case 2:
        fmt.Println("Two")
	default:
        fmt.Println("None of above")
	}
}
```

## Multiple values in the same case:
```go
package main

import "fmt"

func main() {
	switch 0 {
	case 2, 4, 6, 8, 10:
		fmt.Println("even")
	case 1, 3, 5, 7, 9:
		fmt.Println("odd")
	default:
		fmt.Println("out of bounds")
	}
}
```

## same condition cannot be put into more than 1 case
```go
package main

import "fmt"

func main() {
	switch 0 {
	case 2, 4, 6, 8, 10:
		fmt.Println("even")
	case 1, 3, 5, 7, 9, 10: // 10 is used in 2 cases. Compiler error
		fmt.Println("odd")
	default:
		fmt.Println("out of bounds")
	}
}
```

## switch initializer
Like [[if-switch#Initializer syntax|if initializer]], switch also has initializer
```go
package main

import "fmt"

func main() {
	switch i := 2 + 3; i { // initializer syntax
	case 2, 4, 6, 8, 10:
		fmt.Println("even")
	case 1, 3, 5, 7, 9:
		fmt.Println("odd")
	default:
		fmt.Println("out of bounds")
	}
}
```

## Switch without variable/tag:
```go
package main

import "fmt"

func main() {
	i := 10
	switch {
	case i <= 10:
		fmt.Println("less than or equal to ten")
	case i <= 20:
		fmt.Println("less than or equal to twenty")
	default:
		fmt.Println("greater than 20")
	}
}
```
Another example:
```go
package main

import "fmt"

func main() {
	i := 10
	j := 20
	switch {
	case i <= 10:
		fmt.Println("first case")
	case j <= 20:
		fmt.Println("second case")
	default:
		fmt.Println("out of bounds")
	}
}
// Output: first case
```

## Type switch
To check the type of the variable. Useful in [[interfaces|interfaces]] for checking which type of object the variable contains.
```go
package main

import "fmt"

func main() {
    var i interface{} = 1
    switch i.(type) {
    case int:
        fmt.Println("it is int")
    case float64:
        fmt.Println("it is float")
    case string:
        fmt.Println("it is string")
    default:
        fmt.Println("it is another type")
    }
}
```

- No fall-through. If first case gets passed, other cases are not checked.
- Unlike other languages, break keyword is not required, it is implied. 
- You can manually do fall-through, but it is generally not required and not recommended.
- If switch has multiple statements, you can manually break out early using break keyword