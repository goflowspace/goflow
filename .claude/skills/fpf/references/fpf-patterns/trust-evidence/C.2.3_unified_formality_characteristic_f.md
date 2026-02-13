## C.2.3 - Unified Formality Characteristic F

> **One‑line summary.** Defines **Formality (F)** as a single, ordinal **Characteristic** (`U.Formality`) with **polarity “up”**, anchored by a **default ladder F0…F9** from **free prose** to **proof‑grade foundations**. This unifies how rigor is declared and compared across all epistemes and contexts, and supplies the **F‑coordinate** in the F–G–R assurance space.

**Status.** Normative pattern in **KD‑CAL / Part C.2**. It **replaces** the legacy “modes/tiers” language and any parallel “formality ladders.” The letter **F** hereafter denotes the **Formality** characteristic in the **F–G–R** triple.

**Scope.** Conceptual only. The pattern **does not** prescribe workflows, toolchains, or team procedures. It specifies *what Formality is and how to measure/declare it*, so that any team can think and communicate rigor with the same yardstick.

**Non‑goals.**
– Not a publication process, not a governance gate.
– Not a reliability metric (R) and not a scope/abstraction metric (G).
– Not tied to any notation, repository layout, or CI/CD practice.


### C.2.3:1 - Context

Transdisciplinary work (physics, software, systems, policy, data) needs a **shared notion of rigor** that travels across context of meaning. A controller invariant stated in a theorem prover, a research hypothesis framed in constrained English, and a managerial decision rule written as acceptance criteria must be **comparable**—not by their domain lore, but by **how strictly they are expressed**.

Historically, FPF texts carried **multiple signals of rigor** (narrative “modes,” editorial tiers, ad‑hoc “formal vs. informal” talk). These signals mixed with status labels (e.g., “Draft/Effective”), obscuring whether an “approved” artifact was **actually precise** or merely **organizationally accepted**. To reason soundly in KD‑CAL and to compose artifacts safely, we standardize a **single Formality characteristic F**:

* **Portable:** works for math, code, models, requirements, policies.
* **Ordinal & minimal:** few clear anchors from “sketch” to “foundations.”
* **Composable:** participates in the F–G–R calculus and weak‑link invariants.
* **Context‑extensible:** Contexts may introduce **intermediate anchors** without breaking comparability.


### C.2.3:2 - Problem

Absent a unified **F**:

1. **Rigor whiplash.** Either everything is forced into premature formalism (blocking exploration), or informal artifacts drift into high‑assurance use (creating silent risks).
2. **Incomparability.** Each Context’s labels mean different things. Reviewers, integrators, and auditors cannot align expectations or compute trustworthy composites.
3. **Lost continuity.** Moving from sketch to proof often becomes a **rewrite**, severing provenance; the same idea looks like different artifacts at each “mode,” inviting translation errors.
4. **Confused roles.** Status (e.g., “accepted here”) gets conflated with rigor (“precise enough”), undermining governance and the KD‑CAL trust math.


### C.2.3:3 - Forces

| Force                                             | Tension to resolve                                                                                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Human ↔ Formal system**                         | Natural language is fast and legible; formal systems are unambiguous and checkable. We need a spectrum, not a cliff.                           |
| **Local freedom ↔ Global comparability**          | Contexts must be free to set thresholds; cross‑context reasoning requires a shared scale and anchors.                                          |
| **Readability ↔ Precision**                       | Rich narrative aids understanding; tight syntax prevents misinterpretation. The characteristic must not force one at the expense of the other. |
| **Open‑world thinking ↔ Closed‑world guarantees** | Exploration benefits from openness; certification needs explicit closure. F must support gradual “closing” without renaming the artifact.      |


### C.2.3:4 - Solution — The **Formality Characteristic F**

#### C.2.3:4.1 - Identity and Type (MM‑CHR)

* **Name:** `U.Formality` (nicknamed **F** in F–G–R).
* **Type:** `U.Characteristic`.
* **Scale:** **ordinal** (no arithmetic; comparisons and thresholds only).
* **Polarity:** **up** (higher ⇒ more strictly and unambiguously expressed).
* **Unit:** **formality step** (qualitative anchor).
* **Value domain:** default anchors **F0…F9** (see §4.4).
* **Carrier:** any `U.Episteme` (claim/theory/spec/model/policy/etc.).
* **Notation‑agnostic:** the same F semantics apply regardless of symbol system; bridges between notations do **not** change F (they may affect R via CL, see C.2.2).

