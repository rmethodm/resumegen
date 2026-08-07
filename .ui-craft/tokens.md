# Design Tokens

Source of truth for live values: `resources/css/app.css` (CSS variables) + `tailwind.config.js` (Tailwind bridge).  
Encoding: **sRGB RGB triplets** (no `rgb()` wrapper) so Tailwind can use `rgb(var(--x) / <alpha-value>)` opacity modifiers.  
Last audited: 2026-08-07 via `/tokens` (status dark, radii/z/shadow, ramps, brand freeze).

## Layers

| Layer | Status | Where |
|-------|--------|--------|
| Primitive | Present | `:root` — gray/accent ramps, radius, shadow, motion, z-index |
| Semantic | Present | surface / text / border / accent / status + radius roles; dark remaps |
| Component | Deferred | Components use semantic or ramp classes directly |

## Colors

### Primitive ramps (also Tailwind `gray-*` / `accent-*`)

Neutral cool-ink ramp `--gray-50`…`--gray-950` and brand purple `--accent-50`…`--accent-950` in `app.css`.  
**Tailwind:** `bg-gray-100`, `text-accent-600`, `bg-accent-100`, etc. (project ramp, not stock Tailwind gray).

### Semantic — light (`:root`)

| Role | Token / class |
|------|----------------|
| Surfaces | `bg-surface-canvas` / `raised` / `card` / `overlay` / `sunken` / `inverse` |
| Text | `text-text-primary` / `secondary` / `tertiary` / `on-accent` / `on-inverse` |
| Borders | `border-border-subtle` / `default` / `strong` / `focus` |
| Accent fill | `bg-accent-bg` / `hover` / `active` |
| Accent **text** (links, active labels) | `text-accent-text` → accent-600 (dark: accent-300) |
| On solid accent | `text-text-on-accent` (white) — **not** `text-accent-text` |
| Status | `bg-success-bg`, `text-error-text`, `border-warning-border`, … |

### Semantic — dark

Surfaces, text, borders, accent fills, **status**, and **shadows** remapped in `.dark` and `prefers-color-scheme`.  
Status uses dark surfaces + lighter text/borders (not inverted pastels).  
Shadows become hairline rings (+ soft outer for lg/xl).

### Legacy (frozen — do not use in new UI)

| Token | Hex | Use instead |
|-------|-----|-------------|
| `brand` / `brand.DEFAULT` | `#5952d2` | `accent-bg` / `accent-500` |
| `brand.accent` / `.light` | `#3c3695` | `accent-bg-active` / `accent-700` |
| `brand.subtle` | `#e1e5ff` | `accent-100` |
| `surface.DEFAULT` | `#f2f6f9` | `surface-raised` |
| `surface.border` | `#d2d8dd` | `border-default` |
| `ink.DEFAULT` | `#171b1f` | `text-primary` |
| `ink.muted` / `.faint` | | `text-secondary` / `text-tertiary` |

Still defined in `tailwind.config.js` so old strings compile; product hot paths migrated off them 2026-08-07.

## Radius

| Token | Value | Tailwind |
|-------|-------|----------|
| `--radius-sm` | 2px | `rounded-sm` |
| `--radius-md` | 6px | `rounded-md` |
| `--radius-lg` | 10px | `rounded-lg` |
| `--radius-xl` | 14px | `rounded-xl` |
| `--radius-2xl` | 20px | `rounded-2xl` |
| `--radius-full` | pill | `rounded-full` |
| `--radius-input` / `button` / `card` / `modal` | role aliases | `rounded-input`, `rounded-button`, `rounded-card`, `rounded-modal` |

## Shadows / elevation

| Token | Light | Dark |
|-------|-------|------|
| `--shadow-sm`…`xl` | layered ambient + direct | border ring (+ soft outer on lg/xl) |

Tailwind: `shadow-sm` … `shadow-xl` → `var(--shadow-*)`.

## Z-index

| Token | Value | Tailwind |
|-------|------:|----------|
| `--z-base` | 0 | `z-base` |
| `--z-raised` | 1 | `z-raised` |
| `--z-sticky` | 20 | `z-sticky` |
| `--z-dropdown` | 30 | `z-dropdown` |
| `--z-modal-backdrop` | 40 | `z-modal-backdrop` |
| `--z-modal` | 50 | `z-modal` |
| `--z-toast` | 60 | `z-toast` |
| `--z-tooltip` | 70 | `z-tooltip` |

Shared chrome uses these (`Modal` → `z-modal`, menus → `z-dropdown`, sticky header → `z-sticky`).

## Motion

| Token | Value | Tailwind |
|-------|-------|----------|
| `--duration-instant` | 80ms | `duration-instant` |
| `--duration-fast` | 150ms | `duration-fast` |
| `--duration-normal` | 250ms | `duration-normal` |
| `--duration-slow` | 400ms | `duration-slow` |
| `--ease-out` / `in` / `in-out` | curves | `ease-out`, `ease-in`, `ease-in-out` |

Honor `prefers-reduced-motion` on non-trivial motion (not yet a CSS token).

## Typography

| Role | Value |
|------|--------|
| Body / UI | `IBM Plex Sans` via `font-sans` |
| Size / weight / leading | Tailwind defaults (no project CSS type scale yet) |
| Resume PDF fonts | `resources/css/resume-fonts.css` — product chrome stays IBM Plex |

## Spacing

No custom spacing tokens. Tailwind default 4px scale. Prefer even steps (`p-2`…`p-8`).

## Dark mode control

- `color-scheme: light dark` on `:root`
- Explicit toggle: `useDarkMode` → `.dark` on `<html>` (authenticated shell)
- Guest/auth: `@media (prefers-color-scheme: dark)` on `:root:not(.dark)`
- Tailwind `darkMode: 'class'`

## Known gaps

1. Component-layer tokens deferred until multi-theme/state pressure.
2. No project type-scale or spacing CSS vars (Tailwind defaults by choice).
3. `prefers-reduced-motion` not encoded as a token contract.
4. Residual raw hex / indigo in a few older corners — prefer semantic/ramp on touch.

## Rules for agents

1. Prefer semantic classes (`bg-surface-canvas`, `text-text-primary`, `bg-accent-bg`, `text-accent-text`) or ramps (`bg-accent-100`). **Never** `brand` / `ink` in new UI.
2. One accent: brand purple. No second brand hue.
3. `text-accent-text` = purple text; `text-text-on-accent` = white on purple fills.
4. Extend this file when CSS variables or `theme.extend` change.
5. Match `--color-*` semantic prefix; do not invent parallel names.
