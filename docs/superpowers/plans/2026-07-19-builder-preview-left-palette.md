# Builder Preview-Left / Palette / Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the builder's right panel from a full scrolling form into a narrow palette, with field editing moved into a drawer that overlays the already-left-hand preview.

**Architecture:** Extract the monolithic `renderForm()` into a per-section registry keyed by section id. The palette maps over the registry to render a clickable, drag-reorderable section list. A new `SectionDrawer` overlays the preview column and renders exactly one section's fields. Save-on-blur and preview refresh are untouched throughout.

**Tech Stack:** React 18 + TypeScript, Inertia v2, Tailwind v3, `@dnd-kit` (already used for section reordering), Ziggy `route()`.

## Corrections to the spec

The spec (`docs/superpowers/specs/2026-07-19-builder-preview-left-palette-design.md`) was written before the file was read closely. Three things it got wrong. **These corrections govern; where plan and spec disagree, follow the plan.**

1. **The preview is already on the left.** `Edit.tsx:1214` already renders the preview column first, with the `<aside>` after it. There is no layout flip to perform — the remaining work is entirely palette + drawer. The spec implied a side swap; there isn't one.

2. **Per-section extraction collides with drag-to-reorder.** `renderForm()` wraps all sections in a single `<DndContext>`/`<SortableContext>` (`Edit.tsx:1052-1053`) driven by `sectionOrder`. If each section renders alone in a drawer, there is no list to drag within and reordering breaks. **Resolution: reordering moves to the palette.** The palette's section list becomes the sortable list. This is a better home for it anyway — the palette *is* a list, where before you dragged whole expanded form cards past each other.

3. **There is no JavaScript test runner.** No vitest, no jest, no `@testing-library`, no `*.test.tsx`. The spec proposed a runtime "section registry completeness" test; it has nothing to run in. **Resolution: enforce completeness at the type level instead** — `Record<SectionKey, SectionEntry>` makes a missing section a `tsc` error, which `npm run build` already runs. This is a stronger guarantee than the proposed runtime test and adds no dependency. Do **not** add a JS test framework as part of this plan; that is a separate decision requiring approval.

## Global Constraints

- **Do not change `package.json` dependencies.** No new libraries. (Boost rule: dependency changes need approval.)
- **Do not alter save behavior.** `onBlur → save()` stays on every field. `save()` is defined in `Edit.tsx`; call sites move but their semantics must not.
- **Do not alter the preview refresh mechanism.** `renderPreviewFrames()` (`Edit.tsx:832`) and its double-buffered `freshPdfSrc` cache-busting stay as-is.
- **Do not add share-link management to the builder.** Per `CLAUDE.md`, that lives only on `/shares`. The Share tab keeps its active-link count and link, nothing more.
- **All work is in `resources/js/Pages/ResumeBuilder/Edit.tsx`** plus one new component file. No backend changes: no routes, controllers, models, or migrations.
- **Verification command for every task:** `npx tsc --noEmit` must pass. There is no JS test suite; `tsc` plus the manual browser check in each task is the gate.
- **Existing PHP tests must stay green:** `php artisan test --compact --filter=ResumeBuilder`.

## File Structure

| File | Responsibility |
|---|---|
| `resources/js/Pages/ResumeBuilder/Edit.tsx` (modify) | Owns all resume state and `save()`. Gains a section registry; loses `renderForm()`, `sidebarOpen`, `panelWidth`, `startResize`. |
| `resources/js/Pages/ResumeBuilder/Partials/SectionPalette.tsx` (create) | Renders the sortable section list from the registry. Presentational — receives entries + handlers, owns no resume state. |
| `resources/js/Pages/ResumeBuilder/Partials/SectionDrawer.tsx` (create) | Positioning shell + header + close/Esc handling. Renders `children`. Owns no field logic. |

`Edit.tsx` is 1489 lines and this plan removes more from it than it adds. The two new files are deliberately dumb — all state stays in `Edit.tsx` so the registry's render closures keep working without prop-drilling every setter.

