"""FPF Tool Functions for Progressive Disclosure.

These tools provide access to the FPF specification without context overflow:
- fpf_search_index: Low token cost keyword search across domains
- fpf_read_pattern: Load specific pattern content on demand

Index structure (4-level progressive disclosure):
- references/fpf-patterns/index.md (master index listing domains)
- references/fpf-patterns/{domain}/index.md (domain index with pattern TOC)
- references/fpf-patterns/{domain}/{pattern_id}_{title}.md (individual patterns)
"""

import logging
import re
from pathlib import Path

from pydantic_ai import RunContext

logger = logging.getLogger(__name__)

# Path to fpf-patterns directory (relative to this script)
FPF_PATTERNS_PATH = Path(__file__).parent.parent / "references" / "fpf-patterns"

# Domain definitions for search routing
DOMAINS = [
    "foundations",
    "transformation",
    "reasoning",
    "trust-evidence",
    "aggregation",
    "signature",
    "architheories",
    "constitution",
    "unification",
    "ethics",
    "sota",
]

# Cache for parsed indexes
_domain_patterns_cache: dict[str, list[dict]] = {}


def _normalize_search_text(text: str) -> str:
    """Normalize text for keyword search."""
    normalized = text.lower().replace("*", " ").replace("`", " ")
    return re.sub(r"\s+", " ", normalized).strip()


def _parse_domain_index(domain: str) -> list[dict]:
    """Parse domain index.md and extract pattern info.
    
    Returns list of dicts:
    [{"id": "A.1", "title": "...", "filename": "...", "keywords": "..."}, ...]
    """
    if domain in _domain_patterns_cache:
        return _domain_patterns_cache[domain]
    
    index_path = FPF_PATTERNS_PATH / domain / "index.md"
    if not index_path.exists():
        return []
    
    content = index_path.read_text(encoding="utf-8")
    patterns = []

    for line in content.splitlines():
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.split("|")[1:-1]]
        if len(cells) < 2:
            continue
        match = re.match(r"\[([A-G]\.[^\]]+)\]\(([^)]+)\)", cells[0])
        if not match:
            continue
        pattern_id = match.group(1).strip()
        filename = match.group(2).strip()
        title = cells[1].strip()
        keywords = cells[3].strip() if len(cells) > 3 else ""
        patterns.append({
            "id": pattern_id,
            "title": title,
            "filename": filename,
            "keywords": keywords,
            "domain": domain,
        })
    
    _domain_patterns_cache[domain] = patterns
    return patterns


def _get_all_patterns() -> list[dict]:
    """Get all patterns from all domains."""
    all_patterns = []
    for domain in DOMAINS:
        all_patterns.extend(_parse_domain_index(domain))
    return all_patterns


def _search_patterns(keyword: str) -> list[dict]:
    """Search for patterns matching keyword in ID, title, or keywords."""
    keyword_lower = _normalize_search_text(keyword)
    results = []
    
    for pattern in _get_all_patterns():
        searchable = " ".join([
            pattern.get("id", ""),
            pattern.get("title", ""),
            pattern.get("keywords", ""),
        ])
        searchable = _normalize_search_text(searchable)
        if keyword_lower and keyword_lower in searchable:
            results.append(pattern)
    
    return results


def _find_pattern_file(pattern_id: str) -> Path | None:
    """Find the file path for a specific pattern ID."""
    pattern_id = pattern_id.strip().upper()
    # Normalize: ensure letter is uppercase, rest as-is
    if pattern_id and pattern_id[0].isalpha():
        pattern_id = pattern_id[0].upper() + pattern_id[1:]
    
    for domain in DOMAINS:
        patterns = _parse_domain_index(domain)
        for p in patterns:
            if p["id"].upper() == pattern_id:
                return FPF_PATTERNS_PATH / domain / p["filename"]
    
    # Fallback: search files directly
    for domain in DOMAINS:
        domain_path = FPF_PATTERNS_PATH / domain
        if not domain_path.exists():
            continue
        for file in domain_path.glob(f"{pattern_id}_*.md"):
            return file
        # Try case-insensitive
        for file in domain_path.glob("*.md"):
            if file.name.lower().startswith(pattern_id.lower() + "_"):
                return file
    
    return None


