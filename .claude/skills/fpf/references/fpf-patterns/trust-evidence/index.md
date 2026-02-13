# Trust Evidence

Trust, reliability, and evidence patterns: F-G-R calculus, assurance levels, provenance.

## When to Load This Domain

**Load trust-evidence when you need to:**
- Evaluate reliability and trust
- Build evidence chains
- Assess formality levels
- Handle episteme composition

## Starter Patterns (Read First)

- **B.3** - F-G-R Trust Calculus
- **A.10** - Evidence Graph
- **C.2.2** - Reliability R

## Core Pattern Clusters

**Trust Calculus (B.3):**
- F-G-R, Assurance, Evidence decay, Working-model relations

**Episteme Composition (C.2):**
- KD-CAL, Reliability, Formality

## Related Domains

**Use together with:**
- **foundations** - for evidence roles (A.2.4)
- **transformation** - for work evidence (A.15.1)
- **reasoning** - for validation (B.5)

## Patterns

| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |
|---------|-------|--------|---------------------------|--------------|------|
| [A.10](A.10_evidence_graph_referring_c4.md) | Evidence Graph Referring (C‑4) | Stable | *Keywords:* evidence, traceability, audit, provenance, SCR/RSCR. *Queries:* "How are claims supported by evidence?", "How to ensure auditability?" | **Builds on:** A.1. **Prerequisite for:** B.3. | 18.7 KB |
| [B.3](B.3_trust_assurance_calculus_fgr_with_congruence.md) | Trust & Assurance Calculus (F–G–R with Congruence) | Stable | *Keywords:* trust, assurance, reliability, F-G-R, formality, scope, congruence, evidence. *Queries:* "How is trust calculated in FPF?", "What is the F-G-R model?", "How does FPF handle evidence and confidence?" | **Builds on:** A.10. **Prerequisite for:** All B.3.x, D.4. | 28.4 KB |
| [B.3.1](B.3.1_components_epistemic_spaces.md) | Components & Epistemic Spaces | Draft | *Keywords:* F-G-R components, measurement templates, epistemic space. *Queries:* "How are F, G, and R measured?", "What are epistemic spaces?" | **Builds on:** B.3. | 0.4 KB |
| [B.3.2](B.3.2_evidence_validation_logic_log-use.md) | Evidence & Validation Logic (LOG-use) | Draft | *Keywords:* verification, validation, confidence, logic, proof. *Queries:* "What is the logic for validating claims in FPF?", "Difference between verification and validation." | **Builds on:** B.3, C.6. | 0.5 KB |
| [B.3.3](B.3.3_assurance_subtypes_levels.md) | Assurance Subtypes & Levels | Stable | *Keywords:* assurance levels, L0-L2, TA, VA, LA, typing, verification, validation. *Queries:* "What are the assurance levels in FPF?", "How does an artifact mature in FPF?" | **Builds on:** B.3. | 11.2 KB |
| [B.3.4](B.3.4_evidence_decay_epistemic_debt.md) | Evidence Decay & Epistemic Debt | Stable | *Keywords:* evidence aging, decay, freshness, epistemic debt, stale data. *Queries:* "How does FPF handle outdated evidence?", "What is epistemic debt?" | **Builds on:** B.3. | 12.0 KB |
| [B.3.5](B.3.5_working-model_relations_grounding_ct2r-log.md) | Working-Model Relations & Grounding (CT2R-LOG) | Stable | *Keywords:* grounding, constructive trace, working model, assurance layer, CT2R, Compose-CAL. *Queries:* "How are FPF models grounded in evidence?", "What is the CT2R-LOG?" | **Builds on:** B.3, E.14, C.13. | 31.7 KB |
| [C.2](C.2_epistemic_holon_composition_kd-cal.md) | Epistemic holon composition (KD-CAL) | Stable | *Keywords:* knowledge, epistemic, evidence, trust, assurance, F-G-R, Formality, ClaimScope, Reliability, provenance. *Queries:* "What is F-G-R?", "How does FPF handle evidence and trust?", "How to model a scientific theory?". | **Builds on:** A.1, A.10, B.3. **Prerequisite for:** All patterns using F-G-R, M-KD-CAL. | 13.4 KB |
| [C.2.1](C.2.1_uepisteme_epistemes_and_their_slot_graph.md) | U.Episteme — Epistemes and their slot graph | Stable | *Keywords:* episteme, EpistemeSlotGraph, DescribedEntitySlot, GroundingHolonSlot, ClaimGraphSlot, ViewpointSlot, ReferenceScheme, RepresentationScheme, View/Viewpoint. *Queries:* "What is an episteme in FPF?", "How are DescribedEntity, ClaimGraph, GroundingHolon and Viewpoint organised as slots?", "How do KD-CAL epistemes connect to views/viewpoints and multi-view descriptions?" | **Builds on:** C.2 (KD-CAL), A.1 (Holonic Foundation), A.6.5 (U.RelationSlotDiscipline), E.10.D2 (I/D/S discipline). **Used by:** A.6.2–A.6.4 (U.EffectFreeEpistemicMorphing / U.EpistemicViewing / U.EpistemicRetargeting), E.17.0–E.17.2 (U.MultiViewDescribing, Viewpoint bundles, TEVB), E.17 (MVPK), B.1.3 (Γ_epist), discipline-packs that define or consume epistemes. | 60.4 KB |
| [C.2.2](C.2.2_reliability_r_in_the_fgr_triad.md) | Reliability R in the F–G–R triad | Stable | *Keywords:* Reliability (R), warrant, evidence-bound, F–G–R, ClaimScope (G), Bridge-only reuse, Congruence Level (CL / CL^k / CL^plane), weakest-link, pathwise justification (PathId), TA/VA/LA lanes, no implicit averaging. *Queries:* "What is R in F–G–R?", "How does FPF propagate reliability?", "How do CL penalties route under transport?", "Bridge-only reuse of claims in FPF". | **Builds on:** C.2, A.2.6, C.2.3, B.3, B.1.3, C.3, F.9. **Coordinates with:** G.6, G.7, E.14, E.18. **Constrains:** any cross-context claim reuse and any publication of `R_eff`. | 37.1 KB |
| [C.2.3](C.2.3_unified_formality_characteristic_f.md) | Unified Formality Characteristic F | Stable | *Keywords:* Formality, F-scale, F0-F9, rigor, proof, specification, formal methods. *Queries:* "What are the FPF formality levels?", "How to measure the rigor of a specification?". | **Builds on:** C.2. **Constrains:** All patterns referencing F-G-R. | 37.3 KB |