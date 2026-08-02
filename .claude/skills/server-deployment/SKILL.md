---
name: server-deployment
description: >
  Use when discussing production server setup, deployment, server management, systemd
  services, the queue worker, the scheduler, Apache config, or the GitHub Actions deploy
  job for Resumegen. Also use when local behavior seems to differ from production, since
  production runs a different DB engine than local dev.
compatibility: Resumegen-specific — Ubuntu/Apache/PostgreSQL production server, deployed via GitHub Actions.
---

## Source of truth

Do not re-derive deployment steps from memory — read these files, they are authoritative:
- `docs/DEPLOYMENT.md` — full server setup + deploy flow, in prose.
- `.github/workflows/ci.yml` — the `deploy` job (rsync + SSH activation).
- `deploy.sh` — runs on the server after rsync: maintenance mode, migrate, cache, restart queue worker.

## Key facts a fresh session won't know

- **Prod DB is PostgreSQL**, not the SQLite used in local dev (`config/database.php` default). Don't assume SQLite behavior (JSON columns, `EXPLAIN` output, locking) matches production — see CLAUDE.md's Postgres conventions section for query/schema guidance.
- **Deploy only fires manually** — `workflow_dispatch` on `main`, never on a bare push (free-plan substitute for required-reviewer environment protection — see comment in `ci.yml`).
- **Build happens in CI, not on the server** — the server only receives a built `vendor/` + `public/build` via rsync and runs `deploy.sh`; it never runs Composer or npm itself.
- **Required repo secrets**: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, plus a `production` environment in GitHub repo settings.
- **There is no admin panel and no admin subdomain.** Filament (and Livewire with it) was deleted on 2026-07-21 along with `APP_ADMIN_DOMAIN` and the `filament:upgrade`/`filament:optimize` steps. One vhost on the apex domain serves the whole app.
- **Scheduled commands are just `resumes:nudge-stale` and `resumes:nudge-views`.** `system-events:prune`, `jobs:run-alerts` and `ai:cost-alert` were deleted with their features — read `routes/console.php` before claiming anything else runs on cron.
- **Failure behavior**: `deploy.sh` leaves the site in maintenance mode on failure rather than serving a half-migrated app; there's no automatic rollback, fix forward and re-run the deploy job.

## Rules

- Never propose editing the deploy pipeline (`ci.yml`, `deploy.sh`) without reading the current version first — it already handles maintenance mode, exclusions, and failure behavior deliberately.
- Any change to server config/deploy steps should be reflected back into `docs/DEPLOYMENT.md` — it's the doc a human follows for manual/first-time setup, not just CI's internal steps.
- SSH keys and server credentials never belong in the repo or in chat — confirm they're set as GitHub repo secrets, don't ask the user to paste them.
