# Billing & Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe-backed Free/Pro subscriptions — free users get 5 resumes, Pro ($5/mo or $49/yr) gets unlimited.

**Architecture:** Laravel Cashier handles subscription state via the `Billable` trait on `User`. A `BillingController` creates Stripe Checkout and Customer Portal sessions. `ResumeBuilderController::store()` enforces the resume limit with a redirect. A new `Billing/Index.tsx` Inertia page shows plan status with the approved side-by-side card layout.

**Tech Stack:** Laravel 13, PHP 8.3, `laravel/cashier-stripe`, Stripe Checkout + Customer Portal, React 18, TypeScript, Inertia.js v2, Tailwind CSS v3, PHPUnit (`php artisan test`), Ziggy.

---

## File Map

| Path | Action | Responsibility |
|------|--------|----------------|
| `composer.json` | Modify | Add `laravel/cashier-stripe` |
| `database/migrations/..._add_cashier_columns_to_users_table.php` | Create (published) | Stripe billing columns on users |
| `app/Models/User.php` | Modify | Add `Billable` trait, update `#[Fillable]` |
| `config/cashier.php` | Create (published) | Cashier config |
| `config/services.php` | Modify | Add Stripe price IDs |
| `bootstrap/app.php` | Modify | Exempt `/stripe/webhook` from CSRF |
| `app/Http/Controllers/BillingController.php` | Create | `index`, `checkout`, `portal` actions |
| `routes/web.php` | Modify | Add billing routes + `Cashier::routes()` |
| `app/Http/Controllers/ResumeBuilderController.php` | Modify | Enforce resume limit in `store()` |
| `resources/js/Pages/Billing/Index.tsx` | Create | Plan status + upgrade UI |
| `resources/js/Layouts/AuthenticatedLayout.tsx` | Modify | Add Billing nav link |
| `resources/js/Pages/ResumeBuilder/Index.tsx` | Modify | Disable new-resume button at limit |
| `tests/Feature/BillingTest.php` | Create | Feature tests for billing flows |

---

## Task 1: Install Laravel Cashier

**Files:**
- Modify: `composer.json`
- Create: `database/migrations/..._add_cashier_columns_to_users_table.php` (published)
- Create: `config/cashier.php` (published)

- [ ] **Step 1: Require the package**

Run: `composer require laravel/cashier`
Expected: Cashier installs cleanly. `composer.json` gains `"laravel/cashier": "^15.x"` (or latest).

- [ ] **Step 2: Publish Cashier assets**

Run: `php artisan vendor:publish --tag="cashier-migrations"`
Expected: A migration file appears in `database/migrations/` named something like `2019_05_03_000001_create_customer_columns.php` and `2019_05_03_000002_create_subscriptions_table.php`.

- [ ] **Step 3: Run the migrations**

Run: `php artisan migrate`
Expected: `INFO Running migrations.` with green lines for the new Cashier tables/columns.

- [ ] **Step 4: Verify migration columns exist**

Run: `php artisan tinker --execute="echo implode(', ', array_keys((array) DB::table('users')->first()));"`
Expected: Output includes `stripe_id`, `pm_type`, `pm_last_four`, `trial_ends_at`.

- [ ] **Step 5: Commit**

```bash
git add composer.json composer.lock database/migrations/
git commit -m "feat: install laravel/cashier-stripe"
```

---

## Task 2: Configure Cashier + Stripe services

**Files:**
- Modify: `config/services.php`
- Modify: `.env` (instructions only — not committed)
- Modify: `bootstrap/app.php`

- [ ] **Step 1: Add Stripe price IDs to config/services.php**

Open `config/services.php` and add at the end of the array:

```php
    'stripe' => [
        'monthly_price_id' => env('STRIPE_MONTHLY_PRICE_ID'),
        'yearly_price_id'  => env('STRIPE_YEARLY_PRICE_ID'),
    ],
```

- [ ] **Step 2: Add env vars to .env**

Add these lines to `.env` (fill in real values from your Stripe dashboard):

```
STRIPE_KEY=pk_test_...
STRIPE_SECRET=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
CASHIER_CURRENCY=usd
```

- [ ] **Step 3: Exempt webhook from CSRF**

Open `bootstrap/app.php`. Find the `->withMiddleware(function (Middleware $middleware)` block and add the CSRF exception:

```php
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'stripe/webhook',
        ]);
    })
```

- [ ] **Step 4: Verify config loads**

