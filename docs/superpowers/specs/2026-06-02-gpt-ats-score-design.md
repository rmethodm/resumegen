# GPT-Powered ATS Score with DB Cache & AI Usage Tracking

**Date:** 2026-06-02  
**Status:** Approved

## Problem

The current ATS scorer is a local keyword-matching algorithm (`AtsScorer`). It has no persistence — every call re-runs the algorithm. The goals are:
1. Replace the scoring engine with GPT-4o and cache the result in the database
2. Track all AI API costs (OpenAI + Anthropic) across the app, per-user and overall, with configurable pricing and dashboards

## Part 1: GPT ATS Score with DB Cache

### Requirements

- Score is computed by GPT-4o, not local keyword matching
- Full response blob (score + found/missing/breakdown) is cached in the `resumes` table
- Cache is returned immediately on subsequent requests (no API call)
- Cache is invalidated on demand via a new `DELETE` endpoint
- Response shape is identical to the existing response so the frontend requires no changes
- If GPT fails, fall back to the local scorer (never hard-fail)

### Database

**Migration:** Add two nullable columns to `resumes`:

| Column | Type | Notes |
|---|---|---|
| `ats_cache` | `json`, nullable | Full GPT response blob |
| `ats_cached_at` | `timestamp`, nullable | When the cache was last populated |

**Model changes:**
- `ats_cache` cast to `array` in `$casts`
- Both columns added to `$fillable`

### Scoring (`AtsScorer`)

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

### Controller & Cache Logic

**`AtsScoreController@show` (updated):**
```
1. authorize('update', $resume)
2. if $resume->ats_cache is not null → return it as JSON
3. else → call AtsScorer::score($resume)
         → $resume->update(['ats_cache' => $result, 'ats_cached_at' => now()])
         → return $result as JSON
```

**`AtsScoreController@destroy` (new):**
- Route: `DELETE /builder/{resume}/ats-score`
- Authorization: `authorize('update', $resume)`
- Action: `$resume->update(['ats_cache' => null, 'ats_cached_at' => null])`
- Response: `204 No Content`

**`Api/AtsScoreController@show` (updated):**
Same cache-read logic as the web controller. No destroy endpoint in the API layer for now.

### Routes

```php
// Existing (unchanged):
GET    /builder/{resume}/ats-score  → AtsScoreController@show

// New:
DELETE /builder/{resume}/ats-score  → AtsScoreController@destroy
```

### Error Handling

- GPT API key missing → fall back to local scorer
- GPT returns non-JSON or invalid shape → fall back to local scorer
- GPT HTTP error → fall back to local scorer

---

## Part 2: AI Usage Tracking

### Requirements

- Track every OpenAI and Anthropic API call across the entire app
- Store token counts and calculate cost in USD at log time
- Pricing is configurable in the DB (no code change needed when rates change)
- Admin (`rmethodm@outlook.com`) sees all usage across all users
- Each user sees their own usage

### Data Model

**`ai_model_rates` table** — configurable pricing per model:

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `provider` | string | `'openai'` or `'anthropic'` |
| `model` | string | e.g. `'gpt-4o'`, `'claude-sonnet-4-6'` |
| `input_cost_per_million` | decimal(10,6) | USD per 1M input tokens |
| `output_cost_per_million` | decimal(10,6) | USD per 1M output tokens |
| `effective_from` | date | Allows tracking rate changes over time |
| `timestamps` | | |

Seeded with known rates:
- `gpt-4o`: $2.50 input / $10.00 output per 1M tokens
- `claude-sonnet-4-6`: $3.00 input / $15.00 output per 1M tokens

**`ai_usage_logs` table** — append-only log of every API call:

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK nullable | null for unauthenticated calls |
| `provider` | string | `'openai'` or `'anthropic'` |
| `model` | string | actual model used |
| `feature` | string | `'ats_score'` or `'ai_suggest'` |
| `input_tokens` | integer | from API response |
| `output_tokens` | integer | from API response |
| `cost_usd` | decimal(10,6) | calculated at log time from current rate |
| `created_at` | timestamp | no `updated_at` — append-only |

Cost formula: `(input_tokens / 1_000_000 * input_cost_per_million) + (output_tokens / 1_000_000 * output_cost_per_million)` using the latest `ai_model_rates` row where `effective_from <= today` for the given provider+model.

### `AiUsageLogger` Service

A new `App\Services\AiUsageLogger` handles all logging:

```php
AiUsageLogger::log(
    user: $user,           // nullable Auth user
    provider: 'openai',
    model: 'gpt-4o',
    feature: 'ats_score',
    inputTokens: 412,
    outputTokens: 188,
);
```

Internally: look up active rate, calculate `cost_usd`, insert into `ai_usage_logs`. Wrapped in try/catch — logging failure never breaks the calling feature.

**Integration points:**
- `AtsScorer::score()` — after GPT-4o response (covers both web and API)
- `AiSuggestController::suggestWithOpenAI()` — after `$client->chat()->create()`
- `AiSuggestController::suggestWithClaude()` — after `Http::post()` response
- `Api/AiSuggestController` — same two methods in the API mirror class

Token extraction:
- OpenAI (`openai-php/client`): `$result->usage->promptTokens` / `$result->usage->completionTokens`
- Anthropic (raw HTTP): `$response->json('usage.input_tokens')` / `$response->json('usage.output_tokens')`

### Admin Middleware

`EnsureAdmin` middleware: checks `auth()->user()->email === config('services.admin_email')`.

Config: `services.admin_email = rmethodm@outlook.com` (stored in `config/services.php`, value from `.env` as `ADMIN_EMAIL`).

Applied to all `/admin/*` routes.

### Admin Dashboard

`GET /admin/usage` → `AdminUsageController@index` → `Admin/Usage.tsx`

Displays:
- Total cost to date (all providers combined)
- Cost breakdown by provider and by model
- Cost breakdown by feature (`ats_score` vs `ai_suggest`)
- Per-user table: name, email, total calls, total cost, last active date
- Date range filter: this month / last 30 days / all time

### User "My Usage" Page

`GET /usage` → `UsageController@index` → `Usage/Index.tsx`

Displays:
- Total calls and total cost to date
- Breakdown by feature and provider
- Last 30 days call history (date, feature, model, cost per call)

Both pages are Inertia responses using the existing authenticated layout.

### New Routes

```php
GET /usage         → UsageController@index
GET /admin/usage   → AdminUsageController@index   (EnsureAdmin middleware)
```

---

## Testing

- `AtsScoreTest`: cache hit (no OpenAI call), cache miss (result stored), cache-bust (DELETE nulls columns)
- `AiUsageLoggerTest`: correct cost calculation, fallback when no rate found, try/catch swallows exceptions
- `AdminUsageTest`: admin email can access, other emails get 403
- `UsageTest`: user sees only their own logs
- Mock OpenAI client in tests — no live API calls

## Out of Scope

- Auto-invalidation of ATS cache on resume save (deferred)
- ATS score history / `ats_scores` table
- Cache-bust endpoint in API layer
- Billing enforcement based on usage limits
