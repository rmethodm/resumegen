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
- **Frontend:** React 19, TypeScript, Tailwind CSS v4 (CSS-first config in `resources/css/app.css` `@theme`; no `tailwind.config.js` — upgraded 2026-08-20), Vite 8
- **Auth:** Laravel Fortify (session-based; replaced Breeze in the 2026-08-02 foundation swap), Sanctum (API tokens). `User` implements `MustVerifyEmail` — new registrations must verify before accessing the app. The main authenticated group in `web.php` runs `['auth', 'verified', 'two_factor_challenge']`.
- **PDF:** `barryvdh/laravel-dompdf` — server-side generation. Current routes: `GET /resumes/{resume}/export` (download), `GET /resumes/{resume}/preview` (inline stream). The legacy `builder/{resume}/pdf|preview` routes still resolve.
- **Media:** none. The resume photo feature was removed; `Resume` no longer implements `HasMedia`, and `spatie/laravel-medialibrary` is no longer in `composer.json` either.
- **Billing:** none — see "Billing — there is none" below. No Cashier, no Stripe.
- **Routing (frontend):** Ziggy v2 (`route()` helper globally available via `resources/js/types/global.d.ts`)

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
Resume content lives in **separate related tables**, not JSON blobs: `Experience`, `Skill`, `Project`, `Education`, `Certificate` each `hasMany` off `Resume`, ordered by a `position` column. The `resumes` table itself holds discrete columns (title, target_role, target_company, target_job_description, full_name, headline, contact fields, summary, template, font, density, skills_layout, bullet_style, import_state/import_error). The only JSON column is `section_order` — an array of section-name strings (`Resume::SECTIONS`), repaired on read via `Resume::sectionOrder()` so required sections always show and newly-added sections appear for older rows.

**Versioning:** every resume belongs to a `ResumeGroup` (`group_id`) — assigned in `Resume::booted()`'s `creating` hook when absent. This replaced an earlier parent/child A/B-variant tree design.

**Cascade delete:** dependents (share links and their views, snapshots, notes) are removed by `cascadeOnDelete` FKs. `Resume::booted()` has a `deleting` hook (added 2026-08-19) — not for asset cleanup (there is no thumbnail field) but to log the hard delete into `resume_deletions`, so the mobile API's incremental `?since=` pull can tell other devices about deletions.

### Authorization
There is no `ResumePolicy` (removed) — a live code comment in `ResumeBuilderController::edit` says so explicitly. Ownership is checked inline everywhere: `abort_unless($resume->user_id === $request->user()->id, 403)` (or 404 in the newer controllers) in `ResumeBuilderController`, `ResumeController`, `ShareLinkController`, and the rest. There is no `JobSearchPolicy` — job search/import products were removed 2026-08-26.

### Frontend page structure
The core surface is `resources/js/Pages/Resumes/Workstation.tsx` (`resumes.workstation`, `ResumeController@workstation`) — the only editing surface. It saves via the `use-autosave` hook (`router.put` to `resumes.update`) and renders a **client-side** React preview (`Components/resume/resume-preview`); the Review tab can toggle that preview between the React render and the real DomPDF output in an iframe (`Components/workstation/pdf-preview-frame`, cache-busted after saves), and the server PDF stream at `GET /resumes/{resume}/preview` backs PDF preview/export. `builder.edit` is a legacy named route that redirects to the Workstation; the old page components (`ResumeBuilder/Edit.tsx`, `Resumes/Builder.tsx`) were deleted 2026-08-31 — only `ResumeBuilder/LinkPassword.tsx` remains in that directory.

**Editor rework (2026-08-31):** bullets support inline markdown — `App\Support\InlineMarkdown` (PHP, for DomPDF blades and `DocxExport`) mirrors `resources/js/lib/bullet-markdown.ts` (client), with `resume-formatting.ts` and `skills-editor.ts` alongside (all unit-tested). The Workstation gained a `bullets-editor` component, a format toolbar (`workstation-format-toolbar`) carrying bullet-style and skills-layout controls, and the PDF preview frame above.

