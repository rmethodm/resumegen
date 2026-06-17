# AI Generation Points Audit - Resumegen

**Date:** 2026-06-16  
**Scope:** Complete inventory of all AI trigger points in the Resumegen Laravel+React application

---

## Executive Summary

The Resumegen app has **3 AI generation features**, all authenticated and quota-gated per user tier. All routes are protected by `auth` middleware, policy authorization (`$this->authorize()`), and monthly quota enforcement via `UserLimits::canUseAi()`. No unauthenticated AI endpoints exist. Rate limiting enforced at 20 requests/minute (web) and 10 requests/minute (API, where applicable).

---

## 1. AI Routes & Endpoints

| Feature | Route | Method | Controller | HTTP Handler | Middleware | Public? | Cost | Notes |
|---------|-------|--------|-----------|--------------|-----------|--------|------|-------|
| **Rewrite Bullet** | `/builder/{resume}/ai/rewrite-bullet` | POST | `AiSuggestionController@rewriteBullet` | JSON | `auth`, `throttle:20,1` | No | 1 req | Rewrites experience bullets; input max 8000 chars |
| **Generate Summary** | `/builder/{resume}/ai/summary` | POST | `AiSuggestionController@summary` | JSON | `auth`, `throttle:20,1` | No | 1 req | Generates professional summary from experience+skills |
| **Extract ATS Keywords** | `/builder/{resume}/ai/ats-keywords` | POST | `AiSuggestionController@atsKeywords` | JSON | `auth`, `throttle:20,1` | No | 1 req | Gated to Starter+ tier only (returns 402 if free) |
| **Strength Score** | `/builder/{resume}/strength-score` | GET | `StrengthScoreController@show` | JSON | `auth`, `throttle:10,1` | No | 0 reqs | Rule-based heuristic, NOT AI (no OpenAI call) |

---

## 2. Configuration & Quota Limits

**File:** `/config/ai.php`

| Setting | Value | Notes |
|---------|-------|-------|
| Default Model | `gpt-4o-mini` (env: `OPENAI_MODEL`) | Configured via env var |
| Max Completion Tokens | 1000 | Hard cap per chat call |
| **Monthly Limits** | | |
| → Free tier | 10 requests/month | Enforced at request time |
| → Starter tier | 150 requests/month | |
| → Pro tier | 500 requests/month | |
| → Agency tier | 1000 requests/month | |
| **Pricing (gpt-4o-mini)** | | Cents per 1,000 tokens |
| → Input | $0.015 / 1k tokens | Used for cost estimation |
| → Output | $0.06 / 1k tokens | Used for cost estimation |

**File:** `/app/Services/UserLimits.php`

| Method | Enforcement | Logic |
|--------|-------------|-------|
| `aiMonthlyLimit()` | Returns user's quota | Honors `ai_limit_override` column; defaults to tier config |
| `aiRequestsThisMonth()` | Counts success requests | Queries `ai_requests` WHERE `status='success'` since month start or `ai_usage_reset_at` |
| `canUseAi()` | Gating function | Returns `false` if `ai_blocked=true` OR quota exhausted |
| `aiRemaining()` | Returns remaining uses | Math: `limit - used` (clamped to 0) |
| `canAiTailoring()` | Feature gate for ATS keywords | Returns `true` only for Starter+ (`isAtLeastStarter()`) |
| `aiCanUpgrade()` | Determines upgrade path | True for Free/Starter only (Pro/Agency cannot upgrade within tier) |
| `aiNextTier()` | Next tier on upgrade | Free→Starter, Starter→Pro, else null |

---

## 3. Request Logging & Data Collection

**File:** `/app/Models/AiRequest.php` (append-only, `UPDATED_AT = null`)

