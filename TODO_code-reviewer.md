# Code Review — TODO

## Context
- **Repository**: Resumegen (`/Users/rmethod/Herd/Resumegen`)
- **Branch**: `main`
- **Commit under review**: `9cf1b96` — "Fix design-system fragmentation and add mobile/perf polish" (61 files changed, +675/-627)
- **Language/Framework/Runtime**: PHP 8.5 / Laravel 13, TypeScript / React 19 / Inertia v3, Tailwind CSS v3, PHPUnit 12, Laravel Dusk v8
- **Purpose and scope**: A design-system consistency pass (unify buttons/checkboxes/cards/modals onto shared components, repoint stray indigo/slate/green/emerald/amber/red Tailwind classes onto the app's own `brand`/`gray`/`success`/`warning`/`danger` tokens, delete two dead nav components) plus a smaller mobile/performance/accessibility polish pass (Inertia `defer()` on the Dashboard's expensive resume query, `dvh` units, safe-area insets, `motion-reduce:` support, one new Dusk browser test file). No new dependencies, no schema changes, no route changes.

## Review Plan
- [x] **CR-PLAN-1.1 [Security Scan]**:
  - **Scope**: The two files with behavioral (not purely stylistic) changes — `app/Http/Controllers/DashboardController.php` (query extraction into `Inertia::defer()`) and the Admin/Backups restore-confirmation dialog migration in `resources/js/Pages/Admin/Backups/Index.tsx` (the one destructive-action confirmation touched in this diff). Checked for auth/timing regressions, XSS in the rendered backup filename, and whether the confirm-to-restore gate was weakened by the Modal migration.
  - **Priority**: Critical — must be completed before merge
- [x] **CR-PLAN-1.2 [Performance Audit]**:
  - **Scope**: `DashboardController.php`'s `resumesForDashboard()` extraction and its `Inertia::defer()` wrapping; `Dashboard.tsx`'s client-side average-score calculation replacing a server-side one.
  - **Priority**: High — flag measurable bottlenecks
- [x] **CR-PLAN-1.3 [Bug/Correctness Sweep]**:
  - **Scope**: Every non-styling behavioral diff hunk across `Modal.tsx`, `Dashboard.tsx`, `DashboardController.php`, the reorder-button breakpoint fix (`Workstation.tsx` + `use-mobile.tsx`), and the two test files (`DashboardShareInfoTest.php`, `WorkstationResponsiveTest.php`) for tautological assertions, missing undefined-guards, and backward-compatibility breaks in `Modal.tsx`'s new optional props.
  - **Priority**: High
- [x] **CR-PLAN-1.4 [Code Quality Pass]**:
  - **Scope**: `tailwind.config.js` token additions (`success`/`warning`/`danger`, `boxShadow.card`) for collisions/malformed values; component-consolidation wrappers (`PrimaryButton`/`SecondaryButton`/`DangerButton`/`Checkbox`) for lost behavior (e.g. `disabled` styling); confirmed `NavLink`/`ResponsiveNavLink` deletion has zero live references.
  - **Priority**: Medium

## Review Findings

No Critical, High, or Medium severity findings. One Low/cosmetic accessibility note:

- [ ] **CR-ITEM-1.1 [Modal `description` prop not wired to `aria-describedby`]**:
  - **Severity**: Low
  - **Location**: `resources/js/Components/Modal.tsx` (new `description` prop, added in this commit's Modal-chrome extension)
  - **Description**: `Modal` now accepts an optional `description` string rendered as visible text under the title, but the `Dialog` element has no `aria-describedby` pointing at it. Screen-reader users get the dialog's accessible name via `DialogTitle` but not an explicit programmatic association to the description text, so some screen readers may not announce it automatically on open.
  - **Recommendation**: Give the description element a stable `id` (e.g. `${modalId}-description`) and pass `aria-describedby={description ? \`${modalId}-description\` : undefined}` to the Headless UI `Dialog`. Pre-existing gap — none of the hand-rolled dialogs this Modal replaced did this either — so this is a nice-to-have improvement riding along with the consolidation, not a regression introduced by it. Not blocking.
  - **Reproduction scenario**: Open any of the five modals migrated onto `Modal` with a `description` set, using a screen reader (VoiceOver/NVDA) — the description text is read only if the user manually navigates to it, not automatically announced with the dialog's opening focus.

## Proposed Code Changes

Optional, non-blocking — for CR-ITEM-1.1 only, if picked up:

```diff
--- a/resources/js/Components/Modal.tsx
+++ b/resources/js/Components/Modal.tsx
@@
+    const descriptionId = description ? `${id}-description` : undefined;
+
     return (
-        <Dialog as="div" className="..." onClose={onClose}>
+        <Dialog as="div" className="..." onClose={onClose} aria-describedby={descriptionId}>
@@
-                    {description && <p className="...">{description}</p>}
+                    {description && (
+                        <p id={descriptionId} className="...">
+                            {description}
+                        </p>
+                    )}
```

(Illustrative — apply against the actual prop/id plumbing already in `Modal.tsx`; no other files in this commit require changes.)

## Commands

No fix is required to merge this commit as-is. If CR-ITEM-1.1 is picked up:

```bash
# after editing Modal.tsx
npm run build
php artisan dusk   # requires: php artisan serve --env=dusk.local --port=8001 --no-reload (separate terminal)
php artisan test --compact
```

## Effort & Priority Assessment

- **Implementation Effort**: CR-ITEM-1.1 — ~15 minutes (single-file, no test changes required, though a Dusk `aria-describedby` assertion could be added).
- **Complexity Level**: Simple.
- **Dependencies**: None.
- **Priority Score**: Low risk × low effort — safe to defer indefinitely or bundle into the next Modal-touching change; not worth a dedicated commit on its own.

## Overall Assessment

Commit `9cf1b96` is a clean, low-risk design-system consolidation. Reviewed all 61 changed files (diff + current-state cross-checks on the two behaviorally-changed files). No injection, XSS, auth, or data-integrity issues found — the one destructive-action confirmation touched (Admin/Backups restore) preserves its confirm-typing gate exactly, and the restored filename is rendered through React's normal JSX escaping. The `Inertia::defer()` extraction on the Dashboard query is textbook-correct: the closure captures request state safely, the client-side average-score calculation is guarded against the empty-array case, and every downstream use of the now-possibly-`undefined` `resumes` prop was checked and found guarded. The reorder-button breakpoint fix (`sm:hidden` → `md:hidden`) is a genuine, previously-shipped bug fix with real new Dusk coverage (`WorkstationResponsiveTest.php`) verifying the 767px/768px boundary live in headless Chrome. Test changes (`DashboardShareInfoTest.php`'s move to `loadDeferredProps()`) are non-tautological and correctly exercise the new deferred-prop contract.

## Quality Assurance Checklist
- [x] Every finding has a severity level and a clear remediation path
- [x] Security issues are flagged as Critical or High and appear first — none found, so N/A
- [x] Performance suggestions include measurable justification — none needed, query shape unchanged from pre-commit baseline
- [x] Code examples in recommendations are syntactically correct
- [x] All file paths and line references are accurate to the commit diff
- [x] The review covers all 61 files in scope (diff read in full; behavioral files additionally cross-checked against current-state content)
- [x] Positive aspects of the code are acknowledged (see Overall Assessment)
