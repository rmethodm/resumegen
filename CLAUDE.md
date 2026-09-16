<!-- dgc-policy-v1 -->
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

---

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
- **Auth:** Laravel Fortify (session-based; replaced Breeze in the 2026-08-02 foundation swap), Sanctum (API tokens). `User` implements `MustVerifyEmail` — new registrations must verify before accessing the app. The main authenticated group in `web.php` runs `['auth', 'verified', 'two_factor_challenge']`. OAuth login (Google/GitHub/Microsoft via `laravel/socialite` + `socialiteproviders/microsoft`, added 2026-09-06) is additive on top of this: `App\Http\Controllers\Auth\SocialiteController` (`routes/auth.php`) auto-links to an existing account only when the provider confirms the email is verified, otherwise the user is sent back to password login; new OAuth signups share `App\Actions\Fortify\RegistrationIpLimiter` with password registration.
- **PDF:** `barryvdh/laravel-dompdf` — server-side generation. Current routes: `GET /resumes/{resume}/export` (download), `GET /resumes/{resume}/preview` (inline stream). The legacy `builder/{resume}/pdf|preview` routes still resolve.
- **Media:** none. The resume photo feature was removed; `Resume` no longer implements `HasMedia`, and `spatie/laravel-medialibrary` is no longer in `composer.json` either.
- **Billing:** `laravel/cashier` v16 (Stripe) — $9.95/mo `default` subscription (`STRIPE_PRICE_ID`) unlocks AI credit hold/buy/spend; non-AI app features are not tier-gated. See "Billing — subscription + AI credits" below.
- **AI:** `openai-php/laravel` — credit ledger + Cashier gates remain; Workstation Rewrite/Generate HTTP is unrouted for v1. See "AI — subscription credit gates" below.
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

**Apply flow (2026-09-15):** "Add job" is an entry point equal to "New resume". `App\Actions\CreateJobApplication` creates the Kanban card and, when `base_resume_id` is given, a tailored sibling version (same `ResumeGroup`, title "Company – Role", JD stored in `target_job_description`) and sets `job_applications.resume_id`. Web (`JobApplicationController@store`) and extension (`ExtensionController@jobApplicationStore`) both call it. Surfaces: `Components/jobs/add-job-modal.tsx` (Dashboard + Kanban), `Pages/Apply/Wizard.tsx` at `/apply/new` (skippable; `users.prefers_apply_wizard` decides which the Dashboard CTA opens), Workstation header `application-chip`, Dashboard `next-up-strip` and `first-week-checklist` (`users.dismissed_checklist_at`). AI tailoring is Part 2 of the spec and is not wired yet. Note: Inertia v3's `<Deferred>` component throws if `fallback` is falsy (`fallback={null}` trips it) — use `fallback={<></>}` for an empty deferred block.

### Share links
Two live flows: the Workstation's share panel (`ResumeShareLinkController`, `resumes/{resume}/share` + `resume-share-links.*`) and the `/shares` index (`ShareController@index`, `Shares/Index.tsx`), which lists every link with views, unique visitors, and a 7-day trend. Analytics come from `resume_share_link_views` — email-gated unlocks log a row with the email (`PublicResumeShareController::unlock`), and since 2026-08-19 ungated visits log an anonymous row (null `email`) once per session per link from `show()`/`pdf()`/`docx()`. The modal's "recent views" lists only the email rows; `view_count`/`/shares` count both. The old `resume_share_events` system was dropped; the dead affordances it fed ("Make primary", unread badges) were stripped from `Shares/Index.tsx` and the `ShareController` payload on 2026-08-19 — only `label: null` is still stubbed (displayed as a fallback name). Public access is `GET /r/{token}` with optional email/password gate and gated PDF/DOCX downloads.

### Shared Inertia props
`HandleInertiaRequests::share()` passes `auth.user`, `flash.{success,error}`, and for authenticated users `aiCredits: { balance, subscribed, canPurchase }` (null for guests). No `aiEnabled`, `impersonating`, or `featureGate` prop — AI gating uses the credit ledger + Cashier `subscribed('default')`, not a generic feature-gate bag.

## Billing — subscription + AI credits (as of 2026-09-10)

