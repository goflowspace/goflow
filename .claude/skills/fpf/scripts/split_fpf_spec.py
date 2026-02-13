"""Split FPF-Spec.md into domain-organized files with 4-level progressive disclosure.

This script:
1. Reads the large FPF-Spec.md file
2. Splits it into individual .md files by pattern (## A.1, ## B.3, etc.)
3. Organizes files into semantic domain directories (foundations, reasoning, etc.)
4. Generates index.md per domain with pattern TOC and "Load when..." guidance

Usage:
    uv run skills/fpf/scripts/split_fpf_spec.py           # Generate files
    uv run skills/fpf/scripts/split_fpf_spec.py --analyze # Analyze without writing
"""

import argparse
import logging
import re
from collections import defaultdict
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

# Paths
SCRIPT_DIR = Path(__file__).parent
FPF_SKILL_DIR = SCRIPT_DIR.parent
FPF_PATTERNS_DIR = FPF_SKILL_DIR / "references" / "fpf-patterns"
FPF_ROOT_DIR = FPF_SKILL_DIR.parent.parent

FPF_SPEC_PATH = FPF_ROOT_DIR / "FPF-Spec.md"

# Domain definitions with descriptions and "Load when..." guidance
DOMAINS = {
    "foundations": {
        "description": "Core ontological concepts: holons, entities, roles, and fundamental distinctions.",
        "load_when": "understanding what entities ARE, modeling basics, identity vs structure",
    },
    "transformation": {
        "description": "Action and change patterns: methods, work, execution, and evolution cycles.",
        "load_when": "planning tasks, executing work, understanding plan vs reality",
    },
    "reasoning": {
        "description": "Problem-solving and thinking patterns: reasoning cycles, abduction, exploration.",
        "load_when": "problem-solving, hypothesis generation, creative thinking",
    },
    "trust-evidence": {
        "description": "Trust, reliability, and evidence patterns: F-G-R calculus, assurance, provenance.",
        "load_when": "evaluating claims, checking reliability, evidence chains",
    },
    "aggregation": {
        "description": "Composition and emergence patterns: Gamma operator, meta-holon transitions, mereology.",
        "load_when": "combining parts, understanding emergence, holarchy",
    },
    "signature": {
        "description": "Interface and boundary patterns: signature stack, boundary norms, epistemic morphing.",
        "load_when": "interface design, boundary discipline, type systems",
    },
    "architheories": {
        "description": "Domain-specific calculi and characterizations: Sys-CAL, Kind-CAL, Method-CAL, etc.",
        "load_when": "domain-specific modeling, specialized calculi",
    },
    "constitution": {
        "description": "FPF core principles, pillars, authoring guides, and governance patterns.",
        "load_when": "understanding FPF rules, constraints, authoring",
    },
    "unification": {
        "description": "Cross-domain integration patterns: bridges, mappings, universal structures.",
        "load_when": "integrating across domains, building bridges",
    },
    "ethics": {
        "description": "Multi-scale ethics, conflict resolution, and axiological patterns.",
        "load_when": "ethical considerations, conflict resolution, values",
    },
    "sota": {
        "description": "State-of-the-art patterns: discipline packs, benchmarks, telemetry.",
        "load_when": "advanced usage, benchmarking, discipline-specific packs",
    },
}

