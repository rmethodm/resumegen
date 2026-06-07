# Batch 2 — Job Search Intelligence Design Spec

**Date:** 2026-06-07
**Status:** Approved
**Features:** Kanban Job Tracker · Salary Intelligence · Interview Notes · View Count Badge

---

## 1. Kanban Job Tracker

### Problem
The current job tracker is a sortable table with a status dropdown. It is functional but low-engagement — users don't get the spatial, pipeline-oriented view that makes trackers compelling. Every serious competitor (Teal, Huntr, Lensa) has a Kanban board.

### Design
- `Jobs/Index.tsx` gains a **view toggle** (top-right): "Table" | "Kanban" (default: Kanban)
- Preference persisted to `localStorage` under `resumegen_jobs_view`
- **Kanban board**: horizontal scrollable row of 6 columns matching existing statuses: `Saved`, `Applied`, `Interviewing`, `Offered`, `Rejected`, `Closed`
- Each column header shows: status label + count badge
- Job **cards** within each column show: company (bold), role, resume name (if linked), `applied_at` date, follow-up indicator (amber dot if overdue), status badge
- **Drag a card** between columns → optimistic status update + `router.patch(route('jobs.update', id), { status: newStatus })` (Inertia partial reload)
- **"+ Add"** button in the Saved column header → opens inline quick-add form (company + role required, same endpoint as current inline form)
- On mobile (< 768px): Kanban falls back to vertical scrollable list grouped by status (no drag-and-drop on mobile)
- Drag library: `@dnd-kit/core` + `@dnd-kit/sortable` (already installed)

### Components
- `resources/js/Pages/Jobs/KanbanView.tsx` — new component, receives `jobs: JobApplicationRow[]` prop
- `resources/js/Pages/Jobs/KanbanColumn.tsx` — single column with droppable zone
- `resources/js/Pages/Jobs/KanbanCard.tsx` — single job card, draggable
- `Jobs/Index.tsx` — gains view toggle + conditionally renders `KanbanView` or existing `TableView`

### Data Model
No schema changes. Drag uses the existing `PATCH /jobs/{id}` endpoint.

### Acceptance Criteria
- Kanban loads as default view on `/jobs`
- Cards show all required fields
- Dragging a card to another column updates the status (optimistic + server confirmed)
- Table view still accessible via toggle
- View preference persists across page loads
- Mobile shows grouped list, not Kanban
- "+ Add" in Saved column creates a new job in Saved status

---

## 2. Salary Intelligence

### Problem
Users enter a job title but have no idea what salary range to expect or negotiate for. Salary context directly increases engagement and helps users frame their applications better.

### Design
- In `Jobs/Edit.tsx`, below the "Role" field: a collapsible **"Market Salary Range"** info card
- Card appears automatically when `role` field is non-empty and the user blurs the role input
- Shows: `$X,000 – $Y,000 / year` (US market, mid-level) with a small source note
- Uses a **static lookup table** (`app/Data/SalaryRanges.php`) of ~60 common roles mapped to min/max/median
- Fuzzy match: if no exact match, find the best partial match (case-insensitive, first word priority)
- If no match: card shows "Salary data not available for this role"
- No new API endpoint needed — data returned as part of `Jobs/Edit` page props (`salary_range` key) OR via a lightweight `GET /jobs/salary?role={role}` JSON endpoint
- **Approach:** dedicated `GET /jobs/salary?role={role}` JSON endpoint — keeps the edit page load fast; fetched client-side on role blur with 500ms debounce
- Throttled: `throttle:30,1` (30/min, generous for this lightweight endpoint)
- Gated: all tiers

### Data Structure
```php
// app/Data/SalaryRanges.php
return [
    'software engineer'       => ['min' => 95000,  'max' => 160000, 'median' => 125000],
    'senior software engineer'=> ['min' => 130000, 'max' => 220000, 'median' => 170000],
    'product manager'         => ['min' => 100000, 'max' => 175000, 'median' => 135000],
    'data scientist'          => ['min' => 95000,  'max' => 160000, 'median' => 125000],
    // ... ~60 roles
];
```

### Response
```json
{ "role": "software engineer", "min": 95000, "max": 160000, "median": 125000, "match": "exact" }
// or
{ "role": "blockchain ninja", "min": null, "max": null, "median": null, "match": "none" }
```

