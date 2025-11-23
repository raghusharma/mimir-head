#golang 
# Struct
- Collection of different data types that describe a single concept
- Keyed by named fields
- No inheritance, but can use composition via embedding
- Tags can be added to structs
```go
package main

import "fmt"

type Doctor struct {
	number     int
	actorName  string
	companions []string
}

func main() {
	aDoctor := Doctor{
		number:    3,
		actorName: "Jon Pertwee",
		companions: []string{
			"Liz Shaw",
			"Jo Grant",
			"Sarah Jane Smith",
		},
	}
	fmt.Println(aDoctor)
	fmt.Println(aDoctor.actorName)
}
```