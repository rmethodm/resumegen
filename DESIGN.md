---
name: Resumegen
description: A calm, editorial resume builder — warm cream surfaces with a single burnt-orange accent.
colors:
  cream-50: "rgb(250 246 240)"
  cream-100: "rgb(245 239 229)"
  cream-200: "rgb(228 219 203)"
  cream-300: "rgb(217 206 188)"
  cream-400: "rgb(201 191 172)"
  cream-500: "rgb(138 129 114)"
  cream-600: "rgb(107 98 85)"
  cream-700: "rgb(74 68 54)"
  cream-800: "rgb(52 47 38)"
  cream-900: "rgb(43 38 32)"
  cream-950: "rgb(26 23 18)"
  accent-400: "rgb(227 138 99)"
  accent-500: "rgb(193 80 46)"
  accent-600: "rgb(168 63 34)"
  accent-700: "rgb(138 51 25)"
  success-text: "rgb(122 143 63)"
  warning-text: "rgb(212 162 76)"
  error-text: "rgb(178 59 44)"
  info-text: "rgb(91 122 158)"
typography:
  body:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    letterSpacing: "0.1em"
rounded:
  sm: "2px"
  md: "6px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent-500}"
    textColor: "rgb(250 246 240)"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.accent-600}"
  button-secondary:
    backgroundColor: "{colors.cream-100}"
    textColor: "{colors.cream-900}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "rgb(253 251 247)"
    textColor: "{colors.cream-900}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cream-600}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System: Resumegen

## Overview

**Creative North Star: "The Calm Career Coach"**