| Column | Type | Purpose | Notes |
|--------|------|---------|-------|
| `id` | PK | Auto-increment | |
| `user_id` | FK nullable | User who triggered | null for guest calls (if any) |
| `feature` | string | Feature key | One of: `rewrite_bullet`, `generate_summary`, `ats_keywords` |
| `model` | string | LLM model used | Default: `gpt-4o-mini` |
| `prompt_tokens` | int | Input tokens | |
| `completion_tokens` | int | Output tokens | |
| `total_tokens` | int | Sum | |
| `estimated_cost_cents` | int | Cost estimate | Calculated by `AiService::estimateCostCents()` |
| `status` | enum | Result | `success`, `error`, or `flagged` |
| `flagged_text` | text nullable | Moderation catch | Only populated if status='flagged'; pruned after 90 days |
| `created_at` | timestamp | Logged when | Append-only, no updates |

---

## 4. Prompt Templates & Input Validation

**File:** `/app/Data/AiPrompts.php`

| Feature | Method | Input Payload | Max Input | Prompt Strategy |
|---------|--------|--------------|-----------|-----------------|
| **Rewrite Bullet** | `rewriteBullet()` | `{ text: string }` | 8000 chars | System: strong action verbs, quantify impact, preserve bullets |
| **Generate Summary** | `generateSummary()` | `{ experience: array, skills: array }` | N/A (JSON) | System: 2-3 sentences, based strictly on data, no invention |
| **ATS Keywords** | `atsKeywords()` | `{ role: string, job_description: string, experience: array, skills: array }` | 10,000 chars (JD) | System: find missing keywords vs. role or JD, return ≤15 items |

**Validation Rules:**
- Bullet text: `required|string|max:8000`
- ATS role: `nullable|string|max:200`
- ATS job_description: `nullable|string|max:10000`

---

## 5. AI Service Implementation

**File:** `/app/Services/AiService.php`

| Method | Purpose | Flow |
|--------|---------|------|
| `chat()` | Single chat completion | 1. Moderate input via OpenAI moderation endpoint 2. Call chat completion 3. Log request (all details + tokens) 4. Return reply text |
| `moderate()` | Pre-screening | Calls `moderations()` endpoint (free); throws `ModerationException` if flagged; flagged text logged |
| `log()` | Request persistence | Creates `AiRequest` row with all metadata; swallows exceptions (best-effort) |
| `estimateCostCents()` | Cost calculation | Linear: `(prompt_tokens/1000)*inputPrice + (completion_tokens/1000)*outputPrice` |

**Key Guarantees:**
- Moderation happens before chat completion (pre-screen)
- Logging is best-effort; failures don't crash the endpoint
- All calls tagged with `user_id` and `feature` for analytics
- Token counts returned by OpenAI and captured

---

## 6. Frontend AI Trigger Points

**File:** `/resources/js/hooks/useAiSuggestion.ts`

| Hook | Purpose | Rate Limit | Response Handling |
|------|---------|-----------|-------------------|
| `useAiSuggestion(initialRemaining)` | Centralized XHR wrapper | Enforced server-side (20,1) | 402→upgrade modal or alert; 422→validation error; 5xx→error alert |

**CSRF Protection:**
- Reads fresh XSRF-TOKEN cookie (Laravel refreshes on every response)
- Sends as `X-XSRF-TOKEN` header
- Laravel validates via middleware

**File:** `/resources/js/Pages/ResumeBuilder/Edit.tsx`

| UI Location | Handler | Route Called | Triggers Save? |
|-------------|---------|--------------|---|
| Professional Summary button | `handleGenerateSummary()` | `builder.ai.summary` | Yes (setTimeout 0) |
| Experience bullets button | `handleImproveExperience(expId, bullets)` | `builder.ai.rewrite-bullet` | Yes (setTimeout 0) |
| Skills section (target job desc) | `handleKeywordGaps()` | `builder.ai.ats-keywords` | No (results displayed, no auto-save) |
| Strength panel | `handleGenerateSummary()` | `builder.ai.summary` | Yes (via main Edit component) |

**UI Feedback:**
- Loading state: `ai.loadingUrl` disables buttons while fetching
- Quota display: "✨ N AI uses left this month"
- Out-of-quota: Button transforms to upgrade CTA
- Remaining count: Decremented in state after each success (from response)

