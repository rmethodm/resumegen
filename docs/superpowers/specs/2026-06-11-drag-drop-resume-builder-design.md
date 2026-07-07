# Drag-and-Drop Resume Builder — Design Spec

**Date:** 2026-06-11
**Status:** Approved

---

## Overview

Replace the current fixed-section resume builder with a Machform-inspired drag-and-drop canvas builder. Users start with a blank canvas, drag resume section blocks from a left panel onto the canvas, customize the fields within each section, reorder sections, and export to PDF — all within the existing 13-template PDF pipeline.

---

## Goals

- Replace the current `Edit.tsx` form-based builder with a canvas builder
- Give users full control over which sections appear and in what order
- Allow field-level customization within each section (add, remove, rename, reorder)
- Let users save a customized section for reuse across multiple resumes
- Tighten the visual density of the builder UI (CSS cleanup)
- Produce no breaking changes to the PDF pipeline or existing resume data

---

## Layout — Three Panels

```
┌─────────────────────────────────────────────────────────┐
│ Navbar (existing AuthenticatedLayout)                   │
├──────────────┬──────────────────────────┬───────────────┤
│ Left Panel   │ Canvas                   │ Right Sidebar │
│ (palette)    │ (drop zone)              │ (appearance)  │
│ w-48 192px   │ flex-1                   │ w-32 128px    │
│              │                          │               │
│ Resume       │ Dropped sections stack   │ Template      │
│ Sections     │ vertically, draggable    │ Font family   │
│              │ to reorder               │ Accent color  │
│ My Saved     │                          │ Save / PDF /  │
│ Sections     │                          │ DOCX          │
└──────────────┴──────────────────────────┴───────────────┘
```

---

## Left Panel — Section Palette

### Built-in Section Blocks

All sections that exist in the current builder, available as draggable blocks:

| Block | Default Fields |
|---|---|
| 👤 Contact Info | Full Name, Email, Phone, Location, LinkedIn, Website |
| 📝 Summary | Summary textarea |
| 💼 Experience | Company, Title, Start Date, End Date, Current (checkbox), Bullets |
| 🎓 Education | School, Degree, Field, Grad Year |
| ⭐ Skills | Skills (tag input) |
| 📜 Certifications | Name, Issuer, Date |
| ＋ Custom Section | Name (editable), empty fields |

Each block in the palette is visually distinct (indigo tint, drag handle `⠿`). Dragging a block from the palette onto the canvas adds it; the block remains in the palette so it can be added again (e.g. two Experience entries, two Education blocks).

### My Saved Sections

Below the built-in blocks, a "My Saved Sections" group shows the user's saved custom sections (purple tint). These are also draggable onto the canvas.

---

## Canvas

### Drop Zone

- **New resumes:** canvas starts empty with a centered prompt: "⠿ Drag a section from the left panel to build your resume"
- **Existing resumes:** `ResumeBuilderController@edit` passes the resume's current data as props; the canvas pre-populates with section cards for every section that has content, ordered by `section_order`
- Each dropped section appears as a card stacked vertically
- Sections can be reordered by dragging (uses existing `@dnd-kit/sortable`)

### Section Card — Collapsed State

```
┌─ ⠿ 💼 Experience  ·  click to edit fields  ─── [💾 Save] [✕] ─┐
└──────────────────────────────────────────────────────────────────┘
```

- Drag handle `⠿` on left for reordering between sections
- Click anywhere on the card to expand
- "💾 Save" — saves this section's field structure to Saved Sections
- "✕" — removes the section from the canvas (confirms if section has data)

### Section Card — Expanded State

```
┌─ ⠿ 💼 Experience  ────────────────────── [💾 Save] [✕] ─┐
│  ┌──────────────┐  ┌──────────────┐                      │
│  │ Company      │  │ Title        │  [✕ remove field]    │
│  └──────────────┘  └──────────────┘                      │
│  ┌──────────────────────────────────┐                     │
│  │ 📅 Date Range                    │  [✕ remove field]   │
│  └──────────────────────────────────┘                     │
│  ┌──────────────────────────────────┐                     │
│  │ • Bullet List                    │  [✕ remove field]   │
│  └──────────────────────────────────┘                     │
│  ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                     │
│  │  + add field ▾ (dropdown)        │                     │
│  └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘                     │
└─────────────────────────────────────────────────────────────┘
```

**Add field dropdown options:** Text Field, Textarea, Date, Date Range, Bullet List, Checkbox

Fields within a section can be reordered by dragging. Field labels are click-to-edit inline.

---

## Saved Sections

### Saving

