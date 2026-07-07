# Batch 9: Custom Sections, Section Reordering, Kanban Job Tracker, Freshness Nudges

**Date:** 2026-06-07
**Status:** Approved, ready for implementation

---

## Feature 1: Custom Sections

### Goal
Allow users to add free-form sections to their resume (e.g. Publications, Awards, Languages, Projects, Volunteer work) beyond the fixed set.

### Data Model
New nullable JSON column `custom_sections` on `resumes` table.

Schema:
```json
[
  { "id": "uuid", "title": "Publications", "bullets": ["Item one", "Item two"] }
]
```

- `id`: client-generated UUID (used as React key and for section_order references)
- `title`: free-form string
- `bullets`: array of strings, same pattern as experience bullets

Migration: `add custom_sections_to_resumes_table` — adds `custom_sections` as nullable JSON after existing columns.

### Resume Model
Add `custom_sections` to the model's `$casts` as array (nullable).

### Controller
`ResumeBuilderController@update` already accepts `nullable array` for JSON columns — add `custom_sections` to the validated fields.

### Editor UI (`Edit.tsx`)
- "Add Section" button at the bottom of the left editor panel (below Certifications section)
- Clicking it appends a new entry to `customSections` state: `{ id: crypto.randomUUID(), title: '', bullets: [''] }`
- Each custom section renders:
  - Title `<input>` with placeholder "Section title"
  - Bullet list editor (same inline bullet-per-line textarea pattern used by Experience entries in `Edit.tsx`)
  - Delete button (×) top-right of the section
- Saves on blur like all other fields

### PDF Rendering (`resume-pdf.blade.php`)
Custom sections render after the fixed sections (or at their position in `section_order` — see Feature 2). Each custom section renders as: section heading (`$section['title']`) + unordered bullet list (`$section['bullets']`). Skip rendering if `title` is empty.

---

## Feature 2: Section Drag-and-Drop Reordering

### Goal
Allow users to reorder all resume sections (fixed + custom) via drag-and-drop in the editor. Order is persisted and respected in the PDF.

### Data Model
New nullable JSON column `section_order` on `resumes` table.

Schema: ordered array of section keys.
```json
["summary", "experience", "education", "skills", "certifications", "custom_abc123", "custom_def456"]
```

Fixed section keys: `summary`, `experience`, `education`, `skills`, `certifications`
Custom section keys: `custom_{id}` (where `id` matches the UUID in `custom_sections`)

Default order when `section_order` is null:
```php
['summary', 'experience', 'education', 'skills', 'certifications']
// + custom section ids appended in order
```

Migration: `add_section_order_to_resumes_table` — adds `section_order` as nullable JSON.

### Resume Model
Add `section_order` to `$casts` as array (nullable).

### Controller
Add `section_order` to `ResumeBuilderController@update` validated fields (`nullable array`).

### Library
`@dnd-kit/core` + `@dnd-kit/sortable` — install via npm. Standard React DnD library; no jQuery dependency.

### Editor UI (`Edit.tsx`)
- All section panels are wrapped in a `<SortableContext>` using `verticalListSortingStrategy`
- Each section panel gets a `useSortable` hook keyed by its section key
- Drag handle: a `⠿` grip icon on the **right side of the section header**, grouped with the existing collapse arrow (▾). The handle is the `<DragHandle>` activator; clicking the arrow still collapses/expands.
- On `onDragEnd`: update `sectionOrder` state and fire save
- `sectionOrder` state is initialized from `resume.section_order` or the default order

### PDF Rendering (`resume-pdf.blade.php`)
Build `$orderedSections` from `$resume->section_order` (or compute default). Loop through it:
```php
foreach ($orderedSections as $key) {
    match ($key) {
        'summary'        => // render summary block,
        'experience'     => // render experience block,
        'education'      => // render education block,
        'skills'         => // render skills block,
        'certifications' => // render certifications block,
        default          => // render custom section where id matches str_replace('custom_', '', $key),
    };
}
```

---

## Feature 3: Kanban Job Tracker

### Goal
Add a visual Kanban board view to the job applications page. Users can drag cards between columns to update status. The existing list view remains accessible via a toggle.

### Data Model
No schema changes. The 6 existing `JobApplication::STATUSES` map directly to columns:

