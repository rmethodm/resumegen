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

- **Backend:** Laravel 13, PHP 8.4, PostgreSQL (`DB_CONNECTION=pgsql`; tests run on in-memory SQLite), Inertia.js v2
- **Frontend:** React 18, TypeScript, Tailwind CSS v3, Vite 8
- **Auth:** Laravel Breeze (session-based), Sanctum (API tokens). `User` implements `MustVerifyEmail` — new registrations must verify before accessing the app. The `verified` middleware gates all main routes (`web.php` line 63).
- **PDF:** `barryvdh/laravel-dompdf` — server-side generation. Routes: `GET /builder/{resume}/pdf` (download), `GET /builder/{resume}/preview` (inline stream for iframe preview)
- **Media:** `spatie/laravel-medialibrary` — `Resume` implements `HasMedia` with a single-file `photo` collection.
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
Resume content is stored as JSON columns on a single `resumes` table (no separate section tables). Frontend owns JSON shape; backend validates as `nullable array`.

**Cascade delete:** Most dependents (share links, snapshots, threads, section/share events, tags) are removed by `cascadeOnDelete` FKs. `Resume::booted()`'s `deleting` observer covers only what FKs can't: it deletes A/B variants per-model (so nested variant trees recurse) and unlinks the resume's thumbnail. Because the `resumes.user_id` FK would cascade rows away without firing model events, `User::booted()` deletes its resumes per-model — otherwise account deletion would leak every thumbnail on disk.

### Authorization
`ResumePolicy` gates all resume mutations on `$user->id === $resume->user_id`. The base `Controller` uses `AuthorizesRequests` so `$this->authorize()` is available everywhere.

### Frontend page structure
The core feature is `ResumeBuilder/Edit.tsx` — a resizable split-panel editor + live preview iframe. Uses `onBlur` on every field to trigger `router.put` save (no debounce). The preview iframe loads `GET /builder/{resume}/preview` with a cache-busting `?t=<timestamp>` query param on each save.

### Shared Inertia props
`HandleInertiaRequests::share()` passes `auth.user`, `flash.{success,error}`, `aiEnabled` (mirrors `config('ai.enabled')` so the UI can hide AI affordances), and `impersonating`. There is no `featureGate` — see "Billing".

## Billing — there is none

**The app is free and unlimited.** Billing was removed on 2026-07-14: Cashier is uninstalled, there are no plan tiers, no Stripe, no payments, no `UpgradeModal`, no `featureGate`. Do not add a paywall, a tier check, or an upgrade CTA without asking first.

`App\Services\UserLimits` survives, but it now meters **only AI** — every other limit (resumes, cover letters, custom sections, templates, DOCX, share-link views, PDF watermark) is gone and unlimited. Several tests assert `assertSessionMissing('featureGate')` specifically to catch a paywall creeping back in; if one starts failing, that is the alarm working.

**A replacement is proposed but not implemented.** `docs/prepaid-pricing-model.md` (2026-07-20) designs a prepaid dollar balance — $0.50 per **job** (not per resume×job — pairing on resume too would bill users for the A/B variants feature), $5 signup grant, no subscription. It is a **proposal**; its §12 gates implementation on usage data that does not exist yet. What `app/` implements is the *instrumentation*, not the billing: `JobPairing`, `BalanceTransaction`, `JobPairingService` and `config/pricing.php` record one pairing per user per job so §12 can be answered with real numbers, with `job_cents` and `signup_grant_cents` both **0**. Nobody is charged and nobody sees a price, and the sentence above still holds: do not add a paywall without asking — turning prices on is a config change, so it is one env var away and must not happen by accident. Read that doc before proposing any pricing change, and do not revive the subscription ladder in `docs/resume-builder-competitive-analysis.md` §3 — it was withdrawn.

