# Admin Growth Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Master-admin growth dashboard — signups trend, activation/conversion rates, time-to-convert, referral attribution. From existing tables only.

**Architecture:** `GrowthReport` service → `AdminGrowthController@index` → `Admin/Growth/Index.tsx` (reuses `Admin/Ai/Charts.tsx`).

**Tech Stack:** Laravel 13, PHP 8.4, Cashier 16, Inertia v2, React/TS, PHPUnit 12.

---

### Task 1: GrowthReport service + unit tests

**Files:**
- Create: `app/Services/GrowthReport.php`
- Test: `tests/Feature/Admin/AdminGrowthTest.php`

- [ ] Tests: `signupsSeries` windowed counts; `activationRate` 50% case; `conversionRate`; `funnel` three rows; `avgDaysToConvert` (incl. null); `referral` counts.
- [ ] Run → FAIL.
- [ ] Implement `GrowthReport` per spec.
- [ ] Run → PASS. Pint. Commit.

### Task 2: Controller + route + index test

**Files:**
- Create: `app/Http/Controllers/Admin/AdminGrowthController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/Admin/AdminGrowthTest.php`

- [ ] Test: index renders `Admin/Growth/Index` with `kpis`/`signups`/`funnel`/`referral`; non-admin 403.
- [ ] Implement controller + route + import.
- [ ] Run (FAIL on Vite manifest) → Task 3.

### Task 3: Frontend + nav + build

**Files:**
- Create: `resources/js/Pages/Admin/Growth/Index.tsx`
- Modify: `resources/js/Layouts/AdminLayout.tsx`

- [ ] Build page: period buttons, KPI row, signups LineChart, funnel BarList, referral card. Reuse Charts.
- [ ] Add `Growth` nav entry.
- [ ] `npm run build`. Run full growth file → PASS. Commit.

### Task 4: Docs + finish

- [ ] CLAUDE.md note. Full suite green. Merge to main.
