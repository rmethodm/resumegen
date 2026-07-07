# Admin Content Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Master-admin search/view/delete/unpublish across resumes, cover letters, jobs, share links, portfolios — every destructive action audited.

**Architecture:** `AdminContentController` (one tabbed index + read-only resume view + 5 destructive actions) → `Admin/Content/{Index,Resume}.tsx`. Reuses `AdminAuditLog::record()`.

**Tech Stack:** Laravel 13, PHP 8.4, Inertia v2, React/TS, PHPUnit 12.

---

### Task 1: Controller + routes + backend tests

**Files:**
- Create: `app/Http/Controllers/Admin/AdminContentController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/Admin/AdminContentTest.php`

- [ ] Write `AdminContentTest` covering: index default resumes + owner; type switches (cover-letters/jobs/portfolios); `?q=` by owner email; `destroyResume` deletes + audits `content.resume.delete`; `disableShareLink` sets is_active=false + audits; `unpublishPortfolio` sets portfolio_is_public=false + audits; non-admin 403. (showResume assertion deferred to Task 2 — needs the page built.)
- [ ] Run → FAIL (no routes).
- [ ] Implement controller per spec + add 7 routes + import.
- [ ] Run backend tests (exclude showResume) → PASS.
- [ ] `vendor/bin/pint --dirty --format agent`. Commit.

### Task 2: Frontend pages + nav + showResume test

**Files:**
- Create: `resources/js/Pages/Admin/Content/Index.tsx`
- Create: `resources/js/Pages/Admin/Content/Resume.tsx`
- Modify: `resources/js/Layouts/AdminLayout.tsx`
- Test: `tests/Feature/Admin/AdminContentTest.php` (add `test_show_resume_renders`)

- [ ] Build `Index.tsx` (tabs + search + per-type tables + delete/unpublish actions) and `Resume.tsx` (read-only sections). Match `Admin/Audit/Index.tsx` styling.
- [ ] Add nav entry `Content` → `admin.content.index`, pattern `admin.content.*`.
- [ ] `npm run build`.
- [ ] Add + run `test_show_resume_renders` and the full file → PASS.
- [ ] Commit (source only).

### Task 3: Docs + finish

- [ ] CLAUDE.md note under admin panel: AdminContentController routes + audit actions.
- [ ] Full suite green.
- [ ] finishing-a-development-branch → merge to main.
