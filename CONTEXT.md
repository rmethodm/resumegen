# Resumegen Context

## Current Task
AI, the prepaid billing instrumentation, Job Search, and the entire admin surface (Filament
panel, impersonation, audit log, system events, Career Hub) were removed on branch
`remove-ai-billing-jobsearch` (2026-07-21). Resumegen is now a plain, free resume builder:
no LLM anywhere, nothing metered, no admin UI at all. Docs swept to match.

## Key Decisions
- **All three removals are outright deletions**, not feature flags — code, routes, models,
  migrations, config and tests. Do not reintroduce any of them without asking.
- **The pricing investigation is abandoned**, not parked. Both pricing docs, the growth model
  and every `pricing:*` command are gone; there is no live pricing document.
- **`/jobs/salary`, the taxonomy tables + seeders, `job_applications`, `PortfolioMessage` and
  `StrengthScorePanel` survived** — taxonomy is now seeder-managed, with no UI to edit it.

## Next Steps
- Verify the suite and the frontend build on this branch after the removals.
- Decide how this branch reaches `main` (it is large; see `WORKLOG.md`).
