# Kanban Swimlane Redesign + Role/Title Autocomplete

**Date:** 2026-06-08  
**Status:** Approved  
**Scope:** (1) Replace the vertical-column Kanban on the Jobs page with a horizontal swimlane layout. (2) Add autocomplete on all role/title fields across the app backed by pre-seeded lookup tables.

---

## Part 1 — Kanban Swimlane

### Problem

The current Kanban board uses six fixed-width columns (`min-w-[260px] max-w-[300px]`). On typical viewports this overflows horizontally, forcing the page to show a scrollbar. Cards are also tall, making the board feel bulky.

### Solution

Rotate the layout: statuses become **rows**, cards become **horizontal pills**. The board fills the full page width with no outer horizontal scroll.

### Layout

- A fixed-width label column (~90px, right-aligned) with a colored left border indicating status.
- A flex-wrap row of card pills to the right of each label.
- Rows with zero cards show a subtle "— none yet" empty state.
- The board fills 100% of the content area width.

### Cards (Pills)

Each pill displays:
- **Company** (bold) · Role (muted), both truncated with `overflow: hidden`.
- A small amber badge if `follow_up_at` is overdue.
- A `⋮` dot (visible on hover) as the click target for the status picker.
- The pill itself is clickable (navigates to `jobs.edit`).
- The pill is draggable via `@dnd-kit`.

The current "Edit →" inline link is removed; clicking the pill body navigates instead.

### Interactions

#### 1. Drag-and-Drop
- `DndContext` wraps the entire swimlane board.
- Each row is a `useDroppable` zone keyed by status string.
- Dragging a pill vertically between rows fires `router.put(route('jobs.update', id), { status: newStatus }, { preserveScroll: true, preserveState: true })`.
- `PointerSensor` with `activationConstraint: { distance: 8 }` (same as current).

#### 2. Click-to-Change-Status
- Clicking the `⋮` dot on a pill opens an inline popover listing all 6 statuses. The click must call `stopPropagation` to prevent triggering the pill's edit navigation.
- Selecting a status fires the same `router.put` call as drag-and-drop.
- The popover closes on selection or on outside click.
- This provides a reliable fallback on touch/mobile where drag-and-drop is unreliable.

### Files Changed (Swimlane)

| File | Action |
|---|---|
| `resources/js/Pages/Jobs/KanbanView.tsx` | Replace entirely with new `SwimlaneView.tsx` component |
| `resources/js/Pages/Jobs/KanbanColumn.tsx` | Delete (retired) |
| `resources/js/Pages/Jobs/KanbanCard.tsx` | Delete (retired) |
| `resources/js/Pages/Jobs/SwimlaneView.tsx` | Create — board container, DndContext, rows |
| `resources/js/Pages/Jobs/SwimlaneRow.tsx` | Create — single status row (droppable + pills) |
| `resources/js/Pages/Jobs/SwimlanePill.tsx` | Create — individual draggable card pill with status popover |
| `resources/js/Pages/Jobs/Index.tsx` | Update import: `KanbanView` → `SwimlaneView` |

### What Does Not Change

- The `jobs` prop shape passed from `Index.tsx` is unchanged.
- The `router.put` call to `jobs.update` with `{ status }` is unchanged.
- The status color map (indigo / blue / amber / emerald / red / gray) is preserved.
- The 6 statuses and their labels are unchanged.
- All other views (Table view, funnel chart, trend chart) are untouched.

---

## Part 2 — Role & Title Autocomplete

### Problem

Users manually type free-form text into role and job title fields. There is no consistency or assistance. Common roles and titles should be suggested as the user types, and new entries should be persisted so the lookup improves over time.

### Tables

Two separate lookup tables, both global (shared across all users):

**`job_roles`** — target roles / what someone is applying for  
**`job_titles`** — past/present job titles listed on a resume  

Both tables have the same schema:

```
id          bigint, PK, auto-increment
title       varchar(150), unique, not null
created_at  timestamp, default now()
```

No `updated_at` (append-only, titles never change once seeded — only new ones are added).

Each table is seeded with **500–1000** entries compiled from BLS occupational data, LinkedIn most-common-titles research, and O*NET. Titles are stored in Proper Case (e.g. `Software Engineer`, not `software engineer`).

### Fields That Get Autocomplete

