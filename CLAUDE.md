# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend:** Laravel 13, PHP 8.4, SQLite (default), Inertia.js v2
- **Frontend:** React 18, TypeScript, Tailwind CSS v3, Vite 8
- **Auth:** Laravel Breeze (session-based)
- **PDF:** `barryvdh/laravel-dompdf` — route `GET /builder/{resume}/pdf` triggers server-side generation via `resources/views/resume-pdf.blade.php`. `GET /builder/{resume}/preview` streams the same PDF inline (used by the live preview iframe in the editor).
- **Media:** `spatie/laravel-medialibrary` (installed, migration exists, not yet used)
- **Routing on the frontend:** Ziggy (`route()` helper available globally in React via `resources/js/types/global.d.ts`)
- **Billing:** `laravel/cashier-stripe` — `User` uses `Billable` trait. Stripe price IDs in `config/services.php`: `services.stripe.starter_monthly_price_id`, `services.stripe.starter_yearly_price_id`, `services.stripe.pro_monthly_price_id`, `services.stripe.pro_yearly_price_id`. Subscription name is `'default'`.

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

**Cascade delete:** `Resume::booted()` has a `deleting` observer that deletes all A/B variants (`ab_parent_id = id`) and snapshots (`parent_resume_id = id`, `is_snapshot = true`) before the parent is removed. This is model-level (not FK-level) so it works on SQLite and fires model events on children.

### Authorization
`ResumePolicy` gates all resume mutations on `$user->id === $resume->user_id`. The base `Controller` uses the `AuthorizesRequests` trait so `$this->authorize()` is available everywhere.

### Frontend page structure
Pages live in `resources/js/Pages/`. The core feature is `ResumeBuilder/Edit.tsx`, which is a resizable split-panel editor + live preview. It uses `onBlur` on every field to trigger a `router.put` save (no debounce timer). State for all resume sections is managed with `useState`; refs mirror current state so the `save` callback never captures stale closures. The panel divider is draggable (`leftWidth` state, `handleDividerMouseDown`); widths are tracked as percentages.

### Shared Inertia props
`HandleInertiaRequests::share()` passes `auth.user` and `featureGate` to every page. Access auth in React via `usePage().props.auth.user`. `featureGate` is a flash-based value (`session()->pull('featureGate')`) — any controller can flash it to surface the `UpgradeModal` without per-page wiring.

### Frontend routing
Use Ziggy's `route('named.route', params)` helper — it's globally typed in `resources/js/types/global.d.ts`. Never hardcode URL strings.

### Asset pipeline
`npm run build` runs `tsc` (type-check) then `vite build`. Output lands in `public/build/`. Always rebuild after editing frontend files when not running `npm run dev`.

### Share links and public view
`ResumeShareLink` stores a 48-char random token (auto-generated in `booted()`). The public route `/r/{token}` is unauthenticated and renders `ResumeBuilder/PublicView.tsx` via `PublicLayout`. `GET /r/{token}/pdf` serves a public PDF download. If the share link is expired or disabled, `ResumeBuilder/LinkExpired.tsx` is rendered. Visitors can start threaded conversations via the public view — stored in `resume_threads` + `resume_thread_messages` and shown in the "Threads" panel on the Edit page. Share link management routes: `PATCH /builder/{resume}/share/{link}` (update, e.g. toggle active), `DELETE /builder/{resume}/share/{link}` (delete).

### Threads & Messaging
`ResumeThread` belongs to a resume and (optionally) a share link; `ResumeThreadMessage` belongs to a thread. `is_owner` boolean on messages distinguishes owner replies from visitor messages. `is_read` boolean on `ResumeThread` tracks unread state.

**Public routes** (`POST /r/{token}/threads`, `POST /r/{token}/threads/{thread}/messages`): throttled `5,1`. Visitor session tracks owned thread IDs in `owned_threads` session key for reply authorization. Fires `NewThreadStarted` / `NewVisitorReply` mailables to the resume owner.

**Owner routes** (all auth + ownership-gated):
- `GET /builder/{resume}/threads/{thread}` (`builder.thread`) → `ResumeThreadController@show` → `ResumeBuilder/Thread.tsx`
- `POST /builder/{resume}/threads/{thread}/reply` (`builder.thread.reply`) — creates owner message, emails visitor via `VisitorThreadReply` mailable
- `PATCH /builder/{resume}/threads/{thread}/read` (`builder.thread.read`) — marks thread read
- `DELETE /builder/{resume}/threads/{thread}` (`builder.thread.destroy`) — deletes thread, redirects to messages inbox

