# AI Suggestions + Quota Enforcement — Design

**Date:** 2026-06-12
**Status:** Approved (design), pending implementation plan
**Scope:** Spec 1 of 2. Tailor-to-job-description is a deliberate fast-follow (see Out of Scope).

## Problem

`AiService` (OpenAI chat + `AiRequest` cost logging) and the quota math in `UserLimits`
(`aiMonthlyLimit`, `aiRequestsThisMonth`, `canUseAi`) are fully built but wired to nothing:
no route, controller, UI, or enforcement consumes them. This spec connects them by shipping
three AI editor features behind one gated pipeline, and enforcing the per-tier monthly cap.

Monthly caps are metered at every tier (config/ai.php): free 10, starter 100, pro 1000,
agency 5000. AI is a metered allowance, not a hard paywall.

## Decisions

- **One pipeline, three features.** All three features share gate → prompt → `AiService::chat` → JSON.
- **Quota counts successes only.** `aiRequestsThisMonth` filters `status='success'`. Errors are
  still logged (for debugging) but never burn a user's allowance.
- **Over-quota is tier-aware.** Free/Starter get an upgrade prompt (upgrading raises the cap);
  Pro/Agency get a plain "used all N this month, resets on the 1st" notice.
- **Usage shown inline** in the editor ("N AI uses left this month"), passed as a prop. No second surface.
- **XHR, not Inertia visits.** Endpoints return JSON; the frontend applies results in place.

## Architecture

### Reused unchanged
- `App\Services\AiService::chat($prompt, ['user'=>, 'feature'=>])` — OpenAI call + `AiRequest` logging.
- `config/ai.php` — model, `monthly_limits`, `pricing`.

### Changed (small)
- `UserLimits::aiRequestsThisMonth(User)` — add `->where('status', 'success')` to the count.
- `UserLimits::aiRemaining(User): int` — `max(0, aiMonthlyLimit - aiRequestsThisMonth)`.
- `UserLimits::aiCanUpgrade(User): bool` — `true` for `free`/`starter`, else `false`.
- `UserLimits::aiNextTier(User): ?string` — `free`→`'starter'`, `starter`→`'pro'`, else `null`.
  Drives the `next_tier` field in the over-quota response.

### New
- `App\Data\AiPrompts` — pure, dependency-free prompt builder.
  `build(string $feature, array $input): string`, one branch per feature key. Unit-testable alone.
- `App\Http\Controllers\AiSuggestionController` — three actions sharing a private `run()` helper.
- `resources/js/hooks/useAiSuggestion.ts` — wraps the XHR POST, 402/503 handling, and local
  `remaining` decrement, so the three UI triggers stay thin.

## Endpoints

All under `auth`, resume ownership-gated via `ResumePolicy` (route-model-bound `{resume}`),
rate-limited `throttle:20,1`. Feature keys match the `feature` column logged on `AiRequest`.

| Route (named `builder.ai.*`) | Body | Success response |
|---|---|---|
| `POST /builder/{resume}/ai/rewrite-bullet` | `{ text: string }` | `{ suggestion: string, remaining: int }` |
| `POST /builder/{resume}/ai/summary` | `{}` (reads resume server-side) | `{ suggestion: string, remaining: int }` |
| `POST /builder/{resume}/ai/ats-keywords` | `{ role?: string }` | `{ keywords: string[], remaining: int }` |

Feature keys: `rewrite_bullet`, `generate_summary`, `ats_keywords`.

### Shared `run()` helper
1. `$this->authorize('update', $resume)` (ownership).
2. If `! UserLimits::canUseAi($user)` → 402 (see Error Handling).
3. `$prompt = AiPrompts::build($feature, $input)`.
4. `$reply = $this->aiService->chat($prompt, ['user' => $user, 'feature' => $feature])`
   wrapped in try/catch → 503 on `Throwable`.
5. Return JSON with the feature-shaped payload plus `remaining => UserLimits::aiRemaining($user)`.

