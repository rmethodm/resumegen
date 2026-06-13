# Admin Revenue Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Master-admin revenue dashboard — MRR, tier mix, active subs, signup trend, recent activity — from local Stripe-synced columns with optional live Stripe reconcile.

**Architecture:** `config/services.php` tier_prices map → `RevenueReport` service → `AdminRevenueController@index` → `Admin/Revenue/Index.tsx` (reuses `Admin/Ai/Charts.tsx`). Subscriptions queried via `Laravel\Cashier\Subscription`.

**Tech Stack:** Laravel 13, PHP 8.4, Cashier 16, Inertia v2, React/TS, PHPUnit 12.

---

### Task 1: Config + RevenueReport service + unit tests

**Files:**
- Modify: `config/services.php` (add `stripe.tier_prices`)
- Create: `app/Services/RevenueReport.php`
- Test: `tests/Feature/Admin/AdminRevenueTest.php`

- [ ] Add `tier_prices` map to services.php stripe block.
- [ ] Write tests: `tierCounts` zero-fills + counts; `mrrCents` math (set config explicitly); `activeSubscriptions` excludes ended; `liveActiveSubscriptions` null without `cashier.secret`.
- [ ] Run → FAIL.
- [ ] Implement `RevenueReport` per spec.
- [ ] Run → PASS. Pint. Commit.

### Task 2: Controller + route + index test

**Files:**
- Create: `app/Http/Controllers/Admin/AdminRevenueController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/Admin/AdminRevenueTest.php`

- [ ] Test: index renders `Admin/Revenue/Index` with `kpis.mrr_cents`, `tierBars`, `series`, `recent`, `liveActiveSubscriptions`; non-admin 403.
- [ ] Run → FAIL.
- [ ] Implement controller + route + import.
- [ ] Run (will FAIL on Vite manifest) → proceed to Task 3.

### Task 3: Frontend + nav + build

**Files:**
- Create: `resources/js/Pages/Admin/Revenue/Index.tsx`
- Modify: `resources/js/Layouts/AdminLayout.tsx`

- [ ] Build page: KPI row, reconcile note, tier BarList, signup LineChart + period buttons, recent table. Reuse Charts.tsx.
- [ ] Add `Revenue` nav entry.
- [ ] `npm run build`. Run full revenue test file → PASS. Commit.

### Task 4: Docs + finish

- [ ] CLAUDE.md note. Full suite green. Merge to main.
