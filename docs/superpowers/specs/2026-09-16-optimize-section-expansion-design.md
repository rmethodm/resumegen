# Optimize section expansion: free checks + AI critique

Date: 2026-09-16
Status: approved (design), pending implementation plan

## Context

The Optimize tab currently has: `ScoreRingTrio` (completeness ring, JD-match
ring, a "coming soon" locked AI-score ring), a JD paste box, and
`jdKeywordOverlap` (exact-wording keyword match, deterministic, free).

A prior spec (`2026-09-09-ai-review-and-bullet-rewrite-ui-design.md`) planned
a full-resume AI review ("Coach" tab) gated by a free-count limiter
(`AiUsageLimiter`, 10 requests/24h). That gate model is dead — as of
2026-09-10 the app moved to subscription + AI credit ledger
(`AiCreditService`). `AiService::reviewResume()` / `rewriteSection()` remain
unrouted orphans. This spec supersedes the AI-gating mechanism of the old
one; it does not reuse the old spec's Coach-tab-as-separate-tab structure or
its free-count cost control.

Goal: make Optimize the single, powerful home for resume optimization —
deterministic checks free for everyone, AI critique gated by credits, in one
tab (not split), since many users won't have AI credits and shouldn't see an
empty second tab.

## Goals

- Four new deterministic checks (ATS parseability, weak language,
  quantification, readability), free, client-side, no AI credit spend.
- Guidance popups explaining each of the 4 checks and how to fix flagged
  issues — scoped to these checks only, not a general per-section help
  system.
- One AI-powered full-resume critique, credit-metered via the current
  `AiCreditService` model, with 5 selectable presets that change the prompt
  but share one result shape and one endpoint.
- Non-subscribers see a locked/upsell state inline in Optimize, not a
  separate empty tab.

## Non-goals

- No per-bullet AI rewrite, no AI gap-fill bullet drafting, no separate AI
  "fit verdict" feature — out of scope for this pass (may be requested
  later).
- No separate "Coach" tab — everything lives in Optimize.
- No general per-section how-to-fill-out help system across the whole
  Workstation — only the 4 new checks get guidance popups.
- No auto-triggered re-critique on edits — explicit "Re-review" only.
- No new paid tiers, no changes to the $9.95 subscription or credit-pack
  mechanics themselves.

## 1. Free deterministic checks

`resources/js/lib/optimize-checks.ts` — four pure functions, each following
the existing `jdKeywordOverlap` pattern (pure function of `ResumeDraft`,
computed client-side on every render):

- `atsParseabilityCheck(resume)` — flags the resume if its selected template
  is a known multi-column/graphical template unsafe for ATS parsers.
  Template safety list to be confirmed against the actual template registry
  at implementation time.
- `weakLanguageCheck(bullets)` — word-list/regex scan per bullet for passive
  voice and weak openers ("responsible for", "helped with", "worked on",
  etc.).
- `quantificationCheck(bullets)` — flags bullets containing no digit, `%`,
  or currency symbol.
- `readabilityCheck(bullets)` — flags bullets outside a reasonable length
  band (too short / too long) and flags overall resume density likely to
  overflow one page.

Each returns `{ status: 'pass' | 'warn', issues: { bulletId: string;
message: string }[] }`.

## 2. Optimize checklist UI

New `resources/js/Components/workstation/optimize-checklist.tsx`:

- Renders all 4 checks as cards (shadcn `Card` + `Badge` for pass/warn
  count), placed below `ScoreRingTrio`, above the JD textarea in
  `optimize-panel.tsx`.
- Each card has an info icon opening a shadcn `Dialog` — static content
  explaining what the check means and how to fix flagged issues. No AI, no
  persistence, no dynamic content.
- Each flagged issue is clickable, reusing `score-coach.tsx`'s existing
  jump-to-bullet logic.

## 3. AI critique backend

