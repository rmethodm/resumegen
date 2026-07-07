# Career Map — Design Spec

Date: 2026-07-05
Status: Approved for planning

## Problem

Competitive research against kickresume.com (`2026-07-05-kickresume-competitive-gap-analysis.md`)
identified "Career Map / AI Career Coach" as a gap. `CareerHubController` already exists but is a
static, curated article library — not AI-driven guidance — so this is genuinely unbuilt. Kickresume
bundles two distinct things under this label: a one-shot "Career Map" (AI suggests career-path
directions from resume content) and an open-ended, multi-turn "AI Career Coach" chat. These differ
enough in scope to design separately.

## Goals

- Let Pro/Agency users click a button on the Resume Builder page and get 3 AI-suggested career-path
  directions, each with a title, reasoning tied to their resume, and skills/experience to build
  toward it.
- Reuse the existing one-shot AI infrastructure exactly (`AiSuggestionController`'s shared `run()`
  helper, `AiPrompts`, `UserLimits` tier/quota gating) rather than building new plumbing.

## Non-goals

- **AI Career Coach** (multi-turn conversational guidance) — noted here as a likely future
  follow-on, not designed now. It needs conversation storage and a more open-ended prompt; out of
  scope for this spec.
- **Caching** — unlike the ATS score (`ats_cache` column) or `ats_keywords`/`generate_summary`
  (request-scoped `Cache::put` keyed on input hash), Career Map does not cache. Every click
  regenerates and consumes one AI quota unit. Simpler, and Pro/Agency-only gating keeps volume low.
- **Resume edits triggered by output** — Career Map surfaces suggestions; it does not write back to
  the resume or link into `rewrite_bullet`/`generate_summary`.

## Data model

No schema changes. No new table, no cache columns. Reuses the existing `ai_requests` quota-logging
table with a new `feature` value (`'career_map'`).

## Backend

**`UserLimits::canCareerMap(User $user): bool`** — new method:
```php
return in_array($user->planTier(), ['pro', 'agency'], true);
```

**`AiSuggestionController::careerMap(Request $request, Resume $resume): JsonResponse`** — new
method, following the existing `atsKeywords` shape:
1. `$this->authorize('update', $resume)`
2. Tier gate: if `! UserLimits::canCareerMap($user)`, return 402
   `{ error: 'Career Map is a Pro feature.', required_tier: 'pro' }`
3. Build input: `experience` and `skills` from the resume (same fields `generate_summary` uses)
4. Call the existing private `run($user, 'career_map', $input, $shape)` helper — **no `$cacheKey`
   argument** (per the no-caching decision), so quota/moderation/failure handling is identical to
   `rewriteBullet`'s call shape.
5. `$shape` callback: `json_decode($reply, true)` → if not a non-empty array, let `run()`'s existing
   malformed-response path apply (503, matching `interview_coach`'s fallback); otherwise return
   `['paths' => array_slice(array_values($decoded), 0, 3)]`.

**Route** (`routes/web.php`, alongside the other `builder.ai.*` routes):
```
POST /builder/{resume}/ai/career-map    builder.ai.career-map
```

**`AiPrompts::build('career_map', ['experience' => ..., 'skills' => ...])`** — new prompt, added as
a new match arm. Structured JSON response format (like `interview_coach`), instructing the model to
return exactly 3 career-path suggestions:
```json
[
  { "title": "Engineering Manager", "reasoning": "...", "skill_gaps": ["...", "..."] },
  { "title": "...", "reasoning": "...", "skill_gaps": ["..."] },
  { "title": "...", "reasoning": "...", "skill_gaps": ["..."] }
]
```

## Frontend

**`resources/js/Pages/ResumeBuilder/Partials/CareerMapPanel.tsx`** — new panel, same collapsible
shell as `AtsMatchPanel.tsx` (header with "✨ AI" badge, open/closed toggle via local `open` state).
No input field (nothing to paste) — just a "Generate" button and the result list. Each path renders
as a card: title (bold), reasoning (paragraph), skill gaps (bulleted list or pill tags, matching the
existing amber-pill style used for ATS keyword gaps).

Uses the existing `useAiSuggestion` hook pointed at the new `builder.ai.career-map` endpoint — same
integration pattern as the other AI panels in `Edit.tsx`.

Added to `Edit.tsx`'s sidebar alongside `AtsMatchPanel` and the other AI panels.

**Tier gating UI:** Free/Starter users see the panel in a locked/upgrade state (consistent with how
other Pro-gated UI signals an upgrade is required) rather than the panel being hidden. A 402 response
triggers `triggerUpgradeModal('career_map', 'pro')`.

## Error handling

All paths reuse `AiSuggestionController::run()`'s existing handling — no new error paths:
- Free/Starter → 402 `{ error, required_tier: 'pro' }` (tier gate, checked before `run()` is called)
- Monthly AI quota exhausted → 402, existing shape from `run()`
- Moderation-flagged resume content → 422, `ModerationException::USER_MESSAGE`
- AI service failure or malformed/non-array JSON reply → 503, generic retry message

## Testing

- `tests/Feature/CareerMapTest.php` (mirrors `tests/Feature/AiSuggestionTest.php` patterns):
  - 402 for Free/Starter users
  - 200 with 3 paths (`title`/`reasoning`/`skill_gaps` each) for Pro/Agency
  - 402 on monthly AI quota exhaustion
  - 422 on moderation rejection
  - 503 on AI service failure and on malformed/non-array JSON reply
- Unit test in `tests/Unit/AiPromptsTest.php` covering the new `career_map` prompt-building branch.

## Rollout

No new external dependencies or env vars — reuses the existing `AiService`/OpenAI configuration and
the existing quota-accounting table (`ai_requests`, new `feature: 'career_map'` value).
