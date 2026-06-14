# Freemium Conversion Tuning — Design

**Date:** 2026-06-14
**Goal:** Improve free→paid conversion without making signup unattractive. AI cost is negligible (`gpt-4o-mini`, ~0.1¢/generation, ~90%+ gross margin on every paid tier), so the lever is *what the free tier gives away*, not paid pricing.

## Background

Analysis of current economics:

| Tier | Price | AI calls/mo | Max AI cost/mo | Stripe fee | Net margin/user |
|---|---|---|---|---|---|
| Free | $0 | 25 | ~$0.03 | — | −$0.03 |
| Starter | $9 | 150 | ~$0.15 | $0.56 | ~$8.29 |
| Pro | $19 | 500 | ~$0.50 | $0.85 | ~$17.65 |
| Agency | $49 | 1,000 | ~$1.00 | $1.72 | ~$46.30 |

Conclusion: cost is not the risk; conversion is. The free tier is a complete product (2 resumes, 25 AI gens, sharing, portfolio, analytics, heatmaps, messaging) and gives away the highest-value feature (AI). Strategy = "build free, polish paid": keep free attractive to sign up, but gate the high-intent moments (applying to a specific job).

## Scope

Three levers chosen. One is already shipped.

### Change 1 — Free AI monthly limit 25 → 10
- `config/ai.php` → `monthly_limits.free`: `25` → `10`.
- Enforcement already exists via `UserLimits::canUseAi()` in `AiSuggestionController::run()` (returns 402 with upgrade CTA when exceeded). No new code.

### Change 2 — Gate JD-tailoring + ATS-keyword matching to Starter+
The `ats_keywords` feature (`AiSuggestionController::atsKeywords()`) moves behind the paywall. `summary` and `rewrite_bullet` stay free.

- **Backend:**
  - Add `UserLimits::canAiTailoring(User $user): bool` returning `$user->isAtLeastStarter()` (mirrors `canDocx()`).
  - In `atsKeywords()`, before calling `run()`: if `! UserLimits::canAiTailoring($user)`, return a 402 JSON response with `{ error, required_tier: 'starter' }` — the shape the existing `UpgradeModal` / `triggerUpgradeModal` flow already consumes for XHR responses.
- **Frontend (`resources/js/Pages/ResumeBuilder/Edit.tsx`):**
  - `ResumeBuilderController@edit` passes a new `canAiTailoring` prop (alongside existing `canDocx`).
  - The target-job-description textarea + "ATS keywords" button render with a `🔒` locked state for free users; clicking fires `triggerUpgradeModal('AI job tailoring', 'starter')` instead of hitting the endpoint.
  - The strength-scorer "✨ Generate with AI" shortcut tied to the ATS/keyword gap respects the same gate.

### Change 3 — Watermark on free PDFs & share links — ALREADY SHIPPED
Verified during design: both render sites (`ResumeBuilderController::buildPdf()` and `PublicResumeController` PDF download) already pass `'watermark' => $resume->user?->planTier() === 'free'`, and `resources/views/resume-pdf.blade.php` (line ~291) renders the footer. The live-preview iframe uses the same `buildPdf()` path. No work required.

## Decisions
- Gate tier for ATS/tailoring: **Starter** ($9) — the natural "I'm job hunting" entry tier.
- **Uniform** enforcement: no grandfathering of existing free users.

## Out of scope (explicitly not touching)
- Paid tier prices and limits (margins are healthy).
- Free resume count (2), DOCX (already Starter+), template access.
- Watermark (already shipped).

## Testing
- `UserLimits::canAiTailoring()` — unit: false for free, true for starter/pro/agency (use `UserFactory` states).
- `atsKeywords()` — feature: free user → 402 with `required_tier: 'starter'`; starter+ user → reaches AI call (mock `AiService`). Summary/bullet endpoints remain reachable for free users (regression guard).
- Free AI limit: a free user is blocked on the 11th successful AI request this month (was 26th). Update any existing `TierLimitsTest` assertion referencing 25.
- Confirm `canAiTailoring` prop reaches `Edit.tsx` (extend `ResumeBuilderEditPropsTest`).
