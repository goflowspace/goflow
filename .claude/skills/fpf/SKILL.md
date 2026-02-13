---
name: fpf
description: First Principles Framework - structured reasoning skill for any task requiring auditable thinking, evidence chains, systematic problem-solving, or holonic composition. Use FPF patterns to guide reasoning on engineering, research, and management tasks.
priority: high
auto_load: true
---

# FPF Thinking Skill

FPF is an "Operating System for Thought" - a rigorous architecture for thinking that ensures auditable reasoning, evidence-based decisions, and clear distinction between plans and execution.

## Start Here (Agent Entry)

- **Start here (references hub):** [references/index.md](references/index.md)
- **MUST**: follow the workflow → [references/guides/workflow.md](references/guides/workflow.md)
- **MUST**: structure work with the standard plan → [references/guides/initial-plan.md](references/guides/initial-plan.md)

## Pattern Selection Logic

**Start here to find the right patterns for your task:**

### By Task Type

**Modeling & Design:**
- System modeling → **foundations** (A.1 Entity/Holon, A.2 Roles) → **transformation** (A.15 Role-Method-Work)
- Interface design → **signature** (A.6 Signature Stack, A.6.5 Slot Discipline)
- Boundary definition → **signature** (A.6.B Boundary Norms, A.6.C Contract Unpacking)

**Analysis & Evaluation:**
- Reliability/trust evaluation → **trust-evidence** (B.3 F-G-R Calculus, C.2.2 Reliability)
- Evidence validation → **trust-evidence** (A.10 Evidence Graph, B.3.4 Evidence Decay)
- Metric design → **architheories** (C.16 Measurement, A.18 CSLC)

**Problem-Solving:**
- Creative ideation → **reasoning** (B.5.2 Abductive Loop, C.17 Creativity-CHR)
- Systematic reasoning → **reasoning** (B.5 Canonical Reasoning Cycle)
- Conflict resolution → **ethics** (D.5 Bias-Audit)

**Composition & Integration:**
- Combining parts → **aggregation** (B.1 Gamma Operator, B.2 Meta-Holon Transition)
- Cross-domain mapping → **unification** (F.9 Bridges, F.7 Concept-Set Table)
- Method composition → **aggregation** (B.1.5 Γ_method)

**Process & Execution:**
- Task planning → **transformation** (A.15.2 WorkPlan, A.3.2 MethodDescription)
- Work execution → **transformation** (A.15.1 Work, A.3 Transformer Quartet)
- State modeling → **foundations** (A.2.5 RoleStateGraph, A.19 CharacteristicSpace)

### By Domain (Load Order)

**Most common progression:**
1. **foundations** → understand entities, roles, distinctions
2. **transformation** → plan and execute work
3. **trust-evidence** → validate with evidence
4. **reasoning** OR **aggregation** → problem-solve or compose

**Specialized needs:**
- **signature** → when defining interfaces/boundaries (often with foundations)
- **architheories** → when domain-specific calculi needed (C.2-C.25)
- **constitution** → when authoring FPF content (E.8, E.10)
- **unification** → when bridging contexts (F.9, F.18)
- **sota** → when benchmarking or discipline-specific work (G.0-G.13)

## Core Workflow (B.5 Canonical Reasoning Cycle)

For every task:

1. **OBSERVE**: Understand request → identify task type above
2. **SEARCH**: Use domain selection logic → load relevant domain index
3. **LOAD**: Read specific patterns identified in domain index
4. **PLAN**: Reference pattern IDs in reasoning (MethodDescription)
5. **EXECUTE**: Deploy plan (Work), maintain strict Object≠Description distinction (A.7)
6. **AUDIT**: Log evidence chains (A.10), reference source patterns

## Navigation Hub

**Master patterns index:** [references/fpf-patterns/index.md](references/fpf-patterns/index.md) - domain overview with expanded guidance

**Maintenance rule:** Patterns whose TOC **Status** is exactly `Stub` are intentionally **excluded** from this skill (not decomposed, not indexed, not audited as missing).

**Domain indexes:**
- [foundations](references/fpf-patterns/foundations/index.md) - entities, roles, distinctions, characteristics
- [transformation](references/fpf-patterns/transformation/index.md) - methods, work, execution, evolution
- [reasoning](references/fpf-patterns/reasoning/index.md) - problem-solving, abduction, exploration
- [trust-evidence](references/fpf-patterns/trust-evidence/index.md) - F-G-R calculus, evidence graphs, reliability
- [aggregation](references/fpf-patterns/aggregation/index.md) - Gamma operator, meta-holon transitions, composition
- [signature](references/fpf-patterns/signature/index.md) - boundaries, interfaces, slot discipline, morphisms
- [architheories](references/fpf-patterns/architheories/index.md) - domain calculi (KD-CAL, Kind-CAL, etc.)
- [constitution](references/fpf-patterns/constitution/index.md) - FPF authoring rules, lexical discipline
- [unification](references/fpf-patterns/unification/index.md) - bridges, concept-sets, context mapping
- [ethics](references/fpf-patterns/ethics/index.md) - bias-audit, ethical assurance
- [sota](references/fpf-patterns/sota/index.md) - benchmarks, discipline packs, telemetry

