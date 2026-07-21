# Resumegen Context

## Current Task
AI, the prepaid billing instrumentation, and Job Search were all removed on branch
`remove-ai-billing-jobsearch` (2026-07-21). Resumegen is now a plain, free resume builder:
no LLM anywhere, nothing metered, no pricing work in flight. Docs swept to match.

## Key Decisions
- **All three removals are outright deletions**, not feature flags — code, routes, models,
  migrations, config and tests. Do not reintroduce any of them without asking.
- **The pricing investigation is abandoned**, not parked. Both pricing docs, the growth model
  and every `pricing:*` command are gone; there is no live pricing document.
- **`/jobs/salary`, the job-role/title/skill taxonomy, `job_applications` and `StrengthScorePanel`
  survived** — they predate or are independent of Job Search and AI.

## Next Steps
- Verify the suite and the frontend build on this branch after the removals.
- Decide how this branch reaches `main` (it is large; see `WORKLOG.md`).
