# FPF Initial Execution Plan

This template defines the standard execution plan for any task.
The plan is loaded at task start and evolves during execution.

## Steps

1. **Detect language** (phase: DECOMPOSE)
   - Identify user's language from request
   - Expected: Language code (en, ru, etc.)

2. **FPF Analysis** (phase: DECOMPOSE)
   - Map request to FPF concepts (Holons, BoundedContexts, Roles, Method, Work)
   - Navigate to relevant domain index:
     - Understanding entities? → `references/fpf-patterns/foundations/index.md`
     - Planning/execution? → `references/fpf-patterns/transformation/index.md`
     - Problem-solving? → `references/fpf-patterns/reasoning/index.md`
     - Evaluating claims? → `references/fpf-patterns/trust-evidence/index.md`
     - Combining parts? → `references/fpf-patterns/aggregation/index.md`
   - Load specific patterns from domain as needed
   - Expected: FPF mapping and pattern IDs (B.5, A.10, etc.)

3. **Check available prompt templates** (phase: DECOMPOSE)
   - Does task match a standard FPF prompt?
     - Defining metrics? → [characterisation.md](../prompts/characterisation.md)
     - Standardizing terms? → [uts.md](../prompts/uts.md)
     - Naming issues? → [naming.md](../prompts/naming.md)
     - Architecture mapping? → [p2w.md](../prompts/p2w.md)
     - Discipline survey? → [sota.md](../prompts/sota.md)
   - If yes, load and adapt template
   - Expected: Prompt template or custom approach

4. **Execute task** (phase: EXECUTE, expandable: true)
   - Placeholder - will be expanded after decomposition
   - Expected: Task-specific actions

## Available Prompt Templates

Located in `references/prompts/`:
- **characterisation.md** - Project metrics & indicators
- **uts.md** - Unified term sheets for domains
- **naming.md** - Name Card development (F.18)
- **p2w.md** - Principles-to-Work flows (E.TGA)
- **sota.md** - State-of-the-art harvesting (Part G)
