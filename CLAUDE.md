# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Backend:** Laravel 13, PHP 8.4, SQLite (default), Inertia.js v2
- **Frontend:** React 18, TypeScript, Tailwind CSS v3, Vite 8
- **Auth:** Laravel Breeze (session-based), Sanctum (API tokens). `User` implements `MustVerifyEmail` — new registrations must verify before accessing the app. The `verified` middleware gates all main routes (`web.php` line 63).
- **PDF:** `barryvdh/laravel-dompdf` — server-side generation. Routes: `GET /builder/{resume}/pdf` (download), `GET /builder/{resume}/preview` (inline stream for iframe preview)
- **Media:** `spatie/laravel-medialibrary` (installed, migration exists, not yet used)
- **Billing:** `laravel/cashier-stripe` v16 — `User` model uses `Billable` trait. Subscription name is `'default'`. Price IDs in `config/services.php`; see Stripe configuration below.
- **Routing (frontend):** Ziggy v2 (`route()` helper globally available via `resources/js/types/global.d.ts`)

## Commands

```bash
# First-time setup
composer run setup

# Full dev server (Laravel + queue + Pail log viewer + Vite HMR)
composer run dev

# Production build (runs tsc then vite build)
npm run build

# Production deployment script (composer update + view cache + npm build)
./build.sh

# All tests
composer run test

# Single test file
php artisan test tests/Feature/Auth/AuthenticationTest.php

# Filter by test name
php artisan test --filter=test_name

# PHP code formatter (required before finalizing changes)
./vendor/bin/pint

# Migrations
php artisan migrate
php artisan migrate:fresh --seed
```

## Architecture

### Request flow
All routes return Inertia responses — no Blade views except the single root `resources/views/app.blade.php`. Laravel serializes props as JSON; Inertia hydrates the matching React page component at `resources/js/Pages/`.

### Resume data model
Resume content is stored as JSON columns on a single `resumes` table (no separate section tables). Auto-cast columns: `contact`, `experience`, `education`, `skills`, `certifications`, `font_sizes` (arrays). Plain columns: `accent_color` (hex), `font_family`, `template` (string). Frontend owns JSON shape; backend validates as `nullable array`.

**Cascade delete:** `Resume::booted()` has a `deleting` observer that deletes all:
- A/B variants (`ab_parent_id = id`)
- Snapshots (`parent_resume_id = id`, `is_snapshot = true`)
- Tailored copies (`master_resume_id = id`)
- Share links (`resume_id = id`)
- Threads (`resume_id = id`)

Model-level (not FK-level) so it works on SQLite and fires model events.

### Authorization
`ResumePolicy` gates all resume mutations on `$user->id === $resume->user_id`. The base `Controller` uses `AuthorizesRequests` so `$this->authorize()` is available everywhere.

### Frontend page structure
The core feature is `ResumeBuilder/Edit.tsx` — a resizable split-panel editor + live preview iframe. Uses `onBlur` on every field to trigger `router.put` save (no debounce). State managed with `useState`; refs mirror state to prevent stale closures. The divider is draggable (`leftWidth` state, `handleDividerMouseDown`); widths tracked as percentages. The preview iframe loads `GET /builder/{resume}/preview` with a cache-busting `?t=<timestamp>` query param on each save.

### Shared Inertia props
`HandleInertiaRequests::share()` passes `auth.user` and `featureGate` to every page. Access auth in React via `usePage().props.auth.user`. `featureGate` is a flash value (`session()->pull('featureGate')`) — any controller can flash it to trigger the `UpgradeModal` without per-page wiring.

### Asset pipeline
`npm run build` runs `tsc` (type-check) then `vite build`. Output lands in `public/build/`. Always rebuild after editing frontend files when not running `npm run dev` (HMR).

### Frontend routing
Use Ziggy's `route('named.route', params)` helper — never hardcode URL strings. Types are global via `resources/js/types/global.d.ts`.

## Pricing & Billing

**4-tier model:** Free / Starter ($9/mo) / Pro ($19/mo) / Agency ($49/mo). All limits enforced via `App\Services\UserLimits` — the single source of truth.

