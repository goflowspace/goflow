# FPF Guides (Agent Navigation & Mandatory Runbook)

This folder contains **guides / runbooks** for FPF usage. These are not “prompt templates” in the narrow sense, but **agent-facing operating procedures** and navigation aids.

Back to the references hub: **[../index.md](../index.md)**.

## Mandatory (MUST follow)

- **[workflow.md](workflow.md)** — FPF Mandatory Workflow (execute for EVERY request).
- **[initial-plan.md](initial-plan.md)** — Standard task execution plan template (load at task start; evolve during execution).

## Navigation aids (SHOULD use)

- **[keywords.md](keywords.md)** — How to navigate FPF domains (domain-first + keyword fallback).
- **[principles.md](principles.md)** — Quick reference for core patterns (A.7, A.10, B.3, B.5).

## Prompt templates (copy/paste templates)

Ready-to-use **prompt templates** live in `references/prompts/`:

- Go to **[../prompts/index.md](../prompts/index.md)**.

## Recommended agent entry path

1. Read `skills/fpf/SKILL.md`
2. Open **[workflow.md](workflow.md)** and follow it
3. Use **[initial-plan.md](initial-plan.md)** to structure the session
4. Pick a concrete prompt template from **[../prompts/index.md](../prompts/index.md)** if applicable