`AiService::reviewResume(User $user, array $resumeData, ?string $jd, string
$preset): array` — model `gpt-4o`, low temperature (~0.3), `response_format:
json_schema`. Prompt template selected by `$preset`. Suggestion shape
(mirrors `ScoreChecklistItem`'s `section` field, matching the old spec's
design so `score-coach.tsx`'s jump logic is reusable):

```
{
  id: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
  section: 'contact' | 'summary' | 'experience' | 'skills' | 'education';
  detail: string;
}
```

Presets: `general`, `tailor_jd` (only selectable when a JD is pasted),
`concise`, `leadership`, `quantify`.

Migration: `resumes.ai_review` (json, nullable), `ai_review_generated_at`
(timestamp, nullable), `ai_review_preset` (string, nullable) — cache blob,
same category as the existing `section_order` column (deliberate exception
to "relational content, not JSON columns").

`AiSuggestionController::reviewResume(Request, Resume, AiService,
AiCreditService)`:

- Inline ownership check (`abort_unless($resume->user_id ===
  $request->user()->id, 404)`), matching every other controller — no
  `ResumePolicy`.
- Gate: `subscribed('default')` + balance ≥ 3 credits + not `ai_blocked`.
  402 = not subscribed or insufficient credits. 429 = `ai_blocked`. Matches
  the documented convention in `CLAUDE.md`.
- On success: debits 3 credits from `ai_credit_ledger`, saves
  `ai_review` / `ai_review_generated_at` / `ai_review_preset` onto the
  resume, returns the result. On OpenAI failure: no partial write, existing
  cache untouched, flash error.
- Route: `POST /resumes/{resume}/ai-review`, `auth` + `throttle:20,1`,
  inside the authenticated group.

## 4. AI critique frontend

New `resources/js/Components/workstation/ai-critique-panel.tsx`, card in
Optimize below the free checklist:

- Not subscribed or insufficient credits → locked state, same visual
  language as `ScoreRingTrio`'s existing dashed/lock AI-score card, CTA to
  `/billing/checkout` or `/billing/credits`.
- Subscribed with credits → preset `Select` (shadcn) defaulting to
  "General critique", "Run critique" button showing the 3-credit cost, then
  POST to the new endpoint.
- Loading state while in flight.
- Result: grouped by severity, each item clickable to jump to its section
  (reusing `score-coach.tsx`'s jump logic). Shows cached `ai_review` with
  "Last reviewed X ago" (from `ai_review_generated_at`) if present, "Re-run"
  button to explicitly regenerate — never auto-triggers on edits.
- `ScoreRingTrio`'s third ring changes from permanently "Coming soon"/locked
  to reflecting live critique state once this ships (exact ring value TBD
  at implementation — likely count or absence of high-severity findings;
  confirm during implementation rather than guessing here).

## 5. Error handling

- 402 → inline "Subscribe or buy credits" CTA, not a toast.
- 429 (`ai_blocked`) → "AI unavailable" message, no retry affordance.
- OpenAI/API failure → flash error, cache untouched.

## 6. Testing

- Pest: extend `AiSuggestionTest` for `reviewResume` covering all 5
  presets (`OpenAI::fake()`), credit-debit assertion, 402/429 paths,
  cache-column assertions, ownership-check 404.
- Vitest: unit tests for the 4 free-check pure functions; component tests
  for `optimize-checklist.tsx` (render + jump interaction) and
  `ai-critique-panel.tsx` (locked / unlocked / preset-selection /
  result-display states).
- Live browser verification (per this repo's Verification Policy): a
  subscribed user with credits runs a critique for real and sees results; a
  non-subscribed user sees the locked state; free checks correctly flag
  real weak/unquantified bullets in a test resume.

## Open questions for implementation time

- Exact ATS-unsafe template list — confirm against the real template
  registry (`Resume::TEMPLATES` or the frontend equivalent), not guessed
  here.
- Exact weak-language word list and quantification regex — reasonable
  defaults to be chosen and reviewed during implementation, not
  over-specified here.
- `ScoreRingTrio`'s third ring's exact value formula once critique is live
  (e.g. "no high-severity findings" vs. a computed score) — confirm during
  implementation.
