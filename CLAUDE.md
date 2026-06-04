# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend:** Laravel 13, PHP 8.4, SQLite (default), Inertia.js v2
- **Frontend:** React 18, TypeScript, Tailwind CSS v3, Vite 8
- **Auth:** Laravel Breeze (session-based)
- **PDF:** `barryvdh/laravel-dompdf` — route `GET /builder/{resume}/pdf` triggers server-side generation via `resources/views/resume-pdf.blade.php`. `GET /builder/{resume}/preview` streams the same PDF inline (used by the live preview iframe in the editor).
- **Media:** `spatie/laravel-medialibrary` (installed, migration exists, not yet used)
- **Routing on the frontend:** Ziggy (`route()` helper available globally in React via `resources/js/types/global.d.ts`)
- **AI suggestions:** `openai-php/client` for OpenAI; raw `Http::post` for Anthropic Claude — keys in `config/services.php` (`services.anthropic.key`, `services.openai.key`). Never call `env()` directly in app code; always use `config()`.
- **Billing:** `laravel/cashier-stripe` — `User` uses `Billable` trait. Stripe price IDs in `config/services.php` (`services.stripe.monthly_price_id`, `services.stripe.yearly_price_id`). Subscription name is `'default'`.

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
All resume content is stored as JSON columns on a single `resumes` table (no separate section tables). The `Resume` model casts `contact`, `experience`, `education`, `skills`, `certifications`, and `font_sizes` to arrays automatically. The frontend owns the shape of these JSON blobs; the backend validates them as `nullable array`. `accent_color` (hex string) and `font_family` (string) are plain string columns added in migration `2026_05_28_120000`.

### Authorization
`ResumePolicy` gates all resume mutations on `$user->id === $resume->user_id`. The base `Controller` uses the `AuthorizesRequests` trait so `$this->authorize()` is available everywhere.

### Frontend page structure
Pages live in `resources/js/Pages/`. The core feature is `ResumeBuilder/Edit.tsx`, which is a resizable split-panel editor + live preview. It uses `onBlur` on every field to trigger a `router.put` save (no debounce timer). State for all resume sections is managed with `useState`; refs mirror current state so the `save` callback never captures stale closures. The panel divider is draggable (`leftWidth` state, `handleDividerMouseDown`); widths are tracked as percentages.

### Shared Inertia props
`HandleInertiaRequests::share()` passes `auth.user` to every page. Access it in React via `usePage().props.auth.user`.

### Frontend routing
Use Ziggy's `route('named.route', params)` helper — it's globally typed in `resources/js/types/global.d.ts`. Never hardcode URL strings.

### Asset pipeline
`npm run build` runs `tsc` (type-check) then `vite build`. Output lands in `public/build/`. Always rebuild after editing frontend files when not running `npm run dev`.

### Share links and public view
`ResumeShareLink` stores a 48-char random token (auto-generated in `booted()`). The public route `/r/{token}` is unauthenticated and renders `ResumeBuilder/PublicView.tsx` via `PublicLayout`. `GET /r/{token}/pdf` serves a public PDF download. If the share link is expired or disabled, `ResumeBuilder/LinkExpired.tsx` is rendered. Questions submitted via the public view are stored in `resume_questions` and shown in the collapsible "Questions" panel on the Edit page. `sender_phone` is optional on the question form. When a question is submitted, `NewQuestionReceived` mailable is sent to the resume owner. Share link management routes: `PATCH /builder/{resume}/share/{link}` (update, e.g. toggle active), `DELETE /builder/{resume}/share/{link}` (delete). Question read-state routes: `PATCH /builder/{resume}/questions/{question}/read` and `PATCH /builder/{resume}/questions/read-all`.

### Analytics
`ResumeShareEvent` is an append-only table (no `updated_at`) that logs `page_view`, `pdf_download`, and `question_submitted` events. Logging is best-effort (wrapped in try/catch) so it never crashes a public request. `AnalyticsController` aggregates per-resume stats and drives the Dashboard. Unique visitor count uses `COUNT(DISTINCT ip_hash || DATE(created_at))`.

### Beacon save endpoint
`POST /builder/{resume}/beacon` accepts a raw JSON body from the `beforeunload` `navigator.sendBeacon` call in `Edit.tsx`. The `_token` field in the JSON body satisfies CSRF verification (Laravel reads it from the request body regardless of content-type). The `app.blade.php` root template includes `<meta name="csrf-token">` for this purpose.

### Templates
Eight templates (`classic`, `modern`, `minimal`, `minimal-ruled`, `sidebar`, `creative`, `executive`, `ats`) are stored as a string column on `resumes`. The live preview in `Edit.tsx` is an `<iframe>` that loads `GET /builder/{resume}/preview` (the server-rendered PDF stream) — there are no inline React template components in the editor. A cache-busting `?t=<timestamp>` query param on `pdfSrc` forces the iframe to reload after each save. The PDF Blade view (`resources/views/resume-pdf.blade.php`) is the single source of truth for all template rendering.

### Font sizes
`font_sizes` is a nullable JSON column on `resumes`. The `DEFAULT_FONT_SIZES` constant is defined at module scope in `Edit.tsx` (not inside the component). Sliders in the "Font Sizes" section of the editor save on blur, which triggers a `pdfSrc` refresh so the iframe preview reflects the new sizes via the server-rendered PDF.

