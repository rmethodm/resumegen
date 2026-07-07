# Admin Ops Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Master-admin ops dashboard — queue depth, failed jobs (retry/forget), scheduled tasks, config health.

**Architecture:** `AdminOpsController` (index + retry + forget) querying `jobs`/`failed_jobs` + `Schedule` + config → `Admin/Ops/Index.tsx` (reuses Charts `Stat`). Destructive actions audited via `AdminAuditLog`.

**Tech Stack:** Laravel 13, PHP 8.4, database queue, Inertia v2, React/TS, PHPUnit 12.

---

### Task 1: Controller + routes + backend tests

**Files:**
- Create: `app/Http/Controllers/Admin/AdminOpsController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/Admin/AdminOpsTest.php`

- [ ] Write tests: `forgetFailed` deletes row + audits `ops.job.forget`; `retryFailed` removes row + audits `ops.job.retry` + redirects; non-admin 403 on index + forget. (Index Inertia assertions deferred to Task 2.)
- [ ] Run → FAIL.
- [ ] Implement controller (index/retryFailed/forgetFailed per spec) + 3 routes + imports.
- [ ] Run backend tests → PASS. Pint. Commit.

### Task 2: Frontend + nav + index test

**Files:**
- Create: `resources/js/Pages/Admin/Ops/Index.tsx`
- Modify: `resources/js/Layouts/AdminLayout.tsx`
- Test: add index-render + failed-job-listed + health tests

- [ ] Build page: status tiles, health checklist, failed jobs table (retry/forget), schedule table. Reuse `Stat`.
- [ ] Add `Ops` nav entry.
- [ ] `npm run build`. Add + run index/listing/health tests + full file → PASS. Commit.

### Task 3: Docs + finish

- [ ] CLAUDE.md note. Full suite green. Merge to main.