# Pattern ID -> Domain mapping
# Uses prefix matching: "A.1" matches "A.1", "A.1.1", "A.1.2", etc.
DOMAIN_MAPPING = {
    # Foundations: A.1, A.1.1, A.2-A.2.9, A.7-A.11
    "A.0": "foundations",
    "A.1": "foundations",
    "A.2": "foundations",
    "A.7": "foundations",
    "A.8": "foundations",
    "A.9": "foundations",
    "A.11": "foundations",
    "A.12": "foundations",
    "A.13": "foundations",
    
    # Transformation: A.3, A.3.x, A.4, A.15, A.15.x, B.4, B.4.x
    "A.3": "transformation",
    "A.4": "transformation",
    "A.5": "constitution",  # Open-Ended Kernel & Extension Layering
    "A.15": "transformation",
    "B.4": "transformation",
    
    # Reasoning: B.5, B.5.x, B.6, B.7
    "B.5": "reasoning",
    "B.6": "reasoning",
    "B.7": "reasoning",
    
    # Trust-Evidence: A.10, B.3, B.3.x, C.2, C.2.x
    "A.10": "trust-evidence",
    "B.3": "trust-evidence",
    "C.2": "trust-evidence",
    
    # Aggregation: B.1, B.1.x, B.2, B.2.x, A.14
    "A.14": "aggregation",
    "B.1": "aggregation",
    "B.2": "aggregation",
    
    # Signature: A.6, A.6.x (all A.6.* patterns)
    "A.6": "signature",
    
    # Architheories: All Part C except C.2
    "C.1": "architheories",
    "C.3": "architheories",
    "C.4": "architheories",
    "C.5": "architheories",
    "C.6": "architheories",
    "C.7": "architheories",
    "C.9": "architheories",
    "C.10": "architheories",
    "C.11": "architheories",
    "C.12": "architheories",
    "C.13": "architheories",
    "C.14": "architheories",
    "C.15": "architheories",
    "C.16": "architheories",
    "C.17": "architheories",
    "C.18": "architheories",
    "C.19": "architheories",
    "C.20": "architheories",
    "C.21": "architheories",
    "C.22": "architheories",
    "C.23": "architheories",
    "C.24": "architheories",
    "C.25": "architheories",
    
    # Constitution: Part E
    "E": "constitution",
    
    # Unification: Part F
    "F": "unification",
    
    # Ethics: Part D
    "D": "ethics",
    
    # SOTA: Part G
    "G": "sota",
    
    # Characteristics (A.17-A.21) -> foundations (measurement/state concepts)
    "A.17": "foundations",
    "A.18": "foundations",
    "A.19": "foundations",
    "A.20": "foundations",
    "A.21": "foundations",
}


def get_domain_for_pattern(pattern_id: str) -> str:
    """Get domain for a pattern ID using prefix matching."""
    # Try exact match first
    if pattern_id in DOMAIN_MAPPING:
        return DOMAIN_MAPPING[pattern_id]
    
    # Try progressively shorter prefixes
    # E.g., for "A.6.B", try "A.6.B", "A.6", "A"
    parts = pattern_id.split(".")
    for i in range(len(parts) - 1, 0, -1):
        prefix = ".".join(parts[:i])
        if prefix in DOMAIN_MAPPING:
            return DOMAIN_MAPPING[prefix]
    
    # Try just the letter
    if parts[0] in DOMAIN_MAPPING:
        return DOMAIN_MAPPING[parts[0]]
    
    # Default fallback
    logger.warning(f"No domain mapping for {pattern_id}, using 'foundations'")
    return "foundations"


def sanitize_filename(title: str) -> str:
    """Convert title to safe filename."""
    safe = re.sub(r"[^\w\s-]", "", title)
    safe = re.sub(r"\s+", "_", safe.strip())
    return safe.lower()[:80]  # Increased from 50 to 80 to avoid truncation


# Pattern regex: matches IDs like:
# - A.1, A.1.1, B.3.4
# - A.6.B, A.6.P, C.3.A
# - G.Core
# - A.19.SelectorMechanism (mixed-case tokens)
#
# IMPORTANT: the ID group must capture the full token(s), not truncate at the first lowercase.
PATTERN_REGEX = re.compile(r"^## ([A-G])\.([A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*)\s*[-–—]?\s*(.*)$")


