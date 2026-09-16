# Design Tokens

Source of truth: `resources/css/app.css` (Tailwind v4 CSS-first `@theme` — no `tailwind.config.js`). Visual tokens follow root `DESIGN.md` (**Flat Design Corporativo**): corporate blue accent, dark-grey ink, light-grey page surface, Lato type, 4/8/12px radius. Colors are sRGB hex/rgb throughout.

## Layers

- **Primitives**: `--color-neutral-50…950` (Bootstrap-adjacent greys; `#343a40` ink, never `#000`), `--color-accent-50…950` (corporate blue around `#007bff`).
- **Semantics**: `--color-ink / ink-muted / ink-faint`, `--color-surface / surface-border` (page `#f8f9fa`, borders `#dee2e6`), `--color-brand*` (blue CTA), chromatic `success` / `warning` / `danger` / `info`.
- **Component tokens**: shared radius + shadows; primary button uses `rounded-sm` (4px) per DESIGN.md.

## Accent (from DESIGN.md)

> **Superseded 2026-09-16:** app-wide shadcn/ui conversion replaced this token
> layer with shadcn's stock `radix-nova`/neutral theme (see
> `docs/superpowers/specs/2026-09-16-shadcn-conversion-design.md`). Left here
> for history only.

| Role | Token | Value |
|---|---|---|
| Brand / CTA | `--brand-rgb` / `accent-500` | `#007BFF` |
| Hover (~8% darken) | `--brand-accent-rgb` / `accent-600` | `#0071EB` |
| Tint fill | `--brand-subtle-rgb` | `#E7F1FF` |
| Deep solid | `--brand-soft-rgb` / `accent-700` | `#0056B3` |
| Ink | `--color-ink` | `#343A40` |
| Page surface | `--surface-rgb` | `#F8F9FA` |
| Card / light surface | white (`#FFFFFF`) via utilities | |
| Success / Warning / Danger / Info | semantic tokens | `#28A745` / `#FFC107` / `#DC3545` / `#17A2B8` |

**Budget:** one brand accent for CTA, focus, active chrome, links. Success/warning/danger are semantic only — not decorative.

## Categories

| Category | Tokens |
|---|---|
| Color | ramps + semantics above |
| Spacing | Tailwind v4 default `--spacing` scale (unmodified — intentional) |
| Radius | `--radius-sm` 4px · `--radius-md` 8px · `--radius-lg` 12px · `--radius-xl` 16px · `rounded-full` pills |
| Shadow | `--shadow-card` `0 2px 12px /0.06` · `--shadow-ambient` `0 2px 8px /0.08` · `--shadow-shell` inset |
| Typography | `--font-sans` / `--font-display` Lato; `--font-mono` JetBrains Mono |
| Motion | `--ease-soft`, `--transition-duration-soft` 320ms; `prefers-reduced-motion` collapse |
| Z-index | Existing product ladder left unchanged (avoids stacking regressions) |

## Mode decision: light-only

DESIGN.md: Light ✓ / Dark ✗. Product chrome stays `color-scheme: light`.

## Utilities

- `focus-ring` — shared keyboard focus ring (`focus-visible` only).
- `tabular` — `tabular-nums` for scores/counts/currency columns.
