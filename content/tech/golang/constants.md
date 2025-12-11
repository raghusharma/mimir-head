---
title: Go Constants
publish: "true"
status: half-baked
tags:
  - golang
---

- Immutable, but can be shadowed (even type can be changed in the function)
- Replaced by the compiler at compile time
    - Value must be calculable at compile time
- Named like variables
    - PascalCase for exported
    - camelCase for internal
- Typed constants (`const a int = 2`) work like immutable variables
    - Can interoperate only with the same type
- Untyped constants (`const a = 2`) work like literals
    - Can interoperate with similar types
- Enumerated constants
    - Special symbol `iota` allows related constants to be created easily
    - `iota` starts at 0 in each const block and increments by 1
    - Watch out for constant values that match 0 values for variables
- Enumerated expressions
    - Operations that can be determined at compile time are allowed
        - Arithemetic
        - Bitwise operations
        - Bitshifting