def parse_toc_metadata(content: str) -> dict[str, dict]:
    """Parse TOC section from FPF-Spec.md to extract pattern metadata.
    
    Actual TOC structure (after split by "|" and [1:-1]):
    cells[0]: ID (A.0, A.1, etc.)
    cells[1]: Title (**Onboarding...**)
    cells[2]: Status (Stable/Draft/etc.)
    cells[3]: Keywords & Search Queries
    cells[4]: Dependencies
    
    Returns:
        Dict mapping pattern_id to metadata (title, status, keywords, queries, dependencies)
    """
    lines = content.split("\n")
    metadata = {}
    in_part = False
    
    for line in lines:
        # Detect Part A, B, C, etc. sections
        if "**Part " in line and ("Cluster" in line or "Architecture" in line or "Specifications" in line):
            in_part = True
            continue
        
        # Exit when we hit the actual pattern section (## A.0, ## A.1, etc.)
        if in_part and line.startswith("## ") and PATTERN_REGEX.match(line):
            break
        
        if not in_part:
            continue
        
        # Skip empty lines, separator lines, header lines, and cluster headers
        stripped = line.strip()
        if (not stripped or 
            stripped.startswith("|:") or 
            "ID & Title" in line or 
            "***Cluster" in line or
            "ID & Title                                                                                        " in line):
            continue
        
        # Parse table rows: | ID | Title | Status | Keywords & Queries | Dependencies |
        if line.startswith("|"):
            cells = [c.strip() for c in line.split("|")[1:-1]]
            if len(cells) < 4:  # Need at least: ID, Title, Status, Keywords
                continue
            
            # Extract pattern ID from column 0 (remove ** if present)
            pattern_id = cells[0].strip().strip("*").strip()
            
            # Pattern ID must match A.0, A.1.1, A.6.B, G.Core, etc.
            if not re.match(r"^[A-G]\.[A-Za-z0-9.]+$", pattern_id):
                continue
            
            # Extract status (column 2)
            status = cells[2].strip() if len(cells) > 2 else ""
            valid_statuses = ["Stable", "Draft", "New", "Stub", "Deprecated", "Transitional stub"]
            if status not in valid_statuses:
                status = ""
            
            # Extract title (column 1) - remove basic markdown markers
            raw_title = cells[1].strip() if len(cells) > 1 else ""
            title = (
                raw_title.replace("**", "")
                .replace("`", "")
                .strip()
            )

            # Extract keywords & queries (column 3)
            kw_queries = cells[3].strip() if len(cells) > 3 else ""
            keywords = ""
            queries = ""
            if "*Keywords:*" in kw_queries:
                parts = kw_queries.split("*Queries:*")
                keywords = parts[0].replace("*Keywords:*", "").strip()
                if len(parts) > 1:
                    queries = parts[1].strip()
            
            # Extract dependencies (column 4)
            dependencies = cells[4].strip() if len(cells) > 4 else ""
            
            metadata[pattern_id] = {
                "title": title,
                "status": status,
                "keywords": keywords,
                "queries": queries,
                "dependencies": dependencies,
            }
    
    return metadata


