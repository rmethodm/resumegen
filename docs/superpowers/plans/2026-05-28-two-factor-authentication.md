# Two-Factor Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add TOTP-based 2FA to Resumegen — optional for free users, mandatory for Pro users, with recovery codes and email OTP fallback.

**Architecture:** Install `pragmarx/google2fa-laravel` for TOTP logic. Add three columns to `users`. Intercept login with a pending-challenge session flag, redirect to a dedicated challenge page. Add a 2FA panel to the Profile page for setup/disable/recovery code management. Two new middleware classes gate access for pending challenges and Pro enforcement.

**Tech Stack:** Laravel 13, `pragmarx/google2fa-laravel`, `bacon/bacon-qr-code` (QR SVG generation), Inertia.js v2, React 18, TypeScript, Tailwind CSS v3.

---

## File Map

**New files:**
- `database/migrations/2026_05_28_210000_add_two_factor_columns_to_users_table.php`
- `app/Http/Middleware/RequiresTwoFactorChallenge.php`
- `app/Http/Middleware/EnsureTwoFactorSetup.php`
- `app/Http/Controllers/Auth/TwoFactorChallengeController.php`
- `app/Http/Controllers/Auth/TwoFactorController.php`
- `app/Http/Controllers/Auth/ConfirmedTwoFactorController.php`
- `app/Http/Controllers/Auth/TwoFactorRecoveryCodesController.php`
- `resources/js/Pages/Auth/TwoFactorChallenge.tsx`
- `resources/js/Pages/Profile/Partials/TwoFactorForm.tsx`
- `tests/Feature/Auth/TwoFactorSetupTest.php`
- `tests/Feature/Auth/TwoFactorChallengeTest.php`
- `tests/Feature/Auth/TwoFactorEnforcementTest.php`

**Modified files:**
- `app/Models/User.php` — add `hasTwoFactorEnabled()`, `requiresTwoFactor()`, encrypted casts
- `app/Http/Controllers/Auth/AuthenticatedSessionController.php` — intercept login for 2FA-enabled users
- `app/Http/Controllers/ProfileController.php` — pass 2FA props to Profile/Edit
- `bootstrap/app.php` — register two new middleware aliases
- `routes/web.php` — add 2FA routes
- `routes/auth.php` — add challenge routes
- `resources/js/Pages/Profile/Edit.tsx` — add TwoFactorForm card
- `resources/js/types/index.d.ts` — add `two_factor_confirmed_at` to User interface

---

## Task 1: Install packages and run migration

**Files:**
- Create: `database/migrations/2026_05_28_210000_add_two_factor_columns_to_users_table.php`

- [ ] **Step 1: Install packages**

```bash
composer require pragmarx/google2fa-laravel bacon/bacon-qr-code
```

Expected: packages install without errors.

- [ ] **Step 2: Publish the google2fa config**

```bash
php artisan vendor:publish --provider="PragmaRX\Google2FALaravel\ServiceProvider"
```

Expected: `config/google2fa.php` created.

- [ ] **Step 3: Create the migration**

Create `database/migrations/2026_05_28_210000_add_two_factor_columns_to_users_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('two_factor_secret')->nullable()->after('password');
            $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
            $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'two_factor_secret',
                'two_factor_recovery_codes',
                'two_factor_confirmed_at',
            ]);
        });
    }
};
```

- [ ] **Step 4: Run the migration**

```bash
php artisan migrate
```

Expected: `Migrating: 2026_05_28_210000_add_two_factor_columns_to_users_table` then `Migrated`.

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_05_28_210000_add_two_factor_columns_to_users_table.php composer.json composer.lock config/google2fa.php
git commit -m "feat: install google2fa packages and add two_factor columns to users"
```

---

## Task 2: Update User model

**Files:**
- Modify: `app/Models/User.php`

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Auth/TwoFactorSetupTest.php`:

```php
<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TwoFactorSetupTest extends TestCase
{
    use RefreshDatabase;

    public function test_has_two_factor_enabled_returns_false_when_not_confirmed(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => null]);
        $this->assertFalse($user->hasTwoFactorEnabled());
    }

    public function test_has_two_factor_enabled_returns_true_when_confirmed(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);
        $this->assertTrue($user->hasTwoFactorEnabled());
    }

    public function test_requires_two_factor_true_for_pro_without_2fa(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => null,
        ]);
        $this->assertTrue($user->requiresTwoFactor());
    }

    public function test_requires_two_factor_false_for_pro_with_2fa(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => now(),
        ]);
        $this->assertFalse($user->requiresTwoFactor());
    }

    public function test_requires_two_factor_false_for_free_user(): void
    {
        $user = User::factory()->create([
            'is_pro' => false,
            'two_factor_confirmed_at' => null,
        ]);
        $this->assertFalse($user->requiresTwoFactor());
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
php artisan test tests/Feature/Auth/TwoFactorSetupTest.php
```

