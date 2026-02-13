# Naming via F.18 (Name Cards)

## Goal

Design better names for roles, programs, artefacts when existing labels are misleading or inadequate.

## Prompt Template

```
Using F.18, develop a complete Name Card for what to call <current name of an Entity> in the following situation:  
<short narrative of current practice and complaints about existing name>  
Do not assume current names are correct; perform an honest search on the local Pareto-front of candidate names and explain trade-offs.
```

## Related Patterns

- **F.18** - Local-First Unification & Naming Protocol (Name Cards)
- **F.17** - Unified Term Sheet (UTS)
- **F.5** - Naming Discipline for UTypes & Roles
- **A.2** - Role Constitution & Assignment

## When to Use

- Existing name causes confusion or misalignment
- Integrating systems with conflicting terminology
- Renaming after discovering semantic collision
- Creating names for new roles, services, or artifacts

## Name Card Components

A complete Name Card includes:
- **Current Names**: What it's called now (with complaints)
- **Candidate Names**: 3-5 alternatives on Pareto front
- **Trade-offs**: Pros/cons of each candidate
- **Recommendation**: Best choice with rationale
- **Context Sensitivity**: How name works in different bounded contexts
- **Migration Path**: How to transition from old name to new

## Naming Anti-Patterns to Avoid

- **Fashion-driven**: Using trendy terms without semantic grounding
- **Alphabet soup**: Acronyms that obscure meaning (e.g., "XYZMS")
- **False friends**: Terms that look familiar but mean something different
- **Overloading**: Reusing names that already have distinct meanings

## See Also

- [uts.md](uts.md) - For creating domain-wide terminology standards
- [workflow.md](../guides/workflow.md) - For systematic naming analysis
