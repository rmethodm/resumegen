# Resumegen — Engineering Audit Report
**Date:** 2026-06-10 | **Reviewer:** Claude Code | **Scope:** Full codebase audit, no code changes made

---

## Executive Summary

**Overall Health Grade: B−**

Resumegen is a well-structured, fast-moving SaaS with strong fundamentals: consistent authorization, clean tier-gating, solid test breadth, and good Inertia/Laravel conventions throughout. The codebase punches above its age (3 months, 475 commits). However, three issues are serious enough to demand immediate attention before any marketing-driven traffic increase.

**Top 3 Risks:**
1. **Public PDF/DOCX routes have no rate limiting** — a single share token can be used to hammer DomPDF generation indefinitely, causing DoS or runaway cloud costs.
2. **Public DOCX download bypasses the Starter+ paywall entirely** — any visitor with a share link can download DOCX for free, directly undermining the tier-2 upsell.
3. **Resume validation and duplication logic is silently duplicated between the web and API layers** — drift has already occurred (`section_order`, `custom_sections` missing from API), and it will silently worsen with every new field.

**Top 3 Opportunities:**
1. Extract a shared `ResumeRules` class to eliminate the web/API duplication and make both layers correct by construction.
2. Add a CI pipeline — 482 tests exist and run in ~6 seconds; there's no good reason they aren't running on every push.
3. Close the remaining `two-column` template inconsistency (one task, ~30 minutes) before a confused future engineer reintroduces it.

---

## Repo Map

**Purpose:** SaaS resume builder for job seekers. Users create, style, and export resumes; share public links; track job applications; write cover letters; and manage a personal portfolio page. Freemium pricing: Free / Starter $9 / Pro $19 / Agency $49. Also building toward an iPhone app (Sanctum token API exists).

**Stack:** Laravel 13 / PHP 8.4 / SQLite (dev) · React 18 / TypeScript 5 / Tailwind v3 / Vite 8 · Inertia.js v2 · Stripe Cashier v16 · DomPDF · phpWord · Spatie MediaLibrary

**Maturity:** Production SaaS, ~3 months old, actively developed. Not a prototype.

**Architecture:**
```
Browser → Inertia.js (SPA navigation) → React Pages
                     ↑
Laravel Web Routes (session auth)
  └─ Controller → Policy → UserLimits → Inertia::render()
  └─ Shared props: auth.user, featureGate, flash (HandleInertiaRequests)

Laravel API Routes (Sanctum token auth, for iPhone app)
  └─ Api\* controllers → JSON

Public Routes (unauthenticated)
  └─ /r/{token}     resume view + threads + heatmap events
  └─ /p/{slug}      portfolio
  └─ /career/{slug} SEO blog

PDF: DomPDF → single Blade view (resume-pdf.blade.php), 13 templates inline
Queue: database driver, DeliverWebhook job only active queued work
```

**Key directories:**

| Path | Description |
|---|---|
| `app/Http/Controllers/` | ~60 controllers; flat for features, `Admin/`, `Api/`, `Auth/` sub-namespaces |
| `app/Services/` | `UserLimits` (tier gates), `ResumeStrengthScorer`, `DocxGenerator`, `ReferralRewardService`, `WebhookDispatcher` |
| `app/Models/` | 25 models; `Resume` and `User` are the gravity center |
| `app/Policies/` | 6 ownership-gating policies |
| `resources/js/Pages/` | ~55 React page components by feature domain |
| `resources/js/Pages/ResumeBuilder/` | Core feature: `Edit.tsx` (1,547 lines), `PublicView.tsx`, `Partials/` |
| `resources/views/resume-pdf.blade.php` | Single file containing all 13 template renderings |
| `database/migrations/` | 61 migrations, all feature work June 2026 |
| `extension/` | Chrome MV3 extension — "Job Saver" — outside the PHP/Vite build |
| `tests/Feature/` | 65 test files, 482 tests total |

---

## Audit Report

### Security