| Feature | Free | Starter | Pro | Agency |
|---------|------|---------|-----|--------|
| Resumes | 2 | 10 | unlimited | unlimited |
| Cover letters | 1 | 10 | unlimited | unlimited |
| Job applications | 3 | unlimited | unlimited | unlimited |
| Templates | 4 (classic, modern, minimal, ats) | all 9 | all 9 | all 9 |
| DOCX export | ✗ | ✓ | ✓ | ✓ |
| AI generations/month | 10 | 150 | 500 | 1000 |
| AI tailoring (ATS/JD) | ✗ | ✓ | ✓ | ✓ |
| Team workspace | ✗ | ✗ | ✗ | ✓ |

**Tier detection:** `User::planTier()` resolves: `is_master_admin` → `'agency'`; `is_pro` → `'pro'`; `is_agency` → `'agency'`; else returns `plan_tier` column value. All `match` expressions in `UserLimits` have explicit arms for `'pro'`/`'agency'` and a restrictive `default` (free limits) so unknown tiers never grant elevated access.

**Gate responses:** Inertia routes flash `featureGate` to the session, which `HandleInertiaRequests::share()` sends to every page. API/JSON routes return HTTP 402 with `{ error, required_tier }`. The `UpgradeModal` component handles both paths — flash-based (Inertia) and event-based (`triggerUpgradeModal(feature, requiredTier)` for XHR).

**Enforcement examples:**
- `UserLimits::canDocx()` — gates `GET /builder/{resume}/docx`
- `UserLimits::canAiTailoring()` — gates ATS-keywords + target-job-description features
- `UserLimits::canUseOrg()` — gates org workspace creation/membership

**Stripe configuration** (`config/services.php`):
```
services.stripe.starter_monthly_price_id    (env STRIPE_STARTER_MONTHLY_PRICE_ID)
services.stripe.starter_yearly_price_id     (env STRIPE_STARTER_YEARLY_PRICE_ID)
services.stripe.pro_monthly_price_id        (env STRIPE_PRO_MONTHLY_PRICE_ID)
services.stripe.pro_yearly_price_id         (env STRIPE_PRO_YEARLY_PRICE_ID)
services.stripe.agency_monthly_price_id     (env STRIPE_AGENCY_MONTHLY_PRICE_ID)
services.stripe.agency_yearly_price_id      (env STRIPE_AGENCY_YEARLY_PRICE_ID)
services.stripe.tier_prices.starter_cents   (env PRICE_STARTER_CENTS, default 900)
services.stripe.tier_prices.pro_cents       (env PRICE_PRO_CENTS, default 1900)
services.stripe.tier_prices.agency_cents    (env PRICE_AGENCY_CENTS, default 4900)
```

**Setup steps:** Create 6 Stripe price objects (monthly/yearly for starter/pro/agency). Set the 6 `STRIPE_*_PRICE_ID` env vars. Run `config:clear`. Set webhook secret (`STRIPE_WEBHOOK_SECRET`).

**Subscription sync:** Cashier's `SubscriptionUpdated` observer in `AppServiceProvider` syncs `plan_tier` and `is_agency` columns from the active subscription's price ID on every subscription event.

## Resumes & Templates

Nine templates (committed as a string column): `classic`, `modern`, `minimal`, `minimal-ruled`, `executive`, `ats`, `skills-first`, `academic`, `bold`. The PDF Blade view (`resources/views/resume-pdf.blade.php`) is the single source of truth for template rendering. Template-picker static previews live at `public/images/templates/{template}.png`; regenerate with `php artisan thumbnails:templates` when a template's Blade changes.

**Thumbnails:** `GET /builder/{resume}/thumbnail` serves a cached PNG of the resume's first PDF page (DomPDF → Imagick/Ghostscript, ~400px wide). Cache at `storage/app/thumbnails/{id}.png` (gitignored); regenerates lazily only when `resume->updated_at` is newer than the file mtime. Deleted in the `Resume` `deleting` observer. On generation failure, returns a GD-tinted placeholder (resume `accent_color`) so the UI never breaks. **Production requires Imagick PHP extension + Ghostscript binary.**

**Font sizes:** `font_sizes` is a nullable JSON column. `DEFAULT_FONT_SIZES` constant defined at module scope in `Edit.tsx`. Sliders save on blur, triggering `pdfSrc` refresh.