## Available Prompt Templates

Ready-to-use prompt templates for common tasks → **[references/prompts/index.md](references/prompts/index.md)**

## Agent Navigation (MUST/SHOULD)

To avoid ontological drift and ensure you always start correctly, use the agent guides:

- **MUST**: [references/guides/workflow.md](references/guides/workflow.md) (execute for EVERY request)
- **MUST**: [references/guides/initial-plan.md](references/guides/initial-plan.md) (standard task execution plan)
- **SHOULD**: [references/guides/keywords.md](references/guides/keywords.md) (domain navigation & keywords)
- **SHOULD**: [references/guides/principles.md](references/guides/principles.md) (core pattern quick reference)

For the full structured navigation (guides vs prompts vs patterns vs scripts), go to:
- [references/index.md](references/index.md)

## Starter Patterns

**Must-read for any FPF usage:**
- **A.1** - Holonic Foundation (entity composition)
- **A.7** - Strict Distinction (avoid category errors: Object≠Description, Role≠Work)
- **A.10** - Evidence Graph (traceability)

**Most common by domain:**
- foundations: A.1, A.2, A.7
- transformation: A.3, A.15, A.15.1 (Work)
- reasoning: B.5, B.5.2 (Abduction)
- trust-evidence: B.3, A.10
- aggregation: B.1, B.2
- signature: A.6, A.6.5

## Critical Disciplines

**Always apply:**
- **Strict Distinction (A.7)**: Object ≠ Description ≠ Carrier; Role ≠ Work; Method ≠ MethodDescription
- **Evidence chains (A.10)**: Every claim needs evidence reference
- **Scope discipline (A.2.6)**: Explicit context boundaries
- **Role-Method-Work alignment (A.15)**: Clear separation of intent, plan, execution

## Core Terminology

Essential FPF terms for decomposition and reasoning.

### Ontological Core (Part A)

| Term | Pattern | Definition |
|------|---------|------------|
| **Holon** | A.1 | Entity that is simultaneously a whole AND a part. Everything in FPF is a holon. |
| **BoundedContext** | A.1.1 | Semantic frame where terms have meaning. Meaning is LOCAL to context. |
| **System** | A.1 | Physical/digital entity that can bear roles and execute work. |
| **Role** | A.2 | A mask/identity that a System wears. Role != behavior. |
| **RoleAssignment** | A.2.1 | Links a System to a Role within a BoundedContext. |
| **MethodDescription** | A.3.2 | Design-time recipe (plan/algorithm/SOP). Lives in T^D (design-time). NOT execution. |
| **Method** | A.3.1 | Instantiated MethodDescription ready for execution. |
| **Work** | A.15.1 | Run-time occurrence. Actual execution that happened. Dated, consumes resources. IMMUTABLE. |
| **Transformer** | A.12 | Agent that takes input and produces output. External = tool. Reflexive = self-modification. |
| **Episteme** | A.0 | Knowledge artifact with carriers (files, models, beliefs). |

### Core Principles (Part A)

| Principle | Pattern | Definition |
|-----------|---------|------------|
| **Strict Distinction** | A.7 | Map != Territory. Never confuse plan with execution. MethodDescription != Work. |
| **Evidence Graph** | A.10 | All claims need auditable evidence chains. Cite sources. |
| **Ontological Parsimony** | A.11 | Do not multiply entities beyond necessity. |
| **Cross-Scale Consistency** | A.9 | Rules apply at all scales (micro to macro). |

### Reasoning (Part B)

| Term | Pattern | Definition |
|------|---------|------------|
| **Aggregation (Gamma)** | B.1 | How parts combine into wholes. Multiple types: Gamma_sys, Gamma_epist, Gamma_work. |
| **Trust Calculus (F-G-R)** | B.3 | Formality (how rigorous), Granularity/Scope (how broad), Reliability (how trustworthy). |
| **Evidence Decay** | B.3.4 | Evidence loses reliability over time. Epistemic debt accumulates. |
| **Canonical Evolution Loop** | B.4 | OBSERVE -> REFINE -> DEPLOY -> AUDIT cycle. |
| **Canonical Reasoning Cycle** | B.5 | Abduction (hypothesis) -> Deduction (predict) -> Induction (test). |
| **Abduction** | B.5.2 | Generate hypotheses from observations. Creative inference. |
| **Deduction** | B.5 | Derive conclusions from premises. Logical necessity. |
| **Induction** | B.5 | Generalize from specific cases. Probabilistic. |

### Search Keywords

Use ONLY these keywords with `fpf_search_index()`:

```
holon, system, episteme, role, method, work, trust, evidence,
transformer, reliability, aggregation, assurance, reasoning,
budget, context, deduction, induction, abduction, formality,
evolution, agent
```

**Important:** DO NOT search for task-topic words (e.g., "AI agents", "web search"). FPF is a methodology, not a knowledge base about your task topic.