| ID | Finding | File:Line | Consequence | Severity |
|---|---|---|---|---|
| S1 | No rate limiting on `GET /r/{token}`, `GET /r/{token}/pdf`, `GET /r/{token}/docx` | `routes/web.php:184–186` | Attacker with N share tokens can DoS PDF generation or run up cloud bills | **Critical** |
| S2 | Public DOCX download has no tier gate | `PublicResumeController.php:85–104` (no `canDocx()` call) | Free-tier users can download DOCX via share link, bypassing the Starter+ paywall | **High** |
| S3 | `org_role` Inertia shared prop is cached for 60s with no invalidation on membership change | `HandleInertiaRequests.php:60` | Evicted/newly-joined members see stale org role in UI for up to 60 seconds | **High** |
| S4 | Impersonation calls `auth()->login($user)` directly, skipping 2FA pipeline | `AdminImpersonationController.php:26` | Behavior undefined when impersonating a Pro user with incomplete 2FA setup | **High** |
| S5 | Thread reply authorization relies on mutable session array (`owned_threads`) | `PublicThreadController.php:62–63` | Session expiry silently revokes legitimate reply ability; shared sessions allow unauthorized reply | **Medium** |

### Architecture & Design

| ID | Finding | File:Line | Consequence | Severity |
|---|---|---|---|---|
| A1 | `resumeRules()` duplicated in web and API controllers; `section_order`, `custom_sections` already missing from API | `ResumeBuilderController.php:195`, `Api/ResumeController.php:116` | Silent drift; any new field added to one won't apply to the other | **High** |
| A2 | `duplicate()` logic duplicated in web and API; API copy silently drops `custom_sections`, `section_order` | `ResumeBuilderController.php:337`, `Api/ResumeController.php:80` | API-duplicated resumes lose data silently | **High** |
| A3 | `->where('is_snapshot', false)` filter scattered across 7 call sites with no model scope | `ResumeBuilderController.php:32,96,139,344`, `AnalyticsController.php:69`, `OrgController.php`, `NudgeStaleResumesCommand.php` | Any snapshot logic change requires finding and updating 7 locations | **Medium** |

### Code Quality

| ID | Finding | File:Line | Consequence | Severity |
|---|---|---|---|---|
| Q1 | `two-column` removed from backend validation but still in `Edit.tsx:150,166`, `NON_ATS_TEMPLATES`, `TEMPLATE_LABELS`, and `resume-pdf.blade.php:219` | Multiple | Incomplete removal; confusing dead code; legacy resumes with `template='two-column'` still render silently | **High** |
| Q2 | `DeliverWebhook` swallows all exceptions silently; `$tries = 3` is never triggered | `DeliverWebhook.php:41` | All webhook failures are invisible; retry logic is dead code | **Low** |
| Q3 | One `auth()->user()` call in a controller that uses `$request->user()` everywhere else | `ResumeBuilderController.php:249` | Minor inconsistency | **Low** |

### Testing

| ID | Finding | Evidence | Consequence | Severity |
|---|---|---|---|---|
| T1 | ~94 `assertOk()`/`assertStatus(200)` assertions with no response body verification | `grep` across Feature tests | Tests confirm "didn't crash" but not "returned correct data" | **Medium** |
| T2 | A/B variant creation and snapshot exclusion from limits have no happy-path tests | Zero hits for `createVariant` or `is_snapshot` in test happy-paths | Bugs in limit-bypass logic would go undetected | **Medium** |

### Performance

| ID | Finding | File:Line | Consequence | Severity |
|---|---|---|---|---|
| P1 | `SectionEventController` fires up to 20 individual INSERTs per beacon call; not in a transaction | `SectionEventController.php:29–35` | 20× DB round-trips per heatmap batch; partial batch committed on failure | **Medium** |
| P2 | `ResumeStrengthSnapshot` has no pruning; grows forever | `StrengthScoreController.php:24–29` | Unbounded table growth for active users | **Medium** |
| P3 | `JobApplicationController::index` fires a redundant `count()` query after already fetching the full collection | `JobApplicationController.php:39` | One wasted `SELECT COUNT(*)` per page load | **Low** |

### DevEx & Operations

| ID | Finding | Evidence | Consequence | Severity |
|---|---|---|---|---|
| D1 | No CI/CD pipeline | No `.github/workflows/` or equivalent | Breaking commits go undetected; Pint violations accumulate until manually caught | **Medium** |
| D2 | Only 2 log calls in the entire application | `grep -rn "Log::"` returns 2 hits | Production debugging relies on DB queries and Stripe logs, not application logs | **Medium** |

### Dependencies

