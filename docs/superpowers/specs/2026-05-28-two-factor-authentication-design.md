# Two-Factor Authentication (2FA) Design

**Date:** 2026-05-28
**Status:** Approved

## Overview

Add TOTP-based two-factor authentication to Resumegen. 2FA is optional for free users and mandatory for Pro users (enforced on next login after upgrading). Implementation uses `pragmarx/google2fa-laravel` for TOTP secret generation, QR code rendering, and code verification. Recovery via saved one-time codes plus email fallback.

## Section 1: Database & Model

### Migration

Single migration adding three columns to the `users` table:

- `two_factor_secret` — encrypted string, nullable. The TOTP secret key.
- `two_factor_recovery_codes` — encrypted text, nullable. JSON array of 8 bcrypt-hashed one-time codes.
- `two_factor_confirmed_at` — nullable timestamp. Non-null means 2FA is fully enabled. A non-null secret with a null `confirmed_at` means setup is in progress but not yet confirmed.

### User Model

Three new methods:

- `hasTwoFactorEnabled(): bool` — returns `two_factor_confirmed_at !== null`
- `requiresTwoFactor(): bool` — returns `isPro() && !hasTwoFactorEnabled()` — drives enforcement redirect

The `two_factor_secret` and `two_factor_recovery_codes` columns use Laravel's `encrypted` cast (handled automatically by `google2fa-laravel`).

## Section 2: Auth Flow & Middleware

### Login Flow (2FA-enabled users)

1. User submits email/password — `AuthenticatedSessionController@store` runs as today.
2. If credentials are valid and user has 2FA enabled: log them into the Laravel session, store `two_factor_auth_pending = true` in the session, redirect to `GET /two-factor-challenge`.
3. On the challenge page they enter their TOTP code or a recovery code. On success: clear the pending flag, redirect to intended URL (or dashboard).
4. `RequiresTwoFactorChallenge` middleware (applied to all `auth` routes) checks: if session has `two_factor_auth_pending`, redirect to `/two-factor-challenge`.

### Pro User Enforcement

`EnsureTwoFactorSetup` middleware (applied to all `auth` routes) checks `user->requiresTwoFactor()`. If true, redirect to `/profile` with a flash message. Routes excluded from this redirect:

- `GET /profile` and `PATCH /profile` (so they can set up 2FA)
- `GET|POST /two-factor-challenge`
- `POST /logout`
- All `/user/two-factor-*` routes (setup endpoints)

### Recovery Code Flow

On the challenge page, a "Use a recovery code instead" toggle swaps the TOTP input for a plain text input. Backend verifies the submitted value against the stored bcrypt-hashed codes, deletes the matched code from the array, and re-saves. If fewer than 2 recovery codes remain after use, a warning flash is included in the redirect: "You have fewer than 2 recovery codes left — regenerate them in your profile."

### Email Fallback

A `POST /two-factor-challenge/email` endpoint sends a 6-digit OTP to the user's email (stored temporarily in cache with a 10-minute TTL, keyed by user ID). A "Send code to my email instead" link on the challenge page triggers this. The OTP input replaces the TOTP input and is verified against the cached value on submit.

## Section 3: 2FA Setup (Profile Page)

### Panel States

The 2FA section is added as a new card on `Profile/Edit.tsx`, below the existing password card.

**State 1 — Disabled:**
Shows status indicator and "Enable Two-Factor Authentication" button. Clicking POSTs to `POST /user/two-factor-authentication`, which generates a secret and stores it (unconfirmed, `two_factor_confirmed_at` remains null). Page re-renders via Inertia showing State 2.

**State 2 — Pending confirmation:**
Shows the QR code (SVG, generated server-side and passed as an Inertia prop) and a 6-digit confirmation input. User scans with their authenticator app, enters the code, submits to `POST /user/confirmed-two-factor-authentication`. Backend verifies with `google2fa`, sets `two_factor_confirmed_at = now()`, generates 8 recovery codes (random 10-char alphanumeric strings), stores them bcrypt-hashed. Page re-renders showing State 3 with recovery codes displayed once.