Expected: FAIL — `Call to undefined method ... hasTwoFactorEnabled()`

- [ ] **Step 3: Update User model**

Replace the contents of `app/Models/User.php`:

```php
<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;

#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'is_master_admin', 'is_pro'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, Billable;

    protected function casts(): array
    {
        return [
            'email_verified_at'         => 'datetime',
            'password'                  => 'hashed',
            'has_completed_onboarding'  => 'boolean',
            'is_master_admin'           => 'boolean',
            'is_pro'                    => 'boolean',
            'two_factor_secret'         => 'encrypted',
            'two_factor_recovery_codes' => 'encrypted:array',
            'two_factor_confirmed_at'   => 'datetime',
        ];
    }

    public function isPro(): bool
    {
        return $this->is_pro || $this->subscribed('default');
    }

    public function hasTwoFactorEnabled(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    public function requiresTwoFactor(): bool
    {
        return $this->isPro() && ! $this->hasTwoFactorEnabled();
    }

    public function resumes(): HasMany
    {
        return $this->hasMany(Resume::class);
    }

    public function coverLetters(): HasMany
    {
        return $this->hasMany(CoverLetter::class);
    }

    public function jobApplications(): HasMany
    {
        return $this->hasMany(JobApplication::class);
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
php artisan test tests/Feature/Auth/TwoFactorSetupTest.php --filter="test_has_two_factor_enabled|test_requires_two_factor"
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/Models/User.php tests/Feature/Auth/TwoFactorSetupTest.php
git commit -m "feat: add hasTwoFactorEnabled and requiresTwoFactor to User model"
```

---

## Task 3: Add two middleware classes

**Files:**
- Create: `app/Http/Middleware/RequiresTwoFactorChallenge.php`
- Create: `app/Http/Middleware/EnsureTwoFactorSetup.php`
- Modify: `bootstrap/app.php`

- [ ] **Step 1: Create RequiresTwoFactorChallenge middleware**

Create `app/Http/Middleware/RequiresTwoFactorChallenge.php`:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequiresTwoFactorChallenge
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->get('two_factor_auth_pending')) {
            return redirect()->route('two-factor.challenge');
        }

        return $next($request);
    }
}
```

- [ ] **Step 2: Create EnsureTwoFactorSetup middleware**

Create `app/Http/Middleware/EnsureTwoFactorSetup.php`:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTwoFactorSetup
{
    private array $excluded = [
        'profile.edit',
        'profile.update',
        'two-factor.challenge',
        'two-factor.challenge.store',
        'two-factor.challenge.email',
        'two-factor.enable',
        'two-factor.confirm',
        'two-factor.disable',
        'two-factor.recovery-codes',
        'logout',
        'password.confirm',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (in_array($request->route()->getName(), $this->excluded)) {
            return $next($request);
        }

        $user = $request->user();

        if ($user && $user->requiresTwoFactor()) {
            return redirect()->route('profile.edit')
                ->with('error', 'Pro users must enable two-factor authentication to continue.');
        }

        return $next($request);
    }
}
```

- [ ] **Step 3: Register middleware aliases in bootstrap/app.php**

In `bootstrap/app.php`, update the `withMiddleware` closure to add the two new aliases:

```php
$middleware->alias([
    'master_admin'         => \App\Http\Middleware\EnsureMasterAdmin::class,
    'two_factor_challenge' => \App\Http\Middleware\RequiresTwoFactorChallenge::class,
    'two_factor_setup'     => \App\Http\Middleware\EnsureTwoFactorSetup::class,
]);
```

- [ ] **Step 4: Write enforcement tests**

Add to `tests/Feature/Auth/TwoFactorEnforcementTest.php`:

```php
<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TwoFactorEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_pro_user_without_2fa_redirected_from_dashboard(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('profile.edit'));
    }

    public function test_pro_user_without_2fa_can_access_profile(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->get(route('profile.edit'))
            ->assertOk();
    }

    public function test_pro_user_with_2fa_enabled_can_access_dashboard(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_free_user_without_2fa_can_access_dashboard(): void
    {
        $user = User::factory()->create([
            'is_pro' => false,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertOk();
    }

    public function test_user_with_pending_2fa_challenge_redirected_to_challenge_page(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->get(route('dashboard'))
            ->assertRedirect(route('two-factor.challenge'));
    }

    public function test_pro_user_without_2fa_can_access_logout(): void
    {
        $user = User::factory()->create([
            'is_pro' => true,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->post(route('logout'))
            ->assertRedirect('/');
    }
}
```

- [ ] **Step 5: Apply middleware to auth routes in routes/web.php**

In `routes/web.php`, wrap the existing `Route::middleware('auth')->group(...)` to also apply the two new middleware:

```php
Route::middleware(['auth', 'two_factor_challenge', 'two_factor_setup'])->group(function () {
    // all existing auth routes remain here unchanged
});
```

- [ ] **Step 6: Run enforcement tests**