**Messages inbox** (`GET /messages` → `MessagesController@index` → `Messages/Index.tsx`): lists all threads across all resumes with unread badge. `PATCH /messages/read-all` (`messages.read-all`) marks all read.

`PublicView.tsx` shows a sticky conversion header and fixed footer CTA ("Made with Resumegen · Build yours free →") to unauthenticated visitors only — hidden when `auth.user` is present. The editor's Share button opens a popover with a read-only URL, copy button, LinkedIn share link, and X (Twitter) share link. The URL is fetched from `GET /builder/{resume}/share-url` on first click (auto-creates an active share link).

### Analytics
`ResumeShareEvent` is an append-only table (no `updated_at`) that logs `page_view`, `pdf_download`, and `question_submitted` events. Logging is best-effort (wrapped in try/catch) so it never crashes a public request. `AnalyticsController` aggregates per-resume stats and drives the Dashboard. Unique visitor count uses `COUNT(DISTINCT ip_hash || DATE(created_at))`.

### Beacon save endpoint
`POST /builder/{resume}/beacon` accepts a raw JSON body from the `beforeunload` `navigator.sendBeacon` call in `Edit.tsx`. The `_token` field in the JSON body satisfies CSRF verification (Laravel reads it from the request body regardless of content-type). The `app.blade.php` root template includes `<meta name="csrf-token">` for this purpose.

### Templates
Nine templates (`classic`, `modern`, `minimal`, `minimal-ruled`, `executive`, `ats`, `skills-first`, `academic`, `bold`) are stored as a string column on `resumes`. The live preview in `Edit.tsx` is an `<iframe>` that loads `GET /builder/{resume}/preview` (the server-rendered PDF stream) — there are no inline React template components in the editor. A cache-busting `?t=<timestamp>` query param on `pdfSrc` forces the iframe to reload after each save. The PDF Blade view (`resources/views/resume-pdf.blade.php`) is the single source of truth for all template rendering.

### Font sizes
`font_sizes` is a nullable JSON column on `resumes`. The `DEFAULT_FONT_SIZES` constant is defined at module scope in `Edit.tsx` (not inside the component). Sliders in the "Font Sizes" section of the editor save on blur, which triggers a `pdfSrc` refresh so the iframe preview reflects the new sizes via the server-rendered PDF.

### DOCX export
`GET /builder/{resume}/docx` streams a Word document via `DocxGenerator` (phpoffice/phpword). Gated to Starter+ via `UserLimits::canDocx()` — free users get a `featureGate` redirect. The `canDocx` prop is passed to `Edit.tsx` to show a `🔒 DOCX` locked button.

### Share URL endpoint
`GET /builder/{resume}/share-url` returns `{ url }` JSON via `ResumeBuilderController@shareUrl`. Auto-creates an active `ResumeShareLink` if none exists (or only inactive links exist). Named `builder.share-url`. Used by the Share popover in `Edit.tsx` to get a shareable link on demand without a page refresh.

### Resume duplicate
`POST /builder/{resume}/duplicate` creates a copy of a resume (owned by the current user). Handled by `ResumeBuilderController@duplicate`.

@docs/claude/pricing-and-billing.md

### Cover letters
Full CRUD at `/cover-letters` → `CoverLetterController` → `CoverLetter/Index.tsx` + `CoverLetter/Edit.tsx`. Letters are created from pre-built templates via `App\Data\CoverLetterTemplates`. Each letter has a `template_key`, `name`, `body` (raw text), and optional `resume_id` foreign key.

### Job applications
Full CRUD at `/jobs` → `JobApplicationController` → `Jobs/Index.tsx` + `Jobs/Edit.tsx`. Columns: `company`, `role`, `status` (enum via `JobApplication::STATUSES`), `resume_id`, `applied_at`, `notes`, `job_url`. Policy-gated on ownership.

### Job Roles / Titles / Skills reference data
Three seeded lookup tables power autocomplete and admin management. Seed all three with `php artisan db:seed --class=JobRolesSeeder` / `JobTitlesSeeder` / `JobSkillsSeeder` (idempotent — use `insertOrIgnore`).

- **`job_roles`** (`JobRole` model) and **`job_titles`** (`JobTitle` model) — each a single `title` string column. `JobTitlesSeeder` merges a static list with a `database/data/job_titles_extras.json` file so runtime-added titles survive `migrate:fresh` (it persists DB-only rows to the extras file before reseeding).
- **`job_skills`** — `category` + `name` columns, unique on `(category, name)`. Seeded with 828 skills across 27 categories. No Eloquent model or routes yet (seed-only reference data).

