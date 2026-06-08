# Kanban Swimlane Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed-width vertical-column Kanban board on the Jobs page with a horizontal swimlane layout that has no outer horizontal scroll.

**Architecture:** Three new React components (`SwimlaneView`, `SwimlaneRow`, `SwimlanePill`) replace the three old Kanban components. `SwimlaneView` owns the `DndContext`; rows are droppable zones; pills are draggable. A `⋮` button on each pill opens an inline status-change popover as a fallback to drag-and-drop. `Index.tsx` swaps its import.

**Tech Stack:** React 18, TypeScript, `@dnd-kit/core` (useDraggable + useDroppable — no SortableContext needed), Inertia.js router, Tailwind CSS v3.

---

## File Map

| File | Action |
|---|---|
| `resources/js/Pages/Jobs/SwimlaneView.tsx` | Create — DndContext + column of rows |
| `resources/js/Pages/Jobs/SwimlaneRow.tsx` | Create — one droppable status row |
| `resources/js/Pages/Jobs/SwimlanePill.tsx` | Create — draggable pill + status popover |
| `resources/js/Pages/Jobs/KanbanView.tsx` | Delete |
| `resources/js/Pages/Jobs/KanbanColumn.tsx` | Delete |
| `resources/js/Pages/Jobs/KanbanCard.tsx` | Delete |
| `resources/js/Pages/Jobs/Index.tsx` | Modify — swap KanbanView import → SwimlaneView |
| `tests/Feature/JobApplicationTest.php` | Modify — add swimlane smoke test |

---

### Task 1: Create `SwimlaneView.tsx`

**Files:**
- Create: `resources/js/Pages/Jobs/SwimlaneView.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { JobApplicationRow, JobStatus } from '@/types';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import SwimlaneRow from './SwimlaneRow';

const STATUSES: { status: JobStatus; label: string; color: string }[] = [
    { status: 'saved',        label: 'Saved',        color: '#4f46e5' },
    { status: 'applied',      label: 'Applied',      color: '#3b82f6' },
    { status: 'interviewing', label: 'Interviewing', color: '#f59e0b' },
    { status: 'offered',      label: 'Offered',      color: '#10b981' },
    { status: 'rejected',     label: 'Rejected',     color: '#f87171' },
    { status: 'closed',       label: 'Closed',       color: '#a0a0b0' },
];

type Props = { jobs: JobApplicationRow[] };

export default function SwimlaneView({ jobs }: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const newStatus = over.id as JobStatus;
        const job = jobs.find(j => j.id === active.id);
        if (!job || job.status === newStatus) return;

        router.put(route('jobs.update', active.id as number), { status: newStatus }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex flex-col gap-1">
                {STATUSES.map(({ status, label, color }) => (
                    <SwimlaneRow
                        key={status}
                        status={status}
                        label={label}
                        color={color}
                        jobs={jobs.filter(j => j.status === status)}
                    />
                ))}
            </div>
        </DndContext>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Jobs/SwimlaneView.tsx
git commit -m "feat: add SwimlaneView container with DndContext"
```

---

### Task 2: Create `SwimlaneRow.tsx`

**Files:**
- Create: `resources/js/Pages/Jobs/SwimlaneRow.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { JobApplicationRow, JobStatus } from '@/types';
import { useDroppable } from '@dnd-kit/core';
import SwimlanePill from './SwimlanePill';

type Props = {
    status: JobStatus;
    label: string;
    color: string;
    jobs: JobApplicationRow[];
};

export default function SwimlaneRow({ status, label, color, jobs }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <div className="flex items-start gap-3 min-h-[44px]">
            <div
                className="w-[96px] flex-shrink-0 text-right text-xs font-semibold text-[#23232d] pt-2.5 pr-3 border-r-2"
                style={{ borderRightColor: color }}
            >
                {label}
            </div>
            <div
                ref={setNodeRef}
                className={`flex flex-wrap gap-2 flex-1 min-h-[40px] rounded-lg p-1.5 transition-colors ${
                    isOver ? 'bg-[#f0f0ff]' : ''
                }`}
            >
                {jobs.length === 0 ? (
                    <span className="text-xs text-[#c0c0cc] self-center pl-1 select-none">— none yet</span>
                ) : (
                    jobs.map(job => <SwimlanePill key={job.id} job={job} />)
                )}
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Jobs/SwimlaneRow.tsx
git commit -m "feat: add SwimlaneRow droppable status row"
```

---

### Task 3: Create `SwimlanePill.tsx`

**Files:**
- Create: `resources/js/Pages/Jobs/SwimlanePill.tsx`

- [ ] **Step 1: Create the file**