**Legacy builder endpoints:** the five that 500'd (`builder.store`, `builder.docx`, `builder.thumbnail`, `builder.duplicate`, `builder.create-variant` — they referenced deleted services/columns) were deleted on 2026-08-19, routes and methods both. Working equivalents live on `ResumeController` (`resumes.download-docx`, `resumes.duplicate`). The surviving `builder.*` routes are redirects/legacy save paths (`builder.edit` → Workstation, `builder.beacon`, `builder.pdf/preview/html-preview`, `builder.share-url`).

### Share links
Two live flows: the Workstation's share panel (`ResumeShareLinkController`, `resumes/{resume}/share` + `resume-share-links.*`) and the `/shares` index (`ShareController@index`, `Shares/Index.tsx`), which lists every link with views, unique visitors, and a 7-day trend. Analytics come from `resume_share_link_views` — email-gated unlocks log a row with the email (`PublicResumeShareController::unlock`), and since 2026-08-19 ungated visits log an anonymous row (null `email`) once per session per link from `show()`/`pdf()`/`docx()`. The modal's "recent views" lists only the email rows; `view_count`/`/shares` count both. The old `resume_share_events` system was dropped; the dead affordances it fed ("Make primary", unread badges) were stripped from `Shares/Index.tsx` and the `ShareController` payload on 2026-08-19 — only `label: null` is still stubbed (displayed as a fallback name). Public access is `GET /r/{token}` with optional email/password gate and gated PDF/DOCX downloads.

### Shared Inertia props
`HandleInertiaRequests::share()` passes `auth.user` and `flash.{success,error}` only. There is no `aiEnabled` prop, no `impersonating`, and no `featureGate` — see "Billing". AI was removed entirely (2026-08-26).

## Billing — there is none

**The app is free and unlimited.** Billing was removed on 2026-07-14: Cashier is uninstalled, there are no plan tiers, no Stripe, no payments, no `UpgradeModal`, no `featureGate`. A later experiment (2026-07-20) built prepaid-pricing *instrumentation* at $0 (`JobPairing`, `BalanceTransaction`, `config/pricing.php`, `PricingUsageReport`/`PricingGrowthReport`) purely to collect usage data for a possible future prepaid model — it never charged anyone. That instrumentation, `docs/prepaid-pricing-model.md`, and every other pricing-strategy doc were removed outright on 2026-08-14: the product decision is the app stays free, so there is nothing left to instrument for. **Do not add a paywall, a tier check, a balance/credit system, or an upgrade CTA without asking first** — and don't resurrect the deleted `JobPairing`/`BalanceTransaction` pattern as a starting point if pricing is ever revisited; start fresh with a real product decision.

**Laravel Boost's auto-generated context block lies about this.** It lists `laravel/cashier (CASHIER) - v16` among the installed packages. Cashier is in neither `composer.json` nor `vendor/` — verify against the filesystem, not that header. The matching `.claude/skills/cashier-stripe-development` skill and the two `mcp__plugin_stripe_stripe__*` permissions were deleted on 2026-07-19 for the same reason.

`App\Services\UserLimits` survives only for the template allowlist (`allTemplates()`, backed by `ResumeDocument::TEMPLATES`). AI metering is gone. Every other limit (resumes, custom sections, DOCX, share-link views, PDF watermark) is unlimited. Several tests assert `assertSessionMissing('featureGate')` specifically to catch a paywall creeping back in; if one starts failing, that is the alarm working.

