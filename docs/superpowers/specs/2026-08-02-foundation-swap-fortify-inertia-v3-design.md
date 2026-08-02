# Foundation Swap: Fortify + Inertia v3 + PHP 8.5

**Status:** Design approved, spec pending user review
**Date:** 2026-08-02
**Phase:** 1 of 10 in the Resumo full-clone project (see "Sub-project breakdown" below)

## Context

The user wants Resumegen rebuilt as a full architectural clone of the sibling
app at `/Users/rmethod/Herd/Resumo`. That project is too large for a single
spec — it spans a different PHP/Inertia/auth/component stack plus several
features Resumegen deliberately removed (AI, admin panel, Job Search, Cover
Letters, Portfolio, A/B variants — see `CLAUDE.md`). It was decomposed into
independent sub-projects:

1. **Foundation swap** (this spec) — PHP 8.5, Inertia v3, Fortify, keep Ziggy
   and existing Tailwind components for now
2. Data model migration — relational resume schema + migration path for
   existing users' JSON-blob resumes
3. Core resume builder parity — rebuild the builder on the new schema,
   including the deferred Wayfinder + shadcn/ui swap
4. AI features (`laravel/ai`)
5. Admin panel
6. Job features (Import/Watch/Match)
7. Cover Letters
8. Resume Compare/Groups/Snapshots (version history)
9. Profile Messages / Public Profile
10. Ops (backup, chisel)

Each sub-project gets its own spec → plan → implementation cycle. This spec
covers only #1.

## Current state (Resumegen)

- `composer.json`: `php: ^8.4` (Herd has 8.5 already installed and set as
  global — no environment blocker), `inertiajs/inertia-laravel: ^2.0`,
  `laravel/sanctum: ^4.0`, dev-only `laravel/breeze: ^2.4`
- Auth is Breeze-generated controllers (`RegisteredUserController`,
  `AuthenticatedSessionController`, `PasswordResetLinkController`,
  `NewPasswordController`, `EmailVerificationPromptController`,
  `VerifyEmailController`, `ConfirmablePasswordController`) plus a **custom**
  2FA system built on `pragmarx/google2fa-laravel` (`TwoFactorController`,
  `ConfirmedTwoFactorController`, `TwoFactorRecoveryCodesController`,
  `two_factor_challenge` middleware) — this is Resumegen-specific, not part
  of Breeze, and is out of scope for this swap.
- `RegisteredUserController::store()` enforces a business rule with no
  Fortify equivalent: max 5 account registrations per IP per 24h, via the
  `registration_ip` column (`CLAUDE.md` "Registration IP velocity").
- Sanctum API auth (`config/sanctum.php`, `guard => []`) is orthogonal to
  session auth and is not touched by this swap.

## Target state (Resumo, for reference)

Resumo (`php: ^8.5`, `inertiajs/inertia-laravel: ^3.0`,
`laravel/fortify: ^1.37.2`) wires Fortify via
`app/Providers/FortifyServiceProvider.php`: custom `CreateNewUser` and
`ResetUserPassword` actions in `app/Actions/Fortify/`, and
`Fortify::*View()` closures pointing at its Inertia auth pages.

## Approach

Mirror Resumo's Fortify action pattern, adapted to Resumegen's existing page
paths and business rules, rather than adopting Resumo's page paths or 2FA:

- Add `laravel/fortify` to `composer.json`; remove the `laravel/breeze` dev
  dependency once its generated controllers are deleted
- New `App\Providers\FortifyServiceProvider`, registered in
  `bootstrap/providers.php`, with `Fortify::*View()` closures pointing at
  the **existing** `resources/js/Pages/Auth/*.tsx` files — no page rewrites
- New `App\Actions\Fortify\CreateNewUser` — same validation Fortify expects,
  plus the registration-IP-velocity check ported verbatim from the current
  `RegisteredUserController::store()`
- New `App\Actions\Fortify\ResetUserPassword`
- Delete the 7 Breeze auth controllers listed above
- `routes/auth.php` rewritten: Fortify auto-registers login/register/
  password-reset/email-verification/confirm-password routes; only
  Resumegen's custom 2FA routes stay manually defined (unchanged)
- `@inertiajs/react` npm package bumped to `^3.0`; audit call sites for
  breaking changes in `usePage`/`router`/`<Form>` APIs (Inertia v2→v3
  changelog to be checked during implementation, not this spec)
- Ziggy, Tailwind components, and every non-auth page are untouched

**Rejected alternative:** feature-flagged dual-auth (old Breeze routes and
new Fortify routes live side by side, toggled via env var) for a zero-
downtime staged rollout. Rejected because the user confirmed a maintenance
window (brief outage, forced re-login) is acceptable, making the extra
complexity of dual-auth pure waste.

## Data flow / behavior changes

- Login, registration, password reset, email verification, and password
  confirmation now flow through Fortify's controllers instead of Breeze's.
  Response shapes (redirects, validation error bags, session flash) must
  match current behavior — Fortify's defaults already match Laravel's
  conventional Inertia patterns, so no frontend page changes are expected
  beyond what the Inertia v3 bump requires.
- 2FA challenge flow (`two_factor_challenge` middleware) is unaffected: it
  runs after Fortify's login succeeds, exactly as it currently runs after
  Breeze's login succeeds.
- Sanctum API token auth (`/api/*`) is unaffected.
- No database schema changes. `registration_ip` and its index are reused
  as-is by the new `CreateNewUser` action.

## Testing

- `tests/Feature/Auth/RegistrationTest.php`,
  `AuthenticationTest.php` (or equivalent login test),
  `PasswordResetTest.php`, `EmailVerificationTest.php` — adapt to Fortify's
  routes/actions; the IP-velocity and "5 vs 6th registration" assertions
  must still pass unchanged in behavior
- 2FA test files (`TwoFactorAuthenticationTest.php` or equivalent) — verify
  they still pass with no code changes required, confirming 2FA truly
  wasn't touched
- Existing Dusk browser tests covering login/register — rerun to confirm
  the actual UI still works after the Inertia v3 bump

## Out of scope for this phase

- Wayfinder route-helper swap (deferred to sub-project #3)
- shadcn/ui component kit swap (deferred to sub-project #3)
- Any change to the `resumes` table, other models, or non-auth
  controllers/pages
- Any of sub-projects #4–#10
