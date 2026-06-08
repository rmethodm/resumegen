# Recruiter / Agency Multi-Seat Design

## Goal

Add an Agency pricing tier that lets a recruiter or staffing firm manage a workspace of candidates, view all their resumes, and leave private annotations — without affecting how candidates use the app.

## Architecture

A new `organizations` table owns the workspace. An `organization_members` pivot joins users to orgs with a `role` of `admin` or `member`. A `recruiter_notes` table stores per-resume annotations visible only to org admins. Candidates experience the app identically to today; the recruiter gets an additional `/org/*` dashboard layered on top.

Pricing details (Stripe price IDs, seat limits) are deferred — the tier is wired as `'agency'` throughout `UserLimits` and `User::planTier()` but left unconfigured in `config/services.php` for now.

**Tech stack:** Laravel 13, Inertia v2, React 18, same patterns as existing admin/billing code.

---

## Data Model

### `organizations`
| column | type | notes |
|---|---|---|
| `id` | bigIncrements | |
| `name` | string(150) | |
| `owner_id` | FK → users (restrict) | the admin who created the org |
| `seat_limit` | unsignedTinyInt, default 10 | configurable per org |
| `created_at` / `updated_at` | timestamps | |

### `organization_members`
| column | type | notes |
|---|---|---|
| `id` | bigIncrements | |
| `organization_id` | FK → organizations (cascade) | |
| `user_id` | FK → users (nullOnDelete) | null if invite not yet accepted |
| `role` | enum `admin`, `member` | |
| `invite_email` | string, nullable | for pending invites not yet accepted |
| `invite_token` | string(64), unique, nullable | for join link |
| `invited_at` | timestamp | |
| `joined_at` | timestamp, nullable | null until accepted |
| `created_at` (only) | timestamp | append-only for invite log; `UPDATED_AT = null` |

### `recruiter_notes`
| column | type | notes |
|---|---|---|
| `id` | bigIncrements | |
| `organization_id` | FK → organizations (cascade) | |
| `resume_id` | FK → resumes (cascade) | |
| `author_id` | FK → users (cascade) | must be org admin |
| `body` | text | max 2000 chars |
| `created_at` / `updated_at` | timestamps | |

Unique constraint on `(organization_id, resume_id)` — one note block per resume per org (recruiter edits in place).

---

## Authorization

- **`OrgPolicy`**: `view`, `update`, `invite`, `removeMembers` — all require `$user->id === $org->owner_id` (admin only for now; multi-admin is deferred).
- **`RecruiterNotePolicy`**: `viewAny` / `upsert` — user must be an admin of the org that owns the note's `organization_id`.
- Candidates never see recruiter notes; the notes panel in the editor is only injected when the viewer is an org admin viewing a member's resume.
- A new `EnsureOrgAdmin` middleware (alias `org.admin`) guards all `/org/*` mutating routes.

---

## Routes

All under `auth` middleware.

```
GET    /org                          OrgController@show         org.show
GET    /org/create                   OrgController@create       org.create
POST   /org                          OrgController@store        org.store
PATCH  /org                          OrgController@update       org.update

POST   /org/invite                   OrgInviteController@store  org.invite.store
DELETE /org/members/{member}         OrgInviteController@destroy org.invite.destroy

GET    /org/join/{token}             OrgJoinController@show     org.join.show
POST   /org/join/{token}             OrgJoinController@store    org.join.store

GET    /org/resumes/{resume}         OrgResumeController@show   org.resume.show
PUT    /org/resumes/{resume}/notes   OrgResumeController@upsertNote  org.resume.notes
```

`/org/join/{token}` is unauthenticated (guest middleware only) so the candidate can register/login and land in the workspace in one flow.

---

## New Pages (Inertia / React)

### `Org/Show.tsx` — Recruiter dashboard
- Header: org name, seat usage (`N / seat_limit members`), "Invite" button
- Members table: name, email, joined date, resume count, link to view each resume
- Pending invites list with revoke button

### `Org/Create.tsx` — First-time org setup
- Single field: org name. On submit → `POST /org`.

### `Org/Join.tsx` — Candidate join page
- Shows org name and inviting admin name. "Accept & Join" button → `POST /org/join/{token}`.
- If unauthenticated, redirects to register/login with `intended` URL preserved.

### `Org/Resume.tsx` — Recruiter's read-only view of a candidate resume
- Renders the resume PDF preview iframe (existing `/builder/{resume}/preview` endpoint).
- Recruiter notes textarea on the right — auto-saves on blur (`PUT /org/resumes/{resume}/notes`).
- Breadcrumb back to `Org/Show`.

---

## Modified Pages / Components

### `ResumeBuilder/Edit.tsx`
- When props include `recruiterNote` (string | null), render a read-only amber-bordered "Recruiter note" block in the editor sidebar.
- `recruiterNote` is injected by `ResumeBuilderController@edit` when the authenticated user is a member of an org whose admin has left a note on this resume.
- Candidates cannot edit or delete recruiter notes.

### `ResumeBuilderController@edit`
- Adds `recruiterNote` prop: queries `recruiter_notes` for a note on this resume by any org the user belongs to as a `member`. Returns `null` if none.

### `AuthenticatedLayout.tsx`
- If `auth.user.org_role === 'admin'`, show an "Org" nav link pointing to `/org`.

### `HandleInertiaRequests`
- Share `auth.user.org_role` (`'admin'` | `'member'` | `null`) so the layout can conditionally show the org nav link.

---

## Email

`OrgInviteMail` — sent to `invite_email` when recruiter invites a candidate. Contains the join URL (`/org/join/{token}`). Uses existing `Mailable` pattern (see `NewQuestionReceived`).

---

## UserLimits / Tier

- `User::planTier()` gains an `'agency'` arm: `is_agency` boolean column on `users` (same pattern as `is_pro`), togglable via admin panel.
- `UserLimits` treats `'agency'` identically to `'pro'` for all existing gates (resumes, AI, DOCX, etc.) since agency users are primarily recruiting tools, not resume authors themselves.
- Seat limit is stored on the `organizations` row, not in `UserLimits`.

---

## Tests

`tests/Feature/OrgTest.php` — covers:
1. Admin can create an org
2. Admin can invite a candidate by email (sends mail, creates pending member)
3. Candidate can accept invite via token (sets `joined_at`, links `user_id`)
4. Admin sees all member resumes on org dashboard
5. Admin can upsert a recruiter note on a member resume
6. Candidate sees recruiter note in editor (read-only prop)
7. Candidate cannot see recruiter note on another org member's resume
8. Non-admin cannot access `/org` routes (403)
9. Invite token is single-use — second acceptance returns 404
10. Admin can remove a member (deletes member row, note survives)

---

## Out of Scope

- Multi-admin orgs (one admin per org for now)
- Candidate editing recruiter notes
- Org-level Stripe billing (price IDs deferred — org plan activated via `is_agency` flag for now, same as `is_pro`)
- Org-to-org resume sharing
- Recruiter editing a candidate's resume content
