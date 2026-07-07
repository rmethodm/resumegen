# Batch 8: Onboarding Wizard Enhancement + Career Hub

**Date:** 2026-06-07
**Status:** Approved, ready for implementation

---

## Feature 1: Onboarding Wizard Enhancement

### Goal
Capture career context (target role, industry, years of experience) and contact info immediately after registration via a dedicated multi-step wizard page, so new resumes are pre-filled from day one.

### Data Model
Three new nullable columns on `users`:
- `target_role` — string, nullable
- `industry` — string, nullable
- `years_experience` — integer, nullable

Contact info (name, phone, location, LinkedIn, website) already stored in `profile` JSON column — no change needed.

### Routes
```
GET  /onboarding        → OnboardingController@show   (auth)
POST /onboarding        → OnboardingController@store  (auth)
```
Existing `PATCH /user/onboarding` (named `onboarding.complete`) is unchanged — still used by the in-editor wizard.

### Flow
1. User registers → `RegisteredUserController` redirects to `/onboarding` instead of dashboard.
2. `GET /onboarding` renders `Onboarding/Wizard.tsx` via Inertia.
3. Wizard manages step state client-side (no round-trip between steps):
   - **Step 1** — Career context: `target_role` (text input), `industry` (text input), `years_experience` (number input 0–40).
   - **Step 2** — Contact info: `full_name`, `phone`, `location`, `linkedin_url`, `website`.
4. Submit (step 2 "Finish") → single `POST /onboarding` saves all fields + sets `has_completed_onboarding = true` → redirect to `/dashboard`.
5. "Skip for now" link on either step → same `POST /onboarding` with empty values, sets `has_completed_onboarding = true` → redirect to `/dashboard`.

### Layout
Centered card, step indicator dots at top (step 1 filled/active, step 2 hollow until reached). Matches existing GuestLayout style.

### In-Editor Wizard Update
`Edit.tsx` wizard condition updated from `isFirstResume ? 0 : 4` to `(isFirstResume && !auth.user.has_completed_onboarding) ? 0 : 4`. Users who completed the new onboarding wizard skip the editor wizard.

### Pre-Fill Behavior
- `ResumeBuilderController@store`: if `user->target_role` is set, default new resume name to `"{target_role} Resume"`.
- `target_role`, `industry`, `years_experience` exposed as props on `Edit.tsx` so the Generate Resume modal and Interview Coach panel can pre-fill their fields from the user's persona.

### Validation (`OnboardingController@store`)
All fields nullable. Where provided:
- `target_role`: string, max 100
- `industry`: string, max 100
- `years_experience`: integer, min 0, max 40
- `full_name`, `phone`, `location`: string, max 255
- `linkedin_url`, `website`: url, max 255

### Tests
- Wizard page renders for new user
- POST saves career context fields on user
- POST saves contact info to profile JSON
- POST sets `has_completed_onboarding = true`
- Skip redirects to dashboard without saving fields
- Authenticated redirect: existing users with `has_completed_onboarding = true` redirected away from `/onboarding`

---

## Feature 2: Career Hub

### Goal
A publicly accessible resource library at `/career` with articles/guides for SEO value. Database-backed with admin CRUD.

### Data Model — `career_articles`
| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `title` | string | |
| `slug` | string unique | auto-generated from title on create |
| `body` | longText | HTML content |
| `category` | string | one of predefined set |
| `meta_description` | string nullable | for SEO |
| `reading_time_minutes` | integer | computed on save: `ceil(word_count / 200)` |
| `is_published` | boolean | default false |
| `published_at` | timestamp nullable | set when `is_published` flipped to true |
| `created_at` / `updated_at` | timestamps | |

**Predefined categories:** `Resume Tips`, `Job Search`, `Interviews`, `Salary & Negotiation`, `Career Growth`

### Public Routes (no auth)
```
GET /career           → CareerHubController@index   → CareerHub/Index.tsx
GET /career/{slug}    → CareerHubController@show    → CareerHub/Show.tsx
```
`index` returns only `is_published = true` articles, ordered by `published_at` desc.
`show` 404s on unpublished articles.

### Index Page (`CareerHub/Index.tsx`)
- Uses `PublicLayout` (same as public resume view)
- Category filter pills — client-side filter, no extra routes
- Card grid (2-col desktop, 1-col mobile): category label (color-coded), title, read time
- `<Head title="Career Resources — Resumegen">`

### Show Page (`CareerHub/Show.tsx`)
- Uses `PublicLayout`
- `<Head title="{article.title} — Resumegen">` + `<meta name="description" content="{meta_description}">`
- Article body rendered as raw HTML (`dangerouslySetInnerHTML`)
- Breadcrumb: Career Hub → article title
- CTA footer: "Build your resume free →" linking to `/register`

### Admin Routes (behind `auth` + `master_admin` middleware)
```
GET    /admin/career                    → Admin\CareerController@index
GET    /admin/career/create             → Admin\CareerController@create
POST   /admin/career                    → Admin\CareerController@store
GET    /admin/career/{article}/edit     → Admin\CareerController@edit
PUT    /admin/career/{article}          → Admin\CareerController@update
DELETE /admin/career/{article}          → Admin\CareerController@destroy
```

### Admin UI
- `Admin/Career/Index.tsx` — table: title, category, status (Published/Draft), published date, Edit/Delete actions. Link from existing admin nav.
- `Admin/Career/Edit.tsx` — form: title, slug (editable), body (large textarea), category (select), meta description, `is_published` toggle. Setting `is_published = true` sets `published_at` if not already set.

### Navigation
- "Career" link added to `Welcome.tsx` public nav.
- Not added to authenticated `AuthenticatedLayout` nav (marketing surface only).

### `CareerArticle` Model
- `$fillable`: all columns except `id`, `created_at`, `updated_at`
- `$casts`: `is_published` → boolean, `published_at` → datetime
- `slug` auto-generated from `title` in `booted()` if not provided (using `Str::slug`)
- `reading_time_minutes` computed in `store`/`update` controller methods

### Tests
- Public index returns only published articles
- Public show 404s on unpublished article
- Category filter prop passed correctly
- Admin can create, update, delete articles
- Admin publish toggle sets `published_at`
- Non-admin cannot access admin career routes
