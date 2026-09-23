---
name: resetting-design-md-theme
description: Replaces DESIGN.md with a user-supplied token spec and then applies that theme across the whole app, not just the doc. Use when the user pastes a design spec (frontmatter with colors/typography/rounded/spacing plus an Overview) and says "complete reset of the color theme and style for the entire app", "replace the current DESIGN.md file and then enable it", "use this to replace DESIGN.md and apply it", or otherwise asks for a full theme reset from a pasted brand or design system.
---

# Resetting the App Theme from a Supplied DESIGN.md Spec

"Replace DESIGN.md and then enable it" is two jobs. Writing the doc is half; the theme is not reset until the app renders it.

## Steps

1. Overwrite `DESIGN.md` with the supplied spec verbatim — full replacement, not a merge with the previous theme. Do not keep sections of the old design system that the new spec does not mention.
2. Apply the new spec by remapping the token spine, following the `applying-design-md-theme` skill. Touch only these files:
   - `resources/css/app.css` — primitive ramps (RGB triplets), radii, and the semantic layers in `:root`, `@media (prefers-color-scheme: dark) :root:not(.dark)`, and `.dark`.
   - `tailwind.config.js` — `theme.extend.fontFamily` and the `rgb(var(--x) / <alpha-value>)` color mappings.
   - `resources/views/app.blade.php` — the `fonts.bunny.net` stylesheet link.
3. Anchor each remapped ramp on real hex/oklch values from the spec, keeping the RGB-triplet format so Tailwind alpha modifiers keep working.
4. Edit all three semantic blocks with the same mapping. Changing only `:root` leaves dark mode on the old theme.
5. Swap fonts in both places — the `fontFamily` entries and the matching webfont `<link>`. A font changed in one place silently falls back. If the spec names a system font with no webfont (e.g. Helvetica Neue), drop its webfont link and say so in a comment rather than loading a substitute.
6. Leave tokens the spec is silent about (status success/warning/danger, shadows, unused radius steps) unchanged.
7. Run `npm run build` and confirm it passes.

## Verify

- `DESIGN.md` matches the supplied spec with no leftovers from the previous theme.
- The diff contains token values, font names, and comments — markup or layout edits mean the scope slipped.
- `npm run build` succeeds.
- Report which ramps, semantic layers, radii, and fonts were remapped, and which tokens were deliberately left alone.
