# Resumegen Context

## Current Task
Resumegen Apply browser extension: form-fill MVP + ATS heuristics shipped; user validating load-unpacked.

## Key Decisions
- Apply = Chrome/Edge MV3 side panel + Sanctum `/api/extension/*` (not iframes).
- Empty-only bulk fill; insert chips need focus; never auto-submit.
- Field matching is scored heuristics (`fill-heuristics.js`), not full AI.

## Next Steps
- Optional: one-click connect (vs paste token); multi-step Workday QA.
- Optional later: job-radar (scroll-detect listings, match to resume) — product decision, not started.
- Push local commits when ready (`main` ahead of origin).