```bash
php artisan test tests/Feature/Auth/TwoFactorEnforcementTest.php
```

Expected: All 6 tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Middleware/RequiresTwoFactorChallenge.php app/Http/Middleware/EnsureTwoFactorSetup.php bootstrap/app.php routes/web.php tests/Feature/Auth/TwoFactorEnforcementTest.php
git commit -m "feat: add RequiresTwoFactorChallenge and EnsureTwoFactorSetup middleware"
```

---

## Task 4: Modify login to intercept 2FA-enabled users

**Files:**
- Modify: `app/Http/Controllers/Auth/AuthenticatedSessionController.php`

- [ ] **Step 1: Write the failing test**

Add these tests to `tests/Feature/Auth/TwoFactorChallengeTest.php`:

```php
<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TwoFactorChallengeTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_2fa_enabled_sets_pending_flag_and_redirects(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'password' => Hash::make('password'),
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertRedirect(route('two-factor.challenge'));

        $this->assertEquals(true, session('two_factor_auth_pending'));
    }

    public function test_login_without_2fa_enabled_proceeds_normally(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('password'),
            'two_factor_confirmed_at' => null,
        ]);

        $this->post(route('login'), [
            'email' => $user->email,
            'password' => 'password',
        ])
            ->assertRedirect(route('dashboard'));

        $this->assertNull(session('two_factor_auth_pending'));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
php artisan test tests/Feature/Auth/TwoFactorChallengeTest.php --filter="test_login_with_2fa_enabled|test_login_without_2fa_enabled"
```

Expected: FAIL — login always redirects to dashboard.

- [ ] **Step 3: Update AuthenticatedSessionController**

Replace `app/Http/Controllers/Auth/AuthenticatedSessionController.php`:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = Auth::user();

        if ($user->hasTwoFactorEnabled()) {
            $request->session()->put('two_factor_auth_pending', true);
            return redirect()->route('two-factor.challenge');
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
php artisan test tests/Feature/Auth/TwoFactorChallengeTest.php --filter="test_login_with_2fa_enabled|test_login_without_2fa_enabled"
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/Auth/AuthenticatedSessionController.php tests/Feature/Auth/TwoFactorChallengeTest.php
git commit -m "feat: intercept login for 2FA-enabled users and set pending session flag"
```

---

## Task 5: Add routes for 2FA challenge and setup

**Files:**
- Modify: `routes/auth.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Add challenge routes to routes/auth.php**

Add these routes inside the `Route::middleware('auth')->group` in `routes/auth.php`:

```php
// Two-factor challenge — excluded from 2FA middleware by name in EnsureTwoFactorSetup
Route::get('two-factor-challenge', [\App\Http\Controllers\Auth\TwoFactorChallengeController::class, 'create'])
    ->name('two-factor.challenge');
Route::post('two-factor-challenge', [\App\Http\Controllers\Auth\TwoFactorChallengeController::class, 'store'])
    ->middleware('throttle:5,1')
    ->name('two-factor.challenge.store');
Route::post('two-factor-challenge/email', [\App\Http\Controllers\Auth\TwoFactorChallengeController::class, 'sendEmail'])
    ->middleware('throttle:3,1')
    ->name('two-factor.challenge.email');
```

- [ ] **Step 2: Add setup routes to routes/web.php**

Add these routes inside the `auth` middleware group in `routes/web.php` (they are listed in `EnsureTwoFactorSetup::$excluded` so they are accessible even when 2FA is not yet set up):

```php
Route::post('/user/two-factor-authentication', [\App\Http\Controllers\Auth\TwoFactorController::class, 'store'])
    ->name('two-factor.enable');
Route::post('/user/confirmed-two-factor-authentication', [\App\Http\Controllers\Auth\ConfirmedTwoFactorController::class, 'store'])
    ->name('two-factor.confirm');
Route::delete('/user/two-factor-authentication', [\App\Http\Controllers\Auth\TwoFactorController::class, 'destroy'])
    ->name('two-factor.disable');
Route::post('/user/two-factor-recovery-codes', [\App\Http\Controllers\Auth\TwoFactorRecoveryCodesController::class, 'store'])
    ->name('two-factor.recovery-codes');
