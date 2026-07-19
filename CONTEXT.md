# Resumegen Context

## Current Task
Consolidated sharing onto `/shares` (2026-07-19). Deleted `SharePopover` from the builder; its Share tab now shows an active-link count plus a link to the shares page. Added `SampleSharesSeeder` (4 resumes, 10 links covering primary/password/expired/disabled/read/unread) wired into `DatabaseSeeder` behind a local-env guard. Also raised builder section-card contrast. All pushed to `experiment/preview-left-skills-panel`.

## Key Decisions
- Share link management lives only on `/shares` — never in the builder. Sharing doesn't interleave with editing, and tokens are stable across edits. See CLAUDE.md.
- Sample fixtures are a committed seeder, local-env only, idempotent (deletes `Sample — *` resumes before recreating) so real data is untouched.
- Migrations are forward-only; `migrate:rollback`/`reset`/`refresh` are unsupported and leave the DB wrecked. Rebuild with `migrate:fresh --seed`. See CLAUDE.md.

## Next Steps
1. **Production .env** needs `AI_ENABLED=true` + `AI_CAREER_COACH_ENABLED=false` — until then prod AI stays dark.
2. Decide whether `experiment/preview-left-skills-panel` merges to main or stays an experiment.
3. Wire cover letters to the existing `AiPrompts::coverLetter()` (no route yet); add deploy secrets `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`.