Gone with it: `plan_tier` / `is_pro` / `stripe_id` columns, the `subscriptions` tables, `BillingController`, the admin Revenue dashboards (`RevenuePage`, `RevenueReport`, `RevenueSnapshot`, `CaptureRevenueSnapshot`), forced 2FA (which was gated on the pro tier — 2FA is now opt-in only), and — as of 2026-08-14 — `JobPairing`, `BalanceTransaction`, `config/pricing.php`, `JobPairingService`, `PricingUsageReport`/`PricingGrowthReport`, `GrowthSampleSeeder`, and every pricing-strategy doc (`docs/prepaid-pricing-model.md`, `docs/pricing-recommendations-2026-08.md`, `docs/competitive-pricing-one-pager-2026-08.md`, `docs/resume-builder-competitive-analysis.md`, `docs/competitive-research-resumegen-2026-08.md`).

## AI — removed

**There is no AI in this app.** As of 2026-08-26 every AI stack was deleted: `AiService` / `AiPrompts` / `AiSuggestionController` / `InterviewCoachController`, `ResumeAiController` / `OpenAiResumeAssistant` / `AiUsageLimiter`, `config/ai.php`, `openai-php/laravel`, Workstation AI rewrite/summary UI, PDF AI extract (`ResumeImportController`), and the `ai_requests` table plus `users.ai_*` columns. Do **not** reintroduce OpenAI/Anthropic, an AI quota, or an AI CTA without an explicit product decision.

Deterministic alternatives that stay: `PlainTextResumeParser` (local text parse on create), Workstation `JdMatchPanel` / `OptimizePanel` (keyword overlap, no model).

**Registration IP velocity:** Max 5 accounts per IP per 24h. Enforced in `App\Actions\Fortify\CreateNewUser` via `registration_ip` column on `users`.

## Job search / imports — removed

**`/jobs`, `/jobs-imports`, board clients, alerts, and URL import are gone** (2026-08-26). Dropped tables: `job_searches`, `job_listings`, `imported_jobs`, `scraped_jobs`.

**What stays:**
- `/job-applications` Kanban (`JobApplicationController`, page `Jobs/Kanban.tsx`) — manual application tracker
- Resume autocomplete dictionaries `job_roles` / `job_skills` / `job_titles` (not a job board product)
- SSRF-safe URL reachability for resume link fields (`UrlProbe` / `POST urls.check`) — unrelated to job import

## Admin Panel — removed

The hand-rolled Inertia admin (domain-scoped `routes/admin.php`, `EnsureUserIsAdmin`, `AdminActionLog`, the Users/Visitors/Database sections, `TrackSiteVisit` + `site_visits`, `users.is_admin`, the admin-host 2FA/idle-timeout/destructive-tools middleware, and `doctrine/dbal`) was removed on 2026-09-02. Migration `2026_09_02_120000_drop_admin_tables_and_flag` drops `admin_action_logs`, `site_visits`, and `users.is_admin`. Do not reintroduce an admin surface without asking first.

`users.disabled_at` and `EnsureUserNotDisabled` survive (auth and the API still refuse disabled accounts), but nothing in the app sets the column any more — set it directly in the DB if needed.

**App backups:** `spatie/laravel-backup` v10 (`config/backup.php`, disk `backups` → `storage/app/private/spatie-backups`). Scheduled in `routes/console.php`: `backup:clean` 01:00, `backup:run` 01:30, `backup:monitor` 01:45. CLI/schedule only.

## API Layer

Token-based Sanctum API at `/api`. `config/sanctum.php` sets `'guard' => []` (intentionally empty) — only token-auth works, no session fallback. Two client surfaces, distinguished by token ability (checked in app code, not middleware):

