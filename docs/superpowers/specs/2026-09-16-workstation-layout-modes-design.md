# Workstation Layout Modes — Design

Date: 2026-09-16
Status: Approved for planning

## Problem

The Workstation (`resources/js/Pages/Resumes/Workstation.tsx`) has grown crowded:

- Header carries ~15 controls before the user touches the form: title/status
  badges, app chip, contact-error pill, Share, Download menu, "More" menu
  (rename/versions/duplicate/notes-toggle), then a second row of undo/redo,
  template picker, font/density/bullet-style/skills-layout dropdowns, zoom,
  the Edit/Optimize tab switch, and the react/pdf preview toggle.
- The **Optimize** tab is a full view switch: it replaces the form and
  preview entirely with `ScoreRingTrio`, `TargetRoleBar`, `OptimizePanel`
  (JD paste, keyword overlap, `OptimizeChecklist`, `AiCritiquePanel`,
  `AtsPlainTextBlock`). The user leaves the editing surface to see AI/score
  feedback, then must tab back to `Edit` to act on it.

Goal: let the user stay on the form throughout resume creation, including AI
actions and optimization, using the project's shadcn/ui primitives for
better screen use than the current full-tab-switch model.

## Decision

Rather than pick one replacement layout up front, ship **four selectable
layout modes** so the user can compare them live before committing to one.
The mode is a persisted user preference, not a per-resume setting.

## Persistence

- New column `users.workstation_layout` — `enum('tabs','overlay','inline','hybrid')
  default 'tabs'`. Migration follows the existing `users.theme` column
  pattern (same PR era, same table).
- `User` model: add to `$fillable` and an enum-like cast/validation, same
  shape as the existing theme field.
- New hook `resources/js/hooks/use-workstation-layout.ts`, mirroring
  `use-theme.ts` — optimistic local state, `router.patch` (or equivalent) to
  a small dedicated route, no coupling to the resume autosave payload
  (this is a user preference, not resume data).
- Backend: small controller action (or an addition to the existing
  `ProfileController`/theme route family) to persist the value. Exact route
  name decided during planning to match existing profile-route conventions.

## Switcher UI

- A `Select` (shadcn, already installed) added to `WorkstationFormatToolbar`
  in the same row as font/density/zoom, labeled "Layout":
  - Tabs (classic)
  - Overlay panel
  - Inline
  - Hybrid rail
- Visible to all users (not a dev-only toggle) per product decision — this
  is a live comparison tool, not a throwaway.
- Changing the value updates `use-workstation-layout` state immediately
  (optimistic) and persists in the background.

## Layout variants

All four variants reuse the same underlying components and data —
`ScoreRingTrio`, `TargetRoleBar`, `OptimizePanel` (JD textarea + keyword
overlap), `OptimizeChecklist`, `AiCritiquePanel`, `AtsPlainTextBlock`. No
change to AI critique logic, credit gating, or scoring math. Only the
container/placement of these pieces changes per mode.

### 1. Tabs (classic) — baseline, unchanged

Current behavior: `Edit` tab shows form + sticky preview; `Optimize` tab
replaces both with the score/JD/AI stack. This becomes the default value
for existing users (no migration-time behavior change).

### 2. Overlay

- The Edit view (form + preview, two-column grid) is always visible —
  no tab switch.
- A header button ("Optimize", badge showing suggestion count or score)
  opens a `Sheet` (shadcn, right side, wide) containing the full Optimize
  stack (`ScoreRingTrio`, `TargetRoleBar`, `OptimizePanel`,
  `AtsPlainTextBlock`).
- The form stays mounted behind the sheet — opening/closing it does not
  reset scroll position, section-collapse state, or draft edits.
- New component: `resources/js/Components/workstation/optimize-sheet.tsx`,
  a thin `Sheet` wrapper around the existing `OptimizePanel` composition.

### 3. Inline

- No tab switch. One continuous scrolling column.
- A condensed strip (mini `ScoreRingTrio` + `TargetRoleBar`) is pinned at
  the top of the form column.
- Each section `Card` in `renderFormSections()` renders any
  `AiReviewSuggestion` whose `.section` matches that section directly
  beneath its fields (as an `Alert`), using the existing
  `AiReviewSuggestion.section` field
  (`'contact'|'summary'|'experience'|'skills'|'education'`) — no new data
  needed.
- JD paste + keyword-overlap + `AtsPlainTextBlock` move into the existing
  "side tools" toggle pattern already used for Notes/Snapshots
  (`showSideTools` / `workstation-side-tools`), rather than duplicating a
  new disclosure mechanism.
- Live preview: kept as the sticky right column, same as today's Edit tab.

### 4. Hybrid rail

- Same two-column Edit-tab grid, but the right column (currently just the
  sticky live preview) becomes a stacked rail:
  - Top: compact score + top 3–5 AI suggestions (severity-sorted, reusing
    `sortBySeverity`), each clickable.
  - Bottom: the live preview, independently sticky/scrollable.
- Clicking a suggestion reuses the existing `jumpFromOptimize` /
  `scrollToSection` / `focusAndFlash` behavior to jump the form column to
  the relevant section.
- JD input relocated to a `Popover` (shadcn, already installed) triggered
  from a "Target job" button in the rail header, rather than a full-width
  textarea.
- New component: `resources/js/Components/workstation/optimize-rail.tsx`.

## Files touched

- `database/migrations/…_add_workstation_layout_to_users_table.php` (new)
- `app/Models/User.php` (fillable + cast)
- `resources/js/hooks/use-workstation-layout.ts` (new)
- `resources/js/Components/workstation/workstation-format-toolbar.tsx`
  (add Layout `Select`)
- `resources/js/Components/workstation/workstation-header.tsx` (thread the
  new prop through)
- `resources/js/Pages/Resumes/Workstation.tsx` (branch render by mode)
- `resources/js/Components/workstation/optimize-sheet.tsx` (new, Overlay)
- `resources/js/Components/workstation/optimize-rail.tsx` (new, Hybrid)
- `resources/js/Components/workstation/optimize-panel.tsx` — unchanged
  internally; reused by Tabs, Overlay, Inline
- `resources/js/Components/workstation/ai-critique-panel.tsx` — unchanged
- Backend profile route/controller for persisting the preference (exact
  file decided in planning, following existing theme-route convention)

## Out of scope

- No change to AI critique generation, credit gating, or scoring/keyword
  logic — only where results are displayed.
- No removal of any existing mode once shipped — this spec adds a
  preference, it does not replace the current Optimize tab behavior for
  users who keep "Tabs (classic)".
- Mobile-specific layout tuning for Inline/Hybrid is follow-up work if the
  chosen mode needs it; initial implementation targets desktop parity with
  the existing Edit/Optimize tabs and falls back gracefully (stacked,
  scrollable) on narrow viewports the same way the current grid does.

## Testing

- Component tests per new component (`optimize-sheet.test.tsx`,
  `optimize-rail.test.tsx`, `use-workstation-layout.test.ts`).
- Existing `Workstation.tsx`/`OptimizePanel` tests continue to pass for the
  `tabs` mode (default), unchanged.
- Live browser verification of all four modes after implementation, per
  project verification policy — not just component tests.
