# UTS (Unified Term Sheet) for a Domain

## Goal

Build a disciplined vocabulary for a niche field using FPF Part F unification patterns.

## Prompt Template

```
You have the FPF specification loaded.  
Produce a Unified Term Sheet (UTS) block for the core terms of <your domain>: at least 10 rows.  
Use F.17 and F.18: distinguish Tech vs Plain names, show SenseCells for 2–3 key bounded contexts, and flag risky aliases.
```

## Follow-up for Quantitative Structure

```
For the same domain, propose a Q-bundle that captures the quality of <your object/process> and produce a UTS block for its characteristics (CHR) and indicators.
```

## Related Patterns

- **F.17** - Unified Term Sheet (UTS)
- **F.18** - Local-First Unification & Naming Protocol
- **F.7** - Concept-Set Table
- **F.3** - Intra-Context Sense Clustering

## When to Use

- Standardizing terminology across a domain or organization
- Integrating vocabularies from multiple sources or traditions
- Preventing semantic drift and ontological confusion
- Creating glossaries for cross-functional teams

## UTS Structure

A UTS typically includes:
- **Tech Name**: Formal, disambiguated term
- **Plain Name**: Everyday language equivalent
- **SenseCells**: How term is understood in different bounded contexts
- **Aliases**: Known alternative names (with risk flags)
- **Definition**: Precise meaning within the UTS

## See Also

- [naming.md](naming.md) - For designing individual term names
- [workflow.md](../guides/workflow.md) - For terminology analysis in reasoning cycle
- Core FPF terminology available in main SKILL.md