**State 3 — Enabled:**
Shows a green "Two-Factor Authentication is enabled" status badge. Two actions available:
- **Regenerate recovery codes** — `POST /user/two-factor-recovery-codes`. Generates a fresh set of 8 codes (old ones invalidated), displays them once inline.
- **Disable 2FA** — `DELETE /user/two-factor-authentication`. Requires password confirmation first (reuses `ConfirmablePasswordController` pattern — user must confirm password within the last 3 hours). Clears all three columns. Pro users remain on the profile page with an enforcement banner.

### Recovery Codes Display

Shown in a monospace code block with a "Copy all" button. Warning text: "Save these somewhere safe — they won't be shown again." No email copy sent. After navigating away, codes are no longer accessible; user must regenerate to get a new set.

## Section 4: The Challenge Page

### Route & Component

`GET /two-factor-challenge` renders `Auth/TwoFactorChallenge.tsx` — a minimal centered card matching the existing `Auth/Login.tsx` style.

### Page Contents

- A 6-digit numeric input (autofocused, `inputmode="numeric"`, `autocomplete="one-time-code"`) for TOTP.
- A "Use a recovery code instead" toggle that swaps to a plain text input.
- A "Send code to my email instead" link (triggers `POST /two-factor-challenge/email`, shows OTP input).
- A "Verify" submit button.
- A small "Sign out" link (`POST /logout`) as an escape hatch.

### `POST /two-factor-challenge` Controller

- Rejects if `two_factor_auth_pending` is not in session (prevents direct POST abuse).
- If input length > 6, treats it as a recovery code; otherwise treats as TOTP.
- On TOTP success: clears `two_factor_auth_pending`, redirects to intended URL or dashboard.
- On recovery code success: clears code from stored array, re-saves, clears flag, redirects. Flashes warning if < 2 codes remain.
- On failure: returns validation error "The provided code was invalid."
- Rate limited: `throttle:5,1` (5 attempts/minute).

### Route Guards

`GET /two-factor-challenge` and `POST /two-factor-challenge` sit in the `auth` middleware group but are explicitly excluded from both `RequiresTwoFactorChallenge` and `EnsureTwoFactorSetup` to prevent redirect loops.

## Section 5: Routes

```
// Auth routes (guest middleware)
// No changes to existing login/register routes

// Two-factor challenge (auth middleware, excluded from 2FA middlewares)
GET  /two-factor-challenge              → TwoFactorChallengeController@create
POST /two-factor-challenge              → TwoFactorChallengeController@store
POST /two-factor-challenge/email        → TwoFactorChallengeController@sendEmail

// 2FA setup (auth middleware + EnsureTwoFactorSetup excluded for these)
POST   /user/two-factor-authentication           → TwoFactorController@store
POST   /user/confirmed-two-factor-authentication → ConfirmedTwoFactorController@store
DELETE /user/two-factor-authentication           → TwoFactorController@destroy
POST   /user/two-factor-recovery-codes           → TwoFactorRecoveryCodesController@store
```

## Section 6: Testing

### `TwoFactorSetupTest`

- Enable 2FA: POST generates secret, `two_factor_confirmed_at` remains null.
- Confirm with valid TOTP: `two_factor_confirmed_at` is set, recovery codes generated.
- Confirm with invalid TOTP: returns validation error, `two_factor_confirmed_at` remains null.
- Disable 2FA: requires password confirmation; clears all three columns.
- Regenerate recovery codes: invalidates old codes, returns new set.

### `TwoFactorChallengeTest`

- Login with 2FA-enabled account: session has `two_factor_auth_pending`, redirects to challenge page.
- Valid TOTP code: clears flag, redirects to dashboard.
- Invalid TOTP code: returns "The provided code was invalid."
- Valid recovery code: works and is consumed (removed from stored array).
- Used recovery code cannot be reused.
- Rate limiting: 6th attempt within a minute is rejected with 429.
- Email OTP: sending sets cached code; valid OTP on submit clears flag and redirects.

### `TwoFactorEnforcementTest`

- Pro user without 2FA: redirected from any protected route to `/profile`.
- Pro user with 2FA enabled but `two_factor_auth_pending`: redirected to `/two-factor-challenge`.
- Free user without 2FA: passes through all routes freely.
- Pro user without 2FA can access `/profile`, `/two-factor-challenge`, `/logout` without redirect loop.

## Package

`pragmarx/google2fa-laravel` — handles TOTP secret generation, QR code SVG rendering, and time-based code verification (including window tolerance for clock drift).
