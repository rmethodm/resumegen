---
name: design-md-bidirectional-sync
description: Keeps DESIGN.md and the app's implementation reconciled in both directions. Use when DESIGN.md has changed (implement the new design/theme/color-scheme across the app, not just discuss it) or when a design token value changed in code/app.css (update DESIGN.md to match). Trigger on "DESIGN.md has changed", "implement new design", "update DESIGN.md to reflect change", "reconcile app.css tokens with DESIGN.md".
---

# Keeping DESIGN.md and the app in sync

DESIGN.md is the authoritative source for the app's design tokens, colors, and theme. It and the implementation must never be allowed to drift apart.

## DESIGN.md changed

When DESIGN.md is edited (new colors, tokens, or theme values), implement the new design across the application — update the actual components/CSS, not just summarize the diff or describe what changed. Re-theme every surface the changed tokens touch.

## A token value changed in code

When a design token's value changes in code (e.g. `app.css`) without a matching DESIGN.md edit, update DESIGN.md so its documented values match what's actually shipped. Reconcile app.css tokens against DESIGN.md rather than letting them diverge.

## Rule of thumb

Whichever side changed first, treat the task as incomplete until the other side is reconciled to match.