def split_spec() -> dict[str, list[dict]]:
    """Split FPF-Spec.md into individual files organized by domain.
    
    Returns:
        Dict mapping domain name to list of pattern info dicts.
    """
    if not FPF_SPEC_PATH.exists():
        logger.error(f"FPF-Spec.md not found at {FPF_SPEC_PATH}")
        return {}
    
    logger.info(f"Reading {FPF_SPEC_PATH}...")
    content = FPF_SPEC_PATH.read_text(encoding="utf-8")
    
    # Parse TOC metadata first
    logger.info("Parsing TOC metadata...")
    toc_metadata = parse_toc_metadata(content)
    logger.info(f"Extracted metadata for {len(toc_metadata)} patterns from TOC")
    
    lines = content.split("\n")
    
    # Clean and create domain directories
    logger.info("Cleaning old pattern files...")
    for domain in DOMAINS.keys():
        domain_dir = FPF_PATTERNS_DIR / domain
        if domain_dir.exists():
            # Remove all .md files except index.md
            for old_file in domain_dir.glob("*.md"):
                if old_file.name != "index.md":
                    old_file.unlink()
        domain_dir.mkdir(parents=True, exist_ok=True)
    
    # Collect patterns per domain
    domain_patterns: dict[str, list[dict]] = {domain: [] for domain in DOMAINS.keys()}
    
    current_pattern_id = None
    current_pattern_title = None
    current_content_lines = []
    patterns_found = 0
    body_pattern_ids: set[str] = set()
    
    def save_current_pattern():
        """Save accumulated content to file in appropriate domain."""
        nonlocal patterns_found
        if current_pattern_id and current_content_lines:
            domain = get_domain_for_pattern(current_pattern_id)
            filename = f"{current_pattern_id}_{sanitize_filename(current_pattern_title or 'pattern')}.md"
            filepath = FPF_PATTERNS_DIR / domain / filename
            
            content_text = "\n".join(current_content_lines)
            filepath.write_text(content_text, encoding="utf-8")
            
            # Get metadata from TOC
            pattern_meta = toc_metadata.get(current_pattern_id, {})
            
            # Track pattern info for index generation
            domain_patterns[domain].append({
                "id": current_pattern_id,
                "title": current_pattern_title or pattern_meta.get("title") or current_pattern_id,
                "filename": filename,
                "size_kb": len(content_text.encode("utf-8")) / 1024,
                "status": pattern_meta.get("status", ""),
                "keywords": pattern_meta.get("keywords", ""),
                "queries": pattern_meta.get("queries", ""),
                "dependencies": pattern_meta.get("dependencies", ""),
            })
            
            patterns_found += 1
            body_pattern_ids.add(current_pattern_id)
    
    for line in lines:
        match = PATTERN_REGEX.match(line)
        if match:
            # Save previous pattern
            save_current_pattern()
            
            # Start new pattern
            part_letter = match.group(1)
            pattern_num = match.group(2)
            current_pattern_id = f"{part_letter}.{pattern_num}"
            current_pattern_title = match.group(3).strip() if match.group(3) else ""
            current_content_lines = [line]
        elif current_pattern_id:
            current_content_lines.append(line)
    
    # Save last pattern
    save_current_pattern()
    
    logger.info(f"Split into {patterns_found} pattern files")

    # Ensure that every pattern listed in TOC exists as a file.
    # If a pattern is in TOC but has no full body section (no '## <ID> ...' header),
    # we emit a stub file so the skill doesn't silently lose pattern IDs.
    toc_ids = set(toc_metadata.keys())
    missing_from_body = sorted(toc_ids - body_pattern_ids)
    if missing_from_body:
        logger.info(f"TOC patterns missing from body: {len(missing_from_body)} -> generating stubs")
    for pattern_id in missing_from_body:
        domain = get_domain_for_pattern(pattern_id)
        pattern_meta = toc_metadata.get(pattern_id, {})
        title = pattern_meta.get("title") or pattern_id
        filename = f"{pattern_id}_{sanitize_filename(title)}.md"
        filepath = FPF_PATTERNS_DIR / domain / filename

        stub_lines = [
            f"## {pattern_id} - {title}",
            "",
            "**Stub notice.** This pattern ID exists in the specification TOC, but no full pattern body",
            "section (`## ...`) was found in `FPF-Spec.md` at the time of extraction.",
            "",
            "### TOC metadata",
            f"- Status: {pattern_meta.get('status', '')}",
            f"- Keywords: {pattern_meta.get('keywords', '')}",
            f"- Queries: {pattern_meta.get('queries', '')}",
            f"- Dependencies: {pattern_meta.get('dependencies', '')}",
            "",
        ]

        content_text = "\n".join(stub_lines)
        filepath.write_text(content_text, encoding="utf-8")

        domain_patterns[domain].append({
            "id": pattern_id,
            "title": title,
            "filename": filename,
            "size_kb": len(content_text.encode("utf-8")) / 1024,
            "status": pattern_meta.get("status", ""),
            "keywords": pattern_meta.get("keywords", ""),
            "queries": pattern_meta.get("queries", ""),
            "dependencies": pattern_meta.get("dependencies", ""),
        })
    
    return domain_patterns