---

### Task 1: Extract the section registry

Convert `renderForm()`'s per-section JSX into a keyed registry, with no visual change yet. The panel still renders every section in order; this is a pure refactor whose only observable effect is that `tsc` now enforces section completeness.

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx:1020-1178` (the `renderForm` body)

**Interfaces:**
- Consumes: existing state — `sectionOrder`, `openSections`, `toggleSection`, `highlightSection`, `save`, and every section's state/setters.
- Produces:
  ```ts
  type SectionKey = 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'custom';
  type SectionEntry = {
      key: SectionKey;
      label: string;
      isDraggable: boolean;   // contact is pinned; the rest reorder
      isComplete: () => boolean;
      render: () => React.ReactNode;   // fields only — no card chrome, no DraggableSection wrapper
  };
  const SECTIONS: Record<SectionKey, SectionEntry>
  ```
  `SECTIONS` is built inside the component (its closures capture state), not at module scope.

- [ ] **Step 1: Add the types above `Edit.tsx`'s component**

Place immediately after the existing `RIGHT_TABS` declaration (`Edit.tsx:445`):

```tsx
type SectionKey = 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'custom';

type SectionEntry = {
    key: SectionKey;
    label: string;
    isDraggable: boolean;
    isComplete: () => boolean;
    render: () => React.ReactNode;
};
```

- [ ] **Step 2: Confirm the real section key set**

The literal union above is a starting guess. Run:

```bash
grep -n "key === '" resources/js/Pages/ResumeBuilder/Edit.tsx
```

Every `key === 'x'` branch inside `renderForm`'s `sectionOrder.map` is a section. Widen or narrow the `SectionKey` union to match **exactly**, and confirm against the `sectionOrder` default at `Edit.tsx:513`. If they disagree, the `sectionOrder` default is authoritative — it is what the saved data contains.

- [ ] **Step 3: Build the registry, moving JSX verbatim**

Inside the component, replacing the `renderForm` definition. For each section, move the **inner** JSX — the children of `<DraggableSection>`, not the wrapper — into that entry's `render`. The wrapper chrome is re-added by the caller in Task 2, so it must not be duplicated inside `render`.

Worked example for `summary`, taken from the current `Edit.tsx:1058-1075`:

```tsx
const SECTIONS: Record<SectionKey, SectionEntry> = {
    summary: {
        key: 'summary',
        label: 'Professional Summary',
        isDraggable: true,
        isComplete: () => summary.trim().length > 0,
        render: () => (
            <>
                <FTextarea
                    value={summary}
                    onChange={setSummary}
                    onBlur={save}
                    placeholder="Write a brief 2–4 sentence overview of your background and what you bring to a role."
                    rows={5}
                />
                <p className="text-right text-xs text-[#94a3b8]">{Math.max(0, 1000 - summary.length)} characters remaining</p>
                {renderBulletTools(
                    'summary',
                    summary,
                    s => { setSummary(s); markGenerated('summary'); setTimeout(save, 0); },
                    handleGenerateSummary,
                )}
            </>
        ),
    },
    // ...one entry per key confirmed in Step 2, same treatment
};
```

Rules while moving:
- Do not retype the JSX — cut and paste it, then fix only the wrapper. Retyping introduces transcription bugs in ~400 lines.
- Every `onBlur={save}` stays exactly where it is.
- `contact` gets `isDraggable: false` (it is pinned, `Edit.tsx:1032-1049`) and its `render` is the `<div className="grid grid-cols-1 gap-3 ...">` at `:1040`, without the surrounding card and toggle button.
- `isComplete` should be a cheap truthiness check on that section's state — e.g. `experience.length > 0`, `contact.full_name.trim().length > 0`. It drives a palette dot, nothing load-bearing.

- [ ] **Step 4: Keep `renderForm()` working, now built from the registry**

Do not delete `renderForm()` yet — Task 2 does that. Rewrite its body to consume the registry so the app stays runnable and you can diff the rendering visually:

```tsx
const renderForm = (): React.ReactNode => (
    <div className="mx-auto max-w-2xl space-y-4 px-4">
        <div className="overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.10)] px-5 py-4 space-y-2">
            <FLabel>Resume Name</FLabel>
            <FInput value={name} onChange={setName} onBlur={save} placeholder="My Resume" />
            <p className="text-xs text-[#94a3b8]">File: <span className="font-mono">{pdfFilename}</span></p>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#cbd5e1] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.10)]">
            <button type="button" className="flex w-full items-center gap-3 px-4 py-4 text-left" onClick={() => { toggleSection('contact'); highlightSection('contact'); }}>
                <span className="w-[18px]" />
                <span className="flex-1 text-sm font-semibold text-[#0f172a]">{SECTIONS.contact.label}</span>
                <svg className={`h-4 w-4 text-[#94a3b8] transition-transform ${openSections.contact ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
            </button>
            {openSections.contact && SECTIONS.contact.render()}
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
            <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                {sectionOrder.map(key => {
                    const entry = SECTIONS[key as SectionKey];
                    if (!entry) return null;
                    return (
                        <DraggableSection
                            key={entry.key}
                            id={entry.key}
                            title={entry.label}
                            optional={entry.key === 'summary'}
                            open={openSections[entry.key as keyof typeof openSections]}
                            onToggle={() => { toggleSection(entry.key); highlightSection(entry.key); }}
                        >
                            {entry.render()}
                        </DraggableSection>
                    );
                })}
            </SortableContext>
        </DndContext>
    </div>
);
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0. A missing key in `SECTIONS` is reported as `Property 'x' is missing in type ... but required in type 'Record<SectionKey, SectionEntry>'` — that is the completeness guarantee working. Add the missing entry rather than loosening the type to `Partial<>`.

- [ ] **Step 6: Verify no visual regression**

Run `npm run dev`, open a resume in the builder, and confirm against the pre-change UI:
- every section appears, in the same order
- expand/collapse still works per section
- drag-to-reorder still works
- editing a field and clicking away still shows "Saving…" then "Saved", and the preview updates

This is the one moment where a pure refactor can be checked against a known-good UI. Do not skip it — after Task 2 the old layout is gone and there is nothing left to diff against.

- [ ] **Step 7: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "refactor: extract builder sections into a keyed registry"
```

---

### Task 2: Build the palette and drawer

Replace the tabbed full-width panel with a narrow palette, and move field editing into an overlay drawer.

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Partials/SectionDrawer.tsx`
- Create: `resources/js/Pages/ResumeBuilder/Partials/SectionPalette.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` — delete `renderForm()`, the resize handle (`:1224-1233`), and `sidebarOpen`/`panelWidth`/`startResize` (`:527`, `:533`, `:536`); rewrite the `<aside>` (`:1236-1245`).

**Interfaces:**
- Consumes: `SectionKey`, `SectionEntry`, `SECTIONS` from Task 1.
- Produces:
  ```ts
  // SectionDrawer.tsx
  export default function SectionDrawer(props: {
      title: string;
      onClose: () => void;
      children: React.ReactNode;
  }): JSX.Element;

  // SectionPalette.tsx
  export default function SectionPalette(props: {
      entries: SectionEntry[];        // in sectionOrder, contact first
      activeKey: SectionKey | null;
      onSelect: (key: SectionKey) => void;
      onDragEnd: (event: DragEndEvent) => void;
      sensors: ReturnType<typeof useSensors>;
      sectionOrder: string[];
  }): JSX.Element;
  ```
  `SectionKey` and `SectionEntry` must be exported from `Edit.tsx` for these imports to resolve.

- [ ] **Step 1: Export the types from `Edit.tsx`**

Change the Task 1 declarations to:

```tsx
export type SectionKey = 'contact' | 'summary' | 'experience' | 'education' | 'skills' | 'custom';

export type SectionEntry = {
    key: SectionKey;
    label: string;
    isDraggable: boolean;
    isComplete: () => boolean;
    render: () => React.ReactNode;
};
```

- [ ] **Step 2: Create `SectionDrawer.tsx`**

```tsx
import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

type Props = {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
};

/**
 * Overlays the preview column while one section's fields are edited.
 * Positioning shell only — owns no field logic and no resume state.
 */
export default function SectionDrawer({ title, onClose, children }: Props) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    return (
        <div
            role="dialog"
            aria-label={title}
            className="absolute inset-y-0 right-0 z-20 flex w-full max-w-[640px] flex-col border-l border-[#cbd5e1] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.18)]"
        >
            <div className="flex shrink-0 items-center justify-between border-b border-[#eeeef5] px-5 py-3">
                <span className="text-sm font-semibold text-[#0f172a]">{title}</span>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close section"
                    className="rounded-md p-1.5 text-[#94a3b8] transition-colors hover:bg-[#f1f5f9] hover:text-[#4f46e5]"
                >
                    <XMarkIcon className="h-4 w-4" />
                </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
                {children}
            </div>
        </div>
    );
}
```

Note: **no backdrop and no click-outside-to-close.** A backdrop would dim the preview, which is the one thing this layout exists to keep prominent, and click-outside would fire while the user is reaching for the palette. Esc and the close button are the two ways out.

- [ ] **Step 3: Verify the heroicons import path matches the codebase**

Run:

```bash
grep -n "from '@heroicons" resources/js/Pages/ResumeBuilder/Edit.tsx | head -3
```

If `Edit.tsx` imports from `@heroicons/react/24/outline`, the import above is correct. If it uses a different variant (`20/solid`), match it and swap `XMarkIcon` accordingly. Do not add a new icon package.

- [ ] **Step 4: Create `SectionPalette.tsx`**

```tsx
import { DndContext, closestCenter, type DragEndEvent, type useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon } from '@heroicons/react/24/outline';
import type { SectionEntry, SectionKey } from '../Edit';

type Props = {
    entries: SectionEntry[];
    activeKey: SectionKey | null;
    onSelect: (key: SectionKey) => void;
    onDragEnd: (event: DragEndEvent) => void;
    sensors: ReturnType<typeof useSensors>;
    sectionOrder: string[];
};

function PaletteRow({ entry, active, onSelect }: { entry: SectionEntry; active: boolean; onSelect: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: entry.key });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                active ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] hover:border-[#c7c7d9] hover:bg-[#f8fafc]'
            }`}
        >
            {entry.isDraggable && (
                <button
                    type="button"
                    aria-label={`Reorder ${entry.label}`}
                    className="cursor-grab touch-none text-[#cbd5e1] hover:text-[#94a3b8]"
                    {...attributes}
                    {...listeners}
                >
                    <Bars3Icon className="h-3.5 w-3.5" />
                </button>
            )}
            <button
                type="button"
                onClick={onSelect}
                className={`flex-1 text-left text-sm ${active ? 'font-semibold text-[#4f46e5]' : 'text-[#1e293b]'}`}
            >
                {entry.label}
            </button>
            <span
                aria-hidden
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${entry.isComplete() ? 'bg-[#4f46e5]' : 'bg-[#e2e8f0]'}`}
            />
        </div>
    );
}

