#golang 
# Syntax:

`initializer; test; incrementer`

```go
package main

import "fmt"

func main() {
	for i := 10; i <= 15; i++ {
		fmt.Println(i)
	}
}
```

```go
package main

import "fmt"

func main() {
	for i := 10; i <= 15; i = i + 2 { //instead of i++, `i = i + 2` can be used
		fmt.Println(i)
	}
}
```

## Initialize & use multiple loop variables:
```go
package main

import "fmt"

func main() {
	for i, j := 0, 0; i < 5; i, j = i+1, j+1 {
		fmt.Println(i, j)
	}
}
```


# Alternate Syntax
- Not all 3 statements are required:

## Omitting initializer:

```go
package main

import "fmt"

func main() {
	i := 0
	for ; i < 5; i++ {
		fmt.Println(i)
	}
}
```

## And incrementer:

```go
package main

import "fmt"

func main() {
	i := 0
	for ; i < 5; {
		fmt.Println(i)
		i++
	}
}
```

### In fact, here semicolons are not required

```go
package main

import "fmt"

func main() {
	i := 0
	for i < 5 { // This syntax is similar to while loop
		fmt.Println(i)
		i++
	}
}
```

## Infinite loop
```go
package main

import "fmt"

func main() {
	i := 0
	for {
		fmt.Println(i)
		i++
		if i >= 5 {
    	break
		}
	}
}
```

- You can use `continue` to skip the iteration & go to the next iteration

# Iterating through collections using `range`

```go
package main

import "fmt"

func main() {
	s := []int{5, 6, 7}
	for k, v := range s {
		fmt.Println(k, v)
	}
}
```

- works on slices, arrays, maps, strings, channels etc.

## If you just need keys:
```go
package main

import "fmt"

func main() {
	statePopulations := map[string]int{ // map of string keys to int values
		"California": 70954823,
		"Texas":      98732457,
		"Florida":    97384234,
		"New York":   19378461,
	}

	for k := range statePopulations {
		fmt.Println(k)
	}
}
```

## If you just need values:
```go
package main

import "fmt"

func main() {
	statePopulations := map[string]int{ // map of string keys to int values
		"California": 70954823,
		"Texas":      98732457,
		"Florida":    97384234,
		"New York":   19378461,
	}

	for _, v := range statePopulations {
		fmt.Println(v)
	}
}
```

3 types of for loops:
- for initializer, test, incrementer {}
- for test {}
- for {}