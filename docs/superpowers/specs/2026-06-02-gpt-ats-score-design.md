# GPT-Powered ATS Score with DB Cache

**Date:** 2026-06-02  
**Status:** Approved

## Problem

The current ATS scorer is a local keyword-matching algorithm (`AtsScorer`). It has no persistence — every call re-runs the algorithm. The goal is to replace the scoring engine with GPT-4o and cache the result in the database so repeated requests don't hit the API.

## Requirements

- Score is computed by GPT-4o, not local keyword matching
- Full response blob (score + found/missing/breakdown) is cached in the `resumes` table
- Cache is returned immediately on subsequent requests (no API call)
- Cache is invalidated on demand via a new `DELETE` endpoint
- Response shape is identical to the existing response so the frontend requires no changes
- If GPT fails, fall back to the local scorer (never hard-fail)

## Database

**Migration:** Add two nullable columns to `resumes`:

| Column | Type | Notes |
|---|---|---|
| `ats_cache` | `json`, nullable | Full GPT response blob |
| `ats_cached_at` | `timestamp`, nullable | When the cache was last populated |

**Model changes:**
- `ats_cache` cast to `array` in `$casts`
- Both columns added to `$fillable`

## Scoring (`AtsScorer`)

`AtsScorer::score(Resume $resume): array` is rewritten to call GPT-4o via `openai-php/client`.

**Prompt strategy:** Pass the resume's summary, bullet points, and skills as plain text. Instruct GPT to score on the same four axes using the same keyword lists from `AtsKeywords`, and return a JSON object matching the existing response shape exactly.

**Response shape (unchanged):**
```json
{
  "score": 82,
  "found": { "action_verbs": [...], "technical": [...], "soft_skills": [...] },
  "missing": { "action_verbs": [...], "technical": [...], "soft_skills": [...] },
  "breakdown": { "action_verbs": 24, "technical": 36, "soft_skills": 12, "format_signals": 10 }
}
```

**Config:** `gpt-4o`, `response_format: { type: "json_object" }`, max_tokens ~600.

**Fallback:** If the OpenAI API call fails or returns unparseable JSON, fall back to the existing local keyword-matching logic so the endpoint never returns an error.

## Controller & Cache Logic

### `AtsScoreController@show` (updated)

```
1. authorize('update', $resume)
2. if $resume->ats_cache is not null → return it as JSON
3. else → call AtsScorer::score($resume)
         → $resume->update(['ats_cache' => $result, 'ats_cached_at' => now()])
         → return $result as JSON
```

### `AtsScoreController@destroy` (new)

- Route: `DELETE /builder/{resume}/ats-score`
- Authorization: `authorize('update', $resume)`
- Action: `$resume->update(['ats_cache' => null, 'ats_cached_at' => null])`
- Response: `204 No Content`

### `Api/AtsScoreController@show` (updated)

Same cache-read logic as the web controller. No destroy endpoint in the API layer for now.

## Routes

```php
// Existing (unchanged):
GET  /builder/{resume}/ats-score   → AtsScoreController@show

// New:
DELETE /builder/{resume}/ats-score → AtsScoreController@destroy
```

## Error Handling

- GPT API key missing → fall back to local scorer (no 422)
- GPT returns non-JSON or invalid shape → fall back to local scorer
- GPT HTTP error → fall back to local scorer

## Testing

- `AtsScoreTest`: add test for cache hit (assert no OpenAI call made), cache miss (assert result stored), and cache-bust (`DELETE` nulls the columns)
- Mock `OpenAI::client()` in tests — do not make live API calls
- Existing tests should continue to pass (fallback path covers them if OpenAI key is absent in test env)

## Out of Scope

- Auto-invalidation on resume save (deferred, may be added later)
- ATS score history / `ats_scores` table
- Cache-bust endpoint in API layer