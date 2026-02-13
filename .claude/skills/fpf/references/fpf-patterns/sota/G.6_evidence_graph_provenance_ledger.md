## G.6 - Evidence Graph & Provenance Ledger

**Tag.** Architectural pattern
**Stage.** design‑time (assembly) + run‑time (telemetry ingestion)
**Primary output.** A notation‑independent `EvidenceGraph` + a stable `PathId` / `PathSliceId` citation surface + an SCR projection (“Assurance SCR”) suitable for audit, selection explainability, and refresh/RSCR wiring.
**Primary hooks.** A.10 (evidence anchors/carriers; SCR/RSCR anchoring), B.3 (assurance lanes and `F/G/R` skeleton), F.9 (BridgeCard/CL), G.4 (CAL `EvidenceProfiles` + `ProofLedger` linkage), `G.Core` (Part‑G invariants, RSCR trigger catalogue, default‑ownership index), E.18/A.21 (GateCrossing + CrossingSurface checks), F.17 (UTS publication), F.15 (RSCR), E.10 (LEX), E.5.* (notation‑independence discipline).
**Non‑duplication note.** Universal Part‑G invariants (no shadow specs; Bridge‑only crossings; tri‑state discipline; penalties→`R_eff` only; P2W split; typed/id‑based RSCR causes; single‑owner defaults; Δ‑discipline) are owned by `G.Core` and are *cited* via `CC‑GCORE‑*`. This pattern defines only the *EvidenceGraph kit* and its path‑addressable provenance surfaces.

### G.6:1 - Problem frame

SoTA claims, operators, and method families are admitted (or gated) using assurance signals derived from diverse artefacts and anchors. FPF already mandates **Evidence Graph Referring** (A.10), lane discipline, and the assurance skeleton (B.3). What is often still missing in practice is a *first‑class, citable* object that makes the provenance of an admission/decision **addressable**:

* *exactly which* anchors and bindings were used,
* *under which* `ReferencePlane` and `BoundedContext`,
* *with which* explicit crossings and penalty policies,
* *for which* time window (freshness/decay),
* in a way that selectors, audits, and maturity transitions can cite without copying tables or re‑telling a story.

This pattern introduces the missing kit: a typed, lane‑aware `EvidenceGraph` plus stable `PathId` / `PathSliceId` addresses that downstream LOG, UTS, parity, and refresh can cite.

**Why here (not in G.4)?** G.4 owns CAL artefacts (EvidenceProfiles, ProofLedger, acceptance policies). G.6 packages *cross‑artefact provenance* as a graph and mints *path identities* that downstream surfaces can cite without duplicating CAL tables or re‑inventing legality rules.

### G.6:2 - Problem

1. Readers cannot reliably **audit crossing/penalty and decay impacts** on claims without chasing many tables and informal narratives.
2. Cross‑Context/plane reuse must remain **Bridge‑only and explicit**, but provenance often hides crossings (or treats them as “obvious”).
3. Selection and maturity decisions need a stable **path address** to re‑check later, including after edition/policy/freshness changes.

### G.6:3 - Forces

| Force                        | Tension                                                                             |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| **Provenance vs agility**    | Fine‑grained audit trails ↔ friction for authors.                                   |
| **Lane purity vs synthesis** | Keep TA/VA/LA separable ↔ publish a unified justification surface.                  |
| **Notation independence**    | Semantics in prose/math ↔ teams want diagrams/tables (informative only).            |
| **Design vs run**            | Design‑time evidence assembly ↔ run‑time telemetry ingestion must not be conflated. |
| **Crossings and planes**     | Crossings must be explicit and penalised correctly ↔ authors want “just reuse it”.  |

### G.6:4 - Solution — EvidenceGraph (notation‑independent; lane‑aware; path‑addressable)

#### G.6:4.1 - G.Core linkage (normative)

**Builds on:** `G.Core` (Part‑G core invariants; routing/delegation hub)

**GCoreLinkageManifest (normative; size‑controlled).**

`GCoreLinkageManifest := ⟨
  CoreConformanceProfileIds := {
    GCoreConformanceProfileId.PartG.AuthoringBase,
    GCoreConformanceProfileId.PartG.UTSWhenPublicIdsMinted
  },
  RSCRTriggerSetIds := { GCoreTriggerSetId.EvidenceGraphKit },
  CorePinSetIds := {
    GCorePinSetId.PartG.AuthoringMinimal,
    GCorePinSetId.PartG.CrossingVisibilityPins
  },
  CorePinsRequired := {
    EvidenceGraphId,
    EvidenceGraphRef.edition?,   // iff editioned as a published artefact
    PathId[]/PathSliceId[],      // strengthened (unconditional for G.6)
    UTSRowId[],                  // strengthened (UTS Name Cards + PathCards are required outputs)
    Γ_timePolicy?,               // iff empirical legs exist (or equivalently: window id carried by PathSliceId)
    ΓFoldRef.edition?,           // iff an explicit Γ-fold artefact is pinned
    CAL.ProofLedgerId[]?         // iff Γ-fold is overridden (cite CAL ProofLedger ids; owner: G.4)
  },
  DefaultsConsumed := { DefaultId.GammaFoldForR_eff },
  TriggerAliasMapRef? := G.Core.TriggerAliasMap.G6
⟩`

