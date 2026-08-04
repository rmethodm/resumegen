# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

These rules apply to every task in this project unless explicitly overridden.
Bias: caution over speed on non-trivial work.

## Rule 1 — Think Before Coding
State assumptions explicitly. Ask rather than guess.
Push back when a simpler approach exists. Stop when confused.
If something is unclear, ask before writing a single line. Never 
make silent assumptions about intent, architecture, or requirements.

## Rule 2 — Simplicity First
Minimum code that solves the problem. Nothing speculative.
No abstractions for single-use code. Simplest solution first. 
Always implement the simplest thing that could work. Do not 
add abstractions or flexibility that weren't explicitly requested.

## Rule 3 — Surgical Changes
Touch only what you must. Don't improve adjacent code.
Match existing style. Don't refactor what isn't broken.
Don't touch unrelated code. If a file or function is 
not directly part of the current task, do not modify it, 
even if you think it could be improved.

## Rule 4 — Goal-Driven Execution
Define success criteria. Loop until verified.
Strong success criteria let Claude loop independently.
Flag uncertainty explicitly. If you are not confident 
about an approach or technical detail, say so before 
proceeding. Confidence without certainty causes more 
damage than admitting a gap.

## Rule 5 — Use the model only for judgment calls
Use for: classification, drafting, summarization, extraction.
Do NOT use for: routing, retries, deterministic transforms.
If code can answer, code answers.

## Rule 6 — Token budgets are not advisory
Per-task: 4,000 tokens. Per-session: 30,000 tokens.
Budgets are soft targets, not hard stops — cutting off mid-task leaves things broken.
At ~80% of a budget, surface it once and ask whether to finish the current step then summarize, or continue.
Do not silently overrun.

## Rule 7 — Surface conflicts, don't average them
If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.

## Rule 8 — Read before you write
Before adding code, read exports, immediate callers, shared utilities.
If unsure why existing code is structured a certain way, ask.

## Rule 9 — Tests verify intent, not just behavior
Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

## Rule 10 — Checkpoint after every significant step
Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.

## Rule 11 — Match the codebase's conventions, even if you disagree
Conformance > taste inside the codebase.
If you think a convention is harmful, surface it. Don't fork silently.

## Rule 12 — Fail loud
"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.

## Stack

- **Backend:** Laravel 13, PHP 8.5, PostgreSQL (`DB_CONNECTION=pgsql`; tests run on in-memory SQLite), Inertia.js v3
- **Frontend:** React 19, TypeScript, Tailwind CSS v3, Vite 8
- **Auth:** Laravel Fortify (session-based), Sanctum (API tokens) — swapped from Breeze on 2026-08-02. `app/Providers/FortifyServiceProvider.php` and `config/fortify.php` are the relevant files. `User` implements `MustVerifyEmail` — new registrations must verify before accessing the app. The `verified` middleware gates all main routes (`web.php` line 63). Resumegen's custom 2FA system (`TwoFactorController`, `TwoFactorChallengeController`, etc.) is separate from and unrelated to Fortify's own optional two-factor feature, which stays disabled — do not enable `Features::twoFactorAuthentication()` without asking first. Disabled accounts (`users.disabled_at`) are rejected at Fortify login and by `EnsureUserNotDisabled` on web requests.
- **Support admin:** Domain-only Inertia UI at `config('app.admin_domain')` / `APP_ADMIN_DOMAIN` (local: `admin.resumegen.test`). Gate: host + `users.is_admin` (not fillable — promote via tinker). Controllers under `App\Http\Controllers\Admin\`, routes in `routes/admin.php` (domain scoping wired in `bootstrap/app.php`; `LoginResponse` keeps admins on the admin host after auth). Every privileged write is recorded in `admin_action_logs`. Production host + DNS/TLS setup: `docs/DEPLOYMENT.md`.
- **PDF:** `barryvdh/laravel-dompdf` — server-side generation. Routes: `GET /builder/{resume}/pdf` (download), `GET /builder/{resume}/preview` (inline stream for iframe preview)
- **Media:** none in use. The resume photo feature was removed; `Resume` no longer implements `HasMedia` and nothing in `app/` uses `spatie/laravel-medialibrary`, though the package is still in `composer.json` — which is why Boost keeps generating a `medialibrary-development` skill and a Media Library rules block. Neither implies the feature exists.
- **AI:** none — removed 2026-07-21. No OpenAI, no Anthropic, no `config/ai.php`, no `ai_requests`. Every remaining feature is deterministic server-side code.
- **Billing:** none — see "Billing — there is none" below. No Cashier, no Stripe, no pricing instrumentation.
- **Admin:** the support admin above is the *only* admin surface. Filament/Livewire and impersonation were removed 2026-07-21 and are not coming back without asking. Nothing edits the taxonomy tables — that is still database-or-seeder only.
- **Routing (frontend):** Ziggy v2 (`route()` helper globally available via `resources/js/types/global.d.ts`)

**Conventions** (moved here from global instructions 2026-07-20 — they only apply to this stack):

- **Postgres:** prefer `jsonb` over `json`; add indexes explicitly in migrations; run `EXPLAIN ANALYZE` before assuming a slow query is fixed. Tests run on SQLite, so avoid SQLite-incompatible raw SQL or the suite passes on something production never executes.
- **React/TypeScript:** no `any` — use `unknown` + narrowing. Co-locate component-specific types. Prefer server state (Inertia props) over client-side caches unless there is a real need for local-only state.

## Commands

```bash
# First-time setup
composer run setup

