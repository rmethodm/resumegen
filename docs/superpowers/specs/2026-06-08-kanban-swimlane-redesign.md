# Kanban Swimlane Redesign

**Date:** 2026-06-08  
**Status:** Approved  
**Scope:** Replace the current vertical-column Kanban on the Jobs page with a horizontal swimlane layout.

---

## Problem

The current Kanban board uses six fixed-width columns (`min-w-[260px] max-w-[300px]`). On typical viewports this overflows horizontally, forcing the page to show a scrollbar. Cards are also tall, making the board feel bulky.

---

## Solution

Rotate the layout: statuses become **rows**, cards become **horizontal pills**. The board fills the full page width with no outer horizontal scroll.

---

## Layout

- A fixed-width label column (~90px, right-aligned) with a colored left border indicating status.
- A flex-wrap row of card pills to the right of each label.
- Rows with zero cards show a subtle "— none yet" empty state.
- The board fills 100% of the content area width.

---

## Cards (Pills)

Each pill displays:
- **Company** (bold) · Role (muted), both truncated with `overflow: hidden`.
- A small amber badge if `follow_up_at` is overdue.
- A `⋮` dot (visible on hover) as the click target for the status picker.
- The pill itself is clickable (navigates to `jobs.edit`).
- The pill is draggable via `@dnd-kit`.

The current "Edit →" inline link is removed; clicking the pill body navigates instead.

---

## Interactions

### 1. Drag-and-Drop
- `DndContext` wraps the entire swimlane board.
- Each row is a `useDroppable` zone keyed by status string.
- Dragging a pill vertically between rows fires `router.put(route('jobs.update', id), { status: newStatus }, { preserveScroll: true, preserveState: true })`.
- `PointerSensor` with `activationConstraint: { distance: 8 }` (same as current).

### 2. Click-to-Change-Status
- Clicking the `⋮` dot on a pill opens an inline popover listing all 6 statuses. The click must call `stopPropagation` to prevent triggering the pill's edit navigation.
- Selecting a status fires the same `router.put` call as drag-and-drop.
- The popover closes on selection or on outside click.
- This provides a reliable fallback on touch/mobile where drag-and-drop is unreliable.

---

## Files Changed

| File | Action |
|---|---|
| `resources/js/Pages/Jobs/KanbanView.tsx` | Replace entirely with new `SwimlaneView.tsx` component |
| `resources/js/Pages/Jobs/KanbanColumn.tsx` | Delete (retired) |
| `resources/js/Pages/Jobs/KanbanCard.tsx` | Delete (retired) |
| `resources/js/Pages/Jobs/SwimlaneView.tsx` | Create — board container, DndContext, rows |
| `resources/js/Pages/Jobs/SwimlaneRow.tsx` | Create — single status row (droppable + pills) |
| `resources/js/Pages/Jobs/SwimlanePill.tsx` | Create — individual draggable card pill with status popover |
| `resources/js/Pages/Jobs/Index.tsx` | Update import: `KanbanView` → `SwimlaneView` |

---

## What Does Not Change

- The `jobs` prop shape passed from `Index.tsx` is unchanged.
- The `router.put` call to `jobs.update` with `{ status }` is unchanged.
- The status color map (indigo / blue / amber / emerald / red / gray) is preserved.
- The 6 statuses and their labels are unchanged.
- All other views (Table view, funnel chart, trend chart) are untouched.

---

## Testing

- Drag a pill from one row to another — confirm status updates and pill moves to correct row.
- Click the `⋮` dot — confirm popover opens with all 6 statuses.
- Select a status from the popover — confirm pill moves and DB updates.
- Verify no horizontal scrollbar appears at 1280px and 1024px viewport widths.
- Verify empty rows show the empty state.
- Verify overdue follow-up badge renders.
- Verify pill click navigates to the edit page.
- Run the existing Jobs feature tests to confirm no regressions.
