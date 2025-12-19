---
title: Goroutines
publish: "true"
status: notion
tags:
  - golang
---
Goroutines are very powerful feature of Go, that makes it stand apart from other languages.
Goroutines are the threads in Go that you can use for concurrency.
# Threads in other languages
The threads that traditional languages use are the OS threads, which are expensive to create and destroy, and have a large memory footprint (1-2 Mb allocated to per thread)
Goroutines are actually an abstraction over traditional OS threads, which are very very lightweight (~2Kb), and are very easy to create and destroy. These make Go programs very efficient to create millions of threads, without performance impact. This will not be possible with threads in traditional languages (Java, C#, Python, Ruby, etc.). However modern releases of the languages are catching up to Goroutines, for example, Java has introduced virtual threads (with Project Loom) which are very similar to Goroutines.
# Create a Goroutine
Goroutine can be created by writing `go` keyword before a function call. It will create a new Goroutine and that Goroutine will execute the function.
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
If we run the above program, we don't get any output. The `main()` function itself is executed in a goroutine. The main function creates a goroutine (on line 13 when calling `sayMsg`), and then continues to execute the rest of the program. Since there is nothing else to execute, it exits as soon as the goroutine is created. The goroutine didn't get time to execute, so nothing is printed.
Let's give the goroutine some time to execute, and let the main function wait for some time.

> [!important]
> The method used here, `Sleep`, is a terrible way to do things, and should never be used in production for use cases like these)

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
	go sayMsg()
	time.Sleep(100 * time.Millisecond)
}
```
Now "Hello Go" gets printed.
# Closures & Goroutines
## The Problem
Consider the following closure:
```go
package main

import (
	"fmt"
	"time"
)

func main() {
	msg := "Hello"
	go func() {
		fmt.Println(msg)
	}()
	msg = "Goodbye"
	time.Sleep(100 * time.Millisecond)
}
```
"Goodbye" gets printed, and not "Hello", contrary to what is expected.
This is because the closure is trying to access a variable from outside, and the memory location is updated with some other value (line 13) before it gets the chance to print it.
## The Solution
This makes it risky to access the variables in the closure from outside. A better way is to pass the variable, so that the function prints the local copy of the variable, and any changes to the variable outside will not affect it.
```go
package main

import (
	"fmt"
	"time"
)

func main() {
	msg := "Hello"
	go func(msg string) {
		fmt.Println(msg)
	}(msg)
	msg = "Goodbye"
	time.Sleep(100 * time.Millisecond)
}
```
# Synchronization
## Wait groups
The sleep used to force the program to wait for a specified time, so that the goroutine created in the main function gets enough time to execute. The actual time required by the goroutine could be much less than what is provided in the sleep duration. (It could also take longer).
We want the code to exit as soon as the goroutines created by the main functions exit. It should wait just enough time for the goroutines to complete.
In Go, wait groups are just for this type of scenarios. Wait groups wait for multiple goroutines to finish.
```go
package main

import (
	"fmt"
	"sync"
)

var wg = sync.WaitGroup{}

func main() {
	msg := "Hello"
	wg.Add(1)
	go func(msg string) {
		fmt.Println(msg)
		wg.Done()
	}(msg)
	msg = "Goodbye"
	wg.Wait()
}
```
Here, we create a wait group on line 8.
