# Design Tokens

Source of truth: `resources/css/app.css` (Tailwind v4 CSS-first `@theme` — no `tailwind.config.js`). Colors are sRGB hex/rgb throughout; OKLCH migration was considered and deliberately not forced (consistent sRGB beats a half-converted ramp).

## Layers

- **Primitives**: `--color-neutral-50…950`, `--color-accent-50…950` ramps.
- **Semantics**: `--color-ink / ink-muted / ink-faint` (text), `--color-surface / surface-border` (canvas), `--color-brand / brand-accent / brand-subtle / brand-soft` (accent, swappable via `html[data-brand-theme]`: default violet, navy, teal, copper), status trios `success / warning / danger` (base + `-subtle` + `-text`).
- **Component tokens**: none — deferred on purpose until a specific component needs one. Do not add speculatively.

## Categories

| Category | Tokens |
|---|---|
| Color | ramps + semantics above |
| Spacing | Tailwind v4 default `--spacing` scale (unmodified — intentional) |
| Radius | `--radius-sm` chips/small controls · `--radius-md` buttons/inputs/list items · `--radius-lg` cards/panels/modals · `--radius-xl` large surfaces · `rounded-full` pills |
| Shadow | `--shadow-card` (resting), `--shadow-ambient` (2-layer paper/elevated), `--shadow-shell` (inset highlight) |
| Typography | `--font-sans` IBM Plex Sans (body/UI), `--font-display` Source Serif 4 (display) |
| Motion | `--ease-soft`, `--transition-duration-soft` 320ms; global `prefers-reduced-motion` collapse in `app.css` |
| Z-index | `--z-index-base/raised/dropdown/sticky/modal-backdrop/modal/toast/tooltip` |

## Mode decision: light-only

The app is **light-only by decision** (declared via `color-scheme: light` on `html`). The `--color-surface-dark*` / `--color-ink-dark*` primitives are reserved for dark chrome accents inside light pages, not an app dark mode. If dark mode ever becomes a product decision, author it as a real reinterpretation (tinted near-black canvas, reduced accent chroma, border rings over shadows) — not an inversion — and revisit this file.

## Utilities

- `focus-ring` — shared keyboard focus ring (`focus-visible` only). Use on any plain interactive element not covered by `ui/button`.
- `tabular` — `tabular-nums` for scores/counts/currency columns.