**Conditional add‑on (tri‑state guard).** If `G.6` is used to publish or consume guard outcomes (e.g., via `G.6:Ext.SoSLOGPathCitationWiring`), additionally require:
`CoreConformanceProfileIds += { GCoreConformanceProfileId.PartG.TriStateGuard }`.

*(Nil‑elision + expansion rule are per `G.Core:4.2`.)*

#### G.6:4.2 - EvidenceGraph (object; kit‑owned surface)

**Definition (object).** An `EvidenceGraph` is a **typed DAG** whose nodes are resolvable to A.10 anchors/carriers and evidencing roles, and whose edges represent minimal, normative provenance relations suitable for audit and path citation.

* **Nodes.** Each node is an A.10‑anchored evidence carrier or evidence role (e.g., a proof carrier, a measurement record carrier, a tool‑qualification carrier). Nodes MUST remain grounded in A.10 anchors and MUST NOT introduce mereological structure (A.10 firewall).
  * **Node kinds (explicit; stable).** Nodes MUST have an explicit kind tag `nodeKind ∈ {U.EvidenceRole, SymbolCarrier, TransformerRole, MethodDescription, Observation}` (as used in the existing Part‑G vocabulary), so downstream projections can remain notation‑independent and audit‑checkable.
  * **Extension pins.** Method‑family‑specific pins (e.g., QD/OEE) MUST NOT be introduced as new “core node kinds”; they are carried as additional pins only when the relevant `GPatternExtension` is in use and are recorded on UTS PathCards / SCR projections as required by that extension.
* **Edges (minimal normative vocabulary).** The pattern admits a small set of provenance edges sufficient for audit:

  * `verifiedBy` (formal line),
  * `validatedBy` (empirical line),
  * `fromWorkSet` (run‑time trace provenance),
  * `happenedBefore` (temporal ordering),
  * `derivedFrom` (controlled derivation).
  * *(Informative only)* `usedCarrier`, `interpretedBy` MAY appear as authoring aids, but MUST NOT be relied on for conformance checks (their semantics remain non‑normative in G.6).
    Additional narrative edges MAY exist as informative annotations but MUST NOT be relied on for conformance checks.
* **Lane tags.** Every binding on a path is lane‑typed with `assuranceUse ∈ {TA, VA, LA}` (lane separation remains explicit through to SCR projections; no silent cross‑lane averaging).
* **Externality (no self‑evidence).** Any evidencing `TransformerRole` that would certify the evaluated holon MUST be modelled as external (or model a meta‑holon explicitly); G.6 does not permit reflexive “self‑evidence” shortcuts.
* **Context and plane attachment.** Nodes and claims carry `BoundedContext` and `ReferencePlane`. Any movement across context/kind/plane/design↔run/edition boundaries is represented via explicit GateCrossing/CrossingSurface artefacts (with crossing pins routed per `G.Core`).

#### G.6:4.3 - PathId and PathSliceId (citable justification addresses)

**PathId (address for justifications).** A `PathId` is a stable identifier minted for a **claim‑local, lane‑typed** path in an `EvidenceGraph` under a declared scope slice (including a time selector where applicable) and a declared `ReferencePlane`. A `PathId` is meant to be citable from downstream artefacts (LOG, UTS, parity, shipping) without duplicating evidence tables.

A `PathId` citation surface SHALL include, at minimum:

* the lane split (TA/VA/LA) for the path,
* the explicit crossing pins (when crossings are traversed),
* the freshness/time attachment status for empirical legs (when present), including any explicit `validUntil`/expiry marker when one is declared (or a decay/freshness policy pin that implies expiry),
* the pinned policy identifiers relevant to the path’s penalty/trust wiring (policy ids are cited; policies remain owned elsewhere),
* the effective crossing‑trust “bottleneck” information when crossings exist (e.g., lowest `CL`/`CL^k`/`CL^plane` encountered on the cited slice),
* the effective `Γ‑fold` in force for any published/relied‑upon `R_eff` projection (default or explicit override), and (when overridden) the cited CAL `ProofLedger` ids that justify the override,
* the `EvidenceGraphId` and enough addressability to resolve the path to SCR/RSCR anchors.

**PathSliceId (time‑ & plane‑lifted snapshot).** A `PathSliceId` denotes a **release‑quality snapshot key** for a path under explicit time/plane binding (e.g., window policy + `ReferencePlane`) and is intended as the address used when refresh/RSCR wants *path‑granular* recomputation.

