# Group A: Resume Editor Enhancements — Design Spec

**Date:** 2026-06-05
**Features:** Section Drag-and-Drop (5), Custom Sections (6), Resume Strength Bar (18), Skills-First Templates (19), Additional Templates (20)
**Status:** Approved

---

## Overview

Five editor enhancements that address the most common user complaints and open three new audience segments (academics, career changers, design-forward roles). All changes are backwards-compatible — existing resumes continue to work without migration.

---

## 1. Data Model

Two new nullable JSON columns on the `resumes` table.

### `section_order` (nullable JSON)

Controls render order in both the editor and PDF. Stores an ordered array of section keys.

```json
["summary", "experience", "education", "skills", "certifications", "custom_abc123", "custom_def456"]
```

- When `null`, the existing hardcoded order is used (fully backwards-compatible).
- `contact` is **never included** in `section_order` — it is always rendered first unconditionally. No code needs to special-case it when reading the array.
- Built-in section keys (all draggable): `summary`, `experience`, `education`, `skills`, `certifications`.
- Custom section keys use the prefix `custom_` + the custom section's UUID.

### `custom_sections` (nullable JSON)

Array of custom section objects, each with structured entries matching the shape of `experience` entries.

```json
[
  {
    "id": "uuid-v4",
    "name": "Publications",
    "entries": [
      {
        "id": "uuid-v4",
        "title": "Paper or entry title",
        "subtitle": "Journal, conference, or institution",
        "start_date": "2024-03",
        "end_date": null,
        "description": "Abstract, notes, or context",
        "bullets": ["Key finding one", "Key finding two"]
      }
    ]
  }
]
```

- All fields on each entry are nullable except `id`.
- The `Resume` model's `$casts` array will include both new columns as `array`.
- The `ResumePolicy` already gates all mutations — no changes needed there.

---

## 2. Section Drag-and-Drop (Feature 5)

### Library

**dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable`) — actively maintained, compatible with React 18, lighter than react-beautiful-dnd.

### Interaction

- A grip icon (⠿) appears on the **left side of every `SectionHeader`** in the editor, in `text-indigo-300` matching the existing indigo theme.
- All sections are draggable except `Contact Information`, which is always rendered first and is not part of the draggable list.
- Custom sections participate in the same drag list as built-in sections.
- While dragging: the lifted section shows a subtle `shadow-lg` and `ring-2 ring-indigo-400`; a placeholder div with a dashed indigo border marks the drop target.
- On drop: `section_order` state is updated and `router.put` is called immediately (same pattern as all other fields). PDF preview refreshes via the existing `?t=timestamp` cache-bust on `pdfSrc`.

### Storage

- `section_order` is sent to the server as part of the existing resume update payload.
- `ResumeBuilderController@update` accepts `section_order` as a `nullable array` field alongside the existing resume fields.
- The PDF Blade view (`resume-pdf.blade.php`) reads `section_order` to determine render sequence. When `null`, falls back to the current hardcoded order.

---

## 3. Custom Sections (Feature 6)

### Editor UX

- A **"+ Add Section"** button sits below all existing sections at the bottom of the editor's left panel.
- Clicking opens a small inline form: a text input for the section name + a "Create" button + "Cancel".
- On create: a new object is appended to `custom_sections` with a client-generated UUID, an empty `entries` array, and its key added to the end of `section_order`.
- Each custom section renders in the editor using the existing `SectionHeader` component and the same entry/bullet UI pattern as Work Experience (title, subtitle, date range, description, bullets, "Add entry" button, delete entry button).
- A **delete button** on the section header removes the entire custom section after a `window.confirm` prompt.
- Custom sections are reorderable via drag-and-drop alongside built-in sections.

### Tier Gating

- **Free:** up to 2 custom sections.
- **Starter+:** unlimited custom sections.
- `UserLimits` gets a new `customSectionLimit(User $user): ?int` method returning `2` for free, `null` for starter/pro.
- The "+ Add Section" button is disabled with a tooltip when the free limit is reached, triggering the standard `UpgradeModal`.

### Academic Template Synergy

- When a user switches to the `academic` template and has zero custom sections, the editor displays a dismissible banner: **"Add suggested CV sections?"** with a single "Add them" button.
- Clicking pre-populates four custom sections: Publications, Teaching Experience, Presentations, Grants — each with one empty entry ready to fill.
- This is a one-time UX nudge, not automatic — the user can dismiss it.

### PDF Rendering

- `resume-pdf.blade.php` loops over `$resume->custom_sections` after all built-in sections (or at the position specified by `section_order`).
- Custom sections render with the same section heading style and entry layout as Work Experience.
- The `academic` template applies a slightly different entry style (no dates optional, longer description field).

---

## 4. Resume Strength Bar (Feature 18)

### Scoring — `ResumeStrengthScorer` Service

New service at `app/Services/ResumeStrengthScorer.php`. Accepts a `Resume` model, returns an integer 0–100 and a single tip string.

| Criterion | Points |
|---|---|
| Contact info complete (name + email + location) | 15 |
| Professional summary present (non-empty) | 15 |
| At least 1 work experience entry | 15 |
| Education present | 10 |
| At least 3 skills | 10 |
| At least one bullet contains a number or % (regex) | 10 |
| At least 2 work experience entries | 10 |
| LinkedIn URL present in contact | 5 |
| At least one experience entry has 3+ bullets | 5 |
| Custom section or certification present | 5 |

**Tip logic:** The tip string is the highest-point unmet criterion, phrased as a short action. Example: "Add a professional summary" (15 pts) before "Add your LinkedIn URL" (5 pts).

### Integration

- `ResumeBuilderController@index` calls `ResumeStrengthScorer::score($resume)` for each resume and passes `strength` (int) and `strengthTip` (string) alongside each resume object to `ResumeBuilder/Index.tsx`.
- No new route or endpoint — piggybacked on the existing index response.

### UI — Resume List Card

- A slim progress bar (h-1.5, rounded-full) below the resume name on each card in `Index.tsx`.
- Color based on score:
  - 0–40: `from-red-400 to-red-500`
  - 41–70: `from-amber-400 to-amber-500`
  - 71–100: `from-indigo-500 to-violet-600`
- Score percentage shown as a small number (`text-xs font-bold`) at the right end of the bar.
- Tip text in `text-xs text-[#a0a0b0]` below the bar: e.g. "Add a summary to improve"
- No strength UI in the editor — dashboard only.

---

## 5. Templates (Features 19 + 20)

### New Templates Summary

| Template Key | Display Name | ATS Safe | Available Tier |
|---|---|---|---|
| `skills-first` | Skills-First | ✓ | Free |
| `skills-first-visual` | Skills-First Visual | ✗ | Starter+ |
| `academic` | Academic CV | ✓ | Starter+ |
| `bold` | Minimalist Bold | ✓ | Free |
| `timeline` | Timeline | ✗ | Starter+ |

**Updated free tier templates:** classic, modern, ats, skills-first, bold (5 total, up from 3).

### Template Descriptions

**`skills-first`:** Single-column. An indigo "Core Competencies" chip grid (pill tags) sits between the contact header and professional summary. ATS-safe — chips render as plain comma-separated text in the PDF's text layer.

**`skills-first-visual`:** Single-column. Skills rendered as gradient proficiency bars (Expert / Advanced / Intermediate) with indigo fill. Visually distinctive but not ATS-parseable. Flagged in the template picker with a "Design-focused · Not ATS-optimized" amber badge.

**`academic`:** Long-form single-column CV layout. Standard sections render as usual. Custom sections render with academic-specific styling: no date range required, full description width, numbered entry support. No page limit enforced. Suitable for researchers, PhD applicants, faculty.

**`bold`:** Single-column, minimal. Large heavy-weight name (font-black, tracking-tight). Section headings use a thick 3px border-bottom in the resume's accent color rather than a background fill. No sidebars, no color blocks. ATS-safe, professional for finance/law/consulting.

**`timeline`:** Single-column. Experience entries rendered on a vertical timeline: a connecting line runs down the left, dot markers at each entry. Dates appear beside the dot. Eye-catching for creative and startup roles. Not ATS-safe — flagged with the same amber badge as `skills-first-visual`.

### Implementation Notes

- All templates rendered server-side in `resume-pdf.blade.php` (no React components).
- Template picker (`Edit.tsx`) updated to show ATS warning badge for `skills-first-visual` and `timeline`.
- `UserLimits::allowedTemplates()` updated: free array adds `skills-first` and `bold`; all-templates array adds all five new keys.
- `UserLimits::FREE_TEMPLATES` constant updated from 3 to 5 entries.

---

## Error Handling & Edge Cases

- **Drag-and-drop with missing section in `section_order`:** If a resume's `section_order` is missing a built-in section key (e.g. after a future migration adds a new section), the editor appends any missing keys to the end. Never loses sections.
- **Custom section delete while dragging:** The delete confirm modal is blocked while a drag is in progress.
- **Strength scorer on empty resume:** Returns 0 with tip "Add your name and contact information". No division-by-zero risk (all criteria are additive).
- **PDF render with unknown template key:** Falls back to `classic` — same behaviour as today.
- **`section_order` with stale custom section key:** If a custom section is deleted, its key is removed from `section_order` on the same state update. No orphaned keys reach the server.

---

## Testing Plan

- **Migration test:** `section_order` and `custom_sections` nullable; existing resumes unaffected.
- **Custom sections CRUD:** create, rename, add entry, delete entry, delete section, free tier limit enforcement.
- **Section reorder:** order persists after save, PDF renders in new order, contact pinned at top.
- **Strength scorer unit tests:** each criterion independently, score boundaries (0, 40, 70, 100), tip priority order.
- **Template gate tests:** free user cannot select `skills-first-visual`, `academic`, `timeline`; can select `skills-first` and `bold`.
- **Academic template nudge:** shown when switching to academic with zero custom sections; dismissible; "Add them" creates correct four sections.
