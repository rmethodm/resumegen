# Resumo Full-Clone Project — Progress Notes

Last updated: 2026-08-02

## Goal

Full architectural clone of the sibling app `/Users/rmethod/Herd/Resumo` into Resumegen, per the user's decision to do a "full architectural replacement" (not just a feature port). Decomposed into 10 independent sub-projects since it's too large for a single spec — see the design spec for the full list and reasoning:

- Spec: `docs/superpowers/specs/2026-08-02-foundation-swap-fortify-inertia-v3-design.md`
- Plan: `docs/superpowers/plans/2026-08-02-foundation-swap-fortify-inertia-v3.md`

## Sub-project breakdown (10 phases)

1. **Foundation swap** — ✅ **DONE** (see below)
2. **Data model migration** — relational resume schema (Education/Experience/Certificate/Project/Skill/StarterProfile) + migration path for existing users' JSON-blob resumes. Flagged as highest-risk/most-irreversible piece — recommended to derisk early since every later phase depends on it. **This is next.**
3. **Core resume builder parity** — rebuild the builder UI/PDF export on the new schema; also where the deferred Wayfinder + shadcn/ui swap happens (bundled here rather than phase 1, to avoid touching every page twice).
4. **AI features** (Resumo uses `laravel/ai`) — Resumegen removed all AI 2026-07-21; reintroducing is a deliberate reversal, confirm before starting.
5. **Admin panel** — Resumegen's Filament admin was fully removed 2026-07-21. Resumo has its own (non-Filament) admin surface.
6. **Job features** (Import/Watch/Match) — Resumegen's Job Search was removed 2026-07-21.
7. **Cover Letters** — removed from Resumegen 2026-08-02.
8. **Resume Compare/Groups/Snapshots** (version history) — likely overlaps with Resumegen's removed A/B-variants feature under a new name; watch for that.
9. **Profile Messages / Public Profile** — looks like Resumegen's removed Portfolio feature, renamed.
10. **Ops** — backup (`spatie/laravel-backup`), `laravel/chisel`. Infra, not user-facing.

Phases 4–9 each reintroduce a feature Resumegen deliberately removed (several for cost/product reasons per `CLAUDE.md`) — confirm intent before starting any of them, don't assume "full clone" auto-approves reintroduction.

## Phase 1: Foundation swap — COMPLETE ✅

Swapped Breeze auth → Laravel Fortify (mirroring Resumo's actual pattern), bumped PHP 8.3→8.5, Inertia v2→v3, React 18→19 (forced by Inertia v3 peer deps). Resumegen's foundation (JSON-blob `resumes` table, Sanctum API auth) and its custom 2FA system were explicitly kept untouched — Fortify only replaced Breeze's login/register/password-reset/email-verification/confirm-password controllers.

- Executed via `superpowers:subagent-driven-development` — 6 tasks, each with implementer + task review + fix loops where needed, then a final whole-branch review with one fix wave.
- **Merged to `main` and pushed** — `origin/main` at `77fa9a1` (12 commits).
- Two real bugs were caught only by pushing for actual browser/HTTP verification, not by the 331→332 PHPUnit suite (which structurally can't execute React pages): a dead Breeze route name (`password.store`) left in `ResetPassword.tsx`, and an Inertia v2→v3 client-boot incompatibility in `app.tsx`. Both fixed and verified. **Lesson for later phases:** don't trust "PHPUnit passes" alone on any task touching `resources/js/Pages/**` — do a real browser/Dusk check.
- Final review also caught and fixed: CI pinned to PHP 8.4 (would've broken CI), deploy docs pinned to PHP 8.3 (would've broken production deploy), a hardcoded real-looking credential pair in `Login.tsx`'s default form values (pre-existing, not introduced by this branch — removed anyway), and a login-throttle behavior divergence from Breeze (fixed by deleting the custom rate limiter and letting Fortify's own default take over).
- `CLAUDE.md`'s Stack section was updated to reflect the new reality (PHP 8.5, Inertia v3, Fortify auth, React 19).
- Added a permanent regression tripwire: `tests/Feature/Auth/AuthRouteNamesTest.php` — asserts every route name the Auth `.tsx` pages call still resolves, so a future route rename can't silently break a page again.

## Next step

Brainstorm phase 2 (data model migration) via `superpowers:brainstorming` — needs its own spec covering the new schema shape and, critically, the backfill/migration strategy for existing users' JSON-blob resumes (nothing should be lost or corrupted for live users). Should probably be derisked before phase 3 (builder rebuild) starts, since phase 3 builds directly on top of it.
