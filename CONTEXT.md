# Resumegen Context

## Current Task
Completed the full super-admin initiative: 8 sub-projects shipped to main (audit log, content mgmt, revenue, ops, delivery log, MRR snapshots, growth analytics, retention cohorts). 637 tests green.

## Key Decisions
- Each sub-project ran spec → plan → TDD → `--no-ff` merge on its own branch; specs/plans in docs/superpowers/. New admin nav: Revenue · Growth · Content · Audit Log · Ops.
- Retention needs per-period activity, not just last_active_at → built `user_activity_days` table + `TrackActivity` middleware (session-gated, web group).
- Two new crons: `revenue:snapshot` (daily 23:55, MRR history) + `system-events:prune` (daily, 30d). Need scheduler running in prod.

## Next Steps
- Optional: add OPENAI_ADMIN_KEY (OpenAI cost reconcile) — degrades gracefully without it.
- No remaining flagged items; all spec "out of scope" notes are intentional deferrals.
