# Constitution

FPF core principles, authoring guides, lexical discipline, and governance patterns.

## When to Load This Domain

**Load constitution when you need to:**
- Author FPF patterns and content
- Apply lexical discipline
- Understand FPF principles and rules
- Use multi-view publication kit

## Starter Patterns (Read First)

- **E.8** - Authoring Conventions
- **E.10** - Lexical Rules (LEX-BUNDLE)
- **E.2** - Eleven Pillars

## Core Pattern Clusters

**Vision & Principles (E.1-E.7):**
- Mission, Pillars, Principles, Architecture, Guardrails

**Authoring (E.8-E.10):**
- Conventions, DRR, Lexical rules

**Multi-View (E.17-E.18):**
- MVPK, Viewpoints, E.TGA

**Governance (E.19-E.20):**
- Quality gates, Mechanism protocol

## Related Domains

**Use together with:**
- **foundations** - for distinctions (A.7)
- **signature** - for signatures (A.6)
- **unification** - for lexicon (F.0-F.18)

## Patterns

| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |
|---------|-------|--------|---------------------------|--------------|------|
| [A.5](A.5_openended_kernel_extension_layering.md) | Open‑Ended Kernel & Extension Layering | Transitional stub | *Keywords:* FPF architecture, specialization vs dependancy hierarhies, modularity, extensibility. *Queries:* "What is the architecture of FPF?", "How are new domains added?" | **Builds on:** P-4, P-5. | 4.6 KB |
| [E.1](E.1_vision_mission_operating_system_for_thought.md) | Vision & Mission: “Operating System for Thought” | Stable | *Keywords:* vision, mission, operating system for thought, purpose, scope, goals, non-goals. *Queries:* "What is FPF?", "What is the purpose of the First Principles Framework?", "What problem does FPF solve?". | **Prerequisite for:** All other patterns, especially E.2. | 4.8 KB |
| [E.10](E.10_unified_lexical_rules_for_fpf_lexbundle.md) | Unified Lexical Rules for FPF (LEX‑BUNDLE) | Stable | *Keywords:* lexical rules, naming, registers, rewrite rules, process, function, service. *Queries:* "What is the complete set of FPF naming rules?". | **Builds on:** A.7, E.5, F.5. **Coordinates with:** A.2, A.10, A.15, B.1, B.3, Part F. | 77.0 KB |
| [E.10.D1](E.10.D1_lexical_discipline_for_context_dctx.md) | Lexical Discipline for “Context” (D.CTX) | Stable | *Keywords:* context, U.BoundedContext, anchor, domain, frame. *Queries:* "What is the formal meaning of 'Context' in FPF?". | **Builds on:** A.7, A.4. **Coordinates with:** F.1, F.2, F.3, F.7, F.9. | 12.9 KB |
| [E.10.D2](E.10.D2_intensiondescriptionspecification_discipline_ids.md) | Intension–Description–Specification Discipline (I/D/S) | Stable | *Keywords:* intension, description, specification, I/D/S, testable, verifiable. *Queries:* "Difference between a description and a specification in FPF?". | **Builds on:** A.7, E.10.D1, C.2.1, C.2.3. **Constrains:** F.4, F.5, F.8, F.9, F.15. | 36.7 KB |
| [E.10.P](E.10.P_conceptual_prefixes_policy_registry.md) | Conceptual Prefixes policy & registry | Stable | *Keywords:* prefixes, U., Γ_, ut:, tv:, namespace, registry. *Queries:* "What do the prefixes like 'U.' mean in FPF?". | **Depends on:** E.9. **Constrains:** E.5.1, E.5.2. | 2.4 KB |
| [E.12](E.12_didactic_primacy_cognitive_ergonomics.md) | Didactic Primacy & Cognitive Ergonomics | Stable | *Keywords:* didactic, cognitive load, ergonomics, usability, Rationale Mandate, HF-Loop. *Queries:* "How does FPF ensure it's understandable?", "What is the 'So What?' test in FPF?". | **Builds on:** E.2 (P-2). **Complements:** E.13. | 9.7 KB |
| [E.13](E.13_pragmatic_utility_value_alignment.md) | Pragmatic Utility & Value Alignment | Stable | *Keywords:* pragmatic, utility, value, Goodhart's Law, Proxy-Audit Loop, MVE. *Queries:* "How does FPF ensure solutions are useful, not just correct?", "What is a Minimally Viable Example (MVE)?". | **Builds on:** E.2 (P-7). **Complements:** E.12. | 10.0 KB |
| [E.14](E.14_humancentric_workingmodel.md) | Human‑Centric Working‑Model | Stable | *Keywords:* working model, human-centric, publication surface, grounding, assurance layers. *Queries:* "What is the main interface for FPF users?", "How does FPF separate human-readable models from formal assurance?". | **Builds on:** E.7, E.8, C.2.3. **Coordinates with:** B.3.5, C.13, E.10. | 31.2 KB |
| [E.15](E.15_lexical_authoring_evolution_protocol_lexauth.md) | Lexical Authoring & Evolution Protocol  (LEX‑AUTH) |  | *Keywords:* lexical authoring, evolution protocol, LAT, delta-classes. *Queries:* "How are FPF patterns authored and evolved?", "What is a Lexical Authoring Trace (LAT)?". | **Builds on:** E.9, E.10, B.4, C.18, C.19, A.10, B.3, F.15. | 13.2 KB |
| [E.16](E.16_rocautonomy_budget_enforcement.md) | RoC‑Autonomy Budget & Enforcement | Stable | *Keywords:* autonomy, budget, guarded enactment, ledger, SoD, override, UTS | *Queries:* "How is autonomy bounded and tested?", "How are overrides enforced under SoD?" | 17.1 KB |
| [E.17](E.17_multiview_publication_kit_for_morphisms.md) | Multi‑View Publication Kit (for Morphisms) | Stable |  | Builds on: A.7/E.10.D2 (Strict Distinction & I/D/S discipline; Surface orthogonality), A.6.2–A.6.3 (U.EffectFreeEpistemicMorphing, U.EpistemicViewing), C.2.1 (U.EpistemeSlotGraph; View/Viewpoint slots), E.17.0 (U.MultiViewDescribing), E.17.1 (U.ViewpointBundleLibrary), E.17.2 (TEVB), E.8 (Authoring conventions), E.10 (LEX-BUNDLE incl. L-SURF), Part F/G (UTS, CG-Spec, CHR pins, UNM). Used by / Coordinates with: E.18 (E.TGA — publication of morphisms via MVPK faces), Part G (SoTA pack shipping surfaces, EvidenceGraph views), tooling that emits human-readable cards/lanes over D/S-epistemes about morphisms. | 34.0 KB |
| [E.17.0](E.17.0_umultiviewdescribing_viewpoints_views_correspondences.md) | `U.MultiViewDescribing — Viewpoints, Views & Correspondences` | New |  | Builds on: C.2.1 (U.EpistemeSlotGraph; DescribedEntity/Viewpoint/View slots), A.6.2 (U.EffectFreeEpistemicMorphing), A.6.3 (U.EpistemicViewing), A.6.4 (U.EpistemicRetargeting), A.7 (Strict Distinction; I/D/S vs Surface), E.10.D1 (Context), E.10.D2 (I/D/S discipline). Used by: E.17 (MVPK — publication as a specialisation of multi-view describing for morphisms), E.17.1 (U.ViewpointBundleLibrary), E.17.2 (TEVB), E.18:5.12 (E.TGA engineering viewpoint families), domain-specific description schemes (architecture, safety cases, governance, research). | 26.6 KB |
| [E.17.1](E.17.1_uviewpointbundlelibrary_reusable_viewpoint_bundles.md) | `U.ViewpointBundleLibrary — Reusable Viewpoint Bundles` | Stable |  | Builds on: E.17.0 (U.MultiViewDescribing), C.2.1 (U.EpistemeSlotGraph; ViewpointSlot/ViewSlot), A.6.2–A.6.4 (episteme morphisms), A.7 (Strict Distinction; I/D/S vs Surface), E.7 (Archetypal Grounding), E.10/E.10.D1/D2 (LEX-BUNDLE & Context/I-D-S discipline). Used by: E.17.2 (TEVB — Typical Engineering Viewpoints Bundle), E.18:5.12 (E.TGA engineering viewpoint families), future domain-specific viewpoint packs (architecture, governance, safety, research). | 24.0 KB |
| [E.17.2](E.17.2_tevb_typical_engineering_viewpoints_bundle.md) | `TEVB — Typical Engineering Viewpoints Bundle` | Stable |  | Builds on: E.17.0 (U.MultiViewDescribing), E.17.1 (U.ViewpointBundleLibrary), C.2.1 (U.EpistemeSlotGraph; DescribedEntity/Viewpoint/View slots), A.1 (Holon; U.System/U.Episteme as typical EoI), A.6.2–A.6.4 (episteme morphisms), A.7/E.10.D2 (Strict Distinction & I/D/S discipline). Used by: E.18:5.12 (E.TGA engineering viewpoint families), E.17 (MVPK — publication of engineering morphisms via EngineeringVPId/PublicationVPId correspondences), engineering description/spec patterns and future ISO-aligned architecture description species. | 33.5 KB |
| [E.18](E.18_transduction_graph_architecture_etga.md) | Transduction Graph Architecture** (E.TGA) | Stable | *Keywords:* transduction graph, **nodes=morphisms**, **edge=U.Transfer** (single-edge kind), **OperationalGate(profile)**, **CV⇒GF** (ConstraintValidity → GateFit), **MVPK** faces, **SquareLaw**, **UNM single-writer**, **CSLC normalize-then-compare**, **Set-return selection**, **PathSlice/Sentinel refresh**, **DesignRunTag**. *Queries:* “What is E.TGA?”, “How do gates/bridges publish crossings?”, “How to model flows of morphisms?” | **Builds on:** E.17 (MVPK), E.8, E.10, A.7. **Coordinates with:** A.20–A.26 (Flow/GateProfilization/Profiles/Sentinels), F.9 (Bridges & CL), G.11 (Refresh). | 66.1 KB |
| [E.19](E.19_pattern_quality_gates_review_refresh_profiles.md) | Pattern Quality Gates: Review & Refresh Profiles | Stable | *Keywords:* pattern review, quality gates, admission, refresh, staleness, profile-based checks, PQG, PCP, suite-level review (PCP‑SUITE), planned baseline & P2W seam (PCP‑P2W), `SlotFillingsPlanItem`, MVPK projections, guard vs gate separation. *Queries:* "How to review a new FPF pattern before admitting it?", "How to refresh stale patterns in FPF?", "What are PQG/PCP in FPF?", "How to review a MechSuiteDescription (suite obligations, contract pins, protocols)?", "How to review SlotFillingsPlanItem / planned slot filling and its MVPK projections?" | **Builds on:** E.8, E.10, E.9, E.15. **Coordinates with:** F.8 (Mint/Reuse), F.18 (Naming protocol), F.9 (Bridges & CL), F.15 (Harness), E.17 (MVPK), A.6.7 (MechSuiteDescription), A.15.3 (SlotFillingsPlanItem), G.11 (Refresh). **Constrains:** Admission/refresh decisions for patterns intended for the canonical corpus. | 33.9 KB |
| [E.2](E.2_the_eleven_pillars.md) | The Eleven Pillars | Stable | *Keywords:* principles, constitution, pillars, invariants, core values, rules, P-1 to P-11. *Queries:* "What are the core principles of FPF?", "What are the eleven pillars?". | **Builds on:** E.1. **Prerequisite for:** E.3 and all normative patterns. | 14.2 KB |
| [E.20](E.20_mechanism_introduction_protocol.md) | Mechanism Introduction Protocol | Draft | *Keywords:* mechanism introduction, authoring protocol, owner routing, MIP-run manifest, canonical card-first, no dangling `…IntensionRef`, suite boundary hygiene, P2W seam, SlotKind lexicon discipline, alias docking, typed RSCR triggers, regression envelope, PQG profiles. *Queries:* "How to introduce a new mechanism in FPF?", "How to avoid dangling IntensionRefs in suites?", "How to route mechanism changes by semantic owner?", "How to evolve mechanism suites without drift?" | **Builds on:** E.8, E.9, E.10, E.15, E.19. **Coordinates with:** A.6.1, A.6.7, A.15.3, F.18, E.18, G.Core, G.2, `G.x:Ext.*`. **Constrains:** Any change-set that introduces or revises mechanisms, suites, planned baselines, wiring modules, or citeable tokens. | 30.1 KB |
| [E.3](E.3_principle_taxonomy_precedence_model.md) | Principle Taxonomy & Precedence Model | Stable | *Keywords:* taxonomy, precedence, conflict resolution, hierarchy, principles, classification, Gov, Arch, Epist, Prag, Did. *Queries:* "How does FPF resolve conflicting principles?", "What is the hierarchy of FPF rules?". | **Builds on:** E.2. **Constrains:** All patterns and DRRs. | 15.3 KB |
| [E.4](E.4_fpf_artefact_architecture.md) | FPF Artefact Architecture | Stable | *Keywords:* artifact, families, architecture, conceptual core, tooling, pedagogy, canon, tutorial, linter. *Queries:* "How are FPF documents structured?", "What is the difference between the core spec and tooling?". | **Builds on:** E.1. **Constrained by:** E.5.3. | 5.3 KB |
| [E.5](E.5_four_guardrails_of_fpf.md) | Four Guard‑Rails of FPF | Stable | *Keywords:* guardrails, constraints, architecture, rules, safety, GR-1 to GR-4. *Queries:* "What are the main architectural constraints in FPF?". | **Builds on:** E.2, E.3. **Prerequisite for:** E.5.1, E.5.2, E.5.3, E.5.4. | 6.2 KB |
| [E.5.1](E.5.1_devops_lexical_firewall.md) | DevOps Lexical Firewall | Stable | *Keywords:* lexical firewall, jargon, tool-agnostic, conceptual purity, DevOps, CI/CD, yaml. *Queries:* "Can I use terms like 'CI/CD' in FPF core patterns?". | **Refines:** E.5. **Constrains:** All Core patterns. | 3.7 KB |
| [E.5.2](E.5.2_notational_independence.md) | Notational Independence | Stable | *Keywords:* notation, syntax, semantics, tool-agnostic, diagram, UML, BPMN. *Queries:* "Does FPF require a specific diagram style?", "How is meaning defined in FPF?". | **Refines:** E.5. **Constrains:** All Core patterns. | 4.3 KB |
| [E.5.3](E.5.3_unidirectional_dependency.md) | Unidirectional Dependency | Stable | *Keywords:* dependency, layers, architecture, modularity, acyclic, Core, Tooling, Pedagogy. *Queries:* "What are the dependency rules between FPF artifact families?". | **Refines:** E.5. **Constrains:** E.4. | 4.5 KB |
| [E.5.4](E.5.4_crossdisciplinary_bias_audit.md) | Cross‑Disciplinary Bias Audit | Stable | *Keywords:* bias, audit, ethics, fairness, trans-disciplinary, neutrality, review. *Queries:* "How does FPF handle bias?", "Is there an ethics review process in FPF?". | **Refines:** E.5. **Constrains:** All Core patterns. **Links to:** Part D. | 4.3 KB |
| [E.6](E.6_didactic_architecture_of_the_specification.md) | Didactic Architecture of the Specification | Stable | *Keywords:* didactic, pedagogy, structure, narrative flow, on-ramp, learning. *Queries:* "How is the FPF specification structured for learning?", "What is the 'On-Ramp first' principle?". | **Builds on:** E.2 (P-2 Didactic Primacy). | 4.4 KB |
| [E.7](E.7_archetypal_grounding_principle.md) | Archetypal Grounding Principle | Stable | *Keywords:* grounding, examples, archetypes, U.System, U.Episteme, Tell-Show-Show. *Queries:* "How are FPF patterns explained?", "What are the standard examples in FPF?". | **Builds on:** E.6. **Constrains:** All architectural patterns. | 4.5 KB |
| [E.8](E.8_fpf_authoring_conventions_style_guide.md) | FPF Authoring Conventions & Style Guide | Stable | *Keywords:* authoring, style guide, conventions, template, S-rules, narrative flow. *Queries:* "How to write a new FPF pattern?", "What is the FPF style guide?". | **Builds on:** E.6, E.7. **Constrains:** All new patterns. | 27.2 KB |
| [E.9](E.9_designrationale_record_drr_method.md) | Design‑Rationale Record (DRR) Method | Stable | *Keywords:* DRR, design rationale, change management, decision record, context, consequences. *Queries:* "How are changes to FPF managed?", "What is a DRR?". | **Builds on:** E.2 (P-10 Open-Ended Evolution). **Constrains:** All normative changes. | 6.8 KB |