async def fpf_search_index(ctx: RunContext[None], keyword: str) -> str:
    """
    Search FPF index for patterns matching keyword (ID, title, or keywords/queries).
    
    This is the first tool to use when starting any task.
    Returns a list of pattern IDs with their titles and domains.
    
    Args:
        ctx: Run context (required by pydantic-ai)
        keyword: Search term (e.g., "trust", "evidence", "holon")
        
    Returns:
        Formatted list of matching patterns, or "No patterns found"
        
    Example:
        fpf_search_index("trust")
        # Returns:
        # B.3 - Trust & Assurance Calculus (trust-evidence)
        # B.3.4 - Evidence Decay & Epistemic Debt (trust-evidence)
    """
    results = _search_patterns(keyword)
    
    if results:
        # Deduplicate and format
        unique = {p["id"]: p for p in results}
        formatted = sorted(
            f"{p['id']} - {p['title']} ({p['domain']})"
            for p in unique.values()
        )
        logger.info(f"FPF search '{keyword}': found {len(formatted)} patterns")
        return "\n".join(formatted)
    
    logger.info(f"FPF search '{keyword}': no patterns found")
    return (
        "No patterns found for this keyword.\n"
        "Try different terms like: holon, system, method, work, trust, evidence, role, context\n"
        "Or navigate by domain - see SKILL.md for domain navigation table."
    )


async def fpf_read_pattern(ctx: RunContext[None], pattern_id: str) -> str:
    """
    Load full content of a specific FPF pattern.
    
    Use this after fpf_search_index to load pattern details.
    
    Args:
        ctx: Run context (required by pydantic-ai)
        pattern_id: Pattern identifier (e.g., "A.1", "B.3", "A.15.1")
        
    Returns:
        Full markdown content of the pattern, or error message
        
    Example:
        fpf_read_pattern("A.3")
        # Returns full text of Pattern A.3 - Transformer Constitution (Quartet)
    """
    pattern_id = pattern_id.strip()
    
    if not pattern_id or "." not in pattern_id:
        return f"Invalid pattern ID format: '{pattern_id}'. Expected format: 'A.1', 'B.3', etc."
    
    file_path = _find_pattern_file(pattern_id)
    
    if file_path and file_path.exists():
        logger.info(f"FPF read pattern: {pattern_id} from {file_path.parent.name}")
        return file_path.read_text(encoding="utf-8")
    
    # Pattern not found - provide helpful suggestions
    part_letter = pattern_id[0].upper()
    
    # Find patterns with same prefix
    all_patterns = _get_all_patterns()
    suggestions = [
        p for p in all_patterns 
        if p["id"].startswith(part_letter + ".")
    ][:5]
    
    if suggestions:
        suggestion_str = ", ".join(p["id"] for p in suggestions)
        return (
            f"Pattern '{pattern_id}' not found.\n"
            f"Available patterns starting with {part_letter}: {suggestion_str}...\n"
            "Use fpf_search_index to find patterns."
        )
    
    return (
        f"Pattern '{pattern_id}' not found.\n"
        "Use fpf_search_index to find patterns, or navigate by domain in SKILL.md."
    )


async def fpf_list_domain(ctx: RunContext[None], domain: str) -> str:
    """
    List all patterns in a specific domain.
    
    Use this to explore available patterns in a domain.
    
    Args:
        ctx: Run context (required by pydantic-ai)
        domain: Domain name (e.g., "foundations", "reasoning", "trust-evidence")
        
    Returns:
        List of patterns in the domain, or error if domain not found
        
    Example:
        fpf_list_domain("reasoning")
        # Returns:
        # B.5 - Canonical Reasoning Cycle
        # B.5.1 - Explore → Shape → Evidence → Operate
        # ...
    """
    domain = domain.strip().lower()
    
    if domain not in DOMAINS:
        return (
            f"Domain '{domain}' not found.\n"
            f"Available domains: {', '.join(DOMAINS)}"
        )
    
    patterns = _parse_domain_index(domain)
    
    if not patterns:
        return f"No patterns found in domain '{domain}'."
    
    formatted = [f"{p['id']} - {p['title']}" for p in patterns]
    logger.info(f"FPF list domain '{domain}': {len(formatted)} patterns")
    
    return f"# {domain.replace('-', ' ').title()}\n\n" + "\n".join(formatted)
