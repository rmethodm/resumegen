# Agent instructions

**Read `CLAUDE.md`. It is the authoritative instruction file for this repo.**

This file used to be a verbatim copy of the Laravel Boost auto-generated guidelines block.
That block also lives inside `CLAUDE.md` — but there it is wrapped in ~370 lines of
hand-written corrections, without which parts of it are actively wrong. Duplicating it here
meant an agent could read the errata without the errata sheet, so the copy was replaced with
this pointer on 2026-07-20.

The three corrections most likely to cause damage if you act on the Boost block alone:

- **`laravel/cashier` is NOT installed**, despite the block listing it as a dependency. There
  is no billing, no Stripe, no plan tiers, no paywall. Do not add one without asking.
- **`spatie/laravel-medialibrary` is installed but unused.** Nothing in `app/` references it;
  the resume photo feature was removed. Do not activate the medialibrary skill.
- **Dusk needs its own server** — `php artisan serve --env=dusk.local --port=8001` must be
  running first, because Herd serves the dev database. The block's "never run commands to
  serve the site" does not apply to the Dusk path.

Also in `CLAUDE.md` and absent from the Boost block: migrations are forward-only (never
`migrate:rollback`), Rule 5 (no LLM for anything code can answer deterministically), and the
rule that `docs/prepaid-pricing-model.md` is the only live pricing document.