```

- [ ] **Step 3: Verify routes are registered**

```bash
php artisan route:list --name=two-factor
```

Expected: 7 routes listed for `two-factor.*`.

- [ ] **Step 4: Commit**

```bash
git add routes/auth.php routes/web.php
git commit -m "feat: register 2FA challenge and setup routes"
```

---

## Task 6: TwoFactorChallengeController

**Files:**
- Create: `app/Http/Controllers/Auth/TwoFactorChallengeController.php`

- [ ] **Step 1: Write the failing tests**

Add these to `tests/Feature/Auth/TwoFactorChallengeTest.php`:

```php
    public function test_challenge_page_requires_pending_flag(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);

        $this->actingAs($user)
            ->get(route('two-factor.challenge'))
            ->assertRedirect(route('dashboard'));
    }

    public function test_challenge_page_renders_with_pending_flag(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->get(route('two-factor.challenge'))
            ->assertInertia(fn ($page) => $page->component('Auth/TwoFactorChallenge'));
    }

    public function test_valid_totp_code_clears_pending_flag_and_redirects(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $code = $google2fa->getCurrentOtp($secret);

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => $code])
            ->assertRedirect(route('dashboard'));

        $this->assertNull(session('two_factor_auth_pending'));
    }

    public function test_invalid_totp_code_returns_error(): void
    {
        $google2fa = new Google2FA();
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ]);

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => '000000'])
            ->assertSessionHasErrors('code');
    }

    public function test_valid_recovery_code_is_consumed(): void
    {
        $plainCodes = ['AAAA-BBBB-CC', 'DDDD-EEEE-FF'];
        $hashedCodes = array_map(fn ($c) => bcrypt($c), $plainCodes);

        $user = User::factory()->create([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $hashedCodes,
        ]);

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => 'AAAA-BBBB-CC'])
            ->assertRedirect(route('dashboard'));

        $user->refresh();
        $this->assertCount(1, $user->two_factor_recovery_codes);
    }

    public function test_used_recovery_code_cannot_be_reused(): void
    {
        $plain = 'AAAA-BBBB-CC';
        $user = User::factory()->create([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [bcrypt($plain)],
        ]);

        // First use — succeeds
        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => $plain]);

        $user->refresh();

        // Second use — fails (code was consumed)
        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.store'), ['code' => $plain])
            ->assertSessionHasErrors('code');
    }

    public function test_email_otp_is_stored_in_cache_and_sent(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => now()]);

        \Illuminate\Support\Facades\Mail::fake();
        \Illuminate\Support\Facades\Cache::shouldReceive('put')->once();

        $this->actingAs($user)
            ->withSession(['two_factor_auth_pending' => true])
            ->post(route('two-factor.challenge.email'))
            ->assertRedirect(route('two-factor.challenge'))
            ->assertSessionHas('two_factor_email_sent', true);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
php artisan test tests/Feature/Auth/TwoFactorChallengeTest.php
```

Expected: FAIL — controller class not found.

- [ ] **Step 3: Create TwoFactorChallengeController**

Create `app/Http/Controllers/Auth/TwoFactorChallengeController.php`:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\TwoFactorCodeMail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorChallengeController extends Controller
{
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->get('two_factor_auth_pending')) {
            return redirect()->route('dashboard');
        }

        return Inertia::render('Auth/TwoFactorChallenge', [
            'emailSent' => session('two_factor_email_sent', false),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        if (! $request->session()->get('two_factor_auth_pending')) {
            return redirect()->route('dashboard');
        }

        $request->validate(['code' => ['required', 'string']]);

        $user = $request->user();
        $code = $request->input('code');

        // Recovery code path (longer than 6 chars)
        if (strlen($code) > 6) {
            $codes = $user->two_factor_recovery_codes ?? [];
            $matched = null;

            foreach ($codes as $index => $hashed) {
                if (Hash::check($code, $hashed)) {
                    $matched = $index;
                    break;
                }
            }

            if ($matched === null) {
                throw ValidationException::withMessages(['code' => 'The provided code was invalid.']);
            }

            unset($codes[$matched]);
            $user->two_factor_recovery_codes = array_values($codes);
            $user->save();

            $request->session()->forget('two_factor_auth_pending');

            if (count($user->two_factor_recovery_codes) < 2) {
                return redirect()->intended(route('dashboard'))
                    ->with('error', 'You have fewer than 2 recovery codes left — regenerate them in your profile.');
            }

            return redirect()->intended(route('dashboard'));
        }

        // Email OTP path
        $cachedOtp = Cache::get('2fa_email_otp_' . $user->id);
        if ($cachedOtp && $code === $cachedOtp) {
            Cache::forget('2fa_email_otp_' . $user->id);
            $request->session()->forget('two_factor_auth_pending');
            return redirect()->intended(route('dashboard'));
        }

        // TOTP path
        $google2fa = new Google2FA();
        $valid = $google2fa->verifyKey($user->two_factor_secret, $code);

        if (! $valid) {
            throw ValidationException::withMessages(['code' => 'The provided code was invalid.']);
        }

        $request->session()->forget('two_factor_auth_pending');

        return redirect()->intended(route('dashboard'));
    }

    public function sendEmail(Request $request): RedirectResponse
    {
        if (! $request->session()->get('two_factor_auth_pending')) {
            return redirect()->route('dashboard');
        }

        $user = $request->user();
        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        Cache::put('2fa_email_otp_' . $user->id, $otp, now()->addMinutes(10));

        Mail::to($user->email)->send(new TwoFactorCodeMail($otp));

        return redirect()->route('two-factor.challenge')
            ->with('two_factor_email_sent', true);
    }
}
```

