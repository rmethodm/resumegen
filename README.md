# Resumegen

Resumegen is a Laravel/Inertia resume-building app for job seekers. It helps users create resumes, cover letters, public portfolio pages, and shareable resume links. The app also includes analytics and a small Sanctum API used by the browser extension.

## Current Status

- Laravel 13 app with React 18, Inertia 2, Tailwind CSS, Sanctum, DOMPDF, and PHPWord.
- Mobile app work is paused. The previous Expo/mobile-only API surface was removed on 2026-07-08.
- **The app is free and unlimited.** There is no billing, no plan tier, and nothing is metered.
- **There is no AI.** All AI features, the pricing instrumentation, and the Job Search feature were removed on 2026-07-21. Every remaining feature is deterministic server-side code.
- **There is no admin panel.** The Filament admin surface, impersonation, the audit log, system-event logging, and the Career Hub were removed on 2026-07-21. The job-role/title/skill taxonomy is now seeder-managed with no UI.
- Deployment notes live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Main Product Areas

- Resume builder with templates, custom sections, skill groups, project sections, photos, tags, duplication, variants, PDF export, DOCX export, HTML/PDF preview, and thumbnails.
- Public resume sharing through `/r/{token}` with PDF/DOCX downloads, Open Graph images, section tracking, and visitor message threads.
- Portfolio pages through `/p/{slug}` with contact messages.
- Cover letter and resignation letter builders.
- Proofreading request flow with a paid service path.
- Dashboard analytics, view tracking, heatmaps, strength scoring, salary hints, job-role/title/skill autocomplete, and user activity tracking.
- **Resumegen Apply** (in progress): Sanctum token API for a browser extension that fills job forms from your resume (`/api/extension/*`; tokens managed on Profile).

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
- `extension/` - Chrome/Edge MV3 package (being rewritten for Apply)
- `app/Http/Controllers` - app controllers
- `app/Models` - domain models
- `app/Services` - scoring, exports, thumbnails, and the template allowlist
- `resources/js/Pages` - Inertia React pages
- `database/migrations` - schema history
- `tests` - PHPUnit feature and unit tests

## Documentation

- [CONTEXT.md](CONTEXT.md) - current project context
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - server deployment guide
- [AGENTS.md](AGENTS.md) - pointer to CLAUDE.md, which is authoritative for AI agents
- [CODEX.md](CODEX.md) - Codex-specific context policy

## Verification From Latest Scan

Last scanned: 2026-07-13.

- `php artisan route:list --except-vendor` succeeded and reported 141 routes.
- No application code was changed during this scan.