**Normative reading.** “F = k” states *how strictly the content is expressed*, not whether it is true (R) nor how broadly it applies (G).


#### C.2.3:4.2 - Relationship to KD‑CAL (F–G–R)

* **F in the triple.** F is the **Formality coordinate** in the F–G–R assurance space. It influences trust **indirectly**: higher F reduces ambiguity, enabling stronger evidence and safer composition, but **does not** substitute for evidence (R) or scope (G).
* **Composition invariant (weakest‑link).** For any composite episteme,
  **F\_composite = min(F\_parts on support paths)**.
  *Rationale:* the formal rigor of a whole cannot exceed its least‑formal essential part.
* **Orthogonality.** Changing **G** (envelope/scope) or **R** (evidence) does not, by itself, change **F**; conversely, raising **F** does not imply broader G or higher R.


#### C.2.3:4.3 - Extensibility and Local Anchors

FPF provides **default anchors F0…F9** (next subsection). **Contexts MAY**:

* introduce **intermediate anchors** (e.g., F6.5) or **named sub‑anchors** (e.g., “F4‑OCL” vs “F4‑TLA‑constraints”),
* publish **domain exemplars** for anchors,
* define **thresholds** (e.g., “claims of type X must be F≥7”).

**Constraints (normative):**

* **Monotonic order is preserved.** New anchors **MUST NOT** invert or blur the ordering.
* **Anchor meaning is conserved.** Local elaborations **SHALL** map to the nearest global anchor without shifting global semantics (e.g., anything called “F8.x” remains **proof‑grade**).
* **No proxy scales.** Do **not** invent alternative “formality modes/tiers” as surrogates; use **F** explicitly.


#### C.2.3:4.4 - Default **F0…F9** Anchors (overview)

> *Full anchor definitions with cross‑disciplinary examples appear in §5 (next part). Below is the overview for orientation.*

* **F0 — Unstructured prose.** Free narrative; ambiguous; human interpretation only.
* **F1 — Scoped notes.** Informal but term‑consistent scope; clearer than F0.
* **F2 — Structured outline.** Template present; coherent sections; criteria mostly “TBD”.
* **F3 — Controlled narrative.** Complete template; constraints sketched in constrained NL or pseudo‑formal phrasing.
* **F4 — First‑order constraints.** Explicit invariants/properties expressible at ≈FOL level (checkable conditions exist).
* **F5 — Executable math/algorithmics.** Precisely defined computational semantics; outcomes checkable by execution/simulation.
* **F6 — Hybrid formalism.** Mixed discrete/continuous methods; model‑checking or equivalent obligations identified.
* **F7 — Higher‑order verified.** Core claims encoded and checked in HOL‑style systems.
* **F8 — Dependent/constructive proofs.** Proof‑carrying content (programs‑as‑proofs).
* **F9 — Univalent/higher foundations.** Equality‑as‑structure; frontier‑grade formal foundations.

**Intent of anchors.** They form a **gentle gradient** from “thinker‑friendly” (F0–F3) through “formalizable” (F4–F6) to **proof‑grade** (F7–F9), allowing the **same artifact** to climb without renaming or forking.


#### C.2.3:4.5 - Usage Obligations (declaration, not governance)

* **Declare F.** Every normative episteme **SHALL** declare its **F** (one value) in its context. There is **no default**.
* **Use F in reasoning.** Any comparison, composition, or alignment that depends on rigor **SHOULD** reference **F** explicitly rather than implicit labels like “draft/final.”
* **Do not conflate F with status.** Status systems (ESG/RSG) may **refer** to F in their guards, but **F ≠ status**. This pattern defines **what** rigor is, not **when** a Context should require it.


### C.2.3:5 - Canonical Anchors **F0…F9** (normative)

> **How to read this section.** Each anchor defines *what is minimally true* of an episteme to be rated at that level — across disciplines. The anchors are **ordinal**: F7 is strictly more formal than F6, etc. Levels are **about expression**, not truth; Reliability (R) and ClaimScope (G) are separate.

For every anchor we state **Definition**, **Inclusion criteria**, **Non‑examples** (to prevent over‑rating), and **Indicative artifacts** (cross‑disciplinary, post‑2015).


#### C.2.3:5.1 - **F0 — Unstructured Prose**

**Definition.** Free natural language; ambiguous; unstated assumptions; no required sections; meaning depends on reader context.
**Inclusion criteria.** Narrative exists but lacks stable structure; terms may shift meaning; no explicit acceptance/denial conditions.
**Non‑examples.** Any document with a consistent outline and stable vocabulary is at least F1.
**Indicative artifacts.** Whiteboard photos; impromptu email threads; notes from a hallway discussion; an ad‑hoc wiki page with mixed jargon.