Resumegen reads as an unhurried writing tool rather than a marketing surface — the same intent as before, on a warmer register. Cream does the load-bearing work everywhere — page canvas, card surfaces, borders, and body text all live on a single warm-neutral ramp (`--cream-50` through `--cream-950`) — and burnt orange (`--accent-500`, #c1502e) is spent only where it earns attention: the primary action, focus rings, active nav state, and links. Nothing else competes with it. Dark mode is not an inverted palette; it's the same semantic roles (surface, text, border, accent, status) remapped to darker primitives, so a component styled in tokens never needs a dark-mode-specific class.

The system has no atmospheric imagery, no gradients, no decorative color. Cards and panels sit flat with a 1px border and a very light `shadow-sm`; in dark mode shadows disappear entirely and are replaced by hairline rings, since a black shadow is invisible on a near-black surface. This is a tool people use for 20+ minutes writing bullet points — the interface is deliberately quiet so the resume content stays the visual focus. The shift from gray to cream leans the whole system toward paper and print rather than software chrome — closer to a manuscript than a dashboard.

**Key Characteristics:**
- Single accent color (burnt orange `--accent-500`) reserved for primary actions, focus states, and active/selected UI — everything else stays warm neutral
- Flat surfaces with hairline borders (`--color-border-*`); shadows are a light `shadow-sm` at rest, not a design feature
- Radius varies deliberately by role, not a single global radius: 6px for buttons/inputs/chips, 10px for cards, 14px for modals
- Dark mode remaps semantic tokens only — primitives (the cream/accent ramps) never change, so the same component code renders correctly in both themes
- IBM Plex Sans throughout; no secondary/mono typeface in the product UI
- Status colors (success/warning/error/info) follow the same bg/text/border three-token pattern as every other semantic color group, tuned warmer to sit comfortably next to the accent

## Colors

The palette is almost entirely warm neutral cream, with burnt orange used sparingly as the single accent.

### Primary
- **Resumegen Orange** (`--accent-500`, rgb(193 80 46) / #c1502e): The one accent color in the system. Used for primary button fill, focus rings (`--color-border-focus`), active section-nav indicator, links (`--color-accent-text`), and progress-bar fills. Hover/active states step down the same ramp (`--accent-600` #a83f22, `--accent-700` #8a3319) rather than lightening.

### Neutral
- **Canvas Cream** (`--cream-50`, rgb(250 246 240)): Page background (light mode).
- **Raised Cream** (`--cream-100`, rgb(245 239 229)): Secondary panel backgrounds, hover states on ghost buttons.
- **Sunken Cream** (`--cream-200`, rgb(228 219 203)): Pressed/selected row backgrounds, track backgrounds for progress bars.
- **Border Cream** (`--cream-300`, rgb(217 206 188)): Default border color for cards and inputs.
- **Ink** (`--cream-900`, rgb(43 38 32)): Primary text.
- **Umber** (`--cream-600`, rgb(107 98 85)): Secondary text, metadata, helper copy.
- **Faint Cream** (`--cream-400`, rgb(201 191 172)): Tertiary text, disabled labels, placeholder copy.

### Semantic Status
- **Success** (text rgb(122 143 63), sage green): confirmation states, completed-checklist items.
- **Warning** (text rgb(212 162 76), gold): caution states, incomplete-but-not-broken states.
- **Error** (text rgb(178 59 44), brick red): validation errors, destructive-action confirmation.
- **Info** (text rgb(91 122 158), muted slate blue): neutral informational callouts.

Each status color follows the same three-token pattern: a light background tint, a saturated text/icon color, and a border tone one step darker than the background — light and dark mode both honor this shape, only the literal values differ. All four were re-tuned from the original cool set so none of them read as a second accent next to the burnt orange — error in particular was pulled toward brick rather than a pure cool red, since a fire-engine red next to orange reads as one hot cluster instead of two distinct signals.

### Named Rules
**The One Accent Rule.** Orange appears only on the primary action, focus rings, active states, and links. If a second saturated color shows up on a static surface (a card background, a decorative panel), that's a drift from the system, not a new brand color.

## Typography

**Body Font:** IBM Plex Sans (with ui-sans-serif, system-ui fallback)

**Character:** A single, no-nonsense grotesque carries every weight of the interface — no serif, no mono, no display face. Hierarchy comes from size and weight (12–14px UI text, uppercase micro-labels at 500 weight), not from typeface switching.

### Hierarchy
- **Body** (400, 14px / text-sm, 1.5 line-height): Primary UI copy — labels, buttons, body text in cards.
- **Label** (500, 11px / text-[11px], uppercase, 0.1em tracking): Section headers inside panels ("Resume sections", "Score & coaching").
- **Caption** (400, 10–12px / text-[10px]–text-xs): Metadata, helper text, secondary numbers next to a primary value.

### Named Rules
**The No-Third-Face Rule.** IBM Plex Sans handles every text role, including numeric/tabular data (`tabular-nums` utility, not a mono swap). Introducing a monospace or serif face anywhere in the product UI is a system violation.

## Layout

Panels are built from a consistent card unit: `rounded-lg border border-border-default bg-surface-card p-4 shadow-sm`, stacked vertically with `gap-4`. The Workstation rail (`SectionPanel`) is a fixed `260px` column on large screens that scrolls independently (`overflow-y-auto`) from the main content; below `lg` it becomes a full-width stacked block. Spacing inside panels is tight and functional — `gap-1`/`gap-1.5` between list rows, `p-4` card padding, `mt-2`–`mt-4` between grouped sub-sections — there is no generous marketing whitespace anywhere in the builder.

## Elevation & Depth

The system is flat by default. A single `shadow-sm` (light mode: `0 1px 2px rgb(26 23 18 / 0.05)`) sits under every card and button — barely perceptible, more a separation cue than a lift. There is no elevation scale beyond sm/md/lg/xl, and higher levels (`shadow-lg`, `shadow-xl`) are reserved for modals and dropdowns, not resting cards.

### Shadow Vocabulary
- **sm** (`0 1px 2px rgb(26 23 18 / 0.05)`): Resting cards, buttons, panels — the default and most common shadow in the app.
- **md** (`0 4px 6px rgb(26 23 18 / 0.07), 0 1px 3px rgb(26 23 18 / 0.06)`): Hover-elevated or slightly emphasized cards.
- **lg / xl**: Dropdowns and modals only.

### Named Rules
**The Ring-Not-Shadow Rule.** In dark mode, every shadow token becomes a 1px hairline ring (`0 0 0 1px rgb(var(--color-border-*))`) instead of a darker shadow — a black shadow on a near-black surface is invisible, so depth in dark mode is communicated by a border, not a glow.

## Shapes

Radius is role-based, not uniform: `--radius-md` (6px) for buttons, inputs, and chips; `--radius-lg` (10px) for cards; `--radius-xl` (14px) for modals; `--radius-full` for pills/avatars/badges where used. There is no `rounded-sm` (2px) usage in the primary UI — that step exists for edge cases only. Borders are 1px and hairline-weight throughout (`--color-border-subtle/default/strong`), never heavier.

## Components

Buttons, cards, and inputs are precise and restrained: flat fills, hairline borders, a light shadow at rest, and state changes communicated through a one-step-darker background rather than scale or shadow growth.

### Buttons
- **Shape:** `rounded-md` (6px), heights `h-8`/`h-9`/`h-10` (sm/default/lg), icon buttons `size-11`.
- **Primary (`default`):** `bg-accent-bg` fill, cream-50 text, `shadow-sm`, hover steps to `accent-bg-hover` (one ramp step darker, not a lighten).
- **Secondary:** `bg-surface-raised`, primary text color, hover to `surface-sunken`.
- **Outline:** transparent-to-card background, `border-border-default`, hover to `surface-raised`.
- **Ghost:** no background at rest, secondary text color, hover adds `surface-raised` background + promotes text to primary.
- **Link:** no background ever, `accent-text` color, underline only appears on hover.
- **Destructive:** `bg-red-600` (raw Tailwind red, not a token — the only button variant not on the semantic status ramp; kept deliberately cooler than the warm error token so a destructive action still reads as distinct from the accent family).

### Cards / Containers
- **Corner Style:** `rounded-lg` (10px).
- **Background:** `bg-surface-card` (rgb(253 251 247) in light mode, `cream-800` in dark).
- **Shadow Strategy:** `shadow-sm` at rest; see Elevation.
- **Border:** 1px `border-border-default`.
- **Internal Padding:** `p-4` standard.

### Badges
- **Style:** `rounded-md`, `border`, compact `px-2 py-0.5`, `text-xs`.
- **Known drift:** `badge.tsx`'s variant colors (`bg-indigo-600`, `bg-gray-100`, `bg-red-600`) are raw Tailwind classes from the old palette, not the semantic accent/cream tokens the rest of the system now uses — worth migrating to `bg-accent-bg`/`bg-surface-raised`/etc. next time this file is touched, not treated as an intentional second palette.

### Inputs / Fields
- **Style:** `rounded-input` (maps to `--radius-md`, 6px), `border-border-default`.
- **Focus:** ring in `border-focus` (accent-500), matching the button focus-ring treatment for consistency.

## Do's and Don'ts

### Do:
- **Do** use `bg-accent-bg` / `text-accent-text` / `border-border-focus` (the semantic token classes) for anything accent-colored — never a raw `bg-orange-*` or `bg-amber-*` utility.
- **Do** keep shadows at `shadow-sm` for resting surfaces; reserve `shadow-lg`/`shadow-xl` for modals and dropdowns only.
- **Do** match radius to role — buttons/inputs at `md` (6px), cards at `lg` (10px), modals at `xl` (14px) — not a single radius everywhere.

### Don't:
- **Don't** introduce a second accent color. Burnt orange is the only saturated brand color; everything else is warm neutral or a status color.
- **Don't** hardcode cream/orange hex or raw Tailwind palette classes (`gray-100`, `orange-600`) in new components — use the semantic `surface-*`/`text-*`/`border-*`/`accent-*` classes so dark mode works automatically.
- **Don't** add decorative imagery, gradients, or illustration to product UI — that language belongs to the separate marketing site (`Welcome.tsx`), not the builder.
