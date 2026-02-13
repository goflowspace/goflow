# Foundations

Core ontological concepts: holons, entities, roles, characteristics, and fundamental distinctions.

## When to Load This Domain

**Load foundations when you need to:**
- Model entity structure and composition (systems, parts, wholes)
- Define roles and responsibilities (what things DO vs what they ARE)
- Avoid category errors (Object ≠ Description, Role ≠ Work)
- Establish evidence chains and traceability
- Measure and characterize system properties
- Model state spaces and dynamics

## Starter Patterns (Read First)

Essential patterns for FPF usage:

- **A.1** - Holonic Foundation: understand entity/holon composition
- **A.2** - Role Taxonomy: distinguish identity from function
- **A.7** - Strict Distinction: avoid mixing Objects, Descriptions, Carriers; Roles and Work
- **A.10** - Evidence Graph: build evidence chains and traceability

## Core Pattern Clusters

**Ontological Foundation (A.1-A.2):**
- A.1 - Entity/Holon/System composition
- A.1.1 - BoundedContext for local meaning
- A.2 - Role taxonomy and assignment

**Role Mechanics (A.2.1-A.2.9):**
- A.2.1 - RoleAssignment (Holder#Role:Context)
- A.2.5 - RoleStateGraph (state machines)
- A.2.6 - Unified Scope Mechanism (applicability)

**Constitutional Principles (A.7-A.14):**
- A.7 - Strict Distinction (category error avoidance)
- A.8 - Universal Core (transdisciplinarity)
- A.10 - Evidence Graph (traceability)

**Characteristics & Measurement (A.17-A.21):**
- A.17-A.18 - Characteristic/Scale/Level/Coordinate (CSLC)
- A.19 - CharacteristicSpace (state modeling)
- A.19.CN through A.19.SelectorMechanism - CHR mechanism suite

## Related Domains

**Use together with:**
- **transformation** - to execute work based on roles (A.15)
- **signature** - to define interfaces and boundaries (A.6)
- **trust-evidence** - to validate with evidence (B.3)
- **aggregation** - to compose holons (B.1, B.2)

## Patterns

| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |
|---------|-------|--------|---------------------------|--------------|------|
| [A.0](A.0_onboarding_glossary_nqd_eelog.md) | Onboarding Glossary (NQD & E/E‑LOG) | Stable | *Keywords:* novelty, quality‑diversity (NQD), explore/exploit (E/E‑LOG), portfolio (set), illumination map (report‑only telemetry), parity run, comparability, ReferencePlane, CL^plane, ParetoOnly default. *Queries:* "What is NQD in FPF?", "How does FPF handle creative generation?", "What is an explore-exploit policy in FPF?" | **Builds on:** E.2, A.5, C.17–C.19. **Coordinates with:** E.7, E.8, E.10; F.17; G.5, G.9–G.12. **Constrains:** Any pattern/UTS row that describes a generator, selector, or portfolio. | 17.0 KB |
| [A.1](A.1_holonic_foundation_entity_holon.md) | Holonic Foundation: Entity → Holon | Stable | *Keywords:* part-whole composition, system boundary, entity, holon, U.System, U.Episteme. *Queries:* "How does FPF model a system and its parts?", "What is a holon?", "Difference between entity and system." | **Builds on:** P-8 Cross-Scale Consistency. **Prerequisite for:** A.1.1, A.2, A.14, B.1. | 19.8 KB |
| [A.1.1](A.1.1_uboundedcontext_the_semantic_frame.md) | `U.BoundedContext`: The Semantic Frame | Stable | *Keywords:* local meaning, context, semantic boundary, domain, invariants, glossary, DDD. *Queries:* "How does FPF handle ambiguity?", "What is a Bounded Context in FPF?", "How to define rules for a specific project?" | **Builds on:** A.1. **Prerequisite for:** A.2.1, F.0.1. | 22.7 KB |
| [A.11](A.11_ontological_parsimony_c5.md) | Ontological Parsimony (C‑5) | Stable | *Keywords:* minimalism, simplicity, Occam's razor, essential concepts. *Queries:* "How does FPF avoid becoming too complex?", "Rule for adding new concepts." | **Builds on:** P-1 Cognitive Elegance. **Constrains:** all new `U.Type` proposals. | 10.4 KB |
| [A.12](A.12_external_transformer_reflexive_split.md) | External Transformer & Reflexive Split | Stable | *Keywords:* causality, agency, self-modification, external agent, control loop. *Queries:* "How to model a self-healing or self-calibrating system?", "What is the external transformer principle?" | **Builds on:** A.3. **Prerequisite for:** B.2.5. | 14.9 KB |
| [A.13](A.13_the_agential_role_agency_spectrum.md) | The Agential Role & Agency Spectrum | Stable | *Keywords:* agency, autonomy, AgentialRole, Agency-CHR, decision-making. *Queries:* "How is agency modeled in FPF?", "What is the agency spectrum?" | **Builds on:** A.2. **Refined by:** C.9 Agency-CHR. | 16.5 KB |
| [A.17](A.17_canonical_characteristic_achrnorm.md) | Canonical “Characteristic” (A.CHR‑NORM) | Stable | *Keywords:* characteristic, measurement, property, attribute, dimension, axis. *Queries:* "What is the correct term for a measurable property?", "How to define a metric?" | **Prerequisite for:** A.18, A.19, C.16. | 22.5 KB |
| [A.18](A.18_minimal_cslc_in_kernel_characteristic_scale_level_coordinate_acslckernel.md) | Minimal CSLC in Kernel (Characteristic ⟷ Scale ⟷ Level ⟷ Coordinate) (A.CSLC‑KERNEL) | Stable | *Keywords:* CSLC, scale, level, coordinate, measurement Standard. *Queries:* "What is the CSLC Standard?", "How to ensure measurements are comparable?" | **Builds on:** A.17. **Prerequisite for:** all metric-based patterns. | 31.3 KB |
| [A.19](A.19_characteristicspace_dynamics_hook_achrspace.md) | CharacteristicSpace & Dynamics Hook (A.CHR‑SPACE) | Stable | *Keywords:* state space, CharacteristicSpace, dynamics, state model, RSG. *Queries:* "How to define a system's state space?", "How does FPF model change over time?" | **Builds on:** A.17, A.18, A.2.5. **Prerequisite for:** A.3.3. | 63.7 KB |
| [A.19.CHR](A.19.CHR_chrmechanismsuite.md) | CHRMechanismSuite | Stable | *Keywords:* CHR suite, characterization core, CN-Spec, CG-Spec, legality gate, suite obligations, set-return selection, tri-state guard decision, crossing visibility, Bridge-only transport, penalties→R_eff, planned baseline, `SlotFillingsPlanItem`, P2W seam, no hidden scalarization, no hidden thresholds. *Queries:* "What is CHRMechanismSuite in FPF?", "How do CHR mechanisms cite CN-Spec/CG-Spec?", "How to enforce planned slot filling in WorkPlanning only?", "How to keep UNM/UINDM/ULSAM explicit (no hidden tails)?" | **Builds on:** A.6.7, A.15.3, A.6.1, A.6.5, A.19, G.0, E.18, E.10, E.19. **Coordinates with:** A.21, G.5, G.10, C.23. **Used by:** Part G universalization; CHR mechanism stacks. | 51.0 KB |
| [A.19.CN](A.19.CN_cnframe_comparability_normalization.md) | CN‑frame (comparability & normalization) | Stable | *Keywords:* CN-frame, CN-Spec, chart, comparability modes, normalization refs, indicator policy refs, Γ-fold governance, registry, bridges, CL/loss notes, WLNK discipline, conformance checklist, SCR/RSCR harness, RSG admission hooks. *Queries:* "What is a CN-frame in FPF?", "How does CN-Spec govern comparability and normalization by reference?", "How do CN-frames use bridges and CL for cross-context reuse?", "What are the conformance and regression checks for CN-frames?" | **Builds on:** A.19. **Coordinates with:** A.6.1 (mechanism intension cards), C.16 (evidence/backing), F.9 (Bridges & CL), G.0 (CG-Spec legality gate). | 35.5 KB |
| [A.19.CPM](A.19.CPM_unified_comparison_mechanism_cpm.md) | Unified Comparison Mechanism (CPM) | Stable | *Keywords:* comparison, comparator, `ComparatorSpecRef`, `ComparatorSet`, set-valued comparison outcome, partial order, tri-state admissibility (`pass | degrade | 34.2 KB |
| [A.19.SelectorMechanism](A.19.SelectorMechanism_unified_selection_kernel_selectormechanism.md) | Unified Selection Kernel, SelectorMechanism | Stable | *Keywords:* selection kernel, set-returning selection, portfolio set, `SelectEligibility`, tri-state guard (`pass | degrade | 37.0 KB |
| [A.19.UINDM](A.19.UINDM_unified_indicatorization_mechanism_uindm.md) | Unified Indicatorization Mechanism (UINDM) | Stable | *Keywords:* indicatorization, indicator set, `IndicatorChoicePolicy`, `CN-Spec.indicator_policy`, CHR suite stage `indicatorize`, tri-state admissibility (`pass | degrade | 27.0 KB |
| [A.19.ULSAM](A.19.ULSAM_unified_lawful_scale_aggregation_mechanism_ulsam.md) | Unified Lawful Scale Aggregation Mechanism (ULSAM) | Stable | *Keywords:* lawful aggregation, scale-lawful fold, `fold_Γ?`, `ΓFoldRef`, `CG-Spec.Γ_fold`, `CG-Spec.SCP`, `MinimalEvidence`, tri-state guard (`pass | degrade | 30.5 KB |
| [A.19.UNM](A.19.UNM_unified_normalization_mechanism_unm.md) | Unified Normalization Mechanism (UNM) | Stable | *Keywords:* normalization, `CV→NCV`, `≡_UNM`, `NormalizationMethodId`, `NormalizationMethodInstanceId`, `NormalizationInvariant[*]`, `NormalizationFixSpec`, validity window (no implicit “latest”), fail-closed tri-state guard (`pass | degrade | 34.6 KB |
| [A.19.USCM](A.19.USCM_unified_scoring_mechanism_uscm.md) | Unified Scoring Mechanism, USCM | Stable | *Keywords:* scoring, score profile, `ScoringMethodDescription`, ScaleComplianceProfile (SCP), CSLC-lawful transforms, `CG-Spec.MinimalEvidence`, tri-state admissibility (`pass | degrade | 31.9 KB |
| [A.2](A.2_role_taxonomy.md) | Role Taxonomy | Stable | *Keywords:* role, assignment, holder, context, function vs identity, responsibility, U.RoleAssignment. *Queries:* "How to model responsibilities?", "What is the difference between what a thing *is* and what it *does*?" | **Builds on:** A.1, A.1.1. **Prerequisite for:** A.2.1-A.2.6, A.13, A.15. | 22.9 KB |
| [A.2.1](A.2.1_uroleassignment_contextual_role_assignment.md) | U.RoleAssignment: Contextual Role Assignment | Stable | *Keywords:* Standard, holder, role, context, RoleEnactment, RCS/RSG. *Queries:* "How to formally assign a role in FPF?", "What is the Holder#Role:Context Standard?" | **Refines:** A.2. **Prerequisite for:** A.15. | 41.0 KB |
| [A.2.2](A.2.2_ucapability.md) | U.Capability | Stable | *Keywords:* ability, skill, performance, action, work scope, measures. *Queries:* "How to separate ability from permission?", "What is a capability in FPF?" | **Builds on:** A.2. **Informs:** A.15, A.2.3. | 21.3 KB |
| [A.2.3](A.2.3_userviceclause_service_clause.md) | `U.ServiceClause` (Service Clause) | Stable | *Keywords:* service clause, promise content, accessSpec, acceptanceSpec, SLO, SLA, claim scope (G), Work evidence, provider/consumer roles, deprecated alias `U.Service`. *Queries:* "What is a service clause in FPF?", "Service clause vs Work vs MethodDescription", "How do access and acceptance differ?", "How is SLO/SLA adjudicated from Work evidence?" | **Builds on:** A.2.2. **Prerequisite for:** F.12. **Used by:** A.2.8, A.6.C, A.6.8. | 24.9 KB |
| [A.2.4](A.2.4_uevidencerole.md) | `U.EvidenceRole` | Stable | *Keywords:* evidence, claim, support, justification, episteme. *Queries:* "How does an episteme serve as evidence?", "Modeling evidence roles." | **Builds on:** A.2. **Informs:** A.10, B.3. | 26.5 KB |
| [A.2.5](A.2.5_urolestategraph_the_named_state_space_of_a_role.md) | U.RoleStateGraph: The Named State Space of a Role | Stable | *Keywords:* state machine, RSG, role state, enactability, lifecycle. *Queries:* "How to model the state of a role?", "What is a Role State Graph?" | **Builds on:** A.2.1. **Prerequisite for:** A.15. | 38.6 KB |
| [A.2.6](A.2.6_unified_scope_mechanism_usm_context_slices_scopes.md) | Unified Scope Mechanism (USM): Context Slices & Scopes | Stable | *Keywords:* scope, applicability, ClaimScope (G), WorkScope, set-valued. *Queries:* "How to define the scope of a claim or capability?", "What is G in F-G-R?" | **Builds on:** A.1.1. **Constrains:** A.2.2, A.2.3, B.3. | 68.8 KB |
| [A.2.7](A.2.7_urolealgebra_incontext_role_relations.md) | U.RoleAlgebra: In‑Context Role Relations | New | *Keywords:* role algebra, specialization (`≤`), incompatibility (`⊥`), bundles (`⊗`), separation of duties (SoD), requiredRoles substitution. *Queries:* "What does `RoleS ≤ RoleG` mean in FPF?", "How do I encode Separation of Duties with `⊥`?", "How do role bundles (`⊗`) work?" | **Builds on:** A.2. **Prerequisite for:** A.15, A.2.5. | 3.6 KB |
| [A.2.8](A.2.8_ucommitment_deontic_commitment_object.md) | `U.Commitment` (Deontic Commitment Object) | Stable | *Keywords:* commitment, deontics, obligation/permission/prohibition, modality normalization, scope+validity window, adjudication hooks, evidenceRefs, BCP‑14 (RFC 2119/8174). *Queries:* "How to represent MUST/SHALL as a lintable object?", "How to keep deontics separate from admissibility gates?", "How to make commitments auditable via evidence hooks?" | **Refines:** A.2. **Builds on:** A.2.1, A.2.3, A.2.6, A.7, A.15.1. **Used by:** A.6.B (Quadrant D), A.6.C. | 23.5 KB |
| [A.2.9](A.2.9_uspeechact_communicative_work_object.md) | `U.SpeechAct` (Communicative Work Object) | Stable | *Keywords:* speech act, communicative work, approval/authorization/publication/revocation, provenance, act≠utterance≠carrier, judgement context, window/freshness, institutes.*. *Queries:* "How to model approvals/authorizations as Work?", "How to separate act vs utterance vs carrier?", "How to link commitments to instituting acts without commitment-by-publication?" | **Refines:** A.2. **Builds on:** A.2.1, A.2.6, A.7, A.10, A.15.1. **Used by:** A.2.8, A.6.C (utterance/instituting-act hook). | 22.9 KB |
| [A.20](A.20_uflowconstraintvalidity_eulerian.md) | U.Flow.ConstraintValidity — Eulerian | Stable | *Keywords:* flow, ConstraintValidity, Eulerian, TransductionFlow, GateFit, MVPK, SquareLaw, Sentinel, PathSlice. *Queries:* "What is ConstraintValidity in FPF?", "What is the Eulerian stance in FPF flows?", "How does E.TGA relate to flows?" | **Builds on:** E.18 (E.TGA). **Coordinates with:** A.21, A.22, A.25, A.27, A.28, A.31, A.45. | 31.3 KB |
| [A.21](A.21_gateprofilization_operationalgateprofile_gatefit_core.md) | GateProfilization: `OperationalGate(profile)` (GateFit core) | Stable | *Keywords:* OperationalGate, GateFit, GateProfile, GateChecks, join-semilattice, `GateDecision`, `DecisionLog`, EquivalenceWitness, LaunchGate, CV⇒GF. *Queries:* "What is GateProfilization in FPF?", "How does OperationalGate aggregate GateChecks?", "What is the CV⇒GF activation predicate?" | **Builds on:** E.18 (E.TGA), E.17 (MVPK), A.7. **Coordinates with:** A.20, A.23, A.24, A.25, A.26, A.27, A.41. | 27.6 KB |
| [A.7](A.7_strict_distinction_clarity_lattice.md) | Strict Distinction (Clarity Lattice) | Stable | *Keywords:* category error, Object ≠ Description, Role ≠ Work, ontology. *Queries:* "How to avoid common modeling mistakes?", "What are FPF's core distinctions?" | **Builds on:** A.1, A.2, A.3. **Constrains:** all patterns. | 36.1 KB |
| [A.8](A.8_universal_core_principle_c1.md) | Universal Core Principle (C‑1) | Stable | *Keywords:* universality, transdisciplinary, domain-agnostic, generalization. *Queries:* "How does FPF ensure its concepts are universal?" | **Builds on:** P-8. **Constrains:** Kernel-level `U.Type`s. | 11.0 KB |
| [A.9](A.9_crossscale_consistency_c3.md) | Cross‑Scale Consistency (C‑3) | Stable | *Keywords:* composition, aggregation, holarchy, invariants, roll-up. *Queries:* "How do rules compose across different scales?", "How to aggregate metrics safely?" | **Builds on:** A.1, A.8. **Prerequisite for:** B.1. | 9.3 KB |