- [ ] **Step 4: Create the TwoFactorCodeMail mailable**

Create `app/Mail/TwoFactorCodeMail.php`:

```php
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TwoFactorCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public readonly string $code) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your Resumegen login code');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.two-factor-code');
    }
}
```

Create `resources/views/emails/two-factor-code.blade.php`:

```blade
<p>Your Resumegen two-factor authentication code is:</p>
<p style="font-size: 2rem; font-weight: bold; letter-spacing: 0.2rem;">{{ $code }}</p>
<p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
```

- [ ] **Step 5: Run challenge tests**

```bash
php artisan test tests/Feature/Auth/TwoFactorChallengeTest.php
```

Expected: All tests pass. (The `test_email_otp_is_stored_in_cache_and_sent` test uses `Mail::fake()` — adjust if needed.)

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Auth/TwoFactorChallengeController.php app/Mail/TwoFactorCodeMail.php resources/views/emails/two-factor-code.blade.php
git commit -m "feat: add TwoFactorChallengeController with TOTP, recovery code, and email OTP verification"
```

---

## Task 7: 2FA setup controllers

**Files:**
- Create: `app/Http/Controllers/Auth/TwoFactorController.php`
- Create: `app/Http/Controllers/Auth/ConfirmedTwoFactorController.php`
- Create: `app/Http/Controllers/Auth/TwoFactorRecoveryCodesController.php`

- [ ] **Step 1: Write the failing tests**

Add these tests to `tests/Feature/Auth/TwoFactorSetupTest.php`:

```php
    public function test_enable_generates_secret_but_not_confirmed(): void
    {
        $user = User::factory()->create(['two_factor_confirmed_at' => null]);

        $this->actingAs($user)
            ->post(route('two-factor.enable'))
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertNotNull($user->two_factor_secret);
        $this->assertNull($user->two_factor_confirmed_at);
    }

    public function test_confirm_with_valid_code_sets_confirmed_at_and_generates_recovery_codes(): void
    {
        $google2fa = new \PragmaRX\Google2FA\Google2FA();
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
        ]);

        $code = $google2fa->getCurrentOtp($secret);

        $this->actingAs($user)
            ->post(route('two-factor.confirm'), ['code' => $code])
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertNotNull($user->two_factor_confirmed_at);
        $this->assertCount(8, $user->two_factor_recovery_codes);
    }

    public function test_confirm_with_invalid_code_returns_error(): void
    {
        $google2fa = new \PragmaRX\Google2FA\Google2FA();
        $secret = $google2fa->generateSecretKey();

        $user = User::factory()->create([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
        ]);

        $this->actingAs($user)
            ->post(route('two-factor.confirm'), ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $user->refresh();
        $this->assertNull($user->two_factor_confirmed_at);
    }

    public function test_disable_requires_password_confirmation(): void
    {
        $user = User::factory()->create([
            'two_factor_confirmed_at' => now(),
        ]);

        // No password confirmed in session — should redirect to confirm password
        $this->actingAs($user)
            ->delete(route('two-factor.disable'))
            ->assertRedirect(route('password.confirm'));
    }

    public function test_disable_with_confirmed_password_clears_2fa(): void
    {
        $user = User::factory()->create([
            'two_factor_secret' => 'somesecret',
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [bcrypt('code1')],
        ]);

        $this->actingAs($user)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->delete(route('two-factor.disable'))
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertNull($user->two_factor_secret);
        $this->assertNull($user->two_factor_confirmed_at);
        $this->assertNull($user->two_factor_recovery_codes);
    }

    public function test_regenerate_recovery_codes_replaces_existing(): void
    {
        $user = User::factory()->create([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => [bcrypt('old-code')],
        ]);

        $this->actingAs($user)
            ->post(route('two-factor.recovery-codes'))
            ->assertRedirect(route('profile.edit'));

        $user->refresh();
        $this->assertCount(8, $user->two_factor_recovery_codes);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
php artisan test tests/Feature/Auth/TwoFactorSetupTest.php
```

Expected: FAIL — controller classes not found.

- [ ] **Step 3: Create TwoFactorController**

Create `app/Http/Controllers/Auth/TwoFactorController.php`:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $google2fa = new Google2FA();
        $user = $request->user();

        $user->two_factor_secret = $google2fa->generateSecretKey();
        $user->two_factor_confirmed_at = null;
        $user->save();

        return redirect()->route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        if (! $request->session()->passwordConfirmed()) {
            return redirect()->route('password.confirm');
        }

        $user = $request->user();
        $user->two_factor_secret = null;
        $user->two_factor_recovery_codes = null;
        $user->two_factor_confirmed_at = null;
        $user->save();

        return redirect()->route('profile.edit');
    }
}
```

- [ ] **Step 4: Create ConfirmedTwoFactorController**

Create `app/Http/Controllers/Auth/ConfirmedTwoFactorController.php`:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;

class ConfirmedTwoFactorController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string', 'size:6']]);

        $user = $request->user();
        $google2fa = new Google2FA();

        if (! $google2fa->verifyKey($user->two_factor_secret, $request->input('code'))) {
            throw ValidationException::withMessages(['code' => 'The provided code was invalid.']);
        }

        $plainCodes = [];
        $hashedCodes = [];

        for ($i = 0; $i < 8; $i++) {
            $plain = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 5))
                . '-'
                . strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 5));
            $plainCodes[] = $plain;
            $hashedCodes[] = bcrypt($plain);
        }

        $user->two_factor_confirmed_at = now();
        $user->two_factor_recovery_codes = $hashedCodes;
        $user->save();

        return redirect()->route('profile.edit')
            ->with('two_factor_recovery_codes', $plainCodes);
    }
}
```

- [ ] **Step 5: Create TwoFactorRecoveryCodesController**

Create `app/Http/Controllers/Auth/TwoFactorRecoveryCodesController.php`:

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class TwoFactorRecoveryCodesController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $plainCodes = [];
        $hashedCodes = [];

        for ($i = 0; $i < 8; $i++) {
            $plain = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 5))
                . '-'
                . strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 5));
            $plainCodes[] = $plain;
            $hashedCodes[] = bcrypt($plain);
        }

        $user = $request->user();
        $user->two_factor_recovery_codes = $hashedCodes;
        $user->save();

        return redirect()->route('profile.edit')
            ->with('two_factor_recovery_codes', $plainCodes);
    }
}
```