*The universal definition of “what kinds of changes force refresh” is owned by `G.Core` (typed trigger kinds). G.6 only makes the slice addressable and pin‑complete.*

When downstream methods require additional edition/policy pins for reproducibility (e.g., archive/illumination/QD surfaces), such pins are specified by the relevant `GPatternExtension` module(s) and are treated as *required pins when that extension is used*.

#### G.6:4.4 - Assurance and legality binding (delegation‑first; no shadow specs)

G.6 does not redefine B.3 or legality rules; it binds evidence paths to existing owners:

* **Assurance skeleton.** Lane separation and the `F/G/R` skeleton are as per B.3. Any statement about penalty routing or default Γ‑fold is delegated to `G.Core` and the default‑ownership index (do not restate).
* **CAL linkage.** When a path claims a proof obligation or an override (e.g., an explicit Γ‑fold override), it MUST cite the relevant CAL `ProofLedger` / `EvidenceProfiles` artefacts (G.4) rather than inventing local semantics.
* **Legality binding.** If a path includes numeric comparisons/aggregations, the legality surface MUST be *cited* via `CG‑Spec` (G.0) rather than re‑implemented in G.6 prose.

#### G.6:4.5 - Conceptual interface (notation‑independent surface; informative shapes)

These are conceptual shapes, not tool APIs (E.5 discipline).

* `Explain(pathId | pathSliceId)` → returns a citation‑ready explanation bundle: lane split, relevant pins (crossings/policies/editions), freshness binding, and links to contributing anchors (A.10) and any CAL evidence/profile refs.
* `PathsFor(claim, scopeSlice, referencePlane)` → enumerates admissible paths, returning `PathId[]` with enough metadata to support selection/audit queries.
* `Snapshot(pathId | pathSliceId)` → emits a release‑grade snapshot record (SCR/RSCR‑grade) whose keys are citable and whose pins are explicit.

#### G.6:4.6 - Extensions (pattern‑scoped; non‑core)

All blocks below are `GPatternExtension` modules (PatternScopeId‑scoped, **not** new PatternIds). They store wiring only and cite semantic owners.

**GPatternExtension: LegacyTriggerAliases**

* **PatternScopeId:** `G.6:Ext.LegacyTriggerAliases`
* **GPatternExtensionId:** `LegacyTriggerAliases`
* **GPatternExtensionKind:** `InteropSpecific`
* **SemanticOwnerPatternId:** `G.Core`
* **Uses:** `{G.Core}` *(cites `G.Core.TriggerAliasMap.G6`; does not redefine meanings)*
* **⊑/⊑⁺:** `∅`
* **RequiredPins/EditionPins/PolicyPins (minimum):**

  * `RSCRTriggerKindId` (canonical id recorded)
  * `RSCRTriggerAliasId?` *(e.g., legacy human labels such as `G.6:H3:...` recorded as labels only)*
  * `scope: PathSliceId[] | PathId[] | PatternScopeId`
  * `TriggerAliasMapRef := G.Core.TriggerAliasMap.G6` *(docking reference)*
* **RSCRTriggerKindIds:** `{RSCRTriggerKindId.EvidenceSurfaceEdit, RSCRTriggerKindId.CrossingSurfaceEdit, RSCRTriggerKindId.PenaltyPolicyEdit, RSCRTriggerKindId.ReferencePlaneEdit, RSCRTriggerKindId.EditionPinChange, RSCRTriggerKindId.PolicyPinChange}`
* **Notes (wiring‑only):** This module preserves ergonomics/back‑compat by allowing `G.6:H3:*` labels, while requiring that recorded causes use canonical `RSCRTriggerKindId` (per `CC‑GCORE‑TRIG‑3`).

**GPatternExtension: SoSLOGPathCitationWiring**

* **PatternScopeId:** `G.6:Ext.SoSLOGPathCitationWiring`
* **GPatternExtensionId:** `SoSLOGPathCitationWiring`
* **GPatternExtensionKind:** `InteropSpecific`
* **SemanticOwnerPatternId:** `C.23`
* **Uses:** `{C.23, C.19, G.5, G.11}` *(SoS‑LOG decisions cite paths; optional lens/attribution wiring is owned by C.19; refresh consumes triggers)*
* **⊑/⊑⁺:** `∅`
* **RequiredPins/EditionPins/PolicyPins (minimum):**

  * `SoSLogRuleId[]` / `BranchId[]` *(as cited labels; semantics owned by C.23)*
  * `FailureBehaviorPolicyId` *(when `degrade(mode=...)` is used)*
  * `PathId[] | PathSliceId[]` (the cited justification addresses)
  * `LensId?` *(when a C.19 lens is used for attribution/explainability; id only; semantics owned by C.19)*
