# Resumegen Context

## Current Task
Rebuilt the deploy mechanism (3 commits, not pushed). Filament admin migration still blocked on production deployment. Background-check vendor shortlist narrowed, user reading vendor docs on own time.

## Key Decisions
- Filament panel complete on main: gated by `is_master_admin`, domain `admin.resumegen.app`.
- Apache vhost (`admin-resumegenapp.conf`) and SSL cert already configured on server.
- Confirmed use case: self-check only (job seeker checks own record) — FCRA permissible-purpose/adverse-action rules don't apply since subject requests own report.
- Vendor shortlist narrowed: BackgroundChecks.com (consumer affiliate program) + CRS Credit API (API-first, built-in compliance) fit self-check. Dropped Checkr/ScoutLogic/GBS — B2B employer-screening platforms, no consumer self-check path. Equifax Consumer Engagement Suite is a fit but requires direct bureau business agreement, heavier than an affiliate signup. Avoided BeenVerified/TruthFinder/Instant Checkmate — FTC sued them in 2023 for FCRA violations.
- Deploy mechanism rebuilt across 3 local commits (not pushed): `b372652` fail-safe maintenance mode on failure, `b750ba3` manual-approval CI/CD deploy job, `42025c4` switched from git-pull-on-server to build-once-in-CI + rsync (excludes `.env`, `storage/app/`, logs, framework caches).

## Next Steps
1. **Push the 3 deploy-mechanism commits and do the first real deploy** — this both ships the new deploy pipeline and finally gets the Filament codebase onto the server (currently still pre-Filament).
2. **GitHub setup required first** — create `production` environment with a required reviewer; add `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` repo secrets.
3. **Verify `storage/app/` is actually where Media Library writes on the server** (check `config/filesystems.php` disk config) before the first rsync — an incorrect exclude path could risk user-uploaded resume files on `--delete`.
4. **Stripe webhook** — create endpoint at `https://resumegen.app/stripe/webhook`, paste `whsec_...` into `.env`.
5. **Vendor pick** — user is reading BackgroundChecks.com and CRS Credit API docs directly to choose between them.
