# Skills Section Improvements

**Date:** 2026-06-10  
**Status:** Idea / Pending Design Approval

---

## Problem

The skills section currently stores a flat `string[]` and renders all skills inline (comma-separated) on the PDF. Users have no control over:

- Layout (separate lines, bullet points, two-column)
- Grouping (e.g. "Frontend", "Backend", "Tools")
- Text emphasis (bold for key skills)

---

## Research Summary

Leading resume builders (Resume.io, Novoresume, Teal, EnhancV) offer:

- **Grouped categories** — labeled blocks like "Languages: Python, Go / Tools: Docker, AWS"
- **Layout pickers** — inline commas, bullet list, or two-column grid
- **Proficiency indicators** — bars/stars (but ATS experts warn these are unreadable by parsers — avoid)
- **ATS consensus** — no bars/stars; use text groupings or simple bullet lists

---

## Proposed Approach: Option A + Light B (Recommended)

### Option A — Display layout picker (lowest effort, high impact)

Add a `skills_layout` setting per resume with values: `inline` (current default), `bullets`, `two-column`.

- No data model change needed
- TagInput UI stays the same
- PDF blade renders differently based on setting
- Addresses "separate lines" and "bullet points" requests immediately

### Option B (light) — Grouped categories

Skills data shape changes from `string[]` to `{ category: string, items: string[] }[]`.

- Users create named groups (e.g. "Frontend", "Backend", "Tools")
- Each group renders as a labeled block in the PDF
- Requires new editor UI and a data migration / backward-compat handling for existing flat arrays
- Most professional-looking output

### Option C — Bold per skill (deferred)

Each skill becomes `{ name: string, bold?: boolean }`. Allows highlighting key skills.  
Deferred until it's clear whether bold is needed broadly (summary, experience) or just skills.

---

## Open Questions

1. **Bold scope** — Is bold needed only in skills, or broadly across summary/experience text too? If broadly, this becomes a rich-text editing feature (much larger scope).
2. **Data migration** — Existing `skills` arrays need to be handled gracefully when the shape changes to grouped objects.
3. **Template compatibility** — All 13 templates render skills; layout changes must be verified across each.

---

## Affected Files (estimated)

- `resources/js/Components/TagInput.tsx` — may need replacement or extension for grouped UI
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — layout picker UI, grouped skills editor
- `resources/views/resume-pdf.blade.php` — render logic for new layouts and groups
- `app/Http/Controllers/ResumeBuilderController.php` — validation for new skills shape
- `app/Http/Controllers/Api/ResumeController.php` — API validation
- Database migration if skills shape changes (JSON column, no schema change needed)
