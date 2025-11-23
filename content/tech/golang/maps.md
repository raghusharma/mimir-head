#golang 

# Maps
- Key-Value pairs
- 1 key type mapped to 1 value type. Mix-match not possible
```go
package main

import "fmt"

func main() {
    statePopulations := map[string]int{ // map of string keys to int values
        "California": 70954823,
        "Texas": 98732457,
        "Florida": 97384234,
        "New York": 19378461,
    }
}
```

- Keys can be of types that are able to be tested for equivalency. **(What does this line mean?)**
- Keys can be boolean, numeric types, strings, arrays, pointers, structs, interfaces, channels etc.
- Keys cannot be slices, maps, other functions.
```go
m := map[[]int]string{} // invalid key - slice
n := map[[3]int]string{} // valid key - array
```

## Create a map
Create a map using make function:
```go
package main

import "fmt"

func main() {
    statePopulations := make(map[string]int)
    statePopulations = map[string]int{ // map of string keys to int values
        "California": 70954823,
        "Texas": 98732457,
        "Florida": 97384234,
        "New York": 19378461,
    }
    fmt.Println(statePopulations)
}
```

## Fetching and Manipulating maps
Get value from map:
```go
fmt.Println(statePopulations["Texas"])
```
Set value:
```go
statePopulations["Ohio"] = 13296987
```
Delete value using delete function:
```go
delete(statePopulations, "Florida")
```

If you try to fetch a non-existent key, 0 is returned:
```go
fmt.Println(statePopulations["Delhi"]) // Delhi key does not exist, 0 is printed
```
So how do you determine if the key returned 0 value or it does not exist? Use "comma ok"
```go
valueReturned, ok = statePopulations["Delhi"]
fmt.Println(valueReturned, ok) // prints 0 false
```
`ok` above is just another variable name, and its conventional to use ok, but technically any variable name can be used here.
If the key exists, the value of `ok` will be `true`
Extending this, if you just want to check the existence of a key, you can use this:
```go
_, ok = statePopulations["Delhi"]
fmt.Println(ok)
```

Use `len` function to get the number of elements in the map:
```go
fmt.Println(len(statePopulations))
```

Assigning a map to another variable will both point to the same map, and a copy will not be created. Making changes in any one of them will affect the other.

```go
sp := statepopulations // both sp & statepopulation point to same map
```