- [ ] **Step 6: Run setup tests**

```bash
php artisan test tests/Feature/Auth/TwoFactorSetupTest.php
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/Auth/TwoFactorController.php app/Http/Controllers/Auth/ConfirmedTwoFactorController.php app/Http/Controllers/Auth/TwoFactorRecoveryCodesController.php
git commit -m "feat: add TwoFactorController, ConfirmedTwoFactorController, TwoFactorRecoveryCodesController"
```

---

## Task 8: Update ProfileController to pass 2FA props

**Files:**
- Modify: `app/Http/Controllers/ProfileController.php`

- [ ] **Step 1: Update ProfileController@edit**

Replace `app/Http/Controllers/ProfileController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;
use PragmaRX\Google2FA\Google2FA;

class ProfileController extends Controller
{
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $google2fa = new Google2FA();

        $qrCodeSvg = null;
        if ($user->two_factor_secret && ! $user->hasTwoFactorEnabled()) {
            $qrCodeUrl = $google2fa->getQRCodeUrl(
                config('app.name'),
                $user->email,
                $user->two_factor_secret
            );
            $writer = new \BaconQrCode\Writer(new \BaconQrCode\Renderer\ImageRenderer(
                new \BaconQrCode\Renderer\RendererStyle\RendererStyle(200),
                new \BaconQrCode\Renderer\Image\SvgImageBackEnd()
            ));
            $qrCodeSvg = $writer->writeString($qrCodeUrl);
        }

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail'       => $user instanceof MustVerifyEmail,
            'status'                => session('status'),
            'twoFactor' => [
                'enabled'        => $user->hasTwoFactorEnabled(),
                'pending'        => $user->two_factor_secret !== null && ! $user->hasTwoFactorEnabled(),
                'qrCodeSvg'      => $qrCodeSvg,
                'recoveryCodes'  => session('two_factor_recovery_codes'),
            ],
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
```

- [ ] **Step 2: Verify profile page still loads**

```bash
php artisan test tests/Feature/ProfileTest.php
```

Expected: All existing profile tests pass.

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/ProfileController.php
git commit -m "feat: pass 2FA state and QR code SVG as Inertia props to Profile/Edit"
```

---

## Task 9: Frontend — TwoFactorChallenge page

**Files:**
- Create: `resources/js/Pages/Auth/TwoFactorChallenge.tsx`

- [ ] **Step 1: Add route name to Ziggy types (if needed)**

Run the dev server once to regenerate Ziggy routes, or check that `route('two-factor.challenge')` is available. The routes were registered in Task 5.

- [ ] **Step 2: Create the challenge page**

Create `resources/js/Pages/Auth/TwoFactorChallenge.tsx`:

```tsx
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type Mode = 'totp' | 'recovery' | 'email';