/** The section list. Click a row to edit it; drag the handle to reorder. */
export default function SectionPalette({ entries, activeKey, onSelect, onDragEnd, sensors, sectionOrder }: Props) {
    const pinned = entries.filter(e => !e.isDraggable);
    const sortable = entries.filter(e => e.isDraggable);

    return (
        <div className="space-y-1.5">
            {pinned.map(entry => (
                <PaletteRow key={entry.key} entry={entry} active={activeKey === entry.key} onSelect={() => onSelect(entry.key)} />
            ))}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5">
                        {sortable.map(entry => (
                            <PaletteRow key={entry.key} entry={entry} active={activeKey === entry.key} onSelect={() => onSelect(entry.key)} />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
```

`handleSectionDragEnd` (`Edit.tsx:1001`) is passed straight through as `onDragEnd` and needs no change — it reorders `sectionOrder` by id, and the ids are the same section keys as before.

- [ ] **Step 5: Add drawer state to `Edit.tsx`**

Next to the other `useState` calls. **Name it `drawerSection`, not `openSection`** — `openSections` (plural, `Edit.tsx:596`) already exists as the accordion state and the two would be trivially confused on sight:

```tsx
const [drawerSection, setDrawerSection] = useState<SectionKey | null>(null);
```

- [ ] **Step 6: Rewrite the `<aside>` and mount the drawer**

Replace `Edit.tsx:1224-1245` (the resize handle and the aside header) and the tab-content block. The preview column at `:1211-1222` gains `relative` so the drawer can position against it:

```tsx
<div className="flex flex-wrap items-start bg-[#f1f5f9]">
    {/* Left column: the document. Drawer overlays this. */}
    <div className="relative min-h-[calc(100vh-3.5rem)] min-w-[320px] flex-1 bg-[#e2e3ee] px-8 py-6">
        <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-[#94a3b8]">Live preview</span>
            <span className="text-[10px] text-[#a0a0b0]">{TEMPLATE_LABELS[template] ?? template} template</span>
        </div>
        <div className="relative h-[calc(100vh-9rem)] overflow-hidden rounded-md bg-white shadow-[0_8px_30px_rgba(79,70,229,0.12)]">
            {renderPreviewFrames()}
        </div>

        {drawerSection && (
            <SectionDrawer
                title={SECTIONS[drawerSection].label}
                onClose={() => setDrawerSection(null)}
            >
                {SECTIONS[drawerSection].render()}
            </SectionDrawer>
        )}
    </div>

    {/* Right palette — fixed width, no collapse, no resize. */}
    <aside
        className="sticky top-0 max-h-screen w-[300px] shrink-0 self-start overflow-y-auto border-l border-[#cbd5e1] bg-white"
        style={{ minHeight: 'calc(100vh - 3.5rem)' }}
    >
        <div className="flex gap-2 border-b border-[#eeeef5] p-3">
            <a href={route('builder.docx', resume.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0f172a] py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1e293b]">
                <ArrowDownTrayIcon className="h-3.5 w-3.5" /> DOCX
            </a>
            <a href={route('builder.pdf', resume.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#cbd5e1] py-2 text-xs font-semibold text-[#475569] transition-colors hover:border-[#a5b4fc] hover:bg-[#f8fafc] hover:text-[#4f46e5]">
                <ArrowDownTrayIcon className="h-3.5 w-3.5" /> PDF
            </a>
        </div>

        <div className="space-y-4 p-3">
            {recruiterNote && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">Recruiter note</p>
                    <p className="text-sm leading-relaxed text-amber-900">{recruiterNote}</p>
                </div>
            )}

            <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.05em] text-[#94a3b8]">Sections</p>
                <SectionPalette
                    entries={[SECTIONS.contact, ...sectionOrder.map(k => SECTIONS[k as SectionKey]).filter(Boolean)]}
                    activeKey={drawerSection}
                    onSelect={setDrawerSection}
                    onDragEnd={handleSectionDragEnd}
                    sensors={sensors}
                    sectionOrder={sectionOrder}
                />
            </div>
        </div>
    </aside>
</div>
```

- [ ] **Step 7: Relocate the remaining tab content**

The old `RIGHT_TABS` panel held Design, Optimize, and Share content besides Sections. Those are **not** deleted — they move below the section list in the palette, each wrapped in the existing `PanelCard` (`Edit.tsx:PanelCard`) so they collapse:

- **Design** — template picker and font controls (currently `Edit.tsx:1286` onward)
- **Optimize** — `StrengthScorePanel`, `AtsMatchPanel`, AI actions
- **Share** — active-link count and the `/shares` link, unchanged

Move each block verbatim into a `<PanelCard>` in the palette's `space-y-4` container. Then delete `RIGHT_TABS` (`:445`), `rightTab`/`setRightTab` (`:528`), and the tab bar (`:1249-1263`).

At 300px these blocks are narrower than they were. If the template picker's `grid-cols-3` (`:1296`) is too cramped, drop it to `grid-cols-2` — that is the only expected width casualty.

- [ ] **Step 8: Delete the dead code**

```bash
grep -n "sidebarOpen\|panelWidth\|startResize\|renderForm\|rightTab\|RIGHT_TABS" resources/js/Pages/ResumeBuilder/Edit.tsx
```

Every hit must be gone. Also remove now-unused imports (`ChevronRightIcon`/`ChevronLeftIcon` if the collapse button was their only user).

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0. Unused-import errors here are the signal that Step 8 was incomplete.

- [ ] **Step 10: Verify in the browser**

Run `npm run dev`, open a resume:
- Page loads with the preview visible and **no drawer open**.
- Clicking each palette row opens the drawer with that section's fields.
- Editing a field, then closing the drawer, shows the change in the preview.
- Esc and the × both close the drawer.
- Dragging a palette handle reorders sections, and the preview reflects the new order.
- The completion dot fills for sections with content.

- [ ] **Step 11: Run the backend tests**

Run: `php artisan test --compact --filter=ResumeBuilder`
Expected: PASS. These assert save and prop behavior; the refactor moved JSX between callers and must not have touched either. A failure here means the refactor changed behavior it was not supposed to.

- [ ] **Step 12: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx resources/js/Pages/ResumeBuilder/Partials/SectionDrawer.tsx resources/js/Pages/ResumeBuilder/Partials/SectionPalette.tsx
git commit -m "feat: builder palette and section drawer over preview"
```

---

### Task 3: Narrow-screen collapse

Below 1024px, show one pane at a time: palette full-width, drawer full-screen, preview hidden.

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` (the layout block from Task 2, Step 6)
- Modify: `resources/js/Pages/ResumeBuilder/Partials/SectionDrawer.tsx`

**Interfaces:**
- Consumes: `drawerSection` state from Task 2. No new state — the same value drives both layouts.
- Produces: nothing new.

- [ ] **Step 1: Make the preview column hide below `lg`**

On the preview column's wrapper:

```tsx
<div className="relative hidden min-h-[calc(100vh-3.5rem)] min-w-[320px] flex-1 bg-[#e2e3ee] px-8 py-6 lg:block">
```

- [ ] **Step 2: Make the palette full-width below `lg`**

On the `<aside>`:

```tsx
<aside
    className="sticky top-0 max-h-screen w-full shrink-0 self-start overflow-y-auto border-l border-[#cbd5e1] bg-white lg:w-[300px]"
    style={{ minHeight: 'calc(100vh - 3.5rem)' }}
>
```

- [ ] **Step 3: Move the drawer out of the hidden column on small screens**

The drawer currently lives inside the preview column, which is now `hidden` below `lg` — so it would disappear with it. Move the `{drawerSection && <SectionDrawer .../>}` block out to be a **direct child of the outer `flex` container**, and make the drawer fixed-position on small screens:

In `SectionDrawer.tsx`, change the root element's className to:

```tsx
className="fixed inset-0 z-30 flex w-full flex-col bg-white lg:absolute lg:inset-y-0 lg:left-auto lg:right-[300px] lg:z-20 lg:max-w-[640px] lg:border-l lg:border-[#cbd5e1] lg:shadow-[0_8px_30px_rgba(15,23,42,0.18)]"
```

and give the outer layout container `relative` so the `lg:absolute` positioning anchors to it:

```tsx
<div className="relative flex flex-wrap items-start bg-[#f1f5f9]">
```

The `lg:right-[300px]` offset keeps the drawer clear of the palette now that it is positioned against the whole layout rather than the preview column.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exits 0.

- [ ] **Step 5: Verify at each breakpoint**

Run `npm run dev` and check in devtools device toolbar at **375px, 768px, 1024px, 1280px, 1440px**:
- At 375px and 768px: no preview, palette fills the width, opening a section covers the screen, closing returns to the palette.
- At 1024px and above: preview visible, palette 300px on the right, drawer overlays the preview without covering the palette.
- **No horizontal scrolling at any width.** Confirm by checking `document.body.scrollWidth <= window.innerWidth` in the console.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx resources/js/Pages/ResumeBuilder/Partials/SectionDrawer.tsx
git commit -m "feat: collapse builder to single pane below lg"
```

---

### Task 4: Final verification

**Files:** none modified — this task only runs checks.

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: exits 0. This runs `tsc` then `vite build`; it is the same gate CI uses.

- [ ] **Step 2: Full backend suite**

Run: `php artisan test --compact`
Expected: all pass. In particular the tests asserting `assertSessionMissing('featureGate')` must still pass — per `CLAUDE.md` those exist to catch a paywall creeping back in, and a failure there means something unrelated to this work went wrong.

- [ ] **Step 3: Formatter**

Run: `./vendor/bin/pint --dirty --format agent`
Expected: no changes (this plan touches no PHP), but run it to confirm.

- [ ] **Step 4: Confirm the success criteria from the spec**

Walk the builder once more against the spec's list:
- [ ] Loads with the resume visible and dominant; no drawer open
- [ ] Every section reachable in one click; every field editable in the drawer
- [ ] Save fires on blur; preview reflects the change when the drawer closes
- [ ] No horizontal scroll at 1024/1280/1440px
- [ ] Below 1024px exactly one pane visible

- [ ] **Step 5: Commit any stragglers**

```bash
git status --short
```

If clean, the branch is ready. If not, review and commit deliberately — nothing should be uncommitted at this point.

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Viewport left, visible on load | Already true; preserved in Task 2 Step 6 |
| Palette right, fixed width, section list with filled/empty state | Task 2 Steps 4, 6 |
| Tool panels + Share in palette | Task 2 Step 7 |
| Collapse-to-`w-14` and resize dropped | Task 2 Step 8 |
| `SectionDrawer` overlays viewport | Task 2 Steps 2, 6 |
| `renderForm()` → per-section registry | Task 1 |
| One new state value, Esc to close, no URL state | Task 2 Steps 2, 5 |
| Save behavior unchanged | Global constraint; verified Task 2 Step 11 |
| Accepted occlusion, no scroll-sync, no push | Task 2 Step 2 (no backdrop note) |
| Narrow-screen single pane below 1024px | Task 3 |
| Registry completeness enforced | Task 1 Step 5 — **type-level, not the runtime test the spec proposed.** See "Corrections to the spec". |
| No backend changes | Global constraints |

**Deviation from spec, restated:** the spec's testing section asked for a runtime registry-completeness test and for existing builder tests to stay green. The second is honored (Task 2 Step 11, Task 4 Step 2). The first is replaced by a `tsc` type constraint because the project has no JS test runner and adding one needs approval. If the reviewer wants the runtime test, that is a separate plan that starts with a dependency decision.

**Placeholder scan:** no TBDs. Two steps (Task 1 Step 2, Task 2 Step 3) deliberately instruct the implementer to *verify a fact in the file* rather than assume it — the section key set and the heroicons import path. These are checks with an exact command and an exact decision rule, not deferred work.

**Type consistency:** `SectionKey` / `SectionEntry` / `SECTIONS` are declared in Task 1 Step 1, exported in Task 2 Step 1, and consumed with the same names in both new components. `drawerSection` is used consistently in Tasks 2 and 3 and is deliberately distinct from the pre-existing `openSections`. `handleSectionDragEnd` keeps its existing signature and is passed as `onDragEnd`.
