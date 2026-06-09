# Resumegen Context

## Current Task
Public Portfolio Page feature complete — 597/597 tests passing. CLAUDE.md updated.

## Key Decisions
- Portfolio slugs: `^[a-z0-9][a-z0-9-]*[a-z0-9]$` (no leading/trailing hyphens); 19 reserved slugs blocked server-side
- `session()->pull('contactSent')` (not `session()`) to prevent re-showing on refresh
- `Mail::to()->queue()` for portfolio contact notifications (non-blocking)

## Next Steps
- 5 deferred audit fixes still pending (see project-audit-remaining-fixes.md)
- Agency Stripe pricing wired — config keys + checkout validation + subscription observer done
- Feature backlog candidates: real-time live score, kanban job tracker, AI cover letter tailoring
