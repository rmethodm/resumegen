---
name: invoking-named-skills
description: Loads and follows a skill the user named, step by step, instead of improvising an equivalent implementation. Use when the user names a skill such as "use the laravel:http-client-resilience skill exactly as written", says "use skill X", "activate X", "follow X exactly", or pastes a skill's SKILL.md contents inline (for example the inertia-react-development skill) to force its rules.
---

# Invoking Named Skills

When the user names a skill, that skill's own steps are the specification. Do not substitute an equivalent implementation written from memory.

## Steps

1. Invoke the named skill with the Skill tool, using the exact name the user typed (including its plugin prefix, e.g. `superpowers-laravel:laravel-http-client` for `laravel:http-client-resilience`). If the user pasted the skill's contents inline instead of naming it, treat that pasted text as the loaded skill body — do not re-derive its rules.
2. Read the whole skill body before writing any code. Its rules apply to every file the task touches, not only the first one.
3. Follow its steps in the order given, using its exact commands, flags, file paths, and API choices. "Exactly as written" means the skill's own wording wins over your default approach and over general framework habit.
4. When the skill prescribes an API the codebase does not yet use (for example Inertia v3's `useHttp` hook), confirm the current signature with `search-docs` for the installed version rather than guessing, then implement it as the skill directs.
5. Where the skill's guidance conflicts with this project's existing convention, follow the skill and say so in the report rather than silently averaging the two.
6. When reporting, name the skill you followed and any step you could not apply, with the reason.

## Verify

- Every step of the named skill is either done or explicitly reported as not applicable.
- The diff reflects the skill's prescribed approach, not a lookalike written from memory.
- Run the project's checks for what you touched: `./vendor/bin/pint --dirty --format agent`, `php artisan test --compact <file>`, and `npx tsc --noEmit` for TSX changes.