**DOCX export:** `GET /builder/{resume}/docx` streams a Word document via `DocxGenerator` (phpoffice/phpword). Gated to Starter+ via `UserLimits::canDocx()` — free users get a `featureGate` redirect.

## Resume Variants & Master Resume Pattern

**A/B testing:** `ab_parent_id` on `resumes` tracks A/B parent; `ab_variant` (string) marks the variant letter. Both are deleted when parent is deleted.

**Snapshots:** `parent_resume_id` + `is_snapshot = true` marks a snapshot. Deleted when parent is deleted.

**Master + Tailored Copies:** Three nullable columns on `resumes`: `is_master` (bool, default false), `master_resume_id` (FK→resumes, nullOnDelete), `master_synced_at` (timestamp). Any resume can be a master — no DB-level uniqueness. Tailored copies point to their master; stale detection compares `master.updated_at > copy.master_synced_at`.

Routes (auth + policy-gated):
- `PATCH /builder/{resume}/set-master` (`builder.set-master`) — toggle `is_master`
- `POST /builder/{resume}/create-tailored-copy` (`builder.create-tailored-copy`) — replicate resume + set `master_resume_id`
- `PATCH /builder/{resume}/sync-master` (`builder.sync-master`) — dismiss stale banner
- `POST /builder/{resume}/pull-from-master` (`builder.pull-from-master`) — sync all content

Dashboard shows violet "Master" badge and amber "⚠ Master updated" stale badge. Editor shows dismissible amber banner with "Pull from master" / "View master" / "Dismiss" actions.

## Share Links & Public View

`ResumeShareLink` stores a 48-char random token (auto-generated in `booted()`). The public route `/r/{token}` is unauthenticated and renders `ResumeBuilder/PublicView.tsx` via `PublicLayout`. `GET /r/{token}/pdf` serves a public PDF download. Expired or disabled links render `ResumeBuilder/LinkExpired.tsx`.

Routes:
- `PATCH /builder/{resume}/share/{link}` — update (e.g. toggle active)
- `DELETE /builder/{resume}/share/{link}` — delete
- `GET /builder/{resume}/share-url` — auto-create active link + return JSON with URL

`PublicView.tsx` shows a sticky conversion header and fixed footer CTA ("Made with Resumegen · Build yours free →") to unauthenticated visitors only — hidden when `auth.user` is present. Share button opens a popover with read-only URL, copy button, LinkedIn share link, and X (Twitter) share link. The URL is fetched from `GET /builder/{resume}/share-url` on first click.

## Threads & Messaging

`ResumeThread` belongs to a resume and (optionally) a share link; `ResumeThreadMessage` belongs to a thread. `is_owner` boolean on messages distinguishes owner replies from visitor messages. `is_read` boolean on `ResumeThread` tracks unread state.

**Public routes** (unauthenticated):
- `POST /r/{token}/threads` — start a thread (visitor) — `throttle:5,1`
- `POST /r/{token}/threads/{thread}/messages` — add message to thread (visitor) — `throttle:5,1`

Visitor session tracks owned thread IDs in `owned_threads` session key. Fires `NewThreadStarted` / `NewVisitorReply` mailables to resume owner.

**Owner routes** (auth + ownership-gated):
- `GET /builder/{resume}/threads/{thread}` (`builder.thread`) — show thread
- `POST /builder/{resume}/threads/{thread}/reply` (`builder.thread.reply`) — add owner message (fires `VisitorThreadReply` mailable)
- `PATCH /builder/{resume}/threads/{thread}/read` (`builder.thread.read`) — mark read
- `DELETE /builder/{resume}/threads/{thread}` (`builder.thread.destroy`) — delete

**Messages inbox:** `GET /messages` → `MessagesController@index` → `Messages/Index.tsx` lists all threads across all resumes with unread badge. `PATCH /messages/read-all` marks all read.

## Analytics & Heatmaps

**Share Events:** `ResumeShareEvent` (append-only, no `updated_at`) logs `page_view`, `pdf_download`, `question_submitted`. Logging is best-effort (try/catch) so it never crashes. `AnalyticsController` aggregates stats; unique visitor count uses `COUNT(DISTINCT ip_hash || DATE(created_at))`.

**Section Heatmaps:** `resume_section_events` (append-only) tracks visitor dwell time per section. Columns: `resume_id` FK cascade, `section` (string), `dwell_ms` (clamped to 120000), `ip_hash` (SHA-256 of visitor IP).

