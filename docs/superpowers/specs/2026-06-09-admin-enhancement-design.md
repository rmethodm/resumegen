# Admin Section Enhancement — Design Spec

**Date:** 2026-06-09
**Goal:** Expand the admin area to cover all features added since initial setup — organizations, portfolio messages, referrals, job title moderation, and AI model rates — plus enhance the existing users section with search, richer detail, and impersonation.

---

## Overview

The current admin section has three surfaces: Users (list + toggle/delete), AI Usage (read-only cost dashboard), and Career Hub (article CRUD). Six major features have been added to the app with no admin management surface. This spec defines a unified admin dashboard and seven managed sections.

---

## Architecture & Navigation

### AdminLayout

A new `AdminLayout` component wraps all `/admin/*` pages. It renders `AuthenticatedLayout` as its outer shell, then adds a horizontal sub-nav bar beneath the main header with icon+label links to each admin section. The active section is highlighted.

**Sub-nav links (left to right):**
`Dashboard` · `Users` · `Organizations` · `Messages` · `Referrals` · `Job Titles` · `AI Rates` · `Career`

All admin pages extend `AdminLayout` instead of raw `AuthenticatedLayout`. The main app header retains its single "Admin" entry point, now linking to `/admin` (the dashboard landing page).

**No new middleware.** All sections remain behind the existing `master_admin` gate (`EnsureMasterAdmin`).

### Admin Dashboard (`GET /admin`)

A landing page rendered by `AdminDashboardController@index`. Displays a grid of stat+link cards — one per section. Each card shows a live count and a short description.

| Card | Stat |
|---|---|
| Users | Total registered users |
| Organizations | Total orgs |
| Messages | Unread portfolio messages |
| Referrals | Total upgrade conversions |
| Job Titles | Total roles + titles entries |
| AI Rates | Active rate count |
| Career | Published articles |

Cards link to their respective section. Counts are a single aggregated query per card — no N+1.

---

## Section 1: Enhanced Users (`/admin/users`)

### Table columns

| Column | Source |
|---|---|
| Name | `users.name` |
| Email | `users.email` |
| Plan Tier | `users.plan_tier` + Pro/Agency override badges |
| Resumes | `withCount('resumes')` |
| Cover Letters | `withCount('coverLetters')` |
| Jobs | `withCount('jobApplications')` |
| Portfolio | `users.portfolio_slug` (linked to `/p/{slug}` if set) |
| Last Active | Max `created_at` from `ai_usage_logs` for user (subquery) |
| Joined | `users.created_at` |
| Actions | Impersonate · Grant/Revoke Pro · Agency toggle · Delete |

### Search & Filter

- Text input: filters by name or email (server-side `LIKE %q%`, debounced 300ms on the client, passed as `?q=` query param)
- Plan dropdown: `all / free / starter / pro / agency` (passed as `?plan=` query param)
- Both params are preserved across pagination

### Impersonation

**Start impersonation:**
- Route: `POST /admin/users/{user}/impersonate` → `AdminImpersonationController@store`
- Stores `impersonating_id` (the target user's ID) and `impersonator_id` (the admin's ID) in the session
- Redirects to `/dashboard` as the target user

**During impersonation:**
- `AuthenticatedLayout` reads `session('impersonating_id')`; when present, renders a persistent amber banner: `"Impersonating {name} — [Stop]"`
- The banner is only visible when an impersonation session key exists (cannot be spoofed by regular users)
- All requests execute as the target user — policies, `UserLimits`, rate limits, and tier gates all apply normally

**Stop impersonation:**
- Route: `DELETE /admin/impersonate` → `AdminImpersonationController@destroy`
- Clears both session keys, redirects to `/admin/users`

**Guards:**
- Blocked if target `is_master_admin` (returns flash error)
- Blocked if target is self (returns flash error)
- `AdminImpersonationController` is behind `master_admin` middleware

---

## Section 2: Organizations (`/admin/organizations`)

### Routes
- `GET /admin/organizations` → `AdminOrganizationController@index` → `Admin/Organizations/Index.tsx`
- `GET /admin/organizations/{organization}` → `AdminOrganizationController@show` → `Admin/Organizations/Show.tsx`
- `DELETE /admin/organizations/{organization}` → `AdminOrganizationController@destroy`

