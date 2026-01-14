---
title: Go Defer, Panic & Recover
status: half-baked
tags:
  - golang
---

# Defer
- Used to delay execution of a statement until function exits
- Useful to group open & close functions together
    - Be careful in loops. When you're opening & closing a bunch of resources in a loop, handle that closing without the keyword. Because when you close resources with defer, they are going to remain open until the end of the function, and that will open too many resources.
- Run in LIFO (last-in, first-out, think stack) order
- Arguments are evaluated at the time defer is executed, not at called function execution.

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello")
	defer fmt.Println("start")
	fmt.Println("world")
	defer fmt.Println("middle")
	defer fmt.Println("end")
}
```
Output:
```
Hello
world
end
middle
start
```

# Panic
- Go does not consider every type of error as exceptional event. Errors are normal in Go. In normal failure cases (for example, file that you are trying to open does not exist), error is preferred (error is an interface). For truly unrecoverable situations, panic is used, when execution cannot continue.
    - Another example of error is when you make an http request and you don't get a response from server (e.g. 404).
- Occur when the program cannot continue at all
    - Don't use when a file cannot be opened (unless it is critical file)
    - Use for unrecoverable events - cannot obtain TCP port for web server
- Function will stop executing
    - Deferred functions will still fire
    - Order -
        - deferred functions (LIFO order)
        - panic
- If nothing handles the panic, program will exit

```go
package main

import "fmt"

func main() {
	fmt.Println("Hello")
	defer fmt.Println("start")
	fmt.Println("world")
	defer fmt.Println("middle")
	defer fmt.Println("end")
	panic("Yo Yo!")
	fmt.Println("Honey Singh")
}
```
Output:
```
Hello
world
end
middle
start
panic: Yo Yo!

goroutine 1 [running]:
main.main()
	/home/ubuntu/failingforward/defer-panic.go:11 +0x128
exit status 2
```
# Recover
- If you have a panic situation that you can recover from, you can recover using builtin `recover` function
- Used to recover from panic
- Only useful in deferred functions
- Current function will not attempt to continue, but if you recover, higher functions in call stack will continue
    - If you don't want the higher functions to continue, you can rethrow that panic by calling panic function again