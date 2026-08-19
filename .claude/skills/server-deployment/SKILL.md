---
name: server-deployment
description: >
  Use when discussing production server setup, deployment, server management, systemd
  services, the queue worker, the scheduler, Apache config, or the GitHub Actions deploy
  job for Resumegen. Also use when local behavior seems to differ from production
  (tests run on SQLite while local dev and production both run PostgreSQL).
compatibility: Resumegen-specific — Ubuntu/Apache/PostgreSQL production server, deployed via GitHub Actions self-hosted runner.
---

## Source of truth

Do not re-derive deployment steps from memory — read these files, they are authoritative:
- `docs/DEPLOYMENT.md` — full server setup + deploy flow, in prose.
- `.github/workflows/ci.yml` — the `deploy` job (self-hosted runner on the prod box).
- `deploy.sh` — runs on the server as root: maintenance mode, git pull, composer/npm install + build, migrate, cache, restart queue worker.

## Key facts a fresh session won't know

- **DB engines**: production *and* local dev are PostgreSQL (`DB_CONNECTION=pgsql`); only the test suite runs in-memory SQLite. Don't assume SQLite behavior (JSON columns, `EXPLAIN`, locking) matches either real environment.
- **Deploy only fires manually** — `workflow_dispatch` on `main`, never on a bare push (free-plan substitute for required-reviewer environment protection — see comment in `ci.yml`).
- **There is no rsync/SSH deploy.** GitHub-hosted runners can't reach the server (Hostinger firewall drops their SSH). The deploy job runs on a **self-hosted runner on the production box itself** (label `resumegen-prod`, user `github-runner`) whose single sudo rule (`/etc/sudoers.d/github-runner`) permits exactly one command: `sudo /var/www/resumegen.app/deploy.sh`.
- **Build happens on the server, not in CI** — `deploy.sh` pulls main and runs `composer install --no-dev`, `npm ci --legacy-peer-deps`, and `npm run build` itself, all as `www-data` with an isolated HOME at `/var/lib/resumegen-deploy`. Root only orchestrates and restarts the systemd service. No `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY` secrets exist; the only GitHub-side requirement is the `production` environment.
- **There IS an admin panel** — hand-rolled Inertia (not Filament, which was deleted 2026-07-21), domain-scoped to `APP_ADMIN_DOMAIN` (`routes/admin.php`). Production needs DNS + a vhost for that subdomain or the admin panel is unreachable.
- **Scheduled jobs are `ai:cost-alert` (08:00), `jobs:run-alerts` (07:00), and the `prune-resume-deletions` closure (06:00, drops sync-log rows older than 90 days)** — nothing else. Read `routes/console.php` before claiming anything else runs on cron. Production needs the `schedule:run` cron AND a queue worker (`resumegen-queue` systemd service) — the job-alert digest mailable is `ShouldQueue`.
- **Failure behavior**: `deploy.sh` leaves the site in maintenance mode on failure rather than serving a half-migrated app; there's no automatic rollback, fix forward and re-run the deploy job.

## Rules

- Never propose editing the deploy pipeline (`ci.yml`, `deploy.sh`) without reading the current version first — it already handles maintenance mode, privilege separation, and failure behavior deliberately.
- Any change to server config/deploy steps should be reflected back into `docs/DEPLOYMENT.md` — it's the doc a human follows for manual/first-time setup, not just CI's internal steps.
- SSH keys and server credentials never belong in the repo or in chat.
