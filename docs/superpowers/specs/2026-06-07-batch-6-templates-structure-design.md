# Batch 6: Templates & Structure — Design Spec

**Date:** 2026-06-07  
**Batch theme:** Templates & Structure  
**Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, SQLite, PHPUnit 12

---

## Overview

Four features that expand resume template variety and give users structural control over their resume content.

1. **4 New PDF Templates** — expand from 8 to 12 templates (`two-column`, `compact`, `bold`, `academic`)
2. **Section Reordering** — drag-and-drop section order in editor, persisted as JSON, respected in PDF
3. **Custom Sections** — user-defined sections with title + bullets in PDF and editor
4. **Resume Completion Progress Bar** — server-computed score (0–100) shown as progress bar in editor header, drives engagement

---

## Feature 1: 4 New PDF Templates

### Goal
Expand from 8 to 12 PDF templates. Competitors offer 18–40 templates; 12 is a meaningful step toward parity.

### New Templates

| Key | Description |
|-----|-------------|
| `two-column` | Left sidebar for contact/skills/education; right main column for summary + experience. Classic two-panel layout. |
| `compact` | Dense single-page format, slightly smaller type, tighter margins. Ideal for experienced candidates with a lot to fit. |
| `bold` | Large color-block header with name in white text over accent color; clean body. High visual impact. |
| `academic` | Traditional academic CV style: wide margins, serif-friendly, publication-ready ordering (summary → education → experience → skills). |

### Backend

**`resources/views/resume-pdf.blade.php`** — add 4 new `@elseif ($template === '...')` blocks, each fully self-contained. Follow existing template blocks (sidebar, creative, etc.) as pattern reference.

**No migration needed** — `template` column already exists as a string; any value is valid.

**`app/Http/Controllers/ResumeBuilderController.php`** — `edit()` already passes `templates` array prop. Add 4 new entries to that array.

**`resources/js/Pages/ResumeBuilder/Edit.tsx`** — add the 4 new templates to the `TEMPLATES` constant with name and description.

### Test

**No new PHP test needed** — existing `ResumeBuilderTest` already validates template switching. Add 1 test asserting that all 12 template keys are present in the `edit` page props.

---

## Feature 2: Section Reordering

### Goal
Let users drag sections into their preferred order. The order is stored as a JSON array on the resume and the PDF renders sections in that order.

### Default section order

`['summary', 'experience', 'education', 'skills', 'certifications', 'custom']`

### Backend

**Migration:** `section_order` — nullable JSON column on `resumes`. Default: null (= default order above).

**`app/Models/Resume.php`** — cast `section_order` to `array`.

**`app/Http/Controllers/ResumeBuilderController.php`** — `edit()` passes `sectionOrder` (resolved from `$resume->section_order ?? ['summary', 'experience', 'education', 'skills', 'certifications', 'custom']`) to `Edit.tsx`.

**Update endpoint** — the existing `PUT /builder/{resume}` already accepts all resume columns. Add `section_order` to the validation: `nullable|array` with values `in:summary,experience,education,skills,certifications,custom`. The `Resume` model cast handles serialization.

**`resources/views/resume-pdf.blade.php`** — add a `@php $sectionOrder = $resume->section_order ?? ['summary','experience','education','skills','certifications','custom']; @endphp` block and wrap each content section in `@if(in_array('summary', $sectionOrder))` guards, rendered in a loop matching the order.

### Frontend

**`resources/js/Pages/ResumeBuilder/Edit.tsx`**:
- `sectionOrder: string[]` prop
- Section labels map: `{ summary: 'Summary', experience: 'Experience', education: 'Education', skills: 'Skills', certifications: 'Certifications', custom: 'Custom' }`
- Drag-and-drop using native browser `draggable` attribute + `onDragStart` / `onDragOver` / `onDrop` events (no library)
- Drag handle (≡ icon) at the left of each section tab in the editor sidebar
- On drop: reorder the `sectionOrder` array → `router.put(route('builder.update', resume.id), { section_order: newOrder })` preserving scroll
- Sections in the editor already render top-to-bottom; reorder them in the rendered section list too

### Tests

**`tests/Feature/SectionReorderTest.php`** — 3 tests:
1. PUT with `section_order` saves correctly
2. Section order defaults to null; page props resolve correct default
3. Invalid section key is rejected with 422

---

