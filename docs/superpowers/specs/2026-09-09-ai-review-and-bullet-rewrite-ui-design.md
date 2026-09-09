# AI expansion: bullet-rewrite UI + full-resume review ("Coach" tab)

Date: 2026-09-09
Status: approved (design), pending implementation plan

## Context

As of 2026-09-09, `AiService::rewriteBullet()` (gpt-4o-mini) exists on the
backend with a working, tested endpoint (`POST /ai/rewrite-bullet`), but
nothing in `Workstation.tsx` calls it yet. `AiUsageLimiter` caps free usage
at 10 requests/24h per user (shared across all AI features), and
`ai_requests.cost_micro_cents` exists but is never populated.

This spec covers two changes, in order:

1. Wire the existing bullet-rewrite endpoint into the Workstation editor.
2. Add a new full-resume review feature (a "Coach" tab), which needs new
   backend capacity (a costlier model, JD-aware prompting, persisted
   results) beyond what `rewriteBullet()` provides.

A cost-control change touches both: the count-based usage cap is disabled
(kept as dead-but-cheap-to-revive code), replaced by populating real
per-request cost so spend is visible even though nothing enforces on it yet.

## Goals

- Ship the already-built bullet-rewrite feature into the UI.
- Add a full-resume, prioritized-suggestion review, factoring in the pasted
  job description when present.
- Keep cost visible (logged) without blocking usage on the old count cap.
- Reuse existing patterns (`ScoreChecklistItem` shape, inline ownership
  checks, `OpenAI::fake()` test style) rather than inventing new ones.

## Non-goals

- No `aiEnabled` Inertia prop, no feature flag, no billing/tier gating —
  consistent with the existing bullet-rewrite feature having none.
- No chat interface, no multi-turn coaching, no resume translation, no
  career map — all explicitly out of scope per `CLAUDE.md`.
- No UI surfacing of `cost_micro_cents` — logged for later use, not
  displayed anywhere in this pass.

## 1. Cost control

`app/Services/AiUsageLimiter.php`:

```php
public function allows(User $user): bool
{
    return ! $user->ai_blocked;
}
```

`remaining()` and `ai_limit_override` stay in place (unused by the gate,
cheap to re-wire later) — this is a deliberate, intentional dead path, not
an oversight, so it's called out here rather than silently left.

`AiService` gains a small per-model pricing map (approximate, point-in-time
snapshot of OpenAI's published per-token rates — needs periodic
verification against the OpenAI pricing page, since it's not fetched
dynamically) and computes `cost_micro_cents` from
`$response->usage->promptTokens` / `completionTokens` on every call,
passed into the existing `$user->aiRequests()->create()`.

## 2. Bullet-rewrite UI wiring

No new backend code — `POST /ai/rewrite-bullet` already exists and is
tested (`tests/Feature/AiSuggestionTest.php`).

In the Workstation's `bullets-editor` component: a "Rewrite with AI" action
per bullet.

- POST to the existing endpoint with `{ bullet, target_role }` and the
  app's existing CSRF convention for one-off non-Inertia actions.
- Loading state while in flight.
- Result shown as a suggestion the user must explicitly **accept**
  (replaces the bullet text) or **discard** (keeps the original) — never
  silently overwrites.
- A 429 response (limiter still returns this shape for `ai_blocked` users)
  renders as "AI unavailable" rather than a raw error.

## 3. Full-review backend

New method on `AiService`:

```php
public function reviewResume(User $user, array $resumeData, ?string $jd = null): array
```

- Model: `gpt-4o` (upgraded from `gpt-4o-mini` — this task needs to reason
  over the whole resume and return structured, prioritized judgment, not
  rewrite one field).
- `temperature` low (~0.3) — critique, not creative rewriting.
- Prompt: the resume's meaningful fields (summary, experience bullets,
  skills, education — no IDs/timestamps), plus the JD verbatim appended
  when `target_job_description` is set on the resume. JD-aware review is
  the default when a JD exists; no separate toggle.
- Output: structured JSON via OpenAI's `response_format: json_schema`
  (not freeform text + manual parsing).

Suggestion shape (mirrors `ScoreChecklistItem`'s `section` field so the
frontend can reuse `score-coach.tsx`'s jump-to-section logic):

```
{
  id: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
  section: 'contact' | 'summary' | 'experience' | 'skills' | 'education';
  detail: string;
}
```

New migration: `resumes.ai_review` (json, nullable),
`resumes.ai_review_generated_at` (timestamp, nullable). This is a
deliberate exception to "relational content, not JSON columns" — it's a
regenerable cache blob, not resume content, the same category as the
existing `section_order` column.

New controller method:

```php
AiSuggestionController::reviewResume(Request $request, Resume $resume, AiService $ai, AiUsageLimiter $limiter): JsonResponse
```

- Inline ownership check (`abort_unless($resume->user_id === $request->user()->id, 404)`),
  matching every other controller in this app — no `ResumePolicy` (there
  isn't one).
- Saves `ai_review` + `ai_review_generated_at` onto the resume, returns
  the result.
- Route: `POST /resumes/{resume}/ai-review`, `throttle:20,1` + `auth`,
  matching the existing AI route's middleware.

## 4. Coach tab (frontend)

- New `WorkstationTab` value `'Coach'` in `workstation-header.tsx`'s tab
  list — separate from the existing "Review" tab (which stays
  PDF-preview-only; overloading it with an unrelated job was rejected).
- New `coach-panel.tsx`:
  - Shows the cached `draft.ai_review` (with `ai_review_generated_at` as
    "Last reviewed X ago") if present.
  - Otherwise an empty state with a "Review my resume" button.
  - Button flushes any pending autosave first (the backend reads the
    persisted resume, not the in-browser draft), then POSTs to the new
    endpoint.
  - Results render grouped/sorted by severity; each item is clickable to
    jump to its section, reusing `score-coach.tsx`'s jump logic.
  - A "Re-review" button regenerates explicitly — never auto-triggers on
    edits (auto-triggering would silently rack up `gpt-4o` calls, which
    are meaningfully more expensive than `gpt-4o-mini` bullet rewrites).
- No `aiEnabled` prop — tab is always visible, consistent with the
  bullet-rewrite feature having no flag.

## 5. Testing

- Extend `tests/Feature/AiSuggestionTest.php` to cover `reviewResume`:
  `OpenAI::fake()` with a structured JSON response; assert
  `resumes.ai_review` / `ai_review_generated_at` are set; assert the
  `ai_requests` row has `feature: 'resume_review'`, `model: 'gpt-4o'`, and
  non-zero `cost_micro_cents`.
- Update the existing `AiUsageLimiter` test(s) — this is a **behavior
  change** (no longer blocks at 10 requests/24h, only `ai_blocked` blocks),
  not just an extension.
- New Pest test for the cost-calculation helper as a pure function, pinned
  to exact math for known token counts.
- Vitest component test for the bullet-rewrite accept/discard interaction
  (`npm run test:js`, existing pattern).
- No Dusk test required for this pass.

## Open questions for implementation time

- Exact CSRF/fetch convention to match for the bullet-rewrite button (spec
  says "follow whatever the codebase's existing non-Inertia POST
  convention is" — needs to be confirmed by reading the `urls.check`
  probe or similar during implementation, not guessed here).
- Exact current OpenAI per-token pricing for `gpt-4o-mini` and `gpt-4o` at
  implementation time (verify against OpenAI's pricing page rather than
  reusing whatever number is drafted into the plan).
