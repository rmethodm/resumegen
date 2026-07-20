# Resumegen

Resumegen is a Laravel/Inertia resume-building app for job seekers. It helps users create resumes, cover letters, resignation letters, public portfolio pages, and shareable resume links. The app also includes billing, admin operations, analytics, webhooks, and a small Sanctum API used by the browser extension.

## Current Status

- Laravel 13 app with React 18, Inertia 2, Tailwind CSS, Filament 3, Sanctum, Cashier, DOMPDF, PHPWord, Spatie Media Library, and OpenAI integration.
- Mobile app work is paused. The previous Expo/mobile-only API surface was removed on 2026-07-08.
- AI code still exists, but production AI behavior is controlled by `AI_ENABLED`. See [AI_STRATEGY.md](AI_STRATEGY.md) before re-enabling or changing AI features.
- Deployment notes live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Main Product Areas

- Resume builder with templates, custom sections, skill groups, project sections, photos, tags, duplication, variants, PDF export, DOCX export, HTML/PDF preview, and thumbnails.
- Public resume sharing through `/r/{token}` with PDF/DOCX downloads, Open Graph images, section tracking, and visitor message threads.
- Portfolio pages through `/p/{slug}` with contact messages.
- Cover letter and resignation letter builders.
- Proofreading request flow with a paid service path.
- Dashboard analytics, view tracking, heatmaps, strength scoring, salary hints, job-role/title/skill autocomplete, and user activity tracking.
- Billing through Laravel Cashier and Stripe.
- Webhook endpoints for user-owned integrations.
- Browser extension support through Sanctum personal tokens and API routes.
- Filament admin panel for users, content, operations, revenue, growth, AI oversight, audit logs, messages, proofreading requests, job data, and admin impersonation.

## AI Surface

AI-gated routes currently include:

- Resume bullet rewrite
- Summary generation
- ATS keywords
- Career map
- Resume translation
- Interview coach
- Career coach chat
- Resignation letter generation

Deterministic features such as strength score, salary hint, autocomplete, heatmap, and proofreading are not AI features.

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
- `routes/api.php` - Sanctum API used by the browser extension
- `app/Http/Controllers` - app controllers
- `app/Models` - domain models
- `app/Services` - AI, scoring, exports, revenue, growth, thumbnails, webhooks, and user limits
- `app/Filament` - admin panel pages, resources, and widgets
- `resources/js/Pages` - Inertia React pages
- `database/migrations` - schema history
- `tests` - PHPUnit feature and unit tests

## Documentation

- [CONTEXT.md](CONTEXT.md) - current project context and paused mobile decision
- [AI_STRATEGY.md](AI_STRATEGY.md) - current AI decision record
- [docs/prepaid-pricing-model.md](docs/prepaid-pricing-model.md) - the pricing proposal (nothing is billed; prices are 0)
- [docs/growth-model-sample-run.md](docs/growth-model-sample-run.md) - fabricated scenario sweep behind it
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) - server deployment guide
- [AGENTS.md](AGENTS.md) - local development rules for AI agents
- [CODEX.md](CODEX.md) - Codex-specific context policy

## Verification From Latest Scan

Last scanned: 2026-07-13.

- `php artisan route:list --except-vendor` succeeded and reported 141 routes.
- No application code was changed during this scan.
