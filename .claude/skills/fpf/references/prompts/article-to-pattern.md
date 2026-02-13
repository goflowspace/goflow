# Article → Pattern — Semantic Precision Rewrite (E.8 + RPR)

## Goal

Turn a single article into a didactic pattern using the **E.8 canonical pattern template**, while enforcing **semantic precision** and avoiding overloaded “umbrella” relations (A.6.P / RPR-style discipline).

## Prompt Template

```
Use the FPF skill as your internal methodology, but DO NOT mention:
- FPF
- any FPF pattern IDs
- the term "unpacking"
anywhere in the produced pattern text.

Input article:
- Read the FULL text at: <ARTICLE_URL>
- Base all claims and concepts ONLY on this article (no outside knowledge unless the article itself explicitly cites it).

Task:
Produce a complete pattern with ID "<PATTERN_ID>" following the E.8 canonical section structure (1–13).

Output structure requirements:
- Title line: "## <PATTERN_ID> - <short, specific title>"
- Use section headings that correspond 1:1 to the E.8 canonical sections (same order):
  1) Problem frame
  2) Problem
  3) Forces
  4) Solution
  5) Archetypal Grounding (Tell–Show–Show): one System/practice example + one Episteme/artifact/model example
  6) Bias-Annotation (what lenses you used; where you might be wrong)
  7) Conformance Checklist (checkable items)
  8) Common Anti-Patterns and How to Avoid Them
  9) Consequences (benefits + trade-offs/mitigations)
  10) Rationale
  11) SoTA-Echoing: 1–3 items; if the article provides no external sources, state that honestly and limit yourself to what the article supports
  12) Relations (how this pattern relates to other ideas/patterns) — without FPF terminology
  13) Footer marker: output exactly the single line "### <PATTERN_ID>:End" and put NO text under it

Semantic precision rules (hard constraints):
- Use ONLY semantically precise, domain-grounded concepts.
- Do NOT use vague metaphors or umbrella words as stand-ins for meaning (e.g., "foundation/base/anchor", "alignment", "sync", "connection", "dependency") unless you immediately replace them with an explicit, typed formulation that makes the ontology concrete:
  - participants (what things are related)
  - qualifiers (scope, time window, viewpoint/role, criteria)
  - direction/polarity (who depends on whom; what maps to what)
  - conditions/admissibility (when the claim holds)
  - evidence expectations (what would count as evidence in this context)
- Do NOT replace one overloaded word with another overloaded word. If you cannot find a precise replacement, define a new term with a tight scope and a mini-definition, then use it consistently.

Relational precision discipline (apply everywhere it matters):
- Treat “simple-looking” relations in the article as likely hiding missing participant roles and qualifiers.
- For each important claim, make explicit:
  - participants (who/what is related)
  - qualifiers (scope, time window, viewpoint/role, criteria)
  - invariants vs what can change (and what changes mean)
- Avoid umbrella verbs/nouns as meaning-surrogates. If you keep a plain umbrella phrase for readability, immediately follow with a precise restatement that removes ambiguity.

Didactic requirements:
- Add mini-definitions for new terms (in parentheses) on first use.
- Add 2–3 common misreadings and prophylactic clarifications (“Do not confuse X with Y”).
- Keep paragraphs short (≤ 5 sentences). Prefer lists/tables only when they improve clarity.

Evidence requirement:
- Add a final short section that cites the source article URL.
- For every non-trivial claim, connect it to the article by either:
  - a short quote (clearly marked as a quote), or
  - a faithful paraphrase (clearly marked as a paraphrase).

Final quality gate (before you output):
- Scan the entire pattern text and identify remaining ambiguous terms/relations.
- Rewrite them into precise concepts/relations, or explicitly justify why the term is already precise in this bounded context.
```

## Related Patterns

- **E.8** - Authoring conventions & canonical template
- **A.6.P** - Relational Precision Restoration (RPR) recipe
- **A.6.5** / **A.6.6** / **A.6.8** - RPR specialisations (use when they fit; otherwise apply A.6.P directly)

## When to Use

- You have an article and need to convert it into a teachable pattern
- You want semantic precision and explicit relations (no overloaded metaphors or umbrella verbs)

## See Also

- [workflow.md](../guides/workflow.md) - Mandatory workflow
- [naming.md](naming.md) - If you need to invent a precise, non-misleading term
- [uts.md](uts.md) - If the article’s terms need a disciplined glossary
