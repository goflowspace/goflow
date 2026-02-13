## E.8 - FPF Authoring Conventions & Style Guide

> **Type:** Architectural (A)  
> **Status:** Stable  
> **Normativity:** Normative (unless explicitly marked informative)

### E.8:1 - Problem frame
FPF grows through the addition of patterns written by authors from many
disciplines. Without a shared structure *and* voice, the framework would
fracture, violating Pillars **P‑1 Cognitive Elegance** and
**P‑2 Didactic Primacy**.

### E.8:2 - Problem
*Structural drift* and *stylistic fragmentation* threaten three qualities:

1. **Comparability** – readers cannot align patterns lacking common
   headings.  
2. **Narrative cohesion** – prose swings from dry jargon to informal
   blog style.  
3. **Auditability** – missing sections hide safety checks
   (Archetypal Grounding, Bias‑Annotation).

### E.8:3 - Forces

| Force | Tension |
|-------|---------|
| **Uniformity vs Expressiveness** | Consistent template ↔ freedom for diverse domains. |
| **Rigor vs Readability** | Formal precision ↔ engaging prose. |
| **Brevity vs Completeness** | Concise patterns ↔ mandated safety subsections. |

### E.8:4 - Solution — One template, enriched by style principles

#### E.8:4.1 - Canonical Pattern Template
Within each pattern, the **canonical** section headings **SHALL** appear in the order below.
For each **canonical content section heading (1–12)**, the `<Title>` component (after the heading separator, e.g. ` - `) **MUST** start with the canonical section title (case-insensitive match; canonical capitalisation preferred); an optional clarifier after an em dash is allowed (e.g., `Solution — …`).
The **Footer marker** (section **13**, if present) is a sentinel and is governed by **H‑9** rather than the standard `<FullId> - <Title>` shape.

**Extensibility.**
Authors **MAY** add additional sections. Prefer expressing them as subsections under the nearest canonical section (e.g., `4.1`, `4.1.1` under *Solution*). If an additional top-level section is necessary, it **MUST NOT** delete or reorder the canonical sections and its title **MUST NOT** shadow a canonical title.

**Mandatory vs optional.**
* Canonical sections **1–13** are mandatory in every pattern.
* The escape hatch `Not applicable` is permitted **only** where explicitly stated below; when used, it **MUST** include a short justification (1 paragraph).

**Template:**
- **Title line:** Hashes + FullId + ` - ` + Pattern Title; optional `(informative)` note.
- **Header block:** Type, Status; optional Normativity override.
1. **Problem frame**
2. **Problem**
3. **Forces**
4. **Solution**
5. **Archetypal Grounding** (Tell–Show–Show; System / Episteme; `Not applicable` allowed only with justification)
6. **Bias‑Annotation**
7. **Conformance Checklist**
8. **Common Anti‑Patterns and How to Avoid Them** (`Not applicable` allowed only with justification)
9. **Consequences**
10. **Rationale**
11. **SoTA‑Echoing** (post‑2015 practice alignment; terminology drift & deltas; `Not applicable` allowed only with justification)
12. **Relations**
13. **Footer marker** 

**Footer marker.** End each pattern with a single visible sentinel heading line on its own: `### <PatternId>:End`. This makes truncation detectable even when HTML comments are stripped or surfaced by editors. The footer marker is intentionally content‑free: **do not** place prose under it.

*Note.* Pattern boundaries are still parseable by scanning for the next pattern heading (`## …`), but an explicit `:End` marker helps retrieval pipelines (and LLM prompts) distinguish “this chunk is the whole pattern” from “this chunk was cut mid‑pattern”.

##### E.8:4.1.1 - Heading & ID discipline (human tooling + retrieval)
FPF is often consumed through full‑text search and retrieval (RAG). A reader or an LLM may see a subsection without its parent headings, so headings must be **self‑identifying**.