For `ats-keywords`, the controller splits the model's reply into a string array (newline/comma
split, trimmed, empties dropped) before returning `keywords`.

## Data flow & error handling

| Outcome | HTTP | Body | Frontend |
|---|---|---|---|
| Success | 200 | `{ suggestion \| keywords, remaining }` | apply to field / render chips, set `remaining` |
| Over quota | 402 | `{ error, can_upgrade, next_tier, limit, used, resets_at }` | `can_upgrade` → `triggerUpgradeModal('ai', next_tier)`; else plain toast `"You've used all {limit} AI requests this month. Resets {resets_at}."` |
| OpenAI failure | 503 | `{ error: 'AI is temporarily unavailable. Try again.' }` | toast. Error row logged by `AiService`, **not** counted toward quota |
| Validation | 422 | standard Laravel | inline field error |

`resets_at` = `now()->startOfMonth()->addMonth()` formatted (e.g. "Jul 1"). The gate check
happens before any OpenAI call, so an over-quota request creates no `AiRequest` row.

### Validation
- `rewrite-bullet`: `text` required, string, `max:2000`.
- `ats-keywords`: `role` nullable, string, `max:200`.
- `summary`: no body; aborts 422 if the resume has no experience/skills to summarize.

## Frontend (Edit.tsx, additive only)

- New props from `ResumeBuilderController@edit`: `aiRemaining: int`, `aiCanUpgrade: bool`.
- Inline indicator: "✨ {aiRemaining} AI uses left this month" near the AI affordances.
  All AI buttons disabled when `aiRemaining === 0`.
- **Rewrite bullet** — "✨ Improve" button per experience bullet → replaces that bullet's text
  in place; the existing onBlur save persists it (user can edit/undo by normal typing).
- **Generate summary** — "✨ Generate" beside the summary field → fills the summary field.
- **ATS keyword gaps** — "✨ Keyword gaps" → uses `userPersona.target_role` as default `role`
  (or a small inline role input when unset) → renders returned keywords as read-only chips.
  No auto-apply.
- `useAiSuggestion` hook decrements the local `aiRemaining` on each success and centralizes the
  402 (tier-aware) and 503 (toast) handling.

## Testing

Feature tests bind `OpenAI::fake([...])` — **no real API calls**. `tests/Feature/AiSuggestionTest.php`:
- Gate blocks at limit → 402, `can_upgrade` correct per tier, no new `AiRequest` row created.
- Success → 200, correct payload shape, `AiRequest` logged with matching `feature` tag and
  `status='success'`, `remaining` decremented.
- OpenAI throws → 503, error row logged with `status='error'`, quota count unchanged.
- `aiRequestsThisMonth` ignores `error` rows (seed mixed rows, assert count).
- Cross-user resume → 403.
- Validation failures → 422.

Unit test `tests/Unit/AiPromptsTest.php`: `build()` returns a non-empty prompt containing the
input for each of the three feature keys; unknown key throws.

Use `UserFactory` tier states (`->free()`, `->starter()`, `->pro()`) and `AiRequestFactory`.

## Boundaries

- `AiPrompts` — pure prompt construction, no I/O. Change prompts without touching HTTP/gate.
- `AiSuggestionController` — HTTP, authorization, gate orchestration only.
- `UserLimits` — quota arithmetic (single source of truth for limits).
- `AiService` — OpenAI transport + logging (untouched).
- `useAiSuggestion` — client transport + quota-state + error UX.

Each is understandable and testable without reading the others' internals.

## Out of scope (fast-follow Spec 2)

- **Tailor-to-job-description.** Reuses this exact pipeline (`AiPrompts` entry + endpoint) but
  adds a JD input panel and a multi-field suggestion review/apply (diff) flow — materially more
  UI than the three features here, so it gets its own spec.
- Enforcing `monthly_limits` anywhere other than these AI endpoints.
- A Billing/Settings usage surface (only the inline editor indicator ships now).
