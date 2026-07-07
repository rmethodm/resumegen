# Admin MRR Snapshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Daily `revenue_snapshots` row + `mrrSeries()` + MRR-over-time chart on the Revenue dashboard.

**Architecture:** `revenue_snapshots` table + `RevenueSnapshot` model; `revenue:snapshot` command (idempotent upsert via `RevenueReport`); `RevenueReport::mrrSeries()`; `AdminRevenueController` passes `mrrSeries`; `Admin/Revenue/Index.tsx` adds a LineChart.

**Tech Stack:** Laravel 13, PHP 8.4, Inertia v2, React/TS, PHPUnit 12.

---

### Task 1: Table + model + command + tests

**Files:**
- Create: `database/migrations/2026_06_13_220000_create_revenue_snapshots_table.php`
- Create: `app/Models/RevenueSnapshot.php`
- Create: `app/Console/Commands/CaptureRevenueSnapshot.php`
- Modify: `routes/console.php`
- Modify: `app/Services/RevenueReport.php` (add `mrrSeries`)
- Test: `tests/Feature/Admin/RevenueSnapshotTest.php`

- [ ] Tests: command creates row with computed mrr; idempotent (run twice → 1 row); `mrrSeries('30d')` ordered + excludes 100d-old.
- [ ] Run → FAIL.
- [ ] Migration + model + command (`updateOrCreate` on `captured_on`) + schedule daily + `mrrSeries`.
- [ ] Migrate. Run → PASS. Pint. Commit.

### Task 2: Controller + page + test + build

**Files:**
- Modify: `app/Http/Controllers/Admin/AdminRevenueController.php`
- Modify: `resources/js/Pages/Admin/Revenue/Index.tsx`
- Test: `tests/Feature/Admin/RevenueSnapshotTest.php`

- [ ] Test: revenue index includes non-empty `mrrSeries` when a snapshot exists.
- [ ] Add `mrrSeries` prop in controller; add "MRR over time" LineChart card + empty hint.
- [ ] `npm run build`. Run full file + AdminRevenueTest → PASS. Commit.

### Task 3: Docs + finish

- [ ] CLAUDE.md note. Full suite green. Merge to main.