### Acceptance Criteria
- Salary card appears on role blur with matching data
- Dollar amounts formatted with commas (no cents)
- "No data available" shown gracefully when no match
- Card is collapsible/dismissible (user can hide it)
- All tiers can see salary data

---

## 3. Interview Notes

### Problem
Users have one `notes` field per job application — a single textarea that mixes prep notes, interview feedback, follow-up reminders, and random thoughts. There is no structured log of interview events.

### Design
- New `interview_notes` table: `id`, `job_application_id` (FK → `job_applications`, cascade delete), `body` (text, not null), `created_at` (timestamp)
- No `updated_at` — notes are immutable once created (append-only)
- UI: new collapsible "Notes Log" section in `Jobs/Edit.tsx` (below existing `notes` textarea)
  - Text input + "Add Note" button
  - Existing notes listed newest-first, each with: relative time ago (e.g. "3 days ago"), body text, delete button
  - Delete: confirmation via `window.confirm()` → `router.delete(route('jobs.notes.destroy', [job.id, note.id]))`
- Routes: `POST /jobs/{job}/notes` → `store`; `DELETE /jobs/{job}/notes/{note}` → `destroy`
- Controller: `InterviewNoteController` (resource-lite, only store + destroy)
- Policy: gate on `$user->id === $job->user_id`
- Notes returned as `notes_log: InterviewNote[]` prop on `Jobs/Edit` page
- Gated: all tiers

### Data Model
```sql
CREATE TABLE interview_notes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  job_application_id BIGINT UNSIGNED NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### TypeScript
```ts
export interface InterviewNote {
  id: number;
  body: string;
  created_at: string;
}
```

### Acceptance Criteria
- Notes append-only: once saved, body cannot be edited (only deleted)
- Notes display newest-first with formatted timestamp
- Delete requires `window.confirm()` before request
- Notes cascade-deleted when job application is deleted
- Empty body blocked (validation: required, min 1)
- Notes prop returned with `Jobs/Edit` page data

---

## 4. View Count Badge

### Problem
Users have no idea whether their shared resume is getting traction. The analytics page exists but requires navigation. A simple view count on the resume list creates emotional engagement ("somebody viewed me!") and drives sharing behavior.

### Design
- `Resume/Index.tsx` resume cards gain a **"👁 N views"** badge (no emoji — use eye SVG icon)
- Pulled from `resume_share_events` table (already exists: `event_type = 'page_view'`)
- Added as a computed subquery to `ResumeBuilderController::index()` query, returned as `view_count` on each `ResumeRow`
- If `view_count === 0` and no share link exists: badge hidden
- If `view_count === 0` but share link exists: badge shows "0 views" (faint gray)
- If `view_count > 0`: badge shows count with blue tint
- **Benchmark copy (optional):** tooltip on badge "Your resume has been viewed N times" 
- No new endpoint — added to existing index query
- Gated: all tiers

### Schema Change
`ResumeRow` interface gains `view_count: number`:
```ts
export interface ResumeRow {
    id: number;
    name: string;
    pdf_filename: string | null;
    updated_at: string;
    strength: number;
    strength_tip: string;
    view_count: number;  // new
}
```

Backend: add `withCount('shareEvents as view_count', ...)` or a raw subquery:
```php
->selectSub(
    ResumeShareEvent::selectRaw('COUNT(*)')
        ->whereColumn('resume_id', 'resumes.id')
        ->where('event_type', 'page_view'),
    'view_count'
)
```

### Acceptance Criteria
- View count visible on resume index cards for all resumes with share events
- Count reflects actual `page_view` events from `resume_share_events`
- Zero-count badge only shown if share link exists (to prompt sharing, not confuse)
- No N+1 query — count resolved in the index query, not per-card

---

## Testing Strategy

- `KanbanJobTrackerTest` (Feature): loads correct view, drag status update persists, table view toggle works, add job in Saved column
- `SalaryIntelligenceTest` (Feature): exact match returns range, partial match, no match returns nulls, throttled
- `InterviewNoteTest` (Feature): store note, list ordered newest-first, delete removes note, delete wrong owner 403, empty body rejected
- `ViewCountBadgeTest` (Feature): view_count on index, zero when no events, correct count after events logged

---

## Out of Scope
- Kanban drag-and-drop reordering within a column (order within status not meaningful)
- Salary data for non-US markets (future batch)
- AI-powered salary estimation (static data sufficient for v1)
- Note editing (append-only is intentional simplicity)
- Salary history / negotiation scripts (Batch 4)