When the user clicks "💾 Save section" on a canvas card:
1. A small inline prompt appears: "Name this section:" (pre-filled with the section's current name)
2. On confirm → `POST /builder/saved-sections` creates the record
3. The new section appears immediately in "My Saved Sections" in the left panel

### What Gets Saved

- Section name
- Section type (`experience`, `education`, `skills`, `custom`, etc.)
- Field list: field type, field label, field order

### What Does NOT Get Saved

- The user's content/data in the fields
- Appearance settings

### New Database Table: `saved_sections`

```
saved_sections
  id               bigint unsigned PK auto_increment
  user_id          FK → users.id (cascade delete)
  name             string(100)
  type             string(50)
  fields           JSON   -- [{ type, label, order }]
  created_at
  updated_at
```

### Routes

```
GET    /builder/saved-sections          index (returns user's saved sections as JSON)
POST   /builder/saved-sections          store
DELETE /builder/saved-sections/{id}     destroy
```

All routes are auth-gated and ownership-verified. No Inertia — JSON responses used to update the palette in place.

---

## Right Sidebar — Appearance

Same controls as the current collapsed sidebar, now always visible in a fixed right panel:

- **Template** — dropdown (all 13 templates)
- **Font family** — Sans / Serif / Mono toggle
- **Accent color** — 4–6 preset swatches + custom hex input
- **Save** — manual save button with "Saved at HH:MM" confirmation
- **Export PDF** — link to `GET /builder/{resume}/pdf`
- **Export DOCX** — link (Starter+ only, locked button for free users)

---

## Section Interaction Flow

1. **Drag** a block from the left panel → drops onto the canvas as a collapsed card
2. **Click** the card → expands showing default fields
3. **Customize** — remove unwanted fields, add new ones from the dropdown, rename labels, reorder by dragging
4. **Fill in data** — fields are live inputs; saves on blur (same `router.put` pattern as current builder)
5. **Save section (optional)** — "💾 Save section" stores the field structure for reuse on other resumes

---

## Data Model — No Breaking Changes

The builder produces the same JSON shape that the PDF pipeline already consumes. No changes to `resume-pdf.blade.php` or any of the 13 templates.

| Column | Type | Notes |
|---|---|---|
| `contact` | JSON | unchanged |
| `experience` | JSON | unchanged |
| `education` | JSON | unchanged |
| `skills` | JSON | unchanged |
| `certifications` | JSON | unchanged |
| `custom_sections` | JSON | unchanged |
| `section_order` | JSON | unchanged — builder writes which sections are present and in what order |

The builder replaces how the user populates these columns, not what the columns contain.

---

## CSS Cleanup

The current builder uses spacing and type sizes that make the page feel heavy. The new builder targets a tighter, cleaner scale throughout:

| Element | Before | After |
|---|---|---|
| Section header padding | `py-3` | `py-2` |
| Section header text | `text-sm` | `text-xs` |
| Field labels | `text-sm` | `text-xs` |
| Section card gap | `mb-5` | `mb-3` |
| Input padding | `px-3 py-2` | `px-2 py-1.5` |
| Left sidebar width | `w-56` (224px) | `w-48` (192px) |

---

## Frontend Components

The existing route `GET /builder/{resume}/edit` (named `builder.edit`) continues to exist. `ResumeBuilderController@edit` is updated to render `ResumeBuilder/Builder` instead of `ResumeBuilder/Edit`. `Edit.tsx` is deleted. All existing named routes and links remain valid.

| File | Purpose |
|---|---|
| `resources/js/Pages/ResumeBuilder/Builder.tsx` | New top-level page — rendered by the existing `builder.edit` route |
| `resources/js/Pages/ResumeBuilder/Partials/BuilderPalette.tsx` | Left panel — built-in + saved section blocks |
| `resources/js/Pages/ResumeBuilder/Partials/BuilderCanvas.tsx` | Drop zone and section card list |
| `resources/js/Pages/ResumeBuilder/Partials/BuilderSection.tsx` | Single section card (collapsed + expanded states) |
| `resources/js/Pages/ResumeBuilder/Partials/BuilderAppearance.tsx` | Right sidebar |

Drag-and-drop uses `@dnd-kit/sortable` (already installed). Two `DndContext` instances: one for palette→canvas drops, one for within-canvas reordering.

---

## Backend

| File | Purpose |
|---|---|
| `app/Models/SavedSection.php` | Model with `user_id`, `name`, `type`, `fields` cast to array |
| `app/Http/Controllers/SavedSectionController.php` | index / store / destroy |
| `database/migrations/..._create_saved_sections_table.php` | Migration |
| `app/Http/Controllers/ResumeBuilderController.php` | `edit()` method gains `savedSections` prop |

---

## Testing

- `SavedSectionTest` — store, index (own only), destroy, ownership gate (cannot delete other user's)
- `ResumeBuilderTest` — existing tests continue passing (same data shape)
- Manual: drag section onto canvas, customize fields, save section, reuse on second resume, export PDF

---

## Out of Scope

- WYSIWYG layout editing (sections placed at arbitrary X/Y positions)
- Raw element palette (standalone text fields outside of a section container)
- Section sharing between users
- Version history of saved sections
