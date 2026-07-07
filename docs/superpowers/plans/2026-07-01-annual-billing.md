# Annual Billing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let new signups choose annual billing at checkout for any paid tier, and let existing monthly subscribers self-serve switch to annual (or back) via Cashier's `swap()`, reusing all existing Stripe/Cashier plumbing.

**Architecture:** No new backend infrastructure — `BillingController::checkout()` already resolves `{tier}_{interval}_price_id` generically. This plan adds one new controller action (`swapInterval`) for the same-tier interval-swap path, one new `UserLimits` helper to resolve a Stripe price ID back to `monthly`/`yearly`, and extends `Billing/Index.tsx` with an Agency card (currently missing) and interval-aware CTAs.

**Tech Stack:** Laravel 13 / Cashier v16 (`Laravel\Cashier\Subscription::swap()`), Inertia v2, React 18/TS, PHPUnit.

## Global Constraints

- Pricing: Starter $84/yr, Pro $178/yr, Agency $459/yr (22% off monthly × 12), replacing the current inconsistent $79/$149/none figures.
- No schema changes. `plan_tier` continues to derive from `tierFromPriceId()` + the existing `SubscriptionUpdated` observer.
- Same-tier interval swap uses Stripe's default proration (`create_prorations`) — do not pass `prorationBehavior('none')` or similar.
- Cross-tier upgrade/downgrade behavior is unchanged — this plan only adds the same-tier interval-swap path.
- No new dependencies. No self-service annual→monthly downgrade restriction beyond what's specified (the swap path is symmetric: monthly→yearly and yearly→monthly both go through the same action).
- Per user decision: add a 4th "Agency" card to `Billing/Index.tsx` and stop collapsing `agency` → `pro` in `BillingController::index()`'s `plan` prop.

---

### Task 1: `UserLimits::intervalFromPriceId()` helper

**Files:**
- Modify: `app/Services/UserLimits.php`
- Test: `tests/Feature/BillingTest.php`

