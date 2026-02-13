# Sota

State-of-the-art patterns: discipline packs, benchmarks, telemetry, CG-frames.

## When to Load This Domain

**Load sota when you need to:**
- Build discipline packs
- Benchmark and compare methods
- Harvest state-of-the-art practices
- Design CG-frames and telemetry

## Starter Patterns (Read First)

- **G.0** - CG-Spec Governance
- **G.2** - SoTA Harvester
- **G.5** - Multi-Method Dispatcher

## Core Pattern Clusters

**Core (G.Core, G.0):**
- Invariants, CG-Spec

**Authoring (G.1-G.4):**
- Generator, Harvester, CHR authoring, CAL authoring

**Operations (G.5-G.7):**
- Dispatcher, Evidence graph, Bridge calibration

**Orchestration (G.8-G.13):**
- SoS-LOG, Parity, Shipping, Refresh, DHC, Interop

## Related Domains

**Use together with:**
- **architheories** - for CHR/CAL (C.2, C.3, C.16-C.25)
- **foundations** - for characteristics (A.17-A.19)
- **trust-evidence** - for evidence (B.3, A.10)

## Patterns

| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |
|---------|-------|--------|---------------------------|--------------|------|
| [G.0](G.0_frame_standard_and_comparability_governance_cgspec.md) | Frame Standard and Comparability Governance — CG‑Spec | Stable | *Keywords:* CG-Spec, CG-Frame, legality gate, ComparatorSet, ScaleComplianceProfile (SCP), MinimalEvidence, Γ-fold, Φ(CL), Φ_plane, CL-routing, ReferencePlane, edition pins, RSCRTriggerKindId. *Queries:* "What is CG-Spec in FPF?", "How does CG-Spec constrain lawful comparison and aggregation?", "What must be pinned for CG-Spec reproducibility?" | **Builds on:** G.Core, A.19 (CN-Spec), A.10, A.17–A.19 / C.16 (MM-CHR legality), A.18 (CSLC), B.3, Part F (Bridges/UTS), E.10, E.5.2. **Prerequisite for:** G.1–G.6. | 25.5 KB |
| [G.1](G.1_cgframeready_generator.md) | CG‑Frame‑Ready Generator | Stable | *Keywords:* generator chassis, six-card kit (M1–M6), `CGKitId` manifest, `SoTA_SetId`, `VariantPoolId`, `ShortlistId`, `CGFrameLibraryId`, `RefreshReadinessCardId`, UTS/Name Cards, RSCR wiring (typed trigger ids), edition pins, set-return portfolios, shipping/refresh boundaries. *Queries:* "How to author a CG-Frame generator kit?", "What is the six-card chassis M1–M6 in Part G?", "How to wire harvesting (G.2), selection (G.5), and refresh (G.11) without shadow specs?" | **Builds on:** G.Core, E.8, E.10, E.19. **Uses:** A.10, A.15.3, A.19 (CN-Spec), G.0 (CG-Spec), G.2, G.3, G.4, G.5, G.10, G.11; (via Extensions) C.17 (Creativity-CHR), C.18 (NQD-CAL), C.19 (E/E-LOG). **Produces:** `CGKitId` + reusable CG-Frame kit surfaces and wiring stubs (UTS/RSCR-ready). | 27.7 KB |
| [G.10](G.10_sota_pack_shipping.md) | SoTA Pack Shipping | Stable | *Keywords:* shipping, SoTA-Pack(Core), pack boundary, publication surface, `AuditPins`, `MOOManifest`, `UTS` publication, `PathId`/`PathSliceId`, `CrossingSurface`, edition pins, telemetry pins, RSCR wiring, parity pins, notation-independent pack. *Queries:* "How does FPF ship a SoTA pack?", "What is SoTA-Pack(Core) in Part G?", "How do AuditPins and MOOManifest support replay and audit?", "How are crossing surfaces exposed during shipping?" | **Builds on:** G.Core, F.17–F.18, E.5.2, E.18, A.10, A.15.3. **Consumes/cites:** G.2–G.9, optional G.12–G.13. **Used by:** selector-facing consumers (via G.5), refresh orchestration (G.11). | 27.2 KB |
| [G.11](G.11_telemetry-driven_refresh_decay_orchestrator.md) | Telemetry-Driven Refresh & Decay Orchestrator | Stable | *Keywords:* telemetry, refresh, decay, RSCR, PathSlice, Bridge Sentinels, edition-aware, epistemic debt, deprecation, edition bumps, re-shipping. *Queries:* "How does FPF keep SoTA packs up-to-date?", "What triggers refresh / RSCR reruns?", "How are deprecations and edition bumps governed?". | **Builds on:** G.Core, G.6, G.7, G.5, G.8, G.9, G.10, B.3.4, E.18. **Coordinates with:** G.12, C.18/C.19, C.23, F.15. | 30.1 KB |
| [G.12](G.12_dhc_dashboards_disciplinehealth_timeseries_lawful_telemetry_generationfirst.md) | DHC Dashboards (Discipline‑Health time‑series; lawful telemetry; generation‑first) | Stable | *Keywords:* dashboard, DHC, discipline health, time-series, lawful telemetry, view-only slices, PathId/PathSliceId, edition pins, UTS twins, RSCR/refresh wiring. *Queries:* "How to build DHC dashboards in FPF?", "How to publish lawful DHC time-series with evidence and edition pins?", "How to wire dashboard telemetry into RSCR refresh?" | **Builds on:** G.Core, C.21, G.6, G.11, A.19, G.0, F.17/F.18, E.5.2, E.10. **Coordinates with:** G.5 (portfolio/set outputs), G.7 (crossings/CL/Φ_plane pins), G.8 (maturity ladder panel), G.10 (shipping inclusion), C.18/C.19 (QD/OEE telemetry), G.2 (SoTA palette hooks). | 29.3 KB |
| [G.13](G.13_external_interop_hooks_for_sota_discipline_packs_conceptual.md) | External Interop Hooks for SoTA Discipline Packs (conceptual) | Draft | *Keywords:* interop, external index, claim mapper, mapping policy, plane map, embedding spec, `ExternalIndexCard@Context`, `ClaimMapperCard@Context`, `InteropSurface@Context`, CHR-typed SoS features, edition pins, UTS twins, RSCRTriggerKindId, telemetry pin. *Queries:* "How does FPF integrate external scholarly indexes into Part G?", "What is an ExternalIndexCard / ClaimMapperCard / InteropSurface in FPF?", "How to make interop refreshable with RSCR trigger kinds and edition pins?" | **Builds on:** G.Core, G.2–G.7, G.9–G.12, A.19, A.18, G.0, F.17, E.5.2, E.18. | 34.8 KB |
| [G.2](G.2_sota_harvester_synthesis.md) | SoTA Harvester & Synthesis | Stable | *Keywords:* SoTA harvest, synthesis, `SoTA Synthesis Pack@CG-Frame`, `SoTA_Set@CG-Frame`, `SoTAPaletteDescription`, `Tradition`, ClaimSheets, CorpusLedger, PRISMA Flow Record, BridgeMatrix, describedEntity, micro-examples, hand-off manifests, RSCRTriggerKindId. *Queries:* "How does FPF harvest and synthesize SoTA for a CG-Frame?", "What is a SoTA Synthesis Pack@CG-Frame?", "How to keep competing Traditions plural but comparable via bridges?", "How to make SoTA harvest refreshable with pinned editions and typed RSCR causes?" | **Builds on:** G.Core, E.8, E.10, E.19, A.10, B.3, F.9, F.17, G.0, G.6. **Used by:** G.1, G.3–G.5, G.10, G.11. **Relates to:** G.13. | 39.7 KB |
| [G.3](G.3_chr_authoring_for_a_cgframe_characteristics_scales_levels_coordinates.md) | CHR Authoring for a CG‑Frame: Characteristics, Scales, Levels, Coordinates | Stable | *Keywords:* CHR authoring, characteristics, scales, levels, coordinates, CSLC legality, typed measurement, CHR Pack@CG-Frame, ReferencePlane, Φ/CL policy pins, edition pins, RSCRTriggerKindId. *Queries:* "How do I author CHR packs (typed characteristics and scales) for a CG-Frame?", "How to keep measurement lawful (CSLC) and refreshable (RSCR)?" | **Builds on:** G.Core, G.2, G.0, A.17–A.19, A.18 (CSLC), C.16 (MM-CHR), A.19.CHR, A.15.3, G.6, F.17. **Prerequisite for:** G.4. **Used by:** G.4, G.5, G.10, G.11. | 36.1 KB |
| [G.4](G.4_cal_authoring_for_a_cg-frame_operators_acceptance_clauses_evidence_wiring.md) | CAL Authoring for a CG-Frame: Operators, Acceptance Clauses, Evidence Wiring | Stable | *Keywords:* CAL authoring, operators, acceptance clauses, evidence profiles, tri-state admissibility, Γ-fold hooks, Φ/Ψ/Φ_plane policy pins, legality gates, edition pins, RSCRTriggerKindId. *Queries:* "How to author CAL operators and acceptance clauses for CG-Frames?", "How to keep acceptance/evidence wiring auditable and refreshable?" | **Builds on:** G.Core, G.3, G.0, B.3 (Trust), A.18 (CSLC), G.6. **Prerequisite for:** G.5. **Used by:** G.5, G.8–G.10, G.11. | 33.8 KB |
| [G.5](G.5_multimethod_dispatcher_methodfamily_registry.md) | Multi‑Method Dispatcher & MethodFamily Registry | Stable | *Keywords:* dispatcher, selector, MethodFamily registry, GeneratorFamily registry, TaskSignature, set-return selection, portfolio (`Archive`/`Pareto`), dominance regime, parity harness, UTS publication, evidence pins (PathId/PathSliceId), typed RSCRTriggerKindId. *Queries:* "How does FPF dispatch among competing MethodFamilies without scalarising?", "How are portfolios and parity runs made auditable and refreshable?" | **Builds on:** G.Core, G.0, A.19 (CN-Spec), G.2, G.3, G.4, G.6. **Coordinates with:** G.7–G.11, C.18 (NQD-CAL), C.19 (E/E-LOG), C.23 (Method-SoS-LOG), A.15.3. **Used by:** G.1, G.8–G.12, G.10, G.11. | 35.6 KB |
| [G.6](G.6_evidence_graph_provenance_ledger.md) | Evidence Graph & Provenance Ledger | Stable | *Keywords:* EvidenceGraph, provenance, PathId, PathSliceId, lane tags (TA/VA/LA), SCR/RSCR, GateCrossing, CrossingSurface, UTS PathCard, TriggerAliasMap, Γ-fold pinning. *Queries:* "How does FPF trace claims to evidence?", "What is an EvidenceGraph?", "How do PathId/PathSliceId support audit and refresh?" | **Builds on:** G.Core, A.10, B.3, G.4, F.9, F.15, F.17, E.18, A.21, E.10, E.5.2. **Used by:** G.5, G.8, G.9, G.10, G.11. | 37.7 KB |
| [G.7](G.7_crosstradition_bridge_calibration_kit_bridgematrix_bridgecards_bctsentinels.md) | Cross‑Tradition Bridge Calibration Kit (BridgeMatrix → BridgeCards + BCT/Sentinels) | Stable | *Keywords:* bridge calibration, BridgeCard, BridgeCalibrationTable (BCT), RegressionSet, SentinelSet, BridgeSentinel, Congruence Level (CL/CL^k/CL^plane), loss notes, waivers, ReferencePlane, Φ(CL)/Ψ(CL^k)/Φ_plane policy pins, PathSliceId, GateCrossing, UTS, RSCRTriggerKindId. *Queries:* "How to calibrate cross-Tradition bridges in Part G?", "What is BCT and how is it used?", "How do Bridge Sentinels trigger RSCR?" | **Builds on:** G.Core, G.2, F.9, F.3, F.7, B.3, G.6, E.18, A.21, E.10, C.21. **Prerequisite for:** G.5. **Used by:** G.9–G.11, G.10, G.12. | 35.2 KB |
| [G.8](G.8_soslog_bundles_maturity_ladders.md) | SoS‑LOG Bundles & Maturity Ladders | Stable | *Keywords:* SoS-LOG, rule ids, admissibility ledger, tri-state `{pass | degrade | 32.6 KB |
| [G.9](G.9_parity_benchmark_harness.md) | Parity / Benchmark Harness | Stable | *Keywords:* parity, benchmark, harness, `ParityPlan@Context`, `ParityReport@Context`, pinned editions, freshness windows, `ComparatorSpecRef.edition`, baseline binding (`BaselineBindingRef`), EvidenceTrace (`EvidenceGraphId`, `PathId`, `PathSliceId`), GateCrossing visibility, set-return outcomes (portfolio/archive), RSCR parity tests, cross-tradition parity via Bridge/CL/Φ pins. *Queries:* "What is a parity run in FPF?", "How to run a reproducible parity benchmark (pins, windows, editions)?", "How to publish parity outcomes without hidden scalarisation?" | **Builds on:** G.Core, G.5, G.6, G.4, F.15, E.18, A.21, A.27, E.5.2, E.10. **Uses:** G.0, A.19, F.9. **Publishes to:** G.10, G.11. **Optional wiring:** G.7, C.18/C.19, C.23. | 30.3 KB |
| [G.Core](G.Core_part_g_core_invariants.md) | Part G Core Invariants | Draft | *Keywords:* Part‑G invariants, delegation-first core, RSCR trigger kinds, default ownership index, ID continuity, core linkage. *Queries:* "How to universalize Part G without drift?", "How to make RSCR triggers id-based?" | **Builds on:** E.8/E.10/E.19, A.6.7, A.15.3, A.19, G.0, A.19.CHR. Used by: all `G.0…G.13`. | 40.2 KB |