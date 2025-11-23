Goroutines are very powerful feature of Go, that makes it stand apart from other languages.
- Goroutines are the threads in Go that you can use for concurrency.
- The threads that traditional languages use are the OS threads, which are expensive to create and destroy, and have a large memory footprint (1-2 Mb allocated to per thread)
- Goroutines are actually an abstraction over traditional OS threads, which are very very lightweight (~2Kb), and are very easy to create and destroy. These make Go programs very efficient to create millions of threads, without performance impact. This will not be possible with threads in traditional languages (Java, C#, Python, Ruby, etc.). Although modern releases of the languages are catching up to Goroutines like concepts, for example, Java has introduced virtual threads (Project Loom) which are very similar to Goroutines.
- The `main()` function itself is executed in a Goroutine

# Create a Goroutine
- Goroutine can be created by writing `go` keyword before a function call. It will create a new Goroutine and that Goroutine will execute the function.
```go
package main

import (
	"fmt"
	"time"
)

func sayMsg() {
	fmt.Println("Hello Go")
}

func main() {
	go sayMsg() // Hello Go doesn't get printed
}
```
If we run the above program, we don't get any output.

# The Problem with using closures (with Goroutines)