# Builder Experiment: Preview-Left / Skills-in-Panel

**Date:** 2026-07-17
**Status:** Approved design — pending plan
**Scope:** Single file — `resources/js/Pages/ResumeBuilder/Edit.tsx`

## Goal

Spike a new builder layout paradigm: **live preview on the left, data entry in the
right panel.** Piloted with only the **Skills** section, gated behind an in-builder
toggle so the normal editor is never lost.

## Motivation

Today the builder is **form-left / preview-in-a-right-tab**. We want to feel out the
inverse — preview always visible on the left, editing done in the right panel — before
committing to migrating every section. Skills is the pilot section.

## Behavior

### Toggle
- A `Normal | ⭐ Experiment` control in the builder's top toolbar.
- Backed by plain `useState(false)`. **Not persisted** — a page reload returns to Normal.
  (Deliberate; it's a spike. Persisting via localStorage is a later ask, not now.)

### Experiment ON
- **Left pane:** the existing live-preview iframe — reuses the current double-buffered
  `freshPdfSrc` + `refreshPreview()` machinery unchanged.
- **Right panel:** the Skills editor only. No tab bar (preview already lives on the left,
  so a Preview tab is redundant; Design/Optimize/Share are out of scope for this spike).
- The normal left form column and the `RIGHT_TABS` panel are hidden.

### Experiment OFF
- Today's UI, unchanged.

## Implementation notes

- The Skills editor JSX currently lives inline inside the left form's `DraggableSection`
  (~line 994 of `Edit.tsx`). Extract it into a single local `renderSkillsEditor()` and
  call it from both the normal form and the experiment's right panel — no duplication.
- Saves are unchanged: Skills already saves on `onBlur → router.put`. Verify (do not
  rebuild) that the save path calls `refreshPreview()` so the left preview updates after
  each edit while in experiment mode.

## Non-goals / scope guards

- No new route, controller, DB column, or dependency.
- No change to the save endpoint or the preview endpoint.
- No other section moves; only Skills is exercised.
- No migration of the whole form — that's a future decision informed by this spike.

## Testing

Client-only layout state — PHPUnit can't meaningfully exercise a React toggle. The Skills
**save** path is untouched and already covered by existing builder tests. Verification is:
existing skills-save test stays green + a manual visual check of the toggle. No new
automated test earns its keep here; this is flagged intentionally rather than hidden.
