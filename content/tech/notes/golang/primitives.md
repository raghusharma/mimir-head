---
title: Go Primitives
status: half-baked
tags:
  - golang
---
# Numeric types
## Integers/Booleans
**Integers:** int, int8, int16, int32, int64
**Unsigned integers:** uint, uint8, uint16, uint32
**Boolean:** true/false

Mathematical expressions across primitives are not allowed, for example:

```go
var a int = 10
var b int8 = 5
fmt.Println(a + b) // Not allowed between int and int8
c := 3.0 // treated as float64 (on my system, on some other system, it might be float32)
fmt.Println(a / c) // Not allowed between int and float64
```

### Integer arithmetic operations:
```go
a := 10
b := 3
fmt.Println(a + b) // add
fmt.Println(a - b) // subtract
fmt.Println(a * b) // multiply
fmt.Println(a / b) // divide
fmt.Println(a % b) // remainder (1)
```
### Bitwise & Bitshift operators on Integers
```go
a := 10 // 1010
b := 3  // 0011
fmt.Println(a & b) // 0010, AND
fmt.Println(a | b) // 1011, OR
fmt.Println(a ^ b) // 1001, XOR(Exclusive OR)
fmt.Println(a &^ b)// 0100, AND NOT (opposite of OR)

c := 8
fmt.Println(c << 3) // shift 3 bits to left (8 x 2^3, 64)
fmt.Println(c >> 3) // shift 3 bits to right (8 / 2^3, 1)
```

## Floating point numbers
float32 & float64
Literal Styles:
- Decimal (3.14)
- Exponential (13e18 or 2E10)
- Mixed (13.7e12)
remainder & bitwise operations not allowed on floats.
Arithemetic operators:
- Addition, subtraction, multiplication, division.
- Among same types (not across float32 and float64)
## Complex numbers
complex64 and complex128 only (internally uses float32+float32 or float64+float64 for real and imaginary parts)
```go
var n complex64 = 1 + 2i
fmt.Printf("%T %v\n", n, n)
```
### Operations:
```go
a := 1 + 2i
b := 2 + 5.2i
fmt.Println(a + b)
fmt.Println(a - b)
fmt.Println(a * b)
fmt.Println(a / b)
```
### Fetch real / imaginary parts of the complex number:
```go
var n complex64 = 1 + 2i
fmt.Printf("%T %v\n", real(n), real(n))
fmt.Printf("%T %v\n", imag(n), imag(n))
```

```go
complex(5,12) // creates and returns a complex number 5+12i
```

# Text types
- Strings
    - UTF-8
    - Immutable
    - Can be concatenated with plus (+) operator
    - Can be converted to []byte
- Rune
    - UTF-32
    - Represented by single quotes `r := 'a'` or `var r rune = 'a'`
    - Alias for int32
    - Special methods normally required to process
        - e.g. strings.Reader # ReadRune