- **Extension** (`/api/extension/*`, ability `extension`): read-only fill-profile payloads for the Resumegen Apply browser extension. Tokens issued from the Profile page only.
- **Mobile** (ability `mobile`, `App\Support\MobileApiToken`, guards in `App\Concerns\GuardsMobileTokens`): built 2026-08-18/19 for the iPhone/iPad apps. `POST /api/auth/token` is password login (throttle 5/min; refuses unverified, disabled, and 2FA-enabled accounts — 2FA users create tokens from the Profile page so password-only login can't bypass 2FA); `DELETE /api/auth/token` revokes the calling token. Full resume CRUD via the `ResumeDocument` shape, `GET /api/resumes/{id}/pdf` (DomPDF stream), and share-link management (`/api/resumes/{id}/share`, `/api/share-links/{id}`). Sync support (added 2026-08-19): `POST /api/resumes` accepts a `client_uuid` for idempotent offline creates (unique per user); `PUT` returns **409 with the current server document** on a stale `base_updated_at` (web returns an error banner instead); `GET /api/resumes?since=` returns only changed rows plus a `deleted` id list read from `resume_deletions`, populated by `Resume::booted()`'s `deleting` hook.

**Test base class:** All API tests extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). It calls `$this->app['auth']->forgetGuards()` before each request to prevent Sanctum guard cache from masking token revocation.

## Removed Features (do not reintroduce without asking)

Deleted on 2026-07-14 — code, routes, models, migrations, and tests:

- **Resignation letters, proofreading, career coach chat, outbound user webhooks.** Their tables (`resignation_letters`, `proofreading_requests`, `career_coach_messages`, `webhook_endpoints`) may linger as orphans in databases that ran the old migrations — the create-migrations were deleted rather than superseded by a drop, so a fresh `migrate` will not recreate them.
- **Resume translation and career map** — the two most expensive AI features per unit of value. Deleted outright (routes, prompts, controllers, tests), not flagged off.
- **All billing** (see above). Here the create-migrations were kept and a drop migration (`2026_07_14_120000_drop_billing_tables_and_columns`) removes the tables and columns, so both fresh and existing databases converge.
- **Referral rewards** — `ReferralRewardService` / `ReferralEvent` were already gone before this; the reward was a Stripe credit and has no meaning now.
- **Job applications tracker** (removed in `93c1c14`) — since **reintroduced** as the Kanban at `/job-applications` (`JobApplicationController` + `JobApplication` model). `application_contacts` and `interview_notes` stayed dropped and are deliberately out of scope. `AnalyticsController` still queries `job_applications` via `DB::table()` for the dashboard's `active_applications` count.
- **Cover letters** — removed outright on 2026-08-18 (`dd93ee34`): routes, `CoverLetter` model/queries, and the `cover-letters.ai.draft` endpoint. The `cover_letter` key in `AiPrompts` is the only leftover. The "cover letters" on Job Imports are frontend stubs.
- **System events** — the `system_events` mail-log table, its `MessageSent` listener, and the Ops dashboard surface are gone; `AppServiceProvider::boot()` now only configures production `URL::forceScheme('https')`, Vite prefetch, and the `share-unlock` rate limiter.

## Migrations are forward-only — rollback is not supported

**Do not run `migrate:rollback`, `migrate:reset`, or `migrate:refresh`. Use `migrate:fresh --seed` to rebuild.**

The `drop_*` cleanup migrations (`drop_resume_strength_snapshots_table`, `drop_job_application_id_from_resumes_table`, `drop_referral_fields_from_users_table`, `drop_interview_notes_table`, `drop_agency_org_tables`, `drop_application_contacts_table`) all have an empty `down()` — deliberately, so rolling back never resurrects a removed feature's schema. The consequence is that a rollback removes a column and never restores it, so the older migration that created it then dies trying to drop a constraint that is already gone. It cascades: fix one and the next fails identically, roughly seven deep.

A rollback that fails partway leaves the database in a wrecked half-state — schema torn down to the failure point while the `migrations` table still claims those migrations ran. That state looks exactly like a corrupted or partially-restored dump, and has twice been misdiagnosed as one. If migration counts and actual schema disagree, suspect an interrupted rollback first and just run `migrate:fresh --seed`.