Routes:
- `POST /r/{token}/section-events` (`public.section-events`) — unauthenticated, `throttle:30,1`. Accepts `{ sections: [{ section, dwell_ms }] }` (max 20). Section regex: `^(summary|experience|education|skills|certifications|custom_[a-z0-9_]+)$`.
- `GET /builder/{resume}/heatmap` (`builder.heatmap`) — auth + ownership. Optional `?period=7d|30d|all` (default 30d). Aggregates view count and average dwell per section.

`PublicView.tsx` contains `useSectionHeatmap(token)` hook that attaches `IntersectionObserver` (threshold 0.25) to `[data-section]` elements, accumulates dwell time, fires `navigator.sendBeacon` on `beforeunload` (skipped if < 500ms total page time). `ResumeBuilder/Heatmap.tsx` renders a pure-CSS bar chart with period selector and total views.

## Beacon Save

`POST /builder/{resume}/beacon` accepts raw JSON from `navigator.sendBeacon` call in `Edit.tsx`. The `_token` field in the JSON body satisfies CSRF verification (Laravel reads it from the request body regardless of content-type). Root template includes `<meta name="csrf-token">` for this purpose.

## Cover Letters & Job Applications

**Cover letters:** Full CRUD at `/cover-letters` → `CoverLetterController`. Letters have `template_key`, `name`, `body` (raw text), optional `resume_id` FK. Created from pre-built templates via `App\Data\CoverLetterTemplates`.

**Job applications:** Full CRUD at `/jobs` → `JobApplicationController`. Columns: `company`, `role`, `status` (enum via `JobApplication::STATUSES`), `resume_id`, `applied_at`, `notes`, `job_url`. Policy-gated on ownership.

## Reference Data & Autocomplete

Three seeded lookup tables: `job_roles` / `job_titles` (single `title` column each), `job_skills` (unique on `category`, `name` — 828 skills across 27 categories). Seed with `php artisan db:seed --class=JobRolesSeeder` / `JobTitlesSeeder` / `JobSkillsSeeder` (idempotent).

**Autocomplete** (`AutocompleteController`, auth-gated):
- `GET /autocomplete/job-roles` / `GET /autocomplete/job-titles` — `?q=` prefix search (min 2 chars), fallback to substring, returns up to 10 results
- `POST /autocomplete/job-roles` / `POST /autocomplete/job-titles` — `firstOrCreate` a title-cased entry

**Admin management** (`Admin\AdminJobTitleController`, master-admin gated): Tabbed CRUD (roles/titles), searchable, 50/page paginated, single-row + bulk delete. All writes title-case the input.

## Onboarding

New users redirect to `/onboarding` after registration. `OnboardingController` handles:
- `GET /onboarding` — renders two-step wizard (career context, then contact info)
- `POST /onboarding` — saves persona (`target_role`, `industry`, `years_experience`) + profile JSON, sets `has_completed_onboarding = true`
- `PATCH /user/onboarding` — legacy endpoint; flips `has_completed_onboarding`

Saved persona fields are exposed as `userPersona` props on dashboard + editor. Editor's template picker defaults new resume name to `"{target_role} Resume"` when set.

## Career Hub

Public resource library at `/career` for SEO (no auth required). `CareerArticle` model with `CATEGORIES` const, auto-generated `slug`, computed `reading_time_minutes` (word_count / 200), auto-set `published_at` when `is_published` flips to true.

Routes:
- `GET /career` → `CareerHub/Index.tsx` (published articles, client-side category filter)
- `GET /career/{slug}` → `CareerHub/Show.tsx` (404 on unpublished)

Both use `PublicLayout`. Show renders `body` as `dangerouslySetInnerHTML` with CTA footer linking to `/register`. A "Career" link is added to `Welcome.tsx` public nav.

## Public Portfolio

Personal micro-site at `/p/{slug}` combining identity landing page + resume hub. Users claim a custom vanity slug via `PATCH /user/portfolio` (`portfolio.update`). Live as soon as slug is set.

**Columns on `users`:** `portfolio_slug` (string, unique, nullable, 3–30 chars `[a-z0-9-]`), `portfolio_headline`, `portfolio_bio`, `portfolio_links` (JSON array of `{ platform, url }`), `portfolio_is_public` (bool).

