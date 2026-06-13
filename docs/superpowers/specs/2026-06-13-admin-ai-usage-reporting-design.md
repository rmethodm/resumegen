# Admin AI Usage Reporting — Design

**Status:** Approved 2026-06-13
**Sub-project of:** Super Admin (manage entire application)

## Context

The app logs every OpenAI call to the `ai_requests` table (`user_id`, `feature`,
`model`, `prompt_tokens`, `completion_tokens`, `total_tokens`,
`estimated_cost_cents`, `status`, `created_at`; indexed on `(user_id, created_at)`).
A master-admin panel already exists at `/admin` (users, organizations, referrals,
messages, career articles, job titles) gated by `EnsureMasterAdmin`. There is no
admin surface over AI usage today. All the raw data exists — this is a
read + aggregate + display job, plus a few per-user control columns and one
external (OpenAI) reconciliation call.

## Decomposition

This is the **first** sub-project of a larger "super admin" effort. Each of the
following becomes its own spec → plan → build cycle later and is **out of scope**
here: resume/content management, revenue & subscription reporting, a moderation
actions workflow beyond the flagged queue, an admin audit log, system/ops
(queues, failed jobs, error log), and growth analytics. This spec is
self-contained and shippable on its own.

## Goals

A single AI dashboard for the master admin that answers, at a glance:
- **Cost** — what AI is costing (our estimate *and* OpenAI's actual billed spend).
- **Abuse** — who is hammering AI, who is near/over quota, who is getting flagged.
- **Usage** — which features get used, request volume over time, model mix, success rate.

Plus per-user **controls**: reset monthly quota, set a custom limit, block AI.
Plus a **flagged-content review queue** showing the actual moderated input text.

## Data Model Changes

### `ai_requests` — add one column
- `flagged_text` (text, nullable). Populated **only** when `status='flagged'`.
  Keeps metric rows lean; the table stays effectively append-only.

### `users` — add three columns
- `ai_limit_override` (integer, nullable) — when set, overrides the tier monthly AI limit.
- `ai_blocked` (boolean, default `false`) — when true, the user cannot use AI at all.
- `ai_usage_reset_at` (timestamp, nullable) — quota-reset watermark (non-destructive).

### Retention
- `php artisan ai:prune-flagged {--days=90}` — sets `flagged_text = null` on rows
  whose `created_at` is older than the cutoff. The `ai_requests` row itself is
  **kept** (counts remain accurate); only the sensitive text is dropped.
- Scheduled daily in `routes/console.php`.

## Behavior Wiring

### `App\Services\UserLimits`
- `aiMonthlyLimit(User $user): ?int` → `$user->ai_limit_override ?? <tier limit>`.
- `aiRequestsThisMonth(User $user): int` → count `ai_requests` for the user with
  `status='success'` where `created_at >= max(startOfMonth, ai_usage_reset_at)`.
- `canUseAi(User $user): bool` → returns `false` if `$user->ai_blocked`; otherwise
  the existing remaining-quota logic.

A blocked or over-limit user hits the **existing** 402 path in
`AiSuggestionController::run()` — no controller change needed for enforcement.

### `App\Services\AiService`
- `moderate()` — when a result is flagged, persist the offending input into the
  logged row's `flagged_text` (thread the text through to `log()`).

## Backend — `App\Http\Controllers\Admin\AdminAiController`

All routes under `/admin/ai`, behind `auth` + `master_admin` middleware (existing
admin route group). Named routes:

| Method | URI | Name | Purpose |
|---|---|---|---|
| GET | `/admin/ai` | `admin.ai.overview` | KPIs + time-series + breakdowns + OpenAI reconciliation |
| GET | `/admin/ai/users` | `admin.ai.users` | Sortable per-user usage table |
| GET | `/admin/ai/users/{user}` | `admin.ai.user` | Per-user AI detail + controls |
| GET | `/admin/ai/flagged` | `admin.ai.flagged` | Paginated flagged-content review queue |
| PATCH | `/admin/ai/users/{user}/reset-quota` | `admin.ai.reset-quota` | Set `ai_usage_reset_at = now()` |
| PATCH | `/admin/ai/users/{user}/limit` | `admin.ai.limit` | Set/clear `ai_limit_override` (nullable) |
| PATCH | `/admin/ai/users/{user}/block` | `admin.ai.block` | Toggle `ai_blocked` |
| DELETE | `/admin/ai/flagged/{aiRequest}` | `admin.ai.flagged.destroy` | Delete a flagged entry |

### Overview metrics (respecting a `?period=7d|30d|all` selector, default 30d)
- Totals: requests, tokens, our estimated cost (¢), OpenAI actual cost, success
  rate, flagged count, count of distinct active AI users.
- Daily time-series of request volume.
- Breakdowns: requests + cost grouped by `feature`, by `model`, by `status`.

### Users table
Per user: requests, tokens, estimated cost, flagged count, last-used timestamp,
current tier, effective monthly limit, used-this-month, blocked flag. Sortable
(default by estimated cost desc). Aggregated with grouped queries, joined to
`users`; users with zero AI activity may be omitted from the default view.

### Per-user detail
The user's recent `ai_requests`, their effective limit/used/remaining, and the
three control forms (reset quota, set/clear custom limit, toggle block).

## OpenAI Integration — `App\Services\OpenAiUsageService`

- Reads `config('ai.admin_key')` ← `OPENAI_ADMIN_KEY` env (org-level Admin key,
  distinct from `OPENAI_API_KEY`).
- `costs(CarbonInterface $start, CarbonInterface $end): array` → `GET
  https://api.openai.com/v1/organization/costs`.
- `usage(...): array` → completions usage endpoint.
- Results cached for 1 hour via `Cache::remember` (OpenAI data is delayed and
  rate-limited; org-wide, **not** per end-user — it complements, never replaces,
  our per-user `ai_requests` data).
- **Graceful degradation:** missing key or a failed/non-200 call returns a
  `null`/empty result; the Overview renders "OpenAI data unavailable" and falls
  back to our internal estimate. An OpenAI failure must never break the page.

## Frontend

- `resources/js/Pages/Admin/Ai/Overview.tsx`, `Users.tsx`, `User.tsx`, `Flagged.tsx`.
- Reuse the existing admin layout/nav; add an **"AI"** link to the admin navigation.
- **Visual-first:** every view pairs numbers with a chart, not just tables.
  - Overview: a **line/area chart** of daily request volume (and cost) over the
    period; **horizontal bar charts** for the by-feature, by-model, and by-status
    breakdowns; a **donut/stacked bar** for success vs error vs flagged; KPI
    stat cards across the top; an our-estimate-vs-OpenAI-actual **comparison bar**.
  - Users table: an inline **mini sparkline/bar** of recent activity per row where
    practical, plus colored cost/usage intensity cells.
  - Per-user detail: a small **bar chart** of that user's daily usage and a
    used-vs-limit **progress bar**.
- Charts are pure-CSS / inline-SVG bars, lines, and donuts, following the approach
  in `ResumeBuilder/Heatmap.tsx` — **no new chart dependency**. A single small
  reusable chart helper component (e.g. `Admin/Ai/Charts.tsx`) holds the
  bar/line/donut primitives so the four pages stay focused.
- Period selector mirrors the existing Heatmap/Analytics 7d/30d/all control.
- Control forms use Inertia `router.patch`; success re-renders with fresh props.
- `flagged_text` is only ever sent to master-admin pages.

## Error Handling

- OpenAI calls wrapped in try/catch; failures are logged best-effort and never
  surface as a 500.
- All routes gated by the existing `master_admin` middleware (403 otherwise).
- Quota reset is non-destructive (watermark, not row deletion).
- Clearing a custom limit = sending an empty `limit` (sets column back to null →
  user reverts to tier default).

## Testing

Feature tests (`tests/Feature/Admin/`):
- Master-admin gate: non-admin gets 403 on every `/admin/ai*` route.
- Overview aggregation returns correct totals/breakdowns for seeded `ai_requests`.
- Users table sorts and aggregates correctly.
- `reset-quota` → `aiRequestsThisMonth` drops to 0 without deleting rows.
- `limit` → `aiMonthlyLimit` reflects the override; empty value clears it.
- `block` → `canUseAi` is false and an AI suggestion call returns 402.
- Flagged queue lists rows with `flagged_text`; `destroy` removes one.
- `AiService` writes `flagged_text` on a flagged moderation (prepend the
  clean/flagged moderation fake per the ClientFake FIFO rule).
- `OpenAiUsageService`: caches results; a faked failing HTTP call degrades
  gracefully (returns empty, no exception).
- `ai:prune-flagged` nulls `flagged_text` on rows older than the cutoff, keeps the row.

Unit test (`UserLimits`): override / reset-watermark / block logic in isolation.

## Out of Scope (future super-admin sub-projects)

Resume/content management, revenue reporting, broader moderation workflow, admin
audit log, system/ops dashboards, growth analytics.
