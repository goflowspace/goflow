# Architheories

Domain-specific calculi and characterizations: Kind-CAL, KD-CAL, Creativity-CHR, Problem-CHR, etc.

## When to Load This Domain

**Load architheories when you need to:**
- Use domain-specific calculi (Kind-CAL, KD-CAL, etc.)
- Model epistemes and knowledge
- Design measurement systems
- Handle creativity and quality characterization

## Starter Patterns (Read First)

- **C.2** - KD-CAL (Episteme composition)
- **C.3** - Kind-CAL (Kinds and reasoning)
- **C.16** - Measurement CHR

## Core Pattern Clusters

**Episteme (C.2):**
- KD-CAL, Reliability, Formality

**Kinds (C.3):**
- Kind-CAL, KindBridge, RoleMask

**Measurement (C.13, C.16):**
- Mereology, Metrics

**Creativity (C.17-C.19):**
- Creativity-CHR, NQD-CAL, E/E-LOG

**Disciplines (C.20-C.25):**
- Discipline-CAL, Problem-CHR, Method SoS, Tool-use, Q-Bundle

## Related Domains

**Use together with:**
- **foundations** - for characteristics (A.17-A.19)
- **trust-evidence** - for epistemes (C.2, B.3)
- **sota** - for discipline packs (G.0-G.13)

## Patterns

| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |
|---------|-------|--------|---------------------------|--------------|------|
| [C.1](C.1_syscal.md) | Sys‑CAL | Draft | *Keywords:* physical system, composition, conservation laws, energy, mass, resources, U.System. *Queries:* "How to model physical systems in FPF?", "What are conservation laws in FPF?", "Modeling a pump or engine." | **Builds on:** A.1 Holonic Foundation, A.14. **Coordinates with:** Resrc-CAL. **Prerequisite for:** M-Sys-CAL. | 0.5 KB |
| [C.10](C.10_normcal.md) | Norm‑CAL | Draft | *Keywords:* norm, constraint, ethics, obligation, permission, deontics. *Queries:* "How to model rules and constraints?", "Where are ethical principles defined in FPF?". | **Builds on:** A.10. **Is used by:** Part D. | 0.4 KB |
| [C.11](C.11_decsncal.md) | Decsn‑CAL | Draft | *Keywords:* decision, choice, preference, utility, options. *Queries:* "How does FPF model decision-making?", "How to represent preferences and utility?". | **Builds on:** A.13. | 0.4 KB |
| [C.12](C.12_adrkind-cal.md) | ADR‑Kind-CAL | Draft | *Keywords:* versioning, rationale, DRR, architecture decision record. *Queries:* "How are changes to kinds managed?". | **Builds on:** Kind-CAL, E.9. | 0.4 KB |
| [C.13](C.13_constructional_mereology_composecal.md) | Constructional Mereology (Compose‑CAL) | Stable | *Keywords:* mereology, part-whole, composition, sum, set, slice, extensional identity. *Queries:* "How does FPF formally construct parts and wholes?", "What is Compose-CAL?". | **Builds on:** A.14. **Is used by:** B.3.5 (CT2R-LOG). | 23.1 KB |
| [C.14](C.14_msyscal.md) | M‑Sys‑CAL | Draft | *Keywords:* system-of-systems, infrastructure, large-scale systems, orchestration. *Queries:* "How to model a complex infrastructure like a power grid?". | **Builds on:** Sys-CAL, B.2.2. | 0.4 KB |
| [C.15](C.15_mkdcal.md) | M‑KD‑CAL | Draft | *Keywords:* paradigm, scientific discipline, meta-analysis, knowledge ecosystem. *Queries:* "How to model an entire field of science?". | **Builds on:** KD-CAL, B.2.3. | 0.4 KB |
| [C.16](C.16_measurement_metrics_characterization_mmchr.md) | Measurement & Metrics Characterization (MM‑CHR) | Stable | *Keywords:* measurement, measurement template, `U.DHCMethod(Ref)`, `U.Measure`, `U.Unit`, `U.EvidenceStub`, polarity, direct comparability (same-template), scoring method (𝒢) disclosure, CSLC. *Queries:* "How do I define a measurement template in FPF?", "What is direct comparability in MM-CHR?", "How do EvidenceStubs support measurement claims?" | **Builds on:** A.17, A.18. **Is a prerequisite for:** All CHR patterns (and any pattern that issues typed measures/scores). | 39.3 KB |
| [C.17](C.17_characterising_generative_novelty_value_creativitychr.md) | Characterising Generative Novelty & Value (Creativity‑CHR) | Stable | *Keywords:* creativity, novelty, value, surprise, innovation, ideation. *Queries:* "How does FPF measure creativity?", "What defines a novel idea?". | **Builds on:** CHR-CAL, MM-CHR. **Coordinates with:** NQD-CAL, E/E-LOG. | 56.8 KB |
| [C.18](C.18_openended_search_calculus_nqdcal.md) | Open‑Ended Search Calculus (NQD‑CAL) | Stable | *Keywords:* search, exploration, hypothesis generation, novelty, quality, diversity (NQD). *Queries:* "How does FPF support structured brainstorming?", "What is NQD search?". | **Builds on:** KD-CAL. **Coordinates with:** B.5.2.1, Creativity-CHR, E/E-LOG. | 9.7 KB |
| [C.18.1](C.18.1_scalinglaw_lens_binding_sll.md) | Scaling‑Law Lens Binding (SLL) | Stable | *Keywords:* scaling law, scale variables (S), compute‑elasticity, data‑elasticity, resolution‑elasticity, exponent class, knee, diminishing returns. *Queries:* "How to make search scale‑savvy?", "Where to declare scale variables and expected elasticities?" | **Builds on:** C.16, C.17, C.18. **Coordinates with:** C.19, G.5, G.9, G.10. | 8.8 KB |
| [C.19](C.19_exploreexploit_governor_eelog.md) | Explore–Exploit Governor (E/E‑LOG) | Stable | *Keywords:* explore-exploit, policy, strategy, decision lens, portfolio management. *Queries:* "How to balance exploration and exploitation?", "What is an EmitterPolicy?". | **Builds on:** Decsn-CAL. **Coordinates with:** NQD-CAL. | 9.8 KB |
| [C.19.1](C.19.1_bitterlesson_preference_blp.md) | Bitter‑Lesson Preference (BLP) | Stable | *Keywords:* general‑method preference, iso‑scale parity, scale‑probe, deontic override. *Queries:* "What is the default policy when a domain‑specific trick competes with a scalable general method?" | **Builds on:** C.19, C.24. **Coordinates with:** G.5, G.8, G.9, A.0. | 7.9 KB |
| [C.20](C.20_composition_of_udiscipline_disciplinecal.md) | Composition of `U.Discipline` (Discipline‑CAL) | Stable | *Keywords:* discipline, **U.AppliedDiscipline**, **U.Transdiscipline**, episteme corpus, standards, institutions, **Γ_disc**. *Queries:* "How to compose and assess a discipline in FPF?" | **Builds on:** C.2 KD‑CAL, G.0, Part F (Bridges/UTS). **Coordinates with:** C.21, C.23. | 11.5 KB |
| [C.21](C.21_field_health_structure_discipline-chr.md) | Field Health & Structure (Discipline-CHR) | Stable | *Keywords:* discipline, field health, reproducibility, standardisation, alignment, disruption. *Queries:* "How to measure the health of a scientific field?", "What is reproducibility rate?". | **Builds on:** C.16, C.2, A.2.6, B.3. **Coordinates with:** C.20, G.2. | 19.6 KB |
| [C.22](C.22_problem_typing_tasksignature_assignment_problem-chr.md) | Problem Typing & TaskSignature Assignment (Problem-CHR) | Stable |  | **Builds on:** C.16, G.5, G.0. **Coordinates with:** G.4, C.23. | 25.6 KB |
| [C.23](C.23_methodfamily_evidence_maturity_methodsoslog.md) | MethodFamily Evidence & Maturity (Method‑SoS‑LOG) | Stable | *Keywords:* MethodFamily, evidence, maturity, SoS-LOG, admit, degrade, abstain, selector. *Queries:* "How is method family maturity assessed?", "What is the SoS-LOG for selection?". | **Builds on:** G.5, G.4, C.22, B.3. | 23.2 KB |
| [C.24](C.24_agentic_tooluse_callplanning_cagenttoolscal.md) | Agentic Tool‑Use & Call‑Planning (C.Agent‑Tools‑CAL) | Stable |  | **Builds on:** C.5, C.18, C.19, B.3. **Coordinates with:** G.5, G.9. | 13.0 KB |
| [C.25](C.25_qbundle_authoring_ilities_as_structured_quality_bundles.md) | Q‑Bundle: Authoring “‑ilities” as Structured Quality Bundles | Stable |  | **Builds on:** A.2.6 (USM), A.6.1 (Mechanism), C.16 (MM-CHR) | 6.9 KB |
| [C.3](C.3_kinds_intentextent_and_typed_reasoning_kindcal.md) | Kinds, Intent/Extent, and Typed Reasoning (Kind‑CAL) | Stable | *Keywords:* kind, type, intension, extension, subkind, typed reasoning, classification, vocabulary. *Queries:* "How does FPF handle types?", "What is a 'Kind'?", "Difference between 'scope' and 'type'?". | **Builds on:** A.1, A.2.6 (USM). **Prerequisite for:** LOG-CAL, ADR-Kind-CAL, and any pattern needing typed guards. | 59.0 KB |
| [C.3.1](C.3.1_ukind_subkindof_core.md) | U.Kind & SubkindOf (Core) | Stable | *Keywords:* kind, subkind, partial order, type hierarchy. *Queries:* "What is U.Kind in FPF?", "How to model 'is-a' relationships?". | **Builds on:** A.1, A.2.6 (USM). **Prerequisite for:** C.3.2, C.3.3. | 9.2 KB |
| [C.3.2](C.3.2_kindsignature_f_extensionmemberof.md) | KindSignature (+F) & Extension/MemberOf | Stable | *Keywords:* KindSignature, intension, extension, MemberOf, Formality F, determinism. *Queries:* "How to define the meaning of a Kind?", "What is the difference between intent and extent in FPF?". | **Builds on:** C.3.1. **Prerequisite for:** C.3.3, C.3.4. | 15.1 KB |
| [C.3.3](C.3.3_kindbridge_clk_crosscontext_mapping_of_kinds.md) | KindBridge & CL^k — Cross‑context Mapping of Kinds | Stable | *Keywords:* KindBridge, type-congruence, CL^k, cross-context mapping, R penalty. *Queries:* "How to map types between domains?", "What is a KindBridge?". | **Builds on:** C.3.1, C.3.2, A.2.6, C.2.2. | 18.4 KB |
| [C.3.4](C.3.4_rolemask_contextual_adaptation_of_kinds_without_cloning.md) | RoleMask — Contextual Adaptation of Kinds (without cloning) | Stable | *Keywords:* RoleMask, context-local adaptation, constraints, subkind promotion. *Queries:* "How to adapt a Kind for a local context?", "What is a RoleMask in FPF?". | **Builds on:** C.3.1, C.3.2. | 16.4 KB |
| [C.3.5](C.3.5_kindat_intentional_abstraction_facet_for_kinds_k0k3.md) | KindAT — Intentional Abstraction Facet for Kinds (K0…K3) | Stable | *Keywords:* KindAT, abstraction tier, K0-K3, informative facet, planning. *Queries:* "What are the abstraction tiers for Kinds?", "How to plan formalization effort?". | **Builds on:** C.3.1. | 11.8 KB |
| [C.3.A](C.3.A_typed_guard_macros_for_kinds_usm_annex.md) | Typed Guard Macros for Kinds + USM (Annex) | Stable | *Keywords:* Typed guard, ESG, Method-Work, USM, Kind-CAL, regulatory profile. *Queries:* "How to write a typed guard?", "How do Kinds and USM interact in gates?". | **Builds on:** All C.3.x, A.2.6. | 52.8 KB |
| [C.4](C.4_methodcal.md) | Method‑CAL | Draft | *Keywords:* method, recipe, procedure, workflow, SOP, MethodDescription, operator. *Queries:* "How to model a process or workflow?", "What is a MethodDescription in FPF?". | **Builds on:** A.3, A.15. **Coordinates with:** Γ_method (B.1.5). | 0.5 KB |
| [C.5](C.5_resrccal.md) | Resrc‑CAL | Draft | *Keywords:* resource, energy, material, information, cost, budget, consumption, Γ_work. *Queries:* "How does FPF model resource usage?", "How to track costs of a process?". | **Builds on:** A.15.1 (Work). **Coordinates with:** Sys-CAL. | 0.5 KB |
| [C.6](C.6_logcal_core_logic_calculus.md) | LOG‑CAL – Core Logic Calculus | Draft | *Keywords:* logic, inference, proof, modal logic, trust operators, reasoning. *Queries:* "What is the base logic of FPF?", "How does FPF handle formal proofs?". | **Builds on:** Kind-CAL. **Is used by:** B.7. | 0.5 KB |
| [C.7](C.7_chrcal_characterisation_kit.md) | CHR‑CAL – Characterisation Kit | Draft | *Keywords:* characteristic, property, measurement, metric, quality. *Queries:* "How to define a new measurable property in FPF?", "What is a CHR pattern?". | **Builds on:** A.17, A.18. **Prerequisite for:** Agency-CHR, Creativity-CHR. | 0.5 KB |
| [C.9](C.9_agencychr.md) | Agency‑CHR | Draft | *Keywords:* agency, agent, autonomy, decision-making, active inference. *Queries:* "How to measure autonomy?", "What defines an agent in FPF?". | **Builds on:** CHR-CAL, A.13. | 0.4 KB |