**H‑1 (Heading shape).** Every pattern heading and every subsection heading inside a pattern **SHALL** follow:
`<hashes> <FullId> - <Title> (optional note of non‑normativity)`

*Exception.* The **Footer marker** is a sentinel heading and is governed by **H‑9**, not by the standard `<FullId> - <Title>` shape.

**H‑2 (Heading separator).** The canonical separator between `<FullId>` and `<Title>` is ` - ` (ASCII, space-hyphen-space).
Legacy text may use ` - `; tooling **SHOULD** treat the two as equivalent, and authors **SHOULD** migrate to ` - ` when touching a heading.

**H‑3 (FullId).** `FullId` is the full hierarchical address.
For a **pattern heading** it is the pattern ID (e.g., `A.2`, `E.10.D1`).
For **headings inside a pattern**, append dot‑separated ordinal section numbers after the colon (`:`) (e.g., `A.2:4.4`, `E.10.D2:3`).
*Exception:* the Footer marker uses the reserved sentinel token `:End` as defined in **H‑9**.
The colon (`:`) is **reserved** for section paths and **MUST NOT** appear in pattern IDs.

**H‑4 (Ordinals).** Ordinals in section paths **SHOULD** track the canonical template numbering (**1 = Problem frame**, …, **13 = Footer marker**) to maximise cross‑pattern comparability. During refactors or in legacy patterns, ordinals **MAY** be local. In that case, the **canonical section title at the start of `<Title>`** is the semantic key; readers and tools **MUST NOT** infer section semantics from the ordinal alone.
*Note:* the Footer marker itself is exempt from ordinal encoding; it uses the reserved token `:End` (see **H‑9**).

**H‑5 (Where kind and normativity live).** Pattern **kind** (e.g., Architectural / Definitional) **MUST** be declared in the **Header block**, not encoded into the heading text. Normativity (**normative** / **informative**) **MUST** also live in the Header block when it deviates from the default. If a reminder is needed for readers, authors **MAY** add a short parenthetical note at the end of the heading (e.g., `(informative)` / `(non‑normative)`), but headings **MUST NOT** use square‑bracket tags.

**H‑6 (Heading levels).** Heading levels **MUST** preserve a fixed offset between structural layers (Part or Cluster (flat) → Pattern → Pattern sections):
* Part and Cluster headings **MUST** use `#` (level 1) across the file.
* A Pattern heading **MUST** use `##` (level 2).
* Inside a pattern, each nested section **MUST** add exactly one `#` per level (e.g., `## A.2 - …`, `### A.2:2 - …`, `#### A.2:2.1 - …`).

**H‑7 (Ellipsis discipline).** Authors **MUST NOT** use **three consecutive full stops/dots** (`...`) as punctuation in headings or narrative prose. Authors **MUST** use the Unicode ellipsis `…` (U+2026) instead. For editorial elisions in quotations, authors **SHOULD** prefer `[…]` to make the omission explicit and distinguish it from retrieval truncation.
*Exception:* literal three‑dot sequences that are part of an external language’s syntax **MAY** appear **only inside code spans or fenced code blocks**.

**H‑8 (Normative keywords).** The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY**, and **OPTIONAL** are to be interpreted as described in RFC 2119, as clarified by RFC 8174 (only when capitalised). Authors **SHOULD** avoid informal deontic phrasing (“need to”, “is required to”) in normative clauses.

**Deontics vs admissibility.** Use RFC keywords only for **deontic obligations** (requirements on authors, reviewers, implementers/tooling, or published artefacts) — i.e., things an agent can choose to do or omit. Do **not** use RFC keywords to state **definitions**, **structural invariants**, **typing rules**, or other **admissibility conditions** of the modeled world.

When you need an enforceable constraint that is *mathematical* rather than *deontic*, express it as a non‑deontic predicate using one of: `Definition:`, `Invariant:`, or `Well‑formedness constraint:` (optionally with formal quantifiers). Prefer mathematical terms like `cardinality 1..1 (total)` / `0..1 (partial)` / `0..n` over deontic adjectives like “mandatory/optional” when the intent is cardinality, not duty.