Run: `php artisan tinker --execute="echo config('services.stripe.monthly_price_id') ?: 'not set';"`
Expected: Prints your price ID (or `not set` if `.env` not yet filled — that's fine for now).

- [ ] **Step 5: Commit**

```bash
git add config/services.php bootstrap/app.php
git commit -m "feat: configure Stripe/Cashier env and CSRF exemption"
```

---

## Task 3: Add Billable trait to User model

**Files:**
- Modify: `app/Models/User.php`

- [ ] **Step 1: Read the current User.php**

Read `app/Models/User.php` to confirm current imports and `#[Fillable]` attribute.

- [ ] **Step 2: Update User.php**

Replace the file contents with:

```php
<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;

#[Fillable(['name', 'email', 'password', 'has_completed_onboarding'])]
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
        ];
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

- [ ] **Step 3: Verify tinker**

Run: `php artisan tinker --execute="echo method_exists(new App\Models\User, 'subscribed') ? 'ok' : 'missing';"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add app/Models/User.php
git commit -m "feat: add Billable trait to User model"
```

---

## Task 4: Write failing BillingTest (RED)

**Files:**
- Create: `tests/Feature/BillingTest.php`

- [ ] **Step 1: Create the test file**

Create `tests/Feature/BillingTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_view_billing_page(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('billing.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Billing/Index'));
    }

    public function test_guest_cannot_view_billing_page(): void
    {
        $this->get(route('billing.index'))
            ->assertRedirect(route('login'));
    }

    public function test_free_user_at_limit_is_redirected_when_creating_resume(): void
    {
        $user = User::factory()->create();
        for ($i = 0; $i < 5; $i++) {
            $user->resumes()->create(['name' => "Resume $i", 'pdf_filename' => "$i.pdf"]);
        }

        $this->actingAs($user)
            ->post(route('builder.store'), ['name' => 'Sixth Resume'])
            ->assertRedirect(route('billing.index'));
    }

    public function test_free_user_under_limit_can_create_resume(): void
    {
        $user = User::factory()->create();
        $user->resumes()->create(['name' => 'Existing', 'pdf_filename' => 'e.pdf']);

        $this->actingAs($user)
            ->post(route('builder.store'), ['name' => 'New Resume'])
            ->assertRedirect();

        $this->assertSame(2, $user->resumes()->count());
    }

    public function test_billing_page_passes_free_plan_data_for_unsubscribed_user(): void
    {
        $user = User::factory()->create();
        $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->actingAs($user)
            ->get(route('billing.index'))
            ->assertInertia(fn ($page) => $page
                ->where('plan', 'free')
                ->where('resumeCount', 1)
                ->where('resumeLimit', 5)
            );
    }
}
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `php artisan test --filter=BillingTest`
Expected: FAIL — `Route [billing.index] not defined.`

---

## Task 5: Create BillingController and routes (GREEN)

**Files:**
- Create: `app/Http/Controllers/BillingController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Create the controller**

Create `app/Http/Controllers/BillingController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $subscribed = $user->subscribed('default');

        return Inertia::render('Billing/Index', [
            'plan'        => $subscribed ? 'pro' : 'free',
            'resumeCount' => $user->resumes()->count(),
            'resumeLimit' => $subscribed ? null : 5,
            'limitReached' => session('limitReached', false),
        ]);
    }

    public function checkout(Request $request): RedirectResponse
    {
        $request->validate(['interval' => ['required', 'in:monthly,yearly']]);

        $priceId = $request->interval === 'yearly'
            ? config('services.stripe.yearly_price_id')
            : config('services.stripe.monthly_price_id');

        $checkout = $request->user()->newSubscription('default', $priceId)
            ->checkout([
                'success_url' => route('builder.index'),
                'cancel_url'  => route('billing.index'),
            ]);

        return redirect($checkout->url);
    }

    public function portal(Request $request): RedirectResponse
    {
        return $request->user()->redirectToBillingPortal(route('billing.index'));
    }
}
```

- [ ] **Step 2: Register billing routes in routes/web.php**

Read `routes/web.php` first. Then add the `BillingController` import near the top with the other `use` statements:

```php
use App\Http\Controllers\BillingController;
```

Inside the `Route::middleware('auth')->group(...)` block, add:

```php
    Route::get('/billing', [BillingController::class, 'index'])->name('billing.index');
    Route::post('/billing/checkout', [BillingController::class, 'checkout'])->name('billing.checkout');
    Route::get('/billing/portal', [BillingController::class, 'portal'])->name('billing.portal');
