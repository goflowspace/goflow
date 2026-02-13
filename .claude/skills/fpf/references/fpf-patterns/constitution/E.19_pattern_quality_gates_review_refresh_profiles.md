## E.19 - Pattern Quality Gates: Review & Refresh Profiles

> **Type:** Architectural pattern
> **Status:** Stable
> **Normativity:** Normative

### E.19:1 - Problem frame

FPF evolves by adding and revising patterns. Over time, the framework accumulates two kinds of risk:

1. **Admission risk** — a newly authored pattern can be structurally compliant yet still fail on ontology, semantics, terminology conflicts and vagueness, scope, SoTA in related disciplines, or cross-context hygiene.

2. **Staleness risk** — older patterns can remain internally consistent while drifting away from contemporary practice and newer parts of FPF, current internal vocabulary, or updated neighboring patterns. The result is “quiet decay”: the pattern still reads well, but becomes misleading, incomplete, or incompatible.

FPF already contains many checklists and constraints, but they are distributed across patterns and suites. Authors and reviewers therefore lack a single, repeatable way to answer: *What should be checked, and how deep, before a pattern is admitted or kept?*

### E.19:2 - Problem

Without a unified, explicit review pattern:

* Different reviewers optimize for formal/template compliance and miss deeper ontological, semantic, and naming issues, producing bureaucratic output that does not improve the enforceable contract.
* Authors “optimize for the visible checklist” and miss hidden obligations (lexical discipline, Bridge hygiene, SoTA‑Echoing quality, scope claims, delta‑class impact).
* Legacy patterns accumulate “conceptual bit-rot” and diverge from current practice, current terminology, or current internal invariants.
* The specification’s normative surface becomes harder to trust: compliance becomes a matter of reviewer taste rather than a repeatable gate.

### E.19:3 - Forces

| Force                                   | Tension                                                                             |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| **Uniformity vs Fit**                   | One universal checklist is simple ↔ different pattern kinds carry different risks.  |
| **Rigor vs Editorial cost**             | Deep audits increase quality ↔ they must remain feasible for routine updates.       |
| **Stability vs Evolution**              | Canon should stay stable ↔ it must absorb new SoTA and correct mistakes.            |
| **Conceptual purity vs Enforceability** | Core must stay tooling‑agnostic ↔ gates must still be actionable and auditable.     |
| **Local meaning vs Reuse**              | Patterns must remain context‑anchored ↔ authors want to reuse ideas across domains. |
| **Freshness vs timelessness**           | Some claims should be evergreen ↔ others decay and must be refreshed on cadence.    |

### E.19:4 - Solution — Profile-based gates for admission and refresh

Establish **Pattern Quality Gates (PQG)**: a conceptual review mechanism that applies **profiles of checks** rather than a single monolithic checklist.

A **Pattern Check Profile (PCP)** is a named bundle of check families. Profiles are **additive**: every review applies a baseline profile, then adds risk-driven profiles as needed.

**Terminology note (disambiguation).** PQG/PCP are editorial review constructs in the authoring plane (Part E). They are distinct from enactment/runtime gating constructs such as `OperationalGate(profile)` / `GateProfile` (A.21), which govern Work transitions and gate decision policies elsewhere in FPF.

**Mint vs reuse.** This pattern mints **PQG**, **PCP**, and the profile IDs **PCP‑BASE/MOD/PRAG/NORM/SOTA/BRIDGE/SUITE/P2W/TERM/DEONT/REFRESH**. It reuses existing FPF terms (e.g., **Delta‑Class**, **DRR**, **Bridge**, **CL**, **SoTA Synthesis Pack**) without changing their meanings.

#### E.19:4.1 - Define the review target

A review **SHOULD** propose revisions to a target pattern (including didactic restructuring) that positively affect downstream usage and interoperability. Formal/template defects (e.g., non‑compliance with E.8 structure or not conforming to RFC deontic terminology) have lower review priority than semantic/ontological defects or non‑SoTA Solutions, but they also **MUST** be corrected.

