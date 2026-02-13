# Aggregation

Composition and emergence patterns: Gamma operator, meta-holon transitions, mereology, dependency graphs.

## When to Load This Domain

**Load aggregation when you need to:**
- Combine parts into wholes
- Handle meta-transitions and emergence
- Compose methods or systems
- Model dependencies and composition

## Starter Patterns (Read First)

- **B.1** - Gamma Operator (Γ)
- **B.2** - Meta-Holon Transition
- **B.1.5** - Γ_method (method composition)

## Core Pattern Clusters

**Gamma Operator (B.1):**
- System/episteme/method/work aggregation
- Dependency graphs

**Meta-Transitions (B.2):**
- MHT, MST, MET, MFT
- Supervisor-subholon

## Related Domains

**Use together with:**
- **foundations** - for holons (A.1)
- **transformation** - for work aggregation (A.15)
- **reasoning** - for compositional reasoning (B.5)

## Patterns

| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |
|---------|-------|--------|---------------------------|--------------|------|
| [A.14](A.14_advanced_mereology_components_portions_aspects_phases.md) | Advanced Mereology: Components, Portions, Aspects & Phases | Stable | *Keywords:* mereology, part-of, ComponentOf, PortionOf, PhaseOf, composition. *Queries:* "How to model different kinds of 'part-of' relationships?" | **Refines:** A.1. **Prerequisite for:** B.1.1. | 27.0 KB |
| [B.1](B.1_universal_algebra_of_aggregation_γ.md) | Universal Algebra of Aggregation (Γ) | Stable | *Keywords:* aggregation, composition, holon, invariants, IDEM, COMM, LOC, WLNK, MONO, gamma operator. *Queries:* "How does FPF combine parts into a whole?", "What are the rules for aggregation?", "What is the Gamma (Γ) operator?" | **Builds on:** A.1, A.9. **Prerequisite for:** All B.1.x, B.2. | 16.0 KB |
| [B.1.1](B.1.1_dependency_graph_proofs.md) | Dependency Graph & Proofs | Stable | *Keywords:* dependency graph, proofs, structural aggregators, sum, set, slice. *Queries:* "What is the input for the Gamma operator?", "How are aggregation invariants proven in FPF?" | **Builds on:** B.1. | 27.9 KB |
| [B.1.2](B.1.2_systemspecific_aggregation_γ_sys.md) | System‑specific Aggregation Γ\_sys | Stable | *Keywords:* system aggregation, physical systems, mass, energy, boundary rules, Sys-CAL. *Queries:* "How to aggregate physical systems?", "Conservation laws in FPF aggregation?" | **Builds on:** B.1, A.1, C.1. | 12.0 KB |
| [B.1.3](B.1.3_γ_epist_-_knowledgespecific_aggregation.md) | Γ_epist - Knowledge‑Specific Aggregation | Stable | *Keywords:* knowledge aggregation, epistemic, provenance, trust, KD-CAL. *Queries:* "How to combine knowledge artifacts?", "How does trust propagate in FPF?" | **Builds on:** B.1, A.1, C.2. | 26.0 KB |
| [B.1.4](B.1.4_contextual_temporal_aggregation_γ_ctx_γ_time.md) | Contextual & Temporal Aggregation (Γ\_ctx & Γ\_time) | Stable | *Keywords:* temporal aggregation, time-series, order-sensitive, composition. *Queries:* "How does FPF handle time-series data?", "How to model processes where order matters?" | **Builds on:** B.1. | 22.2 KB |
| [B.1.5](B.1.5_γ_method_ordersensitive_method_composition_instantiation.md) | Γ_method — Order‑Sensitive Method Composition & Instantiation | Stable | *Keywords:* method composition, workflow, sequential, concurrent, plan vs run. *Queries:* "How to combine methods or workflows?", "How does FPF model complex procedures?" | **Builds on:** B.1, B.1.4, A.3.1. | 21.8 KB |
| [B.1.6](B.1.6_γ_work_work_as_spent_resource.md) | Γ\_work — Work as Spent Resource | Stable | *Keywords:* work, resource aggregation, cost, energy consumption, Resrc-CAL. *Queries:* "How to calculate the total cost of a process?", "How are resources aggregated in FPF?" | **Builds on:** B.1, A.15.1, C.5. | 22.4 KB |
| [B.2](B.2_metaholon_transition_mht_recognizing_emergence_and_reidentifying_wholes.md) | Meta‑Holon Transition (MHT): Recognizing Emergence and Re‑identifying Wholes | Stable | *Keywords:* emergence, MHT, meta-system, new whole, synergy, system of systems. *Queries:* "How does FPF model emergence?", "What is a Meta-Holon Transition?", "When does a collection become more than the sum of its parts?" | **Builds on:** B.1, A.1. **Prerequisite for:** All B.2.x. | 23.8 KB |
| [B.2.1](B.2.1_bosc_triggers.md) | BOSC Triggers | Draft | *Keywords:* BOSC, triggers for emergence, boundary, objective, supervisor, complexity. *Queries:* "What triggers an MHT?", "What are the BOSC criteria for emergence?" | **Builds on:** B.2. | 0.4 KB |
| [B.2.2](B.2.2_meta-system_transition_mst.md) | Meta-System Transition (MST) | Stable | *Keywords:* system emergence, super-system, physical emergence. *Queries:* "How do new systems emerge from parts?", "What is a Meta-System Transition?" | **Builds on:** B.2, B.2.1, A.1. | 11.2 KB |
| [B.2.3](B.2.3_meta-epistemic_transition_met.md) | Meta-Epistemic Transition (MET) | Stable | *Keywords:* knowledge emergence, meta-theory, paradigm shift, scientific revolution. *Queries:* "How do new theories emerge?", "What is a Meta-Epistemic Transition?" | **Builds on:** B.2, B.2.1, A.1. | 23.2 KB |
| [B.2.4](B.2.4_meta-functional_transition_mft.md) | Meta-Functional Transition (MFT) | Stable | *Keywords:* functional emergence, capability emergence, adaptive workflow, new process. *Queries:* "How do new capabilities or workflows emerge?", "What is a Meta-Functional Transition?" | **Builds on:** B.2, B.2.1, A.3.1. | 16.1 KB |
| [B.2.5](B.2.5_supervisorsubholon_feedback_loop.md) | Supervisor–Subholon Feedback Loop | Stable | *Keywords:* control architecture, feedback loop, supervisor, stability, layered control. *Queries:* "How does FPF model control systems?", "What is the supervisor-subholon pattern?" | **Builds on:** B.2, A.1. | 13.2 KB |