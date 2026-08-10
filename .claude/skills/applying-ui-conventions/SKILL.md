---
name: applying-ui-conventions
description: Applies this app's UI consistency conventions when adding or changing pages, buttons, dropdowns, menus, modals, or option lists. Use when adding a new page that users must reach, adding a link to the top nav menu, adding a button or dropdown that duplicates an action already offered elsewhere (for example Download or Export on both the workstation and the dashboard), deciding when a control should be visible, or ordering the options in a select/dropdown.
---

# Applying UI Conventions

How new UI in this app must match what already exists.

## Steps

1. When you add a user-facing page, add a link to it in the top nav in the same pass — both the desktop and the mobile nav, using an existing Heroicon and the existing named route. A page reachable only by direct URL is incomplete.
2. Keep navigation a single global top bar rendered on every page of the app. Do not add a sidebar, and do not leave pages outside the shared layout that carries the nav.
3. When the action you are adding already exists somewhere else in the app, reuse that control's markup and classes rather than inventing a new look. Read the existing control first (for example the Download button) and copy its styling; the same dropdown treatment repeats everywhere the action appears.
4. Show a control only in the context where it applies. Example: the template picker renders only while the resume is being previewed (Review tab), not on the editing tabs.
5. Sort user-facing option lists alphabetically by label, even when the source enum or array has a canonical order. Sort at the render/presentation layer; leave the source order alone.
6. When a brief spells out a control pattern (toggle reveals a field, three-dropdown date picker, auto-forward on expiry), build it exactly as described rather than substituting an equivalent.
7. After changing nav or route reachability, update any now-stale comments or docblocks that say a route is "not linked from navigation".

## Verify

- Run `npx tsc --noEmit && ./vendor/bin/pint --dirty --format agent && npm run build` and confirm all three pass.
- Confirm the new nav entry appears in both the desktop and mobile nav.
- Confirm the new control renders with the same classes as its existing counterpart, and only in the context where it applies.
