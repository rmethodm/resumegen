# Resumegen Context

## Current Task
Robustness brainstorm A/B/C complete (2026-08-04).

## Key Decisions
- Live score is client-side ResumeAnalysis (parity with PHP).
- JD match is deterministic token overlap, separate from strength score.
- Export is gated by a soft checklist modal (blockers require name+email).
- Snapshots are manual checkpoints; restore rewrites via ResumeDocument.
- Autosave sends base_updated_at for multi-tab conflict detection.

## Next Steps
- Hard-refresh workstation; smoke A1–A4 / B8 / C9–C12 in UI.
- Optional polish: role-family expand, denser rail, canvas drag for notes.
