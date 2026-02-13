# P2W (Principles to Work) Paths with E.TGA

## Goal

Make "from principles to work" explicit for a concrete project using Transduction Graph Architecture.

## Prompt Template

```
Using E.TGA and TEVB, unpack the canonical P2W flow for my situation <describe your project>.  
Give the list of nodes (P1…Pn), their Kinds, and explain each node in engineer-manager language.
```

## Follow-up: Flow Specification

```
Now build a mini Flow specification table for this P2W graph.
```

## Related Patterns

- **E.TGA** - Transduction Graph Architecture (E.18)
- **E.TEVB** - Typical Engineering Viewpoints Bundle (E.17.2)
- **B.4** - Canonical Evolution Cycle
- **A.15** - Work Constitution & Planning

## When to Use

- Tracing how principles translate into concrete work
- Understanding dependencies between design decisions
- Auditing whether work aligns with stated principles
- Documenting architecture decision rationale

## P2W Node Types

Common node kinds in P2W graphs:
- **P (Principle)**: Fundamental constraint or commitment
- **D (Decision)**: Architectural choice point
- **R (Requirement)**: Derived specification
- **M (Method)**: Procedure or algorithm
- **W (Work)**: Actual execution or artifact

## P2W Flow Characteristics

- **Eulerian**: Every edge (reasoning step) is traversed exactly once
- **Auditable**: Each transition has explicit evidence
- **Typed**: Nodes have formal kinds with validation rules
- **Compositional**: Flows can be nested and aggregated

## See Also

- [characterisation.md](characterisation.md) - For defining characteristics that feed into P2W
- [workflow.md](../guides/workflow.md) - For integrating P2W analysis into reasoning
- [principles.md](../guides/principles.md) - For core FPF patterns used in P2W