**Subscriptions were reconsidered on 2026-07-20 and rejected again, with reasons this time.** The arithmetic favours them (a $9/mo subscriber out-earns the average prepaid user's entire year in 0.62 months); the demand shape does not. Job hunting is episodic — someone tailors 8 resumes over five weeks and disappears for two years — so a subscription bills a relationship the product does not have. Consequences: month-3 retention in this category runs 20–30%, conversion collapses when a $9 gate sits in front of the first resume (prepaid's 25–41% payer rate comes from spending a grant already in hand), and what survives is largely forgot-to-cancel revenue. **Price is the better lever than model**: at 75c/job the sweep accrues +$1,196 vs +$447 at 50c, with no second billing implementation and no churn assumption. Reopen only if real retention data shows genuine multi-month engagement, or if predictable MRR becomes the goal for fundraising/exit reasons — that is a legitimate trade, just a different one.

Gone with it: `plan_tier` / `is_pro` / `stripe_id` columns, the `subscriptions` tables, `BillingController`, the admin Revenue dashboards (`RevenuePage`, `RevenueReport`, `RevenueSnapshot`, `CaptureRevenueSnapshot`), and forced 2FA (which was gated on the pro tier — 2FA is now opt-in only).

## AI (OpenAI)

`App\Services\AiService::chat(string $prompt, array $options)` — single entry point for all AI features. Logs to `ai_requests` table (user_id, feature, model, tokens, cost, status). Pre-check moderation flags disallowed input (`ModerationException`). Config in `config/ai.php` (`AI_ENABLED`, `OPENAI_MODEL`, `AI_MONTHLY_LIMIT`, pricing). AI is the one metered thing in the app: a **flat monthly cap for every account** (`AI_MONTHLY_LIMIT`, default 150) — a cost control, not a plan gate, since OpenAI spend scales with usage. Per-user escape hatches: `users.ai_limit_override` raises/lowers one account's cap; `users.ai_blocked` kills it entirely.

**AI cost is recorded in micro-cents (1 cent = 1,000,000)** on `ai_requests.estimated_cost_micro_cents`. It used to be `estimated_cost_cents`, and `AiService::estimateCostCents()` ended in `(int) round($cents)` — so anything under half a cent became 0, which is *every* `gpt-4o-mini` call (~0.05¢) including a 15k-token page import. Every OpenAI request ever logged recorded a cost of zero, and everything downstream read that zero: `ai:cost-alert` could not fire at any spend level, and `AiUsageReport` / `AdminStatsOverview` / `AiUsersPage` all reported $0.00. Fixed 2026-07-20 (migration `store_ai_cost_in_micro_cents`, forward-only).

Consequences to keep in mind:

- **All cost history before 2026-07-20 is zero and cannot be recovered** — the precision was lost at write time, not at display. Only Anthropic rows (~20x pricier) held a coarse non-zero, which is why this never looked completely dead.
- **`AiUsageReport` reports costs in micro-cents** under the key `cost_micro_cents`, uniformly across `totals()`, `breakdown()`, and `dailySeries()`. Divide by 100,000,000 for dollars, at display only. The three methods previously returned three different key spellings and the overview blade read a fourth, so the cost tile and both breakdown tables silently rendered blank or $0.00 — don't reintroduce per-method key names.
- `config('ai.pricing')` is still denominated in **cents per 1,000 tokens**, and `ai.daily_alert_threshold_cents` is still in cents. Only the stored column and the report keys changed units.

**Master switch:** `AI_ENABLED` (default true). The `ai_enabled` middleware (`EnsureAiEnabled`, aliased in `bootstrap/app.php`) **404s** every AI route when it's false — 404 not 403, so a suspended feature looks absent rather than like a plan restriction. The `aiEnabled` Inertia prop hides the matching UI.

**Prompts:** `App\Data\AiPrompts::build(string $feature, array $input)` — one `match` over the feature key, throws on unknown. Keys: `rewrite_bullet`, `critique_bullet`, `generate_summary`, `ats_keywords`, `interview_coach`, `cover_letter`.

**Routes** (all under `['ai_enabled', 'throttle:20,1']` in `web.php`): `builder/{resume}/ai/{rewrite-bullet,critique-bullet,summary,ats-keywords}`, `builder/{resume}/interview-coach`, `cover-letters/{letter}/ai/draft`.

**Cover letter draft** (`cover-letters.ai.draft`) requires the letter to have a linked resume — the prompt forbids inventing employers or accomplishments, so with no resume there is nothing to ground the letter in; it 422s rather than let the model make one up. Role/company come from the request, falling back to `users.target_role` and the resume's `target_job_description`.