| ID | Finding | Consequence | Severity |
|---|---|---|---|
| Dep1 | `laravel/pao ^1.0.6` in `require-dev`, not used anywhere | Dead dependency | **Low** |
| Dep2 | `typo-js` in `package.json`, zero imports found | Dead ~57KB bundle weight | **Low** |

### Documentation

README is the default Laravel stub (links to laravel.com). 35 brainstorm markdown files in the repo root. No product-level onboarding doc. The `CLAUDE.md` serves as effective internal architecture documentation, but it's not a substitute for a real README. **Everything else is fine** — the code is self-documenting and `CLAUDE.md` + `docs/superpowers/` cover the intent well.

### Strengths (do not disturb)

- **Authorization:** `$this->authorize()` on every mutation, correct policy gates throughout
- **Tier enforcement:** `UserLimits` as a single source of truth, correct fail-safe defaults
- **Billing/Subscription observer:** `isDirty` guard, `lockForUpdate` in referral service
- **Migration quality:** correct FK cascades, no orphan rows possible
- **Beacon endpoint design:** CSRF-in-body, same validation as normal save
- **Test breadth:** 482 tests across all major features
- **`ResumeShareEvent::log` is properly best-effort:** try/catch-and-continue for analytics
- **`EnsureMasterAdmin` middleware:** simple, correct, two lines

---

## Improvement Strategy

### Theme 1: "The Public Surface Is Undefended"

Three of the four Critical/High security findings are on unauthenticated routes. The public resume view and its PDF/DOCX/OG-image derivatives have grown organically without a consistent protection pass.

**Target state:** Every public write route is rate-limited; every public read route that triggers server-side computation (PDF generation, DOCX generation) is rate-limited; tier gates that exist on authenticated routes also apply to their public equivalents.

**Principle:** Unauthenticated routes face a larger threat surface than authenticated ones. Compute-heavy endpoints must be protected regardless of authentication state.

**Done when:** `GET /r/{token}/pdf` and `/docx` have rate limits. Public DOCX checks `canDocx()` against the resume owner's plan. No public compute route is rate-limit-free.

---

### Theme 2: "Web/API Duplication Will Compound"

The web and API layers share a model but diverge in their validation and write logic. Drift has already happened silently. Every new feature added to the web editor that doesn't also land in the API widens this gap.

**Target state:** Resume validation rules and resume copy logic live in one place. Both controllers consume them.

**Principle:** DRY at the boundary that matters — the data contract. The serialization format (JSON vs Inertia) can differ; the validation and write logic must not.

**Done when:** A single `ResumeRules` class is the source of truth for validation. A single `ResumeCopier` service handles duplication. Both web and API controllers delegate to them. API-duplicated resumes include `custom_sections` and `section_order`.

---

### Theme 3: "Half-Finished Removals Leave Landmines"

The `two-column` template is the clearest example: removed from backend validation, still in the frontend constants, still in the Blade PDF view. The pattern from rapid agentic development is: a feature gets removed from one layer but not cleaned up everywhere.

**Target state:** When a feature is removed, it is removed completely from all layers simultaneously, or the partial state is explicitly documented as intentional with a migration path.

**Principle:** Inconsistent state is more dangerous than a deliberate old feature, because it confuses future contributors and produces undefined behavior at edges.

**Done when:** `two-column` exists either fully (restored everywhere) or is fully gone (removed from `Edit.tsx`, `NON_ATS_TEMPLATES`, `TEMPLATE_LABELS`, and the Blade view). No other half-removed features exist.

---

### Theme 4: "Observability Is Near Zero"

Two log calls in a production SaaS. Webhook failures, queue failures, tier sync events, and mail delivery errors all disappear silently. No CI. No scheduled cleanup.

**Target state:** All error paths that are intentionally swallowed emit at minimum a `Log::warning()`. CI runs tests and Pint on every push. Long-running data tables have a scheduled prune.

**Principle:** Silent failures are worse than loud failures in production. You cannot fix what you cannot see.

**Done when:** CI pipeline exists and passes. `DeliverWebhook` logs failures. `ResumeStrengthSnapshot` has a prune schedule. `failed_jobs` is monitored.

---

### Theme 5: "Model Queries Lack Shared Conventions"

The `is_snapshot = false` filter at 7 call sites, the `org_role` cache with no invalidation, and the redundant count queries are symptoms of missing query conventions: no global scopes, no cache invalidation discipline, no query object for repeated patterns.