```tsx
import type { JobApplicationRow, JobStatus } from '@/types';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const STATUSES: { status: JobStatus; label: string }[] = [
    { status: 'saved',        label: 'Saved' },
    { status: 'applied',      label: 'Applied' },
    { status: 'interviewing', label: 'Interviewing' },
    { status: 'offered',      label: 'Offered' },
    { status: 'rejected',     label: 'Rejected' },
    { status: 'closed',       label: 'Closed' },
];

type Props = { job: JobApplicationRow };

export default function SwimlanePill({ job }: Props) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 999 : undefined,
    };

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const changeStatus = (status: JobStatus) => {
        setOpen(false);
        if (job.status === status) return;
        router.put(route('jobs.update', job.id), { status }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const isOverdue = job.follow_up_at && new Date(job.follow_up_at) < new Date();

    return (
        <div ref={containerRef} className="relative">
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className="group flex items-center gap-1.5 bg-white border border-[#e8e8f0] rounded-full px-3 py-1.5 shadow-sm cursor-grab active:cursor-grabbing select-none hover:border-[#c8c8e0] transition-colors"
            >
                <Link
                    href={route('jobs.edit', job.id)}
                    onClick={e => e.stopPropagation()}
                    className="text-xs font-semibold text-[#23232d] hover:text-[#4338ca] max-w-[120px] truncate"
                >
                    {job.company}
                </Link>
                {job.role && (
                    <span className="text-xs text-[#6b7280] max-w-[100px] truncate">· {job.role}</span>
                )}
                {isOverdue && (
                    <span
                        className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                        title="Follow up overdue"
                    />
                )}
                <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                    className="text-[#c0c0cc] hover:text-[#6b7280] opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 flex-shrink-0 leading-none px-0.5"
                    aria-label="Change status"
                >
                    ⋮
                </button>
            </div>

            {open && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#e8e8f0] rounded-lg shadow-lg z-50 py-1 min-w-[140px]">
                    {STATUSES.map(({ status, label }) => (
                        <button
                            key={status}
                            type="button"
                            onClick={() => changeStatus(status)}
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#f5f5fb] transition-colors ${
                                job.status === status
                                    ? 'font-semibold text-[#4f46e5]'
                                    : 'text-[#23232d]'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Jobs/SwimlanePill.tsx
git commit -m "feat: add SwimlanePill with drag handle and status popover"
```

---

### Task 4: Wire into `Index.tsx` and delete old files

**Files:**
- Modify: `resources/js/Pages/Jobs/Index.tsx`
- Delete: `resources/js/Pages/Jobs/KanbanView.tsx`
- Delete: `resources/js/Pages/Jobs/KanbanColumn.tsx`
- Delete: `resources/js/Pages/Jobs/KanbanCard.tsx`

- [ ] **Step 1: Replace the KanbanView import in `Index.tsx`**

Find and replace the import at the top of `resources/js/Pages/Jobs/Index.tsx`:

```tsx
// Before:
import KanbanView from './KanbanView';

// After:
import SwimlaneView from './SwimlaneView';
```

Then find every usage of `<KanbanView` in the file and replace with `<SwimlaneView`. There should be exactly one:

```tsx
// Before:
{view === 'kanban' && <KanbanView jobs={jobs} />}

// After:
{view === 'kanban' && <SwimlaneView jobs={jobs} />}
```

- [ ] **Step 2: Delete old files**

```bash
rm resources/js/Pages/Jobs/KanbanView.tsx
rm resources/js/Pages/Jobs/KanbanColumn.tsx
rm resources/js/Pages/Jobs/KanbanCard.tsx
```

- [ ] **Step 3: Confirm TypeScript compiles**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Jobs/Index.tsx
git rm resources/js/Pages/Jobs/KanbanView.tsx resources/js/Pages/Jobs/KanbanColumn.tsx resources/js/Pages/Jobs/KanbanCard.tsx
git commit -m "feat: swap KanbanView for SwimlaneView, delete retired Kanban components"
```

---

### Task 5: Test and verify

**Files:**
- Modify: `tests/Feature/JobApplicationTest.php`

- [ ] **Step 1: Add a smoke test that the Jobs index renders without error**

Open `tests/Feature/JobApplicationTest.php` and add this test inside the class:

```php
public function test_jobs_index_renders_for_authenticated_user(): void
{
    $user = User::factory()->create();
    JobApplication::factory()->count(3)->create(['user_id' => $user->id]);

    $response = $this->actingAs($user)->get(route('jobs.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Jobs/Index')
        ->has('jobs', 3)
    );
}
```

Make sure `use App\Models\JobApplication;` is at the top of the file if not already present.

- [ ] **Step 2: Run the test**

```bash
php artisan test --compact tests/Feature/JobApplicationTest.php
```

Expected: all tests in the file pass.

- [ ] **Step 3: Manual browser check**

Run `composer run dev` (or `npm run dev` if already running). Open the Jobs page, switch to Kanban view, and verify:
- All 6 status rows appear with colored left borders.
- Cards render as pills with company · role.
- No horizontal scrollbar appears.
- Hovering a pill shows the `⋮` button.
- Clicking `⋮` opens a status list; selecting a status updates the pill's row.
- Dragging a pill to a different row updates its status.

- [ ] **Step 4: Commit**

```bash
git add tests/Feature/JobApplicationTest.php
git commit -m "test: add Jobs index smoke test for swimlane"
```