E.g. if the header block is missing or incomplete, **continue with ontology and semantic review first**. Treat missing header fields as a mechanical defect to patch (PCP‑BASE #7), not as a reason to stop.

The run **SHOULD** give best-known **Delta‑Class (Δ‑0…Δ‑3)** and record an initial **impact radius** (dependent patterns/tests/relations that need be changed due to pattern norms), using existing definitions where available (e.g., the LEX‑AUTH protocol).

#### E.19:4.2 - Apply the baseline profile to every run

Every run MUST include **PCP‑BASE**, reviewer depth SHOULD prioritize the load-bearing surfaces in E.19:4.2.1.

1. **Internal coherence (problem ↔ contract ↔ solution)**
   The Conformance Checklist matches Problem statement and the Solution (no “orphan requirements” and no “unclaimed obligations”).
2. **Lexical discipline & reserved vocabulary**
   Terms and registers follow lexical rules; ambiguous “everyday” synonyms do not silently replace kernel vocabulary.
3. **SoTA‑Echoing minimum compliance (E.8)**
   SoTA‑Echoing satisfies the E.8 obligations applicable to the pattern kind (Architectural vs Definitional), including post‑2015 sourcing and explicit adopt/adapt/reject stances. If a SoTA Synthesis Pack exists for the topic, SoTA‑Echoing binds to it rather than forking an untracked narrative; any divergence of pattern norms from contemporary practice is explicitly stated as such. SoTA‑Echoing **MUST** be non‑decorative: the Solution and other load‑bearing sections **MUST** align with the declared SoTA stance, or explicitly justify any divergence.
4. **Cross-pattern compatibility & impact radius**
   Relations are consistent with declared dependencies and dependents; declared scope/impact is compatible or explicitly limited.
5. **Didactic grounding**
   Archetypal Grounding is present and teaches the concept with concrete anchors, not only abstractions.
6. **Template & section integrity**
   This is lowest priority for review depth and **SHOULD NOT** consume effort that would displace ontology/semantics/modularity/slots/SoTA checks. 
7. **Modularity & contradiction hygiene**
   The pattern **SHOULD NOT** be overloaded or significantly expand obligations/dependencies without an explicit reason and impact record.
   Checks include: scope containment, split/refactor recommendations when warranted, and contradiction scans against neighbor patterns in Relations.
   The pattern SHOULD balance cohesion and coupling across FPF.
   If the pattern defines specialization or layering, it SHOULD NOT mix slot interfaces or parameters from different levels; use explicit `⊑/⊑⁺` or `Uses` cuts instead.

##### E.19:4.2.1 - Triage: spend depth on load-bearing surfaces without making reviews heavier

PQG is meant to increase *semantic and ontological trust*, not to turn every review into an exhaustive editorial audit on form. To keep reviews feasible while improving the important parts:

* Treat **load-bearing surfaces** as the primary depth targets:
  * the pattern’s **Conformance Checklist** (the enforceable contract): keep items universal, cognitively ergonomic, not overly prohibitive, and avoid duplicating checks that belong to other patterns (modularity),
  * **deontic clauses** (`MUST/SHALL/SHOULD/MAY`) that define obligations on the authoring/validation plane (not laws of nature or mathematical facts; ensure an explicit conformance subject),
  * **admissibility constraints** (`Invariant:` / `Well‑formedness constraint:`) that define valid models (cardinality, typing/kinds, totality) and are written as non‑deontic predicates (no RFC keywords inside the predicate),
  * **definitions and mint/reuse decisions** (new terms, renamed terms, scope claims baked into names, names that are not overloaded and are properly chosen),
  * **cross-context / cross-plane claims** (Bridge hygiene and “sameness” assertions),
  * **SoTA** (when the pattern claims state‑of‑the‑art rather than a popular‑but‑outdated solution or vocabulary),
  * **modularity and Slot discipline of A.6.5** that provide evolvability of FPF,
  * **absence of contradictions in a pattern**,
  * **Relations** that define compatibility and impact radius.
* Treat **low-signal surfaces** as “scan-level” unless they change meaning: headings/formatting, micro-typos, stylistic polish, and non-load-bearing narrative refactors, compliance to deontic RFC.
* **Do not block semantic review on template and RFC compliance defects.** Missing header block fields (E.8 H‑5), missing canonical sections, or a missing footer marker are fixable integrity defects. Patch them quickly and continue with the load-bearing surface checks in the same run.
* **Report ordering (impact-first).** In run outputs and remediation patches, prioritize fixes on ontology, semantic, modularity and SoTA-related load-bearing surfaces first; group low-signal formatting/typos into a single hunk at the end unless they change meaning.

#### E.19:4.3 - Add risk-driven profiles

**PCP‑PRAG (Pragmatic utility & adoption)** — Trigger: the pattern is Normative and claims practice guidance.
Checks include: minimally viable example, non-decorative Consequences/Anti-Patterns, and an explicit “So what?” adoption test.

**PCP‑MOD (Modularity & layering discipline)** — Trigger: the review target shows scope creep or level-mixing (e.g., one pattern bundles universal core rules with frame-specific content and discipline-specific method semantics; or it mixes `Intension`/`Description`/`Spec` roles in one object).
Checks include:

* an explicit **core vs extensions** cut (universal invariants are factored into one stable “core”, and extensions reference it rather than re-stating or mutating it),
* no conflation of **specialization vs dependency**: use `⊑/⊑⁺` for refinement/extension and `Uses` for pipelines; do not mix their semantics,
* no conflation of container roles: **Pack vs Kit vs Suite vs Family** are not interchanged, and “family of implementations” is not used as “set of mechanisms”,
* level hygiene: Description-level artefacts do not grow mechanism semantics; MVPK faces remain projections and do not become “the place of truth”,
* slot-discipline hygiene for any ladder: SlotKind invariance is preserved and inherited operations do not gain new mandatory inputs (A.6.5 / A.6.1 specialization discipline).

**PCP‑REFRESH (Staleness & compatibility refresh)** — Trigger: staleness signals are present (e.g., outdated SoTA rows, renamed/superseded Relations targets, terminology drift, or an explicit refresh window in LAT/DRR).
Checks include:

* refresh‑sensitive claims are identified (time‑bounded or ecosystem‑bounded) and either (a) updated with post‑2015 evidence **and** matching Solution changes, or (b) explicitly scope‑limited and labeled as historical lineage,
* Relations are updated to current pattern IDs; deprecations/renames are handled via explicit continuity notes (no silent relabeling),
* the run records a Delta‑Class and impact radius; if the refresh causes Δ‑2/Δ‑3, it emits/updates a DRR pointer and triggers any required harness/Bridge refresh obligations defined elsewhere (E.15/F.15/F.9).

Trigger overrides are permitted but intentionally rare: a run MAY override a triggered profile only when it can show the trigger’s risk is genuinely absent *in this case*, and the record MUST name (a) why the trigger is a false positive here and (b) what compensating check(s) were applied instead.

**PCP‑NORM (Normative contract integrity)** — Trigger: the pattern introduces or changes normative requirements, introduces new conformance items, or shifts downstream obligations.
Checks include:

* **Delta‑Class (Δ‑0…Δ‑3)** and **impact radius** are explicit (what breaks, who depends on this),
* requirements are testable in principle (conceptually), scoped, and non-contradictory,
* downstream patterns cited in Relations are compatible with the new contract.
* where the change is Δ‑2/Δ‑3 or a new normative pattern is being admitted: a DRR exists and references the PQG findings (pointer is sufficient; no duplicated prose).

**PCP‑SOTA (Evidence & SoTA alignment)** — Trigger: the pattern’s Solution asserts “best practice”, “state-of-the-art”, or introduces new synthesis claims.
Checks include:

* each “best practice / SoTA” claim in the Solution is explicitly **bound** to SoTA‑Echoing rows (or to SoTA Synthesis Pack identifiers when used), rather than floating as ungrounded prescription,
* novel synthesis is not presented as established SoTA: it is either (a) framed as a scoped hypothesis with explicit limits, or (b) promoted into/registered as a SoTA Synthesis Pack entry before the pattern is admitted as normative guidance,
* where traditions disagree materially, the pattern surfaces the disagreement and states why it adopts/adapts/rejects (instead of silently selecting one tradition),
* refresh‑sensitive claims (those likely to decay) are explicitly marked with scope limits, timespan notes, or lineage labeling when appropriate.

**PCP‑BRIDGE (Cross‑context/plane reuse integrity)** — Trigger: the pattern imports claims, terms, or norms across contexts, disciplines, or reference planes.
Checks include:

* explicit Bridge usage where required (no silent identity by spelling),
* Congruence / loss is surfaced where applicable,
* any cross-plane reuse is explicitly acknowledged and its penalties do not leak into unrelated assurances.

**PCP‑SUITE (Mechanism-suite integrity)** — Trigger: the review target introduces or revises a suite-level Description that enumerates multiple distinct mechanisms (e.g., `MechSuiteDescription` or a suite specialization) and/or changes suite obligations, contract pins, or suite protocols.
Checks include:

* the suite remains a **Description-level** object: it enumerates member `U.Mechanism.Intension` refs and declares shared obligations/pins, but does **not** define mechanism blocks (`OperationAlgebra`, `Transport`, `Audit`, …) and is not used as a mechanism node,
* membership has **set semantics**: `mechanisms` is duplicates-free and order carries no semantics; any intended ordering is expressed only in `suite_protocols`,
* suite protocols are **closed over membership**: if `suite_protocols` is present, each protocol step references a member mechanism (no “step points outside the suite”),
* the suite is not a family of implementations: it MUST NOT be encoded as a `MechFamilyDescription` (families remain “many realizations of one mechanism”, not “many mechanisms”),
* the suite does **not** mint transport exceptions: any cross-context/plane/kind obligation remains Bridge-only; loss/penalties route to `R/R_eff` only; the suite does not embed CL/Φ/Ψ/Φ_plane tables (references/pins only),
* CG/CN contract pins remain the single contract surface: if suite protocols include numeric comparison/aggregation/scoring, they cite `CG‑Spec` (SCP + Γ-fold + MinimalEvidence) and (where applicable) `CN‑Spec`, rather than duplicating “local CG‑Spec-like” content,
* suite protocols contain **no hidden tails**: if UNM/UINDM/ULSAM are required, the protocol expresses them as explicit `Uses` steps and suite audit obligations cite the chosen mechanism ids/refs (no “implicit normalization/aggregation inside score/compare/select”),
* gate separation is preserved: mechanisms/guards use tri-state `GuardDecision := {pass|degrade|abstain}` and MUST NOT publish `GateDecision` / `DecisionLog`; `block` remains gate-level only (`OperationalGate(profile)`),
* defaults remain single-sourced: portfolio mode, dominance regime, and unknown/failure behavior are either pinned in `TaskSignature` / a single policy map or not claimed; the suite does not define competing defaults,
* when the suite claims reusable outputs, publish/telemetry is explicit and terminates via existing publication surfaces (e.g., G.10 and/or PTM), not as a hidden tail inside a selection step.

**PCP‑P2W (Planned baseline & slot-fillings seam integrity)** — Trigger: the review target introduces or revises WorkPlanning artifacts that pin planned fillers for an owner’s slots (e.g., `SlotFillingsPlanItem` or specializations), and/or introduces view projections of such artifacts.
Checks include:

* the PlanItem remains a **WorkPlanning baseline** (`U.WorkPlan.PlanItem`, `kind = SlotFillingsPlanItem`), not an execution log and not a mechanism,
* planned slot filling stays **WorkPlanning-only**: plan items publish planned fillers/pins (ByValue or `<RefKind>`) and MUST NOT include launch values, `FinalizeLaunchValues` witnesses, gate decisions, or decision logs (these are `U.WorkEnactment` / gate-level only),
* ownership and scope are explicit and non-leaky:
  * the item targets exactly one slot owner via `target_slot_owner_ref`,
  * `target_slot_owner_ref` is a **Description-level, edition-addressable** slot-owner ref (kit/suite) and MUST NOT be a `U.Mechanism.IntensionRef`,
  * the item carries explicit P2W anchors (bounded context; and CG-frame/path-slice/scope anchors when used for legality/selection baselines),
* time is explicit: the item includes `Γ_time_selector` or `Γ_time_rule_ref` (XOR); implicit “latest/current” is nonconformant,
* `planned_fillings` is the authority: duplicate `slot_kind` rows are nonconformant unless the slot owner declares the slot multi-valued; any “indices” are derivable projections and are not maintained independently,
* crossing information is referenced, not duplicated: the plan item (and any associated views) cite CrossingSurface/Bridge/policy-id pins rather than embedding CL/Φ/Ψ/Φ_plane tables or defining transport edges,
* MVPK projections remain projections: any `U.View` face (TechCard/PlainView/InteropCard/AssuranceLane) over a plan item MUST NOT add new claims, MUST NOT introduce “shadow defaults”, and MUST avoid “signature” language (signatures belong to intensional objects),
* if a view publishes edition pins or makes claims about crossing/comparability/selection/launch, it MUST also carry the required audit/ownership pins (UTS + Path pins, crossing pins, applicable guard-owner pins); missing pins are treated as nonconformance and read fail-closed downstream.

**PCP‑TERM (Terminology & naming protocol)** — Trigger: the pattern introduces new terms, new U.Types, new “unified names”, or redefines existing labels.
Checks include:

* “mint vs reuse” decision is explicit,
* naming follows the local-first naming protocol and avoids scope smuggling (roles/metrics/stages baked into labels; overloaded words used as terms with a local sense). Remediation **SHOULD** use F.18,
* deprecated aliases and continuity rules are respected.

**PCP‑DEONT (Deontic clause hygiene: RFC keywords)** — Trigger: the pattern conflates admissibility/validity constraints with deontic obligations (e.g., uses RFC keywords where a non-deontic `Invariant:` predicate is required).
Checks include:
* Deontic requirements are expressed with RFC-style keywords (see H‑8); 
* obligations are not smuggled into prose as informal imperatives. Admissibility/validity constraints are stated non‑deontically as `Invariant:` / `Well‑formedness constraint:` predicates and referenced from the Conformance Checklist when enforceable. 
* **Subject discipline for RFC keywords.** If a sentence uses RFC keywords, its grammatical subject **MUST** be an agent or a publishable artefact (author, reviewer, tool, model, record, validator). RFC keywords **MUST NOT** modify modeled‑world entities (e.g., “Earth”, “RoleAssignment”, “Role”, “holon”) — express those as `Invariant:` / `Well‑formedness constraint:` predicates instead, and (if needed) reference them from CC items.

#### E.19:4.4 - Decision outcomes

A PQG run **MUST** end with (a) a remediation patch (English, unified diff, fenced) and (b) a compact list of blocking findings.

**Remediation payload (patch-first).** The run MUST provide concrete remediation proposals as a unified diff patch in English in a fenced code block (if patch is huge, acceptable have it in separate file to have all needed details without need to excess brevity), accompanied by a short commentary stating (a) the explicit misses found and (b) any remaining work that was intentionally deferred. This is a user interchange convention, not a tool mandate.

**Report ordering (impact-first).** The patch is the primary artifact. In the short commentary, list findings in descending order of expected impact on semantic trust (load-bearing surfaces first). Template/formatting-only issues belong at the end unless they hide missing content.

**Budget discipline (anti‑lint‑worship).** If the run identifies semantic defects in load-bearing surfaces, remediation MUST prioritize those fixes; purely mechanical edits (formatting, micro-typos) MUST be minimized and MUST NOT dominate the patch by volume.

**Noise discipline.** The run record is a human-facing audit trail. It **SHOULD** be sparse: list findings, deferrals, and decisions; do **not** paste full PASS output. No need emitting per-check “passed” lines; only found problems and remediation/fixes matter.

### E.19:5 - Archetypal Grounding — Tell–Show–Show: System / Episteme

| Scenario | `U.System` grounding | `U.Episteme` grounding |
|---|---|
| **Tell** | A safety-critical engineering team proposes a new pattern describing how to gate a subsystem before deployment. The draft looks polished, but it quietly imports domain terms, assumes cross-team equivalences, and introduces obligations that are not listed in its own checklist. | A research group refreshes an older pattern that summarizes how to evaluate evidence strength. The pattern still reads well, but its SoTA references and terminology no longer match current practice, and its Relations point to patterns that were renamed or superseded. |
| **Show (failure without PQG)** | Reviewers focus on whether the idea is good and whether the template exists. The pattern is admitted, but later users disagree on what it requires because the Conformance Checklist is incomplete and key constraints are only in prose. | The pattern remains unchanged because “nothing looks broken”. Over time, it becomes a conceptual fossil: newcomers treat it as current guidance, but it encodes an outdated stance and stale vocabulary. |
| **Show (repair with PQG profiles)** | PCP‑BASE finds missing internal coherence (requirements in prose not reflected in CC). PCP‑TERM finds naming drift and scope-smuggling in new terms. PCP‑BRIDGE finds implicit cross-context identity claims without explicit alignment. The pattern is revised before admission, and the final CC becomes the canonical contract. | Patch provided explicit decision: updated SoTA‑Echoing with post‑2015 guidance and appropriate Solution changes, limit the scope to “historical lineage” where appropriate, and update Relations to current dependencies. The refreshed pattern becomes trustworthy again, and any remaining historical material is clearly labeled as such. |

### E.19:6 - Bias-Annotation

Lenses tested: **Gov**, **Arch**, **Onto/Epist**, **Prag**, **Did**. Scope: **Universal** (applies to all patterns and all clusters).

Bias risks and mitigations:

* **Governance bias (Gov):** reviewers may over-prioritize “compliance posture” and under-prioritize teaching value.
  *Mitigation:* PCP‑BASE includes didactic grounding and internal coherence checks and priority for ontology and semantics, not to form.
* **Epistemic monoculture (Onto/Epist):** SoTA‑Echoing can become single-tradition name-dropping.
  *Mitigation:* require explicit multi-tradition coverage and usage of F.18 for neutral naming.
* **Pragmatic bias (Prag):** a pattern can be “correct” yet unusable.
  *Mitigation:* consequences and anti-patterns remain mandatory sections, surfacing trade-offs and misuse paths.
* **Didactic bias (Did):** narrative quality can be mistaken for truth.
  *Mitigation:* conformance and SoTA‑Echoing sections bind claims to explicit obligations and lineage.

### E.19:7 - Conformance Checklist

| ID | Requirement | Purpose |
| --- | --- | --- |
| **CC‑E19‑1 (Baseline is mandatory).** | Every PQG run **MUST** apply **PCP‑BASE** to the review target. | Ensures a uniform minimum gate across all pattern kinds. |
| **CC‑E19‑2 (Profile selection is auditable).** | The run record **MUST** state (a) the selected PCPs, (b) the trigger(s) for each non‑BASE profile, and (c) any override decisions. Any override of a triggered profile **MUST** record why the trigger is a false positive and what compensating check(s) were applied instead. | Makes depth decisions repeatable and reviewable. |
| **CC‑E19‑3 (Delta‑Class & impact for breaking change levels).** | If the run proposes or accepts a change that is **Δ‑2/Δ‑3** (per E.15), the run record **MUST** include Delta‑Class, an impact radius, and a DRR pointer; it **MUST** confirm that required harness/Bridge refresh obligations are triggered where applicable. | Keeps evolution controlled and compatible with downstream dependencies. |
| **CC‑E19‑4 (Contract coherence is enforced).** | Remediation **MUST** eliminate “orphan” obligations and “unclaimed” requirements by aligning the target pattern’s Conformance Checklist, deontic clauses, and admissibility constraints with its Solution. | Preserves the CC as the enforceable contract surface. |
| **CC‑E19‑5 (Triage & noise discipline).** | The run **SHOULD** prioritize load‑bearing surfaces (e.g. CC, content of deontic clauses and content of admissibility constraints, definitions, Relations, SoTA, modularity) and keep purely mechanical edits (e.g. RFC format of deontic clauses) minimal. Template defects **MUST** be fixed before admission (or before closing a refresh run) but **MUST NOT** be used to skip semantic review. | Improves semantic trust without turning review into lint and RFC compliance worship. |
| **CC‑E19‑6 (Patch-first output).** | The run output **MUST** include a remediation patch (English, unified diff, fenced) and a compact list of blocking findings, ordered by semantic impact (load‑bearing surfaces first). | Ensures actionability and consistent reporting. |

### E.19:8 - Common Anti-Patterns and How to Avoid Them

| Anti-pattern                       | Symptom                                                          | Why it fails (force violated)                           | How to avoid / repair                                                |
| ---------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| **Verdict-only review**            | The run ends with “pass/fail” and prose complaints, but no proposed edits. | Raises editorial cost; reduces repeatability.           | Require a remediation payload: patch-first proposed edits + short commentary; treat the patch as the primary artifact. |
| **Single giant checklist**         | Review becomes a long, unfocused ritual that few complete.       | Increases cost; reduces fit and rigor in practice.      | Use a minimal baseline plus triggered profiles.                      |
| **Template-only compliance**       | All headings exist, but obligations are vague and untestable.    | Looks uniform; fails enforceability and auditability.   | Enforce normative clause hygiene and CC/Solution coherence.          |
| **SoTA name-dropping**             | SoTA‑Echoing is a list of buzzwords with no stance.              | Breaks evidence lineage; invites monoculture.           | Require adopt/adapt/reject with reasons per item.                    |
| **Terminology drift by “synonym”** | Authors swap kernel terms for nicer-sounding words.              | Increases ambiguity; harms cross-pattern composability. | Apply PCP‑TERM and require explicit mini-definitions on first use.   |
| **Typos-first review (lint worship)** | Review time goes to formatting and micro-edits while the normative surface, terms, Bridges, modularity, slot discipline and SoTA stance are barely checked. | Raises editorial cost without raising semantic trust. | Use the triage rule: treat load-bearing surfaces as depth targets; satisfy mechanical checks via auditable lint/harness traces when available. |

### E.19:9 - Consequences

| Benefits                                                                         | Trade-offs / Mitigations                                                                   |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Repeatable admission decisions** — reviewers share a common gate language.     | More explicit editorial work; mitigated by a small baseline and triggered profiles.        |
| **Higher trust in the normative surface** — CC becomes the enforceable contract. | Authors must align prose and CC carefully; mitigated by coherence checks.                  |
| **Controlled evolution** — runs prevent conceptual bit-rot.              | Periodic workload; mitigated by prioritizing high-dependency and high-risk patterns first. |
| **Less hidden drift** — terminology and cross-context reuse become explicit.     | Some drafts will be delayed; mitigated by early profile selection during authoring.        |

### E.19:10 - Rationale

Patterns are both **teaching artifacts** and **normative contracts**. A specification that grows without explicit quality gates becomes a patchwork: locally good, globally inconsistent. A profile-based gate is the smallest structure that keeps reviews repeatable while remaining sensitive to risk and pattern kind.

The baseline profile protects cross-pattern comparability and editorial sanity. Triggered profiles keep depth where it matters: norms, SoTA claims, cross-context reuse, terminology changes, and legacy refresh.

### E.19:11 - SoTA-Echoing — post-2015 review/validation practice alignment

**Evidence binding note.** If a SoTA Synthesis Pack exists for review/validation or refresh discipline in your Context, cite it and keep this section consistent with it; otherwise treat the table below as a provisional seed that should not be duplicated elsewhere without an explicit update record.

| Claim (E.19 need)                                                      | SoTA practice (post‑2015)                                                                                   | Primary source (post‑2015)                                                                  | Alignment with E.19                                                                       | Adoption status                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Reviews need explicit criteria, not informal taste.                    | Move from folklore validation to explicit validation methods and documented criteria.                       | Riehle et al. (2020), “Pattern Discovery and Validation Using Scientific Research Methods”. | PCPs make criteria explicit; CC coherence is enforced.                                    | **Adopt.** Keep methods lightweight but explicit.                                                            |
| A stable structure improves comparability and reduces ambiguity.       | Standards specify required viewpoints/concerns and consistency rules for descriptions.                      | ISO/IEC/IEEE 42010:2022 (architecture description).                                         | PCP‑BASE includes structural integrity and internal consistency.                          | **Adopt/Adapt.** Adopt conformance mindset; adapt to pattern-language template and didactic grounding.       |
| Pattern writing benefits from explicit guidance plus critique culture. | Pattern-language communities emphasize clear template usage, consequences, and critique for quality.        | Iba (2021), “How to Write Patterns …” (PLoP 2021).                                          | Baseline checks enforce meaningful sections; anti-patterns make critique concrete.        | **Adopt.** Directly supports admission quality.                                                              |
| “Living” guidance needs refresh discipline.                            | Reporting/review guidance is updated and versioned; reviewers must track changes and report deltas clearly. | Page et al. (2021), PRISMA 2020 statement and explanation papers.                           | Runs require explicit decisions and deltas in SoTA‑Echoing. | **Adapt.** Use the “versioned guidance + explicit deltas” principle without importing tool/process mandates. |

### E.19:12 - Relations

* **Builds on:**

  * `E.8` (authoring conventions; canonical section order; SoTA‑Echoing obligations)
  * `E.10` (lexical discipline and reserved vocabulary)
  * `E.9` (design rationale records for changes that affect semantics)
  * `E.15` (authoring/evolution protocol; harness mindset; refresh planning)
  * `A.6.5` (slot discipline; SlotKind/ValueKind/refMode invariants)
* **Coordinates with:**

  * `F.8` (mint vs reuse decisions)
  * `F.18` (local-first naming protocol)
  * `F.9` (cross-context alignment discipline)
  * `F.15` (conceptual harness and regression framing)
  * `E.17` (MVPK / `U.View` projection discipline)
  * `A.6.7` (`MechSuiteDescription` suite-level semantics)
  * `A.15.3` (`SlotFillingsPlanItem` P2W planned-baseline seam)
  * `G.11` (refresh/decay orchestration principles, where applicable)

### E.19:End