**`portfolio_messages` table:** append-only. Columns: `user_id` FK cascade, `sender_name`, `sender_email`, `message`, `read_at` nullable.

Routes:
- `GET /p/{slug}` (`portfolio.show`) — public, unauthenticated
- `POST /p/{slug}/contact` (`portfolio.contact`) — public, `throttle:5,1`
- `GET /portfolio/check-slug` (`portfolio.check-slug`) — auth required, `throttle:10,1`
- `PATCH /user/portfolio` (`portfolio.update`) — auth required

**Reserved slugs** (brand protection): `admin, api, builder, career, jobs, cover-letters, billing, profile, onboarding, register, login, logout, p, r, password, dashboard, usage, webhooks, settings`.

`Portfolio/Show.tsx` renders hero with `InitialsAvatar`, headline, bio, social pills, resume grid, contact form. Guest CTA fixed top-right (hidden when `auth.user` present). `Settings/Portfolio.tsx` has debounced slug availability check + social link inputs. `NewPortfolioMessageMail` queued when contact form submitted.

## AI (OpenAI)

**Config:** `openai-php/laravel` reads `OPENAI_API_KEY` from env. `config/ai.php` holds default model (`env('OPENAI_MODEL', 'gpt-4o-mini')`), per-tier `monthly_limits`, and per-model `pricing` (cents per 1k tokens).

**Service:** `App\Services\AiService::chat(string $prompt, array $options)` injects OpenAI `ClientContract`, sends single-prompt chat completion, logs to `ai_requests` (user_id, feature, model, token counts, estimated_cost_cents, status), returns reply text. On failure logs an `error` row then rethrows. `$options` accepts `model`, `user`, `feature`.

**Moderation:** Pre-check flags disallowed input (logs a `flagged` row storing offending text in `ai_requests.flagged_text`, throws `ModerationException`).

**Routes with AI:**
- `POST /api/resumes/{id}/ai-suggest` — throttled 10/min, suggests improvements
- `POST /builder/{resume}/ats-score` — analyzes resume against target JD, gated to Starter+
- `POST /builder/{resume}/ats-keywords` — extracts ATS keywords, gated to Starter+
- `GET /builder/{resume}/strength-score` — scores resume quality, returns top tip + nudge

All consume AI quota tracked via `ai_usage` aggregation. Exhausted quota shows "Out of AI credits — Upgrade →" button.

**Admin AI dashboard** (`/admin/ai`, master-admin gated): Overview (KPIs + CSS/SVG charts + 7d/30d/all period selector + OpenAI cost reconciliation via `OpenAiUsageService`), per-user usage table, per-user detail with controls (reset quota via `ai_usage_reset_at`, set `ai_limit_override`, toggle `ai_blocked`), flagged-content review queue. `AiUsageReport` centralizes aggregate queries. `UserLimits` honors per-user override/block/reset columns. Flagged text pruned after 90 days by `ai:prune-flagged` (scheduled daily).

## Admin Panel

Routes under `/admin` guarded by `auth` + `master_admin` middleware (`EnsureMasterAdmin` — 403 if `User::is_master_admin` false). `is_master_admin` is non-editable; set directly in DB or via seeder. Owner account `rmethodm@outlook.com` is granted `is_master_admin` via migration for full access.

### User management
- `GET /admin/users` — paginated list with subscription status + resume count
- `PATCH /admin/users/{user}/toggle-pro` — flip `is_pro` (not for master admins)
- `DELETE /admin/users/{user}` — delete user + cancel Stripe subscription (not for master admins or self)

### Career articles
Full CRUD: `GET /admin/career`, `GET /admin/career/create`, `GET|PUT|DELETE /admin/career/{career}/edit`. Routes: `admin.career.{index,create,store,edit,update,destroy}`.

### Growth analytics
`GET /admin/growth` (`admin.growth.index`) backed by `App\Services\GrowthReport`: signups series, funnel (Signed up → Activated → Paying), conversion rates, avg days to convert, referral stats. `GrowthReport::retentionCohorts($weeks=6)` builds cohort matrix from `user_activity_days` (one row per user per active day, stamped by `TrackActivity` middleware, session-gated to one per day). Page reuses `Admin/Ai/Charts.tsx` with period selector.