### ATS score
`GET /builder/{resume}/ats-score` (throttled 10 req/min) returns a JSON score via `AtsScoreController` → `AtsScorer` service. Requires resume ownership (`authorize('update', $resume)`). `DELETE /builder/{resume}/ats-score` clears the cached score.

### Resume duplicate
`POST /builder/{resume}/duplicate` creates a copy of a resume (owned by the current user). Handled by `ResumeBuilderController@duplicate`.

### Billing and free-tier limits
`BillingController` drives `Billing/Index.tsx`. Free users are capped at 5 resumes (`resumeLimit: 5`; Pro gets `null`). When the limit is hit, `limitReached` is flashed in the session and the builder redirects to the billing page. The `checkout` action creates a Stripe Checkout session; `portal` redirects to the Stripe customer portal.

Pro access is determined by `User::isPro()`: returns `true` if `is_master_admin`, `is_pro`, or `subscribed('default')`. `is_pro` is a boolean column on `users` that admins can toggle directly (bypassing Stripe) via the admin panel.

### Cover letters
Full CRUD at `/cover-letters` → `CoverLetterController` → `CoverLetter/Index.tsx` + `CoverLetter/Edit.tsx`. Letters are created from pre-built templates via `App\Data\CoverLetterTemplates`. Each letter has a `template_key`, `name`, `body` (raw text), and optional `resume_id` foreign key.

### Job applications
Full CRUD at `/jobs` → `JobApplicationController` → `Jobs/Index.tsx` + `Jobs/Edit.tsx`. Columns: `company`, `role`, `status` (enum via `JobApplication::STATUSES`), `resume_id`, `applied_at`, `notes`, `job_url`. Policy-gated on ownership.

### Onboarding
`PATCH /user/onboarding` → `OnboardingController@complete` flips `has_completed_onboarding` to `true` on the user. Used for first-run UX flow; field is a boolean column on `users`.

### AI suggestions
`AiSuggestController` handles `POST /builder/{resume}/ai-suggest` (throttled to 10 requests/minute). Supports `field` values: `summary`, `bullets`, `skills`, `title`. Provider is selected per-request (`claude` or `openai`); the active provider is persisted in `localStorage` under `resumegen_ai_provider`. Both keys are checked via `config('services.anthropic.key')` and `config('services.openai.key')` — never `env()` directly.

### AI usage tracking
Every AI suggest call (web and API) logs to `ai_usage_logs` via `AiUsageLogger::log()`. The logger looks up cost rates from `ai_model_rates` (keyed by `provider` + `model` + `effective_from` date) and stores `input_tokens`, `output_tokens`, and `cost_usd`. Both models are append-only with no `updated_at`. `GET /usage` → `UsageController` → `Usage/Index.tsx` shows per-user totals and a 30-day activity log. The admin panel has its own aggregated view across all users (see Admin panel section).

### Admin panel
Routes under `/admin` are guarded by `auth` + `master_admin` middleware (`EnsureMasterAdmin` — aborts 403 if `User::is_master_admin` is false). `is_master_admin` is a non-editable boolean on `users`; it must be set directly in the database or via seeder.

- `GET /admin/usage` → `AdminUsageController@index` → `Admin/Usage.tsx` — AI cost dashboard aggregated across all users, filterable by date range (`30days`, `month`, `all`). Breaks down by provider, model, feature, and per-user.
- `GET /admin/users` → `AdminUserController@index` → `Admin/Users/Index.tsx` — paginated user list with subscription status and resume count.
- `PATCH /admin/users/{user}/toggle-pro` — flips `is_pro` on a user (blocked for master admins).
- `DELETE /admin/users/{user}` — deletes a user and cancels their Stripe subscription immediately (blocked for master admins and self).

### Rate limiting
- AI suggest endpoint: `throttle:10,1` (10 req/min)
- Public question form (`POST /r/{token}/questions`): `throttle:5,1` (5 req/min)

### API layer (token-based, for iPhone app)
A JSON API lives under the `/api` prefix alongside the Inertia web layer. Auth uses Laravel Sanctum personal access tokens — **not** session cookies.

**Auth endpoints** (no `auth:sanctum` required):
- `POST /api/auth/login` — returns `{ token }`, throttled 10/min
- `GET /api/auth/me` — returns authenticated user
- `POST /api/auth/logout` — revokes current token

**Resume endpoints** (all require `Authorization: Bearer {token}`):
- `GET|POST /api/resumes` — index / store
- `GET|PUT|DELETE /api/resumes/{id}` — show / update / destroy
- `POST /api/resumes/{id}/duplicate`
- `POST /api/resumes/{id}/ai-suggest` — throttled 10/min
- `GET /api/resumes/{id}/ats-score` — throttled 10/min

**Cover letter endpoints** (all require `Authorization: Bearer {token}`):
- `GET|POST /api/cover-letters` — index (no body field) / store (renders body from template)
- `GET|PUT|DELETE /api/cover-letters/{id}` — show (includes body) / update / destroy

**Job application endpoints** (all require `Authorization: Bearer {token}`):
- `GET|POST /api/jobs` — index (eager-loads `resume:id,name`) / store
- `GET|PUT|DELETE /api/jobs/{id}` — show / update / destroy

**Sanctum config:** `config/sanctum.php` sets `'guard' => []` (intentionally empty) to prevent web session fallback so only token-auth works for API requests.

**API tests:** All API test files must extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). `ApiTestCase` calls `$this->app['auth']->forgetGuards()` before each request to prevent Sanctum's guard cache from masking token revocation in multi-request tests.
