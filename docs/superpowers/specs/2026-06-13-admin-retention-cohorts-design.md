# Admin Retention Cohorts — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Part of:** Super-admin stretch items (sub-project 8 — completes the Full-funnel growth option)

## Goal

Add weekly retention cohorts to the Growth dashboard: of the users who signed up in week W, what % were active in week W+1, W+2, … This is the one growth metric the app couldn't compute before — it requires a per-period activity signal, not just a point-in-time `last_active_at`.

## Why an activity table (design rationale)

A single `last_active_at` column records only the *most recent* visit, which cannot reconstruct whether a user was active in week 1 but not week 2. A true cohort triangle needs to know *which* periods each user was active in. The minimum structure for that is a deduplicated **daily activity** record: one row per user per day they were active. Its `MAX(activity_date)` also serves as the last-active signal, so we don't need a separate column.

## Data model — `user_activity_days`

| column | type | notes |
|---|---|---|
| `id` | bigIncrements | |
| `user_id` | foreignId → users, cascadeOnDelete | |
| `activity_date` | date | |
| unique | `(user_id, activity_date)` | one row per user per active day |

No timestamps (the date *is* the timestamp). Indexed by the unique constraint; add an index on `activity_date` for cohort range scans.

## Activity capture — `App\Http\Middleware\TrackActivity`

Runs on authenticated web requests. To avoid a DB write on every request, it gates on a session marker:

```php
public function handle(Request $request, Closure $next): Response
{
    $response = $next($request);

    $user = $request->user();
    if ($user) {
        $today = now()->toDateString();
        if ($request->session()->get('activity_stamped') !== $today) {
            UserActivityDay::insertOrIgnore(['user_id' => $user->id, 'activity_date' => $today]);
            $request->session()->put('activity_stamped', $today);
        }
    }

    return $response;
}
```

`insertOrIgnore` makes the write idempotent even across multiple sessions/devices on the same day. Registered by appending to the `web` middleware group in `bootstrap/app.php` (the internal `$user` guard makes it a no-op for guests). Stamping after `$next` keeps it off the critical path and avoids stamping on requests that redirect to login.

## Model — `App\Models\UserActivityDay`

- `public $timestamps = false;`
- fillable `user_id`, `activity_date`; cast `activity_date => date`.

## GrowthReport addition

`retentionCohorts(int $weeks = 6): array` — returns the most recent `weeks` signup cohorts (by `created_at` week, Monday-start), each:
`{cohort: 'YYYY-MM-DD' (week start), size: int, retention: float[]}` where `retention[k]` = % of the cohort with at least one `user_activity_days` row in `[cohortStart + k weeks, cohortStart + (k+1) weeks)`. `retention[0]` is week-0 activity. Cohorts older than `weeks` weeks are excluded. Computed in PHP from a single users query (id + created_at, last `weeks` weeks) joined against a single `user_activity_days` query (grouped per user → set of active week-starts).

## Controller + page

`AdminGrowthController@index` passes a `retention` prop (`retentionCohorts()`). `Admin/Growth/Index.tsx` adds a **"Weekly retention"** cohort table: one row per cohort (week start + size), columns Week 0..N, each cell shaded by retention % (pure inline-style background, no dependency). Empty state when no cohorts.

## Testing

`tests/Feature/Admin/RetentionCohortTest.php`:
1. `TrackActivity` middleware inserts one `user_activity_days` row for an authenticated request; a second request the same session/day does not add another.
2. A guest request inserts nothing.
3. `retentionCohorts` computes `retention[0] = 100.0` for a single user who signed up this week and has an activity row this week; `0.0` for a cohort user with no activity.
4. Growth index includes a `retention` prop.

Middleware test drives a real authenticated route (e.g. `GET /dashboard`) and asserts the row count.

## Out of scope

Hourly/DAU granularity (daily is enough for weekly cohorts); backfilling activity before this ships (cohorts populate going forward); feature-specific retention (e.g. "returned and edited a resume") — this measures app visits.
