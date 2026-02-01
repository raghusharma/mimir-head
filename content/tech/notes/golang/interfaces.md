#golang 
# What are Interfaces?
Interfaces are a type, that define a set of method signatures, (not data).
- While structs define data, interfaces define behavior.
- Interfaces only include the message signatures, not actual implementation
```go
type Speaker interface {
    Speak() string
}
```
- These are mostly used with structs, but they can also be used with any custom types.
# Implementing interfaces
- Unlike some languages like Java, the `implements` keyword is not required. Go implicitly implements the interfaces if any type has defined the methods.
```go
type Dog struct {}
type Cat struct {}

func (d Dog)Speak() string {
    return "Woof!"
}

func (c Cat)Speak() string {
    return "Meow!"
}
```
- Both Dog & Cat satisfy/implement Speaker interface implicitly as they both have `Speak() string` method defined.
- Now you can use a `Speaker` variable and assign any value to it that implements it like this:
```go
var s Speaker
s := Dog{}
```
- Realistic example:
```go
func announce(s Speaker) {
    fmt.Println(s.Speak())
}

func main() {
    d := Dog{}
    c := Cat{}
    announce(d)
    announce(c)
}
```
Output:
```text
Woof!
Meow!
```

# Interfaces provide Polymorphism
- Thus interfaces provide polymorphic behavior in Go. They let you write code that works with many types
```go
package main

import (
	"fmt"
	"math"
)

type shape interface {
	area() float64
}

type circle struct{ radius float64 }
type square struct{ side float64 }

func (c circle) area() float64 { return math.Pi * c.radius * c.radius }
func (s square) area() float64 { return s.side * s.side }

func printArea(s shape) {
	fmt.Println(s.area())
}

func main() {
	c := circle{radius: 2}
	s := square{side: 3}
	printArea(c)
	printArea(s)
}
```

# Interface composition (Embedding interfaces)
Interfaces can be composed of other interfaces
```go
type writer interface {
    write(data string)
}

type reader interface {
    read()
}

type readerWriter interface {
    reader
    writer
}
```
Now, any type that implements both `writer` and `reader` interface (i.e. have `write` & `read` methods) automatically implement `readerWriter`.

# Type Assertion / Type Conversion
You can check if the interface variable holds specific type of object by trying to convert/typecast the object to one of the type that implements that interface.
```go
var s Speaker = Dog {}

dog, ok := s.(Dog)
if ok {
    fmt.Println("This is a Dog.", dog.Speak())
}
```
Output:
```text
This is a Dog. Woof!
```

```go
cat, ok := s.(Cat) // This doesn't work
if ok {
    fmt.Println("This is a cat.", cat.Speak())
}
```
# Type Switch
The [[if-switch#Type switch|type switch]] can check for multiple types as opposed to single type [[#Type Assertion / Type Conversion|above]]:
```go
package main

import "fmt"

type Dog struct{}
type Cat struct{}

type Speaker interface {
	Speak() string
}

func (d Dog) Speak() string {
	return "Woof!"
}

func (c Cat) Speak() string {
	return "Meow!"
}

func detectType(s Speaker) {
	switch s.(type) {
	case Dog:
		fmt.Println("Dog type")
	case Cat:
		fmt.Println("Cat type")
	}
}

func main() {
	var s Speaker
	s = Cat{}
	detectType(s)
	s = Dog{}
	detectType(s)
}

```

# The empty interface
- An interface with no methods defined (and no name)
- Every type implements the empty interface
- Can be used to accept any type into the function (as argument)
- `fmt.Println` probably accepts this interface
```go
package main  
  
import "fmt"  
  
func describe(i interface{}) {  
    fmt.Printf("(Value: %v, Type: %T)\n", i, i)  
}  
  
func main() {  
    describe(5)  
    describe("hello")  
    describe(true)  
    describe(nil)  
}
```
Output:
```text
(Value: 5, Type: int)
(Value: hello, Type: string)
(Value: true, Type: bool)
(Value: <nil>, Type: <nil>)
```

# Value vs Pointer Receiver
The methods associated with the value type and pointer type are different.

```go
package main

import "fmt"

type shower interface {
	show()
}

type increaser interface {
	increment()
}

type counter struct {
	value int
}

func (c counter) show() {
	fmt.Println("value:", c.value)
}

func (c *counter) increment() {
	c.value++
}

func main() {
	var s shower = counter{value: 1} // works
	fmt.Println(s)
	var i increaser = &counter{value: 0} // works
	fmt.Println(i)
	var i2 increaser = counter{value: 0} // Panic. does not work
	fmt.Println(i2)
}
```

- `counter` (value type) implements only `shower`, and not `increaser`
    - It has only `show()`
- Whereas `*counter` (pointer) implements both `shower` and `increaser`
    - It has both `show()` and `increment()`