**Reversal:** on 2026-09-09 the user explicitly asked to allow charging and to allow AI again, superseding the 2026-07-14 removal. Product decision 2026-09-10: **$9.95/mo** (`STRIPE_PRICE_ID` / `config('cashier.price_id')`) for the app; **AI credits** gate generative AI. `laravel/cashier` v16 is in `composer.json`/`vendor/`; Cashier's migrations are applied; `User` uses the `Billable` trait.

**What exists:** `BillingController::checkout()` (subscription Checkout), `::portal()` (Billing Portal), and `::credits()` (one-time credit-pack Checkout when `STRIPE_CREDITS_PRICE_ID` / `config('cashier.credits_price_id')` is set; otherwise redirect-back flash `"AI credit packs coming soon"`). Routes: `/billing/checkout`, `/billing/portal`, `/billing/credits` (`billing.credits`) inside the authenticated group. Cashier's `/stripe/webhook` auto-registers. First successful subscribe grants starter credits once (`AI_STARTER_CREDITS`, default 20) via `GrantAiStarterCredits` / `AiCreditService::grantStarterIfNeeded`.

**What does NOT exist yet:** multi-tier plans (`plan_tier`/`is_pro` were not resurrected), live Stripe credit-pack SKUs (Buy path is stubbed until `STRIPE_CREDITS_PRICE_ID` is set), paywalling of non-AI features. `App\Services\UserLimits` remains the template allowlist only. Do not invent additional paid tiers without asking.

Historical context (still accurate as *history*, not current state): billing was removed 2026-07-14 (`763a2648`), a $0 prepaid-instrumentation experiment (`JobPairing`/`BalanceTransaction`/`config/pricing.php`) was built 2026-07-20 and deleted 2026-08-14 — don't resurrect that pattern. The admin Revenue dashboards and pro-gated forced-2FA stay gone; 2FA is still opt-in only.

## AI — subscription credit gates (as of 2026-09-10)

**Model:** only active Cashier subscribers may hold/buy/spend AI credits. Generative routes debit an append-only `ai_credit_ledger` after a successful model response (balance = sum of entries; no expiry while subscribed). Gates: `subscribed('default')` + balance ≥ cost + not `users.ai_blocked`. HTTP: **402** = not subscribed or insufficient credits; **429** = `ai_blocked`. Past-due is treated as not subscribed for AI. Credits are per user, not per resume.

**No live generative Workstation HTTP in v1.** Rewrite (bullet/summary), Optimize Generate, deep review, and section rewrite are unrouted (comment in `routes/web.php`). Credit ledger, starter grant, and `/billing/credits` stub remain. `AiService::reviewResume` / `rewriteSection` remain as orphans — do not re-expose without metering. Optimize diagnose (keyword overlap) stays free.

**Still free / deterministic:** Optimize diagnose (keyword overlap / heuristics) does not spend credits. `PlainTextResumeParser` on create stays local.

**What stays gone** until asked for: Coach sidebar / chat agent, resume translation, career map, PDF AI extract, InterviewCoach. Spec: `docs/superpowers/specs/2026-09-10-workstation-ai-credits-design.md`.

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

