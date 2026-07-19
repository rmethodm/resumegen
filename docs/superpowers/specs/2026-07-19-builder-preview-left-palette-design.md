# Builder Layout: Preview-Left, Palette-Right, Drawer Editing

**Date:** 2026-07-19
**Status:** Approved design — pending plan
**Scope:** `resources/js/Pages/ResumeBuilder/Edit.tsx` plus one new component
**Supersedes:** `2026-07-17-builder-preview-left-skills-panel-design.md` (the Skills-only spike that led here)

## Goal

Commit the builder to a **document-primary** layout: the rendered resume occupies the
left viewport at rest, a narrow tool palette sits on the right, and field editing happens
in a drawer that overlays the viewport one section at a time.

## Why, and why this is a deliberate break from convention

Market research (Zety, Resume.io, Kickresume, Rezi, Teal, Overleaf) found the two-pane
convention to be **universally form-left / preview-right**. No mainstream builder ships
preview-left with a form. Two findings shaped this design rather than overruling it:

1. **The real fork is two-pane vs. direct-manipulation.** The design-led tier (Enhancv,
   VisualCV, Canva) deleted the form pane entirely — you edit on the document itself, with
   a toolbar on top. Their palettes are small *because* the canvas is interactive.
2. **Editor-left is directionality-derived, not arbitrary.** Canva mirrors its panel to the
   right under RTL locales; cause-left/effect-right matches LTR reading order. Flipping it
   inverts that rationale rather than sidestepping it.

Preview-left is coherent in exactly one configuration: when the preview is the primary
artifact and the right side is a **palette, not a form**. Half-committing — preview left
with a long scrolling form on the right — gets the worst of both, and is the failure mode
this design exists to avoid.

## Constraint that bounds the whole design