### Revenue reporting
`GET /admin/revenue` (`admin.revenue.index`) from `App\Services\RevenueReport`: tier counts (zero-filled), MRR estimate, active subscriptions, new subscription series (90d cap), recent subscriptions. `liveActiveSubscriptions()` is optional fail-soft Stripe reconcile (cached 1h, null when empty secret). Page reuses `Admin/Ai/Charts.tsx`.

**MRR snapshots:** `revenue_snapshots` (one row/day, `captured_on` unique) stores `mrr_cents`, `paying_users`, `free_users`, `active_subscriptions`, `tier_counts` (json). Written by `revenue:snapshot` command (idempotent `updateOrCreate` on `today()`) scheduled daily at 23:55.

**Tier prices in `config/services.php`:** `stripe.tier_prices` (env `PRICE_{STARTER,PRO,AGENCY}_CENTS`, defaults 900/1900/4900). True historical MRR time-series out of scope.

### Content moderation
`GET /admin/content` (`admin.content.index`) — tabbed (resumes/cover-letters/jobs/portfolios), searchable, 25/page, per-type counts. `GET /admin/content/resumes/{resume}` read-only view. Destructive actions (all audited): `DELETE` resume/cover-letter/job, `PATCH content/share-links/{shareLink}/disable` (set `is_active=false`), `PATCH content/users/{user}/unpublish-portfolio` (set `portfolio_is_public=false`).

### Audit log
`admin_audit_logs` (append-only, `created_at` only) records privileged actions: `admin_user_id`, `action` (dot-namespaced), `target_type`/`target_id` (nullable morph), `description`, `meta` (json), `ip_address`. Use static `AdminAuditLog::record(string $action, ?Model $target, string $description, array $meta = [])` — reads `auth()->id()` + `request()->ip()`, swallows exceptions. Already wired into user/AI admin actions. **When adding privileged admin write actions, call `AdminAuditLog::record()` on success path.**

View at `GET /admin/audit` — paginated feed filterable by `?action=` and `?admin=`.

### Ops dashboard
`GET /admin/ops` (`admin.ops.index`) — surfaces queue depth, failed-jobs table, scheduled-task inventory, config-health checks (queue/mail driver, Stripe + webhook secrets, OpenAI key). Actions: retry or forget failed jobs (audited). Webhook/mail delivery history intentionally not shown; dashboard reports config status only.

## Referral Rewards

`ReferralRewardService::grantIfEligible(User $upgradedUser)` completes referral loop. Guards: null `referred_by_user_id` → skip; existing `upgrade` `ReferralEvent` → skip (idempotency via `DB::transaction` + `lockForUpdate()`). Creates `ReferralEvent`, increments `referral_rewards_earned`, logs success. Then tries Stripe: if referrer has active `'default'` subscription, extends it 1 month; otherwise creates customer balance credit of -900 cents. Stripe calls wrapped in try/catch with `Log::warning` on failure — DB writes NOT wrapped. Wired in `AppServiceProvider` Subscription observer after plan_tier sync, gated on `['starter', 'pro']` tiers.

## API Layer

Token-based API (Sanctum) at `/api` prefix alongside Inertia web layer. Auth uses personal access tokens — **not** session cookies.

**Config:** `config/sanctum.php` sets `'guard' => []` (intentionally empty) to prevent web session fallback — only token-auth works for API.

**Test base class:** All API test files extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). `ApiTestCase` calls `$this->app['auth']->forgetGuards()` before each request to prevent Sanctum guard cache from masking token revocation.

### Auth endpoints (no `auth:sanctum` required)
- `POST /api/auth/login` — returns `{ token }` — `throttle:10,1`
- `GET /api/auth/me` — returns authenticated user
- `POST /api/auth/logout` — revokes current token

### Resume endpoints (all require `Authorization: Bearer {token}`)
- `GET|POST /api/resumes` — index / store
- `GET|PUT|DELETE /api/resumes/{id}` — show / update / destroy
- `POST /api/resumes/{id}/duplicate`
- `POST /api/resumes/{id}/ai-suggest` — `throttle:10,1`
- `GET /api/resumes/{id}/ats-score` — `throttle:10,1`

