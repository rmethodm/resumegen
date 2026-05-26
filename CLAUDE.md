# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend:** Laravel 13, PHP 8.3, SQLite (default), Inertia.js v2
- **Frontend:** React 18, TypeScript, Tailwind CSS v3, Vite 8
- **Auth:** Laravel Breeze (session-based)
- **PDF:** `barryvdh/laravel-dompdf` — route `GET /builder/{resume}/pdf` triggers server-side generation via `resources/views/resume-pdf.blade.php`
- **Media:** `spatie/laravel-medialibrary` (installed, migration exists, not yet used)
- **Routing on the frontend:** Ziggy (`route()` helper available globally in React via `resources/js/types/global.d.ts`)

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
All resume content is stored as JSON columns on a single `resumes` table (no separate section tables). The `Resume` model casts `contact`, `experience`, `education`, `skills`, and `certifications` to arrays automatically. The frontend owns the shape of these JSON blobs; the backend validates them as `nullable array`.

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
`ResumeShareLink` stores a 48-char random token (auto-generated in `booted()`). The public route `/r/{token}` is unauthenticated and renders `ResumeBuilder/PublicView.tsx` via `PublicLayout`. Questions submitted via the public view are stored in `resume_questions` and shown in the collapsible "Questions" panel on the Edit page.

### Beacon save endpoint
`POST /builder/{resume}/beacon` accepts a raw JSON body from the `beforeunload` `navigator.sendBeacon` call in `Edit.tsx`. The `_token` field in the JSON body satisfies CSRF verification (Laravel reads it from the request body regardless of content-type). The `app.blade.php` root template includes `<meta name="csrf-token">` for this purpose.

### Templates
Three templates (`classic`, `modern`, `minimal`) are stored as a string column on `resumes`. The live preview panel in `Edit.tsx` conditionally applies Tailwind classes based on the selected template. The PDF Blade view (`resources/views/resume-pdf.blade.php`) uses a single style for all templates.
