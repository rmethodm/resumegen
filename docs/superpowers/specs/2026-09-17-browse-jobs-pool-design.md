# Browse Jobs + Application Pool — Design

Date: 2026-09-17

## Summary

Add a "Browse Jobs" section where users search a large imported job-listings
dataset, save interesting listings to a personal pool (with a resume already
attached), and later pick from that pool inside the Chrome extension to jump
to the listing and trigger autofill. This reverses part of the 2026-08-26
"Job search / imports — removed" decision (see root `CLAUDE.md`) — explicitly
confirmed with the user during brainstorming.

**Out of scope:** the Chrome extension's own source (manifest, dropdown UI,
content script autofill). That is a separate repo/project. This plan only
builds the backend API the extension will consume (`GET
/api/extension/job-pool`).

## Data source

`https://huggingface.co/buckets/Invicto69/Jobs-Dataset-bucket/tree/data`

- 43.7GB total, 246 files, three folders: `full` (122 parquet parts, includes
  full description text), `minimal` (121 parquet parts, stripped columns),
  `companies` (1 item).
- **Use `minimal` only.** Parts are ~5.65MB–32.9MB each; total folder size is
  a small fraction of the 43.7GB bucket total (the bulk is `full`).
- Ignore the bucket's `companies` folder — the existing `companies` table
  (109k rows, imported separately via `ImportCompanies`) stays as the source
  of truth for company data. Job listings reference company as a plain text
  column, not a FK.
- Exact `minimal` column names are unconfirmed. Before writing the import
  command, download one sample part (e.g. `part-0.parquet`) and inspect its
  schema — same approach `ImportCompanies` used for its dataset. Expected
  columns based on the folder's purpose: title, company (text), location,
  job URL, and some external/dataset id. If a natural external id isn't
  present, derive a dedup key by hashing `job_url` (or `title+company+location`
  if `job_url` is absent/non-unique).

## Freshness model

**One-time import, manual re-import later** — no scheduler, no expiry
tracking, no diffing against the source on a cadence. Running the command
again should upsert by the dedup key (safe to re-run), but nothing triggers
it automatically. Stale/closed listings are not detected or hidden.

## Data model

### `job_listings` (new table)

| column | type | notes |
|---|---|---|
| `id` | bigint PK | |
| `external_id` | string, unique | dedup key from dataset (see above) |
| `title` | string | |
| `company` | string | plain text, not FK |
| `location` | string, nullable | |
| `job_url` | string | |
| `description` | text, nullable | from `minimal` if present, else null |
| `search_vector` | generated `tsvector` column | over `title` + `description` |
| timestamps | | |

Indexes: unique on `external_id`; GIN on `search_vector`; btree on `company`,
`location`.

### `app:import-job-listings` (new artisan command)

Mirrors `App\Console\Commands\Companies\ImportCompanies`: downloads each
`minimal` part file, streams rows, upserts into `job_listings` by
`external_id` in batches. One-shot, run manually (`php artisan
app:import-job-listings`).

### `job_pool_entries` (new table)

| column | type | notes |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK → users, cascade delete | |
| `job_listing_id` | FK → job_listings, cascade delete | |
| `resume_id` | FK → resumes, cascade delete | **required**, chosen at add-time |
| timestamps | | |

Unique on `(user_id, job_listing_id)` — adding the same listing twice just
no-ops or errors client-side rather than duplicating.

**Relationship to `job_applications`/Kanban: none.** Adding to the pool never
creates a Kanban card. The pool is a separate, lightweight shortlist. This is
a deliberate divergence from the existing "Add job" flow (which does create
a `JobApplication` via `CreateJobApplication`) — browsing/pooling is a
pre-application discovery step, not application tracking.

## Backend — web

### `JobListingController` (new)

- `GET /jobs/browse` — Inertia page `Jobs/Browse.tsx`. Paginated (cursor or
  simple `paginate()`), accepts `q` (keyword, matched against
  `search_vector`), `location`, `company` query params.

### `JobPoolController` (new)

- `GET /jobs/browse` (same page, different tab) or a dedicated data prop —
  the "My Pool" view lists the current user's `job_pool_entries` with the
  joined listing + resume name.
- `POST /jobs/pool` — body `{ job_listing_id, resume_id }`, creates a pool
  entry for the current user. 422 on duplicate (unique constraint).
- `DELETE /jobs/pool/{id}` — removes a pool entry (must belong to current
  user, 404 otherwise — matches existing inline-ownership-check convention,
  no policy class).

Routes added to the authenticated group in `routes/web.php`, following
existing `job-applications.*` naming: `jobs.browse`, `job-pool.store`,
`job-pool.destroy`.

## Backend — extension API

### `ExtensionController::jobPool` (new method)

- `GET /api/extension/job-pool` — token-auth (`extension` ability, same
  `ensureExtensionToken()` guard as every other method on this controller).
  Returns the current user's pool entries: listing title, company, job_url,
  resume_id, and resume display name — enough for the extension to render its
  dropdown and know which resume to use once the user navigates and
  autofill runs. Add the route to `routes/api.php` alongside the other
  `extension/*` routes.

Everything past "the extension calls this endpoint" — dropdown rendering,
navigating to `job_url`, triggering the content-script autofill — is the
extension's own implementation, out of scope for this repo.

## Frontend

- New top-level nav item **"Browse Jobs"** → `/jobs/browse`.
- `resources/js/Pages/Jobs/Browse.tsx` (shadcn), two tabs:
  - **Browse**: search box (keyword) + location/company filter inputs,
    paginated result list/table, "Add to pool" button per row.
  - **My Pool**: list of saved entries (title, company, resume name), remove
    button per row.
- "Add to pool" opens a shadcn `Dialog` with a resume `Select` (reuse the
  resume-picker pattern from `Components/jobs/add-job-modal.tsx`) — resume
  choice is required before the pool entry is created.

## Testing

- Feature tests for `JobListingController@index` (search/filter behavve
  correctly, pagination) and `JobPoolController` (store/destroy, ownership
  checks, duplicate rejection).
- Feature test for `GET /api/extension/job-pool` (token ability gate, shape
  of response) — follow `ApiTestCase` conventions used by other extension
  endpoint tests.
- Artisan command test for `app:import-job-listings` using a small fixture
  parquet (or fixture rows), asserting upsert-by-`external_id` behavior —
  mirror however `ImportCompanies` is tested, if it has a test.

## Open items to confirm during implementation (not blocking this spec)

- Actual `minimal` parquet column names/types.
- Whether `external_id` exists natively in the dataset or must be derived.
- Pagination strategy (offset `paginate()` vs cursor) once real row count is
  known.