export default function TwoFactorChallenge({ emailSent }: { emailSent: boolean }) {
    const [mode, setMode] = useState<Mode>('totp');
    const { data, setData, post, processing, errors } = useForm({ code: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('two-factor.challenge.store'));
    };

    const sendEmail = () => {
        router.post(route('two-factor.challenge.email'), {}, {
            onSuccess: () => setMode('email'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Two-Factor Authentication" />

            <div className="mb-4 text-sm text-gray-600">
                {mode === 'recovery'
                    ? 'Enter one of your emergency recovery codes.'
                    : mode === 'email'
                    ? 'Enter the 6-digit code sent to your email address.'
                    : 'Enter the 6-digit code from your authenticator app.'}
            </div>

            {emailSent && mode !== 'email' && (
                <div className="mb-4 text-sm text-green-600">
                    A code has been sent to your email.
                </div>
            )}

            <form onSubmit={submit}>
                {mode === 'recovery' ? (
                    <TextInput
                        id="code"
                        type="text"
                        name="code"
                        value={data.code}
                        className="mt-1 block w-full"
                        autoComplete="off"
                        isFocused
                        onChange={(e) => setData('code', e.target.value)}
                        placeholder="XXXXX-XXXXX"
                    />
                ) : (
                    <TextInput
                        id="code"
                        type="text"
                        inputMode="numeric"
                        name="code"
                        value={data.code}
                        className="mt-1 block w-full tracking-widest text-center text-xl"
                        autoComplete="one-time-code"
                        isFocused
                        maxLength={6}
                        onChange={(e) => setData('code', e.target.value)}
                        placeholder="000000"
                    />
                )}

                <InputError message={errors.code} className="mt-2" />

                <div className="mt-4 flex items-center justify-end">
                    <PrimaryButton disabled={processing}>Verify</PrimaryButton>
                </div>
            </form>

            <div className="mt-4 space-y-2 text-sm text-center">
                {mode !== 'recovery' && (
                    <button
                        type="button"
                        className="text-gray-600 underline hover:text-gray-900"
                        onClick={() => setMode('recovery')}
                    >
                        Use a recovery code instead
                    </button>
                )}
                {mode === 'recovery' && (
                    <button
                        type="button"
                        className="text-gray-600 underline hover:text-gray-900"
                        onClick={() => setMode('totp')}
                    >
                        Use authenticator app instead
                    </button>
                )}
                {mode !== 'email' && (
                    <div>
                        <button
                            type="button"
                            className="text-gray-600 underline hover:text-gray-900"
                            onClick={sendEmail}
                        >
                            Send code to my email instead
                        </button>
                    </div>
                )}
                <div>
                    <a
                        href={route('logout')}
                        onClick={(e) => {
                            e.preventDefault();
                            router.post(route('logout'));
                        }}
                        className="text-gray-600 underline hover:text-gray-900"
                    >
                        Sign out
                    </a>
                </div>
            </div>
        </GuestLayout>
    );
}
```

- [ ] **Step 3: Build frontend**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Auth/TwoFactorChallenge.tsx
git commit -m "feat: add TwoFactorChallenge page component"
```

---

## Task 10: Frontend — TwoFactorForm profile partial

**Files:**
- Create: `resources/js/Pages/Profile/Partials/TwoFactorForm.tsx`
- Modify: `resources/js/Pages/Profile/Edit.tsx`
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Update User TypeScript interface**

In `resources/js/types/index.d.ts`, update the `User` interface to add:

```ts
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    is_master_admin: boolean;
    is_pro: boolean;
    two_factor_confirmed_at: string | null;
}
```

- [ ] **Step 2: Create TwoFactorForm partial**

Create `resources/js/Pages/Profile/Partials/TwoFactorForm.tsx`:

```tsx
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

interface Props {
    enabled: boolean;
    pending: boolean;
    qrCodeSvg: string | null;
    recoveryCodes: string[] | null;
    className?: string;
}

export default function TwoFactorForm({ enabled, pending, qrCodeSvg, recoveryCodes, className = '' }: Props) {
    const enableForm = useForm({});
    const confirmForm = useForm({ code: '' });
    const disableForm = useForm({});
    const regenForm = useForm({});
    const [copied, setCopied] = useState(false);

    const handleEnable: FormEventHandler = (e) => {
        e.preventDefault();
        enableForm.post(route('two-factor.enable'), { preserveScroll: true });
    };

    const handleConfirm: FormEventHandler = (e) => {
        e.preventDefault();
        confirmForm.post(route('two-factor.confirm'), { preserveScroll: true });
    };

    const handleDisable: FormEventHandler = (e) => {
        e.preventDefault();
        disableForm.delete(route('two-factor.disable'), { preserveScroll: true });
    };

    const handleRegen: FormEventHandler = (e) => {
        e.preventDefault();
        regenForm.post(route('two-factor.recovery-codes'), { preserveScroll: true });
    };

    const copyAll = () => {
        if (recoveryCodes) {
            navigator.clipboard.writeText(recoveryCodes.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Add extra security to your account using a time-based one-time password.
                </p>
            </header>

            {/* State 1: Disabled */}
            {!enabled && !pending && (
                <form onSubmit={handleEnable} className="mt-6">
                    <PrimaryButton disabled={enableForm.processing}>
                        Enable Two-Factor Authentication
                    </PrimaryButton>
                </form>
            )}

            {/* State 2: Pending confirmation */}
            {pending && qrCodeSvg && (
                <div className="mt-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        Scan this QR code with your authenticator app, then enter the 6-digit code below to confirm.
                    </p>
                    <div
                        className="inline-block rounded border border-gray-200 p-2"
                        dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
                    />
                    <form onSubmit={handleConfirm} className="space-y-4">
                        <div>
                            <InputLabel htmlFor="confirm_code" value="Confirmation Code" />
                            <TextInput
                                id="confirm_code"
                                type="text"
                                inputMode="numeric"
                                value={confirmForm.data.code}
                                onChange={(e) => confirmForm.setData('code', e.target.value)}
                                className="mt-1 block w-40 tracking-widest text-center text-xl"
                                maxLength={6}
                                placeholder="000000"
                                autoComplete="one-time-code"
                            />
                            <InputError message={confirmForm.errors.code} className="mt-2" />
                        </div>
                        <PrimaryButton disabled={confirmForm.processing}>Confirm</PrimaryButton>
                    </form>
                </div>
            )}

            {/* State 3: Enabled */}
            {enabled && (
                <div className="mt-6 space-y-6">
                    <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-0.5 text-sm font-medium text-green-800">
                            Enabled
                        </span>
                        <span className="text-sm text-gray-600">Two-factor authentication is active.</span>
                    </div>

                    {/* Recovery codes display (shown once after confirm or regen) */}
                    {recoveryCodes && recoveryCodes.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Recovery Codes</p>
                            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                                Save these somewhere safe — they won't be shown again.
                            </p>
                            <pre className="rounded bg-gray-100 p-4 text-sm font-mono leading-relaxed">
                                {recoveryCodes.join('\n')}
                            </pre>
                            <button
                                type="button"
                                onClick={copyAll}
                                className="text-sm text-indigo-600 underline hover:text-indigo-800"
                            >
                                {copied ? 'Copied!' : 'Copy all'}
                            </button>
                        </div>
                    )}

                    <div className="flex gap-4">
                        <form onSubmit={handleRegen}>
                            <button
                                type="submit"
                                className="text-sm text-gray-600 underline hover:text-gray-900"
                                disabled={regenForm.processing}
                            >
                                Regenerate recovery codes
                            </button>
                        </form>

                        <form onSubmit={handleDisable}>
                            <button
                                type="submit"
                                className="text-sm text-red-600 underline hover:text-red-800"
                                disabled={disableForm.processing}
                            >
                                Disable 2FA
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}
```

- [ ] **Step 3: Add TwoFactorForm to Profile/Edit.tsx**

In `resources/js/Pages/Profile/Edit.tsx`, import and add the new card below the password card:

```tsx
import TwoFactorForm from './Partials/TwoFactorForm';
```

Update the component props type and add the new card:

```tsx
export default function Edit({
    mustVerifyEmail,
    status,
    twoFactor,
}: PageProps<{
    mustVerifyEmail: boolean;
    status?: string;
    twoFactor: {
        enabled: boolean;
        pending: boolean;
        qrCodeSvg: string | null;
        recoveryCodes: string[] | null;
    };
}>) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Profile
                </h2>
            }
        >
            <Head title="Profile" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">
                        <UpdatePasswordForm className="max-w-xl" />
                    </div>

                    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">
                        <TwoFactorForm
                            enabled={twoFactor.enabled}
                            pending={twoFactor.pending}
                            qrCodeSvg={twoFactor.qrCodeSvg}
                            recoveryCodes={twoFactor.recoveryCodes}
                            className="max-w-xl"
                        />
                    </div>

                    <div className="bg-white p-4 shadow sm:rounded-lg sm:p-8">
                        <DeleteUserForm className="max-w-xl" />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 4: Build frontend**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Profile/Partials/TwoFactorForm.tsx resources/js/Pages/Profile/Edit.tsx resources/js/types/index.d.ts
git commit -m "feat: add TwoFactorForm partial and wire into Profile/Edit"
```

---

## Task 11: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
composer run test
```

Expected: All tests pass, no regressions.

- [ ] **Step 2: Run type check**

```bash
npm run build
```

Expected: No TypeScript errors.

- [ ] **Step 3: Smoke test manually**

Start the dev server:
```bash
composer run dev
```

Walk through:
1. Log in as a free user — confirm no 2FA prompts, dashboard loads normally.
2. Go to Profile — confirm "Enable Two-Factor Authentication" button appears.
3. Enable 2FA — scan QR code with an authenticator app, enter code, confirm.
4. Verify recovery codes are shown once. Copy them.
5. Log out, log back in — confirm you land on `/two-factor-challenge`.
6. Enter the TOTP code — confirm redirect to dashboard.
7. Log out, log back in — use a recovery code instead. Confirm it's consumed.
8. Go to Profile — regenerate recovery codes, confirm new set shown.
9. Disable 2FA — confirm password prompt, confirm 2FA cleared.
10. Mark user as Pro, log out, log in — confirm redirected to profile with enforcement message. Enable 2FA — confirm enforcement lifted.