* **RSCRTriggerKindIds:** `{RSCRTriggerKindId.EvidenceSurfaceEdit, RSCRTriggerKindId.MaturityRungChange, RSCRTriggerKindId.TelemetryDelta, RSCRTriggerKindId.PolicyPinChange}`
* **Notes (wiring‑only):** G.6 does not define LOG semantics; it defines the *path‑citation surface* that LOG must cite.

**GPatternExtension: BridgeSentinelWiring**

* **PatternScopeId:** `G.6:Ext.BridgeSentinelWiring`
* **GPatternExtensionId:** `BridgeSentinelWiring`
* **GPatternExtensionKind:** `InteropSpecific`
* **SemanticOwnerPatternId:** `G.7`
* **Uses:** `{G.7, G.11}` *(bridge/sentinel semantics & calibration artefacts are owned by G.7; refresh orchestration is owned by G.11)*
* **⊑/⊑⁺:** `∅`
* **RequiredPins/EditionPins/PolicyPins (minimum; conditional on use):**

  * `BridgeId/BridgeCardId`
  * `RegressionSetId?` / `SentinelId[]?` *(as published by G.7, when sentinel wiring is used)*
  * `PathId[] | PathSliceId[]` *(paths that cite the bridge and must be re‑audited on bridge/sentinel changes)*
* **RSCRTriggerKindIds:** `{RSCRTriggerKindId.CrossingSurfaceEdit, RSCRTriggerKindId.PenaltyPolicyEdit, RSCRTriggerKindId.FreshnessOrDecayEvent, RSCRTriggerKindId.EditionPinChange, RSCRTriggerKindId.PolicyPinChange}`
* **Notes (wiring‑only):** This module requires that bridge/sentinel changes re‑trigger RSCR **path‑locally** for affected `PathId/PathSliceId` scopes, without redefining sentinel semantics (owned by G.7) and without inventing new trigger kinds (owned by `G.Core`).

**GPatternExtension: QD_OEE_TelemetryPins**

* **PatternScopeId:** `G.6:Ext.QD_OEE_TelemetryPins`
* **GPatternExtensionId:** `QD_OEE_TelemetryPins`
* **GPatternExtensionKind:** `MethodSpecific`
* **SemanticOwnerPatternId:** `C.18` *(QD artefact semantics); uses `C.19` for exploration/logging/lens wiring as needed*
* **Uses:** `{C.18, C.19}`
* **⊑/⊑⁺:** `∅`
* **RequiredPins/EditionPins/PolicyPins (minimum; conditional on use):**

  * `DescriptorMapRef.edition`
  * `DistanceDefRef.edition`
  * `InsertionPolicyRef` *(policy id or pinned policy ref, per owner semantics)*
  * `EmitterPolicyRef?`
  * `LensId?` *(when a C.19 lens is used in selection/telemetry attribution)*
  * `TransferRulesRef.edition?` / `EnvironmentValidityRegionRef?` *(when open‑ended / transfer events are in scope)*
* **RSCRTriggerKindIds:** `{RSCRTriggerKindId.TelemetryDelta, RSCRTriggerKindId.EditionPinChange, RSCRTriggerKindId.PolicyPinChange, RSCRTriggerKindId.FreshnessOrDecayEvent}`
* **Notes (wiring‑only):** This module enforces reproducibility of archive/illumination and open‑ended telemetry *when those surfaces are used*, without pulling QD/OEE semantics into the EvidenceGraph core.

---

### G.6:5 - Archetypal Grounding (System / Episteme)

**System (Γ_sys):** *Autonomous brake envelope claim.*
Claim: “Stop within 50 m from 100 km/h.” EvidenceGraph nodes include proof carriers (TA/VA), instrumented track tests (LA/VA), calibration carriers, and an external test lab as an external evidencing role (no self‑evidence). A `PathId` provides a stable justification address; empirical legs are bound to explicit windows; crossings (if any) are explicit and pinned.

**Episteme (Γ_epist):** *Benchmark parity/replication lineage (post‑2015 practice).*
Claim: “Method family M attains parity on ImageNet‑style tasks under a declared evaluation protocol.” EvidenceGraph nodes include replication carriers (LA), legality/metric‑soundness carriers (VA), and tool‑qualification carriers (TA). The cited `PathId` binds the `ReferencePlane`, the scope slice, and the pinned evaluation/legal surfaces (by edition/policy ids rather than prose). When refresh triggers occur (edition pin change, evidence surface edit, decay events), downstream artefacts can re‑cite or re‑compute using the same `PathSliceId` addressing discipline.

### G.6:6 - Bias‑Annotation

Lenses tested: **Gov**, **Arch**, **Onto/Epist**, **Prag**, **Did**.
Scope: Universal for the EvidenceGraph kit; any method‑specific telemetry/portfolio wiring is modularized as Extensions and cited to its semantic owners.

### G.6:7 - Conformance Checklist (normative) — **CC‑G6**