#### C.2.3:5.2 - **F1 — Scoped Notes**

**Definition.** Informal narrative with a **consistent scope** and **stable terms**; some headings; the central claim/problem is bounded.
**Inclusion criteria.** Key terms are used consistently; scope is named (e.g., “for single‑node scheduling”); still no explicit criteria.
**Non‑examples.** If each requirement already names a check or scenario, that is F2+.
**Indicative artifacts.** A design note that consistently uses the same nouns/verbs and states “this applies to v2 of the service”; a lab memo defining a focus population.


#### C.2.3:5.3 - **F2 — Structured Outline**

**Definition.** A **complete template** (Context/Problem/Forces/Solution/…) is populated; content is coherent end‑to‑end; criteria are mostly placeholders.
**Inclusion criteria.** All expected sections exist; cross‑references are consistent; open items are marked (e.g., “TBD acceptance”).
**Non‑examples.** If acceptance criteria are explicit per claim, that is F3+.
**Indicative artifacts.** A draft pattern/spec with fully populated sections but qualitative language; an experiment plan with all slots filled yet non‑operational metrics.


#### C.2.3:5.4 - **F3 — Controlled Narrative**

**Definition.** Narrative remains human‑readable but uses **constrained phrasing**; each claim has a **clear, singular interpretation**.
**Inclusion criteria.** Use of controlled NL or disciplined templates (e.g., “shall/if/then”); per‑claim **acceptance statements** exist in prose.
**Non‑examples.** If properties are encoded as logical constraints or typeable Standards, that is F4+.
**Indicative artifacts.** Requirements written in Attempto‑style controlled English; decision rules with explicit pre‑/post‑conditions phrased in a fixed schema.


#### C.2.3:5.5 - **F4 — First‑Order Constraints**

**Definition.** Key claims are expressible at **≈ first‑order logic** (FOL) granularity; invariants/constraints are **explicit and checkable in principle**.
**Inclusion criteria.** Each critical statement can be rendered as a predicate over well‑typed variables; conflict/consistency checks are conceivable.
**Non‑examples.** Bare unit tests or executable code without stated invariants is not automatically F4.
**Indicative artifacts.** TLA+ or OCL constraints on a model; an API spec where pre/postconditions and invariants are written as logic‑like rules; well‑typed schema constraints with quantification over entities.


#### C.2.3:5.6 - **F5 — Executable Math / Algorithmics**

**Definition.** Content has **precise execution semantics**; results can be checked by **running** (simulation or computation).
**Inclusion criteria.** A model is encoded so that outcomes are deterministic (modulo declared randomness); simulations/tests demonstrate the claims’ executable shape.
**Non‑examples.** “It runs” without a statement of what is guaranteed is not enough; opaque notebooks with side effects but no declared semantics stay F3–F4.
**Indicative artifacts.** Differential‑equation models in code; a reference implementation with clear Standard comments linked to tests; an ML training recipe where the algorithmic pipeline and metrics are fully explicit (yet not proven).


#### C.2.3:5.7 - **F6 — Hybrid Formalism**

**Definition.** Combination of **discrete and continuous** reasoning or multiple formal layers; **model‑checking obligations** or equivalent are identified and traceable.
**Inclusion criteria.** Hybrid claims (e.g., controller + plant) are spelled out with both sides’ formalisms and the glue; property checks are specified.
**Non‑examples.** A prose description of cyber‑physical behavior without model obligations is ≤F5.
**Indicative artifacts.** Safety envelopes for autonomous motion expressed as state‑space invariants plus controller logic; hybrid automata with stated safety properties; Standards linking simulation to discrete decisions.


#### C.2.3:5.8 - **F7 — Higher‑Order Verified**

**Definition.** Core claims are encoded in a **higher‑order logic (HOL)** or equivalent, and **machine‑checked**; proof scripts or structured proofs exist.
**Inclusion criteria.** The kernel/tool verifies each inference step; failing changes break proofs.
**Non‑examples.** A hand proof attached to F4 constraints without machine checking remains F4–F5.
**Indicative artifacts.** A theorem in Isabelle/HOL or HOL‑Light proving a protocol invariant; a verified algebraic property of a cryptographic scheme.


#### C.2.3:5.9 - **F8 — Dependent / Constructive Proofs**