**Target state:** Repeated query fragments live in model scopes. Cache keys with side effects are cleared where the state changes.

**Principle:** Query conventions should be in models, not callers. Callers should express intent; models should express mechanics.

**Done when:** `Resume::scopeNonSnapshot()` exists. `org_role` cache is forgotten on membership change. No repeated `->where('is_snapshot', false)` in controllers.

---

### What NOT To Fix (deliberate exclusions)

- **Thread reply session auth (S5):** Signed email tokens would be more robust, but this is low-volume, session expiry is an edge case, and the current behavior is reasonable. Not worth a full email-token system at this stage.
- **SQLite → Postgres migration:** The app works correctly on SQLite. The performance ceiling for a sub-10K user SaaS is well beyond what SQLite can handle with proper indexing. Don't migrate databases without a scaling trigger.
- **`OrgController` eager-load optimization (P3):** Minor; fix when org workspace gets real usage.
- **README:** Not worth time writing documentation for a solo-developed product. `CLAUDE.md` serves the actual audience. Revisit when onboarding external contributors.
- **`laravel/pao` investigation:** Just remove it.

---

## Task Plan

### Quick Wins (do immediately, each < 2 hours, no dependencies)

| QW | Task | Closes | Effort |
|---|---|---|---|
| QW1 | Add `throttle:60,1` to `/r/{token}`, `throttle:20,1` to `/r/{token}/pdf` and `/r/{token}/docx` | S1 (Critical) | S |
| QW2 | Add `UserLimits::canDocx($link->resume->user)` check in `PublicResumeController::downloadDocx` | S2 (High) | S |
| QW3 | Remove `two-column` from `Edit.tsx:150,166` and resolve Blade partial (see Open Q1) | Q1 (High) | S |
| QW4 | Replace `auth()->user()` with `$request->user()` in `ResumeBuilderController::downloadDocx:249` | Q3 (Low) | S |
| QW5 | Change `$user->jobApplications()->count()` to `$applications->count()` in `JobApplicationController::index:39` | P3 (Low) | S |
| QW6 | `composer remove laravel/pao` and remove `typo-js` from `package.json` | Dep1, Dep2 | S |
| QW7 | Add `Cache::forget("org_role_{$userId}")` in `OrgInviteController`, `OrgJoinController`, `OrgController` | S3 (High) | S |

---

### Milestone 0 — Safety Net

**M0-1: Add GitHub Actions CI pipeline**
- **Description:** Create `.github/workflows/ci.yml` that runs `php artisan test --compact` and `./vendor/bin/pint --test` on every push and PR. Use PHP 8.4, cache Composer dependencies.
- **Files:** `.github/workflows/ci.yml` (new)
- **Acceptance:** Push a commit with a Pint violation → CI fails. Push a commit with a broken test → CI fails.
- **Effort:** S | **Risk:** None | **Dependencies:** None

---

### Milestone 1 — Critical & High Fixes

**M1-1: Rate limit all public compute routes (S1)**
- **Description:** Add `throttle:60,1` to the public resume view, `throttle:20,1` to public PDF and DOCX. These are per-IP limits. PDF and DOCX are tighter because they're CPU-bound.
- **Files:** `routes/web.php:184–186`
- **Acceptance:** `php artisan route:list` shows throttle middleware on all three public resume routes. Requesting `/r/{token}/pdf` 21 times in one minute returns 429 on the 21st.
- **Effort:** S | **Risk:** Low (permissive limits; recruiters download at <20/min) | **Dependencies:** None

**Implementation sketch:**
```php
// routes/web.php
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/r/{token}', [PublicResumeController::class, 'show'])->name('public.resume');
});
Route::middleware('throttle:20,1')->group(function () {
    Route::get('/r/{token}/pdf', [PublicResumeController::class, 'downloadPdf'])->name('public.pdf');
    Route::get('/r/{token}/docx', [PublicResumeController::class, 'downloadDocx'])->name('public.docx');
});
```
Gotcha: verify lines 184–186 are currently ungrouped before wrapping — they are. Safe to add.

---

