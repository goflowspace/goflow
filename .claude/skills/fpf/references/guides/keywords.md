# FPF Navigation Guide

## Preferred: Domain-Based Navigation

Navigate by domain for targeted pattern discovery:

| Need | Domain | Index Path |
|------|--------|------------|
| Understanding entities, roles | foundations | `references/fpf-patterns/foundations/index.md` |
| Planning, execution | transformation | `references/fpf-patterns/transformation/index.md` |
| Problem-solving, reasoning | reasoning | `references/fpf-patterns/reasoning/index.md` |
| Evidence, reliability | trust-evidence | `references/fpf-patterns/trust-evidence/index.md` |
| Composition, emergence | aggregation | `references/fpf-patterns/aggregation/index.md` |
| Interfaces, boundaries | signature | `references/fpf-patterns/signature/index.md` |
| Domain calculi | architheories | `references/fpf-patterns/architheories/index.md` |

## Alternative: Keyword Search

Use with `fpf_search_index()` when domain unclear:

**Core Concepts:**
```
holon, system, episteme, role, method, work, trust, evidence,
transformer, reliability, aggregation, assurance, reasoning,
budget, context, deduction, induction, abduction, formality,
evolution, agent
```

**Prompt-Specific Keywords:**
```
characterisation, indicators, measurement, scales, scoring,
uts, terminology, naming, aliases, bounded-context,
p2w, architecture, transduction, flow, e-tga,
sota, traditions, operators, benchmarks, discipline
```

DO NOT search for task-topic words (e.g., "AI agents", "web search", "Python").
FPF is a METHODOLOGY for thinking, not a knowledge base about your task topic.

## Task-Specific Navigation

**Need to:** Define project metrics → See [characterisation.md](../prompts/characterisation.md)  
**Need to:** Standardize terminology → See [uts.md](../prompts/uts.md)  
**Need to:** Rename entities → See [naming.md](../prompts/naming.md)  
**Need to:** Map principles to work → See [p2w.md](../prompts/p2w.md)  
**Need to:** Survey discipline → See [sota.md](../prompts/sota.md)

## See Also

- [workflow.md](workflow.md) - Complete FPF workflow
- [principles.md](principles.md) - Core pattern reference
- [initial-plan.md](initial-plan.md) - Task execution template
