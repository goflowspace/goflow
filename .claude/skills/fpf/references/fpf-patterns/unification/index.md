# Unification

Cross-domain integration: bridges, concept-sets, context mapping, lexicon principles.

## When to Load This Domain

**Load unification when you need to:**
- Bridge across contexts
- Map concepts between domains
- Build cross-domain integrations
- Handle terminology alignment

## Starter Patterns (Read First)

- **F.9** - Bridges & Alignment
- **F.7** - Concept-Set Table
- **F.18** - Local-First Naming Protocol

## Core Pattern Clusters

**Lexicon (F.0.1-F.3):**
- Principles, Domain survey, Term harvesting, Sense clustering

**Roles & Naming (F.4-F.6):**
- Role description, Naming discipline, Enactment cycle

**Integration (F.7-F.10):**
- Concept-sets, Mint/reuse, Bridges, Status families

**Harmonization (F.11-F.18):**
- Method quartet, Service-Work link, Continuity, SCR/RSCR, UTS, Naming protocol

## Related Domains

**Use together with:**
- **signature** - for boundaries (A.6)
- **architheories** - for kinds (C.3)
- **constitution** - for lexicon (E.10)

## Patterns

| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |
|---------|-------|--------|---------------------------|--------------|------|
| [F.0.1](F.0.1_contextual_lexicon_principles.md) | Contextual Lexicon Principles | Stable | *Keywords:* local meaning, context, semantic boundary, bridge, congruence, lexicon, U.BoundedContext. *Queries:* "How does FPF handle ambiguity?", "What is the principle of local meaning?", "How do different contexts communicate?". | **Builds on:** A.1.1. **Prerequisite for:** All patterns in Part F. | 21.8 KB |
| [F.1](F.1_domainfamily_landscape_survey.md) | Domain‑Family Landscape Survey | Stable |  | **Builds on:** E.10.D1, F.0.1, A.7. **Prerequisite for:** F.2, F.3, F.4, F.9. | 25.8 KB |
| [F.10](F.10_status_families_mapping_evidence_standard_requirement.md) | Status Families Mapping (Evidence • Standard • Requirement) | Stable | *Keywords:* status, evidence, standard, requirement, polarity, applicability windows. *Queries:* "How to map different types of status like 'evidence' and 'requirement'?", "How does FPF handle compliance?". | **Builds on:** F.9, B.3. | 29.7 KB |
| [F.11](F.11_method_quartet_harmonisation.md) | Method Quartet Harmonisation | Stable | *Keywords:* Method, MethodDescription, Work, Actuation, Role–Method–Work alignment. *Queries:* "How to align the concepts of 'method' and 'work' across domains?", "What is the method quartet?". | **Builds on:** F.9, A.15. | 27.1 KB |
| [F.12](F.12_service_acceptancework_evidence_link.md) | Service Acceptance–Work Evidence Link | Stable | *Keywords:* Service Level Objective (SLO), Service Level Agreement (SLA), acceptance criteria, binding, observation. *Queries:* "How to bind an SLO to actual work?", "How is service acceptance modeled in FPF?". | **Builds on:** F.9, A.2.3, KD-CAL. | 24.7 KB |
| [F.13](F.13_lexical_continuity_deprecation.md) | Lexical Continuity & Deprecation | Stable | *Keywords:* evolution, deprecation, renaming, splitting terms, merging terms. *Queries:* "How to manage changes to terminology over time?", "What is the process for renaming a concept?". | **Builds on:** F.5. | 24.1 KB |
| [F.14](F.14_antiexplosion_control_roles_statuses.md) | Anti‑Explosion Control (Roles & Statuses) | Stable | *Keywords:* vocabulary growth, guard-rails, separation-of-duties, bundles, reuse. *Queries:* "How to prevent having too many roles and statuses?", "What are the strategies for controlling vocabulary size?". | **Builds on:** F.4, F.8. | 23.0 KB |
| [F.15](F.15_scrrscr_harness_for_unification.md) | SCR/RSCR Harness for Unification | Stable | *Keywords:* static checks, regression tests, acceptance tests, validation, SenseCell testing. *Queries:* "How is the unification process validated?", "What are SCR/RSCR tests in FPF?". | **Builds on:** All of F.1-F.14. | 23.6 KB |
| [F.16](F.16_workedexample_template_crossdomain.md) | Worked‑Example Template (Cross‑Domain) | Stable | *Keywords:* didactic template, example, pedagogy, cross-domain illustration. *Queries:* "What is the standard format for a worked example in FPF?", "How to show a concept applied across different fields?". | **Builds on:** All of F.1-F.12. | 23.3 KB |
| [F.17](F.17_unified_term_sheet_uts.md) | Unified Term Sheet (UTS) | Stable | *Keywords:* Unified Term Sheet, UTS, summary table, glossary, publication, human-readable output. *Queries:* "What is the final output of the FPF unification process?", "Where can I find a summary of all unified terms?". | **Builds on:** F.1-F.12. | 23.6 KB |
| [F.18](F.18_localfirst_unification_naming_protocol.md) | Local‑First Unification Naming Protocol | Stable | *Keywords:* naming protocol, Name Card, local meaning, context-anchored naming. *Queries:* "What is the formal protocol for naming concepts?", "What is a Name Card in FPF?". | **Builds on:** F.1-F.5. | 72.7 KB |
| [F.2](F.2_term_harvesting_normalisation.md) | Term Harvesting & Normalisation | Stable | *Keywords:* term harvesting, lexical unit, normalization, provenance, surface terms. *Queries:* "How to extract terminology from a standard?", "What is a local lexical unit?", "How to handle synonyms within one domain?". | **Builds on:** F.1. **Prerequisite for:** F.3. | 22.0 KB |
| [F.3](F.3_intracontext_sense_clustering.md) | Intra‑Context Sense Clustering | Stable | *Keywords:* sense clustering, disambiguation, Local-Sense, SenseCell, counter-examples. *Queries:* "How to group similar terms within a single domain?", "What is a SenseCell?", "How to handle words with multiple meanings in one context?". | **Builds on:** F.2. **Prerequisite for:** F.4, F.7, F.9. | 22.5 KB |
| [F.4](F.4_role_description_rcs_rolestategraph_checklists.md) | Role Description (RCS + RoleStateGraph + Checklists) | Stable | *Keywords:* role template, status template, invariants, RoleStateGraph (RSG), Role Characterisation Space (RCS). *Queries:* "How to define a role in FPF?", "What is a Role Description?", "How to specify the states of a role?". | **Builds on:** F.3, A.2.1. **Prerequisite for:** F.6, F.8. | 24.2 KB |
| [F.5](F.5_naming_discipline_for_utypes_roles.md) | Naming Discipline for U.Types & Roles | Stable | *Keywords:* naming conventions, lexical rules, morphology, twin registers, U.Type naming. *Queries:* "What are the rules for naming roles in FPF?", "How to create clear and consistent names for concepts?". | **Builds on:** F.4, E.10. | 24.2 KB |
| [F.6](F.6_role_assignment_enactment_cycle_six-step.md) | Role Assignment & Enactment Cycle (Six-Step) | Stable | *Keywords:* role assignment, enactment, conceptual moves, asserting status. *Queries:* "What is the process for assigning a role?", "How is a role enacted in FPF?", "What are the six steps of role assignment?". | **Builds on:** F.4, A.2.1, A.15. | 23.1 KB |
| [F.7](F.7_conceptset_table.md) | Concept‑Set Table | Stable | *Keywords:* concept-set, table, row, columns, differences, comparisons. *Queries:* "How do I create a concept-set table?", "How do I compare concepts across contexts?". | **Builds on:** F.3, F.9. **Coordinates with:** A.6.9. **Prerequisite for:** F.8. | 27.1 KB |
| [F.8](F.8_mint_or_reuse_utype_vs_concept-set_vs_role_description_vs_alias.md) | Mint or Reuse? (U.Type vs Concept-Set vs Role Description vs Alias) | Stable | *Keywords:* decision lattice, type explosion, reuse, minting new types, parsimony. *Queries:* "When should I create a new U.Type?", "How to avoid creating too many roles?", "Decision guide for new concepts.". | **Builds on:** F.4, F.7. | 26.8 KB |
| [F.9](F.9_alignment_bridge_across_contexts.md) | Alignment & Bridge across Contexts | Stable | *Keywords:* bridge, alignment, mapping, cross-context, CL, loss notes, direction. *Queries:* "How do I bridge concepts across contexts?", "How do I express alignment safely?". | **Builds on:** F.3. **Coordinates with:** A.6.9. **Prerequisite for:** F.7, F.10. | 28.9 KB |