**Definition.** **Programs‑as‑proofs** (Curry–Howard) or **dependent type** artifacts; proof terms are part of the artifact; compilation/type‑check is verification.
**Inclusion criteria.** Types capture the property; changing the property changes the type and breaks the build.
**Non‑examples.** A typed program whose types do not encode the critical property is ≤F5.
**Indicative artifacts.** A Coq/Lean implementation whose type encodes sortedness/safety; a certified compiler pass with proof objects maintained by the build.


#### C.2.3:5.10 - **F9 — Univalent / Higher Foundations**

**Definition.** Frontier‑grade **higher foundations** (e.g., homotopy type theory / univalence); equality is treated as **structure**; proofs live at that level.
**Inclusion criteria.** Equivalences are recognized as identities by construction; properties rely on higher equalities.
**Non‑examples.** Any proof that does not hinge on higher‑dimensional equality is ≤F8.
**Indicative artifacts.** Formal developments where isomorphic structures are path‑equal by univalence; higher‑inductive types used to encode core invariants.


#### C.2.3:5.11 - Cross‑anchor cautions (normative)

* **Execution ≠ Proof.** Running code/examples (F5) is not a proof (F7+) unless proof obligations are explicitly encoded and checked.
* **Schema ≠ Semantics.** Parseable schemas (F2) are not logical constraints (F4) without semantic predicates.
* **Labels ≠ Levels.** “Approved,” “Final,” or “Published” are **status labels** and have no bearing on F unless they explicitly bind to these anchors.


### C.2.3:6 - Assigning **F** in Practice (guidance)

This section is **informative**. It offers practical heuristics so engineers‑managers can triage artifacts quickly and consistently.

#### C.2.3:6.1 - Three questions to place a first guess

1. **Can a competent reader misread the claim?**
   If yes, you are likely ≤F2. If no (unique reading by construction), you are ≥F3.
2. **Are constraints stated as predicates over typed things?**
   If yes, you are around **F4**; if they are only executable tests without predicates, you’re **F5**.
3. **Would a tool *reject* an incorrect change?**
   If “only by rerunning examples,” that’s **F5**; if “because the logic kernel/type checker refuses it,” that’s **F7–F8**.

#### C.2.3:6.2 - Decision steps (quick rubric)

* **Has complete template?** If not, **F0–F1**. If yes →
* **Are per‑claim acceptances written (even informal)?** If not, **F2**. If yes →
* **Are they predicate‑like (quantifiers, implies, forall/exists)?** If yes, **F4**; if no, **F3**.
* **Is there an executable model with declared semantics?** If yes, **F5–F6** (hybrid if both discrete/continuous).
* **Are core properties machine‑proved?** If yes, **F7**; if types carry the property, **F8**; if higher equivalence is essential, **F9**.

#### C.2.3:6.3 - Litmus tests (do/don’t)

* **Do** point to the **lowest** rigor segment that is essential to the artifact; **F is capped by the weakest required part**.
* **Do** keep **F** independent from **R** and **G**: a well‑verified but informal hypothesis is **low F, high R**; a formal theorem without empirical content is **high F, R=N/A or VA‑lane only**.
* **Don’t** “average” levels: a long F8 appendix does not make an F3 body F8; F sticks to the **claim** or the **episteme**, not to page counts.
* **Don’t** upgrade F just because a tool was used; tooling matters only if the **content** reaches the anchor’s semantics.

#### C.2.3:6.4 - Anti‑patterns

* **Terminology inflation.** Calling acceptance criteria a “specification” without predicates → F3 at most.
* **Notebook mirage.** Treating an executable notebook with hidden state as formal proof → remains F5 without explicit obligations.
* **Schema worship.** Equating JSON Schema validity with logical safety → F2/F3, not F4.
* **Proof‑by‑CI.** “The pipeline is green” is not a logic kernel; without proofs or dependent types, F≤F6.

#### C.2.3:6.5 - Edge cases and how to rate them

* **Generated docs from formal sources.** Rate **by the source**, not the rendered prose. If the source is F7 proofs, the generated PDF remains **F7** as long as it is a faithful view.
* **Natural‑language with embedded formulas.** If formulas are illustrative only, keep **F3**; if they define obligations and are checkable, move **F4–F6** accordingly.
* **Standards in code comments.** If they constrain behavior and are enforced (e.g., via runtime/type checks), consider **F4–F5**; otherwise **F3**.
* **Hybrid ML systems.** The training procedure (executable) suggests **F5**; safety guards as formal constraints can raise parts to **F4/F6**; certified components may reach **F7/F8**.

