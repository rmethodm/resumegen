---
name: ui-audit-concrete-findings
description: Enforces concrete, evidence-cited findings and the prescribed rubric/output format during any UI audit. Use when performing a heuristic audit, forensic UI audit, design-debt or consistency review, or when a skill/prompt supplies an audit rubric or scoring format.
---

# UI audit findings: concrete, rubric-faithful

The user rejects vague audit output. Every audit run must satisfy these rules before findings are presented.

## Use the prescribed rubric and format — never your own

- If the invoked skill or prompt supplies a rubric (e.g. the heuristic skill's `references/heuristics.md` with scoring definitions and required output format), read it in full and follow it exactly.
- Do NOT invent a new format or a new scale. Do not rename sections, change score ranges, or restructure the output "for clarity".
- When the prompt fixes an output shape (e.g. consistency score, critical inconsistencies, system gaps), produce exactly those sections.

## Every finding must be concrete

For every heuristic or audit dimension, write a finding that cites evidence from the actual UI:

- **Quote text** — the exact label, error message, or copy at issue.
- **Count elements** — "3 different button radii (4px, 6px, 8px)", not "inconsistent buttons".
- **Name the broken flow** — the specific screen, component, or user path (file or route when known).

Vague findings ("spacing could be improved", "consider better hierarchy") are rejected. If a finding cannot cite a quote, a count, or a named flow, gather that evidence first or drop the finding.

## Tone

Act as a design systems engineer doing a forensic audit: detect inconsistencies, fragmentation, and hidden design debt. Be specific; avoid generic feedback.
