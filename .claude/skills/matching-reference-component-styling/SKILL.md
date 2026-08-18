---
name: matching-reference-component-styling
description: Copies an existing component's exact styling values onto new or changed UI instead of approximating them. Use when the user points at an existing element as the reference — "match the corners on the workstation page", "copy that of the top nav bar", "add the purple left border to all section headers", "match the border width/thickness" — or asks why one element's corners, border, or radius look different from another's.
---

# Matching Reference Component Styling

When the user names an existing element as the reference, that element's actual classes are the spec. Do not pick a value that looks close.

## Steps

1. Find the reference component in source and read its real classes before editing anything. Example references used in this app: `TargetRoleBar` (the purple left accent on the workstation page) and the top nav bar in `resources/js/Components/ui/shell.tsx`.
2. Copy the reference's literal values into the target — the same border color, the same border width, the same radius token. `border-l-[3px] border-l-brand`, `rounded-lg border border-surface-border/80`. Do not substitute a different arbitrary value.
3. Check for stacked edge treatments on the target that the reference does not have. A `ring-1 ring-ink/5` alongside `border` doubles the edge and makes the corner read as a larger curve and the border as thicker — remove the extra layer instead of tweaking the radius.
4. Apply the same treatment to every element the user named ("all section headers below"), not just the first one.
5. Rebuild before looking: run `npm run build` if no Vite dev server is running, otherwise the browser shows the stale bundle.

## Verify

- Open the page live in the browser and zoom in on the changed element and the reference side by side. Confirm the corner curve and border weight read the same; a code diff alone does not prove it.
- Run `npx tsc --noEmit` and confirm it is clean.
- Report which reference component you copied from and the exact classes you took.