# Full dev server (Laravel + queue + Pail log viewer + Vite HMR)
composer run dev

# Production build (runs tsc then vite build)
npm run build

# All tests
composer run test

# Single test file or filter
php artisan test tests/Feature/Auth/AuthenticationTest.php
php artisan test --filter=test_name

# Browser tests (Dusk) — needs its own server running first, in a second terminal
php artisan serve --env=dusk.local --port=8001 --no-reload
php artisan dusk

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
**Rewritten 2026-08-02, imported from a sibling project (`Resumo`) and adapted.** Resume content is **relational**, not JSON-column: a `resumes` row (title, target_role, contact fields, template/font/density/skills_layout, `section_order` json) has one-to-many `experiences`, `projects`, `education`, `certificates`, `skills` tables (each with a `position` int for ordering; `bullets`/`highlights` stay `json` on their own row since they're owned entirely by one parent and never queried standalone). `App\Support\ResumeDocument` is the single place that knows this shape — `toArray()` reads it for the frontend/PDF, `save()` writes the whole document transactionally (deletes + recreates the child rows) on every autosave. `ResumeGroup` holds versions of the same resume (`resumes.group_id`); `ResumeSnapshot` and `ResumeNote` (canvas sticky notes — backend only, no UI yet) and `StarterProfile` (the one-time reusable seed a new resume is pre-filled from) round out the model. `LibrarySkill` is a seeded flat catalogue (`LibrarySkillSeeder`), not yet wired into any UI.

Explicitly **not** ported from Resumo: public resume sharing/publication via `is_public`/`public_slug`, the `ProfileMessage` recruiter-inbox feature, Cover Letters, and AI-driven resume import (`ParseResume`, `ResumeImportController`) — all excluded per the removed-feature policy below. `Resume::$import_state` exists on the model (harmless, always `'ready'`) but nothing sets it to anything else. (Public sharing itself came back on 2026-08-02/03 as a separate, token-based `ResumeShareLink` feature with its own password gate — see "Share links" under "Frontend page structure" below; it's unrelated to the `is_public`/`public_slug` columns that stayed dead.)

**Cascade delete:** `experiences`/`projects`/`education`/`certificates`/`skills`/`resume_notes`/`resume_snapshots` are removed by `cascadeOnDelete` FKs on `resume_id`. `User` deletes its `resumes()` per-model (not relying on the FK cascade) so any future model-event-driven cleanup still fires.

**StarterProfile NOT NULL columns vs. nullable validation (fixed 2026-08-04):** `starter_profiles`' scalar columns are `NOT NULL DEFAULT ''` — a blank field is stored as `''`, never `null`. The update request marks those same fields nullable (a blank profile is legitimate), and Laravel's `ConvertEmptyStringsToNull` middleware turns a blank form input into `null` before validation runs. Left alone, that `null` hits the `NOT NULL` column and the whole `updateOrCreate` throws, silently discarding the save. `StarterProfileController::update()` now does `$data[$field] ??= ''` over the scalar fields before writing. If another nullable-but-NOT-NULL column shows up on this model, apply the same coalesce rather than loosening the migration.

### Authorization
`ResumePolicy` gates all resume mutations on `$user->id === $resume->user_id`. The base `Controller` uses `AuthorizesRequests` so `$this->authorize()` is available everywhere. Most of the imported `ResumeController`/`ResumeGroupController`/`ResumeNoteController` methods use inline `abort_unless($resume->user_id === ...)` (matching Resumo's own convention) rather than the policy — both patterns coexist, don't consolidate without checking call sites.

### Frontend page structure (post-2026-08-02 import)
`Pages/Resumes/Workstation.tsx` is the editor: a section-rail (`SectionPanel`) + stacked per-section forms (`inspector.tsx`/`inspector-sections.tsx`/`inspector-fields.tsx`), autosaved via `useAutosave` (debounced `router.put`, no beforeunload beacon). There is **no live preview panel in the editor** — `Components/resume/resume-preview.tsx` (the React equivalent of the PDF template renderer, all 24 templates) is ported and correct but currently unused by any page; PDF download (`GET /resumes/{resume}/export`) is the only way to see the rendered document today. `Pages/Resumes/Compare.tsx` diffs two versions side by side. `Pages/Dashboard.tsx` lists resume groups with score, version tray, and the usual rename/duplicate/delete/compare actions.

The imported UI runs on Resumegen's existing Headless UI + Heroicons + Tailwind v3 stack, not shadcn/Radix — Resumo's original pages use shadcn/ui on Tailwind v4, so every component under `Components/ui/`, `Components/workstation/`, and `Components/resume/` was rebuilt (not copied) to match.

**Share links (added 2026-08-02/03, rebuilt from scratch — not the pre-reset feature the paragraph above used to describe).** `ResumeShareLink` (`resume_share_links`) is a token-authenticated public link, one per resume (`Resume::shareLink(): HasOne`), managed from `share-resume-modal.tsx` on the Workstation header. `ResumeShareLinkController` (`store`/`update`/`destroy`, all owner-only via inline `abort_unless`) and `PublicResumeShareController` (`show`/`unlock`/`pdf`/`docx`, unauthenticated, token-in-URL is the credential) are the two controllers. Optional gates: `require_email` (visitor's email is logged to `resume_share_link_views`, cascade-deleted with the link) and `require_password` (an owner-editable password ≤8 chars, auto-generated on enable, stored with Laravel's `encrypted` cast — not hashed, since the owner needs to see/re-edit it). `allow_download` gates both `GET /r/{token}/pdf` and `GET /r/{token}/docx` (the latter reuses `App\Support\DocxExport`). `expires_at` (nullable, owner sets Month/Day/Year in the modal) makes `ResumeShareLink::isExpired()` redirect the public `show()` page to `/` and 404 the download routes. Deleting the link ("Cancel share" in the modal) removes it and its views immediately — no soft delete. There is no view-count/analytics dashboard on top of this (that's the *separate*, still-dead `ResumeShareEvent`/`resume_section_events` history below), and no `/shares` index page — the only UI is the one modal.

**Password gate implementation notes (post code-review, 2026-08-03):** the compare in `PublicResumeShareController::unlock()` uses `hash_equals()`, not `===` — the password is short and fixed-length, so a naive compare is a real timing side-channel. The session "unlocked" flag is keyed on `sha1($link->password)`, not just the token, specifically so that editing the password in the modal invalidates every session that unlocked under the old one — without that, "rotate the password to cut someone off" silently wouldn't work. Don't simplify either of these back to the obvious-looking version.

### Shared Inertia props
`HandleInertiaRequests::share()` passes `auth.user` and `flash.{success,error}` — nothing else. There is no `featureGate` (see "Billing"), no `aiEnabled` and no `impersonating`; the last two went with AI and the admin panel on 2026-07-21.

## Billing — there is none

**The app is free and unlimited.** Billing was removed on 2026-07-14: Cashier is uninstalled, there are no plan tiers, no Stripe, no payments, no `UpgradeModal`, no `featureGate`. Do not add a paywall, a tier check, or an upgrade CTA without asking first.

**Laravel Boost's context block used to lie about this** — it listed `laravel/cashier (CASHIER) - v16` (and Filament, Livewire, Breeze) long after they were uninstalled. Boost was re-run on 2026-08-04 and the block is now accurate. If a stale package list resurfaces, verify against `composer.json` and `vendor/`, not that header. The `cashier-stripe-development` skill and the two `mcp__plugin_stripe_stripe__*` permissions were deleted on 2026-07-19; the skill directory came back with a stale Boost install and was removed again on 2026-08-04.
Gone with it: `plan_tier` / `is_pro` / `stripe_id` columns, the `subscriptions` tables, `BillingController`, the admin Revenue dashboards (`RevenuePage`, `RevenueReport`, `RevenueSnapshot`, `CaptureRevenueSnapshot`), and forced 2FA (which was gated on the pro tier — 2FA is now opt-in only).

**Nothing is metered.** `App\Services\UserLimits` survives but now holds only `allTemplates()` — the template allowlist. Every limit it used to enforce (resumes, cover letters, custom sections, templates, DOCX, share-link views, PDF watermark, AI calls) is gone and unlimited. Several tests assert `assertSessionMissing('featureGate')` specifically to catch a paywall creeping back in; if one starts failing, that is the alarm working.

**The prepaid pricing work was abandoned on 2026-07-21.** The proposal docs (`docs/prepaid-pricing-model.md`, `docs/growth-model-sample-run.md`) and all of its instrumentation (`JobPairing`, `BalanceTransaction`, `JobPairingService`, `config/pricing.php`, `pricing:usage`, `pricing:growth`, `GrowthSampleSeeder`, the `job_pairings` and `balance_transactions` tables) were deleted along with AI. There is no pricing model, no growth model and no live pricing document. Do not resurrect any of it, and do not treat `docs/resume-builder-competitive-analysis.md` §3 as live guidance — it is historical.

**`PRICING_REVIEW.md` and `docs/claude/pricing-and-billing.md` were deleted on 2026-07-20** (recoverable in git history). Both still documented Free/Starter/Pro/Agency at $9/$19/$49, referencing `User::planTier()`, `is_pro`, `plan_tier`, `BillingController`, `Billing/Index.tsx`, `UpgradeModal` and `featureGate` — every one of which is gone. `PRICING_REVIEW.md` additionally *recommended re-gating templates and DOCX export to paid*. They read as authoritative and were the most likely route to an accidental paywall. If either resurfaces from a stash or an old branch, delete it again rather than updating it.

**Registration IP velocity:** Max 5 accounts per IP per 24h. Enforced in `RegisteredUserController::store()` via `registration_ip` column on `users`.

## API Layer

Token-based Sanctum API at `/api`. `config/sanctum.php` sets `'guard' => []` (intentionally empty) — only token-auth works, no session fallback.

**Test base class:** All API tests extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). It calls `$this->app['auth']->forgetGuards()` before each request to prevent Sanctum guard cache from masking token revocation.

## Removed Features (do not reintroduce without asking)

Deleted on 2026-07-14 — code, routes, models, migrations, and tests:

- **Resignation letters, proofreading, career coach chat, outbound user webhooks.** Their tables (`resignation_letters`, `proofreading_requests`, `career_coach_messages`, `webhook_endpoints`) may linger as orphans in databases that ran the old migrations — the create-migrations were deleted rather than superseded by a drop, so a fresh `migrate` will not recreate them.
- **Resume translation and career map** — the two most expensive AI features per unit of value. Deleted outright (routes, prompts, controllers, tests), not flagged off.
- **All billing** (see above). Here the create-migrations were kept and a drop migration (`2026_07_14_120000_drop_billing_tables_and_columns`) removes the tables and columns, so both fresh and existing databases converge.
- **Referral rewards** — `ReferralRewardService` / `ReferralEvent` were already gone before this; the reward was a Stripe credit and has no meaning now.
- **Job applications tracker** (removed in `93c1c14`). `application_contacts` and `interview_notes` are dropped by migration. **`job_applications` is deliberately still live** — `AnalyticsController` queries it via `DB::table()` for the dashboard's `active_applications` count. Do not drop that table without rewriting that query first.

Deleted on 2026-07-21 — code, routes, models, migrations, config and tests:

- **All AI.** `AiService`, `AiPrompts`, `AiRequest`, `AiUsageReport`, `OpenAiUsageService`, `ModerationException`, `AiDisabledException`, `EnsureAiEnabled` + the `ai_enabled` alias, `AiSuggestionController`, `InterviewCoachController`, `ResumeImportController`, `ai:cost-alert`, `ai:prune-flagged`, `config/ai.php`, `config/openai.php`, the `openai-php/laravel` package, the Filament `AiOverviewPage` / `AiUsersPage`, the `aiEnabled` Inertia prop, `users.ai_limit_override` / `ai_blocked` / `ai_usage_reset_at`, and the `ai_requests` table. The features that went with it: bullet rewrite, bullet coach, summary generation, ATS keywords, interview coach, cover-letter AI draft, and resume PDF/LinkedIn import. Frontend: `useAiSuggestion`, `AtsMatchPanel`, `JdMatcher` (+ its test), `PdfImportModal`, `plainText.ts`.
- **All pricing instrumentation** (see "Billing"). `JobPairing`, `BalanceTransaction`, `JobPairingService`, `config/pricing.php`, `pricing:usage`, `pricing:growth`, `GrowthSampleSeeder`, both pricing docs, and the `job_pairings` / `balance_transactions` tables.
- **Job Search (`/jobs`).** `JobSearchService`, `app/Services/JobBoards/*`, `JobUrlImporter`, `JobSearchController`, `JobSearch` + `JobListing` models, `JobSearchPolicy`, `jobs:run-alerts`, `JobMatchesDigestMail`, `config/jobs.php`, `resources/js/Pages/Jobs/*`, the Jobs nav item and command-palette entry, and the `job_searches` / `job_listings` tables.
- **The Filament/Livewire admin surface (2026-07-21).** `AdminPanelProvider`, all of `app/Filament/**`, Livewire, impersonation, revenue/ops dashboards, `users.is_master_admin`, audit logs, etc. **Do not reinstall Filament without asking.** A thin **support admin** returned 2026-08-04 on `APP_ADMIN_DOMAIN` (`admin.resumegen.test` local): Inertia pages under `Pages/Admin/*`, `users.is_admin` + `users.disabled_at`, domain-scoped `routes/admin.php`. Support only (search users, verify email, resend verification, disable/enable login, revoke Sanctum tokens — each throttled `30,1` and written to `admin_action_logs`) — no taxonomy CMS, no resume edit, no impersonation, no billing.
- **Impersonation.** `AdminImpersonationController`, the `admin.impersonate.destroy` route, the `impersonating` shared Inertia prop and the banner in `AuthenticatedLayout.tsx`.
- **Admin audit log.** `AdminAuditLog` model + factory and the `admin_audit_logs` table. **Superseded 2026-08-04:** the support admin logs its own writes to a new, unrelated append-only `admin_action_logs` table (`AdminActionLog`, `AdminActionLog::record()`, `User::adminActionLogsAsTarget()`, no `updated_at`), surfaced as the last 25 actions on the user detail page. `Admin\UserController` also mirrors each action to the Laravel log. Do not resurrect `AdminAuditLog`.
- **System events.** `SystemEvent` model + factory, the `system_events` table, the `AppServiceProvider` `MessageSent` listener, and `system-events:prune` with its schedule entry. **Outbound mail is no longer logged anywhere.**
- **Career Hub** — deleted because the admin panel was its only editor. `CareerHubController`, `CareerArticle` model + factory, the `career_articles` table, the public `/career` and `/career/{slug}` routes, `resources/js/Pages/CareerHub/**`, the Career link on `Welcome.tsx`, and `CareerHubTest`.

`2026_07_21_101720_drop_admin_tables_and_flags` (forward-only) drops `admin_audit_logs`, `system_events`, `career_articles` and `users.is_master_admin`.

Survived that removal and must not be described as gone: the **JobRole / JobTitle / JobSkill taxonomy** with its seeders (still run by `DatabaseSeeder`), `AutocompleteController` and `SkillCategories` — only the admin CRUD over the taxonomy is gone, so **taxonomy is now seeder-managed with no UI**; **`StrengthScorePanel`** (server-side scorer, never AI); and the builder's `resumes.target_company` / `target_title` / `target_job_description` fields — the Optimize tab now holds a plain "Job description" textarea where the ATS panel used to be.

Deleted on 2026-08-02 — code, routes, models, migrations, and tests:

- **A/B resume variants.** `Resume::abParent()` / `abVariants()`, `ResumeBuilderController::createVariant()`, the `builder.create-variant` route, the A/B badge and row action in `ResumeBuilder/Index.tsx`, `variant_count` on the dashboard cards, and the `resumes.ab_parent_id` column.
- **Cover Letters.** `CoverLetterController`, `CoverLetter` model + policy + factory, `App\Data\CoverLetterTemplates`, `resources/js/Pages/CoverLetter/**`, the Cover Letters nav item and command-palette entry, and the `cover_letters` table. `SearchController`'s JSON contract dropped the `coverLetters` key — it now returns `{resumes}` only.
- **Job Search / salary hint.** `SalaryController`, `App\Data\SalaryRanges`, and the `/jobs/salary` route — this was already dead code with no frontend caller, left over from the 2026-07-21 Job Search removal.
- **Portfolio.** `PortfolioController`, `PortfolioMessage` model + mail + factory, the public `/p/{slug}` page and settings page (`resources/js/Pages/Portfolio/Show.tsx`, `resources/js/Pages/Settings/Portfolio.tsx`), the Portfolio nav item, and `users.portfolio_slug` / `portfolio_headline` / `portfolio_bio` / `portfolio_is_public` / `portfolio_links`. **The `/messages` page and `MessagesController` were deliberately kept** — despite the shared "Messages" name, that page is the `ResumeThread` share-link comment inbox, unrelated to `PortfolioMessage`.

`2026_08_02_072809_drop_variants_cover_letters_salary_and_portfolio` (forward-only) drops `resumes.ab_parent_id`, the `cover_letters` and `portfolio_messages` tables, and the five `users.portfolio_*` columns.

## Browser tests (Dusk) — two non-obvious requirements

Added 2026-07-20. `tests/Browser/` is the only layer that executes React; the feature suite asserts the props Laravel *sends* and stays green even if a page throws on mount.

**1. Dusk needs its own server, not Herd.** Herd serves `resumegen.test` using `.env`, which points at the **dev** database. Dusk's test process reads `.env.dusk.local` (database `resumegen_dusk`), so factories and the browser would look at two different databases and every test would fail on a missing user. `.env.dusk.local` therefore sets `APP_URL=http://127.0.0.1:8001`, and `php artisan serve --env=dusk.local --port=8001` must be running before `php artisan dusk`.

**2. Use `DatabaseTruncation`, never `DatabaseMigrations`.** The latter rolls back on teardown, and this project's migrations are forward-only (next section) — it dies in the first `down()` that drops an already-dropped constraint. Truncation never rolls back. The consequence: **after adding a migration, run `php artisan migrate --env=dusk.local`**, or Dusk truncates a schema that lacks the new column.

`.env.dusk.local` is a copy of `.env` and holds real credentials — `.gitignore` covers it via `.env.*`. Do not narrow that pattern.

Assert on controls (`assertMissing('input[name="…"]')`), not strings (`assertDontSee('…')`) — a "don't see" assertion passes on any error page and proves nothing.

**Check the build is current before trusting anything you see in a browser.** `public/build/manifest.json` older than `resources/js/**` means Herd is serving stale bundled JS and you are testing code that is not on the branch. `find resources/js -name '*.tsx' -newer public/build/manifest.json` answers it; `npm run build` fixes it. Dusk is unaffected only if the build is fresh — it loads the same built assets.

## Shell: this environment is zsh, which does not word-split

`set -- $var` and `cmd $var` do **not** split on whitespace the way bash does — the whole string arrives as one argument. A loop built on `for s in "a b c"; set -- $s` silently assigns garbage to `$2`/`$3` (e.g. a price of `0`), producing a clean-looking run with meaningless numbers. Use `${=var}` to force splitting, or write invocations out explicitly. Prefer explicit; a sweep that lies is worse than a sweep that is verbose.

## Migrations are forward-only — rollback is not supported

**Do not run `migrate:rollback`, `migrate:reset`, or `migrate:refresh`. Use `migrate:fresh --seed` to rebuild.**

The `drop_*` cleanup migrations (`drop_resume_strength_snapshots_table`, `drop_job_application_id_from_resumes_table`, `drop_referral_fields_from_users_table`, `drop_interview_notes_table`, `drop_agency_org_tables`, `drop_application_contacts_table`) all have an empty `down()` — deliberately, so rolling back never resurrects a removed feature's schema. The consequence is that a rollback removes a column and never restores it, so the older migration that created it then dies trying to drop a constraint that is already gone. It cascades: fix one and the next fails identically, roughly seven deep.

A rollback that fails partway leaves the database in a wrecked half-state — schema torn down to the failure point while the `migrations` table still claims those migrations ran. That state looks exactly like a corrupted or partially-restored dump, and has twice been misdiagnosed as one. If migration counts and actual schema disagree, suspect an interrupted rollback first and just run `migrate:fresh --seed`.

Making rollback work would mean editing seven already-shipped migrations to no benefit. Forward-only is the decision, not an oversight.

**This is enforced, not just documented.** `.claude/hooks/block-migrate-rollback.sh` is a `PreToolUse` hook (wired in `.claude/settings.json`) that blocks any `artisan migrate:rollback|reset|refresh` and points at `migrate:fresh --seed`. Prose here did not prevent the two misdiagnoses above, so the rule got teeth. The regex requires an `artisan` prefix, so grepping for or documenting the term still works.

**When deleting a model, grep for its class name across `database/`.** Migrations, factories, and seeders hold references the IDE and the test suite never exercise, so they stay green and only fail later at `migrate` or `migrate:fresh --seed` time. This has bitten three times: `JobApplication` (a migration `down()`, two factories) and `AiModelRate` (a seeder for a table dropped by `2026_06_10_113108_drop_dead_ai_tables`). Prefer the column name over the model — `dropConstrainedForeignId('foo_id')`, not `dropForeignIdFor(Foo::class)` — so migrations never depend on app classes that can be deleted out from under them.

## Project skills are hook-enforced, not prose-enforced

`.claude/skills/` holds seven repo-specific skills. Five are hand-maintained (`debug-using-debugbar`, `inertia-react-development`, `laravel-best-practices`, `server-deployment`, `tailwindcss-development`); `fortify-development` and `medialibrary-development` were added by Boost on 2026-08-04 and `cashier-stripe-development` was deleted in the same run. Boost mirrors its own skills into `.agents/skills/` and `.github/skills/` too — edit `.claude/skills/` and let Boost re-sync, don't hand-edit the copies. Two skills are wired to a `PreToolUse` hook — `.claude/hooks/nudge-project-skills.sh`, matched on `Edit|Write` in `.claude/settings.json`:

- editing `resources/js/**/*.tsx|jsx` → activate `inertia-react-development`
- editing `app/**/*.php` → activate `laravel-best-practices`

**Why a hook and not a sentence.** A transcript audit on 2026-07-19 counted 83 `Skill` invocations across 122 sessions: `superpowers:*` process skills accounted for ~69%, and **all five project skills had fired exactly zero times** since being added on 2026-07-07 — despite good `description:` frontmatter and despite the Boost block below explicitly saying "IMPORTANT: Activate `inertia-react-development`". Passive description-matching loses against a crowded skill listing and four SessionStart hooks. Same lesson as `block-migrate-rollback.sh` one section up: prose that has already failed once does not get a second chance, it gets teeth.

The hook **nudges, it does not block** — it emits `additionalContext` with `permissionDecision: "defer"`, so the edit is neither blocked nor auto-approved and the normal permission flow is untouched. It fires **once per skill per session** (a `/tmp` marker keyed on `session_id`); re-injecting the same sentence on all 40 edits of a page is how injected context gets tuned out.

`debug-using-debugbar`, `server-deployment`, and `tailwindcss-development` are deliberately *not* hooked — they key off intent ("this page is slow", "deploy this"), not off a file path, so there is no reliable `Edit`/`Write` trigger for them. They remain description-matched only.

Do not fix the stale "IMPORTANT: Activate…" lines inside the `<laravel-boost-guidelines>` block — Boost regenerates that block, so edits there are overwritten. The hook is what actually carries the rule.

## Key Design Decisions

1. **Relational resume schema** (since 2026-08-02) — a `resumes` row plus one-to-many `experiences`/`projects`/`education`/`certificates`/`skills` tables, not JSON columns; `App\Support\ResumeDocument` is the single place that knows the shape and round-trips it wholesale on every save. See "Resume data model" above.
2. **No template React components in the PDF path** — server renders PDF (`ResumeExport` + `resumes.export.pdf` Blade). A React preview component (`resume-preview.tsx`) exists and mirrors the same 24 templates but isn't wired into any page yet.
3. **Beacon save on beforeunload** — this predates the 2026-08-02 reset and describes the old builder; the imported resume editor uses a plain debounced `router.put` instead (see "Frontend page structure" above). May still be accurate for other forms — verify before relying on it.
4. **Append-only analytics tables — confirmed gone.** `ResumeShareEvent` and `resume_section_events` were dropped by `2026_08_02_215300_drop_resumes_shares_and_messages_tables.php` along with the old `resume_share_links`/`resume_notes`/`resume_tags` and never recreated; no model or migration for them exists. Do not confuse this with the *new*, unrelated share-link feature added the same day — see "Share links" under "Frontend page structure" above. `ResumeShareLinkView` (the new feature's own append-only visitor log) is a different, currently-live table.
5. **FK cascade for dependents** — `cascadeOnDelete` on `resume_id` handles `experiences`/`projects`/`education`/`certificates`/`skills`/`resume_notes`/`resume_snapshots`. `User` deletes its resumes per-model rather than relying purely on the FK cascade.
6. **No monetization** — every feature is free and unlimited, and nothing is metered.
7. **Best-effort system logging** — `try/catch` swallows exceptions so logging never crashes requests.
8. **No LLM anywhere** — every remaining feature (strength score, autocomplete, keyword overlap, exports) is deterministic server-side code. Adding an AI dependency back is a product decision, not an implementation detail; ask first.

---

Last updated: 2026-08-04 (support admin shipped on `APP_ADMIN_DOMAIN` with an append-only `admin_action_logs`; Boost re-run refreshed the guidelines block — Cashier/Filament/Livewire/Breeze are finally gone from it — and added the `fortify-development` + `medialibrary-development` skills)

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

===

<laravel-boost-guidelines>
=== foundation rules ===

# Laravel Boost Guidelines

The Laravel Boost guidelines are specifically curated by Laravel maintainers for this application. These guidelines should be followed closely to ensure the best experience when building Laravel applications.

## Foundational Context

This application is a Laravel application and its main Laravel ecosystems package & versions are below. You are an expert with them all. Ensure you abide by these specific packages & versions.

- php - 8.5
- inertiajs/inertia-laravel (INERTIA_LARAVEL) - v3
- laravel/fortify (FORTIFY) - v1
- laravel/framework (LARAVEL) - v13
- laravel/prompts (PROMPTS) - v0
- laravel/sanctum (SANCTUM) - v4
- tightenco/ziggy (ZIGGY) - v2
- laravel/boost (BOOST) - v2
- laravel/dusk (DUSK) - v8
- laravel/mcp (MCP) - v0
- laravel/pail (PAIL) - v1
- laravel/pint (PINT) - v1
- phpunit/phpunit (PHPUNIT) - v12
- @inertiajs/react (INERTIA_REACT) - v3
- react (REACT) - v19
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

=== herd rules ===

# Laravel Herd

- The application is served by Laravel Herd at `https?://[kebab-case-project-dir].test`. Use the `get-absolute-url` tool to generate valid URLs. Never run commands to serve the site. It is always available.
- Use the `herd` CLI to manage services, PHP versions, and sites (e.g. `herd sites`, `herd services:start <service>`, `herd php:list`). Run `herd list` to discover all available commands.

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

# Inertia v3

- Use all Inertia features from v1, v2, and v3. Check the documentation before making changes to ensure the correct approach.
- New v3 features: standalone HTTP requests (`useHttp` hook), optimistic updates with automatic rollback, layout props (`useLayoutProps` hook), instant visits, simplified SSR via `@inertiajs/vite` plugin, custom exception handling for error pages.
- Carried over from v2: deferred props, infinite scroll, merging props, polling, prefetching, once props, flash data.
- When using deferred props, add an empty state with a pulsing or animated skeleton.
- Axios has been removed. Use the built-in XHR client with interceptors, or install Axios separately if needed.
- `Inertia::lazy()` / `LazyProp` has been removed. Use `Inertia::optional()` instead.
- Prop types (`Inertia::optional()`, `Inertia::defer()`, `Inertia::merge()`) work inside nested arrays with dot-notation paths.
- SSR works automatically in Vite dev mode with `@inertiajs/vite` - no separate Node.js server needed during development.
- Event renames: `invalid` is now `httpException`, `exception` is now `networkError`.
- `router.cancel()` replaced by `router.cancelAll()`.
- The `future` configuration namespace has been removed - all v2 future options are now always enabled.

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
