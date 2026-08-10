---
name: following-existing-conventions
description: Checks what the codebase already does and follows that pattern before applying any framework rule or best practice. Use when creating or editing a controller, model, migration, factory, form request, service, or React page, when choosing between two valid Laravel or React approaches, or when a rule, style guide, or best-practice source suggests a pattern the codebase does not already use.
---

# Following Existing Conventions

The best choice is the one the codebase already uses. Inconsistency is worse than a suboptimal pattern.

## Steps

1. Before writing any code, read the sibling files for the thing you are about to create or change: the neighbouring controllers, models, factories, migrations, form requests, or page components in the same directory, plus their tests.
2. If an established pattern exists, follow it exactly — including class shape, naming, docblocks, and argument style. Do not introduce a second way to do the same job. Example: a trivial invokable controller matches the existing `DashboardController::class` route registration rather than a new `[Controller::class, 'method']` form.
3. Apply a framework rule or generic best practice only where no pattern exists yet. These are defaults for greenfield code, not overrides of what is already there.
4. Deviate from the established pattern only for a correctness or security defect. When you do, say so explicitly in your report rather than changing it silently.
5. If two existing patterns contradict each other, pick one (the more recent or more tested), explain why, and flag the other for cleanup — do not average them.
6. Make the smallest coherent change. Keep the application's architecture and naming instead of refactoring adjacent code that is not part of the task.

## Verify

- Name the sibling file whose pattern you followed when reporting the change.
- Re-read the diff and confirm it introduces no second way of doing something the codebase already does one way.
- Run the project's formatter and the narrowest relevant tests (`./vendor/bin/pint --dirty --format agent`, `php artisan test --compact --filter=<name>`, `npx tsc --noEmit` for TSX changes).
