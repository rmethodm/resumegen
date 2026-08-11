---
name: applying-design-md-theme
description: Applies a DESIGN.md brand system to this app by remapping the CSS variable token spine — color ramps, light/dark semantics, radii, fonts — in resources/css/app.css, tailwind.config.js, and resources/views/app.blade.php, keeping the existing layout and components. Use when the user says "I have a new DESIGN.md, modify this app to use it", "change the theme based on the DESIGN.md file", "the DESIGN.md has changed, reapply the new theme", or otherwise asks to apply, reapply, or swap the app theme from a design doc.
---

# Applying a DESIGN.md Theme

Applying DESIGN.md is a token remap, not a rebuild. The app already has a CSS variable spine that every component reads; change the values, not the structure.

## Steps

1. Confirm scope before editing. Default to a token swap only: remap the existing variable spine (color ramps, light/dark semantics, radii, type) and keep current components, layouts, and light/dark behavior intact. Ask before restyling components (button caps, glow CTAs, mascots, hero textures) or touching public/marketing pages — those are separate, larger scopes.
2. Read `DESIGN.md` and the three files that hold the token spine before changing anything:
   - `resources/css/app.css` — primitives (gray/accent ramps as RGB triplets), radii, and the semantic layers for `:root`, `@media (prefers-color-scheme: dark) :root:not(.dark)`, and `.dark`.
   - `tailwind.config.js` — `theme.extend.fontFamily` and the `rgb(var(--x) / <alpha-value>)` color mappings.
   - `resources/views/app.blade.php` — the `fonts.bunny.net` stylesheet link.
3. Remap the primitive ramps in `app.css` to DESIGN.md's actual hex values, anchoring each end of the ramp on a real DESIGN color. Keep the RGB-triplet format (no `rgb()` wrapper) so Tailwind's alpha modifiers keep working.
4. Repoint the semantic tokens (surface stack, text, borders, focus ring) at the remapped ramps. Edit **all three** blocks — `:root`, the `prefers-color-scheme: dark` block, and `.dark` — with the same dark-canvas mapping; changing only one leaves dark mode inconsistent.
5. Update the radii primitives to DESIGN.md's `rounded` scale, and note in a comment any step DESIGN.md has no opinion on that you left as-is.
6. Swap fonts in both places: the `fontFamily` entries in `tailwind.config.js` and the matching `fonts.bunny.net` `<link>` in `app.blade.php`. A font changed in only one place silently falls back.
7. Leave tokens DESIGN.md is silent about (e.g. status success/warning/error/info colors) unchanged, and say so in the report.

## Verify

- Run `npm run build` and confirm it succeeds — the CSS variables and Tailwind config must compile together.
- Re-read the diff: every change should be a token value, a font name, or a comment. Markup or layout edits mean the scope slipped.
- Report which ramps, semantic layers, radii, and fonts were remapped, and which tokens were deliberately left alone.
