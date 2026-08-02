# Foundation Swap: Fortify + Inertia v3 + PHP 8.5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Resumegen's Breeze auth controllers with Laravel Fortify (mirroring the pattern used by the sibling app `/Users/rmethod/Herd/Resumo`), and bump to Inertia v3 / PHP 8.5, with zero behavior change to login, registration, password reset, email verification, or password confirmation — and zero change to Resumegen's existing custom 2FA system.

**Architecture:** Fortify owns the auth *actions* (create user, reset password) and *route registration*; Resumegen supplies custom action/response classes that reproduce the exact current behavior (IP velocity check, 2FA-branch redirect after login, onboarding redirect after register, `?verified=1` redirect after email verify) and points Fortify's view closures at the existing, unmodified `resources/js/Pages/Auth/*.tsx` files. Resumegen's custom 2FA (`TwoFactorController` family, `two_factor_challenge` middleware, `routes/auth.php`'s `two-factor-challenge` routes) is untouched throughout.

**Tech Stack:** Laravel 13, PHP 8.5, `laravel/fortify`, Inertia v2→v3 (`inertiajs/inertia-laravel` + `@inertiajs/react`), PHPUnit (existing suite), Pint.

## Global Constraints

- No page rewrites: every `resources/js/Pages/Auth/*.tsx` file stays byte-for-byte unchanged. (Spec: "Approach")
- No behavior change to login/register/password-reset/email-verification/confirm-password redirects, validation, or session/flash shape. (Spec: "Data flow / behavior changes")
- Resumegen's custom 2FA (`TwoFactorController`, `ConfirmedTwoFactorController`, `TwoFactorRecoveryCodesController`, `two_factor_challenge` middleware, and `routes/auth.php`'s `two-factor-challenge` routes) must not be touched. (Spec: "Approach")
- `PasswordController` (PUT `/password`, changing password while logged in) is out of scope and stays untouched — it is a distinct concern from Fortify's `resetPasswords` feature (forgot-password flow), and the spec's approved scope list does not include it. (Plan-time clarification, not in original spec text — flagging here per Rule 7.)
- No database schema changes. `registration_ip` and its index are reused as-is. (Spec: "Data flow / behavior changes")
- Sanctum API auth (`/api/*`, `config/sanctum.php`) is untouched. (Spec: "Approach")
- Wayfinder and shadcn/ui are explicitly out of scope for this phase. (Spec: "Out of scope for this phase")
- Every PHP file change must pass `vendor/bin/pint --dirty --format agent` before being considered done (project-wide convention, `CLAUDE.md`).

**Plan-time correction to the spec:** the spec said "delete the 7 Breeze auth controllers" but named only 6 that are safe to delete outright, and missed `EmailVerificationNotificationController` (the "resend verification email" controller — part of the same Fortify `emailVerification` feature as the other two email-verification controllers, so it must go with them). The accurate list is 8 controllers, given in Task 5 below. `PasswordController` was never on the list and stays.

---

### Task 1: Add PHP 8.5, Fortify, and Inertia v3 dependencies

**Files:**
- Modify: `composer.json`
- Modify: `package.json`

**Interfaces:**
- Produces: `laravel/fortify` package available for `App\Providers\FortifyServiceProvider` (Task 4) to depend on; `inertiajs/inertia-laravel` and `@inertiajs/react` at `^3.0`.

This task only adds dependencies — it changes no application behavior, so the existing full test suite is the pass/fail gate (no new test to write).

- [ ] **Step 1: Bump the PHP platform requirement**

Edit `composer.json`, change:
```json
"php": "^8.3",
```
to:
```json
"php": "^8.5",
```

- [ ] **Step 2: Require Fortify and bump Inertia**

Run:
```bash
composer require laravel/fortify
composer require inertiajs/inertia-laravel:^3.0
```

- [ ] **Step 3: Bump `@inertiajs/react` and reinstall**

Edit `package.json`, change the `devDependencies` entry:
```json
"@inertiajs/react": "^2.0.0",
```
to:
```json
"@inertiajs/react": "^3.0.0",
```
Then run:
```bash
npm install
```

