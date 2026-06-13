# Admin Content Management — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Part of:** Super-admin initiative (sub-project 2 of 4)

## Goal

Give a master admin one place to search, inspect, and moderate any user's content — resumes, cover letters, job applications, share links, and public portfolios — with delete + force-unpublish powers. No editing of content (view + delete + unpublish only). Every destructive action is recorded via `AdminAuditLog::record()` (sub-project 1).

## Controller — `App\Http\Controllers\Admin\AdminContentController`

Master-admin gated by the existing `admin` route group. All list methods eager-load the owner and search by owner email/name + the item's own title field.

### `index(Request $request): Response`
- `?type=resumes|cover-letters|jobs|portfolios` (default `resumes`).
- `?q=` substring search.
- Paginated (25/page, `withQueryString`), mapped to lightweight rows. Renders `Admin/Content/Index`.
- Also passes `counts` = total rows per type (4 cheap `count()` queries) for the tab badges, and current `type`/`filters`.

Per-type query + row shape:
- **resumes** — `Resume::nonSnapshot()->with('user:id,name,email')->withCount('shareLinks')`; search `name` or owner. Row: `{id, name, template, owner, share_links_count, is_master, created_at}`.
- **cover-letters** — `CoverLetter::with('user:id,name,email')`; search `name`. Row: `{id, name, template_key, owner, created_at}`.
- **jobs** — `JobApplication::with('user:id,name,email')`; search `company`/`role`. Row: `{id, company, role, status, owner, created_at}`.
- **portfolios** — `User::whereNotNull('portfolio_slug')`; search `portfolio_slug`/email. Row: `{id, name, email, portfolio_slug, portfolio_is_public}`.

`owner` shape everywhere: `{id, name, email}` (null-safe).

### `showResume(Resume $resume): Response`
Read-only view of one resume's content. Passes the resume's display fields (name, template, contact, summary, experience, education, skills, certifications, custom_sections, owner). Renders `Admin/Content/Resume`. No edit, no PDF (owner-policy-gated).

### Destructive actions (each calls `AdminAuditLog::record()` then acts, returns `back()` with flash)
- `destroyResume(Resume $resume)` → audit `content.resume.delete` → `$resume->delete()` (model cascade handles variants/snapshots).
- `destroyCoverLetter(CoverLetter $coverLetter)` → `content.cover-letter.delete`.
- `destroyJob(JobApplication $jobApplication)` → `content.job.delete`.
- `disableShareLink(ResumeShareLink $shareLink)` → `content.share-link.disable` → `update(['is_active' => false])`.
- `unpublishPortfolio(User $user)` → `content.portfolio.unpublish` → `update(['portfolio_is_public' => false])`.

Audit `description` includes the owner email + item identifier; `meta` carries the id.

## Routes (inside `admin.` group)

```
GET    /content                                   content.index
GET    /content/resumes/{resume}                  content.resume.show
DELETE /content/resumes/{resume}                  content.resume.destroy
DELETE /content/cover-letters/{coverLetter}       content.cover-letter.destroy
DELETE /content/jobs/{jobApplication}             content.job.destroy
PATCH  /content/share-links/{shareLink}/disable   content.share-link.disable
PATCH  /content/users/{user}/unpublish-portfolio  content.portfolio.unpublish
```

## Frontend

`resources/js/Pages/Admin/Content/Index.tsx` — `AdminLayout`. Tab bar (resumes / cover-letters / jobs / portfolios, with count badges) that swaps `?type=`. Search box (debounced `router.get`, `preserveState`). Per-type table:
- resumes: name · owner · template · shares · [View] [Delete]
- cover-letters: name · owner · template · [Delete]
- jobs: company/role · status · owner · [Delete]
- portfolios: slug (link to `/p/{slug}`) · owner · public? · [Unpublish] (hidden when already private)

Delete/disable/unpublish use `router.delete`/`router.patch` with a `confirm()` guard. Inertia pagination links + empty states.

`resources/js/Pages/Admin/Content/Resume.tsx` — read-only rendering of the resume sections (summary, experience, education, skills, certifications) with a back link. Plain prose, no editing controls.

Add a **Content** entry to `AdminLayout` nav (`admin.content.*`).

## Testing

`tests/Feature/Admin/AdminContentTest.php`:
1. Index defaults to resumes; lists a seeded resume with its owner.
2. `?type=cover-letters` / `jobs` / `portfolios` switch the dataset.
3. `?q=` filters by owner email.
4. `showResume` renders `Admin/Content/Resume` with the content.
5. `destroyResume` deletes the row **and** writes a `content.resume.delete` audit entry.
6. `disableShareLink` sets `is_active=false` + audits.
7. `unpublishPortfolio` sets `portfolio_is_public=false` + audits.
8. Non-master-admin gets 403 on `content.index` and on a destroy route.

## Out of scope

Editing user content; bulk operations; restoring deleted content (deletes are immediate, consistent with the existing user-delete admin action).