- **Extension** (`/api/extension/*`, ability `extension`): fill-profile payloads for the Resumegen Apply browser extension. Tokens issued from the Profile page (paste-token) or, as of 2026-09-14 Phase C, minted server-side by `GET/POST /extension/connect(/token)` (session-auth, `password.confirm`-gated) and handed to the extension via `chrome.runtime.sendMessage`/`externally_connectable` — needs `RESUMEGEN_EXTENSION_ID` set (`config('services.resumegen_extension.id')`) to fire; paste-token stays as the fallback. Read endpoints: `me`, `resumes`, `resumes/{id}/fill-profile`, `qa-bank`, `qa-bank/match`, `resumes/{id}/pdf` (DomPDF stream, mirrors `Api\ResumeController::pdf`). Write endpoints (all 2026-09-14 extension-upgrade spec phases): `POST qa-bank` (save entry), `POST qa-bank/draft` (match-first against `QaBankMatcher`, AI fallback via the same `AiUsageLimiter`/`AiCreditService` gate as `QaBankEntryController::draft` — 402/429 conventions apply here too), `POST job-applications` (reuses `StoreJobApplicationRequest`, logs a `job_application_status_events` row same as the Kanban), `PATCH resumes/{id}/target-job-description` (JD import via the extension's right-click context menu; `max:10000` matches `App\Data\ResumeRules`).
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
6. **Billing = $9.95 sub + AI credits (2026-09-10)** — Cashier `default` subscription required to hold/buy/spend AI credits; non-AI features are not tier-gated. Credit packs Buy path stubs to flash until `STRIPE_CREDITS_PRICE_ID` is set.
7. **Best-effort system logging** — `try/catch` swallows exceptions so logging never crashes requests.
8. **Deterministic first, model only for judgment** — Optimize diagnose / keyword overlap stay code-driven; generative rewrite/generate is the only OpenAI spend path. (Job-board fetch was removed with Job Imports 2026-08-26.)
9. **AI credit ledger remains (2026-09-10); Workstation Rewrite/Generate UI removed** — no live generative spend path on the Workstation. Optimize diagnose stays free. Coach/chat/translation/career-map stay gone until asked for. Do not re-route rewrite/generate/review without metering.

## Production server (as of 2026-08-25)

Hostinger VPS (`srv1861900`), Apache, PostgreSQL, self-hosted GitHub runner. App root `/var/www/resumegen.app`. Local SSH alias: `resumegen-prod` (root; key `id_ed25519_hostinger`, passphrase-protected — after a reboot the user must `ssh-add` it before agent auth works).

- **Deploy**: manual `gh workflow run ci.yml` only. Full flow + failure table in `docs/DEPLOYMENT.md` (Part 11 added 2026-08-25).
- **`scripts/server-repair.sh`** (added 2026-08-25): one-shot root fix for the recurring failure class — root-owned files and tracked-file drift from running composer/npm/artisan as root on the server. That single disease caused every deploy failure on 2026-08-25 (dirty `composer.lock`, undeletable `vendor/`, unwritable `storage/framework`, unclearable `public/build`). **Never run composer/npm/artisan as root on the server; use `sudo -u www-data`.**
- **Queue worker**: `resumegen-queue.service` installed 2026-08-25 — it had been missing since launch (deploy.sh silently no-ops when absent), so queued mail had never sent. If digests stop again, check `systemctl is-active resumegen-queue` first.
- **Admin panel**: removed 2026-09-02. The `admin.resumegen.app` `ServerAlias`, cert entry, and `APP_ADMIN_DOMAIN` in the server `.env` are now dead config and can be cleaned up.
- The Claude Code auto-mode classifier blocks most server-mutating SSH commands; hand those to the user as `! ssh resumegen-prod '…'` one-liners and verify read-only afterward.

---

Last updated: 2026-09-10

## Verification Policy

Do not report a feature, fix, integration, or deploy as done based on configuration being in place, a clean build, passing tests, or an internal function call. Prove it with a real run:

- **UI features**: launch the actual app (e.g. `npm run tauri dev`) and drive the real UI yourself — click, drag, dispatch. Not the test suite, not an `import` of an internal function with a `console.log`.
- **UI/layout changes**: open the affected page live in the browser (use the connected Chrome session when the user offers one) and look at the rendered result — never sign off a visual change from code alone. If the user attached a screenshot or reference image, compare the rendered page against it region by region until it matches, and explicitly check desktop widths for alignment drift (desktop top-right misalignment has slipped through before). After styling changes, run Pint on the touched files before the browser check.
- **Fixes**: after a full kill-and-restart of the app/dev server, re-confirm the fix still holds — not just in the session where it was applied.
- **Integrations and deploys**: perform the real action (send an actual test email, run an actual deploy) rather than reporting that configuration is correct.

If the live run does nothing where you expected it to work, that is the real bug report — find the actual root cause instead of defending the earlier "done" claim.

<!-- unforget:begin — maintained by the unforget skill; do not hand-edit inside these markers -->
## Deferred Work Index

**Ledger home:** `docs/UNFORGET.md`  (git posture: split — contents ignored, README/index tracked)

- `UNFORGET.md` — UNFORGET (main).

Read the ledgers when the user asks "what's deferred?" / "backlog?" / "prioritize," and before suggesting a release (check 🔴 THIS rows). Log new deferrals via the deferral gate — an item lives in exactly ONE ledger; siblings get a pointer row, not a copy.
<!-- unforget:end -->