### Cover letter endpoints (all require `Authorization: Bearer {token}`)
- `GET|POST /api/cover-letters` — index (no body) / store (renders body from template)
- `GET|PUT|DELETE /api/cover-letters/{id}` — show (includes body) / update / destroy

### Job application endpoints (all require `Authorization: Bearer {token}`)
- `GET|POST /api/jobs` — index (eager-loads `resume:id,name`) / store
- `GET|PUT|DELETE /api/jobs/{id}` — show / update / destroy

## Rate Limiting

- API login: `throttle:10,1`
- Public thread form: `throttle:5,1`
- Section events: `throttle:30,1`
- Portfolio contact form: `throttle:5,1`
- Portfolio slug check: `throttle:10,1`
- AI suggest: `throttle:10,1`
- ATS score: `throttle:10,1`
- **Registration IP velocity:** Max 5 accounts per IP per 24h. Enforced in `RegisteredUserController::store()` via `registration_ip` column on `users`. Throws a validation error on the 6th attempt.

## System Events & Delivery Logging

`system_events` (append-only, `created_at` only — model uses `public const UPDATED_AT = null`). Columns: `channel` (`mail`|`stripe_webhook`), `type` (mail subject or Stripe event type), `status`, `recipient`, `meta` (json). Written by best-effort `SystemEvent::record(...)` from two `Event::listen` closures in `AppServiceProvider::boot()` — `MessageSent` (outbound mail) and Cashier's `WebhookReceived` (inbound Stripe). Both swallow their own exceptions so logging never breaks sends/webhooks. Pruned after 30 days by `system-events:prune` (scheduled daily). Surfaced as "Recent deliveries" section on Ops dashboard — no separate route.

## Development Guidelines

### Code style
- **PHP:** Always use curly braces for control structures, even single-line. Use constructor property promotion (`public function __construct(public Foo $foo) { }`). Explicit return types + type hints on all methods. TitleCase for Enum keys. Prefer PHPDoc blocks over inline comments; only inline comment for exceptionally complex logic.
- **Frontend:** Use Ziggy `route()` helper, never hardcode URLs. Prefer existing components before writing new ones. Check sibling files for conventions.

### Testing
- Every change must be programmatically tested. Write new test or update existing one, then run affected tests.
- Use `php artisan test --filter=testName` to run minimal tests needed.
- Most tests should be feature tests (integration-level), not unit tests.
- If you see Pest syntax, convert to PHPUnit.

### Formatting
- Run `./vendor/bin/pint` (or `./vendor/bin/pint --dirty --format agent`) before finalizing PHP changes to match project style.
- Always rebuild frontend with `npm run build` when not running `npm run dev`.

### Documentation
- Create documentation files only if explicitly requested.
- Be concise — focus on what's important, not obvious details.

### Skills & Tools
- Activate domain-specific skills (e.g., `inertia-react-development`, `laravel-best-practices`) when working in those areas.
- Use Laravel Boost tools (`database-query`, `database-schema`, `search-docs`) over manual alternatives.
- Always `search-docs` before making code changes — returns version-specific docs for installed packages.

### Deployment
- Laravel can be deployed via [Laravel Cloud](https://cloud.laravel.com/).
- Production requires Imagick PHP extension + Ghostscript binary for resume thumbnails.

## Key Design Decisions

1. **Single `resumes` table with JSON columns** — frontend owns shape; backend validates as array. Simpler than separate section tables.
2. **No template React components** — server renders PDF; iframe preview loads it. Keeps frontend simple, avoids duplication.
3. **Beacon save on beforeunload** — catches unsaved changes when navigating away.
4. **Master resume pattern** — allows coaches/recruiters to maintain one resume and create tailored copies for different job applications.
5. **Append-only analytics tables** — `ResumeShareEvent`, `resume_section_events`, `system_events`, `portfolio_messages`, `admin_audit_logs`. Simple, immutable, no update logic.
6. **Model-level cascade delete** — fires on dependent models even on SQLite (FK-level cascade doesn't work).
7. **Freemium 4-tier model** — tight free tier pushes conversions; Starter/Pro/Agency tiers target individual/team/enterprise. AI quota as key differentiator.
8. **Best-effort system logging** — never crashes requests; `try/catch` swallows exceptions so logging is always opt-out.

---

Last updated: 2026-06-16 (email verification enforced, IP velocity check, AI cost/MRR monitoring)

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
