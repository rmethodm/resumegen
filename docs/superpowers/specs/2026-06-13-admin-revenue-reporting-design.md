# Admin Revenue Reporting — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Part of:** Super-admin initiative (sub-project 3 of 4)

## Goal

A master-admin dashboard showing the money: MRR, paying vs free users, tier distribution, active subscriptions, new-signup trend, and recent subscription activity. Numbers come from **local** Stripe-synced columns (fast, always available); an optional **live Stripe reconcile** card cross-checks the active-subscription count, fail-soft like `OpenAiUsageService`.

## Pricing source

Add a tier→monthly-price map to `config/services.php` under `stripe`:

```php
'tier_prices' => [
    'starter' => (int) env('PRICE_STARTER_CENTS', 900),
    'pro' => (int) env('PRICE_PRO_CENTS', 1900),
    'agency' => (int) env('PRICE_AGENCY_CENTS', 4900),
],
```

MRR uses the displayed monthly price per tier regardless of monthly/yearly billing (yearly subs counted at their monthly-equivalent headline price). This is a deliberate simplification — documented, not exact ARR math.

## Service — `App\Services\RevenueReport`

Pure query/compute object, no controller logic.

- `tierCounts(): array` — `User` grouped by `COALESCE(plan_tier, 'free')`, returns `['free'=>n,'starter'=>n,'pro'=>n,'agency'=>n]` with all four keys present (zero-filled).
- `mrrCents(): int` — `sum(tierCounts[tier] * config('services.stripe.tier_prices')[tier])` over starter/pro/agency.
- `payingUsers(): int` / `freeUsers(): int` — derived from tierCounts.
- `activeSubscriptions(): int` — `Subscription` rows where `stripe_status` in `['active','trialing']` and (`ends_at` is null or future).
- `newSubscriptionsSeries(string $period): array` — `[{date, count}]` from `subscriptions.created_at`, grouped by `DATE()`, within the period window (`7d`/`30d`/`all`; `all` = last 90 days for the chart). `cost_cents` field included as 0 to satisfy the shared `LineChart` type.
- `recentSubscriptions(int $limit = 10): array` — latest subscriptions with `{id, user_name, user_email, tier, stripe_status, created_at}` (tier inferred from `stripe_price` via a price-id→tier reverse map built from config, falling back to the user's `plan_tier`).
- `liveActiveSubscriptions(): ?int` — null when `config('cashier.secret')` is empty; else `Cache::remember('revenue.live_active_subs', 3600, ...)` wrapping `Cashier::stripe()->subscriptions->all(['status'=>'active','limit'=>100])` count; returns null on Throwable (`Log::warning`). Best-effort, same shape as `OpenAiUsageService`.

## Controller — `App\Http\Controllers\Admin\AdminRevenueController`

Constructor injects `RevenueReport`. `index(Request)`:
- `?period=7d|30d|all` (default `30d`), normalized.
- Builds `kpis` (`{mrr_cents, active_subscriptions, paying_users, free_users}`), `tierBars` (`[{label, count, cost_cents:0}]` for the BarList), `series`, `recent`, `liveActiveSubscriptions`, `period`.
- Renders `Admin/Revenue/Index`.

## Route

Inside `admin.` group: `Route::get('/revenue', [AdminRevenueController::class, 'index'])->name('revenue.index');`

## Frontend — `resources/js/Pages/Admin/Revenue/Index.tsx`

`AdminLayout`. Reuses `Admin/Ai/Charts.tsx` (`Stat`, `BarList`, `LineChart`, `fmtCents`).
- KPI row: MRR (fmtCents), Active subs, Paying users, Free users.
- Reconcile note: if `liveActiveSubscriptions` is non-null, show "Stripe live: N active" beside the local count; if null, muted "Stripe reconcile unavailable".
- Tier distribution `BarList`.
- New-subscriptions `LineChart` with 7d/30d/all period buttons (Inertia `Link`s preserving the page).
- Recent subscriptions table.

Add a **Revenue** nav entry to `AdminLayout` (`admin.revenue.*`).

## Testing

`tests/Feature/Admin/AdminRevenueTest.php`:
1. `tierCounts` zero-fills all four tiers and counts correctly.
2. `mrrCents` = starter*900 + pro*1900 + agency*4900 for seeded `UserFactory` tier states.
3. `activeSubscriptions` counts only active/trialing, excludes canceled (`ends_at` past).
4. Index renders `Admin/Revenue/Index` with `kpis.mrr_cents`, `tierBars`, `series`, `recent`, and `liveActiveSubscriptions` present (null is fine).
5. `liveActiveSubscriptions` returns null when `cashier.secret` is unset.
6. Non-master-admin 403.

`config(['services.stripe.tier_prices' => [...]])` set explicitly in the MRR test so it doesn't depend on env.

## Out of scope

True historical MRR/ARR time-series (no snapshot table exists — the chart shows new-subscription volume, not MRR over time); churn-rate computation; refunds/proration accuracy. These need a periodic snapshot job, deferred.
