# Admin Retention Cohorts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Weekly retention cohorts on the Growth dashboard, powered by a deduplicated daily-activity table stamped via middleware.

**Architecture:** `user_activity_days` table + `UserActivityDay` model; `TrackActivity` middleware (session-gated, appended to web group); `GrowthReport::retentionCohorts()`; `AdminGrowthController` passes `retention`; cohort table in `Admin/Growth/Index.tsx`.

**Tech Stack:** Laravel 13, PHP 8.4, Inertia v2, React/TS, PHPUnit 12.

---

### Task 1: Table + model + middleware + tests

**Files:**
- Create: `database/migrations/2026_06_13_230000_create_user_activity_days_table.php`
- Create: `app/Models/UserActivityDay.php`
- Create: `app/Http/Middleware/TrackActivity.php`
- Modify: `bootstrap/app.php` (append to web group)
- Test: `tests/Feature/Admin/RetentionCohortTest.php`

- [ ] Tests: auth request inserts 1 row; same-session repeat adds none; guest inserts none.
- [ ] Run → FAIL.
- [ ] Migration + model (`$timestamps=false`) + middleware + register.
- [ ] Migrate. Run → PASS. Pint. Commit.

### Task 2: GrowthReport::retentionCohorts + test

**Files:**
- Modify: `app/Services/GrowthReport.php`
- Test: `tests/Feature/Admin/RetentionCohortTest.php`

- [ ] Test: `retention[0]=100.0` for a user signed up this week with an activity row this week; `0.0` with none.
- [ ] Run → FAIL.
- [ ] Implement `retentionCohorts(weeks=6)` per spec.
- [ ] Run → PASS. Pint. Commit.

### Task 3: Controller + page + test + build

**Files:**
- Modify: `app/Http/Controllers/Admin/AdminGrowthController.php`
- Modify: `resources/js/Pages/Admin/Growth/Index.tsx`
- Test: `tests/Feature/Admin/RetentionCohortTest.php`

- [ ] Test: growth index includes `retention`.
- [ ] Add `retention` prop; add cohort table (shaded cells) to Growth page.
- [ ] `npm run build`. Run full file + AdminGrowthTest → PASS. Commit.

### Task 4: Docs + finish

- [ ] CLAUDE.md note. Full suite green. Merge to main.
