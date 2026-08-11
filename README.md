# Resumegen

Resumegen is a Laravel/Inertia resume-building app for job seekers. It helps users create and share resumes. The app also includes a small Sanctum API used by the browser extension and a thin support admin panel.

## Current Status

- Laravel 13 app with React 19, Inertia v3, Tailwind CSS, Sanctum, DOMPDF, and PHPWord.
- Mobile app work is paused. The previous Expo/mobile-only API surface was removed on 2026-07-08.
- **The app is free and unlimited.** There is no billing, no plan tier, and nothing is metered.
- **AI is narrow and disabled by default.** A Tier-1 slice (bullet rewrite and summary generation on the Optimize tab) shipped 2026-08-04 via `App\Services\OpenAiResumeAssistant`, gated by `AI_ENABLED`/`OPENAI_API_KEY` in `config/ai.php` (both unset by default). Everything else — bullet coach, ATS keywords, interview coach, resume import — stays removed.
- **There is a thin support admin panel**, domain-scoped to `APP_ADMIN_DOMAIN` (`admin.resumegen.test` locally). It's search/verify/disable/revoke-tokens only — no taxonomy CMS, no resume edit, no impersonation, no billing. The old Filament admin, impersonation, the audit log, system-event logging, and the Career Hub remain removed (2026-07-21).
- Deployment notes live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Main Product Areas

- Resume builder with templates, custom sections, skill groups, project sections, tags, duplication, PDF export, DOCX export, HTML/PDF preview, and thumbnails.
- Public resume sharing through `/r/{token}` with PDF/DOCX downloads and an optional email/password gate.
- Dashboard analytics, strength scoring, and job-role/title/skill autocomplete.
- **Resumegen Apply** (Chrome/Edge MV3): side panel fills job forms from your resume via Sanctum (`/api/extension/*`; tokens on Profile). See `extension/README.md`.
- **Job Imports** (`/jobs-imports`): live Adzuna/USAJOBS search, saved per user to `imported_jobs`; AI resume match/tailoring is real (`ResumeAiController::matchJob`, gated by `AI_ENABLED`). Gap analysis and cover letters are still frontend stubs, not implemented.

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
- `routes/api.php` - Sanctum API for Resumegen Apply (`/api/extension/*`)
- `app/Support/ResumeFillProfile.php` - extension fill/insert payload
- `extension/` - Resumegen Apply (side panel + ATS fill heuristics)
- `app/Http/Controllers` - app controllers
- `app/Models` - domain models
- `app/Services` - scoring, exports, thumbnails, and the template allowlist
- `resources/js/Pages` - Inertia React pages
- `database/migrations` - schema history
- `tests` - PHPUnit feature and unit tests

## Documentation

- [CONTEXT.md](CONTEXT.md) - current project context
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - server deployment guide
- [AGENTS.md](AGENTS.md) - generic agent working protocol (PLAN.md/NOTES.md/JOURNAL.md workflow); CLAUDE.md remains the authoritative source for this repo's stack, architecture, and hard rules
- [CODEX.md](CODEX.md) - Codex-specific context policy

## Verification From Latest Scan

Last scanned: 2026-08-06.

- `php artisan route:list --except-vendor` succeeded and reported 77 routes.
- No application code was changed during this scan.