### Index page

Table columns: Name, Owner (name + email), Member Count, Created. Each row links to the detail page.

### Detail page

Shows org header (name, owner, created) and a members table: Name, Email, Role (`admin` / `member`), Joined Org.

### Delete

Confirmation modal: "Delete {org name}? This will remove all members and recruiter notes. This cannot be undone."

Cascade on delete: `organization_members` rows, `recruiter_notes` rows (where the note's org context applies). User accounts are **not** deleted — only org membership is removed.

---

## Section 3: Portfolio Messages (`/admin/messages`)

### Routes
- `GET /admin/messages` → `AdminMessageController@index` → `Admin/Messages/Index.tsx`
- `GET /admin` → `AdminDashboardController@index` → `Admin/Dashboard.tsx` (registered before the existing admin group)
- `PATCH /admin/messages/{message}/read` → `AdminMessageController@markRead`
- `DELETE /admin/messages/{message}` → `AdminMessageController@destroy`

### Index page

A unified inbox across all portfolio contact form submissions.

Columns: Sender Name, Sender Email, Recipient (portfolio owner name, linked to `/p/{slug}`), Message (truncated to 100 chars, full text on row expand or hover tooltip), Received, Status (Unread / Read).

**Filter:** `All / Unread` tab switcher (passed as `?filter=unread` query param).

**Per-row actions:** Mark Read · Delete (with inline confirmation, no modal needed for single-message delete).

No reply action — messages are between the sender and the portfolio owner; admin view is for abuse monitoring only.

---

## Section 4: Referrals (`/admin/referrals`)

### Routes
- `GET /admin/referrals` → `AdminReferralController@index` → `Admin/Referrals/Index.tsx`

### Page layout

Two panels stacked vertically.

**Referral Events table** (paginated):
Columns: Referred User, Referred By, Event Type (`signup` / `upgrade`), Reward Granted (✓ / –), Date.

**Top Referrers leaderboard** (top 20):
Columns: User, Total Referrals, Upgrades Converted, Rewards Earned (count from `referral_rewards_earned` on users).

Read-only. No write actions — rewards are granted automatically by `ReferralRewardService`.

---

## Section 5: Job Titles Moderation (`/admin/job-titles`)

### Routes
- `GET /admin/job-titles` → `AdminJobTitleController@index` → `Admin/JobTitles/Index.tsx`
- `POST /admin/job-roles` → `AdminJobTitleController@storeRole`
- `POST /admin/job-titles` → `AdminJobTitleController@storeTitle`
- `PATCH /admin/job-roles/{role}` → `AdminJobTitleController@updateRole`
- `PATCH /admin/job-titles/{title}` → `AdminJobTitleController@updateTitle`
- `DELETE /admin/job-roles/{role}` → `AdminJobTitleController@destroyRole`
- `DELETE /admin/job-titles/{title}` → `AdminJobTitleController@destroyTitle`
- `DELETE /admin/job-roles` (bulk) → `AdminJobTitleController@bulkDestroyRoles`
- `DELETE /admin/job-titles` (bulk) → `AdminJobTitleController@bulkDestroyTitles`

Separate route prefixes for `job-roles` and `job-titles` avoid a type-discriminator query param and keep model binding clean. The single index page at `GET /admin/job-titles` serves both tabs.

### Page layout

A tab switcher at the top: **Roles** / **Titles**. Both tabs share identical UI — only the data source differs.

**Per-tab:**
- Search input (server-side, `?q=` param)
- Paginated table: checkbox · Title · Created · Actions (Edit · Delete)
- Inline edit: clicking the title cell turns it into a text input; saves on blur or Enter key; cancels on Escape
- Bulk delete: selecting checkboxes reveals a "Delete selected ({n})" button; clicking opens a single confirmation modal before executing
- "Add entry" button at top-right: small inline form (single title input + Save)

**Validation:** Title required, 2–150 chars, title-cased on save (same transform as `AutocompleteController`).

---

## Section 6: AI Model Rates (`/admin/ai-rates`)

### Routes
- `GET /admin/ai-rates` → `AdminAiRateController@index` → `Admin/AiRates/Index.tsx`
- `POST /admin/ai-rates` → `AdminAiRateController@store`

### Page layout

**Current Rates summary** at the top: a compact grid showing the active rate per model (most recent row per `provider + model`). Columns: Provider, Model, Input $/1K, Output $/1K, Effective From.

**Full Rate History** below: paginated table of all `ai_model_rates` rows, same columns plus a "Superseded" badge on non-active rows.

**Add Rate form** (below or in a slide-in panel):
Fields: Provider (text, e.g. `anthropic`), Model (text, e.g. `claude-sonnet-4-6`), Input cost per 1K tokens (decimal), Output cost per 1K tokens (decimal), Effective From (date, defaults to today).

**No editing past rows.** The schema is append-only to preserve accurate historical cost attribution. New rows supersede old ones for the same `provider + model`.

**Validation:** Provider and model required; costs must be positive decimals (≥ 0); effective date cannot be before today.

---

## File Map

### New Controllers
| File | Purpose |
|---|---|
| `app/Http/Controllers/AdminDashboardController.php` | `/admin` landing with stat counts |
| `app/Http/Controllers/AdminImpersonationController.php` | Start/stop impersonation |
| `app/Http/Controllers/AdminOrganizationController.php` | Org list, detail, delete |
| `app/Http/Controllers/AdminMessageController.php` | Portfolio messages inbox |
| `app/Http/Controllers/AdminReferralController.php` | Referral events + leaderboard |
| `app/Http/Controllers/AdminJobTitleController.php` | Job roles/titles CRUD + bulk delete |
| `app/Http/Controllers/AdminAiRateController.php` | AI rate history + add new rate |

### New Frontend Pages
| File | Purpose |
|---|---|
| `resources/js/Layouts/AdminLayout.tsx` | Shared admin sub-nav layout |
| `resources/js/Pages/Admin/Dashboard.tsx` | Landing page stat cards |
| `resources/js/Pages/Admin/Organizations/Index.tsx` | Org list |
| `resources/js/Pages/Admin/Organizations/Show.tsx` | Org detail + members |
| `resources/js/Pages/Admin/Messages/Index.tsx` | Portfolio messages inbox |
| `resources/js/Pages/Admin/Referrals/Index.tsx` | Referral events + leaderboard |
| `resources/js/Pages/Admin/JobTitles/Index.tsx` | Roles/titles moderation |
| `resources/js/Pages/Admin/AiRates/Index.tsx` | Rate history + add form |

### Modified Files
| File | Change |
|---|---|
| `routes/web.php` | Add 14 new admin routes |
| `resources/js/Layouts/AuthenticatedLayout.tsx` | Impersonation banner; "Admin" links to `/admin` |
| `resources/js/Pages/Admin/Usage.tsx` | Extend `AdminLayout` |
| `resources/js/Pages/Admin/Users/Index.tsx` | Enhanced columns, search/filter, impersonate button |
| `app/Http/Controllers/AdminUserController.php` | Add search/filter/count queries |

---

## Testing

| Test File | Coverage |
|---|---|
| `tests/Feature/AdminDashboardTest.php` | Loads, stat counts accurate, 403 for non-admins |
| `tests/Feature/AdminImpersonationTest.php` | Store sets session, destroy clears it, banner visible, blocked for master admin + self |
| `tests/Feature/AdminOrganizationsTest.php` | List + detail load, delete cascades members + notes |
| `tests/Feature/AdminMessagesTest.php` | Inbox loads, unread filter, mark-read, delete |
| `tests/Feature/AdminReferralsTest.php` | Table and leaderboard load with correct aggregates |
| `tests/Feature/AdminJobTitlesTest.php` | Search, inline edit, delete, bulk-delete, add — for both roles and titles |
| `tests/Feature/AdminAiRatesTest.php` | List loads, add creates row, past rows preserved, active rate resolves correctly |

---

## Error Handling

- All destructive actions (delete user, delete org, bulk-delete titles) require a confirmation modal
- Impersonation failures flash an error and stay on `/admin/users`
- AI rate form rejects: non-positive costs, past effective dates, missing provider/model
- Job title edits reject values under 2 chars or over 150 chars
- All routes behind `master_admin` middleware — no new auth surface introduced