**In production the inverse happened (2026-08-25):** schema *ahead* of the log — `store_ai_cost_in_micro_cents` had fully applied but was never recorded, so every `migrate` died on "column already exists" and the 8 later migrations silently never ran (the migration log was stuck at 2026-07-20). `migrate:fresh` is not an option on prod; the fix was to verify the migration's work was actually complete (new column present, old one dropped), insert its row into `migrations` by hand, then run `migrate --force` for the genuinely-pending rest. Verify schema before trusting either the log or the error.

Making rollback work would mean editing seven already-shipped migrations to no benefit. Forward-only is the decision, not an oversight.

**This is enforced, not just documented.** `.claude/hooks/block-migrate-rollback.sh` is a `PreToolUse` hook (wired in `.claude/settings.json`) that blocks any `artisan migrate:rollback|reset|refresh` and points at `migrate:fresh --seed`. Prose here did not prevent the two misdiagnoses above, so the rule got teeth. The regex requires an `artisan` prefix, so grepping for or documenting the term still works.

**When deleting a model, grep for its class name across `database/`.** Migrations, factories, and seeders hold references the IDE and the test suite never exercise, so they stay green and only fail later at `migrate` or `migrate:fresh --seed` time. This has bitten three times: `JobApplication` (a migration `down()`, two factories) and `AiModelRate` (a seeder for a table dropped by `2026_06_10_113108_drop_dead_ai_tables`). Prefer the column name over the model — `dropConstrainedForeignId('foo_id')`, not `dropForeignIdFor(Foo::class)` — so migrations never depend on app classes that can be deleted out from under them.

## Project skills are hook-enforced, not prose-enforced

`.claude/skills/` holds the repo-specific skills (dozens now; the original five have been joined by design/StyleSeed and workflow skills). Two of them are wired to a `PreToolUse` hook — `.claude/hooks/nudge-project-skills.sh`, matched on `Edit|Write` in `.claude/settings.json`:

- editing `resources/js/**/*.tsx|jsx` → activate `inertia-react-development`
- editing `app/**/*.php` → activate `laravel-best-practices`

**Why a hook and not a sentence.** A transcript audit on 2026-07-19 counted 83 `Skill` invocations across 122 sessions: `superpowers:*` process skills accounted for ~69%, and **all five project skills had fired exactly zero times** since being added on 2026-07-07 — despite good `description:` frontmatter and despite the Boost block below explicitly saying "IMPORTANT: Activate `inertia-react-development`". Passive description-matching loses against a crowded skill listing and four SessionStart hooks. Same lesson as `block-migrate-rollback.sh` one section up: prose that has already failed once does not get a second chance, it gets teeth.

The hook **nudges, it does not block** — it emits `additionalContext` with `permissionDecision: "defer"`, so the edit is neither blocked nor auto-approved and the normal permission flow is untouched. It fires **once per skill per session** (a `/tmp` marker keyed on `session_id`); re-injecting the same sentence on all 40 edits of a page is how injected context gets tuned out.

`debug-using-debugbar`, `server-deployment`, and `tailwindcss-development` are deliberately *not* hooked — they key off intent ("this page is slow", "deploy this"), not off a file path, so there is no reliable `Edit`/`Write` trigger for them. They remain description-matched only.

Do not fix the stale "IMPORTANT: Activate…" lines inside the `<laravel-boost-guidelines>` block — Boost regenerates that block, so edits there are overwritten. The hook is what actually carries the rule.

## Key Design Decisions