**M1-2: Gate public DOCX behind resume owner's tier (S2)**
- **Description:** In `PublicResumeController::downloadDocx`, load the resume's user and check `UserLimits::canDocx($resume->user)`. Return redirect with error message if owner doesn't have DOCX access. Optionally hide the DOCX button in `PublicView.tsx` when owner is free-tier (see Open Q2).
- **Files:** `app/Http/Controllers/PublicResumeController.php:85–104`
- **Acceptance:** Free-tier user's share link DOCX download returns redirect. Starter+ user's share link DOCX streams correctly.
- **Effort:** S | **Risk:** Low | **Dependencies:** None

**Implementation sketch:**
```php
public function downloadDocx(Request $request, string $token)
{
    $link = ResumeShareLink::with('resume.user')->where('token', $token)->firstOrFail();

    abort_if(
        ! $link->is_active || ($link->expires_at && $link->expires_at->isPast()),
        410, 'This link is no longer active.'
    );

    $resume = $link->resume;

    if (! UserLimits::canDocx($resume->user)) {
        return redirect()->route('public.resume', $token)
            ->with('error', 'DOCX download is not available for this resume.');
    }
    // ... rest unchanged
}
```
Gotcha: `$link` already eager-loads `resume.user` on line 87 — no extra query needed.

---

**M1-3: Extract shared resume rules and duplication logic (A1, A2)**
- **Description:** Create `app/Data/ResumeRules.php` with a static `rules()` method returning the full validation array including `section_order` and `custom_sections`. Create `app/Services/ResumeCopier.php` with a `copy(Resume $source, User $owner, string $name): Resume` method. Both `ResumeBuilderController` and `Api\ResumeController` delegate to these. Delete the two private `resumeRules()` methods.
- **Files:** New: `app/Data/ResumeRules.php`, `app/Services/ResumeCopier.php`. Modify: `app/Http/Controllers/ResumeBuilderController.php`, `app/Http/Controllers/Api/ResumeController.php`
- **Acceptance:** `Api\ResumeController::resumeRules()` is deleted. API-duplicated resume includes `custom_sections` and `section_order`. `grep -rn "private static function resumeRules"` returns zero hits.
- **Effort:** M | **Risk:** Low (mechanical delegation, no behavior change) | **Dependencies:** None

**Implementation sketch:**
```php
// app/Data/ResumeRules.php
class ResumeRules {
    public static function rules(): array {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'template' => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats,skills-first,skills-first-visual,academic,bold,timeline'],
            'accent_color' => ['sometimes', 'nullable', 'in:#4f46e5,#1e3a5f,#475569,#166534,#7f1d1d,#1f2937,#0f766e,#78716c'],
            'font_family' => ['sometimes', 'nullable', 'in:sans,serif,mono'],
            'summary' => ['nullable', 'string'],
            'contact' => ['nullable', 'array'],
            'experience' => ['nullable', 'array'],
            'education' => ['nullable', 'array'],
            'skills' => ['nullable', 'array'],
            'certifications' => ['nullable', 'array'],
            'font_sizes' => ['nullable', 'array'],
            'section_order' => ['nullable', 'array'],
            'section_order.*' => ['string'],
            'custom_sections' => ['nullable', 'array'],
        ];
    }

    public static function copyFields(): array {
        return [
            'template', 'accent_color', 'font_family', 'summary', 'contact',
            'experience', 'education', 'skills', 'certifications', 'font_sizes',
            'custom_sections', 'section_order',
        ];
    }
}
```
Gotcha: `ResumeBuilderController::beacon()` also calls `resumeRules()` — include it in the refactor so all three callers switch at once.

---

**M1-4: Invalidate `org_role` cache on membership change (S3)**
- **Description:** Add `Cache::forget("org_role_{$userId}")` to `OrgInviteController::destroy` (member removal), `OrgJoinController::store` (member joining), and `OrgController::store` (new org creation).
- **Files:** `app/Http/Controllers/OrgInviteController.php`, `app/Http/Controllers/OrgJoinController.php`, `app/Http/Controllers/OrgController.php`
- **Acceptance:** Remove a member → their next page load shows no org role immediately. Join org → next load shows `member` role.
- **Effort:** S | **Risk:** None | **Dependencies:** None

---

