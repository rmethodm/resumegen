# Resumegen

Resumegen is a Laravel/Inertia resume-building app for job seekers. It helps users create and share resumes. The app also includes a Sanctum API used by the browser extension and the iPhone/iPad apps, and a support admin panel.

## Current Status

- Laravel 13 app with React 19, Inertia v3, Tailwind CSS, Sanctum, DOMPDF, and PHPWord.
- Mobile is active again (native iPhone/iPad apps in development, 2026-08). The server ships a mobile API: password login (`POST /api/auth/token`, Sanctum token with `mobile` ability), full resume CRUD with offline sync (`client_uuid` idempotent creates, `?since=` incremental pulls with a `resume_deletions` log, 409 conflict responses), PDF streaming, and share-link management. The 2026-07-08 removal covered the earlier Expo-era surface only.
- **The app is free and unlimited.** There is no billing, no plan tier, and nothing is metered.
- **AI is narrow and disabled by default.** A Tier-1 slice (bullet rewrite, summary generation, job match) shipped 2026-08-04 via `App\Services\OpenAiResumeAssistant` (`ResumeAiController`), gated by `AI_ENABLED`/`OPENAI_API_KEY` in `config/ai.php` (both unset by default). A legacy `AiService`/`AiPrompts` stack (builder bullet rewrite/critique, ATS keywords, interview coach, PDF import extract, job ranking/URL import) still exists behind the `ai_enabled` middleware, which 404s all of it while `AI_ENABLED` is false. See `CLAUDE.md`'s AI section.
- **There is a support admin panel**, domain-scoped to `APP_ADMIN_DOMAIN` (`admin.resumegen.test` locally): user search/verify/disable/revoke-tokens, a visitor log of every main-site request (added 2026-08-13), Postgres backups (create/download/delete/restore), and a Postgres admin panel (table browse/edit/schema, raw SQL runner, roles/grants — added 2026-08-13). No resume edit, no impersonation, no billing. The old Filament admin, impersonation, the audit log, system-event logging, and the Career Hub remain removed (2026-07-21).
- Deployment notes live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Main Product Areas

- Resume Workstation (`/resumes/{id}/workstation`, the only editing surface) with templates, section reordering, autosave, live client-side preview, snapshots, notes, version groups with compare, duplication, and PDF/DOCX export.
- Public resume sharing through `/r/{token}` with PDF/DOCX downloads and an optional email/password gate.
- Dashboard analytics, strength scoring, and job-role/title/skill autocomplete.
- **Resumegen Apply** (Chrome/Edge MV3): side panel fills job forms from your resume via Sanctum (`/api/extension/*`; tokens on Profile). See `extension/README.md`.
- **Job Imports** (`/jobs-imports`): live Adzuna/USAJOBS search, saved per user to `imported_jobs`; AI resume match/tailoring is real (`ResumeAiController::matchJob`, gated by `AI_ENABLED`). Gap analysis and cover letters are still frontend stubs, not implemented.
- **Job Search** (`/jobs`): saved searches with daily email alerts (`jobs:run-alerts`), plus a Kanban application tracker at `/job-applications`.

Cover letters, resignation letters, proofreading, portfolio pages, A/B resume variants, and salary hints have all been removed — see `CLAUDE.md`'s "Removed Features" section for dates and detail.

## Local Development

This app is intended to run under Laravel Herd.

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate
npm run build
```

For active frontend work:

```bash
npm run dev
```

Useful checks:

```bash
php artisan route:list --except-vendor
php artisan test --compact
npm run build
```

## Important Paths

- `routes/web.php` - main web routes
- `routes/api.php` - Sanctum API: Resumegen Apply (`/api/extension/*`) and the mobile apps (`/api/auth/token`, `/api/resumes*`, share links)
- `app/Support/ResumeFillProfile.php` - extension fill/insert payload
- `extension/` - Resumegen Apply (side panel + ATS fill heuristics)
- `app/Http/Controllers` - app controllers
- `app/Models` - domain models
- `app/Services` - AI, job search/import, scoring, backups, and the template allowlist (`UserLimits`)
- `resources/js/Pages` - Inertia React pages
- `database/migrations` - schema history
- `tests` - PHPUnit feature and unit tests

## Documentation

- [CONTEXT.md](CONTEXT.md) - current project context
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - server deployment guide
- [AGENTS.md](AGENTS.md) - generic agent working protocol (PLAN.md/NOTES.md/JOURNAL.md workflow); CLAUDE.md remains the authoritative source for this repo's stack, architecture, and hard rules
- [CODEX.md](CODEX.md) - Codex-specific context policy

## Verification From Latest Scan

Last scanned: 2026-08-18.

- `php artisan route:list --except-vendor` succeeded and reported 146 routes.
- No application code was changed during this scan.
