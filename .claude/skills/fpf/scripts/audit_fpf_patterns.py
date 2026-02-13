"""
Audit FPF pattern coverage between the spec TOC and decomposed files.

This script is intentionally conservative:
- It treats pattern IDs as A–K (including annex/index stubs), e.g. A.1, E.17.0, A.19.ULSAM, G.Core, H.1.
- It extracts expected IDs from the TOC section of FPF-Spec.md (streaming; does not load the whole file).
- It extracts present IDs from decomposed filenames under skills/fpf/references/fpf-patterns/**.
- It excludes patterns whose TOC Status is exactly "Stub" (case-insensitive). "Transitional stub" is NOT excluded.

Usage examples:
    python skills/fpf/scripts/audit_fpf_patterns.py
    python skills/fpf/scripts/audit_fpf_patterns.py --print-ids
    python skills/fpf/scripts/audit_fpf_patterns.py --source both
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path
from typing import Iterable


# Pattern IDs we care about: A–K.
# Examples matched:
#   A.1
#   A.6.B
#   E.17.0
#   A.19.ULSAM
#   A.19.SelectorMechanism
#   G.Core
#   C.3.A
#   E.10.D2
PATTERN_ID_RE = re.compile(r"\b[A-K](?:\.(?:\d+|[A-Za-z][A-Za-z0-9_]*))+\b")

# First real pattern header in the spec body (after TOC).
FIRST_PATTERN_HEADER_RE = re.compile(r"^##\s+[A-K]\.(?:\d+|[A-Z])")


def extract_ids_from_text(text: str) -> set[str]:
    return set(PATTERN_ID_RE.findall(text))


def iter_lines(path: Path) -> Iterable[str]:
    # Streaming read: avoids loading huge files fully into memory.
    with path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            yield line.rstrip("\n")


def extract_ids_from_spec_toc(spec_path: Path) -> set[str]:
    in_toc = False
    ids: set[str] = set()

    for line in iter_lines(spec_path):
        if not in_toc and line.strip() == "# Table of Content":
            in_toc = True
            continue

        if in_toc and FIRST_PATTERN_HEADER_RE.match(line):
            break

        if not in_toc:
            continue

        # Parse markdown tables and only take the first column (pattern ID).
        # This avoids false positives from dependencies columns (A.22, E.TGA, cluster labels, etc.).
        if not line.startswith("|"):
            continue

        cells = [c.strip() for c in line.split("|")[1:-1]]
        if not cells:
            continue

        # In pattern tables, the TOC schema is typically:
        #   | § | ID & Title | Status | Keywords & Search Queries | Dependencies |
        # So "Status" is usually the 3rd cell (index 2).
        status_cell = cells[2] if len(cells) >= 3 else ""
        status_norm = status_cell.strip().strip("*").strip().lower()

        pattern_id = cells[0].strip().strip("*").strip()
        if PATTERN_ID_RE.fullmatch(pattern_id):
            # Global rule: exact "stub" patterns are excluded from the skill.
            if status_norm == "stub":
                continue
            ids.add(pattern_id)

    return ids


def extract_ids_from_spec_headers(spec_path: Path) -> set[str]:
    ids: set[str] = set()
    for line in iter_lines(spec_path):
        m = re.match(r"^##\s+([A-K](?:\.(?:\d+|[A-Z][A-Z0-9_]*))+)\b", line.strip())
        if m:
            ids.add(m.group(1))
    return ids


def extract_ids_from_decomposed_patterns(patterns_root: Path) -> set[str]:
    ids: set[str] = set()

    for p in patterns_root.rglob("*.md"):
        # skip indexes / non-pattern files
        if p.name.lower() == "index.md":
            continue

        stem = p.stem  # filename without .md
        # expected: "<ID>_<title...>"
        head = stem.split("_", 1)[0].strip()

        if head and PATTERN_ID_RE.fullmatch(head):
            ids.add(head)

    return ids


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", type=Path, default=Path("FPF-Spec.md"))
    ap.add_argument(
        "--patterns-dir",
        type=Path,
        default=Path("skills/fpf/references/fpf-patterns"),
        help="Root dir that contains decomposed pattern markdown files.",
    )
    ap.add_argument(
        "--source",
        choices=["toc", "headers", "both"],
        default="toc",
        help="Where to extract expected IDs from within the spec.",
    )
    ap.add_argument(
        "--print-ids",
        action="store_true",
        help="Print extracted expected IDs (sorted).",
    )
    args = ap.parse_args()

    spec_path: Path = args.spec
    patterns_dir: Path = args.patterns_dir

    if not spec_path.exists():
        raise SystemExit(f"Spec not found: {spec_path}")

    if not patterns_dir.exists():
        raise SystemExit(f"Patterns dir not found: {patterns_dir}")

    expected: set[str] = set()
    if args.source in ("toc", "both"):
        expected |= extract_ids_from_spec_toc(spec_path)
    if args.source in ("headers", "both"):
        expected |= extract_ids_from_spec_headers(spec_path)

    present = extract_ids_from_decomposed_patterns(patterns_dir)

    missing = sorted(expected - present)
    extra = sorted(present - expected)

    print(f"Spec expected IDs ({args.source}, A-K, excluding Stub): {len(expected)}")
    print(f"Decomposed present IDs: {len(present)}")
    print(f"Missing after decomposition: {len(missing)}")
    print(f"Extra (present but not expected): {len(extra)}")

    if args.print_ids:
        print("\n=== EXPECTED IDs (sorted) ===")
        for x in sorted(expected):
            print(x)

    if missing:
        print("\n=== MISSING IDs ===")
        for x in missing:
            print(x)

    if extra:
        print("\n=== EXTRA IDs ===")
        for x in extra:
            print(x)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