def parse_existing_navigation(index_path: Path) -> str:
    """Extract navigation sections from existing index.md (everything before ## Patterns).
    
    Returns:
        The navigation content as string, or empty string if not found.
    """
    if not index_path.exists():
        return ""
    
    try:
        content = index_path.read_text(encoding="utf-8")
        lines = content.split("\n")
        
        # Find where the pattern table starts
        pattern_section_idx = None
        for i, line in enumerate(lines):
            if line.strip() in ["## Patterns", "## All Patterns"]:
                pattern_section_idx = i
                break
        
        if pattern_section_idx is None:
            # No pattern section found, assume the whole thing is navigation
            return content
        
        # Extract everything before the pattern section
        navigation_lines = lines[:pattern_section_idx]
        return "\n".join(navigation_lines).rstrip()
    
    except Exception as e:
        logger.warning(f"Could not parse existing navigation from {index_path}: {e}")
        return ""


def generate_domain_indexes(domain_patterns: dict[str, list[dict]]):
    """Generate index.md for each domain, preserving existing navigation sections."""
    for domain, patterns in domain_patterns.items():
        if not patterns:
            continue
        
        domain_info = DOMAINS[domain]
        index_path = FPF_PATTERNS_DIR / domain / "index.md"
        
        # Sort patterns by ID
        patterns.sort(key=lambda p: p["id"])
        
        # Try to preserve existing navigation
        existing_nav = parse_existing_navigation(index_path)
        
        if existing_nav:
            # Use existing navigation (includes title, description, and all custom sections)
            logger.info(f"  {domain}: preserving existing navigation")
            lines = [existing_nav, ""]
        else:
            # Generate minimal navigation for new domains
            logger.info(f"  {domain}: generating new navigation")
            lines = [
                f"# {domain.replace('-', ' ').title()}",
                "",
                domain_info["description"],
                "",
                f"**Load when**: {domain_info['load_when']}",
                "",
            ]
        
        # Add pattern table header
        lines.extend([
            "## Patterns",
            "",
            "| Pattern | Title | Status | Keywords & Search Queries | Dependencies | Size |",
            "|---------|-------|--------|---------------------------|--------------|------|",
        ])
        
        # Add pattern rows
        for p in patterns:
            size_str = f"{p['size_kb']:.1f} KB"
            
            # Combine keywords and queries into single column
            kw_queries = ""
            if p.get("keywords") or p.get("queries"):
                parts = []
                if p.get("keywords"):
                    parts.append(f"*Keywords:* {p['keywords']}")
                if p.get("queries"):
                    parts.append(f"*Queries:* {p['queries']}")
                kw_queries = " ".join(parts)
            
            lines.append(
                f"| [{p['id']}]({p['filename']}) | {p['title']} | {p.get('status', '')} | "
                f"{kw_queries} | {p.get('dependencies', '')} | {size_str} |"
            )
        
        # Write the merged content
        index_path.write_text("\n".join(lines), encoding="utf-8")
        
        logger.info(f"  {domain}: {len(patterns)} patterns -> index.md")


def generate_master_index(domain_patterns: dict[str, list[dict]]):
    """Generate master index showing all domains (basic structure only).
    
    Note: The actual master index is manually maintained with enhanced navigation.
    This function creates a minimal version that can be used as a starting point.
    """
    lines = [
        "# FPF Core Reference",
        "",
        "Progressive disclosure index for FPF patterns.",
        "",
        "## Domains",
        "",
        "| Domain | Patterns | Load when... |",
        "|--------|----------|--------------|",
    ]
    
    for domain, patterns in domain_patterns.items():
        if not patterns:
            continue
        domain_info = DOMAINS[domain]
        count = len(patterns)
        lines.append(f"| [{domain}]({domain}/index.md) | {count} | {domain_info['load_when']} |")
    
    total = sum(len(p) for p in domain_patterns.values())
    domain_count = len([d for d in domain_patterns.values() if d])
    lines.append("")
    lines.append(f"**Total: {total} patterns across {domain_count} domains**")
    
    index_path = FPF_PATTERNS_DIR / "index.md"
    
    # Only write if it doesn't exist or user wants to regenerate
    # (to avoid overwriting manually enhanced version)
    if not index_path.exists():
        index_path.write_text("\n".join(lines), encoding="utf-8")
        logger.info(f"Generated master index: {index_path}")
    else:
        logger.info(f"Master index exists, skipping (manually maintained)")