#### C.2.3:6.6 - Raising **F** (ΔF moves, informative)

Typical **ΔF** steps (see KD‑CAL motion primitives):

* **F2→F3:** Introduce controlled phrasing; per‑claim acceptances.
* **F3→F4:** Recast acceptances as typed predicates/invariants.
* **F4→F5:** Provide executable semantics with declared Standards.
* **F5→F7:** Encode properties in a proof‑capable logic; prove core invariants.
* **F7→F8/9:** Migrate property into types / adopt higher‑equality foundations.

> **Note.** ΔF does not require changing **G** or **R**. Many projects raise F while holding scope and evidence constant, then tackle R (validation) separately.

### C.2.3:7 - Conformance (normative)

This section defines what it means to **use F correctly** in KD‑CAL. All “**SHALL**/**MUST**/**SHOULD**/**MAY**” statements here are normative.

#### C.2.3:7.1 - Declaration & Semantics

* **CC‑F‑1 (Declaration).** Every normative `U.Episteme` **SHALL** declare exactly one value for `U.Formality` (**F ∈ {F0…F9}**, or a context‑defined sub‑anchor that maps to one of these).
* **CC‑F‑2 (Ordinality).** F is an **ordinal Characteristic**: implementations **MUST NOT** perform arithmetic on F; only comparisons and thresholds are valid.
* **CC‑F‑3 (Polarity).** The polarity of F is **up**: a larger F value denotes **strictly greater or equal** expressive rigor than a smaller one.
* **CC‑F‑4 (No proxies).** Contexts **MUST NOT** introduce alternative “formality modes/tiers” as surrogates for F. If additional labels are desired, they **SHALL** be published as named **sub‑anchors** of F (see §4.3).

#### C.2.3:7.2 - Locality, Extensibility, and Anchors

* **CC‑F‑5 (Local extensibility).** A bounded context **MAY** introduce intermediate anchors (e.g., F6.5) and domain‑named anchors (e.g., “F4‑OCL”), **provided that** (a) the global F0…F9 order is preserved, and (b) each sub‑anchor is explicitly mapped to a parent anchor.
* **CC‑F‑6 (Anchor conservation).** Sub‑anchors **SHALL NOT** redefine the global meaning of their parent anchor (e.g., anything under F8 remains **proof‑grade**).

#### C.2.3:7.3 - Composition & Granularity

* **CC‑F‑7 (Weakest‑link fold).** For any composite episteme (theory, spec, model), the effective Formality **F\_composite** along any essential support path **SHALL** be computed as the **minimum** F of its essential parts on that path.
* **CC‑F‑8 (Granularity rule).** If different parts of an episteme carry different F values, the **episteme‑level F** is the **minimum** over all **essential** parts (non‑essential/illustrative parts are excluded).
* **CC‑F‑9 (No averaging).** Implementations **MUST NOT** average or otherwise combine F values numerically; the min rule suffices.

#### C.2.3:7.4 - Orthogonality & Non‑Interference

* **CC‑F‑10 (Orthogonality to G/R).** Changes in scope/envelope (G) or evidence (R) **SHALL NOT** alter F unless the **expression form** of the claims changes. Conversely, raising F **SHALL NOT** be interpreted as raising R or broadening G.
* **CC‑F‑11 (Notation‑agnostic).** Changing notations or carriers (Symbol side) **does not** change F if the claim graph and its formal content are preserved. Any translation loss is accounted for by **CL** penalties in R, not by altering F.

#### C.2.3:7.5 - Bridges & Cross‑Context Use

* **CC‑F‑12 (Bridges keep F stable).** When a claim is used across bounded contexts via a Bridge, the original F value **SHALL** be preserved in attribution. If the receiving context requires a different expression form, it **MUST** produce a **new episteme** (with its own F).
* **CC‑F‑13 (CL is for trust, not F).** Any mismatch across contexts **SHALL** be handled via Congruence Level (CL) and its effect on R; CL **MUST NOT** be used to down‑rate F.

#### C.2.3:7.6 - Traceability & Change

* **CC‑F‑14 (Observable basis).** An assigned F **SHALL** be justifiable by observable content (e.g., presence of predicates/invariants for F4; mechanized proofs for F7+).
* **CC‑F‑15 (ΔF disclosure).** A **ΔF** move (raising or, if justified by discovered error, lowering F) **SHALL** be recorded as a content change to the episteme. Whether a context versions that change is outside this pattern’s scope.


### C.2.3:8 - Composition & Interaction (normative + informative notes)

#### C.2.3:8.1 - Inside one episteme (normative)

* **Essential paths.** Identify essential parts/claims that are required for the episteme’s truth. Apply **min‑F** along each support path; the **episteme‑level F** is the min over essential paths (CC‑F‑7, CC‑F‑8).
* **Episteme‑about (ReferencePlane=episteme).** Descriptions about other claims/epistemes carry their **own** F and do **not** raise the target’s F; any cross‑plane penalty flows via **CL^plane → R**.

> **Note (informative).** A long formal appendix (F8) attached to a largely narrative body (F3) does **not** make the whole F8; the episteme remains **F3** unless the core claims move into the formal appendix.

#### C.2.3:8.2 - Relation to **G** (scope/envelope) (normative)

* F concerns the **expression form** of the claim; G concerns its **claim scope**. Tightening the envelope without changing how the claim is expressed does not change F; re‑expressing the claim in a stricter form (e.g., predicates) can raise F without changing G.

> **Caution (informative).** Raising F often **reveals** hidden assumptions, which may lead to a **ΔG** (narrower envelope). Treat this as a **separate** change: update G explicitly rather than smuggling scope changes under F.

#### C.2.3:8.3 - Relation to **R** (evidence/assurance) (normative)

* **F ≠ R.** Proof‑grade expression (F7+) still requires binding to appropriate assurance lanes (VA/LA/TA) in the trust calculus; empirical claims may have high R with low F if they remain informal.
* **Decay independence.** F **does not decay** with time; R may decay (empirical freshness) or shift due to CL. Tool assurance (TA) is tracked independently of F.

> **Note (informative).** Higher F typically **enables** stronger R (easier to test or prove), but no automatic relationship is assumed.

#### C.2.3:8.4 - CL & Bridges (normative)

* **CL effects.** Using content across context boundaries requires a Bridge with a CL rating. CL affects **R** (penalties) and **never** changes **F** (CC‑F‑12/13).
* **Semantic change ⇒ new episteme.** If a cross‑context mapping **alters** the claim (e.g., coarsens predicates, drops obligations), treat it as a **new episteme** with its own F rather than “the same F with lower CL.”

#### C.2.3:8.5 - Motion primitives (informative)

* **ΔF** raises or (rarely) lowers the rigor of expression. Plan ΔF moves independently of **ΔG**/**ΔR**: projects often alternate “raise F” (make the claim checkable) with “raise R” (gather proof/validation) at a fixed G.
* **Cost signals.** Typical costs: authoring overhead (F3→F4), model encoding (F4→F5/6), proof engineering (F6→F7/8). The benefit is reduced ambiguity and safer composition.

