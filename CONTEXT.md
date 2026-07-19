# Resumegen Context

## Current Task
Builder rework, complete but UNVERIFIED IN A BROWSER (2026-07-19). Preview left, 300px section palette right,
editing drawer overlaying the preview, single pane below 1024px. `renderForm()` became a keyed `SECTIONS` registry;
`DraggableSection`, the tabbed panel, resize handle, and collapse-to-`w-14` are gone. New: `SectionPalette.tsx`,
`SectionDrawer.tsx`. Six commits `ebfc933..5e2ea61`. Spec + plan in `docs/superpowers/{specs,plans}/2026-07-19-*`.
tsc/build/pint clean, 474 tests pass. Branch kept as-is — not merged, 10 commits unpushed.

## Key Decisions
- Preview-left only coheres if the right side is a palette, not a form — half-committing is the worst case.
  Research: every mainstream builder (Zety, Resume.io, Kickresume, Rezi, Teal, Overleaf) is form-left/preview-right;
  none ships preview-left-with-a-form. We took the bet knowingly. See the spec for the full rationale.
- The drawer occludes the preview while typing, deliberately. "Document-primary" describes the RESTING state.
  No backdrop, no click-outside-to-close — a backdrop would dim the preview this layout exists to keep prominent.
- No JS test runner exists here by design. Registry completeness is a `Record<SectionKey, SectionEntry>` type
  constraint, not a runtime test. Adding vitest/jest is a separate decision requiring approval.

## Next Steps
1. **Click through the builder in a browser.** No agent had a driver; every visual claim rests on static reasoning.
   This is the only gate left on the builder work.
2. **Split this branch before it goes near main.** It is 24 commits / 62 files ahead, bundling /shares, photo
   removal, the 07-17 Skills experiment, job search, and the builder rework. They are independently mergeable.
3. Production .env needs `AI_ENABLED=true` + `AI_CAREER_COACH_ENABLED=false`; add deploy secrets
   `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`. Cover letters still have no route to `AiPrompts::coverLetter()`.