**M1-5: Resolve `two-column` template inconsistency (Q1)**
- **Description:** Check DB for existing `two-column` resumes. If zero rows: delete from `Edit.tsx` (`NON_ATS_TEMPLATES`, `TEMPLATE_LABELS`), remove the Blade partial, remove from `ResumeTemplate` union in `index.d.ts`. If nonzero rows: write a data migration setting them to `classic`, then delete. If intentionally keeping: restore to backend validation rules.
- **Files:** `resources/js/Pages/ResumeBuilder/Edit.tsx:150,166`, `resources/views/resume-pdf.blade.php:219`, `resources/js/types/index.d.ts`, `database/migrations/` (data fix if needed)
- **Acceptance:** `grep -rn "two-column"` returns zero hits across `app/`, `resources/js/`, OR the template is fully restored in all layers. No partial state.
- **Effort:** S | **Risk:** Low if data migration written first | **Dependencies:** Open Q1

---

### Milestone 2 — High-Leverage Improvements

**M2-1: Add `Resume::scopeNonSnapshot()` model scope (A3)**
- **Description:** Add `scopeNonSnapshot(Builder $query): Builder` to the `Resume` model. Replace all 7 `->where('is_snapshot', false)` call sites with `->nonSnapshot()`.
- **Files:** `app/Models/Resume.php`, `ResumeBuilderController.php`, `AnalyticsController.php`, `OrgController.php`, `NudgeStaleResumesCommand.php`, `BillingController.php`
- **Acceptance:** `grep -rn "is_snapshot.*false"` in `app/Http/Controllers/` returns zero hits.
- **Effort:** S | **Risk:** None | **Dependencies:** None

**M2-2: Replace N-INSERT loop with bulk insert in `SectionEventController` (P1)**
- **Description:** Replace the `foreach` loop with `ResumeSectionEvent::insert([...])` wrapped in a DB transaction. Maps the validated items to insert rows before the single call.
- **Files:** `app/Http/Controllers/SectionEventController.php:29–35`
- **Acceptance:** Sending a batch of 5 section events fires exactly 1 DB INSERT (verified with `DB::listen`). A bad item mid-batch rolls back the entire batch.
- **Effort:** S | **Risk:** Low — `insert()` bypasses model events, but `ResumeSectionEvent` has no observers | **Dependencies:** None

**M2-3: Add structured logging to swallowed error paths (D2)**
- **Description:** Add `Log::warning('...', ['error' => $e->getMessage(), ...])` inside every currently-empty `catch (\Throwable)` block. Applies to: `DeliverWebhook` (endpoint ID + error), `PublicThreadController` ×2 (thread ID + error), `ResumeThreadController` (thread ID + error), `SectionEventController` (resume ID + error). `ResumeShareEvent::log` is correctly silent and stays that way.
- **Files:** `app/Jobs/DeliverWebhook.php:41`, `app/Http/Controllers/PublicThreadController.php:52,85`, `app/Http/Controllers/ResumeThreadController.php:67`, `app/Http/Controllers/SectionEventController.php:39`
- **Acceptance:** Triggering a webhook to an unreachable URL produces a WARNING entry in the application log with endpoint ID and error.
- **Effort:** S | **Risk:** None — additive only | **Dependencies:** None

**M2-4: Add pruning for `ResumeStrengthSnapshot` table (P2)**
- **Description:** Create `app/Console/Commands/PruneStrengthSnapshots.php` that deletes snapshots older than 90 days per resume (retaining at minimum the most recent 60). Wire to `Schedule::command('strength-snapshots:prune')->weekly()` in `routes/console.php`.
- **Files:** `app/Console/Commands/PruneStrengthSnapshots.php` (new), `routes/console.php`
- **Acceptance:** Running the command on a DB with 200+ old snapshots removes all beyond the retention window. Running it on an empty table is a no-op.
- **Effort:** S | **Risk:** Low — destructive only for old data beyond the 30-row display cap | **Dependencies:** None

---

### Milestone 3 — Quality & Polish

**M3-1: Upgrade shallow test assertions to `assertInertia` prop checks (T1)**
- **Description:** For the ~20 most critical tests using `assertOk()` alone on Inertia routes (billing index, dashboard, admin dashboard, cover letter index, job applications index), add `assertInertia` assertions verifying key props are present and correctly typed.
- **Files:** `tests/Feature/BillingTest.php`, `tests/Feature/AdminDashboardTest.php`, `tests/Feature/CareerHubTest.php`, and ~5 others
- **Effort:** M | **Risk:** None — additive | **Dependencies:** None