---

## 7. Authorization & Tier Gating

**Gating Strategy:**
- **All AI endpoints:** Require `auth` middleware + policy authorization (`$this->authorize('update', $resume)`)
- **ATS Keywords specifically:** Additional `UserLimits::canAiTailoring()` check; returns HTTP 402 if Free tier
- **Strength Score:** No tier gate (rule-based, not AI)

**Response on Insufficient Tier:**
```json
{
  "error": "AI job tailoring is a Starter feature.",
  "required_tier": "starter"
}
```
Status: **402 Payment Required**

Frontend detects 402 and triggers upgrade modal with next tier.

---

## 8. Rate Limiting Details

| Endpoint | Limit | Window | Trigger | Notes |
|----------|-------|--------|---------|-------|
| `/builder/{resume}/ai/rewrite-bullet` | 20 | 1 minute | Per-user session | Shared throttle group |
| `/builder/{resume}/ai/summary` | 20 | 1 minute | Per-user session | Shared throttle group |
| `/builder/{resume}/ai/ats-keywords` | 20 | 1 minute | Per-user session | Shared throttle group |
| `/builder/{resume}/strength-score` | 10 | 1 minute | Per-user session | Lower rate due to non-critical nature |

**Throttle Binding:** IP + user ID (session)

---

## 9. Batch Processing & Multi-Trigger Exposure

**Finding:** No batch or multi-trigger endpoints exist.

| Scenario | Status | Explanation |
|----------|--------|-------------|
| **Loop over experiences** | ✓ Safe | No endpoint accepts arrays; each bullet rewritten separately (one API call per click) |
| **Generate summary + rewrite all bullets** | ✓ Safe | Separate endpoints; UI enforces per-entry click (no batch rewrite) |
| **Rapid-fire quota exhaustion** | ✓ Mitigated | Rate limit (20 req/min) + monthly quota prevents abuse; 402 blocks over-quota calls |
| **Share link keywords** | N/A | Share links are read-only; no AI access from public |

**Code Inspection:**
- `AiSuggestionController` methods accept single resume, single text input
- `Edit.tsx` handlers call `ai.run()` once per user action (no loops)
- Frontend enforces one-at-a-time via button disable during loading

---

## 10. Admin AI Management

**File:** `/app/Http/Controllers/Admin/AdminAiController.php` (requires `master_admin` role)

| Route | Handler | Purpose | Audit Logging |
|-------|---------|---------|----------------|
| `GET /admin/ai` | `overview()` | KPI dashboard (total requests, tokens, cost, 7d/30d/all period selector) | — |
| `GET /admin/ai/users` | `users()` | Per-user table (requests, tokens, cost, flagged count, block status, limit override) | — |
| `GET /admin/ai/users/{user}` | `user()` | User detail + recent 50 requests; current limit/used stats | — |
| `PATCH /admin/ai/users/{user}/reset-quota` | `resetQuota()` | Sets `ai_usage_reset_at = now()` to reset counter | ✓ Logged |
| `PATCH /admin/ai/users/{user}/limit` | `setLimit()` | Sets custom `ai_limit_override` (0–100,000); null = use tier default | ✓ Logged |
| `PATCH /admin/ai/users/{user}/block` | `toggleBlock()` | Toggles `ai_blocked` boolean | ✓ Logged |
| `GET /admin/ai/flagged` | `flagged()` | Paginated (25/page) list of flagged entries (status='flagged' + non-null `flagged_text`) | — |
| `DELETE /admin/ai/flagged/{aiRequest}` | `destroyFlagged()` | Soft delete of flagged entry | ✓ Logged |

**Admin Audit Log Actions:**
- `ai.reset-quota` — includes user email
- `ai.set-limit` — includes limit value
- `ai.block` / unblock — includes blocked boolean
- `ai.flagged.delete` — tracks deletion of flagged content

---

## 11. OpenAI Integration

