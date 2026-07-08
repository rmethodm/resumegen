# Onboarding Template Preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third onboarding step showing all 9 templates (5 locked for free users) before the user ever reaches the builder, so premium template value is visible at signup instead of discovered later. Currently the wizard (`resources/js/Pages/Onboarding/Wizard.tsx`) is only 2 steps (career context, contact info) and redirects straight to `/dashboard` with zero template exposure.

**Context (verified current state):**
- `OnboardingController::store()` validates step-1/2 fields, sets `has_completed_onboarding = true`, redirects to `dashboard` — this plan adds a step in between, does not change the final redirect target.
- Template registry: `UserLimits::ALL_TEMPLATES` (9 keys) / `UserLimits::FREE_TEMPLATES` (4 keys: classic, modern, minimal, ats) / `UserLimits::allowedTemplates(User $user)`. `TEMPLATE_LABELS` (frontend) and `/images/templates/{key}.png` thumbnails already exist — reuse both, don't redefine.
- Locked-thumbnail treatment to copy verbatim from `Edit.tsx` (~lines 721-752): `opacity-60` + 🔒-prefixed label on locked templates; click on a locked one calls `triggerUpgradeModal('template_access', 'starter')` instead of selecting.
- No template preference is stored on `User` today. This plan adds one nullable column so a free-tier pick actually pre-fills the user's first resume (keeps the step from being pure filler).

**Tech Stack:** Laravel 13, PHP 8.4, Inertia v2, React 18/TS.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `database/migrations/2026_07_08_100100_add_preferred_template_to_users_table.php` | Store the onboarding pick |
| Modify | `app/Http/Controllers/OnboardingController.php` | Accept step-3 field, expose template data to the view |
| Modify | `resources/js/Pages/Onboarding/Wizard.tsx` | Add `Step = 1 \| 2 \| 3`, render template grid on step 3 |
| Modify | `app/Http/Controllers/ResumeBuilderController.php` (`store`) | Default new resume's `template` from `user->preferred_template` when set and allowed |
| Modify | `tests/Feature/OnboardingTest.php` | Cover new step |

---

## Task 1: Migration

- [x] `php artisan make:migration add_preferred_template_to_users_table --table=users`
- [x] `$table->string('preferred_template')->nullable();` in `up()`, drop in `down()`.
- [x] `php artisan migrate`.

## Task 2: Backend — `OnboardingController`

- [x] `show()`: pass `allowedTemplates` (via `UserLimits::allowedTemplates($request->user())`) and `allTemplates` (`UserLimits::ALL_TEMPLATES`) as Inertia props so the wizard can render the full grid with correct lock state without a second request.
- [x] `store()`: accept optional `preferred_template` (`nullable, string, in:<the 9 keys>` — reuse the same validation list as `ResumeRules.php`). If provided, save on `User` regardless of whether it's a locked template (storing the *intent* is fine even if they can't use it yet — it becomes a meaningful upgrade signal, and if they upgrade later their preference is already set).
- [x] "Skip" path (existing) leaves `preferred_template` null — unchanged behavior otherwise.

## Task 3: Frontend — `Wizard.tsx`

- [x] Change `type Step = 1 | 2` → `1 | 2 | 3`.
- [x] Step 2's submit button changes from "Finish" (posting immediately) to "Continue" (advances to step 3 client-side, no request — matches the existing step-1→2 pattern which is also client-side).
- [x] New Step 3: grid of all 9 template thumbnails using `TEMPLATE_LABELS` + `/images/templates/{key}.png`, selectable state, locked ones dimmed with 🔒 and clicking triggers `triggerUpgradeModal('template_access', 'starter')` instead of selecting. Selecting an unlocked one just sets local `preferred_template` state — no requirement to pick one.
- [x] Step 3 has both "Finish" (posts `preferred_template` + all prior step data via `onboarding.store`) and "Skip for now" (posts without `preferred_template`, same as today's skip).
- [x] Update step-indicator dots component from 2 to 3 dots.

## Task 4: Pre-fill new resumes from the preference

- [x] In `ResumeBuilderController::store()`, when creating a resume and no `template` was explicitly supplied in the request, default to `$request->user()->preferred_template` **only if** it's in `UserLimits::allowedTemplates($request->user())` (never silently apply a locked template) — otherwise fall back to the existing default (`classic` or whatever `store()` already defaults to).

## Testing

- [x] `OnboardingTest`: step-3 field is optional and nullable; valid template key saves to `users.preferred_template`; invalid key rejected by validation; skip leaves it null; locked template key is still saved (intent capture) if submitted — assert no server-side gating blocks storing a locked pick, only *applying* it later is gated.
- [x] `ResumeBuilderController::store()` test: user with an allowed `preferred_template` set → new resume defaults to it; user with a locked `preferred_template` set → new resume falls back to the existing default, not the locked template.
- [x] Existing `OnboardingTest` assertions (has_completed_onboarding, redirect target, contact fields) — confirm unaffected by the added step.

## Rollout

Additive migration + one new step in an existing flow; no billing/Stripe/AI changes. The only cross-cutting risk is the `ResumeBuilderController::store()` default-template change — keep it a narrow, explicitly-gated fallback so it can't leak a locked template to a free resume.