- [ ] **Step 4: Verify nothing broke**

Run:
```bash
php artisan test --compact
```
Expected: PASS, same as before this task (no behavior touched yet — Fortify's service provider is not yet registered in `bootstrap/providers.php`, so it has no effect).

- [ ] **Step 5: Commit**

```bash
git add composer.json composer.lock package.json package-lock.json
git commit -m "Add PHP 8.5, laravel/fortify, and Inertia v3 dependencies"
```

---

### Task 2: Create Fortify actions (CreateNewUser, ResetUserPassword)

**Files:**
- Create: `app/Actions/Fortify/CreateNewUser.php`
- Create: `app/Actions/Fortify/ResetUserPassword.php`

**Interfaces:**
- Consumes: `App\Models\User` (existing `registration_ip` column, `created_at`)
- Produces: `App\Actions\Fortify\CreateNewUser::create(array $input): User` and `App\Actions\Fortify\ResetUserPassword::reset(User $user, array $input): void`, both implementing Fortify's contracts — consumed by `FortifyServiceProvider::configureActions()` in Task 4.

These classes are inert until wired into `FortifyServiceProvider` (Task 4) and that provider is registered (Task 5). They can only be meaningfully exercised through Fortify's full HTTP pipeline (session handling, route binding) — not in isolation — so their correctness is verified by the existing `tests/Feature/Auth/RegistrationTest.php` and `PasswordResetTest.php` once Task 5's cutover runs them. No new test is written in this task; this is a deliberate deviation from write-test-first, justified because these classes have no meaningful behavior to test until they're plugged into Fortify's pipeline.

- [ ] **Step 1: Create `CreateNewUser`, porting validation and IP velocity from `RegisteredUserController::store()` verbatim**

```php
<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

class CreateNewUser implements CreatesNewUsers
{
    /**
     * @param  array<string, string>  $input
     */
    public function create(array $input): User
    {
        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Password::defaults()],
        ])->validate();

        $ip = request()->ip();

        return DB::transaction(function () use ($input, $ip) {
            if (User::where('registration_ip', $ip)->where('created_at', '>=', now()->subDay())->count() >= 5) {
                throw ValidationException::withMessages([
                    'registration' => 'Too many accounts created from this IP. Please try again tomorrow.',
                ]);
            }

            return User::create([
                'name' => $input['name'],
                'email' => $input['email'],
                'password' => Hash::make($input['password']),
                'registration_ip' => $ip,
            ]);
        });
    }
}
```

- [ ] **Step 2: Create `ResetUserPassword`, porting from `NewPasswordController::store()` verbatim (including the `remember_token` rotation)**

```php
<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    /**
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => ['required', 'confirmed', Password::defaults()],
        ])->validate();

        $user->forceFill([
            'password' => Hash::make($input['password']),
            'remember_token' => Str::random(60),
        ])->save();
    }
}
```

- [ ] **Step 3: Confirm the app still boots and the existing suite is unaffected**

Run:
```bash
php artisan test --compact
```
Expected: PASS (these files aren't referenced anywhere yet).

- [ ] **Step 4: Commit**

```bash
git add app/Actions/Fortify/CreateNewUser.php app/Actions/Fortify/ResetUserPassword.php
git commit -m "Add Fortify actions mirroring current registration and password reset behavior"
```

---

### Task 3: Create custom Fortify response classes

**Files:**
- Create: `app/Http/Responses/LoginResponse.php`
- Create: `app/Http/Responses/RegisterResponse.php`
- Create: `app/Http/Responses/VerifiedResponse.php`

**Interfaces:**
- Consumes: `App\Models\User::hasTwoFactorEnabled(): bool` (existing method, not modified)
- Produces: three classes implementing `Laravel\Fortify\Contracts\LoginResponse`, `RegisterResponse`, `VerifyEmailResponse` respectively, each exposing `toResponse($request): RedirectResponse` — consumed by `FortifyServiceProvider::register()` in Task 4, which binds them as singletons.

Fortify's default responses redirect to `config('fortify.home')` (`/dashboard`) with no extra behavior. Three of Resumegen's current controllers do something Fortify's defaults don't:
- `AuthenticatedSessionController::store()` branches to the 2FA challenge route when the user has 2FA enabled.
- `RegisteredUserController::store()` redirects new users to onboarding, not the dashboard.
- `VerifyEmailController::__invoke()` appends `?verified=1` to the dashboard redirect (both on the "already verified" and "just verified" branches).

Like Task 2, these are inert until wired in Task 4, so no new test here — `AuthenticationTest`, `RegistrationTest`, and `EmailVerificationTest` (all pre-existing) are the verification, run in Task 5.

- [ ] **Step 1: Create `LoginResponse`, porting the 2FA branch from `AuthenticatedSessionController::store()`**

```php
<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request): RedirectResponse
    {
        $user = Auth::user();

        if ($user->hasTwoFactorEnabled()) {
            $request->session()->put('two_factor_auth_pending', true);

            return redirect()->route('two-factor.challenge');
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
```

- [ ] **Step 2: Create `RegisterResponse`, porting the onboarding redirect from `RegisteredUserController::store()`**

```php
<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;

class RegisterResponse implements RegisterResponseContract
{
    public function toResponse($request): RedirectResponse
    {
        return redirect(route('onboarding.show', absolute: false));
    }
}
```

- [ ] **Step 3: Create `VerifiedResponse`, porting the `?verified=1` redirect from `VerifyEmailController::__invoke()`**

```php
<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;

class VerifiedResponse implements VerifyEmailResponseContract
{
    public function toResponse($request): RedirectResponse
    {
        return redirect()->intended(route('dashboard', absolute: false).'?verified=1');
    }
}
```

- [ ] **Step 4: Confirm the app still boots and the existing suite is unaffected**

Run:
```bash
php artisan test --compact
```
Expected: PASS (these files aren't bound in the container yet).

- [ ] **Step 5: Commit**

```bash
git add app/Http/Responses/LoginResponse.php app/Http/Responses/RegisterResponse.php app/Http/Responses/VerifiedResponse.php
git commit -m "Add custom Fortify responses for 2FA branching, onboarding redirect, and verified redirect"
```

---

### Task 4: Create FortifyServiceProvider and config/fortify.php

**Files:**
- Create: `app/Providers/FortifyServiceProvider.php`
- Create: `config/fortify.php`

**Interfaces:**
- Consumes: `App\Actions\Fortify\CreateNewUser`, `App\Actions\Fortify\ResetUserPassword` (Task 2); `App\Http\Responses\LoginResponse`, `RegisterResponse`, `VerifiedResponse` (Task 3)
- Produces: `App\Providers\FortifyServiceProvider` class — consumed by `bootstrap/providers.php` in Task 5 (registering it is what actually activates Fortify, deferred to that task so this one stays inert).

`config/fortify.php` only enables `registration`, `resetPasswords`, and `emailVerification` — deliberately omitting `twoFactorAuthentication` and `passkeys` (present in Resumo's version), since Resumegen keeps its own 2FA system and has no passkey support.

- [ ] **Step 1: Create `config/fortify.php`**

```php
<?php

use Laravel\Fortify\Features;

return [

    'guard' => 'web',

    'passwords' => 'users',

    'username' => 'email',

    'email' => 'email',

    'lowercase_usernames' => true,

    'home' => '/dashboard',

    'prefix' => '',

    'domain' => null,

    'middleware' => ['web'],

    'limiters' => [
        'login' => 'login',
    ],

    'views' => true,

    'features' => [
        Features::registration(),
        Features::resetPasswords(),
        Features::emailVerification(),
    ],

];
```

- [ ] **Step 2: Create `app/Providers/FortifyServiceProvider.php`, binding the Task 2/3 classes and pointing views at the existing `Auth/*.tsx` pages**

```php
<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Responses\LoginResponse;
use App\Http\Responses\RegisterResponse;
use App\Http\Responses\VerifiedResponse;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;
use Laravel\Fortify\Contracts\RegisterResponse as RegisterResponseContract;
use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;
use Laravel\Fortify\Features;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(LoginResponseContract::class, LoginResponse::class);
        $this->app->singleton(RegisterResponseContract::class, RegisterResponse::class);
        $this->app->singleton(VerifyEmailResponseContract::class, VerifiedResponse::class);
    }

    public function boot(): void
    {
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    private function configureActions(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
    }

    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('Auth/Login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(fn () => Inertia::render('Auth/Register'));

        Fortify::requestPasswordResetLinkView(fn (Request $request) => Inertia::render('Auth/ForgotPassword', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::resetPasswordView(fn (Request $request) => Inertia::render('Auth/ResetPassword', [
            'email' => $request->email,
            'token' => $request->route('token'),
        ]));

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('Auth/VerifyEmail', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::confirmPasswordView(fn () => Inertia::render('Auth/ConfirmPassword'));
    }

    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
```

- [ ] **Step 3: Confirm the app still boots and the existing suite is unaffected**

Run:
```bash
php artisan test --compact
```
Expected: PASS (the provider is not yet registered in `bootstrap/providers.php`, so `Fortify::loginView()` etc. never run and Fortify's own routes are never registered).

- [ ] **Step 4: Commit**

```bash
git add app/Providers/FortifyServiceProvider.php config/fortify.php
git commit -m "Add FortifyServiceProvider wiring actions, responses, views, and rate limiting"
```

---

### Task 5: Cutover — register Fortify, delete Breeze controllers, trim routes/auth.php

**Files:**
- Modify: `bootstrap/providers.php`
- Modify: `routes/auth.php`
- Delete: `app/Http/Controllers/Auth/RegisteredUserController.php`
- Delete: `app/Http/Controllers/Auth/AuthenticatedSessionController.php`
- Delete: `app/Http/Controllers/Auth/PasswordResetLinkController.php`
- Delete: `app/Http/Controllers/Auth/NewPasswordController.php`
- Delete: `app/Http/Controllers/Auth/EmailVerificationPromptController.php`
- Delete: `app/Http/Controllers/Auth/VerifyEmailController.php`
- Delete: `app/Http/Controllers/Auth/EmailVerificationNotificationController.php`
- Delete: `app/Http/Controllers/Auth/ConfirmablePasswordController.php`
- Delete: `app/Http/Requests/Auth/LoginRequest.php` (only consumer was `AuthenticatedSessionController`, confirmed via repo-wide search — safe to delete, not just orphan)

**Interfaces:**
- Consumes: everything from Tasks 2–4
- Produces: working Fortify-backed auth at the same routes/names Breeze used (`login`, `register`, `password.request`, `verification.notice`, `verification.verify`, `dashboard`, `onboarding.show`, `two-factor.challenge` — all pre-existing names, all still resolvable after this task)

This is the one task that can't be split further — Fortify and Breeze can't both register routes named `login`/`register`/etc. at once, so activating Fortify and removing Breeze's controllers has to happen together. The **existing** Auth test suite (`AuthenticationTest`, `RegistrationTest`, `PasswordResetTest`, `EmailVerificationTest`, `TwoFactorEnforcementTest`) is this task's test — it was written in Task 2–3's steps to describe exactly the behavior being preserved, so no new test is added; a failure here is a real regression, not a missing-test gap.

- [ ] **Step 1: Register `FortifyServiceProvider`**

Edit `bootstrap/providers.php`:
```php
<?php

use App\Providers\AppServiceProvider;
use App\Providers\FortifyServiceProvider;

return [
    AppServiceProvider::class,
    FortifyServiceProvider::class,
];
```

- [ ] **Step 2: Trim `routes/auth.php` to only the custom 2FA challenge routes**

Replace the full file content with:
```php
<?php

use App\Http\Controllers\Auth\TwoFactorChallengeController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('two-factor-challenge', [TwoFactorChallengeController::class, 'create'])
        ->name('two-factor.challenge');
    Route::post('two-factor-challenge', [TwoFactorChallengeController::class, 'store'])
        ->middleware('throttle:5,1')
        ->name('two-factor.challenge.store');
    Route::post('two-factor-challenge/email', [TwoFactorChallengeController::class, 'sendEmail'])
        ->middleware('throttle:3,1')
        ->name('two-factor.challenge.email');
});
```
(Login, register, password-reset, email-verification, and confirm-password routes are now registered automatically by Fortify's own service provider, based on the `features` array in `config/fortify.php`.)

- [ ] **Step 3: Delete the 8 superseded Breeze controllers and the now-unused `LoginRequest`**

```bash
git rm app/Http/Controllers/Auth/RegisteredUserController.php
git rm app/Http/Controllers/Auth/AuthenticatedSessionController.php
git rm app/Http/Controllers/Auth/PasswordResetLinkController.php
git rm app/Http/Controllers/Auth/NewPasswordController.php
git rm app/Http/Controllers/Auth/EmailVerificationPromptController.php
git rm app/Http/Controllers/Auth/VerifyEmailController.php
git rm app/Http/Controllers/Auth/EmailVerificationNotificationController.php
git rm app/Http/Controllers/Auth/ConfirmablePasswordController.php
git rm app/Http/Requests/Auth/LoginRequest.php
```

- [ ] **Step 4: Run the full Auth test suite**

Run:
```bash
php artisan test --compact tests/Feature/Auth
```
Expected: PASS — `AuthenticationTest`, `RegistrationTest`, `PasswordResetTest`, `EmailVerificationTest`, `TwoFactorSetupTest`, `TwoFactorEnforcementTest`, `PasswordUpdateTest` all green, with no changes to any of those test files. If anything fails, the failure identifies exactly which behavior diverges from Breeze's (route name, redirect target, session key, or validation message) — fix the relevant Task 2–4 file, not the test.

- [ ] **Step 5: Run the full suite**

Run:
```bash
php artisan test --compact
```
Expected: PASS.

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add bootstrap/providers.php routes/auth.php
git commit -m "Cut over auth to Fortify, removing superseded Breeze controllers"
```

---

### Task 6: Remove the unused laravel/breeze dependency and verify the frontend build

**Files:**
- Modify: `composer.json`

**Interfaces:** None — this is cleanup and verification, not new interface surface.

- [ ] **Step 1: Remove `laravel/breeze`**

Run:
```bash
composer remove laravel/breeze --dev
```

- [ ] **Step 2: Check for Inertia v2→v3 breaking changes against actual usage**

Run (via Laravel Boost's docs search, or directly):
```bash
grep -rn "usePage\|router\.\|<Form" resources/js --include=*.tsx -l | head -20
```
Cross-reference the files found against the Inertia v3 upgrade guide (`search-docs` tool, query: `["inertia v3 upgrade", "inertia breaking changes"]`, package `inertiajs/inertia-laravel`). Fix any breaking API usage found. (No specific breakage is predicted here — Resumegen's usage is all standard `usePage`, `router.post/patch/delete`, `<Link>` — but this must be checked against the actual installed v3 changelog, not assumed.)

- [ ] **Step 3: Build the frontend**

Run:
```bash
npm run build
```
Expected: builds with no TypeScript or Vite errors.

- [ ] **Step 4: Run the full test suite one more time**

Run:
```bash
php artisan test --compact
```
Expected: PASS.

- [ ] **Step 5: Rerun Dusk browser tests covering login/register**

Per `CLAUDE.md`'s Dusk requirements, in a second terminal:
```bash
php artisan serve --env=dusk.local --port=8001 --no-reload
```
Then:
```bash
php artisan migrate --env=dusk.local
php artisan dusk --filter=Login
php artisan dusk --filter=Registration
```
Expected: PASS. This exercises real browser session/cookie behavior that PHPUnit's `TestCase` doesn't. If no Dusk tests currently match those filters, do a manual smoke check instead: via Herd (`https://resumegen.test`), register a new account (lands on onboarding), log out, log back in (lands on dashboard), request a password reset email, and — if a 2FA-enabled test user exists — confirm login still routes through the two-factor challenge page.

- [ ] **Step 6: Commit**

```bash
git add composer.json composer.lock
git commit -m "Remove laravel/breeze now that Fortify has replaced its controllers"
```