| ConformanceId                                     | Requirement                                                                                                                                                                                                                                                                                                                                                                  | Purpose |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **CC‑G6‑CoreRef**                                 | `G.6` is conformant only if it satisfies the **effective** `CC‑GCORE‑*` set expanded from the `GCoreLinkageManifest` in **§4.1** (explicit crossings & pins, penalties→`R_eff` only, P2W split, typed RSCR trigger kinds, single‑owner defaults, UTS discipline, Δ‑discipline).                                                                                                 | Route core invariants |
| **CC‑G6‑1 (Anchor & lanes)**                      | Every citable path MUST resolve to A.10 anchors (SCR/RSCR addressable) and MUST declare lane tags (`TA/VA/LA`) on bindings.                                                                                                                                                                                                                                                | Ground auditability |
| **CC‑G6‑2 (No self‑evidence)**                    | Any evidencing `TransformerRole` that certifies the evaluated holon is external; reflexive cases MUST be modelled as a meta‑holon.                                                                                                                                                                                                                                         | Avoid reflexive evidence |
| **CC‑G6‑3 (Context/Plane & crossings)**           | Paths MUST declare `BoundedContext` and `ReferencePlane`, and MUST expose explicit crossing pins when crossings are present. *(Delegation target: `CC‑GCORE‑CROSS‑1`.)*                                                                                                                                                                                                    | Make crossings explicit |
| **CC‑G6‑4 (Penalty routing)**                     | Any crossing/plane penalty wiring visible in G.6 artefacts MUST route penalties to `R_eff` only and MUST preserve `F/G` invariance under penalties. *(Delegation target: `CC‑GCORE‑PEN‑1`.)*                                                                                                                                                                             | Preserve lane purity |
| **CC‑G6‑5 (Γ‑fold discipline + default ownership)** | If a `Γ‑fold` is not explicitly overridden by pinned CAL artefacts, G.6 MUST cite the single owner of `DefaultId.GammaFoldForR_eff` rather than asserting a local default. If a `Γ‑fold` is explicitly overridden, the path/SCR surface MUST cite the relevant CAL `ProofLedger` ids and publish the override as an auditable pin (not as prose). *(Delegation: `CC‑GCORE‑DEF‑1`; override semantics owned by `G.4`.)* | Keep folding auditable |
| **CC‑G6‑6 (Time/decay/validity binding)**         | Empirical legs MUST expose freshness/time binding (window selector or policy pin) and MUST support an explicit `validUntil`/expiry marker when one is declared (or an equivalent decay/freshness policy pin that implies expiry). Expiry/decay MUST be representable as refresh/RSCR‑relevant change using typed canonical causes. *(Delegation intent: typed causes are core‑owned; see `CC‑GCORE‑TRIG‑*`.)*                                  | Enable refresh readiness |
| **CC‑G6‑7 (Design/run split)**                    | Design‑time method descriptions and run‑time work traces MUST NOT be fused into one undifferentiated node; the graph MUST preserve the design↔run boundary via explicit carriers/bridges. *(Delegation intent: P2W split is core‑owned; see `CC‑GCORE‑P2W‑1`.)*                                                                                                            | Preserve P2W boundary |
| **CC‑G6‑8 (SCR projection completeness)**         | For any cited `PathId/PathSliceId`, the Assurance SCR view MUST expose at least: lane split, scope/plane pins, freshness/validity binding, explicit crossing pins (and the effective bottleneck `CL`/`CL^k`/`CL^plane` when crossings exist), the effective `Γ‑fold` in force for any `R_eff` folding (default or override, plus CAL `ProofLedger` ids when overridden), and links to contributing A.10 anchors and any CAL evidence/profile refs. | Make decisions auditable |
| **CC‑G6‑9 (Citable PathIds)**                     | Any SoS‑LOG admit/degrade/abstain decision or maturity rung transition that relies on provenance MUST cite `PathId`(s) (or `PathSliceId`(s) when snapshot‑binding is required).                                                                                                                                                                                            | Decision traceability |
| **CC‑G6‑10 (SpanUnion justification note)**       | If a SpanUnion/non‑interaction claim is made across evidence lines, an explicit independence justification MUST be published (as an addressable artefact linked to the path).                                                                                                                                                                                                | Non‑interaction audit |
| **CC‑G6‑11 (UTS hooks)**                          | Evidence artefacts and paths minted for citation MUST be UTS‑citable with twin labels and edition pins. *(Delegation target: `CC‑GCORE‑UTS‑1`.)*                                                                                                                                                                                                                           | Stable citations |
| **CC‑G6‑12 (IndependenceCertificate)**            | Independence for SpanUnion claims MUST be carried by an `IndependenceCertificate` (per the relevant certificate pattern) and referenced from SCR/paths.                                                                                                                                                                                                                    | Certificate surface |
| **CC‑G6‑13 (Mandatory provenance pins)**          | Any published/cited path surface MUST expose: `EvidenceGraphId`, `PathId/PathSliceId`, lane split, scope/plane pins, freshness/validity pins when applicable, crossing pins when applicable, and the minimal pin set required by §4.1. When `R_eff` folding is published/relied upon, the effective `Γ‑fold` in force MUST be exposed (default or override, plus CAL `ProofLedger` ids when overridden). When QD/OEE telemetry pins are in use, the extension‑required edition/policy pins MUST also be exposed. | Pin completeness |
| **CC‑G6‑14 (Legality binding; no shadow specs)**  | If numeric operations are cited/used in a path, legality MUST be pinned/cited via `CG‑Spec` rather than asserted locally, and the path/SCR surface MUST fail fast on illegal arithmetic/typing (e.g., CSLC/scale violations); do not “promote” ordinal to cardinal by convention inside G.6. *(Delegation target for “no shadow specs”: `CC‑GCORE‑CN‑CG‑1`.)*                                                                                     | Prevent illicit arithmetic |
| **CC‑G6‑15 (Conditional: QD/OEE telemetry pins)** | *(Conditional)* If `G.6:Ext.QD_OEE_TelemetryPins` is used, the required edition/policy pins from that extension (at minimum `DescriptorMapRef.edition`, `DistanceDefRef.edition`, and the relevant insertion/emitter/transfer policy pins when applicable) MUST be recorded for reproducibility and must participate in RSCR triggering using canonical trigger kind ids.                                                                 | Reproducible archive/OEE |

