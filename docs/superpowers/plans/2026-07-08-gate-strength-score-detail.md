# Gate Strength Score Detail Behind Starter+ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the top-level completion score (the progress bar already shown on `Edit.tsx`, backed by `ResumeCompletionScorer`) free for all tiers as a teaser, but gate the detailed strength-score breakdown (`StrengthScorePanel.tsx` / `ResumeStrengthScorer` checklist) behind Starter+, since that's where the actionable "why" and next-step nudge live — the thing worth paying for.

**Context (verified current state, not the design doc's target state):**
- `ResumeCompletionScorer::score()` — simple weighted score, powers the top progress bar in `Edit.tsx`, passed as an Inertia prop from `ResumeBuilderController`. **Stays free, unchanged.**
- `ResumeStrengthScorer::score()` (`app/Services/ResumeStrengthScorer.php`) still returns the flat `checklist` array described in `2026-07-01-score-breakdown-ui-design.md` — that redesign (category grouping) was speced but **never implemented**; this plan does not depend on it and doesn't need to wait for it.
- `StrengthScoreController::show()` (`app/Http/Controllers/StrengthScoreController.php`) has **no tier check today** — any authenticated owner of the resume gets the full checklist + tip via `GET /builder/{resume}/strength-score`.
- `AtsMatchPanel`'s AI keyword-gap endpoint (`AiSuggestionController::atsKeywords`) is **already gated** to Starter+ via `UserLimits::canAiTailoring()` — don't touch that, it's done.
- Gating convention for a 402 JSON response used elsewhere: `atsKeywords()` returns `response()->json(['error' => '...', 'required_tier' => 'starter'], 402)`; frontend calls `triggerUpgradeModal(feature, requiredTier)` from `resources/js/Components/UpgradeModal.tsx` on catching a 402.

**Tech Stack:** Laravel 13, PHP 8.4, Inertia v2, React 18/TS.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `app/Services/UserLimits.php` | Add `canViewStrengthDetail(User $user): bool` |
| Modify | `app/Http/Controllers/StrengthScoreController.php` | Gate `show()` behind the new check |
| Modify | `app/Http/Controllers/ResumeBuilderController.php` (`edit`) | Pass `canViewStrengthDetail` prop |
| Modify | `resources/js/Pages/ResumeBuilder/Partials/StrengthScorePanel.tsx` | Locked state + upgrade trigger |
| Modify | `tests/Feature/StrengthScorePanelTest.php` (or equivalent) | Update/add gating assertions |

---

## Task 1: `UserLimits::canViewStrengthDetail()`

- [x] Add `public static function canViewStrengthDetail(User $user): bool { return $user->isAtLeastStarter(); }` — mirrors `canAiTailoring()`/`canDocx()` naming and shape exactly.

## Task 2: Gate the controller

- [x] In `StrengthScoreController::show()`, after `$this->authorize('update', $resume)`, add:
  ```php
  if (! UserLimits::canViewStrengthDetail($request->user())) {
      return response()->json([
          'error' => 'Detailed strength scoring is a Starter feature.',
          'required_tier' => 'starter',
      ], 402);
  }
  ```
  Inject `Request $request` into the method signature (currently only takes `Resume $resume`).

## Task 3: Pass a prop so the frontend can show the locked state without an extra round-trip

- [x] In `ResumeBuilderController::edit()`, add `'canViewStrengthDetail' => UserLimits::canViewStrengthDetail($request->user())` to the Inertia props (alongside existing `canDocx`/`canAiTailoring`-style props).

## Task 4: Frontend — `StrengthScorePanel.tsx`

- [x] Accept `canViewStrengthDetail` prop (threaded down from `Edit.tsx`, same pattern as `canDocx`).
- [x] When `false`: keep the panel visible but render a blurred/locked checklist (reuse the `opacity-60` + 🔒 treatment already used for locked templates in `Edit.tsx` lines ~721-752) with a single CTA: "See your full strength breakdown — Upgrade to Starter", calling `triggerUpgradeModal('strength_detail', 'starter')` on click instead of fetching `/builder/{resume}/strength-score`.
- [x] When `true`: unchanged existing fetch/render behavior.
- [x] The top completion-score progress bar in `Edit.tsx` is untouched — still renders for everyone regardless of this flag.

## Testing

- [x] `StrengthScoreController` feature test: free user → 402 with `required_tier: starter`; Starter/Pro/Agency user → 200 with existing checklist shape (regression guard, unchanged from today).
- [x] `UserLimits::canViewStrengthDetail()` unit test: false for free, true for starter/pro/agency (reuse `UserFactory` states as in `UserLimitsTest`).
- [x] `ResumeBuilderEditPropsTest`-equivalent: assert `canViewStrengthDetail` prop present and correct per tier.
- [x] Frontend: no existing test suite for this component confirmed — skip unless one already exists; if `StrengthScorePanel.test.tsx` exists, add a locked-state render assertion.

## Rollout

Pure gating change on an already-built, already-shipped feature. No migration, no new AI cost, no Stripe change. Low risk — same shape as the `atsKeywords` gate already shipped in `2026-06-14-freemium-conversion-tuning-design.md`.
