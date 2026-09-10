# Resumegen

Resumegen is a Laravel/Inertia resume-building app for job seekers. It helps users create and share resumes. The app also includes a Sanctum API used by the browser extension and the iPhone/iPad apps.

## Current Status

- Laravel 13 app with React 19, Inertia v3, Tailwind CSS, Sanctum, DOMPDF, and PHPWord.
- Mobile is active again (native iPhone/iPad apps in development, 2026-08). The server ships a mobile API: password login (`POST /api/auth/token`, Sanctum token with `mobile` ability), full resume CRUD with offline sync (`client_uuid` idempotent creates, `?since=` incremental pulls with a `resume_deletions` log, 409 conflict responses), PDF streaming, and share-link management. The 2026-07-08 removal covered the earlier Expo-era surface only.
- **Billing is $9.95/mo + AI credits.** Cashier subscription (`/billing/checkout`, `/billing/portal`) is required to hold/buy/spend AI credits; non-AI features are not tier-gated. `/billing/credits` stubs to a “coming soon” flash until `STRIPE_CREDITS_PRICE_ID` is set. See `CLAUDE.md`'s Billing section.
- **Generative AI is credit-gated.** Workstation rewrite (bullet/summary) and Optimize generate-for-gap spend ledger credits after success (402 if unsubscribed/insufficient, 429 if `ai_blocked`); Optimize diagnose stays free. Coach/chat/translation stay removed. See `CLAUDE.md`'s AI section.
- **There is no admin panel.** The hand-rolled Inertia admin was removed 2026-09-02 (see `CLAUDE.md`'s "Admin Panel — removed"). App backups are CLI/schedule only via `spatie/laravel-backup`.
- Login supports email/password (Fortify, opt-in 2FA) plus "continue with Google/GitHub/Microsoft" (Socialite) — auto-links to an existing account only when the provider confirms the email is verified.
- Deployment notes live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Main Product Areas

- Resume Workstation (`/resumes/{id}/workstation`, the only editing surface) with templates, section reordering, autosave, inline-markdown bullets, live client-side preview plus an in-editor DomPDF preview frame, snapshots, notes, version groups with compare, duplication, and PDF/DOCX export.
- Public resume sharing through `/r/{token}` with PDF/DOCX downloads and an optional email/password gate.
- Dashboard analytics, strength scoring, and job-role/title/skill autocomplete.
- **Resumegen Apply** (Chrome/Edge MV3): side panel fills job forms from your resume via Sanctum (`/api/extension/*`; tokens on Profile). See `extension/README.md`.
- **Job application tracker**: a manual Kanban at `/job-applications`.

Job search (`/jobs`), job imports (`/jobs-imports`), cover letters, resignation letters, proofreading, portfolio pages, A/B resume variants, and salary hints have all been removed — see `CLAUDE.md`'s "Removed Features" section for dates and detail.

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
- `app/Services` - completion scoring, growth report, SSRF-safe URL probe, and the template allowlist (`UserLimits`)
- `resources/js/Pages` - Inertia React pages
- `database/migrations` - schema history
- `tests` - PHPUnit feature and unit tests

## Documentation

- [CONTEXT.md](CONTEXT.md) - current project context
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - server deployment guide
- [AGENTS.md](AGENTS.md) - generic agent working protocol (PLAN.md/NOTES.md/JOURNAL.md workflow); CLAUDE.md remains the authoritative source for this repo's stack, architecture, and hard rules
- [CODEX.md](CODEX.md) - Codex-specific context policy

## Verification From Latest Scan

Last scanned: 2026-09-01.

- `php artisan route:list --except-vendor` succeeded and reported 122 routes.
- No application code was changed during this scan.
