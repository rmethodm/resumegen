# Admin MRR Snapshots — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Part of:** Super-admin stretch items (sub-project 6)

## Goal

Capture a daily snapshot of the revenue metrics so the Revenue dashboard can show **true MRR-over-time** (today's `RevenueReport` only computes point-in-time numbers — there's no history). A scheduled command writes one row per day; the Revenue page reads it as a time series.

## Data model — `revenue_snapshots`

| column | type | notes |
|---|---|---|
| `id` | bigIncrements | |
| `captured_on` | date, **unique** | one row per day (idempotent upsert) |
| `mrr_cents` | unsignedBigInteger | |
| `paying_users` | unsignedInteger | |
| `free_users` | unsignedInteger | |
| `active_subscriptions` | unsignedInteger | |
| `tier_counts` | json | `{free,starter,pro,agency}` for later breakdowns |
| timestamps | | standard |

## Model — `App\Models\RevenueSnapshot`

- fillable: all columns; casts `captured_on => date`, `tier_counts => array`.

## Command — `revenue:snapshot`

`App\Console\Commands\CaptureRevenueSnapshot` (signature `revenue:snapshot`). Uses the injected `RevenueReport` to compute today's metrics and `updateOrCreate(['captured_on' => today()], [...])` — idempotent: re-running the same day overwrites, so a manual run or a missed-then-catchup run never duplicates. Scheduled daily in `routes/console.php`.

## RevenueReport addition

`mrrSeries(string $period): array` — reads `revenue_snapshots` within the period window (`7d`/`30d`/`all`=90d cap), ordered by `captured_on`, mapped to the shared `LineChart` shape `[{date, count, cost_cents}]` where `count = round(mrr_cents / 100)` (MRR in whole dollars) and `cost_cents = mrr_cents` (so the tooltip/label can show exact cents via `fmtCents`).

## Controller + page

`AdminRevenueController@index` passes an additional `mrrSeries` prop (using the same `period`). `Admin/Revenue/Index.tsx` adds an **"MRR over time"** `LineChart` card next to the existing "New subscriptions" chart. When `mrrSeries` is empty (no snapshots captured yet), the chart shows its built-in empty state — add a one-line muted hint "Daily snapshots start accruing after the first `revenue:snapshot` run."

## Testing

`tests/Feature/Admin/RevenueSnapshotTest.php`:
1. `revenue:snapshot` creates a row with the computed `mrr_cents` (seed tier users + set `tier_prices` config).
2. Running it twice the same day yields exactly one row (idempotent upsert).
3. `mrrSeries('30d')` returns ordered points from seeded snapshots, excludes a 100-day-old one.
4. Revenue index includes a non-empty `mrrSeries` when a snapshot exists.

## Out of scope

Backfilling history before today (no source data exists — the series starts the day the command first runs); churn/expansion-revenue decomposition; ARR. The snapshot table is the foundation those could later build on.