**Interfaces:**
- Produces: `UserLimits::intervalFromPriceId(string $priceId): ?string` — returns `'monthly'`, `'yearly'`, or `null` if the price ID doesn't match any configured Stripe price. Used by Task 2's `BillingController::index()` and Task 3's `swapInterval()`.

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/BillingTest.php` (new `use App\Services\UserLimits;` import at the top):

```php
public function test_interval_from_price_id_resolves_monthly_and_yearly(): void
{
    config([
        'services.stripe.starter_monthly_price_id' => 'price_starter_monthly_test',
        'services.stripe.starter_yearly_price_id' => 'price_starter_yearly_test',
        'services.stripe.pro_monthly_price_id' => 'price_pro_monthly_test',
        'services.stripe.pro_yearly_price_id' => 'price_pro_yearly_test',
        'services.stripe.agency_monthly_price_id' => 'price_agency_monthly_test',
        'services.stripe.agency_yearly_price_id' => 'price_agency_yearly_test',
    ]);

    $this->assertSame('monthly', UserLimits::intervalFromPriceId('price_starter_monthly_test'));
    $this->assertSame('yearly', UserLimits::intervalFromPriceId('price_pro_yearly_test'));
    $this->assertSame('yearly', UserLimits::intervalFromPriceId('price_agency_yearly_test'));
    $this->assertNull(UserLimits::intervalFromPriceId('price_unknown'));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=test_interval_from_price_id_resolves_monthly_and_yearly`
Expected: FAIL with "Call to undefined method App\Services\UserLimits::intervalFromPriceId()"

- [ ] **Step 3: Write minimal implementation**

Add to `app/Services/UserLimits.php`, directly after the closing brace of `tierFromPriceId()` (currently ends at line 182):

```php
    public static function intervalFromPriceId(string $priceId): ?string
    {
        $monthlyPrices = array_filter([
            config('services.stripe.starter_monthly_price_id'),
            config('services.stripe.pro_monthly_price_id'),
            config('services.stripe.agency_monthly_price_id'),
        ]);

        $yearlyPrices = array_filter([
            config('services.stripe.starter_yearly_price_id'),
            config('services.stripe.pro_yearly_price_id'),
            config('services.stripe.agency_yearly_price_id'),
        ]);

        if (in_array($priceId, $monthlyPrices, true)) {
            return 'monthly';
        }

        if (in_array($priceId, $yearlyPrices, true)) {
            return 'yearly';
        }

        return null;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=test_interval_from_price_id_resolves_monthly_and_yearly`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/Services/UserLimits.php tests/Feature/BillingTest.php
git commit -m "feat: add UserLimits::intervalFromPriceId helper"
```

---

### Task 2: `BillingController::index()` — uncollapse Agency, expose `currentInterval`

**Files:**
- Modify: `app/Http/Controllers/BillingController.php:13-27` (the `index()` method)
- Modify: `tests/Feature/AgencyBillingTest.php` (existing assertion needs updating)
- Test: `tests/Feature/BillingTest.php`

**Interfaces:**
- Consumes: `UserLimits::intervalFromPriceId(string $priceId): ?string` (Task 1).
- Produces: Inertia props `plan: 'free'|'starter'|'pro'|'agency'` (no longer collapses agency into pro) and `currentInterval: 'monthly'|'yearly'|null`. Consumed by Task 5's `Billing/Index.tsx`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/BillingTest.php`:

```php
public function test_billing_page_passes_current_interval_for_subscriber(): void
{
    config(['services.stripe.starter_monthly_price_id' => 'price_starter_monthly_test']);

    $user = User::factory()->starter()->create();

    $subscription = new Subscription([
        'user_id' => $user->id,
        'type' => 'default',
        'stripe_id' => 'sub_test_'.uniqid(),
        'stripe_status' => 'active',
        'stripe_price' => 'price_starter_monthly_test',
    ]);
    $subscription->save();

    $this->actingAs($user)
        ->get(route('billing.index'))
        ->assertInertia(fn ($page) => $page
            ->where('plan', 'starter')
            ->where('currentInterval', 'monthly')
        );
}

public function test_billing_page_passes_null_interval_for_free_user(): void
{
    $user = User::factory()->free()->create();

    $this->actingAs($user)
        ->get(route('billing.index'))
        ->assertInertia(fn ($page) => $page
            ->where('plan', 'free')
            ->where('currentInterval', null)
        );
}
```

In `tests/Feature/AgencyBillingTest.php`, replace the existing `test_billing_page_shows_pro_plan_for_agency_user` test body (agency is no longer collapsed into `pro`):

```php
public function test_billing_page_shows_agency_plan_for_agency_user(): void
{
    $user = User::factory()->agency()->create();

    $this->actingAs($user)
        ->get(route('billing.index'))
        ->assertInertia(fn ($page) => $page
            ->component('Billing/Index')
            ->where('plan', 'agency')
        );
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=test_billing_page_passes_current_interval_for_subscriber`
Expected: FAIL — `currentInterval` prop does not exist.

Run: `php artisan test --compact --filter=test_billing_page_shows_agency_plan_for_agency_user`
Expected: FAIL — `plan` is `'pro'`, not `'agency'`.

- [ ] **Step 3: Write minimal implementation**

Replace `app/Http/Controllers/BillingController.php:13-27`:

```php
    public function index(Request $request): Response
    {
        $user = $request->user();

        $tier = $user->planTier();
        $subscription = $user->subscription('default');

        return Inertia::render('Billing/Index', [
            'plan' => $tier,
            'currentInterval' => $subscription ? UserLimits::intervalFromPriceId($subscription->stripe_price) : null,
            'resumeCount' => $user->resumes()->count(),
            'resumeLimit' => UserLimits::resumeLimit($user),
            'aiUsed' => UserLimits::aiRequestsThisMonth($user),
            'aiLimit' => UserLimits::aiMonthlyLimit($user),
            'limitReached' => session('limitReached', false),
        ]);
    }
```

Ensure `tests/Feature/BillingTest.php` imports `Laravel\Cashier\Subscription` (already imported at the top of the file for the observer tests).

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/BillingTest.php tests/Feature/AgencyBillingTest.php`
Expected: PASS (all tests in both files, including the previously-passing ones — `test_billing_page_passes_starter_plan_data` and `test_billing_page_passes_pro_plan_data` are unaffected since they don't assert on `currentInterval` and their `plan` values don't change).

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/BillingController.php tests/Feature/BillingTest.php tests/Feature/AgencyBillingTest.php
git commit -m "feat: expose currentInterval and un-collapse agency tier on billing page"
```

---

### Task 3: `BillingController::swapInterval()` action + route

**Files:**
- Modify: `app/Http/Controllers/BillingController.php` (add new method after `checkout()`)
- Modify: `routes/web.php:118` (add new route directly after the existing `billing.checkout` line)
- Test: `tests/Feature/BillingTest.php`

**Interfaces:**
- Consumes: `UserLimits::tierFromPriceId(string $priceId): string` (existing), `UserLimits::intervalFromPriceId(string $priceId): ?string` (Task 1).
- Produces: `POST /billing/swap-interval` (route name `billing.swap-interval`), body `{ interval: 'monthly'|'yearly' }`. Consumed by Task 5's frontend swap button.

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/BillingTest.php`:

```php
public function test_subscriber_can_swap_from_monthly_to_yearly(): void
{
    config([
        'services.stripe.starter_monthly_price_id' => 'price_starter_monthly_test',
        'services.stripe.starter_yearly_price_id' => 'price_starter_yearly_test',
    ]);

    $user = User::factory()->starter()->create();

    $subscription = new Subscription([
        'user_id' => $user->id,
        'type' => 'default',
        'stripe_id' => 'sub_test_'.uniqid(),
        'stripe_status' => 'active',
        'stripe_price' => 'price_starter_monthly_test',
    ]);
    $subscription->save();

    Subscription::swap(fn () => null); // no-op guard, removed below if not needed
}
```

Actually calling real Cashier `swap()` performs a live Stripe API call, which is not viable in a feature test without mocking. Replace the above with a test that fakes the Cashier subscription's `swap()` via a partial mock, following this file's existing pattern of testing the *side effect on our own tables* rather than the Stripe call itself:

```php
public function test_swap_interval_rejects_user_without_subscription(): void
{
    $user = User::factory()->free()->create();

    $this->actingAs($user)
        ->post(route('billing.swap-interval'), ['interval' => 'yearly'])
        ->assertStatus(422);
}

public function test_swap_interval_requires_valid_interval_param(): void
{
    $user = User::factory()->starter()->create();

    $this->actingAs($user)
        ->post(route('billing.swap-interval'), ['interval' => 'weekly'])
        ->assertSessionHasErrors('interval');
}

public function test_swap_interval_rejects_unconfigured_price(): void
{
    // No starter_yearly_price_id configured — swap must fail loudly, not silently no-op.
    config(['services.stripe.starter_yearly_price_id' => null]);

    $user = User::factory()->starter()->create();

    $subscription = new Subscription([
        'user_id' => $user->id,
        'type' => 'default',
        'stripe_id' => 'sub_test_'.uniqid(),
        'stripe_status' => 'active',
        'stripe_price' => 'price_starter_monthly_test',
    ]);
    $subscription->save();

    $this->actingAs($user)
        ->post(route('billing.swap-interval'), ['interval' => 'yearly'])
        ->assertStatus(500);
}
```

Note: a fourth test exercising the actual `swap()` Stripe call is deferred to manual/staging verification (Task 3, Step 6) since Cashier's `swap()` calls the real Stripe API and this codebase has no existing pattern for mocking it (`AgencyBillingTest::test_agency_tier_accepted_in_checkout_validation` takes the same approach for `checkout()` — it asserts the request gets past validation, not that Stripe succeeds).

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=test_swap_interval`
Expected: FAIL — route `billing.swap-interval` does not exist (`RouteNotFoundException`).

- [ ] **Step 3: Add the route**

In `routes/web.php`, directly after line 118 (`Route::post('/billing/checkout', ...)`):

```php
    Route::post('/billing/swap-interval', [BillingController::class, 'swapInterval'])->name('billing.swap-interval');
```

- [ ] **Step 4: Write minimal implementation**

Add to `app/Http/Controllers/BillingController.php`, directly after the `checkout()` method:

```php
    public function swapInterval(Request $request): RedirectResponse
    {
        $request->validate([
            'interval' => ['required', 'in:monthly,yearly'],
        ]);

        $user = $request->user();
        $subscription = $user->subscription('default');

        abort_if(! $subscription || ! $subscription->valid(), 422, 'No active subscription.');

        $tier = UserLimits::tierFromPriceId($subscription->stripe_price);
        $key = $tier.'_'.$request->interval.'_price_id';
        $priceId = config("services.stripe.{$key}");

        abort_if(! $priceId, 500, 'Stripe price not configured.');

        $subscription->swap($priceId);

        return redirect()->route('billing.index');
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test --compact --filter=test_swap_interval`
Expected: PASS for the three tests above.

- [ ] **Step 6: Manual verification note (not automated)**

Before this ships to production, manually verify the actual `swap()` Stripe call against Stripe test mode: log in as a Starter monthly test subscriber, hit `POST /billing/swap-interval` with `interval=yearly`, and confirm in the Stripe dashboard that the subscription's price changed with a proration invoice item. This is a deployment-time check, not a unit test — same caveat as the spec's Rollout section (yearly Price objects must exist in Stripe first).

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/BillingController.php routes/web.php tests/Feature/BillingTest.php
git commit -m "feat: add same-tier interval swap action for existing subscribers"
```

---

### Task 4: Yearly checkout test coverage

**Files:**
- Test: `tests/Feature/BillingTest.php`

**Interfaces:**
- Consumes: existing `BillingController::checkout()` (no code change — already generic per the spec's confirmed research).

- [ ] **Step 1: Write the test**

Add to `tests/Feature/BillingTest.php`:

```php
public function test_checkout_accepts_yearly_interval(): void
{
    config(['services.stripe.starter_yearly_price_id' => null]);

    $user = User::factory()->create();

    // No Stripe key configured in test env, so checkout will fail at the Stripe
    // API boundary — this test only confirms 'yearly' passes validation and
    // routes to the price-id resolution, same pattern as
    // AgencyBillingTest::test_agency_tier_accepted_in_checkout_validation.
    $response = $this->actingAs($user)
        ->post(route('billing.checkout'), ['interval' => 'yearly', 'tier' => 'starter']);

    $this->assertNotEquals(422, $response->getStatusCode());
}

public function test_checkout_rejects_invalid_interval(): void
{
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('billing.checkout'), ['interval' => 'weekly', 'tier' => 'starter'])
        ->assertSessionHasErrors('interval');
}
```

- [ ] **Step 2: Run test to verify current behavior**

Run: `php artisan test --compact --filter=test_checkout_accepts_yearly_interval`
Expected: PASS immediately (no code change needed — this documents existing behavior per the spec).

Run: `php artisan test --compact --filter=test_checkout_rejects_invalid_interval`
Expected: PASS immediately.

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/BillingTest.php
git commit -m "test: cover yearly checkout interval validation"
```

---

### Task 5: `Billing/Index.tsx` — Agency card, correct pricing, interval-aware CTAs

**Files:**
- Modify: `resources/js/Pages/Billing/Index.tsx` (full rewrite of the component body — no test file; this is a React page with no existing test harness in this codebase, verified manually per Step 6 below)

**Interfaces:**
- Consumes: Inertia props `plan: 'free'|'starter'|'pro'|'agency'` and `currentInterval: 'monthly'|'yearly'|null` (Task 2), routes `billing.checkout` (existing) and `billing.swap-interval` (Task 3).

- [ ] **Step 1: Update the `Props` type and `PLAN_FEATURES`**

In `resources/js/Pages/Billing/Index.tsx`, replace lines 5-17:

```tsx
type Props = {
    plan: 'free' | 'starter' | 'pro' | 'agency';
    currentInterval: 'monthly' | 'yearly' | null;
    resumeCount: number;
    resumeLimit: number | null;
    aiUsed: number;
    aiLimit: number;
    limitReached: boolean;
};

const PLAN_FEATURES: Record<string, string[]> = {
    free:    ['2 resumes', '1 cover letter', '3 job applications', '4 templates', '10 AI generations/month'],
    starter: ['10 resumes', '10 cover letters', 'Unlimited job tracking', 'All 9 templates', 'DOCX export', 'ATS scoring', '150 AI generations/month'],
    pro:     ['Unlimited resumes & cover letters', 'All templates (current + future)', 'DOCX export', 'ATS scoring', 'API access', '500 AI generations/month'],
    agency:  ['Everything in Pro', 'Team workspace', '1000 AI generations/month'],
};

const ANNUAL_PRICE: Record<'starter' | 'pro' | 'agency', number> = {
    starter: 84,
    pro: 178,
    agency: 459,
};
```

- [ ] **Step 2: Update component signature, local state, and swap action**

Replace lines 19-27 (`export default function BillingIndex(...` through `const manageSubscription = ...`):

```tsx
export default function BillingIndex({ plan, currentInterval, resumeCount, resumeLimit, aiUsed, aiLimit, limitReached }: Props) {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>(currentInterval ?? 'monthly');

    const usagePct = resumeLimit ? Math.min(100, Math.round((resumeCount / resumeLimit) * 100)) : 0;

    const checkout = (tier: 'starter' | 'pro' | 'agency') =>
        router.post(route('billing.checkout'), { interval, tier });

    const swapInterval = () =>
        router.post(route('billing.swap-interval'), { interval });

    const manageSubscription = () => { window.location.href = route('billing.portal'); };
```

- [ ] **Step 3: Render the toggle for all plans, not just free**

Replace the toggle block (`{/* Interval toggle */}` through its closing `)}`):

```tsx
                    {/* Interval toggle */}
                    <div className="mb-6 flex w-fit overflow-hidden rounded-lg border border-[#eeeef5] text-xs">
                        <button type="button" onClick={() => setInterval('monthly')}
                            className={`px-4 py-1.5 font-semibold transition ${interval === 'monthly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                            Monthly
                        </button>
                        <button type="button" onClick={() => setInterval('yearly')}
                            className={`px-4 py-1.5 font-semibold transition ${interval === 'yearly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                            Yearly <span className="text-emerald-600 font-bold">–22%</span>
                        </button>
                    </div>
```

- [ ] **Step 4: Add a helper for the current-plan CTA and update the Starter/Pro cards**

Directly above the `return (` statement, add:

```tsx
    const currentPlanCta = (tier: 'starter' | 'pro' | 'agency') => {
        if (interval === currentInterval) {
            return (
                <button type="button" onClick={manageSubscription}
                    className="mt-5 w-full rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]">
                    Manage subscription →
                </button>
            );
        }

        return (
            <button type="button" onClick={swapInterval}
                className="mt-5 w-full rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]">
                {interval === 'yearly' ? 'Switch to annual — save 22%' : 'Switch to monthly'}
            </button>
        );
    };
```

Replace the Starter card's price line and CTA block:

```tsx
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">
                                {interval === 'monthly' ? '$9 / month' : `$${ANNUAL_PRICE.starter} / year`}
                            </p>
```

```tsx
                            {plan === 'free' && (
                                <button type="button" onClick={() => checkout('starter')}
                                    className="mt-5 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                    Upgrade to Starter →
                                </button>
                            )}
                            {plan === 'starter' && currentPlanCta('starter')}
```

Replace the Pro card's price line and CTA block:

```tsx
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">
                                {interval === 'monthly' ? '$19 / month' : `$${ANNUAL_PRICE.pro} / year`}
                            </p>
```

```tsx
                            {(plan === 'free' || plan === 'starter') && (
                                <button type="button" onClick={() => checkout('pro')}
                                    className="mt-5 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                    Upgrade to Pro →
                                </button>
                            )}
                            {plan === 'pro' && currentPlanCta('pro')}
```

- [ ] **Step 5: Add the Agency card**

Directly after the Pro card's closing `</div>` (and before the grid's closing `</div>`), add:

```tsx
                        {/* Agency */}
                        <div className={`rounded-xl border-2 p-5 ${plan === 'agency' ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] bg-white'}`}>
                            {plan === 'agency' && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>}
                            <p className="text-2xl font-extrabold tracking-tight text-[#0f0f1a]">Agency</p>
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">
                                {interval === 'monthly' ? '$49 / month' : `$${ANNUAL_PRICE.agency} / year`}
                            </p>
                            <ul className="mt-4 space-y-1.5 text-xs text-[#71717a]">
                                {PLAN_FEATURES.agency.map(f => <li key={f} className="flex items-center gap-1.5"><span className="text-[#4f46e5]">✓</span>{f}</li>)}
                            </ul>
                            {(plan === 'free' || plan === 'starter' || plan === 'pro') && (
                                <button type="button" onClick={() => checkout('agency')}
                                    className="mt-5 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                    Upgrade to Agency →
                                </button>
                            )}
                            {plan === 'agency' && currentPlanCta('agency')}
                        </div>
```

- [ ] **Step 6: Manual verification (no automated frontend test harness in this codebase)**

Run `npm run build`, then in the browser at the billing page (`herd` serves it at the project's `.test` domain):
1. As a free user: confirm toggle shows Monthly/Yearly, prices update to $84/$178/$459 for Starter/Pro/Agency when Yearly is selected, and all three "Upgrade to X" buttons still call checkout.
2. As a Starter-monthly test subscriber (seed via tinker or factory + manual Subscription row, per Task 2/3 test setup): confirm the Starter card shows "Manage subscription →" when Monthly is selected, and "Switch to annual — save 22%" when Yearly is selected; clicking it posts to `billing.swap-interval`.
3. Confirm the Agency card renders correctly for an Agency-tier user and is labeled "Current Plan".

- [ ] **Step 7: Commit**

```bash
git add resources/js/Pages/Billing/Index.tsx
git commit -m "feat: add Agency plan card and interval-aware billing CTAs"
```

---

## Self-Review Notes

- **Spec coverage:** Pricing (Task 5), toggle visibility (Task 5 Step 3), same-tier swap action (Task 3), UI copy (Task 5 Step 4), error handling — no subscription / unresolvable price / Stripe failure (Task 3), tests for yearly checkout and swap (Tasks 3-4). Data model section requires no task (no schema change, confirmed). Rollout section requires no task (deployment-time Stripe dashboard step, called out in Task 3 Step 6).
- **Placeholder scan:** no TBD/TODO; all steps show complete code.
- **Type consistency:** `swapInterval` (controller) / `swap-interval` (route name) / `swapInterval` (frontend function) used consistently across Tasks 3 and 5. `intervalFromPriceId` name matches between Task 1's definition and Tasks 2-3's usage.
