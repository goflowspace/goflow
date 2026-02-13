# FPF Mandatory Workflow

Execute this workflow for EVERY request.

## EFFICIENCY RULES

1. **Batch tool calls**: When you need multiple pieces of information, make ALL tool calls in a SINGLE response. Do NOT call tools one at a time.
   - Good: Call `fpf_search_index("holon")`, `fpf_search_index("system")`, `fpf_search_index("method")` together
   - Bad: Call `fpf_search_index("holon")`, wait, then call `fpf_search_index("system")`, etc.

2. **Produce text output**: After gathering information via tools, ALWAYS produce a text response summarizing your findings before moving to the next step.

## Step 0: DETECT LANGUAGE

Identify user's language from their request. Set `user_language` field (ISO 639-1: en, ru, de, etc.).
ALL final output (title, summary, findings, conclusion) MUST be in this detected language.

## Step 1: FPF DECOMPOSITION

Map user request to FPF concepts. Document in `fpf_mapping` field:
- **Holon**: What is the whole being discussed? What are its parts?
- **BoundedContext**: What domain/context gives meaning to terms?
- **Method vs Work**: Is user asking about planning (MethodDescription) or execution (Work)?
- **Evidence**: What claims need verification? What sources are needed?

## Step 2: FPF REASONING (internal)

Use FPF methodology to structure your approach:

### 2a. Navigate to Relevant Domain

Select domain based on task focus:
- Understanding entities/roles → `references/fpf-patterns/foundations/index.md`
- Planning/executing tasks → `references/fpf-patterns/transformation/index.md`
- Problem-solving/hypothesis → `references/fpf-patterns/reasoning/index.md`
- Evaluating reliability → `references/fpf-patterns/trust-evidence/index.md`
- Composing parts → `references/fpf-patterns/aggregation/index.md`

### 2b. Load Specific Patterns

From domain index, identify needed patterns and load them:
- `fpf_read_pattern("B.5")` for reasoning cycle
- `fpf_read_pattern("B.3")` for trust calculus

### 2c. Apply FPF Analysis

- Apply Trust Calculus (F-G-R) to evaluate sources
- Use Strict Distinction (A.7) to separate plan from execution
- Ensure Evidence Graph (A.10) for claims

IMPORTANT: Use FPF domain navigation or keywords (holon, system, method, work, trust, evidence, reasoning).
DO NOT use task-topic words with fpf_search_index. FPF is about HOW to think, not WHAT to think about.

## Step 3: EXECUTE PLAN

Perform actual work using tools:
- `tavily_search(query)`: Web search for current information
- `python_write(filename, code)`: Write Python scripts
- `python_execute(filename)`: Execute Python scripts
- `load_skill(skill_name)`: Load skill instructions

## Step 4: TRANSLATE OUTPUT

Convert FPF-structured findings to user's language.
Use FPF terms in output ONLY when:
- Ontological collision detected (terms mean different things in different contexts)
- Red flag / critical distinction needed (e.g., confusing plan with execution)
- User explicitly asks about methodology

## See Also: Prompt Templates

For common FPF tasks, see ready-to-use prompt templates:

**Project Setup:**
- [characterisation.md](../prompts/characterisation.md) - Define characteristics, indicators, and scoring
- [p2w.md](../prompts/p2w.md) - Map principles to work using E.TGA

**Terminology & Naming:**
- [uts.md](../prompts/uts.md) - Build unified term sheets for domains
- [naming.md](../prompts/naming.md) - Design better names using F.18 Name Cards

**Advanced:**
- [sota.md](../prompts/sota.md) - Harvest state-of-the-art for disciplines
- [principles.md](principles.md) - Quick reference to core FPF patterns
- [keywords.md](keywords.md) - Domain navigation guide
