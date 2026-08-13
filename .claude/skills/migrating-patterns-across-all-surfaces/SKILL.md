---
name: migrating-patterns-across-all-surfaces
description: Completes a layout or styling migration across every sibling surface once the new pattern is approved on one. Use when a new layout replaces an old one on some pages (for example a new auth layout replacing GuestLayout), when a component's styling (such as the resume score box's corner radius) should become the app-wide treatment, or when the user says to make a pattern, layout, or style consistent across the app.
---

# Migrating Patterns Across All Surfaces

Once a layout or styling pattern is approved on one surface, the job is not done until every sibling surface uses it. A half-migrated app (some pages on the new layout, some on the old) is an incomplete result, not a smaller scope.

## Steps

1. Enumerate before editing. Grep for the old pattern — the old layout import (e.g. every page importing `GuestLayout`), the old component, or the old class values — and list every file still using it. This list is the migration scope.
2. Migrate every surface on the list in the same pass. Do not stop at the page named in the request: when the login page moved to the new auth layout, the other five auth pages (register, forgot password, reset password, confirm password, verify email) were expected to move off `GuestLayout` too, without a follow-up ask.
3. For styling treatments, adopt the approved component's exact values, not an approximation. Example: "all curved corners match the resume score box" means copying that component's actual corner-radius classes/tokens everywhere, ideally lifting the value into a shared token or class so future surfaces inherit it.
4. When nothing references the old layout/pattern anymore, delete it. If it must stay (still used by an intentional exception), say which surfaces still use it and why.
5. If the sibling set is genuinely large (dozens of files) and the user only approved one surface, confirm the full sweep in one line before proceeding — but default to sweeping.

## Verify

- Re-grep for the old pattern: zero hits outside stated intentional exceptions.
- Run `npx tsc --noEmit && ./vendor/bin/pint --dirty --format agent && npm run build` and confirm all pass.
- Load at least one migrated sibling page in the browser and confirm it renders on the new pattern.