**Autocomplete** (`AutocompleteController`, auth-gated, web routes):
- `GET /autocomplete/job-roles` (`autocomplete.job-roles.search`) + `GET /autocomplete/job-titles` (`autocomplete.job-titles.search`) — `?q=` prefix search (min 2 chars), falls back to substring `LIKE %q%` when fewer than 3 prefix matches, returns up to 10 `{id, title}`.
- `POST /autocomplete/job-roles` (`autocomplete.job-roles.store`) + `POST /autocomplete/job-titles` (`autocomplete.job-titles.store`) — `firstOrCreate` a title-cased entry, returns `{id, title}`. Lets the UI add new options on the fly. Frontend consumes these via `resources/js/Components/AutocompleteInput.tsx`.

**Admin management** (`Admin\AdminJobTitleController`, master-admin gated, under `/admin`): `GET /admin/job-titles` (`admin.job-titles.index`) renders `Admin/JobTitles/Index.tsx` — a tabbed (roles/titles), searchable, paginated (50/page) CRUD with single-row create/update/delete plus bulk delete (`admin.job-roles.bulk-destroy`, `admin.job-titles.bulk-destroy`). All writes title-case the input.

### Onboarding
New users are redirected to `/onboarding` after registration. `OnboardingController` handles three routes:
- `GET /onboarding` (`onboarding.show`) — renders `Onboarding/Wizard` via `GuestLayout`; redirects to dashboard if `has_completed_onboarding` is already true.
- `POST /onboarding` (`onboarding.store`) — saves career context (`target_role`, `industry`, `years_experience` — nullable columns on `users`) and contact info (`full_name`, `phone`, `location`, `linkedin_url`, `website` — merged into `profile` JSON column), sets `has_completed_onboarding = true`, redirects to dashboard.
- `PATCH /user/onboarding` (`onboarding.complete`) — legacy endpoint used by the in-editor first-run wizard; flips `has_completed_onboarding` to `true` and returns `back()`.

The wizard is a two-step client-side form (no round-trips between steps). Step 1: career context. Step 2: contact info. Both steps have a "Skip for now" button that submits empty values. `Onboarding/Wizard.tsx` uses `GuestLayout` and `useForm` from `@inertiajs/react`.

Saved persona fields (`target_role`, `industry`, `years_experience`) are exposed as `userPersona` props on `Edit.tsx` (via `ResumeBuilderController@edit`) and `Index.tsx` (via `ResumeBuilderController@index`). `ResumeBuilderController@store` defaults new resume name to `"{target_role} Resume"` when `target_role` is set.

### Career Hub
Public resource library at `/career` for SEO. No authentication required.

- `GET /career` (`career.index`) → `CareerHubController@index` → `CareerHub/Index.tsx` — returns published articles only, ordered by `published_at` desc. Passes `articles` + `categories` props.
- `GET /career/{slug}` (`career.show`) → `CareerHubController@show` → `CareerHub/Show.tsx` — 404s on unpublished articles.

Both pages use `PublicLayout`. `CareerHub/Index.tsx` has client-side category filter pills. `CareerHub/Show.tsx` renders `body` as `dangerouslySetInnerHTML` with `prose` classes and a CTA footer linking to `/register`. A "Career" link is added to `Welcome.tsx` public nav.

`CareerArticle` model (`app/Models/CareerArticle.php`):
- `CATEGORIES` const: `['Resume Tips', 'Job Search', 'Interviews', 'Salary & Negotiation', 'Career Growth']`
- `booted()` hooks: auto-generates `slug` from `title` on create (if not provided); computes `reading_time_minutes` as `ceil(word_count / 200)`; sets `published_at = now()` when `is_published` flips to true (both on create and update).
- Factory states: `->published()` (`is_published = true`, `published_at = now()`), `->draft()`.

### Admin panel
Routes under `/admin` are guarded by `auth` + `master_admin` middleware (`EnsureMasterAdmin` — aborts 403 if `User::is_master_admin` is false). `is_master_admin` is a non-editable boolean on `users`; it must be set directly in the database or via seeder.