**Admissibility predicate discipline (recommended shape).**
When expressing admissibility/validity constraints as predicates (`Definition:` / `Invariant:` / `Well‑formedness constraint:`):
* Authors **MUST NOT** use RFC keywords inside the predicate block.
* Authors **SHOULD** give each predicate a stable identifier and short name (e.g., `RA‑1 (Locality)`, `RE‑3 (Method gate)`), so that Conformance Checklist items can reference it without re‑authoring the rule.
* Authors **SHOULD** write the constraint as a declarative predicate (optionally quantified), e.g., `role ∈ Roles(context)`, rather than as “X MUST …”.
* If the constraint needs to be enforceable as part of a pattern’s contract, authors **SHOULD** reference the predicate identifier from the Conformance Checklist (and/or call out validator behaviour), rather than duplicating the predicate with RFC keywords.

**H‑9 (Footer marker sentinel).** Footer marker **SHALL** be a single heading line whose `FullId` is the pattern ID followed by the reserved sentinel token `:End` (no ordinals, no title, no square‑bracket tags): 
`### <PatternId>:End`
It is the only allowed heading *inside* a pattern whose section token is non‑numeric. It **MUST** be the final line of the pattern and **MUST NOT** carry any prose. Tooling and readers **MUST** treat it as a boundary sentinel, not as a semantic section.

*Unification note:* historic A‑ and D‑templates differed only by the presence/absence of **Bias‑Annotation** and **Relations**; the unified template keeps the headings everywhere while allowing explicit `Not applicable` statements when justified.
The Alexandrian pattern canon historically calls *Problem frame* “Context”. FPF avoids that label because **Context** is already overloaded in FPF (e.g., `U.BoundedContext` and its Plain‑register label).

#### E.8:4.2 - Stylistic Principles (S‑0 … S‑13)

| # | Principle | Guideline |
|---|-----------|-----------|
| S‑0 | Narrative Flow Seven‑Step Heuristic | Authors are encouraged to structure major paragraphs or subsections using the seven‑step mnemonic. |
| S‑1 | Density without Jargon | Short declarative sentences; tool names belong in Pedagogy/Tooling. |
| S‑2 | Internal Cohesion | Inline references to Pillars and related patterns. |
| S‑3 | Embedded Mini‑Definitions | Gloss a new term in parentheses on first appearance. |
| S‑4 | Contextualisation | Brief historical or disciplinary lineage anchors. |
| S‑5 | Prophylactic Clarification | Pre‑empt common misreadings inside the prose. |
| S‑6 | Quotable Closers | Finish Solution or Consequences with a memorable aphorism. |
| S‑7 | Generative over Prescriptive | Present rules as enabling constraints, not bureaucracy. |
| S‑8 | Trans‑disciplinary Tie‑ins | Illustrate using at least two distinct fields. |
| S‑9 | Physical Grounding Reference | Link abstractions to a `Transformer` or physical process. |
| S‑10 | Punchy Blocks | ≤ 5 sentences per paragraph; lists for clarity. |
| S‑11 | Narrative Flow | Ensure sections read as a continuous story, not bullet soup. |
| S‑12 | Full sentences over tags | Avoid “keyword soup”. Each list item SHOULD contain a subject and a verb; prefer 2–4 sentence micro‑paragraphs to bare tag lists. |
| S‑13 | SoTA‑Echo craft | In the SoTA‑Echoing section, present: **claim → practice → source → alignment → adoption status (adopt/adapt/reject)**; cite Bridges & CL when crossing Contexts/planes. |

Authors use the principles as a *scaffold*, not a straitjacket: the goal
is coherent, engaging insight.

**S‑0 (Narrative Flow Seven‑Step Heuristic) — explanation**
Narrative flow is recommended to follow these steps: **Hook → Frame → Weave → Anchor → Bridge → Flow → Close**.

