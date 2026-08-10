---
name: applying-design-tokens-only
description: Applies a design doc, mockup, screenshot, or redesign as visual tokens only — colors, fonts, sizes — while preserving the existing layout, components, and copy. Use when the user asks to implement a design doc or mockup, restyle or redesign a page, apply a new look or theme, or swap a hero image or illustration, and whenever they say "I don't want to change any UI, just the colors/fonts/sizes", "keep as is", or "leave the boxes/graphs/info alone".
---

# Applying Design Tokens Only

A design import is a restyle, not a rewrite. Change what the design specifies visually; leave everything else exactly where it is.

## Steps

1. Ask questions before writing any code. Confirm which tokens are in scope (colors, fonts, sizes/spacing), which pages or components are in scope, and anything in the design doc you would otherwise have to guess. Do not start implementing until those answers come back.
2. Inventory the current surface before editing: the layout structure, the component tree, and the visible copy. That inventory is the preserve list.
3. Change only visual tokens — colors, fonts, font sizes, and sizing/spacing values. Prefer editing the token/theme layer (CSS variables, Tailwind config, shared classes) over rewriting component markup.
4. Do not change layout, component structure, or copy. Existing wording stays as is unless the user explicitly asks for new copy. "Redesign" is not permission to rewrite text or restructure the page.
5. When replacing a single visual asset (hero image, illustration, character), replace only that asset. Leave the surrounding boxes, stats, graphs, and related information exactly as they are — including their position and content.
6. If the design doc implies a structural change (a moved section, a different component, a new heading), stop and ask rather than implementing it as part of the restyle.

## Verify

- Diff the change: every edit should be a color, font, size, spacing, or asset swap. A markup restructure or a copy edit in the diff means the scope slipped.
- Confirm the same components, in the same order, with the same text as before the change.
- For asset swaps, confirm every surrounding panel (stats, graphs, info boxes) is untouched.
