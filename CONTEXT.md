# Resumegen Context

## Current Task
Cleared orphaned references to deleted models that broke `migrate` and `migrate:fresh --seed` (2026-07-18): `JobApplication` in a migration `down()` + two factories, `AiModelRate` in a seeder. Local DB rebuilt from scratch. Suite green (436 passed) — the drop from the previously-noted 532 is the 2026-07-14 billing/feature removals taking their tests, not lost coverage.

## Key Decisions
- `job_applications` table stays despite the tracker being removed — `AnalyticsController` still queries it via `DB::table()` for the dashboard count.
- Migrations reference column names, not model classes (`dropConstrainedForeignId`, not `dropForeignIdFor`), so deleting a model can't break them.
- In-flight on `experiment/preview-left-skills-panel`: /shares page + builder preview-left experiment, both uncommitted.

## Next Steps
1. **Production .env** needs `AI_ENABLED=true` + `AI_CAREER_COACH_ENABLED=false` — until then prod AI stays dark.
2. Finish or shelve the uncommitted /shares + builder-experiment work before branching again.
3. Wire cover letters to the existing `AiPrompts::coverLetter()` (no route yet); add deploy secrets `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`.