### G.6:7.5 - Interfaces & Hooks (normative)

Each hook below defines: **Trigger → Obligation → Publishes/Consumes → Invariants**.
Where universal invariants apply (crossings, penalties, trigger typing), this section *cites* `G.Core` rather than redefining semantics.

#### G.6:7.5.1 - H1 — UTS Name Card for Evidence Artefacts

* **Trigger.** A new EvidenceGraph node is minted (an A.10‑anchored evidence artefact or role).
* **Obligation.** Mint a UTS Name Card with twin labels (Tech/Plain), citing the home context anchor and any required edition pins.
* **Publishes/Consumes.** Publishes: UTS row. Consumes: A.10 anchor metadata.
* **Invariants.** UTS publication and any deprecation/aliasing follow `G.Core` routing to F.17 (UTS discipline).

#### G.6:7.5.2 - H2 — UTS PathCard (PathId/PathSliceId)

* **Trigger.** A new `PathId` (or `PathSliceId`) is minted.
* **Obligation.** Publish a UTS PathCard with twin labels, listing the explicit pins required by §4.1 (context/plane/time binding, crossing pins if any). If an extension requires additional pins for reproducibility (e.g., `G.6:Ext.QD_OEE_TelemetryPins`), those pins MUST be present when the extension is in use.
* **Publishes/Consumes.** Publishes: UTS row(s). Consumes: EvidenceGraph path metadata + any extension‑required pins.
* **Invariants.** Crossing visibility and penalty routing are delegated to `G.Core` (`CC‑GCORE‑CROSS‑1`, `CC‑GCORE‑PEN‑1`).

#### G.6:7.5.3 - H3 — RSCR Trigger on Evidence‑Impacting Edit (typed; alias‑dockable)

* **Trigger.** Any edit in G.6 that can change a path’s audit‑relevant surface (evidence structure, crossing pins, penalty policy pins, plane binding, freshness binding, edition/policy pins, or telemetry‑bound fields).
* **Obligation.** Emit RSCR triggers **using canonical `RSCRTriggerKindId`** (from `G.Core`) and record affected scope (`PathId/PathSliceId`) plus payload pins required for downstream refresh. If a legacy `G.6:H3:*` label is recorded, it is recorded as an alias label and docked via `G.Core.TriggerAliasMap.G6`. When `G.6:Ext.BridgeSentinelWiring` is used, include the bridge/sentinel payload pins required by that extension.
* **Publishes/Consumes.** Publishes: RSCR triggers and any associated RSCR test ids. Consumes: relevant pins/refs and CAL artefact references where applicable.
* **Invariants.** Trigger typing and alias docking are delegated to `G.Core` (`CC‑GCORE‑TRIG‑*`). Penalty routing invariants are delegated (`CC‑GCORE‑PEN‑1`).

#### G.6:7.5.4 - H4 — SoS‑LOG Path Citation (selector explainability)

