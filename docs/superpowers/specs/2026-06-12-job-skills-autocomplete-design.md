# Job Skills Autocomplete — Design

**Date:** 2026-06-12
**Status:** Approved (design), pending implementation plan

## Goal

Wire the seeded `job_skills` table (827 rows across 27 professional categories) into the
resume builder so users get skill suggestions as they type, and so typed-in unknown skills
grow the table over time. Add an admin surface to curate the list.

## Decisions

- **Flat name search** — suggestions match on `name` across all categories; category is
  ignored at suggestion time. The frontend's grouped-skills presets (`SKILL_CATEGORY_OPTIONS`,
  10 items) stay independent of the DB's 27 categories.
- **Auto-add unknowns** — a typed skill not already in the table is persisted, defaulting to a
  new `User Added` category (the `category` column is `NOT NULL`).
- **Admin Skills tab** — extend the existing `/admin/job-titles` panel with a third tab to
  search/edit/delete/bulk-delete skills and re-file user-added ones into real categories.
- **Frontend approach A** — enhance the existing `SkillTagInput` in `Edit.tsx` in place
  (preserves its chip/tag UX and keyboard handling) rather than generalizing
  `AutocompleteInput` (single-value) or building a parallel component.

## Existing context

- `job_skills` schema: `id`, `category` (string 100, indexed), `name` (string 150, indexed),
  `timestamps`. Unique index on `(category, name)`. Seeded by `JobSkillsSeeder`.
- No `JobSkill` model, routes, or UI consumption exist yet (seed-only).
- Skills are entered in `resources/js/Pages/ResumeBuilder/Edit.tsx` via the `SkillTagInput`
  component — a free-text multi-tag input (Enter/comma adds a chip, Backspace removes last).
  Used by both the flat skills layout and each grouped category row.
- `AutocompleteController` already serves roles/titles with a generic `search()`/`store()`
  on a `title` column, plus prefix-then-substring fallback and POST-to-create-unknown.
- `AdminJobTitleController` (master-admin gated) manages roles + titles as two near-identical
  tabbed entities in `Admin/JobTitles/Index.tsx`.

## 1. Backend — model + endpoints

**New model** `app/Models/JobSkill.php` — `$fillable = ['category', 'name']`, mirrors
`JobRole`/`JobTitle`.

**`AutocompleteController` — two new methods** (in the existing auth-gated autocomplete route
group in `routes/web.php`):

- `searchSkills(Request)` → `GET /autocomplete/job-skills` (`autocomplete.job-skills.search`):
  queries the `name` column with the same prefix-then-substring fallback as roles/titles
  (prefix `name LIKE 'q%'`; if fewer than 3 hits, substring `name LIKE '%q%'`), `orderBy('name')`,
  `limit(10)`, returns `{id, name}`. Returns `[]` when the query is under 2 chars.
- `storeSkills(Request)` → `POST /autocomplete/job-skills` (`autocomplete.job-skills.store`):
  validates `name` (`required|string|min:2|max:150`), title-cases it, then
  `JobSkill::firstOrCreate(['name' => $name], ['category' => 'User Added'])`. Match attributes
  are `name` only, so an existing curated skill in any category is reused (no duplicate row
  under `User Added`); `category` is a create-only value. Returns `{id, name}`.

**Wrinkle (no schema change):** the unique index is `(category, name)`, so curated seed data
*could* hold the same `name` under two categories. `firstOrCreate(['name' => ...])` runs
`SELECT ... WHERE name = ? LIMIT 1`; pair it with a deterministic `orderBy('id')` so the
reused row is stable.

## 2. Frontend — `SkillTagInput` enhancement

Enhance the existing component in `Edit.tsx`; keep all current tag behavior.

- **State:** `suggestions`, `open`, `activeIndex`, debounce ref (same pattern as
  `AutocompleteInput`).
- **Fetch:** debounced 150ms `GET /autocomplete/job-skills?q=` when `inputVal.length >= 2`.
  Filter out skills already present in the current `skills` array.
- **Dropdown:** absolutely-positioned `<ul>` under the input, reusing `AutocompleteInput`'s
  styling (indigo hover, max-height scroll). Arrow-key navigation, Enter selects the
  highlighted suggestion, Escape closes, outside-click closes.
- **Select** calls the existing `addSkill(name)` → adds a chip.
- **Auto-add on commit:** when a tag is added that isn't an exact suggestion match (Enter,
  comma, or blur), fire `POST /autocomplete/job-skills` fire-and-forget (like
  `AutocompleteInput.handleBlur`). The chip is added immediately regardless of the POST
  result; failures are silent.
- Works in both flat and grouped layouts automatically, since both render `SkillTagInput`.

No change to the resume save flow, the `skills`/`skills_groups` JSON shape, or
`SKILL_CATEGORY_OPTIONS`.

## 3. Admin — Skills tab

Extend the existing panel rather than building a new page.

- **`AdminJobTitleController`** gains `storeSkill`, `updateSkill`, `destroySkill`,
  `bulkDestroySkills`, mirroring the role/title methods. `index()` adds a paginated `skills`
  query (50/page, `?q=` search on `name`) and supports `tab=skills`.
- **Category field:** skill create/update forms include a category `<select>` sourced from
  `JobSkill::distinct('category')` plus the `User Added` bucket, so admins can re-file
  user-added skills. Editing a skill can change both `name` and `category`.
- **Routes** in the `/admin` group: `admin.job-skills.{store,update,destroy,bulk-destroy}`,
  same shape as `admin.job-roles.*`.
- **`Admin/JobTitles/Index.tsx`** gains a third tab. Skill rows render `name` + a category
  dropdown (roles/titles rows are single-field). Bulk-select + delete reused.

This grows `AdminJobTitleController` and `Index.tsx` by a third near-identical entity — follows
the established pattern, no refactor needed; keep the skill-specific category UI cleanly
separated in the page.

## 4. Testing

PHPUnit feature tests (project convention), plus a new factory.

- **`JobSkillFactory`** — `name` + `category`.
- **`tests/Feature/AutocompleteSkillTest.php`:**
  - search returns prefix matches, ordered, capped at 10
  - search falls back to substring when fewer than 3 prefix hits
  - search returns `[]` for queries under 2 chars
  - store creates a new skill under `User Added`, title-cased
  - store reuses an existing curated skill (any category) by `name` — no duplicate row
  - both routes require auth (guest is rejected)
- **`tests/Feature/Admin/AdminJobSkillTest.php`:**
  - master-admin can list (`tab=skills`), create, update (name + category), delete, bulk-delete
  - non-admin gets 403
  - search filter narrows the skills list
- **Frontend:** no React test runner in this project (consistent with the untested
  `AutocompleteInput`); coverage stays at the feature level. Manual check: type a skill, see
  suggestions, select one, confirm a typed-unknown persists.

Run: `php artisan test --compact --filter=Skill`.

## Out of scope

- Category-aware suggestion filtering (deferred; flat search chosen).
- Reconciling the frontend's 10 grouping presets with the DB's 27 categories.
- Exposing `job_skills` via the JSON `/api` layer.
