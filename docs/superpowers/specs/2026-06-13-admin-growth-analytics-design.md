# Admin Growth Analytics — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Part of:** Super-admin stretch items (sub-project 7, final)

## Goal

A master-admin growth dashboard showing the acquisition→activation→revenue funnel: new signups over time, activation rate (users who created a resume), free→paid conversion + time-to-convert, and referral attribution. All computed from existing tables — **no new tracking columns or events**.

## Service — `App\Services\GrowthReport`

Pure query/compute object. Period token `7d|30d|all` (`all` = 90-day cap for the chart, all-time for rates).

- `signupsSeries(string $period): array` — `[{date, count, cost_cents:0}]` from `users.created_at` grouped by day within the window (shared `LineChart` shape).
- `funnel(): array` — all-time counts: `[{label:'Signed up', count}, {label:'Activated', count}, {label:'Paying', count}]` where Activated = `User::has('resumes')->count()` and Paying = users with `plan_tier` in `starter/pro/agency`. `cost_cents:0` on each for the shared `BarList` type.
- `activationRate(): float` — Activated / total users (0.0 when no users), rounded to 1 decimal as a percentage.
- `conversionRate(): float` — Paying / total users, as a percentage.
- `avgDaysToConvert(): ?float` — over users who have at least one subscription, the average of (first `subscriptions.created_at` − `users.created_at`) in whole days; null when none. Computed by fetching `MIN(created_at)` per `user_id` from `subscriptions` and diffing against the user's registration date in PHP.
- `referral(): array` — `{referred_signups, referred_converted}`: count of users with non-null `referred_by_user_id`, and how many of those are now paying.
- `totalUsers(): int`.

## Controller — `App\Http\Controllers\Admin\AdminGrowthController`

Constructor injects `GrowthReport`. `index(Request)`:
- `?period=7d|30d|all` (default `30d`), normalized.
- Passes `period`, `kpis` (`{total_users, activation_rate, conversion_rate, avg_days_to_convert}`), `signups` (series), `funnel`, `referral`.
- Renders `Admin/Growth/Index`.

## Route

Inside `admin.` group: `Route::get('/growth', [AdminGrowthController::class, 'index'])->name('growth.index');`

## Frontend — `resources/js/Pages/Admin/Growth/Index.tsx`

`AdminLayout`. Reuses `Admin/Ai/Charts.tsx` (`Stat`, `BarList`, `LineChart`).
- 7d/30d/all period buttons (Inertia `Link`s).
- KPI row: Total users, Activation rate (`%`), Conversion rate (`%`), Avg days to convert (`—` when null).
- Signups `LineChart`.
- Funnel `BarList` (Signed up → Activated → Paying).
- Referral card: "{referred_signups} referred signups · {referred_converted} converted".

Add a **Growth** nav entry to `AdminLayout` (`admin.growth.*`).

## Testing

`tests/Feature/Admin/AdminGrowthTest.php`:
1. `signupsSeries` counts users per day within the window, excludes older.
2. `activationRate` = 50.0 when 1 of 2 users has a resume.
3. `conversionRate` reflects paying ratio (seed via `UserFactory` tier states).
4. `funnel` returns the three rows with correct counts.
5. `avgDaysToConvert` averages registration→first-subscription gap; null with no subscriptions.
6. `referral` counts referred signups + converted.
7. Index renders `Admin/Growth/Index` with `kpis`, `signups`, `funnel`, `referral`.
8. Non-master-admin 403.

## Out of scope

Weekly retention cohorts (needs a last-active signal — not tracked today; deferred to the Full-funnel option); per-channel acquisition attribution beyond referrals; predictive/LTV modeling.
