---
target: Workstation.tsx (resume editor)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-07T19-21-49Z
slug: resources-js-pages-resumes-workstation-tsx
---
Method: dual-agent (A: a88d0e2053bc77e95 · B: a6ad7add3675ab437; detector re-run in parent because B's harness had no Bash tool)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good save badges/offline banner, but default-collapsed sections hide document state at a glance |
| 2 | Match System / Real World | 4 | Resume-specific vocabulary and controls throughout |
| 3 | User Control and Freedom | 3 | Undo/redo + Escape-to-cancel rename exist, but no manual "save" affordance — trust delegated entirely to the debounce |
| 4 | Consistency and Standards | 3 | Mixed reorder patterns (drag-only desktop, arrow-only mobile); undiscoverable double-click-to-collapse |
| 5 | Error Prevention | 3 | Character counters, disabled Add buttons with reason text, live contact validation |
| 6 | Recognition Rather Than Recall | 2 | Default-collapsed sections + hidden notes/checkpoints toggle force recall over recognition |
| 7 | Flexibility and Efficiency | 3 | Alt+↑/↓ bullet reorder and "Paste many" are real wins; no keyboard path for desktop section/entry reorder |
| 8 | Aesthetic and Minimalist Design | 2 | Section rail is visually dense; pervasive 10-11px labels strain scanability |
| 9 | Error Recovery | 3 | `role="alert"`, contextual pills, retry/reload flow present |
| 10 | Help and Documentation | 1 | No onboarding, no first-run guidance, only a few `title` tooltips |
| **Total** | | **27/40** | **Acceptable — significant improvements needed** |

## Design Specificity Verdict

**LLM assessment**: Genuinely grounded in the resume domain, not a reskinned generic form builder. Evidence: the two-dropdown month/year date picker built to avoid a 1,032-option list while preserving unparseable legacy free text; `BulletsField`'s paste-many / strip-markdown-marker / Alt+↑↓-reorder trio built for the exact pain of copying bullets from a Word resume; per-template metric-compatible font substitution (Carlito↔Calibri, Caladea↔Cambria) documented against real PDF page-count drift; an export checklist that blocks download until ATS-risk items are resolved; skill-layout/bullet-style pickers rendered as visual thumbnails instead of dropdown label strings. This reads as authored for Resumegen specifically.

**Deterministic scan**: `detect.mjs --json` against Workstation.tsx, inspector-fields.tsx, inspector-sections.tsx, resume-preview.tsx, score-coach.tsx returned `[]` (exit 0) — no automated rule hits. The detector's rule set targets AI-slop visual patterns (gradient text, generic eyebrows, over-decoration); it is not tuned to catch the keyboard-access and ARIA gaps Assessment B found by manual read, so a clean detector run here should not be read as "no accessibility issues" — see manual findings below.

**Visual overlays**: Not available — no dev server/browser automation was exposed in this environment, so there is no live `[Human]`-tab overlay to point to. All findings below are static-code-read only.

## Overall Impression

The builder is well-crafted where it counts — the domain-specific inputs (bullets, dates, skills layout) and the trust-preserving autosave/export-checklist details are genuinely good work, not template filler. But the surface undersells itself on first (and every) load: every section starts collapsed, so a returning user re-opening a finished resume — exactly the "apply fast" workflow the product is built around — sees a wall of closed headers instead of their content. The single biggest opportunity is fixing the collapse default and de-cluttering the section rail, which would move several heuristic scores (1, 6, 8) up at once for very little code.

## What's Working

- **`BulletsField`** (`inspector-fields.tsx:441-731`) — paste-many, list-marker stripping, Alt+↑/↓ reorder, empty-row-collapses-to-`[]` on save. A crafted, resume-specific input, not a generic textarea list.
- **Autosave "showSaved" gating** (`Workstation.tsx:151-163`) — refuses to show "Saved" before a save round-trips. A subtle, deliberate trust-preserving detail most editors skip.
- **`ExportChecklistModal` + `jumpExportCheck`** (`Workstation.tsx:179-193`) — gates the highest-stakes action (download) with specific, jumpable fixes instead of a generic warning.
- No paywall/upgrade-CTA regression anywhere in this surface — consistent with the free/unlimited positioning in PRODUCT.md.

## Priority Issues

**[P1] Editor opens with every section collapsed, hiding all fields**
- Why it matters: `collapsedSections` seeds from `draft.section_order` on every mount (`Workstation.tsx:100-102`), so Contact through Certificates render closed on every load — first-time or returning. A first-timer (Jordan) sees zero visible fields on arrival; a returning user reusing a finished resume for a new application (Riley) has to reopen every section just to see what's there. This directly contradicts the "apply fast" workflow the product frames itself around, and it's the clearest miss against the career-changer audience PRODUCT.md says needs *more* structure, not more clicks before any content appears.
- Fix: default to expanded (or expand Contact + the next incomplete section only), and consider persisting per-section collapse state across mounts instead of resetting it every load.
- Suggested command: `/impeccable onboard` (first-run/empty-state default) or `/impeccable layout` if scoped as pure layout state.

**[P1] Section rail stacks 8+ widgets with no grouping, burying navigation**
- Why it matters: `SectionPanel` (`section-panel.tsx:159-301`) renders score gauge → 4-band breakdown → checklist → keyword chips → JD match → suggestions → section nav → add-section in one unbroken scrolling column with only thin `border-t` separators. The one block that actually lets a user navigate their document ("Resume sections") is buried after five other widgets — a cognitive-load chunking failure (fails the ≤4-items-per-group check) that hits Jordan hardest, since the audience needing more structure gets more simultaneous UI instead of less.
- Fix: collapse coaching/scoring into its own togglable block (the file already has a "Show notes & checkpoints" pattern to reuse), so section navigation is always first and visible.
- Suggested command: `/impeccable distill` or `/impeccable layout`.

**[P1] No keyboard path to reorder sections or entries on desktop**
- Why it matters: section reorder is native HTML5 drag-only above the `sm` breakpoint — the up/down arrow fallback is wrapped `sm:hidden` (`Workstation.tsx:546-586`). Entry reorder (Experience/Project/Education) is worse: the drag handle is a plain `<span draggable>` with `aria-label="Reorder {title}"` but no `tabIndex`, `role="button"`, or `onKeyDown` (`inspector-fields.tsx:362-371`) — unreachable by keyboard entirely, with no non-drag alternative (bullets have Alt+↑/↓; entries don't). A keyboard-only or screen-reader user cannot reorder resume sections or entries on a normal desktop viewport at all.
- Fix: keep arrow-button reorder visible at all breakpoints for sections; add an equivalent keyboard-operable reorder control (or Alt+↑/↓, matching the existing bullets pattern) for entry cards.
- Suggested command: `/impeccable adapt` or `/impeccable audit`.

**[P2] Export checklist modal has no Esc-to-close, focus trap, or initial focus**
- Why it matters: `ExportChecklistModal` (`export-checklist-modal.tsx:30-107`) is `role="dialog" aria-modal="true"` but has no keydown listener anywhere in the file, no focus management, and background content isn't `inert`/`aria-hidden` — Tab can cycle into elements behind the overlay while it's the ostensible modal focus, and there's no keyboard route to dismiss it short of clicking "Keep editing."
- Fix: add Esc-to-close, trap focus within the dialog, restore focus to the trigger on close.
- Suggested command: `/impeccable harden`.

**[P2] Autosave and error states aren't announced to assistive tech**
- Why it matters: "Saving…"/"Saved" badges (`workstation-header.tsx:153-170`) and the offline/error banner (`Workstation.tsx:616-663`) have no `aria-live`/`role="status"`/`role="alert"`, so a screen-reader user gets no announcement that edits persisted or that a save failed silently.
- Fix: wrap the save-status badge and the offline/error banner in an `aria-live="polite"` (status) / `role="alert"` (error) region.
- Suggested command: `/impeccable harden` or `/impeccable audit`.

## Persona Red Flags

**Jordan (career-changer / first-timer)**: Lands on the Edit tab and sees seven identical gray collapsed rows with no "start here" cue (`Workstation.tsx:468-606`). Simultaneously, the rail throws a score gauge, 4-band breakdown, "Raise your score" checklist, keyword chips, a JD-match panel, and a suggestions list at them before any content exists — this is the audience PRODUCT.md says needs *more* structure getting *more* simultaneous UI instead of less. No first-run state or tour distinguishes a brand-new blank resume from a fully built one; both render identically.

**Alex (impatient power user / multi-application job seeker)**: Genuinely served by Alt+↑/↓ bullet reorder and "Paste many" — real efficiency wins. But hits friction immediately: opening any resume presents collapsed sections requiring a click before typing a single character, and there's no visible manual-save affordance — has to trust a 1500ms debounce with no way to force it.

**Sam (accessibility-dependent)**: Cannot reorder sections or experience/project/education entries at all via keyboard (see P1 above); export checklist modal traps no focus and offers no keyboard dismiss; save/error state changes are silent to a screen reader.

## Minor Observations

- `Field`'s touched-on-blur error gating (`inspector-fields.tsx:151-208`) avoids red-flagging a half-typed email — good.
- `AddButton`'s `disabledReason` pattern (`inspector-fields.tsx:392-420`) consistently explains *why* a control is disabled rather than just graying it out, reused across Experience/Project/Education/Certificate.
- Section completion summaries ("2/3", "Complete", "Not started" — `section-panel.tsx:34-105`) are a strong, keep-as-is domain-specific detail.
- Skills layout picker offers 5 options in a `grid-cols-3` (`inspector-sections.tsx:811-844`), orphaning a lone card on the last row — a Hick's-Law-adjacent decision-point issue and a visibly unbalanced composition.
- Several icon-only buttons (remove bullet, remove entry, move-section arrows) are 28-32px square, under the ~44px touch-target guideline, on the very controls most likely to be tapped on mobile.
- No `prefers-reduced-motion` guard anywhere in the reviewed files for the save-spinner, chevron-rotate, or preview-zoom transitions.
- Small (10-11px) `text-gray-400`/`text-gray-500` state labels are a plausible contrast risk — flagged, not confirmed (no live render available to measure).

## Questions to Consider

1. Is the all-sections-collapsed default an intentional progressive-disclosure choice, or a leftover from seeding `collapsedSections` off `draft.section_order` instead of `[]`? The code elsewhere (explicit un-collapse on section-nav jump) reads like collapsed was meant to be the exception, not the default.
2. The section rail does five distinct jobs — scoring, coaching, keyword matching, JD matching, navigation — in one continuous scroll. How far does a user actually have to scroll before reaching "Resume sections," the block that lets them get to their content?
3. PRODUCT.md frames career-changers as needing more structure — where does that show up today? Nothing currently distinguishes a blank resume's first render from a finished one.
