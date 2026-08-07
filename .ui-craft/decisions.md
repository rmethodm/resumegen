# Design Decisions

<!-- Lazy-loaded — loaded only when a task requires prior rationale or decision reference.
     Append-only log. Never delete entries; mark superseded ones with a note.
     Format: ### YYYY-MM-DD — {title} followed by **Status**: accepted | rejected | tried -->

### 2026-08-07 — Radii, z-index, shadows + ramp bridge; brand frozen

**Status**: accepted

- CSS primitives for radius, shadow (dark → rings), z ladder, motion easings; Tailwind bridge (`rounded-*`, `shadow-*`, `z-modal`…).
- Gray/accent ramps exposed as Tailwind colors.
- `accent-text` = brand-colored text; `text-on-accent` = white on fills.
- Legacy `brand`/`ink` frozen; hot paths migrated to semantic/ramp classes.

### 2026-08-07 — Status colors remapped in dark

**Status**: accepted

Success/warning/error/info use dark surfaces + lighter text/borders under `.dark` and `prefers-color-scheme` (not inverted light pastels). Applied in both dark entry paths in `app.css`.

### 2026-08-07 — Score bars animate scaleX not width

**Status**: accepted

Rail score bands use `transform: scaleX` + `origin-left` instead of `transition-[width]` (layout thrash / detector Critical).

### 2026-08-07 — surface-card for non-modal elevated UI

**Status**: accepted

Static elevated surfaces use `bg-surface-card`, not `bg-surface-overlay`. Avoids false `modal-without-dialog` Criticals and keeps overlay language for real dismissible layers.

### 2026-08-07 — Destructive actions require confirm

**Status**: accepted

Delete/Remove controls use `window.confirm` with a local `onConfirm` binding (detector-safe). Empty bullets skip the prompt; named entities include the label in the message. Account delete remains password Modal.

### 2026-08-07 — Shared button focus contract

**Status**: accepted

Shared button primitives (`Primary` / `Secondary` / `Danger` / `ui/Button`) and nav/dropdown chrome use `focus-visible` rings with semantic tokens. `focus:ring` alone failed `ui-craft-detect` (`a11y/outline-none-no-replacement`). Modal shell dropped `transition-all` for property-scoped transitions. Danger CTAs keep solid `red-600` (not soft `error-bg`).

<!-- Add new decisions above this comment, newest first. -->

### 2026-01-01 — Example decision entry

**Status**: accepted

We chose X over Y because Z. The key constraint was [constraint]. Alternatives considered:
- Option A — rejected because [reason]
- Option B — tried but caused [issue]