The preview is a **dompdf-rendered PDF in an iframe** (CLAUDE.md decision #2: "No template
React components — server renders PDF"). It is non-interactive by construction. You cannot
click a bullet in the preview and type there without building a second React renderer and
maintaining two sources of visual truth.

Therefore **"document-primary" here means visually primary, not interactively primary.**
The document holds the eye; editing still happens in the panel. This is the Overleaf
position minus Overleaf's side convention. Stating it plainly so nobody later reads
"document-primary" as a promise of click-to-edit.

## Layout

```
┌──────────────────────────────┬────────┐
│  VIEWPORT (flex-1)           │ PALETTE│
│  PDF preview / plaintext /   │ (~280) │
│  JD-match — LAB_VIEWS        │        │
│                              │        │
│  ┌────────────────────────┐  │        │
│  │ DRAWER (overlays, ~60%)│  │        │
│  │ fields for one section │  │        │
│  └────────────────────────┘  │        │
└──────────────────────────────┴────────┘
```

### Viewport (left)

The existing lab column, unchanged in behavior. It already switches renderers via the
`LAB_VIEWS` registry (PDF preview, `PlainTextView`, `JdMatcher`). The only change: it is
visible on load rather than hidden, and it is the resting focus of the screen.

### Palette (right, fixed width)

The `<aside>` at `Edit.tsx:1236` stops being a container for the entire form. Today it is
`w-14 ↔ w-full` with a tab bar whose `sections` tab calls `renderForm()` inline. It becomes
a fixed-width palette holding:

- **Section list** — Contact, Summary, Experience, Education, Skills, and custom sections.
  Each is a button that opens the drawer. Each shows filled/empty state so the palette
  doubles as a completeness indicator.
- **Tool panels** — the existing `StrengthScorePanel`, `AtsMatchPanel`, and AI actions.
- **Share** — the active-link count and link to `/shares` (unchanged; share link management
  stays off the builder per CLAUDE.md).

The collapse-to-`w-14` affordance is dropped. A palette that is already narrow does not
need a collapsed state, and removing it deletes a layout permutation rather than adding one.

### Drawer (overlays the viewport)

New component `SectionDrawer`. One job: given a section key, render that section's fields in
an overlay panel positioned over the viewport, with a close button. It is a positioning
shell and a header — it owns no field logic.

## Required refactor: `renderForm()` must become per-section

`renderForm()` (`Edit.tsx:1021`) currently takes **no arguments and renders every section
in one pass**. The drawer needs one section at a time, so this is a real refactor, not a
call-site change.

Split it into a section registry — an array of `{ key, label, render }` entries — consumed by
two callers:

- the palette, which maps over it to build the section list
- the drawer, which looks up one entry by `openSection` and calls its `render`

This keeps a single source of truth for section identity, ordering, and labels, and means
adding a section touches one array. The per-section JSX moves out of the monolithic
`renderForm()` body but is not otherwise rewritten.

## State

One new piece of state: `openSection: string | null`.

- Palette button click sets it.
- Drawer close button and `Esc` set it to `null`.
- No URL or routing state. A resume section is not a place worth deep-linking to, and adding
  it would mean reconciling browser history with unsaved-field state for no user-visible gain.

`sidebarOpen` and `panelWidth` are removed along with the collapse affordance and the
resizable split.

## Save behavior — unchanged

`onBlur → router.put` stays exactly as-is. Closing the drawer requires no explicit save: the
last blur already fired the request. The preview's cache-busting `?t=<timestamp>` refresh on
save also stays, so closing the drawer reveals an already-current document.

This is the reason the accepted occlusion (below) works. The reveal-on-close is not a new
mechanism; it is the existing save→refresh cycle becoming visible at a natural moment.

## Accepted trade-off: the drawer occludes the preview

A drawer opening from the right covers the document while you type. Three resolutions were
considered:

| Option | Verdict |
|---|---|
| Sync preview scroll to the edited section | Rejected. PDF iframes give page-level granularity (`#page=N`) only — adequate for Experience, useless for a single bullet. Cost is high, payoff is partial. |
| Push the preview left instead of overlaying | Rejected. At 1440px the preview compresses to ~450px — pixels kept, legibility lost. |
| **Accept the occlusion** | **Chosen.** You do not need to see the document *while* typing a field, only right after. Closing the drawer is the reveal. |

**"Document-primary" therefore describes the resting state.** That is still a genuine
difference from a form-left layout — when your hands leave the keyboard, the resume is what
dominates the screen — and it costs nothing to build.

## Narrow screens

Below `1024px`, collapse to the universal pattern: viewport hidden, palette full-width,
drawer full-screen. Every product surveyed does some version of this; none tries to keep
both panes below ~900px. This is one media query and the existing `openSection` state, not
a second layout.

## Explicitly not building

- **No swap-sides toggle.** A call was made; a toggle would hide that it was made and double
  the layout states under test. (Visual Studio's Android Designer ships one; Overleaf
  deliberately does not, offering emphasis modes instead. We follow Overleaf.)
- **No scroll-sync** between drawer and preview — see the table above.
- **No click-into-the-preview editing** — blocked by the dompdf architecture, not by effort.
- **No persistence of `openSection`** across reloads. The builder opens on the document.

## Testing

The layout itself is not unit-testable in a way that encodes intent, but two things are:

1. **Section registry completeness** — a test asserting every section key in the registry has
   a label and a render function, and that the registry's key set matches the keys the builder
   reads off the resume prop. (There is no formal schema — the backend validates resume content
   as `nullable array` and the frontend owns the shape, so the registry *is* the contract.) This
   fails when someone adds a section to the data model and forgets the palette.
2. **Existing builder feature tests must stay green** — particularly any asserting save
   behavior on blur and the preview refresh. The refactor moves JSX between callers; if a
   save test breaks, the refactor changed behavior it was not supposed to touch.

No new backend tests: no routes, controllers, models, or migrations change.

## Reversibility

This is a bet with no market precedent, so the exit matters. The drawer is a positioning
shell around per-section render functions. Reverting to form-left means re-inlining those
renders into a single column and flipping one flex order — the section registry is useful
in either layout. That cheap exit is the main reason this is safe to try.

## Success criteria

- The builder loads with the rendered resume visible and dominant; no section drawer open.
- Every section reachable from the palette in one click; every field editable in the drawer.
- Saving still fires on blur; the preview reflects the change when the drawer closes.
- No horizontal scrolling at 1024px, 1280px, and 1440px.
- Below 1024px, exactly one pane is visible at a time.