```

At the bottom of `routes/web.php`, outside any middleware group, add the Cashier webhook route:

```php
\Laravel\Cashier\Cashier::routes();
```

- [ ] **Step 3: Run billing tests to verify GREEN**

Run: `php artisan test --filter=BillingTest`
Expected: PASS — 4 tests green.

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/BillingController.php routes/web.php tests/Feature/BillingTest.php
git commit -m "feat: add BillingController with index/checkout/portal and webhook route"
```

---

## Task 6: Enforce resume limit in ResumeBuilderController::store()

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`

- [ ] **Step 1: Read the current store() method**

Read `app/Http/Controllers/ResumeBuilderController.php` and find the `store()` method (currently around lines 36–46).

- [ ] **Step 2: Replace store() with limit enforcement**

Replace the entire `store` method with:

```php
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user->subscribed('default') && $user->resumes()->count() >= 5) {
            return redirect()->route('billing.index')->with('limitReached', true);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        $resume = $user->resumes()->create([
            'name'         => $validated['name'],
            'pdf_filename' => \Illuminate\Support\Str::uuid().'.pdf',
        ]);

        return redirect()->route('builder.edit', $resume->id);
    }
```

- [ ] **Step 3: Run all tests to confirm nothing regressed**

Run: `php artisan test`
Expected: PASS — all tests green including BillingTest.

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php
git commit -m "feat: enforce 5-resume free tier limit in builder store"
```

---

## Task 7: Create Billing/Index.tsx (frontend)

**Files:**
- Create: `resources/js/Pages/Billing/Index.tsx`

- [ ] **Step 1: Create the Billing directory and page**

Create `resources/js/Pages/Billing/Index.tsx`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';

type Props = {
    plan: 'free' | 'pro';
    resumeCount: number;
    resumeLimit: number | null;
    limitReached: boolean;
};