| Field | Location | Table |
|---|---|---|
| `target_role` | Onboarding wizard (Step 1) | `job_roles` |
| `target_role` | User profile / edit page | `job_roles` |
| `role` | Job Application create/edit (`Jobs/Edit.tsx`) | `job_roles` |
| Job experience title | Resume Builder experience entries (`Edit.tsx`) | `job_titles` |

### API Endpoint

`GET /autocomplete/job-roles?q={query}` — returns up to 10 matching `job_roles` entries  
`GET /autocomplete/job-titles?q={query}` — returns up to 10 matching `job_titles` entries  

Both endpoints:
- Require authentication (`auth` middleware).
- Use a `LIKE '{query}%'` (starts-with) search, falling back to `LIKE '%{query}%'` (contains) if starts-with returns fewer than 3 results.
- Return `[{ id, title }]` JSON.
- Throttled at `throttle:60,1` (60 req/min per user) — these fire on every keystroke.

### Autocomplete Behavior

- Suggestions appear after the user types **2 or more characters**.
- A dropdown list shows up to 10 matches below the input.
- Arrow keys navigate the list; Enter or click selects.
- On selection the input value is set to the selected title.
- The dropdown closes on Escape or outside click.
- If the user blurs the field without selecting from the list:
  - If the typed value **matches** an existing entry (case-insensitive): silently normalize to the stored Proper Case value.
  - If the typed value **does not match**: `POST /autocomplete/job-roles` (or `/job-titles`) with `{ title }` — the server inserts it (after title-casing) and returns `{ id, title }`. The input value is updated to the normalized form.

### Write Endpoint (Auto-Add)

`POST /autocomplete/job-roles` and `POST /autocomplete/job-titles`  

- Auth required.
- Validates `title`: required string, 2–150 chars, no HTML.
- Title-cases the input before insert (e.g. `"senior data analyst"` → `"Senior Data Analyst"`).
- Uses `firstOrCreate` — no duplicate inserts.
- Returns `{ id, title }`.
- Throttled at `throttle:10,1`.

### Shared React Component

A single `AutocompleteInput` component (`resources/js/Components/AutocompleteInput.tsx`) wraps a standard `<input>` and handles:
- Debounced fetch (150ms) to the appropriate endpoint.
- Dropdown rendering (absolutely positioned, z-50).
- Keyboard navigation.
- On-blur auto-save of unknown values.

Props:
```ts
type Props = {
    endpoint: 'job-roles' | 'job-titles';
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}
```

### Files Changed (Autocomplete)

| File | Action |
|---|---|
| `database/migrations/xxxx_create_job_roles_table.php` | Create |
| `database/migrations/xxxx_create_job_titles_table.php` | Create |
| `database/seeders/JobRolesSeeder.php` | Create — 500–1000 roles |
| `database/seeders/JobTitlesSeeder.php` | Create — 500–1000 titles |
| `database/seeders/DatabaseSeeder.php` | Call both new seeders |
| `app/Models/JobRole.php` | Create |
| `app/Models/JobTitle.php` | Create |
| `app/Http/Controllers/AutocompleteController.php` | Create — search + write endpoints |
| `routes/web.php` | Add autocomplete routes |
| `resources/js/Components/AutocompleteInput.tsx` | Create — shared component |
| `resources/js/Pages/Onboarding/Wizard.tsx` | Use `AutocompleteInput` on `target_role` |
| `resources/js/Pages/Jobs/Edit.tsx` | Use `AutocompleteInput` on `role` |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Use `AutocompleteInput` on experience title fields |

---

## Testing

### Swimlane
- Drag a pill from one row to another — confirm status updates and pill moves to correct row.
- Click the `⋮` dot — confirm popover opens with all 6 statuses.
- Select a status from the popover — confirm pill moves and DB updates.
- Verify no horizontal scrollbar at 1280px and 1024px viewport widths.
- Verify empty rows show empty state.
- Verify overdue follow-up badge renders.
- Verify pill click navigates to the edit page.
- Run existing Jobs feature tests to confirm no regressions.

### Autocomplete
- Typing 2+ chars returns up to 10 matching suggestions.
- Selecting a suggestion sets the input value to the stored Proper Case form.
- Blurring with an unknown value inserts it into the table (title-cased) and normalizes the input.
- Blurring with a known value (different case) normalizes without inserting a duplicate.
- All four fields (target_role ×2, job application role, resume experience title) have working autocomplete.
- Unauthenticated requests to autocomplete endpoints return 401.