Brief explanations: 
| Step       | Purpose in a paragraph/section                             |
| ---------- | ---------------------------------------------------------- |
| **Hook**   | Grab attention with a vivid image or paradox.              |
| **Frame**  | State the specific question or problem space.              |
| **Weave**  | Connect to earlier patterns or Pillars.                    |
| **Anchor** | Tie to a concrete System/Episteme or physical process.     |
| **Bridge** | Show the implication for the upcoming claim or rule.       |
| **Flow**   | Deliver the formal content or argument.                    |
| **Close**  | End with a quotable line or payoff that reinforces memory. |

Narrative Flow Heuristic also operationalises S‑1 (Density w/o Jargon), S‑2 (Internal Cohesion), S‑4 (Contextualisation), and S‑6 (Quotable Closers).

#### E.8:4.3 - Autonomy authoring stub (mandatory when autonomy is claimed)
If a pattern or example claims **autonomy** for any Role/Method/Service:
1) Add a subsection **“Autonomy (RoC‑E.16)”** that lists:
   * `AutonomyBudgetDeclRef` (id, version, Scope (G), Γ_time),
   * `Aut-Guard policy-id (PolicyIdRef)`,
   * `OverrideProtocolRef` (SpeechAct names, SoD),
   * pointer to where **Green‑Gate** applies in the Method steps,
   * where **AutonomyLedgerEntry** is recorded on `U.Work`.
2) Include one **Tell‑Show‑Show** vignette that demonstrates **depletion** and **override** handling.
3) Use **LEX‑BUNDLE** terms (Scope (G), Γ_time, Role/Method/Work). Avoid “validity”, “process”, “actor”, “system”, “mechanism” unless mapped to kernel types.

### E.8:5 - Archetypal Grounding (System / Episteme)

| Template element | `U.System` illustration | `U.Episteme` illustration |
|------------------|------------------------|---------------------------|
| Section order | Pump‑assembly pattern follows sections **1–12** (and, optionally, **13**). | Meta‑analysis pattern follows the same sections. |
| S‑1 Density w/o Jargon | “The pump boundary is the sealing plane.” | “This episteme raises **F (Formality)** by making falsifiers testable.” |
| Hook‑Weave‑Anchor | Opens with field anecdote → weaves in Γ‑core → anchors to motor torque. | Opens with historical paradox → weaves in **A.10** anchors → anchors to peer‑review data. |

*Note:* Prefer examples that reuse FPF’s own characteristics vocabulary (e.g., **F (Formality)** rather than “F‑score”) unless you explicitly mean an external metric and name it as such.

### E.8:6 - Bias‑Annotation
Lenses tested: **Gov**, **Arch**, **Onto/Epist**, **Prag**, **Did**. Scope: **Universal** for the authoring conventions in this pattern.
This guidance biases toward **Did** (readability, narrative flow) and **Arch** (template regularity) by design; the mitigation is explicit optionality (`Not applicable`) and the requirement to justify omissions in‑text.

### E.8:7 - Conformance Checklist

**CC style (canonical).**
Conformance Checklist items are obligations/conditions in the **authoring plane**: they constrain artefacts that claim conformance (and the reviewers/validators that accept them). A CC clause of the form “X SHALL …” is to be read as “In a conforming artefact, X SHALL …”, not as a deontic statement about the modeled world.

**Preferred wording for new or edited CC items:** start with an explicit conformance subject (e.g., “Authors …”, “Reviewers …”, “A conforming implementation …”, “A validator …”). If a CC item is enforcing an admissibility predicate, it **SHOULD** cite the predicate’s identifier (from a `Definition:` / `Invariant:` / `Well‑formedness constraint:` block) rather than restating the predicate as “X MUST …”. For boundary/interface/protocol/contract patterns, prefer A.6.B‑routed claim IDs (L/A/D/E) or cite an existing Claim Register (A.6.B:7) instead of restating mixed prose.