**M3-2: Add tests for A/B variant creation and snapshot limit exclusion (T2)**
- **Description:** Create `tests/Feature/ResumeVariantTest.php` covering: creating a variant redirects to the new resume with `ab_parent_id` set; deleting a parent deletes variants; snapshot resumes are excluded from the resume count limit check; A/B variant is excluded from the dashboard index.
- **Files:** New `tests/Feature/ResumeVariantTest.php`
- **Effort:** S | **Risk:** None | **Dependencies:** None

**M3-3: Fix `auth()->user()` inconsistency (Q3)**
- **Description:** Single-line change in `ResumeBuilderController::downloadDocx`.
- **Files:** `app/Http/Controllers/ResumeBuilderController.php:249`
- **Effort:** S | **Risk:** None | **Dependencies:** None

---

### Task Summary Table

| ID | Title | Milestone | Effort | Risk | Closes |
|---|---|---|---|---|---|
| M0-1 | Add GitHub Actions CI | 0 | S | None | D1 |
| M1-1 | Rate limit public compute routes | 1 | S | Low | S1 Critical |
| M1-2 | Gate public DOCX behind owner's tier | 1 | S | Low | S2 High |
| M1-3 | Extract `ResumeRules` + `ResumeCopier` | 1 | M | Low | A1, A2 High |
| M1-4 | Invalidate `org_role` cache on membership change | 1 | S | None | S3 High |
| M1-5 | Resolve `two-column` template inconsistency | 1 | S | Low | Q1 High |
| M2-1 | `Resume::scopeNonSnapshot()` model scope | 2 | S | None | A3 |
| M2-2 | Bulk insert in `SectionEventController` | 2 | S | Low | P1 |
| M2-3 | Add `Log::warning()` to swallowed errors | 2 | S | None | D2, Q2 |
| M2-4 | Prune `ResumeStrengthSnapshot` schedule | 2 | S | Low | P2 |
| M3-1 | Upgrade shallow assertions to prop checks | 3 | M | None | T1 |
| M3-2 | Add A/B variant and snapshot tests | 3 | S | None | T2 |
| M3-3 | Fix `auth()->user()` inconsistency | 3 | S | None | Q3 |
| — | Remove `laravel/pao` and `typo-js` | Any | S | None | Dep1, Dep2 |

---

### Definition of Done

| Signal | Target |
|---|---|
| CI | GitHub Actions passes on every push; Pint and tests both gate merges |
| Critical findings | Zero |
| High findings | Zero |
| Public routes | All compute routes rate-limited; public DOCX tier-gated |
| Duplication | Zero instances of `resumeRules()` defined in more than one place |
| Snapshot filter | Zero `->where('is_snapshot', false)` in controllers |
| Logging | Every swallowed `catch (\Throwable)` emits at minimum `Log::warning()` |
| `two-column` | Exists entirely or is entirely gone; no partial state |

---

## Open Questions

**Q1 — `two-column` intent:** Is `two-column` being retired permanently, or temporarily disabled? Check: `SELECT COUNT(*) FROM resumes WHERE template = 'two-column'`. If zero rows, delete everything. If nonzero, write a data migration first.

**Q2 — Public DOCX tier gate UX:** When a free-tier user's public DOCX link is requested by a visitor, what should the experience be? Options: (a) redirect back to public view with an error message; (b) hide the DOCX button from `PublicView.tsx` when owner is free-tier (requires passing `canDocx` as a prop to the public view); (c) prompt visitor to sign up. Option (b) is the cleanest user experience but requires a small backend prop change.

**Q3 — iPhone API completeness:** Is the iPhone app in active development? If so, the `custom_sections` and `section_order` gap in `Api\ResumeController` is an active data-loss bug for mobile users. If the iPhone app is deferred, the API can be treated as lower priority for M1-3.

**Q4 — Queue infrastructure in production:** Is the production environment running a proper queue worker (Supervisor / Horizon / Laravel Cloud workers), or is `QUEUE_CONNECTION=sync`? If sync: all "queued" mails send synchronously on every public thread submit, blocking the HTTP response. `DeliverWebhook` would also block the triggering HTTP request, defeating the purpose of queueing.

**Q5 — Chrome extension future:** The `extension/` directory is a standalone MV3 Chrome extension outside the PHP/Vite build. Is it being actively maintained? Should it live in a separate repo? Its `host_permissions: ["<all_urls>"]` is broad — does it need scoping to specific job boards?