def analyze_spec():
    """Analyze FPF-Spec.md without writing files - show statistics and unmapped patterns."""
    if not FPF_SPEC_PATH.exists():
        logger.error(f"FPF-Spec.md not found at {FPF_SPEC_PATH}")
        return
    
    logger.info("FPF Specification Analysis")
    logger.info("=" * 60)
    
    # Get file stats
    file_size = FPF_SPEC_PATH.stat().st_size
    content = FPF_SPEC_PATH.read_text(encoding="utf-8")
    lines = content.split("\n")
    
    logger.info(f"Source: {FPF_SPEC_PATH}")
    logger.info(f"Size: {file_size / (1024*1024):.1f} MB ({file_size:,} bytes)")
    
    # Parse patterns
    patterns_by_part = defaultdict(list)
    patterns_by_domain = defaultdict(list)
    unmapped_patterns = []
    
    for line in lines:
        match = PATTERN_REGEX.match(line)
        if match:
            part_letter = match.group(1)
            pattern_num = match.group(2)
            pattern_id = f"{part_letter}.{pattern_num}"
            title = match.group(3).strip() if match.group(3) else ""
            
            patterns_by_part[part_letter].append((pattern_id, title))
            
            # Check domain mapping
            domain = get_domain_for_pattern(pattern_id)
            patterns_by_domain[domain].append((pattern_id, title))
            
            # Check if it triggered a warning (fallback to foundations)
            if domain == "foundations" and not any(
                pattern_id.startswith(prefix) for prefix in [
                    "A.0", "A.1", "A.2", "A.7", "A.8", "A.9", "A.11", 
                    "A.12", "A.13", "A.17", "A.18", "A.19", "A.20", "A.21"
                ]
            ):
                # Check if it's truly unmapped (not via fallback)
                test_parts = pattern_id.split(".")
                is_mapped = False
                for i in range(len(test_parts), 0, -1):
                    prefix = ".".join(test_parts[:i])
                    if prefix in DOMAIN_MAPPING:
                        is_mapped = True
                        break
                if not is_mapped and test_parts[0] not in DOMAIN_MAPPING:
                    unmapped_patterns.append((pattern_id, title))
    
    total_patterns = sum(len(p) for p in patterns_by_part.values())
    logger.info(f"Total patterns: {total_patterns}")
    logger.info("")
    
    # Distribution by Part
    logger.info("Distribution by Part:")
    for part in sorted(patterns_by_part.keys()):
        logger.info(f"  Part {part}: {len(patterns_by_part[part])} patterns")
    logger.info("")
    
    # Distribution by Domain
    logger.info("Distribution by Domain:")
    for domain in sorted(patterns_by_domain.keys()):
        logger.info(f"  {domain}: {len(patterns_by_domain[domain])} patterns")
    logger.info("")
    
    # Unmapped patterns
    if unmapped_patterns:
        logger.warning(f"Unmapped patterns (need DOMAIN_MAPPING update): {len(unmapped_patterns)}")
        for pattern_id, title in sorted(unmapped_patterns):
            logger.warning(f"  {pattern_id} - {title}")
    else:
        logger.info("All patterns have domain mappings!")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Split FPF-Spec.md into domain-organized files"
    )
    parser.add_argument(
        "--analyze",
        action="store_true",
        help="Analyze specification without writing files"
    )
    args = parser.parse_args()
    
    if args.analyze:
        analyze_spec()
    else:
        logger.info("FPF Specification Splitter (4-Level Progressive Disclosure)")
        logger.info("=" * 60)
        
        domain_patterns = split_spec()
        if domain_patterns:
            generate_domain_indexes(domain_patterns)
            generate_master_index(domain_patterns)
            logger.info("Done!")
        else:
            logger.error("Failed to split specification")


if __name__ == "__main__":
    main()