**File:** `/config/services.php` (referenced via env vars)

| Config Key | Env Var | Usage | Notes |
|-----------|---------|-------|-------|
| `services.stripe.*` | Multiple | Billing only | Not AI-related |
| (No explicit AI config here) | `OPENAI_API_KEY` | Injected via service provider | Used by `openai-php/laravel` package |
| (No explicit AI config here) | `OPENAI_ADMIN_KEY` | Optional; for OpenAiUsageService | Admin dashboard cost reconciliation (fail-soft) |
| (No explicit AI config here) | `OPENAI_MODEL` | `config/ai.php` references | Defaults to `gpt-4o-mini` |

**Service Container:**
- `openai-php/laravel` provides `ClientContract`
- Injected into `AiService::__construct()`
- Calls go through package's HTTP layer (timeout, retries configurable)

---

## 12. Moderation & Content Safety

**Approach:** Pre-screening via OpenAI's free moderation endpoint

| Check | Timing | Result | Logged |
|-------|--------|--------|--------|
| OpenAI Moderations API | Before chat completion | Throws `ModerationException` if flagged | Yes, with `flagged_text` |
| Exception handling | User-facing | Returns HTTP 422 + error message | — |
| Flagged text retention | 90 days | Pruned by `ai:prune-flagged` scheduled command (daily) | In `ai_requests.flagged_text` |

**User Message on Flag:** (from `ModerationException::USER_MESSAGE`)
```
"Your request was flagged by our content safety system. Please try again."
```

---

## 13. Database Tables & Queries

**`ai_requests` Table (append-only, no updates):**
```sql
CREATE TABLE ai_requests (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NULLABLE,
  feature VARCHAR(255),                -- 'rewrite_bullet', 'generate_summary', 'ats_keywords'
  model VARCHAR(255),                  -- 'gpt-4o-mini'
  prompt_tokens INT,
  completion_tokens INT,
  total_tokens INT,
  estimated_cost_cents INT,
  status VARCHAR(255),                 -- 'success', 'error', 'flagged'
  flagged_text TEXT NULLABLE,
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX user_id (user_id),
  INDEX status (status),
  INDEX created_at (created_at)
);
```

**Queries:**
- `aiRequestsThisMonth()`: `SELECT COUNT(*) FROM ai_requests WHERE user_id=X AND status='success' AND created_at >= start_of_month`
- `AiUsageReport::breakdown()`: Aggregates by feature, model, or status with daily series
- Admin "users" page: `GROUP BY user_id` with `SUM(tokens)`, `SUM(estimated_cost_cents)`, `COUNT(*) requests`, flagged count

---

## 14. API Layer (Not Yet Fully Exposed)