1. **Relational resume content, not JSON columns** — `Experience`/`Skill`/`Project`/`Education`/`Certificate` are separate tables `hasMany` off `Resume`; only `section_order` (an array of section names) is JSON.
2. **Client-side live preview, server-side PDF** — the Workstation renders a React preview component; DomPDF renders the real document for preview/stream and export.
3. **Autosave in the editor** — the Workstation's `use-autosave` hook `router.put`s changes; the old beacon-on-beforeunload save survives only on the legacy `builder.beacon` route.
4. **Append-only analytics tables** — `resume_share_link_views`. Simple, immutable.
5. **FK cascade for dependents** — `cascadeOnDelete` handles children (share links and their views, snapshots, notes). `Resume::booted()`'s `deleting` hook exists only to log into `resume_deletions` for mobile sync — it cleans up no assets (there are none). `User` has no `booted()` deleting its resumes per-model — intentional, nothing to clean up.
6. **No monetization** — every feature is free and unlimited; AI is metered only to cap OpenAI spend.
7. **Best-effort system logging** — `try/catch` swallows exceptions so logging never crashes requests.
8. **Deterministic sourcing, model-only judgment** — job boards are fetched by code; the model scores fit and parses arbitrary pages, and never picks what to search for.
9. **No AI** — do not reintroduce model-backed rewrite, ranking, or import without an explicit product decision.

## Production server (as of 2026-08-25)

Hostinger VPS (`srv1861900`), Apache, PostgreSQL, self-hosted GitHub runner. App root `/var/www/resumegen.app`. Local SSH alias: `resumegen-prod` (root; key `id_ed25519_hostinger`, passphrase-protected — after a reboot the user must `ssh-add` it before agent auth works).

- **Deploy**: manual `gh workflow run ci.yml` only. Full flow + failure table in `docs/DEPLOYMENT.md` (Part 11 added 2026-08-25).
- **`scripts/server-repair.sh`** (added 2026-08-25): one-shot root fix for the recurring failure class — root-owned files and tracked-file drift from running composer/npm/artisan as root on the server. That single disease caused every deploy failure on 2026-08-25 (dirty `composer.lock`, undeletable `vendor/`, unwritable `storage/framework`, unclearable `public/build`). **Never run composer/npm/artisan as root on the server; use `sudo -u www-data`.**
- **Queue worker**: `resumegen-queue.service` installed 2026-08-25 — it had been missing since launch (deploy.sh silently no-ops when absent), so queued mail had never sent. If digests stop again, check `systemctl is-active resumegen-queue` first.
- **Admin panel**: removed 2026-09-02. The `admin.resumegen.app` `ServerAlias`, cert entry, and `APP_ADMIN_DOMAIN` in the server `.env` are now dead config and can be cleaned up.
- The Claude Code auto-mode classifier blocks most server-mutating SSH commands; hand those to the user as `! ssh resumegen-prod '…'` one-liners and verify read-only afterward.

---

Last updated: 2026-09-01

<!-- dgc-policy-v11 -->
# Dual-Graph Context Policy

This project uses a local dual-graph MCP server (graperoot-pro) for efficient,
budget-aware context retrieval. Always prefer it over native file exploration.

## MANDATORY: Always follow this order

1. **Call `graph_continue` first** -- before any file exploration, grep, or code reading.

2. **If `graph_continue` returns `needs_project=true`**: call `graph_scan` with the
   current project directory (`pwd`). Do NOT ask the user.

3. **If `graph_continue` returns `skip=true`**: project is too small for the graph to
   help. Skip all graph tools and explore normally.

4. **Read `recommended_files`** using `graph_read` -- one call per file.
   - `recommended_files` may contain `file::symbol` entries (e.g. `src/auth.ts::handleLogin`).
     Pass them verbatim to `graph_read(file: "src/auth.ts::handleLogin")` -- it reads only
     that symbol's lines, not the full file.

5. **Check `confidence` and obey the caps strictly:**
   - `confidence=high` -> Stop. Do NOT grep or explore further.
   - `confidence=medium` -> If recommended files are insufficient, call `fallback_rg`
     at most `max_supplementary_greps` time(s) with specific terms, then `graph_read`
     at most `max_supplementary_files` additional file(s). Then stop.
   - `confidence=low` -> Call `fallback_rg` at most `max_supplementary_greps` time(s),
     then `graph_read` at most `max_supplementary_files` file(s). Then stop.

## Exhaustive enumeration tasks

Some tasks require scanning **every file** -- e.g. "find all dead exports", "list every
.find() without a limit", "audit all test files". Use these tools first:

- **`graph_dead_exports()`** -- pre-computed at scan time. Use for any dead-export task.
- **`graph_grep_all(pattern, file_glob?, max_hits?)`** -- exhaustive grep, no call cap.

## Rules

- Do NOT use `rg`, `grep`, or bash file exploration before calling `graph_continue`.
- Do NOT do broad/recursive exploration at any confidence level.
- After edits, call `graph_register_edit(files: ["path/to/file"])`. The parameter is
  `files` (plural, always an array). Use `file::symbol` notation when the edit targets
  a specific function, class, or hook.
<!-- /dgc-policy-v1 -->

## Verification Policy

Do not report a feature, fix, integration, or deploy as done based on configuration being in place, a clean build, passing tests, or an internal function call. Prove it with a real run:

- **UI features**: launch the actual app (e.g. `npm run tauri dev`) and drive the real UI yourself — click, drag, dispatch. Not the test suite, not an `import` of an internal function with a `console.log`.
- **UI/layout changes**: open the affected page live in the browser (use the connected Chrome session when the user offers one) and look at the rendered result — never sign off a visual change from code alone. If the user attached a screenshot or reference image, compare the rendered page against it region by region until it matches, and explicitly check desktop widths for alignment drift (desktop top-right misalignment has slipped through before). After styling changes, run Pint on the touched files before the browser check.
- **Fixes**: after a full kill-and-restart of the app/dev server, re-confirm the fix still holds — not just in the session where it was applied.
- **Integrations and deploys**: perform the real action (send an actual test email, run an actual deploy) rather than reporting that configuration is correct.

If the live run does nothing where you expected it to work, that is the real bug report — find the actual root cause instead of defending the earlier "done" claim.

<!-- grapelaravel:policy:start -->
# GrapeLaravel Context Policy

This project uses the GrapeLaravel MCP server for graph-based context
retrieval. Always prefer it over native file exploration.

## MANDATORY: Always follow this order

1. Call `graph_continue` first — before any file exploration, grep, or code
   reading. Describe your task as the query.
2. If it returns `needs_scan=true`, tell the user to run the printed
   `graph:scan` command.
3. Read the `recommended_files` using `graph_read` — one call per file.
   Entries support `file::symbol` notation for partial reads.
4. Obey the confidence caps strictly:
   - `confidence=high` -> Stop. Do NOT grep or explore further.
   - `confidence=medium`/`low` -> at most `max_supplementary_greps`
     `fallback_rg` call(s) and `max_supplementary_files` extra
     `graph_read` call(s). Then stop.

## Token-saving helpers (prefer before opening many files)

- `graph_neighbors` — inbound/outbound edges for a file
- `graph_impact` — 1-hop blast radius for changed files
- `graph_action_summary` — recent reads/edits + stored notes
- `graph_add_memory` / `graph_add_decision` — store short notes for later
- `graph_dead_exports` / `graph_find_cycles` — capped audits only when asked

## Rules

- Do NOT use rg, grep, cat, find, or shell exploration — prefer graph tools
  (`graph_continue`, `graph_read`, `fallback_rg`, `graph_neighbors`,
  `graph_impact`, `graph_action_summary`) over shell exploration.
- After editing files, call `graph_register_edit` with the changed paths
  (relative, `files` is always an array).
<!-- grapelaravel:policy:end -->

<!-- unforget:begin — maintained by the unforget skill; do not hand-edit inside these markers -->
## Deferred Work Index

**Ledger home:** `docs/UNFORGET.md`  (git posture: split — contents ignored, README/index tracked)

- `UNFORGET.md` — UNFORGET (main).

Read the ledgers when the user asks "what's deferred?" / "backlog?" / "prioritize," and before suggesting a release (check 🔴 THIS rows). Log new deferrals via the deferral gate — an item lives in exactly ONE ledger; siblings get a pointer row, not a copy.
<!-- unforget:end -->
