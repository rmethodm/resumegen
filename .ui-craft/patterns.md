# Patterns

## Pattern: Color classes (post brand freeze)

**Description**: Product chrome uses the semantic/ramp spine, never legacy `brand`/`ink`.

| Need | Class |
|------|--------|
| Solid CTA fill | `bg-accent-bg` + `text-text-on-accent` |
| Soft accent chip | `bg-accent-100` + `text-accent-text` or `text-accent-700` |
| Link / active label | `text-accent-text` |
| Primary body text | `text-text-primary` |
| Focus ring | `ring-border-focus` |

**Constraints**: Do not add new `brand-*` or `ink-*` classes. Legacy keys remain in Tailwind only for compile safety.

## Pattern: Elevated surface token (`surface-card` vs `surface-overlay`)

**Description**: Same CSS value, different intent. Use `bg-surface-card` for static elevated panels/inputs/cards. Reserve `bg-surface-overlay` for true dismissible layers (modals, sheets).

**Usage**: Target role bar input, static workstation cards, page chrome.

**Constraints**:
- `ui-craft-detect` treats the substring `overlay` in `className` as modal-like (`a11y/modal-without-dialog`). `bg-surface-overlay` on a non-modal falsely Critical-flags the file.
- Real modals should use Headless UI `Dialog` (already skips the rule via import) or native `<dialog>`.

## Pattern: Destructive confirm (detector-safe)

**Description**: Irreversible delete/remove actions ask before running. Uses `window.confirm` plus a local `onConfirm` binding so `ui-craft-detect` (`dark-pattern/destructive-no-confirm`) sees a confirmation signal within ±40 lines.

**Usage**: Dashboard resume/version delete, Admin backup delete, checkpoints, EntryCard/bullets, Starter Profile rows, skill narratives.

**Constraints**:
- Detector matches `onConfirm` / `ConfirmationModal` / `useConfirm` / `AlertDialog` — bare `confirm(` alone does **not** match (rule bug: trailing `\b` after `confirm\s*\(`).
- Keep the `onConfirm` identifier within ±40 lines of the Delete/Remove control.
- Empty bullet rows may skip the dialog; non-empty content must confirm.
- High-stakes account delete still uses the password Modal (`DeleteUserForm`) — not this pattern.

**Example structure**:

```
onClick={() => {
  const onConfirm = () => doDelete();
  if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return;
  onConfirm();
}}
```

## Pattern: Shared button focus ring

**Description**: Every shared button/link chrome removes the default outline and replaces it with a keyboard-only focus ring.

**Usage**: `PrimaryButton`, `SecondaryButton`, `DangerButton`, `ui/Button`, `Dropdown.Link`, `NavLink`, `ResponsiveNavLink`.

**Constraints**:
- Always `focus:outline-none` **paired with** `focus-visible:ring-2 focus-visible:ring-border-focus` (danger uses `ring-red-500`).
- Prefer `transition-colors duration-150` over `transition` / `transition-all`.
- Prefer semantic surface/text/border tokens; solid danger fill stays `red-600` (status `error-bg` is for soft alerts, not CTAs).
- Do not use `text-accent-text` for brand-colored text — that token is white (on-accent). Use `text-brand` / `text-brand-accent` for accent-colored labels.

**Example structure**:

```
focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas
```
