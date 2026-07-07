# Job-Match Scorer — Design Spec

Date: 2026-07-01
Status: Approved for planning

## Problem

Competitive research (resumax.ai) showed job-discovery/matching as a strong differentiator. A full job-discovery crawler ("Atlas") is out of scope for Resumegen — expensive, off-mission scope creep for a resume/career-doc product. A much smaller, high-leverage subset is achievable: let a user paste a job description and get a match score + gap analysis against their resume, similar in spirit to the existing ATS keyword-gap feature but with a scored, structured verdict instead of a flat keyword list.

## Goals

- New standalone feature: paste a job description, get a 0-100 match score, strengths, and gaps.
- Reuse existing AI infrastructure (`AiService`, `AiPrompts`, quota/tier gating patterns) rather than building new plumbing.
- Position as a Pro+ differentiator.

## Non-goals

- Job discovery/crawling or matching against a database of open roles (Resumax's "Atlas" — explicitly out of scope, too large and off-mission).
- Automatic resume rewriting triggered by the score — this feature surfaces where to focus; the user still manually triggers existing rewrite-bullet/summary AI actions.
- Replacing or merging with the existing ATS Match Panel (`AtsMatchPanel.tsx` / `ai/ats-keywords` endpoint) — kept as a separate, distinct feature per approved scope decision.

## API

**New route**: `POST /builder/{resume}/ai/job-match`

**New controller method** (in `AiSuggestionController`, following the existing `ats-keywords` method's structure).

**Gating**: New `UserLimits::canJobMatch(User $user): bool`, returns `in_array($user->planTier(), ['pro', 'agency'], true)`. On the JSON path, gated calls return HTTP 402 with `{ error, required_tier: 'pro' }`, consistent with existing gate responses. No new frontend gating logic needed — the existing `useAiSuggestion` hook already handles 402 by triggering the upgrade modal.

**Input**: `job_description` (string, max 10,000 chars, same validation rule as `ats-keywords`). Falls back to the resume's `target_job_description` field if not explicitly provided.

**AI call**: New prompt `AiPrompts::build('job_match', [...])`, using the structured JSON `response_format` pattern already established by the `interview_coach` prompt (not the free-text pattern `ats_keywords` uses, since this needs a numeric score plus structured lists).

Requested response shape from the model:
```json
{
  "score": 72,
  "strengths": ["Directly relevant experience with React and TypeScript", "..."],
  "gaps": ["No mention of GraphQL, which the posting requires", "..."],
  "summary": "Strong technical fit; tailor the summary to highlight leadership experience."
}
```

**Caching**: 24-hour cache, keyed on a hash of **both** the job description and the resume's current content — not just the job description as `ats-keywords` does. This is a deliberate deviation from the `ats-keywords` cache-key pattern: a match score is meaningless once stale if the resume changes but the cache key doesn't reflect that, so resume content must be part of the hash.

**Quota**: Consumes 1 request from the user's monthly AI quota (`ai_requests` table, `feature: 'job_match'`) per uncached call, same accounting as other AI features.

## Frontend

New component `JobMatchPanel.tsx` in `resources/js/Pages/ResumeBuilder/Partials/`, structurally similar to `AtsMatchPanel.tsx`:
- Job-description textarea (same field/validation as ATS panel, may share the `target_job_description` state already in `Edit.tsx` rather than duplicating it).
- "Check match" button, using the existing `useAiSuggestion` hook.
- Result display: score shown prominently (large number, e.g. `72/100`), strengths as green check-marked items, gaps as amber items, summary sentence beneath.
- For Free/Starter users, the panel renders in a locked/upgrade state (consistent with how other Pro-gated UI in the app signals an upgrade is required), rather than being hidden entirely.

Added to `Edit.tsx` as a new sidebar panel alongside the existing ATS Match Panel and strength-score panel.

## Data model

No schema changes. Reuses the existing `ai_requests` logging table with a new `feature` value (`'job_match'`).

## Error handling

- 402 for Free/Starter (tier gate).
- 402/quota-exceeded response reused from existing `canUseAi()` check, same as other AI features.
- Moderation rejection (via `AiService`'s existing pre-check) surfaces the existing `ModerationException` handling — no new error path.
- Malformed/non-JSON model response: follow whatever existing fallback pattern `interview_coach` uses for JSON parse failures (no new error-handling design needed — reuse it).

## Testing

- New feature test (mirroring `AiSuggestionTest.php` patterns) covering: 402 for Free/Starter, successful response shape for Pro/Agency, cache-hit behavior (same job description + resume content served from cache, no duplicate AI call), cache invalidation when resume content changes, and quota consumption accounting.
- Unit test for the new `job_match` prompt-building logic if a prompts unit test file exists (mirror existing prompt tests).

## Rollout

No external dependencies — reuses the existing OpenAI/`AiService` configuration (`gpt-4o-mini`, existing pricing config). No new env vars or third-party setup required.