**Bullet coach:** the bullet editor offers two equal-weight actions — "Coach me" (`critique_bullet`: the model asks what the weak bullet fails to say, the user answers in their own words, and the bullet is rebuilt from *their* facts) and "Write it for me" (`rewrite_bullet`). Deliberate 50/50 — do not demote either to a secondary affordance without asking.

**Registration IP velocity:** Max 5 accounts per IP per 24h. Enforced in `RegisteredUserController::store()` via `registration_ip` column on `users`.

## Admin Panel

Filament v3 panel mounted via `app/Providers/Filament/AdminPanelProvider.php` on a separate subdomain (`config('app.admin_domain')`, `.env` `APP_ADMIN_DOMAIN`, default `admin.resumegen.app`) — not a `/admin` path prefix. Access gated by `User::canAccessPanel()` (implements `FilamentUser`), checking `is_master_admin`. Resources/pages/widgets live in `app/Filament/{Resources,Pages,Widgets}`. `is_master_admin` is non-editable; set directly in DB or via seeder.

**Audit log:** `AdminAuditLog::record(string $action, ?Model $target, string $description, array $meta = [])` — **call this on every privileged admin write action.** Reads `auth()->id()` + `request()->ip()`, swallows exceptions. Append-only `admin_audit_logs` table.

## API Layer

Token-based Sanctum API at `/api`. `config/sanctum.php` sets `'guard' => []` (intentionally empty) — only token-auth works, no session fallback.

**Test base class:** All API tests extend `Tests\Feature\Api\ApiTestCase` (not `Tests\TestCase`). It calls `$this->app['auth']->forgetGuards()` before each request to prevent Sanctum guard cache from masking token revocation.

## System Events

`system_events` (append-only) logs outbound mail (`MessageSent`) via an `AppServiceProvider::boot()` listener. Best-effort — exceptions swallowed. Pruned after 30 days. Surfaced on Ops dashboard. The `channel` column is a holdover from when webhooks were also logged here; `'mail'` is the only value written now.

## Removed Features (do not reintroduce without asking)

Deleted on 2026-07-14 — code, routes, models, migrations, and tests:

- **Resignation letters, proofreading, career coach chat, outbound user webhooks.** Their tables (`resignation_letters`, `proofreading_requests`, `career_coach_messages`, `webhook_endpoints`) may linger as orphans in databases that ran the old migrations — the create-migrations were deleted rather than superseded by a drop, so a fresh `migrate` will not recreate them.
- **Resume translation and career map** — the two most expensive AI features per unit of value. Deleted outright (routes, prompts, controllers, tests), not flagged off.
- **All billing** (see above). Here the create-migrations were kept and a drop migration (`2026_07_14_120000_drop_billing_tables_and_columns`) removes the tables and columns, so both fresh and existing databases converge.
- **Referral rewards** — `ReferralRewardService` / `ReferralEvent` were already gone before this; the reward was a Stripe credit and has no meaning now.

## Key Design Decisions

1. **Single `resumes` table with JSON columns** — frontend owns shape; backend validates as array.
2. **No template React components** — server renders PDF; iframe preview loads it.
3. **Beacon save on beforeunload** — catches unsaved changes. CSRF satisfied via `_token` field in the JSON body (Laravel reads it regardless of content-type).
4. **Append-only analytics tables** — `ResumeShareEvent`, `resume_section_events`, `system_events`, `portfolio_messages`, `admin_audit_logs`. Simple, immutable.
5. **FK cascade for dependents, observer for the rest** — `cascadeOnDelete` handles the simple children; the `deleting` observer only covers recursive A/B variants and thumbnail cleanup. `User` deletes its resumes per-model so that observer always runs.
6. **No monetization** — every feature is free and unlimited; AI is metered only to cap OpenAI spend.
7. **Best-effort system logging** — `try/catch` swallows exceptions so logging never crashes requests.
8. **AI coaches as often as it ghostwrites** — the coach path (ask the user for the missing facts, then rebuild the bullet from their answer) is offered at equal weight to the write-it-for-me path, so the resume stays the candidate's own words.

---

Last updated: 2026-07-14

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