#### C.2.3:8.6 - Gaps & thresholds (informative)

* **F‑gap** = ordinal difference between two F anchors (no arithmetic). Large gaps signal translation risk: an F8‑level component will not accept informal inputs (F2) except via additional formalization (ΔF) or robust alignment (CL‑guarded).


### C.2.3:9 - Worked Examples (informative)

> Each mini‑case states the artifact, assigns **F**, and notes interactions with **G/R**. Examples are deliberately cross‑disciplinary to stress transdisciplinary comparability.

#### C.2.3:9.1 - Research hypothesis (physics)

**Artifact.** Short note proposing a new scaling law; clear vocabulary; scope “low‑Reynolds flows in microchannels.”
**F.** **F3** (controlled narrative with per‑claim acceptance in prose).
**G/R.** G is a narrow physical envelope; R is initially low (hypothesis).
**Next ΔF.** Recast acceptance as predicates over variables → **F4**; encode a simple simulation harness → **F5**.

#### C.2.3:9.2 - API specification (software)

**Artifact.** REST API doc with request/response schemas and explicit pre/postconditions; invariants like “idempotent under retry.”
**F.** **F4** (first‑order constraints).
**G/R.** G = stated resource model; R improves via conformance tests (independent).
**Next ΔF.** Reference implementation and executable test suite with declared Standards → **F5**; model‑check idempotence under failure injection → **F6**.

#### C.2.3:9.3 - Safety controller (cyber‑physical)

**Artifact.** Controller with plant model; safety distance invariant and braking envelope defined and verified in a hybrid model checker.
**F.** **F6** (hybrid formalism with obligations checked).
**G/R.** G = operating envelope (speed ranges, road conditions); R increases via track tests and simulation coverage.
**Next ΔF.** Encode key invariants in HOL and prove monotonicity → **F7**; migrate safety property into dependent types in the control kernel → **F8**.