| ID | Requirement | Purpose |
|----|-------------|---------|
| **CC‑SG.0 (Heading discipline).** | Pattern and subsection headings **SHALL** follow **H‑1 … H‑9** (FullId prefix, reserved punctuation, heading levels, ellipsis discipline). The Footer marker **SHALL** follow **H‑9**. | Makes chunks self‑contained; reduces ambiguity between author elision and retrieval truncation. |
| **CC‑SG.1** | Every new pattern **SHALL** follow the section order defined in the Canonical Template (Title block → … → Footer marker). | Guarantees structural comparability. |
| **CC‑SG.2 (Grounding required).** | Every pattern **MUST** include an *Archetypal Grounding* section. If **System** or **Episteme** grounding is inapplicable, authors **MUST** state `Not applicable` and give a one‑paragraph justification. | Keeps patterns teachable and reduces “definition‑only” ambiguity. |
| **CC‑SG.3** | The *Bias‑Annotation* section **SHALL** cite the five Principle‑Taxonomy lenses and declare either “Universal” or an explicit scope limitation. | Keeps cross‑disciplinary neutrality explicit (ties to Guard‑Rail 4). |
| **CC‑SG.4** | Deontic normative sentences **MUST** use only RFC‑style keywords (see **H‑8**); RFC keywords **MUST NOT** appear inside `Definition:`/`Invariant:`/`Well‑formedness constraint:` blocks. When enforceable, admissibility/validity predicates **SHOULD** be referenced by id from the Conformance Checklist (rather than duplicated as “X MUST …”). Informal deontic verbs are prohibited in normative clauses. | Prevents ambiguity between obligation language and model validity; improves auditability. |
| **CC‑SG.5** | Pattern prose **SHOULD** demonstrate adherence to Style Principles **S‑0 … S‑13**; reviewers are empowered to request revision when clarity or didactic quality suffers. | Embeds common narrative voice without rigid policing. |
| **CC‑SG.6 (SoTA‑Echo required).** | Every pattern **SHALL** include a **SoTA‑Echoing** section and clearly state divergence of its Solution from SoTA with explanation of why. Architectural patterns **SHALL** satisfy the full obligations below; Definitional patterns **MAY** satisfy the reduced obligations (terminology drift + ≥ 1 post‑2015 primary source) when a full SoTA comparison is not meaningful. | Ensures explicit lineage and guards against vocabulary drift. |
| **CC‑SG.7 (Post‑2015, multi‑Tradition).** | For Architectural patterns, SoTA‑Echoing **SHALL** cite ≥ 3 post‑2015 sources across ≥ 2 Traditions; each item **MUST** carry adoption status (adopt/adapt/reject) with reason. | Guards against monoculture; makes intent explicit. |
| **CC‑SG.8 (Bridge & CL on reuse).** | Any cross‑Context or plane reuse mentioned in SoTA‑Echoing **MUST** cite **Bridge id + CL** and (if planes differ) **Φ(CL)**/**Φ_plane** policy‑ids; penalties **→ R_eff** only. | Safe, auditable reuse. |
| **CC‑SG.9 (Lexical hygiene).** | The term **mapping** **SHALL NOT** appear in SoTA‑Echoing except in the precise E.10 sense; use **alignment/Bridge/relation** instead. | Avoids overloading reserved vocabulary. |
| **CC‑SG.10 (No keyword soup).** | SoTA‑Echoing items **MUST** be written as sentences (not bare noun phrases); bullet lists are acceptable only with complete clauses. | Improves didactic quality and comparability. |
| **CC‑SG.11 (Anti‑patterns).** | Every pattern **SHALL** include a **Common Anti‑Patterns and How to Avoid Them** section. It **MAY** be `Not applicable` only with a one‑paragraph justification. | Makes misuse paths explicit and reduces review churn. |
| **CC‑SG.12 (Boundary routing).** | If a pattern’s subject is a boundary/interface/protocol/contract (API boundary, protocol, connector, “contract” description, or a published boundary surface), it **MUST** either (a) provide an **A.6.B**‑routed atomic claim set (`L-*`/`A-*`/`D-*`/`E-*`, with stable IDs), or (b) explicitly cite an existing **A.6.B Claim Register** / routed claim set that it reuses. | Pulls A.6.B into the authoring contour; prevents “contract soup” and makes review lintable. |

### E.8:8 - Common Anti‑Patterns and How to Avoid Them

These failure modes recur in drafts and in downstream application. They are predictable ways the Forces in this pattern get violated.

| Anti‑pattern | Symptom | Why it fails (force violated) | How to avoid / repair |
|-------------|---------|------------------------------|-----------------------|
| **Template cargo‑culting** | Headings exist, but each section is a thin bullet list with no narrative. | Satisfies Uniformity but loses Readability and Didactic Primacy. | Use S‑0 narrative flow per section; write 2–4 sentence micro‑paragraphs before any list/table. |
| **Un‑grounded abstractions** | Problem/Solution stay abstract; no concrete System/Episteme Tell–Show–Show. | Breaks teachability and makes misuse likely. | Fill Archetypal Grounding first; then back‑propagate concrete nouns into Problem/Forces/Solution. |
| **SoTA name‑dropping** | SoTA‑Echoing is a list of nouns/buzzwords with no adopt/adapt/reject rationale. | Violates CC‑SG.7 and CC‑SG.10; readers cannot audit alignment. | For each source, state what is adopted/adapted/rejected and why (complete clauses, 2–4 sentences). |
| **Tool‑bound normativity** | A vendor tool, file format, or schema is described as required to apply the pattern. Data governance implied. | Violates Guard‑Rails (lexical firewall; notation independence, data governance absence); reduces portability and conceptual clarity. | Keep normative content conceptual; move tooling and data governance into Context‑local Profiles. |
| **Hidden trade‑offs** | Solution sounds universally good; Consequences lists only benefits. | Removes decision‑support value; applicability cannot be judged. | In Consequences, include at least one trade‑off and a mitigation; if none exists, explain why. |

### E.8:9 - Consequences

| Benefits | Trade‑offs / Mitigations |
|----------|-------------------------|
| **Predictable skeleton** – readers instantly know where to find context, forces, and criteria. | Limits author freedom in macro layout; mitigated by flexibility inside the Solution subsection. |
| **Cohesive voice** – S‑principles give FPF a recognisable style, aiding memorability. | Reviewers must read for style, not only semantics; checklists ease load. |
| **Embedded pedagogy** – Tell‑Show‑Show and Hook → Close heuristics turn the spec into a self‑teaching text. | Slightly longer patterns; justified by better comprehension and fewer clarifying DRRs. |

### E.8:10 - Rationale
Structure and style function as FPF’s *grammar*. By unifying what were
once separate “template” and “style guide” patterns, authors face a
single reference point that satisfies:

* **P‑1 Cognitive Elegance** – uniform, minimal surprises.  
* **P‑2 Didactic Primacy** – narrative flow, dual archetype examples.  
* Guard‑Rails 1 & 2 – no tool jargon, no notation lock‑in inside prose.

A unified template also improves retrieval: a chunk containing `A.2:<n> - Bias‑Annotation` remains self‑identifying even when parent headings are missing, and the recommended footer marker makes truncation detectable.

International and industry standards often speak in terms of *conformance criteria*. FPF uses the label **Conformance Checklist** to make adoption easier for engineers and managers.

### E.8:11 - SoTA‑Echoing  *(normative; lineage & deltas to contemporary State‑of‑the‑Art)*

**Purpose.** Make each pattern’s relationship to contemporary practice explicit and comparable without importing tooling or data governance. This section is prose‑first and notation‑independent.

**Minimum contents (obligations).**
1) **Evidence binding (no duplicate SoTA).** If a **SoTA Synthesis Pack** exists (G.2), this section **SHALL cite** its **ClaimSheet IDs** / **CorpusLedger entries** / **BridgeMatrix rows** as the source‑of‑truth for claims and report `adopt/adapt/reject` **consistent with those IDs**. Avoid forking an untracked SoTA narrative.
2) **Sources (post‑2015).** For **Architectural patterns**, cite ≥ 3 primary SoTA sources (standards/papers/books), with at least **two independent Traditions**. For **Definitional patterns**, cite ≥ 1 post‑2015 primary source and, where relevant, a short note on terminology drift/deprecations.
3) **Practice alignment.** For each cited item, state **what is adopted/adapted/rejected** and **why** (2–4 sentences).
4) **Scale legality.** If numeric operations are implied, bind to ComparatorSet/CG‑Spec and declare partial‑order stance (no hidden scalarisation).
5) **Cross‑Context reuse.** Any reuse across `U.BoundedContext` must surface Bridge+CL/Φ_plane policy‑ids (penalties affect only `R_eff`).
6) **Lexical hygiene.** Avoid “mapping” unless you mean an explicit Bridge/translation relation with loss notes.

**Writing guidance (readability).**
*Write short paragraphs, not tag lists.* For each Tradition, provide (a) a one‑sentence capsule of the practice, (b) a one‑sentence comparison to the pattern’s Solution, (c) a one‑sentence adoption status with reason. Where helpful, add one **System** and one **Episteme** micro‑example (Tell–Show–Show).

**Format: human‑first.** A small table is allowed, but each row **MUST** be accompanied by 1–2 sentences as above. Vendor/tool tokens, file formats, or data schemas are out of scope.

#### E.8:11.1 - SoTA alignment for this pattern (E.8 self‑echo)

| Claim (E.8 need) | SoTA practice (post‑2015) | Primary source (post‑2015) | Alignment with E.8 | Adoption status |
|---|---|---|---|---|
| Pattern texts must be teachable, not just “correct”. | Use a stable skeleton (context/problem/forces/solution/actions/consequences) plus illustration and checklists to keep patterns readable and actionable. | Iba (2021), “How to Write Patterns …” (PLoP 2021 PLoPourri). | Canonical Template mirrors the skeleton and adds Archetypal Grounding + Conformance Checklist as first‑class sections. | **Adopt/Adapt.** Adopt the skeleton; adapt by making bias and conformance explicit sections. |
| Pattern quality needs explicit validation beyond folklore. | Critique of ad‑hoc validation (incl. “rule of three”) and push toward more rigorous discovery/validation methods. | Riehle et al. (2020), “Pattern Discovery and Validation Using Scientific Research Methods”. | E.8 encodes validation as Conformance Checklist + SoTA‑Echoing with adoption status and evidence binding. | **Adopt.** Adopt auditability goals; keep the mechanism lightweight (checklists + evidence binding). |
| Governance should constrain structure, not mandate tools. | Specify conformance and structure; do not prescribe processes, notations, tools, or recording media. | ISO/IEC/IEEE 42010:2022 (architecture description). | E.8 is template‑ and conformance‑centric, with guard‑rails against tool/notation lock‑in in core narrative. | **Adopt.** Direct alignment. |
| Pattern languages are networks; visuals often mislead. | Systematic surveys report low consensus on what to visualise and ambiguous/inexpressive visuals; relations need clear definition in text. | Quirino, Barcellos, Falbo (2018), survey of visual notations for software pattern languages (SBES 2018). | E.8 requires a Relations section and keeps diagrams optional, placing primacy on textual structure and explicit links. | **Adapt.** Use the finding as rationale for text‑first, relation‑explicit authoring. |

### E.8:12 - Relations

* **Builds on:** E.6, E.7  
* **Constrained by:** Guard‑Rails E.5.1–E.5.4 (lexical firewall, notation independence, etc.)  
* **Constrains:** All patterns; the DRR template references the same section order.  

### E.8:End