| Status | Column Label |
|---|---|
| `saved` | Saved |
| `applied` | Applied |
| `interviewing` | Interviewing |
| `offered` | Offered |
| `rejected` | Rejected |
| `closed` | Closed |

### View Toggle (`Jobs/Index.tsx`)
- Toggle buttons in the page header: "⊞ Board" and "≡ List"
- Active view stored in `localStorage` under key `jobs_view` (values: `'board'` | `'list'`), defaulting to `'board'`
- List view renders the existing table unchanged
- Board view replaces the table with the Kanban component

### Kanban Board Component (`resources/js/Components/JobKanbanBoard.tsx`)
New standalone component (keeps `Jobs/Index.tsx` manageable).

**Props:**
```typescript
interface Props {
  jobs: JobApplication[];
  onStatusChange: (id: number, status: string) => void;
}
```

**Layout:** Horizontally scrollable row of 6 column panels. Each column:
- Column header: label + count badge
- Scrollable list of job cards
- Empty state: light dashed border placeholder

**Job card shows:**
- Company name (bold)
- Role
- Applied date (if `applied_at` is set, formatted as "Jun 5")
- Resume tag (resume name, truncated, if `resume_id` is set)
- Clicking a card navigates to `route('jobs.edit', job.id)`

**Drag-and-drop:** Uses `@dnd-kit/core` (already installed for Feature 2). Dragging a card to a different column fires `onStatusChange(id, newStatus)`.

**`onStatusChange` in `Jobs/Index.tsx`:**
```typescript
const handleStatusChange = (id: number, status: string) => {
  router.patch(route('jobs.update', id), { status }, { preserveScroll: true });
};
```

The existing `JobApplicationController@update` already validates and accepts `status`.

---

## Feature 4: Resume Freshness Nudges

### Goal
Re-engage users whose resumes haven't been updated in 90 days with a targeted email nudge.

### Data Model
New nullable timestamp column `last_nudge_sent_at` on `resumes`.

Migration: `add_last_nudge_sent_at_to_resumes_table`.

### Mailable (`app/Mail/ResumeFreshnessNudgeMail.php`)
- Subject: `"Your resume "{name}" hasn't been updated in a while"`
- Props: `$resume` (Resume model with `name` and `id`)
- Body (Blade view `resources/views/emails/resume-freshness-nudge.blade.php`):
  - Greeting: "Hi {user name},"
  - Body: "It's been a while since you last updated **{resume name}**. Keeping your resume current means you're always ready for the next opportunity."
  - CTA button: "Update my resume →" linking to `route('builder.edit', resume)`
  - Footer: standard unsubscribe note

### Artisan Command (`app/Console/Commands/NudgeStaleResumes.php`)
```
php artisan resumes:nudge-stale
```

**Logic:**
```php
Resume::query()
    ->where('is_snapshot', false)
    ->where('updated_at', '<', now()->subDays(90))
    ->where(function ($q) {
        $q->whereNull('last_nudge_sent_at')
          ->orWhere('last_nudge_sent_at', '<', now()->subDays(90));
    })
    ->with('user')
    ->each(function (Resume $resume) {
        Mail::to($resume->user)->send(new ResumeFreshnessNudgeMail($resume));
        $resume->update(['last_nudge_sent_at' => now()]);
    });
```

**Schedule:** Daily at 9:00 AM UTC in `routes/console.php`:
```php
Schedule::command('resumes:nudge-stale')->dailyAt('09:00');
```

### Tests
- Command sends mail and stamps `last_nudge_sent_at` for stale resumes
- Command skips recently-nudged resumes (within 90 days)
- Command skips snapshots (`is_snapshot = true`)
- Command skips resumes updated within 90 days

---

## Tier Gates

| Feature | Gate |
|---|---|
| Custom Sections | All tiers (Free, Starter, Pro) |
| Section Reordering | All tiers |
| Kanban Job Tracker | All tiers (respects existing job application limits) |
| Freshness Nudges | All tiers (server-side, no user-facing gate) |

---

## Dependencies

- `@dnd-kit/core` + `@dnd-kit/sortable` must be installed (used by both Features 2 and 3)
- Features 1 and 2 are tightly coupled in the PDF Blade view — implement Feature 1 first, then Feature 2 adds ordering on top
- Features 3 and 4 are fully independent of each other and of Features 1–2