#### C.2.3:9.4 - Decision policy (management)

**Artifact.** Escalation policy: if risk score ≥ θ and budget slack ≤ β, escalate to committee; otherwise defer.
**F.** **F3→F4** depending on phrasing. If the thresholds and variables are typed and the rule is predicate‑like, rate **F4**.
**G/R.** G = organizational scope (which portfolios, time windows); R entails retrospective calibration (did escalations match outcomes?).

#### C.2.3:9.5 - Verified algorithm (theory/software)

**Artifact.** Sorting function implemented with a dependent type ensuring output is ordered and a permutation of input; proof included.
**F.** **F8** (dependent/constructive proof).
**G/R.** G = data types and preconditions; R (empirical) is irrelevant; VA lane suffices (proof stands).

#### C.2.3:9.6 - ML classifier (data/ML)

**Artifact.** Training pipeline fully specified; metrics defined; OOD detection configured; no formal invariants.
**F.** **F5** (executable algorithmic semantics).
**G/R.** G = data distributions and deployment envelope; R grows with validation/monitoring.
**Next ΔF.** Add formal constraints for safety (e.g., monotonicity in features) → **F4/F6** for those aspects; certified post‑processing may achieve **F7** for a slice.

#### C.2.3:9.7 - Meta‑specification (method description)

**Artifact.** A guideline on how to review specs; it includes checklists and litmus tests.
**F.** **F3–F4** depending on whether checks are predicates.
**Interaction.** Its F does **not** lift the F of the reviewed artifacts; it only affects **R** via better CL (clearer alignments and fewer losses).

### C.2.3:10 - Authoring & Review Guidance (informative)

This section helps engineering managers, architects, and researchers **assign F consistently**, plan **ΔF moves**, and **review** claims without slipping into status/process language.

#### C.2.3:10.1 - For authors — placing and raising **F**

* **Start honest.** If you’re drafting ideas in plain prose, declare **F0–F1**. You are not “behind”; you’re **appropriately early**.
* **Stabilize vocabulary first.** Move to **F2–F3** by making terms stable and acceptance statements unambiguous (controlled phrasing).
* **Name predicates next.** When acceptance can be written as **typed predicates** (“for all …, if … then …”), you have reached **F4**.
* **Give semantics to execution.** When readers can **run** a model/algorithm with *declared* semantics and see outcomes aligned with the predicates, you are in **F5** (hybrid + obligations → **F6**).
* **Prove what matters.** When the **logic kernel/type system** will **reject** incorrect changes to core claims, you are at **F7–F8**; if equality as structure is essential, **F9**.
* **Keep identity.** Prefer **ΔF** on the *same* episteme (raising rigor stepwise) over creating new documents; this keeps provenance and reduces translation error.

**Typical ΔF plan:** *Sketch (F1) → Controlled narrative (F3) → Predicates (F4) → Executable semantics (F5/6) → Machine‑checked core (F7/8).* Scope (G) and evidence (R) can remain fixed while F rises.

#### C.2.3:10.2 - For reviewers — verifying the declared **F**

Use **observable checks**:

* **F2?** Template is complete; terms don’t drift; “TBD” acceptance is explicitly marked.
* **F3?** Every claim has a **single reading** via constrained phrasing; hidden ambiguity is flagged.
* **F4?** Each critical claim is **predicate‑like** (typed variables, quantifiers/implication allowed); conflicts are **checkable in principle**.
* **F5?** Executable **semantics are declared**; runs/tests are not ad‑hoc but trace back to claims.
* **F6?** Hybrid obligations are **identified and linked** (discrete + continuous, or layered formalisms).
* **F7/8?** Incorrect edits to core claims are **rejected by the kernel/type system**; proof/scripts or proof‑objects exist and are traceable.
* **F9?** Higher equalities are **first‑class** (e.g., univalence), and core results rely on them.

**Failure modes to watch:** “green CI” as proof; schema validation treated as semantics; notebooks without declared semantics; long formal appendix while the main claim stays informal (rate by the **weakest essential part**).

#### C.2.3:10.3 - For integrators & architects — using **F** in composition

* **Plan around the minimum.** In any composition, **F\_composite = min F\_parts** along essential paths. Identify the **bottleneck F** first; your ΔF effort goes there.
* **Mind the F‑gaps.** Large ordinal gaps (e.g., F7 vs F2) imply translation risks and alignment costs. Either **raise** the low‑F part or insert **bridges** with explicit scope and confidence impacts (handled in **R** via **CL**).
* **Don’t upgrade by proximity.** An F8 component does not “elevate” an F3 neighbor. Keep F independent and visible.

