# FPF Scripts

Automation scripts for maintaining the FPF skill structure.

## split_fpf_spec.py

**Purpose:** Parse `FPF-Spec.md` and generate organized domain files with enriched metadata.

**⚠️ Version Specificity:** This script is tightly coupled to the structure and format of a specific FPF specification version. When working with different versions of `FPF-Spec.md`, you may need to adjust parsing logic, metadata extraction patterns, or domain mappings to match the specification's current format.

### Usage

```bash
# Generate/update pattern files and domain indexes
uv run skills/fpf/scripts/split_fpf_spec.py

# Analyze specification without generating files
uv run skills/fpf/scripts/split_fpf_spec.py --analyze
```

### What it does

1. **Pattern Extraction:**
   - Parses `FPF-Spec.md` into individual pattern files
   - Organizes patterns by domain (foundations, aggregation, etc.)
   - Generates Markdown files in `references/fpf-patterns/{domain}/{pattern_id}.md`

2. **Metadata Enrichment:**
   - Extracts pattern metadata from Table of Contents:
     - Status (Stable/Draft/etc.)
     - Keywords & Search Queries
     - Dependencies (Builds on, Uses, etc.)
     - Pattern size
   - Populates 6-column tables in domain indexes

3. **Navigation Preservation:**
   - **Preserves** manually authored navigation sections in `domain/index.md` files:
     - "When to Load This Domain"
     - "Starter Patterns (Read First)"
     - "Core Pattern Clusters"
     - "Related Domains"
   - **Regenerates** only the "## Patterns" table with updated metadata

4. **Master Index:**
   - Generates `references/fpf-patterns/index.md` only if it doesn't exist
   - Once created, it's manually maintained (won't be overwritten)

### Workflow

**When updating FPF-Spec.md:**

1. Edit `FPF-Spec.md` (add/modify patterns, update TOC metadata)
2. Run: `uv run skills/fpf/scripts/split_fpf_spec.py`
3. Review changes - navigation sections preserved, tables updated
4. Commit changes

**When adding new patterns:**

1. Run with `--analyze` to see unmapped patterns
2. Update `DOMAIN_MAPPING` in the script if needed
3. Run generation to create new pattern files
4. Manually enhance domain `index.md` with navigation for new patterns

### Domain Index Structure

Each `references/fpf-patterns/{domain}/index.md` has:

```markdown
# Domain Name

Brief description.

## When to Load This Domain
[Manual navigation - preserved]

## Starter Patterns (Read First)
[Manual navigation - preserved]

## Core Pattern Clusters
[Manual navigation - preserved]

## Related Domains
[Manual navigation - preserved]

## Patterns
[Auto-generated 6-column table - regenerated each run]
```

### Pattern Table Format

```markdown
| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |
|---------|-------|--------|---------------------------|--------------|------|
| A.1 | Pattern Title | Stable | *Keywords:* ... *Queries:* ... | **Builds on:** ... | 25.3 KB |
```

All metadata extracted from `FPF-Spec.md` Table of Contents.

## Configuration

Edit `split_fpf_spec.py` to modify:

- `FPF_SPEC_PATH` - source specification file
- `OUTPUT_DIR` - output directory for generated files
- `DOMAIN_MAPPING` - pattern ID to domain mapping

## Best Practices

1. **Never manually edit pattern tables** - they're auto-generated
2. **Always enhance navigation sections** after adding new domains
3. **Run with --analyze** before major updates to check for unmapped patterns
4. **Test generation** on a branch before committing
5. **Keep navigation AI-centric** - focus on when/why to load, not what it contains
6. **Verify script compatibility** - when upgrading FPF specification version, review and adjust the script's parsing logic to match the new format