- `GET /admin/users` → `AdminUserController@index` → `Admin/Users/Index.tsx` — paginated user list with subscription status and resume count.
- `PATCH /admin/users/{user}/toggle-pro` — flips `is_pro` on a user (blocked for master admins).
- `DELETE /admin/users/{user}` — deletes a user and cancels their Stripe subscription immediately (blocked for master admins and self).
- `GET|POST /admin/career` + `GET /admin/career/create` + `GET|PUT|DELETE /admin/career/{career}/edit` → `Admin\CareerController` → `Admin/Career/Index.tsx` + `Admin/Career/Edit.tsx` — full CRUD for career articles. Named routes: `admin.career.{index,create,store,edit,update,destroy}`.

### Master Resume + Tailored Copies
Three nullable columns on `resumes`: `is_master` (bool, default false), `master_resume_id` (FK→resumes, nullOnDelete), `master_synced_at` (timestamp). Any resume can be a master — no DB-level uniqueness. Tailored copies point to their master via `master_resume_id`; stale detection compares `master.updated_at > copy.master_synced_at`.

Routes (all auth + policy-gated):
- `PATCH /builder/{resume}/set-master` (`builder.set-master`) — toggles `is_master`
- `POST /builder/{resume}/create-tailored-copy` (`builder.create-tailored-copy`) — replicates resume, sets `master_resume_id`, assigns fresh `pdf_filename`
- `PATCH /builder/{resume}/sync-master` (`builder.sync-master`) — sets `master_synced_at = now()` (dismiss-only, no content sync)
- `POST /builder/{resume}/pull-from-master` (`builder.pull-from-master`) — copies all content fields from master into the copy and sets `master_synced_at = now()`

