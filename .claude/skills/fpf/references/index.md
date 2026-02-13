# FPF References (Navigation Hub)

This directory contains **reference materials** for the FPF skill. It is organized into distinct artifact types to prevent ontological drift:

- **Guides (runbooks)**: how an agent should operate (MUST/SHOULD rules).
- **Prompt templates**: copy/paste templates for common tasks.
- **FPF patterns**: the full progressive-disclosure spec (domains → patterns).
- **Scripts**: maintenance automation for this skill’s files.

## Recommended agent entry path (MUST/SHOULD)

1. **MUST**: start with `skills/fpf/SKILL.md` (high-level overview + entry points).
2. **MUST**: follow the workflow: **[guides/workflow.md](guides/workflow.md)**.
3. **MUST**: structure work using: **[guides/initial-plan.md](guides/initial-plan.md)**.
4. **SHOULD**: use navigation aids when needed:
   - **[guides/keywords.md](guides/keywords.md)**
   - **[guides/principles.md](guides/principles.md)**
5. Then choose what you need below.

## Choose your next hop

- **How to run (runbooks / mandatory guides)** → **[guides/index.md](guides/index.md)**
- **Copy/paste prompt templates** → **[prompts/index.md](prompts/index.md)**
- **Deep FPF patterns (domains → patterns)** → **[fpf-patterns/index.md](fpf-patterns/index.md)**
- **Maintenance scripts (skill upkeep)** → **[../scripts/index.md](../scripts/index.md)**

## Notes for maintainers

- Keep `SKILL.md` short and stable: it should link here plus MUST runbooks.
- Keep detailed navigation lists inside the relevant `index.md` files in this `references/` tree.