* **Trigger.** A SoS‑LOG rule yields a tri‑state decision for a selection‑relevant pair (e.g., `(TaskSignature, MethodFamily)`), and the decision is justified by evidence.
* **Obligation.** The branch record MUST cite the relevant `PathId/PathSliceId`(s) and the minimal pins required to re‑audit the justification. Any method‑specific attribution fields are handled via Extensions (e.g., `G.6:Ext.SoSLOGPathCitationWiring` for `LensId`/FailureBehavior wiring, `G.6:Ext.BridgeSentinelWiring` for bridge‑monitoring payload pins when cross‑context reuse is invoked, `G.6:Ext.QD_OEE_TelemetryPins` for QD/OEE pins).
* **Publishes/Consumes.** Publishes: an SCR‑visible branch record with cited paths. Consumes: EvidenceGraph path queries.
* **Invariants.** Tri‑state semantics are core‑owned (`CC‑GCORE‑GUARD‑1`); G.6 does not add a new decision value.

#### G.6:7.5.5 - H5 — Maturity Rung Transition Justification

* **Trigger.** A maturity rung transition is proposed and justified by evidence.
* **Obligation.** The transition MUST cite one or more `PathId/PathSliceId`(s) and MUST publish an updated maturity entry with those citations. Missing path citations forbid rung advance.
* **Publishes/Consumes.** Publishes: updated UTS entry for maturity artefacts. Consumes: cited paths and A.10 anchors.
* **Invariants.** Any thresholding policy remains owned by CAL/LOG owners; G.6 provides citation, not policy.

#### G.6:7.5.6 - H6 — Bridge/CL Edge Annotation (GateCrossings)

* **Trigger.** An EvidenceGraph edge traverses a declared GateCrossing boundary (context/kind/plane/design↔run/edition).
* **Obligation.** Publish a CrossingSurface‑checkable crossing record with explicit crossing pins (UTS row id, Bridge id/card id if applicable, CL regime pins if applicable, and plane pins if applicable).
* **Publishes/Consumes.** Publishes: crossing row/pins. Consumes: GateCrossing metadata and Bridge artefacts (when present).
* **Invariants.** Crossing visibility is core‑owned (`CC‑GCORE‑CROSS‑1`); penalties routing is core‑owned (`CC‑GCORE‑PEN‑1`).

#### G.6:7.5.7 - H7 — ReferencePlane penalty policy publication (ids only)

* **Trigger.** A path binds across different reference planes.
* **Obligation.** Publish the relevant policy identifiers (ids only; not tables) required to audit plane effects, alongside the path’s pins.
* **Publishes/Consumes.** Publishes: SCR/UTS fields containing policy ids. Consumes: the owner’s policy registries as cited artefacts (do not duplicate tables).
* **Invariants.** Penalty routing is delegated (`CC‑GCORE‑PEN‑1`); no shadow specs (`CC‑GCORE‑CN‑CG‑1`).

#### G.6:7.5.8 - H8 — CrossingSurface exposure (E.18)

* **Trigger.** G.6 artefacts are exported for release or consumed by downstream patterns that require GateCrossing checks.
* **Obligation.** Provide harness‑readable ids/pins so GateCrossing checks can verify: required crossing records exist, lexical constraints hold, and crossing pins are explicit.
* **Publishes/Consumes.** Publishes: checkable ids/pins. Consumes: GateCrossing + lexical rules.
* **Invariants.** Crossing discipline and ID continuity are core‑owned (`CC‑GCORE‑CROSS‑1`, `CC‑GCORE‑ID‑*`).

#### G.6:7.5.9 - H9 — SCR surface for assurance provenance

* **Trigger.** A downstream artefact cites a path for audit/selection/maturity.
* **Obligation.** Expose the required provenance fields in SCR views: lane split, context/plane pins, freshness binding, crossing pins (when present), and links to A.10 anchors and CAL refs.
* **Publishes/Consumes.** Publishes: SCR view(s). Consumes: EvidenceGraph paths and cited owner artefacts.
* **Invariants.** Default ownership is routed (`CC‑GCORE‑DEF‑1`) when defaults are cited.

#### G.6:7.5.10 - H10 — ProofLedger linkage (CAL ↔ G.6)

* **Trigger.** A proof obligation or evidence role is attached to a claim and is represented in G.4 artefacts.
* **Obligation.** Link EvidenceGraph nodes/edges to CAL ProofLedger/EvidenceProfiles entries and to A.10 carriers via the minimal provenance edge vocabulary.
* **Publishes/Consumes.** Publishes: CAL proof refs as pins in the path explanation surface. Consumes: CAL artefacts.
* **Invariants.** G.6 does not redefine CAL proof semantics; it only cites them.

#### G.6:7.5.11 - H11 — Telemetry ingest (selector & probe outcomes)

* **Trigger.** Run‑time outcomes (selection, probes, parity runs, measurement updates) produce observations that bear on previously asserted claims.
* **Obligation.** Ingest the observation as a run‑time evidence line (anchored in A.10), with explicit lane typing and explicit scope/time binding. If method‑specific telemetry pins are required, they are governed by Extensions (e.g., `G.6:Ext.QD_OEE_TelemetryPins`).
* **Publishes/Consumes.** Publishes: new EvidenceGraph nodes/edges + any required UTS rows + typed RSCR triggers when impacts occur. Consumes: run‑time carriers/attestations as conceptual anchors.
* **Invariants.** P2W split is respected (`CC‑GCORE‑P2W‑1`); typed trigger discipline is respected (`CC‑GCORE‑TRIG‑*`).