**Current API Routes:** `/routes/api.php`

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/api/resumes/{id}` | ✓ Implemented | Full CRUD; no AI endpoints yet |
| `/api/cover-letters` | ✓ Implemented | Full CRUD |
| `/api/jobs` | ✓ Implemented | Full CRUD |
| `/api/*/ai-suggest` | ✗ Missing | Not in API layer yet (only web routes) |

**Finding:** All AI features are currently web-only (Inertia). No API token-based AI access exists, reducing API abuse surface.

---

## 15. Potential Attack Vectors & Mitigations

| Vector | Risk | Mitigation | Status |
|--------|------|-----------|--------|
| **Rapid quota depletion** | High | User burns monthly limit in seconds | Rate limit 20/min + monthly quota enforcement ✓ |
| **Impersonation via API** | High | Call AI as another user | Sanctum token-based API; routes enforce policy authorization ✓ |
| **Batch endpoint** | Medium | If one endpoint accepts arrays | No batch endpoints; each feature single-input only ✓ |
| **Share link AI access** | Low | Public resume share links calling AI | Share link routes are read-only; no AI endpoints ✓ |
| **Unauthenticated AI** | Medium | Unprotected endpoints | All routes require `auth` middleware ✓ |
| **Prompt injection** | Low | User input in prompts | Input capped at 8000–10000 chars; no dynamic system prompts ✓ |
| **Cost spike (token overflow)** | Low | Accidentally high completion tokens | `max_completion_tokens: 1000` hard cap ✓ |
| **Admin quota reset** | Very Low | Admins accidentally reset users | Audit logged; requires `master_admin` role ✓ |
| **Free tier escalation** | Medium | Free user tricks Starter+ feature | Separate `canAiTailoring()` gate; 402 response ✓ |

---

## 16. Cost Management

**Tracking:**
- Estimated cost logged per request (based on token count + config pricing)
- Admin dashboard shows cost reconciliation via optional `OpenAiUsageService` (queries OpenAI API)
- `AiUsageReport` aggregates by period (7d, 30d, all)

**Per-Request Cost (gpt-4o-mini):**
- Example: 500 prompt tokens + 100 completion tokens
  - Input: (500/1000) × $0.015 = $0.0075
  - Output: (100/1000) × $0.06 = $0.006
  - **Total: $0.0135 ≈ 1.35 cents**

---

## 17. Feature Summary Table

| Feature | Endpoint | Tier Gate | Quota Impact | Rate Limit | Public? | Use Case |
|---------|----------|-----------|--------------|-----------|--------|----------|
| Rewrite Bullet | `/ai/rewrite-bullet` | No | 1 req | 20/min | No | Improve experience bullets |
| Generate Summary | `/ai/summary` | No | 1 req | 20/min | No | Auto-generate professional summary |
| Extract ATS Keywords | `/ai/ats-keywords` | **Yes (Starter+)** | 1 req | 20/min | No | Find missing keywords vs. job posting |
| Strength Score | `/strength-score` | No | 0 reqs | 10/min | No | Resume completeness heuristic (no AI) |

---

## 18. Recommendations

| Issue | Priority | Recommendation |
|-------|----------|-----------------|
| No API-level AI | Low | Consider exposing AI endpoints to `/api/*` for token-based access (requires careful rate-limiting) |
| No batch endpoints | Low | Keep as-is; single-input design is simpler and safer |
| Moderation only text | Low | Current pre-screening covers primary abuse vector; acceptable |
| Admin cost visibility | Low | Optional `OpenAiUsageService` already provides reconciliation; consider making required or documenting failure mode |
| Share link read-only | ✓ Good | Confirmed; no AI exposure to public |

---

## Files Involved

**Backend:**
- `/routes/web.php` — AI route definitions (lines 106–118)
- `/routes/api.php` — API routes (no AI yet)
- `/app/Http/Controllers/AiSuggestionController.php` — Main handler
- `/app/Http/Controllers/StrengthScoreController.php` — Heuristic scorer
- `/app/Http/Controllers/Admin/AdminAiController.php` — Admin dashboard
- `/app/Services/AiService.php` — OpenAI integration
- `/app/Services/UserLimits.php` — Quota enforcement
- `/app/Services/AiUsageReport.php` — Analytics
- `/app/Services/OpenAiUsageService.php` — Cost reconciliation (optional)
- `/app/Data/AiPrompts.php` — Prompt templates
- `/app/Models/AiRequest.php` — Request logging model
- `/config/ai.php` — Config (model, limits, pricing)

**Frontend:**
- `/resources/js/hooks/useAiSuggestion.ts` — XHR wrapper
- `/resources/js/Pages/ResumeBuilder/Edit.tsx` — Main UI (lines 448, 571–591, 572–586)
- `/resources/js/Pages/ResumeBuilder/Partials/StrengthScorePanel.tsx` — Score display

---

## Conclusion

Resumegen's AI implementation is **well-gated and quota-protected**. All endpoints require authentication, policy authorization, and monthly quota enforcement. No unauthenticated, batch, or multi-trigger AI exposure exists. Rate limiting, moderation pre-screening, and admin controls are in place. The primary attack surface (rapid quota depletion) is mitigated by rate limits and quota enforcement.
