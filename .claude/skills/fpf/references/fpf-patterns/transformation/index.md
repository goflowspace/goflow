# Transformation

Action and change patterns: methods, work records, execution cycles, and evolution.

## When to Load This Domain

**Load transformation when you need to:**
- Plan and execute tasks (Method, Work, WorkPlan)
- Distinguish design-time from run-time
- Model execution and evolution cycles
- Align roles with methods and work

## Starter Patterns (Read First)

- **A.3** - Transformer Quartet (Method/MethodDescription/Work)
- **A.15** - Role-Method-Work Alignment
- **A.15.1** - Work (execution records)

## Core Pattern Clusters

**Transformer Quartet (A.3-A.3.3):**
- Method, MethodDescription, Dynamics

**Role-Method-Work (A.15):**
- Work records, WorkPlan, SlotFillingsPlanItem

**Evolution (A.4, B.4):**
- Temporal duality, Evolution cycles

## Related Domains

**Use together with:**
- **foundations** - for roles (A.2)
- **trust-evidence** - for work validation (B.3)
- **reasoning** - for planning (B.5)

## Patterns

| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |
|---------|-------|--------|---------------------------|--------------|------|
| [A.15](A.15_rolemethodwork_alignment_contextual_enactment.md) | Role–Method–Work Alignment (Contextual Enactment) | Stable | *Keywords:* enactment, alignment, plan vs reality, design vs run, MIC, WorkPlan. *Queries:* "How do roles, methods, and work connect?", "How does an intention become an action in FPF?" | **Integrates:** A.2, A.3, A.4. **Prerequisite for:** all operational models. | 18.8 KB |
| [A.15.1](A.15.1_uwork.md) | U.Work | Stable | *Keywords:* execution, event, run, actuals, log, occurrence. *Queries:* "What is a Work record?", "Where are actual resource costs stored?" | **Refines:** A.15. **Used by:** B.1.6, all Part D. | 30.4 KB |
| [A.15.2](A.15.2_uworkplan.md) | U.WorkPlan | Stable | *Keywords:* plan, schedule, intent, forecast. *Queries:* "How to model a plan or schedule?", "Difference between a WorkPlan and a MethodDescription." | **Refines:** A.15. **Informs:** `U.Work`. | 10.2 KB |
| [A.15.3](A.15.3_slotfillingsplanitem.md) | SlotFillingsPlanItem | Stable | *Keywords:* planned baseline, slot owner, planned filler, edition pins, `Γ_time` selector, guard pins, WorkPlanning, P2W seam, variance trail. *Queries:* "What is SlotFillingsPlanItem in FPF?", "How to keep planned slot filling separate from FinalizeLaunchValues?", "How to pin editions and time in WorkPlanning baselines?" | **Builds on:** A.15.2, A.6.5, E.10.D1, E.17, E.18, E.19. **Used by:** A.6.7 (suite contract pins), Part G universalization, suite/kit specialised baselines. | 36.1 KB |
| [A.3](A.3_transformer_constitution_quartet.md) | Transformer Constitution (Quartet) | Stable | *Keywords:* action, causality, change, System-in-Role, MethodDescription, Method, Work. *Queries:* "How does FPF model an action or a change?", "What is the transformer quartet?" | **Builds on:** A.2. **Prerequisite for:** A.3.1, A.3.2, A.15. | 17.4 KB |
| [A.3.1](A.3.1_umethod.md) | U.Method | Stable | *Keywords:* recipe, how-to, procedure, abstract process. *Queries:* "What is a Method in FPF?", "Difference between Method and Work." | **Refines:** A.3. **Prerequisite for:** A.15. | 20.3 KB |
| [A.3.2](A.3.2_umethoddescription.md) | U.MethodDescription | Stable | *Keywords:* specification, recipe, SOP, code, model, epistemic artifact. *Queries:* "How to document a procedure?", "What is a MethodDescription?" | **Refines:** A.3. **Informs:** A.15. | 19.9 KB |
| [A.3.3](A.3.3_udynamics.md) | `U.Dynamics` | Stable | *Keywords:* state evolution, model, simulation, state space. *Queries:* "How to model state transitions or system dynamics?", "Difference between a Method and Dynamics." | **Builds on:** A.19. **Informs:** B.4. | 16.3 KB |
| [A.4](A.4_temporal_duality_openended_evolution_principle.md) | Temporal Duality & Open‑Ended Evolution Principle | Stable | *Keywords:* design-time, run-time, evolution, versioning, lifecycle, continuous improvement. *Queries:* "How does FPF handle plan vs. reality?", "How are systems updated?" | **Builds on:** P-10 Open-Ended Evolution. **Prerequisite for:** B.4. | 7.6 KB |
| [B.4](B.4_canonical_evolution_loop.md) | Canonical Evolution Loop | Stable | *Keywords:* continuous improvement, evolution, Run-Observe-Refine-Deploy, PDCA, OODA. *Queries:* "How do systems evolve in FPF?", "What is the canonical evolution loop?" | **Builds on:** A.4, A.12. **Prerequisite for:** All B.4.x. | 12.9 KB |
| [B.4.1](B.4.1_system_instantiation.md) | System Instantiation | Stable | *Keywords:* field upgrade, physical system evolution, deployment. *Queries:* "How are physical systems updated in FPF?" | **Builds on:** B.4, A.1. | 0.4 KB |
| [B.4.2](B.4.2_knowledge_instantiation.md) | Knowledge Instantiation | Stable | *Keywords:* theory refinement, knowledge evolution, scientific method. *Queries:* "How are scientific theories refined in FPF?" | **Builds on:** B.4, A.1. | 0.4 KB |
| [B.4.3](B.4.3_method_instantiation.md) | Method Instantiation | Stable | *Keywords:* adaptive workflow, process improvement, operational evolution. *Queries:* "How do workflows or methods evolve in FPF?" | **Builds on:** B.4, A.3.1. | 0.4 KB |