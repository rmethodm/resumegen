# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend:** Laravel 13, PHP 8.3, SQLite (default), Inertia.js v2
- **Frontend:** React 18, TypeScript, Tailwind CSS v3, Vite 8
- **Auth:** Laravel Breeze (session-based)
- **PDF:** `barryvdh/laravel-dompdf` — route `GET /builder/{resume}/pdf` triggers server-side generation via `resources/views/resume-pdf.blade.php`
- **Media:** `spatie/laravel-medialibrary` (installed, migration exists, not yet used)
- **Routing on the frontend:** Ziggy (`route()` helper available globally in React via `resources/js/types/global.d.ts`)
- **AI suggestions:** `openai-php/client` for OpenAI; raw `Http::post` for Anthropic Claude — keys in `config/services.php` (`services.anthropic.key`, `services.openai.key`). Never call `env()` directly in app code; always use `config()`.

## Commands

```bash
# First-time setup
composer run setup

# Full dev server (Laravel + queue + Pail log viewer + Vite HMR, all in one)
composer run dev

# Build frontend for production (runs tsc then vite build)
npm run build

# Production build script (composer update + view cache + npm build)
./build.sh

# Run all tests
composer run test

# Run a single test file
php artisan test tests/Feature/Auth/AuthenticationTest.php

# Run a single test method
php artisan test --filter=test_users_can_authenticate_using_the_login_screen

# Laravel Pint (PHP code style fixer)
./vendor/bin/pint

# Migrations
php artisan migrate
php artisan migrate:fresh --seed
```

## Architecture

### Data flow (request lifecycle)
All routes return Inertia responses — there are no Blade views beyond the single `resources/views/app.blade.php` root template. Laravel serialises props as JSON, Inertia hydrates the matching React page component.

### Resume data model
All resume content is stored as JSON columns on a single `resumes` table (no separate section tables). The `Resume` model casts `contact`, `experience`, `education`, `skills`, `certifications`, and `font_sizes` to arrays automatically. The frontend owns the shape of these JSON blobs; the backend validates them as `nullable array`.

### Authorization
`ResumePolicy` gates all resume mutations on `$user->id === $resume->user_id`. The base `Controller` uses the `AuthorizesRequests` trait so `$this->authorize()` is available everywhere.

### Frontend page structure
Pages live in `resources/js/Pages/`. The core feature is `ResumeBuilder/Edit.tsx`, which is a self-contained split-panel editor + live preview. It uses `onBlur` on every field to trigger a `router.put` save (no debounce timer). State for all resume sections is managed with `useState`; refs mirror current state so the `save` callback never captures stale closures.

### Shared Inertia props
`HandleInertiaRequests::share()` passes `auth.user` to every page. Access it in React via `usePage().props.auth.user`.

### Frontend routing
Use Ziggy's `route('named.route', params)` helper — it's globally typed in `resources/js/types/global.d.ts`. Never hardcode URL strings.

### Asset pipeline
`npm run build` runs `tsc` (type-check) then `vite build`. Output lands in `public/build/`. Always rebuild after editing frontend files when not running `npm run dev`.

### Share links and public view
`ResumeShareLink` stores a 48-char random token (auto-generated in `booted()`). The public route `/r/{token}` is unauthenticated and renders `ResumeBuilder/PublicView.tsx` via `PublicLayout`. Questions submitted via the public view are stored in `resume_questions` and shown in the collapsible "Questions" panel on the Edit page. `sender_phone` is optional on the question form.

### Analytics
`ResumeShareEvent` is an append-only table (no `updated_at`) that logs `page_view`, `pdf_download`, and `question_submitted` events. Logging is best-effort (wrapped in try/catch) so it never crashes a public request. `AnalyticsController` aggregates per-resume stats and drives the Dashboard. Unique visitor count uses `COUNT(DISTINCT ip_hash || DATE(created_at))`.

### Beacon save endpoint
`POST /builder/{resume}/beacon` accepts a raw JSON body from the `beforeunload` `navigator.sendBeacon` call in `Edit.tsx`. The `_token` field in the JSON body satisfies CSRF verification (Laravel reads it from the request body regardless of content-type). The `app.blade.php` root template includes `<meta name="csrf-token">` for this purpose.

### Templates
Eight templates (`classic`, `modern`, `minimal`, `minimal-ruled`, `sidebar`, `creative`, `executive`, `ats`) are stored as a string column on `resumes`. The live preview panel in `Edit.tsx` conditionally applies Tailwind classes based on the selected template. The PDF Blade view (`resources/views/resume-pdf.blade.php`) uses a single style for all templates.

### Font sizes
`font_sizes` is a nullable JSON column on `resumes`. The `DEFAULT_FONT_SIZES` constant is defined at module scope in `Edit.tsx` (not inside the component). Sliders in the "Font Sizes" section of the editor update the live preview but the PDF Blade view currently uses hardcoded sizes.

### AI suggestions
`AiSuggestController` handles `POST /builder/{resume}/ai-suggest` (throttled to 10 requests/minute). Supports `field` values: `summary`, `bullets`, `skills`, `title`. Provider is selected per-request (`claude` or `openai`); the active provider is persisted in `localStorage` under `resumegen_ai_provider`. Both keys are checked via `config('services.anthropic.key')` and `config('services.openai.key')` — never `env()` directly.

### Rate limiting
- AI suggest endpoint: `throttle:10,1` (10 req/min)
- Public question form (`POST /r/{token}/questions`): `throttle:5,1` (5 req/min)