## Feature 3: Custom Sections

### Goal
Let users add completely free-form sections (e.g. "Publications", "Volunteer Work", "Awards") with a title and bullet items. Stored in `custom_sections` JSON column.

### Data Shape

```json
[
  {
    "id": "uuid-v4",
    "title": "Publications",
    "items": [
      { "id": "uuid-v4", "text": "Smith et al. (2024). Journal of..." }
    ]
  }
]
```

### Backend

**Migration:** `custom_sections` — nullable JSON column on `resumes`.

**`app/Models/Resume.php`** — cast `custom_sections` to `array`.

**Update endpoint** — existing `PUT /builder/{resume}` accepts `custom_sections` as `nullable|array`. Each element: `title` string max 100, `items` array of objects with `text` string max 500.

**`resources/views/resume-pdf.blade.php`** — after the certifications block, render each custom section (ordered by position in array) when `section_order` includes `'custom'`. Each section: title in section-header style, then bullets.

### Frontend

**`resources/js/Pages/ResumeBuilder/Edit.tsx`**:
- `customSections: CustomSection[]` state (from `resume.custom_sections ?? []`)
- "Custom Sections" panel below Certifications (shown when `'custom'` is in `sectionOrder` or as its own always-visible section)
- "Add Section" button → adds new `{ id: uuid(), title: '', items: [] }` entry to state
- Each section: editable title input + bullet list (same add/remove pattern as Experience bullets)
- Remove section button (×)
- `onBlur` on title and each item → `router.put(...)` with updated `custom_sections`

**`resources/js/types/index.d.ts`**:
```typescript
export interface CustomSection {
    id: string;
    title: string;
    items: { id: string; text: string }[];
}
```

### Tests

**`tests/Feature/CustomSectionTest.php`** — 3 tests:
1. PUT with valid `custom_sections` saves correctly
2. Invalid structure (missing title) returns 422
3. Non-owner cannot update (403)

---

## Feature 4: Resume Completion Progress Bar

### Goal
Show a 0–100 completion score in the editor header to motivate users to fill in more fields. A fully completed resume is more likely to get results.

### Scoring Algorithm (server-side, in `ResumeBuilderController@edit`)

| Section | Points |
|---------|--------|
| Contact: name present | 5 |
| Contact: email present | 5 |
| Contact: phone present | 5 |
| Contact: location present | 5 |
| Contact: title/role present | 5 |
| Summary filled (≥ 50 chars) | 20 |
| At least 1 experience entry | 15 |
| At least 1 education entry | 15 |
| At least 1 skill | 10 |
| Photo uploaded (sidebar/creative/executive templates) | 5 |
| **Total** | **90** (extra 10 = bonus for completeness if custom section added) |

Compute as `min(100, score)`. Pass as `completionScore: int` prop to `Edit.tsx`.

**No new endpoint needed** — computed inline in `edit()`.

### Frontend

**`resources/js/Pages/ResumeBuilder/Edit.tsx`**:
- `completionScore: number` prop
- Thin progress bar directly below the editor toolbar (full width of the left panel)
- Color: red < 40, amber 40–69, green ≥ 70
- Tooltip on hover: "Resume {score}% complete"
- Score label: "72% complete" in small text next to the bar
- Recalculate score on each successful save (re-fetch via `router.reload({ only: ['completionScore'] })`)

### Tests

**`tests/Feature/CompletionScoreTest.php`** — 3 tests:
1. Empty resume returns score 0
2. Fully filled resume (contact + summary + experience + education + skills) returns ≥ 60
3. `completionScore` is present in edit page props

---

## Test Summary

| Feature | New Tests | Total New |
|---|---|---|
| New Templates | 1 | 1 |
| Section Reordering | 3 | 3 |
| Custom Sections | 3 | 3 |
| Completion Score | 3 | 3 |
| **Total** | | **10** |

Starting count: 470 tests. Target: 480+ tests.

---

## Tier Gates Summary

| Feature | Free | Starter | Pro |
|---|---|---|---|
| 4 New Templates | ✓ (all 12) | ✓ | ✓ |
| Section Reordering | ✓ | ✓ | ✓ |
| Custom Sections | ✓ | ✓ | ✓ |
| Completion Score | ✓ | ✓ | ✓ |

All features in Batch 6 are free for all tiers — they deepen product quality rather than drive tier conversions.