export default function BillingIndex({ plan, resumeCount, resumeLimit, limitReached }: Props) {
    const [interval, setInterval] = React.useState<'monthly' | 'yearly'>('monthly');

    const checkout = () => {
        router.post(route('billing.checkout'), { interval });
    };

    const manageSubscription = () => {
        window.location.href = route('billing.portal');
    };

    const usagePct = resumeLimit ? Math.min(100, Math.round((resumeCount / resumeLimit) * 100)) : 0;

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Billing &amp; Plan</h2>}>
            <Head title="Billing" />

            <div className="py-10">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">

                    {limitReached && (
                        <div className="mb-6 rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                            You've reached the 5-resume free tier limit. Upgrade to Pro for unlimited resumes.
                        </div>
                    )}

                    <div className="bg-white shadow-sm rounded-xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Your Plan</h3>
                        </div>

                        <div className="p-6 flex flex-col sm:flex-row gap-4">
                            {/* Current plan card */}
                            <div className="flex-1 rounded-lg border-2 border-indigo-500 bg-indigo-50 p-5">
                                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Current Plan</p>
                                <p className="mt-1.5 text-2xl font-extrabold text-gray-900">
                                    {plan === 'pro' ? 'Pro' : 'Free'}
                                </p>
                                {plan === 'free' && resumeLimit !== null ? (
                                    <>
                                        <p className="mt-1 text-xs text-gray-500">{resumeCount} of {resumeLimit} resumes used</p>
                                        <div className="mt-3 h-1.5 rounded-full bg-indigo-200 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-indigo-600 transition-all"
                                                style={{ width: `${usagePct}%` }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <p className="mt-1 text-xs text-gray-500">Unlimited resumes</p>
                                )}
                            </div>

                            {/* Upgrade or manage card */}
                            {plan === 'free' ? (
                                <div className="flex-1 rounded-lg border border-gray-200 bg-white p-5">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Upgrade to Pro</p>
                                    <p className="mt-1.5 text-2xl font-extrabold text-gray-900">
                                        {interval === 'monthly' ? '$5' : '$49'}
                                        <span className="text-sm font-normal text-gray-500">
                                            {interval === 'monthly' ? '/month' : '/year'}
                                        </span>
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500">Unlimited resumes</p>

                                    {/* Monthly / Yearly toggle */}
                                    <div className="mt-3 flex rounded-md border border-gray-200 overflow-hidden text-xs w-fit">
                                        <button
                                            type="button"
                                            onClick={() => setInterval('monthly')}
                                            className={`px-3 py-1.5 font-medium transition-colors ${interval === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                        >Monthly</button>
                                        <button
                                            type="button"
                                            onClick={() => setInterval('yearly')}
                                            className={`px-3 py-1.5 font-medium transition-colors ${interval === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                        >Yearly <span className="text-green-600 font-semibold">–18%</span></button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={checkout}
                                        className="mt-4 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                                    >
                                        Upgrade Now →
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 rounded-lg border border-gray-200 bg-white p-5 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Subscription</p>
                                        <p className="mt-1.5 text-sm text-gray-600">You're on the Pro plan. Manage your subscription, invoices, or cancel via the Stripe portal.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={manageSubscription}
                                        className="mt-4 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Manage subscription →
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400 text-center">
                            {plan === 'pro'
                                ? 'To cancel, use the Stripe portal above.'
                                : 'No credit card required for the free plan.'}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

// React must be in scope for useState
import React from 'react';
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: exits 0, no errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Billing/Index.tsx
git commit -m "feat: add Billing/Index page with plan status and upgrade UI"
```

---

## Task 8: Add Billing nav link + resume limit UI

**Files:**
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`

- [ ] **Step 1: Add Billing to the nav**

Read `resources/js/Layouts/AuthenticatedLayout.tsx`. Find the desktop nav `NavLink` group (has Dashboard, Resume Builder, Cover Letters, Jobs links). Add after the Jobs link:

```tsx
                                <NavLink
                                    href={route('billing.index')}
                                    active={route().current('billing.*')}
                                >
                                    Billing
                                </NavLink>
```

Also find the mobile responsive nav section (has matching `ResponsiveNavLink` elements) and add:

```tsx
                        <ResponsiveNavLink href={route('billing.index')} active={route().current('billing.*')}>
                            Billing
                        </ResponsiveNavLink>
```

- [ ] **Step 2: Pass resumeLimit prop from ResumeBuilderController::index()**

Read `app/Http/Controllers/ResumeBuilderController.php`. Find the `index()` method. Replace it with:

```php
    public function index(Request $request): Response
    {
        $user = $request->user();
        $resumes = $user->resumes()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'pdf_filename', 'updated_at']);

        $atLimit = !$user->subscribed('default') && $resumes->count() >= 5;

        return Inertia::render('ResumeBuilder/Index', [
            'resumes' => $resumes,
            'atLimit' => $atLimit,
        ]);
    }
```

- [ ] **Step 3: Update ResumeBuilder/Index.tsx to disable button at limit**

Read `resources/js/Pages/ResumeBuilder/Index.tsx`. Find the `Props` type and `Index` component signature. Replace them with:

```tsx
type Props = {
    resumes: ResumeRow[];
    atLimit: boolean;
};

export default function Index({ resumes, atLimit }: Props) {
```

Then find the `+ New Resume` button (currently `onClick={() => setCreating(true)}`). Replace that button with:

```tsx
                            <button
                                onClick={() => atLimit ? window.location.href = route('billing.index') : setCreating(true)}
                                className={`rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 ${atLimit ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'}`}
                                title={atLimit ? 'Upgrade to Pro for unlimited resumes' : undefined}
                            >
                                {atLimit ? '+ New Resume (limit reached)' : '+ New Resume'}
                            </button>
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: tsc + vite succeed with no errors.

- [ ] **Step 5: Run all tests**

Run: `php artisan test`
Expected: PASS — all green.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Layouts/AuthenticatedLayout.tsx resources/js/Pages/ResumeBuilder/Index.tsx app/Http/Controllers/ResumeBuilderController.php
git commit -m "feat: add Billing nav link and resume limit UI on builder index"
```

---

## Self-Review Notes

- **Spec coverage:**
  - Cashier install + migration (Task 1) ✓
  - Stripe config + CSRF exemption (Task 2) ✓
  - `Billable` trait on User (Task 3) ✓
  - `store()` limit enforcement with redirect to billing (Task 6) ✓
  - `BillingController` index/checkout/portal (Task 5) ✓
  - `Billing/Index.tsx` side-by-side card layout, monthly/yearly toggle (Task 7) ✓
  - Billing nav link (Task 8) ✓
  - New Resume button disabled at limit (Task 8) ✓
  - Feature tests (Task 4 RED, Task 5 GREEN) ✓
- **Note on Stripe testing:** The `checkout` and `portal` actions make live Stripe API calls. In tests, they're not directly tested (no mock setup) — the tests only cover the `index` page and the `store()` limit redirect. Integration testing of checkout/portal requires a Stripe test key + webhook forwarding via `stripe listen`.