#### G.6:7.5.12 - Minimal conformance (hooks)

1. UTS publication for minted evidence artefacts and paths (H1–H2), per routed UTS discipline.
2. Typed RSCR triggers on evidence‑impacting edits (H3) using canonical trigger kind ids.
3. LOG and maturity artefacts cite paths when evidence is used (H4–H5).
4. GateCrossing/crossing records are explicit and checkable when crossings occur (H6–H8).
5. SCR views expose the minimal provenance pins for cited paths (H9–H10).
6. Run‑time telemetry is ingested without collapsing design↔run boundaries (H11).

### G.6:8 - Common Anti-Patterns and How to Avoid Them

* **Narrative‑only provenance (“because story”).**
  **Avoid:** mint `PathId/PathSliceId` and require citation for any decision that claims evidence‑based justification (CC‑G6‑9).
* **Implicit crossings (“same thing, different context”).**
  **Avoid:** represent crossings only via explicit crossing artefacts/pins; treat edition/plane/context changes as explicit crossing‑relevant edits and trigger RSCR (core‑owned crossing discipline).
* **Smuggling legality rules into EvidenceGraph prose.**
  **Avoid:** cite/pin legality surfaces (`CG‑Spec` and CAL artefacts); do not introduce local “mini‑CG” rules in G.6 (route via `CC‑GCORE‑CN‑CG‑1`).
* **Unpinned editions/policies (“it’s obvious which version”).**
  **Avoid:** require explicit edition/policy pins on citable paths; treat changes as typed triggers.
* **Alias‑only RSCR causes (“H3: something changed”).**
  **Avoid:** record canonical `RSCRTriggerKindId` as the cause; aliases are labels only and must dock via `G.Core.TriggerAliasMap.G6`.

### G.6:9 - Consequences

**Benefits.** Path‑addressable provenance; crossing/plane effects are auditable by pins rather than folklore; selectors and auditors share the same object; refresh becomes localized (path‑scoped) rather than global “rerun everything”.
**Trade‑offs.** Authors must declare (or pin) time/plane/scope and keep pins explicit; mitigated by reusing CAL EvidenceProfiles and by modularizing method‑specific telemetry as Extensions.

### G.6:10 - Rationale

G.6 concretizes the “because‑graph” implicit in A.10 into a typed, lane‑aware DAG with stable path addresses. It relies on canonical owners for semantics:

* A.10 for anchoring discipline and carrier reality,
* B.3 for the assurance skeleton,
* G.4 for proof/evidence profile semantics,
* `G.Core` for universal crossing, penalty, default ownership, and typed RSCR cause discipline.

This preserves conceptual modularity: G.6 standardizes *addressable provenance*, not a competing legality or selection mechanism.

### G.6:11 - SoTA‑Echoing

This pattern aligns with post‑2015 best practice in reproducibility and evaluation governance by:

* treating **provenance and versioning/pinning** as first‑class audit surfaces (rather than informal “methods” prose),
* enabling **selective re‑evaluation** (path‑scoped refresh) rather than global reruns whenever one policy/edition changes,
* separating **design‑time specifications** from **run‑time traces/telemetry**, matching modern reproducibility and “lineage” practice in complex ML/scientific pipelines,
* keeping **method‑family specifics** (e.g., archive/illumination/QD pins or open‑ended telemetry pins) modular via extension wiring instead of embedding them into the universal provenance core.

### G.6:12 - Relations

**Builds on:** `G.Core`, `A.10` (evidence anchors/carriers; SCR/RSCR), `B.3` (assurance skeleton), `F.9` (BridgeCard/CL), `G.4` (CAL EvidenceProfiles/ProofLedger), `E.18/A.21` (GateCrossing/CrossingSurface checks), `E.10` (lexical rules), `E.5.*` (notation independence), `F.17` (UTS), `F.15` (RSCR).
**Publishes to:** UTS (Name Cards + PathCards), SCR/RSCR surfaces, downstream selectors/LOG by `PathId` citation, refresh/orchestration as typed triggers (consumed by `G.11` when used).
**Used by:** `G.5` (selector explainability and admissibility justifications), `G.8` (SoS‑LOG bundles), `G.9` (parity harness traces), `G.10` (shipping pins and audit payload), `G.11` (refresh orchestration).
**Constrains:** downstream patterns MUST cite paths when evidence is claimed; they MUST treat edits to pinned evidence/crossing/policy/edition/time bindings as refresh‑relevant causes with canonical trigger ids (routing via `G.Core`).

### G.6:End