`index()` includes `is_master`, `master_resume_id`, `master_updated_at`, `master_synced_at` per resume (master's `updated_at` batch-fetched in one query). `edit()` adds `masterOutOfSync` (bool) and `masterResume` ({id, name}|null) props. Dashboard shows violet "Master" badge and amber "⚠ Master updated" stale badge (null `master_synced_at` is always considered stale). Editor shows a dismissible amber banner with three actions: "Pull from master" (calls pull-from-master, reloads page), "View master →" (link), and "Dismiss" (calls sync-master + clears local state).

### Recruiter Heatmaps
`resume_section_events` is an append-only table (`created_at` only, no `updated_at` — model uses `public const UPDATED_AT = null`). Columns: `resume_id` (FK cascade), `section` (string), `dwell_ms` (unsignedInt, clamped to 120000), `ip_hash` (SHA-256 of visitor IP).

Routes:
- `POST /r/{token}/section-events` (`public.section-events`) — unauthenticated, `throttle:30,1`. Validates active + non-expired share link → 404 otherwise. Accepts `{ sections: [{ section, dwell_ms }] }` (max 20). Section regex: `^(summary|experience|education|skills|certifications|custom_[a-z0-9_]+)$`. Validation runs before try/catch; only DB inserts are wrapped.
- `GET /builder/{resume}/heatmap` (`builder.heatmap`) — auth + ownership. Accepts optional `?period=7d|30d|all` (default `30d`). Aggregates `section, COUNT(*) as view_count, AVG(dwell_ms) as avg_dwell_ms` ordered by view_count desc. Passes `period` and `totalViews` as Inertia props. Renders `ResumeBuilder/Heatmap.tsx`. Section name `max:50` enforced on ingest.

`PublicView.tsx` contains a `useSectionHeatmap(token)` hook that attaches an `IntersectionObserver` (threshold 0.25) to all `[data-section]` elements, accumulates dwell time, and fires `navigator.sendBeacon` on `beforeunload` (skipped if total page time < 500ms). The five section wrappers carry `data-section="summary|experience|education|skills|certifications"`. `ResumeBuilder/Heatmap.tsx` renders a pure-CSS horizontal bar chart with a 7d/30d/all-time period selector and total views summary. Dashboard shows a "Heatmap" link per resume card when `has_active_share_link` is true (batch-queried in `index()`).

### Referral Rewards
`ReferralRewardService::grantIfEligible(User $upgradedUser)` completes the referral loop. Guards: null `referred_by_user_id` → skip; existing `upgrade` ReferralEvent for this user → skip (idempotency — checked inside `DB::transaction` with `lockForUpdate()` to prevent race conditions). Creates `ReferralEvent` (event_type `'upgrade'`), increments referrer's `referral_rewards_earned`, logs success via `Log::info`. Then tries Stripe reward: if referrer has an active `'default'` subscription → `$sub->active()` check then `extend(now()->addMonth())`; otherwise creates a Stripe customer balance credit of -900 cents. Stripe calls are wrapped in `try/catch` with `Log::warning` on failure — DB writes are NOT wrapped (they should propagate). Wired in `AppServiceProvider` Subscription observer after `plan_tier` sync, gated on `['starter', 'pro']` tiers.

### Public Portfolio Page
Personal micro-site at `/p/{slug}` combining an identity landing page with a resume hub. Users claim a custom vanity slug via `PATCH /user/portfolio` (`portfolio.update`). The page is live as soon as a slug is set.

**Columns on `users`:** `portfolio_slug` (string, unique, nullable, 3–30 chars `[a-z0-9-]`), `portfolio_headline` (string, nullable), `portfolio_bio` (text, nullable), `portfolio_links` (JSON, nullable — array of `{ platform, url }` where platform ∈ `linkedin|github|x|website`), `portfolio_is_public` (bool).

**`portfolio_messages` table:** append-only (model uses `public const UPDATED_AT = null`). Columns: `user_id` FK cascade, `sender_name`, `sender_email`, `message`, `read_at` nullable.

**Routes:**
- `GET /p/{slug}` (`portfolio.show`) — public, unauthenticated
- `POST /p/{slug}/contact` (`portfolio.contact`) — public, `throttle:5,1`
- `GET /portfolio/check-slug` (`portfolio.check-slug`) — auth required, `throttle:10,1`
- `PATCH /user/portfolio` (`portfolio.update`) — auth required

**`PortfolioController`:** `show()` looks up user by `portfolio_slug`, eager-loads active non-expired share links with their resume; `contact()` validates, stores `PortfolioMessage`, queues `NewPortfolioMessageMail`; `checkSlug()` checks availability excluding current user; `update()` validates with `Rule::notIn(RESERVED_SLUGS)` + `Rule::unique()->ignore()` + `distinct:strict` on platform.

**Reserved slugs** (blocked at validation, documented as brand-protection): `admin, api, builder, career, jobs, cover-letters, billing, profile, onboarding, register, login, logout, p, r, password, dashboard, usage, webhooks, settings`.

**`Portfolio/Show.tsx`:** Uses `PublicLayout`. Hero with `InitialsAvatar` (initials circle, deterministic color), headline, bio, social link pills. Resume grid (hidden when no active share links). Contact form with `useForm` + success flash (`contactSent` via `session()->pull()`). Guest CTA fixed top-right (`route('register')`) hidden when `auth.user` present.

**`Settings/Portfolio.tsx`:** Slug input with debounced availability check (400ms, `useRef<AbortController>` for race safety), social link URL inputs using `_link_*` internal fields + `buildLinks()` assembler.

**Mail:** `NewPortfolioMessageMail` — queued (`Mail::to()->queue()`), subject `"New message from {sender_name} via your portfolio"`, Markdown template at `resources/views/mail/new-portfolio-message.blade.php`.

### AI (OpenAI)
`openai-php/laravel` (config `config/openai.php`) reads `OPENAI_API_KEY` from env. `config/ai.php` holds the default model (`env('OPENAI_MODEL', 'gpt-4o-mini')`), per-tier `monthly_limits` (foundation only — not enforced on any route yet), and a per-model `pricing` map (cents per 1k tokens).

`App\Services\AiService::chat(string $prompt, array $options)` injects the OpenAI `ClientContract`, sends a single-prompt chat completion, logs the call to `ai_requests` (via `AiRequest` model — `user_id`, `feature`, `model`, token counts, `estimated_cost_cents`, `status`), and returns the reply text. On failure it logs an `error` row then rethrows. `$options` accepts `model`, `user`, and `feature`. Moderation pre-check flags disallowed input (logs a `flagged` row storing the offending text in `ai_requests.flagged_text`, throws `ModerationException`).

**Admin AI dashboard** (`/admin/ai`, master-admin gated): `Admin\AdminAiController` drives an Overview (KPIs + pure-CSS/SVG charts + 7d/30d/all period selector + OpenAI cost reconciliation via `OpenAiUsageService`), a per-user usage table (`admin.ai.users`), a per-user detail with controls (reset monthly quota via `ai_usage_reset_at`, set `ai_limit_override`, toggle `ai_blocked`), and a flagged-content review queue (`admin.ai.flagged`). `AiUsageReport` centralizes the aggregate queries (totals / breakdowns / daily series). `UserLimits` honors the per-user override/block/reset columns. Flagged input text is pruned after 90 days by `ai:prune-flagged` (scheduled daily in `routes/console.php`). `OPENAI_ADMIN_KEY` (optional, org-level Admin key) powers the cost reconciliation and degrades gracefully when absent.

### Rate limiting
- API login: `throttle:10,1` (10 req/min)
- Public thread form (`POST /r/{token}/threads`): `throttle:5,1` (5 req/min)
- Section events (`POST /r/{token}/section-events`): `throttle:30,1` (30 req/min)
- Portfolio contact form (`POST /p/{slug}/contact`): `throttle:5,1` (5 req/min)
- Portfolio slug check (`GET /portfolio/check-slug`): `throttle:10,1` (10 req/min)

@docs/claude/api-layer.md

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.4
- inertiajs/inertia-laravel (INERTIA_LARAVEL) - v2
- laravel/cashier (CASHIER) - v16
- laravel/framework (LARAVEL) - v13
- laravel/prompts (PROMPTS) - v0
- laravel/sanctum (SANCTUM) - v4
- tightenco/ziggy (ZIGGY) - v2
- laravel/boost (BOOST) - v2
- laravel/breeze (BREEZE) - v2
- laravel/mcp (MCP) - v0
- laravel/pail (PAIL) - v1
- laravel/pint (PINT) - v1
- phpunit/phpunit (PHPUNIT) - v12
- @inertiajs/react (INERTIA_REACT) - v2
- react (REACT) - v18
- tailwindcss (TAILWINDCSS) - v3

## Skills Activation

This project has domain-specific skills available in `**/skills/**`. You MUST activate the relevant skill whenever you work in that domain—don't wait until you're stuck.

## Conventions

- You must follow all existing code conventions used in this application. When creating or editing a file, check sibling files for the correct structure, approach, and naming.
- Use descriptive names for variables and methods. For example, `isRegisteredForDiscounts`, not `discount()`.
- Check for existing components to reuse before writing a new one.

## Verification Scripts

- Do not create verification scripts or tinker when tests cover that functionality and prove they work. Unit and feature tests are more important.

## Application Structure & Architecture

- Stick to existing directory structure; don't create new base folders without approval.
- Do not change the application's dependencies without approval.

## Frontend Bundling

- If the user doesn't see a frontend change reflected in the UI, it could mean they need to run `npm run build`, `npm run dev`, or `composer run dev`. Ask them.

## Documentation Files

- You must only create documentation files if explicitly requested by the user.

## Replies

- Be concise in your explanations - focus on what's important rather than explaining obvious details.

=== boost rules ===

# Laravel Boost

## Tools

- Laravel Boost is an MCP server with tools designed specifically for this application. Prefer Boost tools over manual alternatives like shell commands or file reads.
- Use `database-query` to run read-only queries against the database instead of writing raw SQL in tinker.
- Use `database-schema` to inspect table structure before writing migrations or models.
- Use `get-absolute-url` to resolve the correct scheme, domain, and port for project URLs. Always use this before sharing a URL with the user.
- Use `browser-logs` to read browser logs, errors, and exceptions. Only recent logs are useful, ignore old entries.

## Searching Documentation (IMPORTANT)

- Always use `search-docs` before making code changes. Do not skip this step. It returns version-specific docs based on installed packages automatically.
- Pass a `packages` array to scope results when you know which packages are relevant.
- Use multiple broad, topic-based queries: `['rate limiting', 'routing rate limiting', 'routing']`. Expect the most relevant results first.
- Do not add package names to queries because package info is already shared. Use `test resource table`, not `filament 4 test resource table`.

### Search Syntax

1. Use words for auto-stemmed AND logic: `rate limit` matches both "rate" AND "limit".
2. Use `"quoted phrases"` for exact position matching: `"infinite scroll"` requires adjacent words in order.
3. Combine words and phrases for mixed queries: `middleware "rate limit"`.
4. Use multiple queries for OR logic: `queries=["authentication", "middleware"]`.

## Artisan

- Run Artisan commands directly via the command line (e.g., `php artisan route:list`). Use `php artisan list` to discover available commands and `php artisan [command] --help` to check parameters.
- Inspect routes with `php artisan route:list`. Filter with: `--method=GET`, `--name=users`, `--path=api`, `--except-vendor`, `--only-vendor`.
- Read configuration values using dot notation: `php artisan config:show app.name`, `php artisan config:show database.default`. Or read config files directly from the `config/` directory.

## Tinker

- Execute PHP in app context for debugging and testing code. Do not create models without user approval, prefer tests with factories instead. Prefer existing Artisan commands over custom tinker code.
- Always use single quotes to prevent shell expansion: `php artisan tinker --execute 'Your::code();'`
  - Double quotes for PHP strings inside: `php artisan tinker --execute 'User::where("active", true)->count();'`

=== php rules ===

# PHP

- Always use curly braces for control structures, even for single-line bodies.
- Use PHP 8 constructor property promotion: `public function __construct(public GitHub $github) { }`. Do not leave empty zero-parameter `__construct()` methods unless the constructor is private.
- Use explicit return type declarations and type hints for all method parameters: `function isAccessible(User $user, ?string $path = null): bool`
- Use TitleCase for Enum keys: `FavoritePerson`, `BestLake`, `Monthly`.
- Prefer PHPDoc blocks over inline comments. Only add inline comments for exceptionally complex logic.
- Use array shape type definitions in PHPDoc blocks.

=== deployments rules ===

# Deployment

- Laravel can be deployed using [Laravel Cloud](https://cloud.laravel.com/), which is the fastest way to deploy and scale production Laravel applications.

=== tests rules ===

# Test Enforcement

- Every change must be programmatically tested. Write a new test or update an existing test, then run the affected tests to make sure they pass.
- Run the minimum number of tests needed to ensure code quality and speed. Use `php artisan test --compact` with a specific filename or filter.

=== inertia-laravel/core rules ===

# Inertia

- Inertia creates fully client-side rendered SPAs without modern SPA complexity, leveraging existing server-side patterns.
- Components live in `resources/js/Pages` (unless specified in `vite.config.js`). Use `Inertia::render()` for server-side routing instead of Blade views.
- ALWAYS use `search-docs` tool for version-specific Inertia documentation and updated code examples.
- IMPORTANT: Activate `inertia-react-development` when working with Inertia client-side patterns.

# Inertia v2

- Use all Inertia features from v1 and v2. Check the documentation before making changes to ensure the correct approach.
- New features: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.

=== laravel/core rules ===

# Do Things the Laravel Way

- Use `php artisan make:` commands to create new files (i.e. migrations, controllers, models, etc.). You can list available Artisan commands using `php artisan list` and check their parameters with `php artisan [command] --help`.
- If you're creating a generic PHP class, use `php artisan make:class`.
- Pass `--no-interaction` to all Artisan commands to ensure they work without user input. You should also pass the correct `--options` to ensure correct behavior.

### Model Creation

- When creating new models, create useful factories and seeders for them too. Ask the user if they need any other things, using `php artisan make:model --help` to check the available options.

## APIs & Eloquent Resources

- For APIs, default to using Eloquent API Resources and API versioning unless existing API routes do not, then you should follow existing application convention.

## URL Generation

- When generating links to other pages, prefer named routes and the `route()` function.

## Testing

- When creating models for tests, use the factories for the models. Check if the factory has custom states that can be used before manually setting up the model.
- Faker: Use methods such as `$this->faker->word()` or `fake()->randomDigit()`. Follow existing conventions whether to use `$this->faker` or `fake()`.
- When creating tests, make use of `php artisan make:test [options] {name}` to create a feature test, and pass `--unit` to create a unit test. Most tests should be feature tests.

## Vite Error

- If you receive an "Illuminate\Foundation\ViteException: Unable to locate file in Vite manifest" error, you can run `npm run build` or ask the user to run `npm run dev` or `composer run dev`.

=== pint/core rules ===

# Laravel Pint Code Formatter

- If you have modified any PHP files, you must run `vendor/bin/pint --dirty --format agent` before finalizing changes to ensure your code matches the project's expected style.
- Do not run `vendor/bin/pint --test --format agent`, simply run `vendor/bin/pint --format agent` to fix any formatting issues.

=== phpunit/core rules ===

# PHPUnit

- This application uses PHPUnit for testing. All tests must be written as PHPUnit classes. Use `php artisan make:test --phpunit {name}` to create a new test.
- If you see a test using "Pest", convert it to PHPUnit.
- Every time a test has been updated, run that singular test.
- When the tests relating to your feature are passing, ask the user if they would like to also run the entire test suite to make sure everything is still passing.
- Tests should cover all happy paths, failure paths, and edge cases.
- You must not remove any tests or test files from the tests directory without approval. These are not temporary or helper files; these are core to the application.

## Running Tests

- Run the minimal number of tests, using an appropriate filter, before finalizing.
- To run all tests: `php artisan test --compact`.
- To run all tests in a file: `php artisan test --compact tests/Feature/ExampleTest.php`.
- To filter on a particular test name: `php artisan test --compact --filter=testName` (recommended after making a change to a related file).

=== inertia-react/core rules ===

# Inertia + React

- IMPORTANT: Activate `inertia-react-development` when working with Inertia React client-side patterns.

=== spatie/laravel-medialibrary rules ===

## Media Library

- `spatie/laravel-medialibrary` associates files with Eloquent models, with support for collections, conversions, and responsive images.
- Always activate the `medialibrary-development` skill when working with media uploads, conversions, collections, responsive images, or any code that uses the `HasMedia` interface or `InteractsWithMedia` trait.

</laravel-boost-guidelines>

<!-- dgc-policy-v11 -->
# Dual-Graph Context Policy

This project uses a local dual-graph MCP server for efficient context retrieval.

## MANDATORY: Always follow this order

1. **Call `graph_continue` first** — before any file exploration, grep, or code reading.

2. **If `graph_continue` returns `needs_project=true`**: call `graph_scan` with the
   current project directory (`pwd`). Do NOT ask the user.

3. **If `graph_continue` returns `skip=true`**: project has fewer than 5 files.
   Do NOT do broad or recursive exploration. Read only specific files if their names
   are mentioned, or ask the user what to work on.

4. **Read `recommended_files`** using `graph_read` — **one call per file**.
   - `graph_read` accepts a single `file` parameter (string). Call it separately for each
     recommended file. Do NOT pass an array or batch multiple files into one call.
   - `recommended_files` may contain `file::symbol` entries (e.g. `src/auth.ts::handleLogin`).
     Pass them verbatim to `graph_read(file: "src/auth.ts::handleLogin")` — it reads only
     that symbol's lines, not the full file.
   - Example: if `recommended_files` is `["src/auth.ts::handleLogin", "src/db.ts"]`,
     call `graph_read(file: "src/auth.ts::handleLogin")` and `graph_read(file: "src/db.ts")`
     as two separate calls (they can be parallel).

5. **Check `confidence` and obey the caps strictly:**
   - `confidence=high` -> Stop. Do NOT grep or explore further.
   - `confidence=medium` -> If recommended files are insufficient, call `fallback_rg`
     at most `max_supplementary_greps` time(s) with specific terms, then `graph_read`
     at most `max_supplementary_files` additional file(s). Then stop.
   - `confidence=low` -> Call `fallback_rg` at most `max_supplementary_greps` time(s),
     then `graph_read` at most `max_supplementary_files` file(s). Then stop.

## Token Usage

A `token-counter` MCP is available for tracking live token usage.

- To check how many tokens a large file or text will cost **before** reading it:
  `count_tokens({text: "<content>"})`
- To log actual usage after a task completes (if the user asks):
  `log_usage({input_tokens: <est>, output_tokens: <est>, description: "<task>"})`
- To show the user their running session cost:
  `get_session_stats()`

Live dashboard URL is printed at startup next to "Token usage".

## Rules

- Do NOT use `rg`, `grep`, or bash file exploration before calling `graph_continue`.
- Do NOT do broad/recursive exploration at any confidence level.
- `max_supplementary_greps` and `max_supplementary_files` are hard caps - never exceed them.
- Do NOT dump full chat history.
- Do NOT call `graph_retrieve` more than once per turn.
- After edits, call `graph_register_edit` with the changed files. Use `file::symbol` notation (e.g. `src/auth.ts::handleLogin`) when the edit targets a specific function, class, or hook.

## Context Store

Whenever you make a decision, identify a task, note a next step, fact, or blocker during a conversation, call `graph_add_memory`.

**To add an entry:**
```
graph_add_memory(type="decision|task|next|fact|blocker", content="one sentence max 15 words", tags=["topic"], files=["relevant/file.ts"])
```

**Do NOT write context-store.json directly** — always use `graph_add_memory`. It applies pruning and keeps the store healthy.

**Rules:**
- Only log things worth remembering across sessions (not every minor detail)
- `content` must be under 15 words
- `files` lists the files this decision/task relates to (can be empty)
- Log immediately when the item arises — not at session end

## Session End

When the user signals they are done (e.g. "bye", "done", "wrap up", "end session"), proactively update `CONTEXT.md` in the project root with:
- **Current Task**: one sentence on what was being worked on
- **Key Decisions**: bullet list, max 3 items
- **Next Steps**: bullet list, max 3 items

Keep `CONTEXT.md` under 20 lines total. Do NOT summarize the full conversation — only what's needed to resume next session.