#### C.2.3:10.4 - For assurance leads — relating **F** to **G/R** without conflation

* **F enables, R assures.** Raising **F** makes evidence easier to formulate and check; it does not **create** evidence. Rate R separately (calibration/validation/monitoring vs proof lanes).
* **G is separate.** Tightening **G** (scope/envelope) may accompany ΔF (as assumptions become explicit) — treat this as a **ΔG** move, not a side effect.
* **Use thresholds explicitly.** If a context expects “formalized before use,” write guard conditions as **`F ≥ k`**, not as status labels.

#### C.2.3:10.5 - Common pitfalls & remedies

| Pitfall                                   | Remedy                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Calling structured prose a “formal spec.” | If acceptance isn’t predicate‑like, rate **≤F3** and plan **ΔF: prose → predicates (F4)**.      |
| Treating runnable code as proof.          | Declare **F5**; add **stated obligations** and property checks to progress **F6–F7**.           |
| Averaging F across parts.                 | Use **min over essential parts**; if unsure which parts are essential, audit the support graph. |
| Letting status leak into F.               | Keep **status** (e.g., “accepted here”) separate; **F** is about expression only.               |


### C.2.3:11 - Glossary & Notation (normative where noted)

**Formality (F).** `U.Formality` — an **ordinal Characteristic** with polarity **up**; default anchors **F0…F9** (§5). *(Normative)*

**Anchor (F‑anchor).** A named qualitative milestone on the F scale (e.g., F4 “first‑order constraints”). Sub‑anchors are context‑local refinements that **preserve order**. *(Normative)*

**ΔF.** A change to the expression form that alters F (usually **up**). Record as an episteme content change. *(Normative)*

**Essential part/path.** A part or claim without which the episteme’s central assertion does not hold. Composition applies **min‑F** along essential support paths. *(Normative)*

**Predicate / Invariant.** A typed, checkable statement about objects/states; at **F4** and above, critical claims are expressed as such.

**Machine‑checked / Proof‑carrying.** Content for which a logic kernel/type system rejects incorrect changes (F7+) or where programs and proofs are the same artifact (F8).

**Higher equality / Univalence.** Treatment of equivalence as identity in higher foundations relevant at **F9**.

**Notation & examples.**

* Declare as `F = Fk` (e.g., `F = F4`).
* Sub‑anchor: `F = F4[OCL]` or `F = F7[HOL]`.
* Thresholds in prose: “requires **F ≥ F6** for core claims.”
* Mixed parts: list per part if useful (e.g., “Body F3; Appendix proofs F7 — **episteme F3**”).


### C.2.3:12 - Change Log & Patch Notes (normative migration)

**12.1 Supersession.**
This pattern **supersedes** the legacy “modes/tiers” language. Any references to “M‑mode/F‑mode”, “publication tiers”, or parallel “formality ladders” are **deprecated**. From now on, **Formality** is expressed **only** as **F** with default anchors **F0…F9** (and optional sub‑anchors per §4.3).

**12.2 Impacted cross‑references.**

* **C.2.2 (F–G–R).** Replace any generic “F‑ladder” description with a normative reference to **C.2.3** and treat **F** in the triple as defined here (including **min‑F** composition).
* **ESG/RSG text.** Where guards previously referenced “modes/tiers,” rewrite guards as **`F ≥ Fk`** conditions.
* **Meta‑descriptions.** Ensure meta‑artifacts carry **their own F** and do not “lift” a target artifact’s F; use **CL→R** for cross‑context penalties, not F changes.

**12.3 Transitional guidance.**

* **Legacy artifacts without F.** Assign an initial F by applying the rubric in **§6**; record the assignment as a content attribution (not as a status change).
* **Legacy labels in prose.** Replace them with explicit **F** declarations. If prose implies mixed rigor, rate by the **weakest essential** segment (see §7.3).
* **No dual systems.** Do not keep “modes” alongside F; remove proxies and speak **F directly**.

**12.4 Backward compatibility (non‑normative note).**
During editorial refresh, it is acceptable to annotate historical records with both the **new F** and the legacy note for provenance. Forward‑looking reasoning and composition, however, **SHALL** use **F only**.

**12.5 Versioning & edits.**
Raising or (exceptionally) lowering **F** constitutes a **content change** (ΔF). Whether such a change triggers a new edition in a given Context is **outside this pattern**; respect the Context’s edition policy while keeping **F** accurate.

### C.2.3:End
