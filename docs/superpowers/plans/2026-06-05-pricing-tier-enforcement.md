# Pricing Tier Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce Free / Starter ($9) / Pro ($19) tier limits across all features — resume count, templates, DOCX export, ATS scoring, AI suggest monthly caps, cover letter count, and job count — with an inline upgrade modal on the frontend.

**Architecture:** A central `UserLimits` service holds all limit constants; a `plan_tier` column on `users` is the runtime tier source; Cashier Subscription model observers keep it in sync on upgrade/downgrade. Backend gates use `back()->with('featureGate', [...])` for Inertia routes and `response()->json([...], 402)` for JSON/API routes. A shared `featureGate` Inertia prop drives a global `UpgradeModal` component; JSON endpoints are handled via a `triggerUpgradeModal()` helper.

**Tech Stack:** Laravel 13, PHP 8.4, Cashier v16, Inertia v2, React 18, TypeScript, Tailwind CSS v3, SQLite

---

## File Map

**New files:**
- `database/migrations/2026_06_05_000001_add_plan_tier_to_users_table.php`
- `app/Services/UserLimits.php`
- `resources/js/Components/UpgradeModal.tsx`
- `tests/Feature/TierLimitsTest.php`

**Modified files:**
- `app/Models/User.php` — add `planTier()`, `isAtLeastStarter()`, update `isPro()`, add `plan_tier` to fillable/casts
- `database/factories/UserFactory.php` — add `free()`, `starter()`, `pro()` states
- `config/services.php` — rename pro price IDs, add starter price IDs
- `app/Providers/AppServiceProvider.php` — register Subscription model observers
- `app/Http/Controllers/ResumeBuilderController.php` — gates in `store`, `duplicate`, `update`, `downloadDocx`, `edit`; update `index`
- `app/Http/Controllers/AtsScoreController.php` — ATS gate
- `app/Http/Controllers/AiSuggestController.php` — AI monthly cap gate
- `app/Http/Controllers/CoverLetterController.php` — cover letter count gate, pass limit props
- `app/Http/Controllers/JobApplicationController.php` — job count gate, pass limit props
- `app/Http/Controllers/BillingController.php` — tier-aware props, checkout tier param
- `app/Http/Controllers/Api/ResumeController.php` — resume count gate (402)
- `app/Http/Controllers/Api/AiSuggestController.php` — AI monthly cap gate (402)
- `app/Http/Controllers/Api/AtsScoreController.php` — ATS gate (402)
- `app/Http/Middleware/HandleInertiaRequests.php` — share `featureGate` flash
- `resources/js/Layouts/AuthenticatedLayout.tsx` — add `<UpgradeModal />`
- `resources/js/Pages/ResumeBuilder/Index.tsx` — update props, locked button state
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — add `canAts`, `canDocx`, `aiUsed`, `aiLimit` props + locked UI
- `resources/js/Components/AISuggestButton.tsx` — handle 402, trigger upgrade modal
- `resources/js/Pages/Billing/Index.tsx` — 3-card layout (Free/Starter/Pro)
- `resources/js/Pages/CoverLetter/Index.tsx` — pass limit/count props
- `resources/js/Pages/Jobs/Index.tsx` — pass limit/count props
- `tests/Feature/BillingTest.php` — update for new limits and props
- `tests/Feature/ResumeBuilderTest.php` — add template/DOCX/count gate tests
- `tests/Feature/AtsScoreTest.php` — add tier gate tests
- `tests/Feature/AiSuggestTest.php` — add monthly cap tests
- `tests/Feature/CoverLetterTest.php` — add count gate tests
- `tests/Feature/JobApplicationTest.php` — add count gate tests
- `tests/Feature/Api/ResumeApiTest.php` — add 402 gate tests
- `tests/Feature/Api/AiSuggestApiTest.php` — add 402 gate tests
- `tests/Feature/Api/AtsScoreApiTest.php` — add 402 gate tests

---

## Task 1: Migration — add `plan_tier` column and backfill existing users

**Files:**
- Create: `database/migrations/2026_06_05_000001_add_plan_tier_to_users_table.php`

- [ ] **Step 1: Create the migration**

```bash
php artisan make:migration add_plan_tier_to_users_table --no-interaction
```

Then replace the generated file body with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('plan_tier')->default('free')->after('is_pro');
        });

        // Backfill: existing is_pro users → 'pro'
        DB::table('users')->where('is_pro', true)->update(['plan_tier' => 'pro']);

        // Backfill: users with active/trialing Cashier subscriptions → 'pro'
        $subscribedIds = DB::table('subscriptions')
            ->where('billable_type', 'App\Models\User')
            ->whereIn('stripe_status', ['active', 'trialing'])
            ->pluck('billable_id');

        if ($subscribedIds->isNotEmpty()) {
            DB::table('users')->whereIn('id', $subscribedIds)->update(['plan_tier' => 'pro']);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('plan_tier');
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

Expected output: `Migrating: 2026_06_05_000001_add_plan_tier_to_users_table` followed by `Migrated`.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/2026_06_05_000001_add_plan_tier_to_users_table.php
git commit -m "feat: add plan_tier column to users with backfill migration"
```

---

## Task 2: Stripe config rename + UserFactory tier states

**Files:**
- Modify: `config/services.php`
- Modify: `database/factories/UserFactory.php`
- Modify: `app/Http/Controllers/BillingController.php` (2 references — updated properly in Task 8)

- [ ] **Step 1: Update `config/services.php`**

Replace the `stripe` block:

```php
'stripe' => [
    'starter_monthly_price_id' => env('STRIPE_STARTER_MONTHLY_PRICE_ID'),
    'starter_yearly_price_id'  => env('STRIPE_STARTER_YEARLY_PRICE_ID'),
    'pro_monthly_price_id'     => env('STRIPE_PRO_MONTHLY_PRICE_ID'),
    'pro_yearly_price_id'      => env('STRIPE_PRO_YEARLY_PRICE_ID'),
],
```

- [ ] **Step 2: Add tier states to `database/factories/UserFactory.php`**

Add after the `unverified()` method:

```php
public function free(): static
{
    return $this->state(['plan_tier' => 'free']);
}

public function starter(): static
{
    return $this->state(['plan_tier' => 'starter']);
}

public function pro(): static
{
    return $this->state(['plan_tier' => 'pro']);
}
```

- [ ] **Step 3: Run pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 4: Commit**

```bash
git add config/services.php database/factories/UserFactory.php
git commit -m "feat: rename stripe price IDs to tier-scoped keys, add UserFactory tier states"
```

---

## Task 3: `UserLimits` service + User model tier methods

**Files:**
- Create: `app/Services/UserLimits.php`
- Modify: `app/Models/User.php`
- Create: `tests/Feature/TierLimitsTest.php`

- [ ] **Step 1: Write `TierLimitsTest`**

```bash
php artisan make:test TierLimitsTest --phpunit --no-interaction
```

Replace with:

```php
<?php

namespace Tests\Feature;

use App\Models\AiUsageLog;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TierLimitsTest extends TestCase
{
    use RefreshDatabase;

    // ── resumeLimit ────────────────────────────────────────────────────────────

    public function test_free_user_resume_limit_is_2(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(2, UserLimits::resumeLimit($user));
    }

    public function test_starter_user_resume_limit_is_5(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame(5, UserLimits::resumeLimit($user));
    }

    public function test_pro_user_resume_limit_is_null(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertNull(UserLimits::resumeLimit($user));
    }

    // ── coverLetterLimit ───────────────────────────────────────────────────────

    public function test_free_user_cover_letter_limit_is_1(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(1, UserLimits::coverLetterLimit($user));
    }

    public function test_starter_user_cover_letter_limit_is_5(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame(5, UserLimits::coverLetterLimit($user));
    }

    public function test_pro_user_cover_letter_limit_is_null(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertNull(UserLimits::coverLetterLimit($user));
    }

    // ── jobLimit ───────────────────────────────────────────────────────────────

    public function test_free_user_job_limit_is_3(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(3, UserLimits::jobLimit($user));
    }

    public function test_starter_user_job_limit_is_null(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertNull(UserLimits::jobLimit($user));
    }

    // ── aiLimit ────────────────────────────────────────────────────────────────

    public function test_free_user_ai_limit_is_5(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertSame(5, UserLimits::aiLimit($user));
    }

    public function test_starter_user_ai_limit_is_30(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame(30, UserLimits::aiLimit($user));
    }

    public function test_pro_user_ai_limit_is_500(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertSame(500, UserLimits::aiLimit($user));
    }

    // ── allowedTemplates ──────────────────────────────────────────────────────

    public function test_free_user_gets_three_templates(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $allowed = UserLimits::allowedTemplates($user);
        $this->assertCount(3, $allowed);
        $this->assertContains('classic', $allowed);
        $this->assertContains('modern', $allowed);
        $this->assertContains('ats', $allowed);
        $this->assertNotContains('creative', $allowed);
    }

    public function test_starter_user_gets_all_templates(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertCount(8, UserLimits::allowedTemplates($user));
    }

    public function test_pro_user_gets_all_templates(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertCount(8, UserLimits::allowedTemplates($user));
    }

    // ── canDocx / canAts ──────────────────────────────────────────────────────

    public function test_free_user_cannot_docx(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertFalse(UserLimits::canDocx($user));
    }

    public function test_starter_user_can_docx(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertTrue(UserLimits::canDocx($user));
    }

    public function test_free_user_cannot_ats(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $this->assertFalse(UserLimits::canAts($user));
    }

    public function test_starter_user_can_ats(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertTrue(UserLimits::canAts($user));
    }

    // ── aiUsageThisPeriod ─────────────────────────────────────────────────────

    public function test_free_user_ai_usage_counts_all_time(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now()->subMonths(3),
        ]);
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now(),
        ]);
        $this->assertSame(2, UserLimits::aiUsageThisPeriod($user));
    }

    public function test_starter_user_ai_usage_counts_current_month_only(): void
    {
        $user = User::factory()->starter()->create();
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now()->subMonths(2),
        ]);
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now(),
        ]);
        $this->assertSame(1, UserLimits::aiUsageThisPeriod($user));
    }

    // ── atAiLimit ─────────────────────────────────────────────────────────────

    public function test_free_user_at_ai_limit_after_5_uses(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        for ($i = 0; $i < 5; $i++) {
            AiUsageLog::create([
                'user_id' => $user->id, 'provider' => 'anthropic',
                'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
                'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
                'created_at' => now()->subMonths(1),
            ]);
        }
        $this->assertTrue(UserLimits::atAiLimit($user));
    }

    public function test_free_user_not_at_ai_limit_with_4_uses(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        for ($i = 0; $i < 4; $i++) {
            AiUsageLog::create([
                'user_id' => $user->id, 'provider' => 'anthropic',
                'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
                'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
                'created_at' => now(),
            ]);
        }
        $this->assertFalse(UserLimits::atAiLimit($user));
    }

    // ── planTier ──────────────────────────────────────────────────────────────

    public function test_master_admin_always_returns_pro_tier(): void
    {
        $user = User::factory()->create(['is_master_admin' => true, 'plan_tier' => 'free']);
        $this->assertSame('pro', $user->planTier());
    }

    public function test_is_pro_flag_returns_pro_tier(): void
    {
        $user = User::factory()->create(['is_pro' => true, 'plan_tier' => 'free']);
        $this->assertSame('pro', $user->planTier());
    }

    public function test_plan_tier_column_is_used_for_regular_users(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertSame('starter', $user->planTier());
    }

    public function test_default_user_returns_free_tier(): void
    {
        $user = User::factory()->create();
        $this->assertSame('free', $user->planTier());
    }

    // ── isAtLeastStarter ─────────────────────────────────────────────────────

    public function test_free_user_is_not_at_least_starter(): void
    {
        $user = User::factory()->create();
        $this->assertFalse($user->isAtLeastStarter());
    }

    public function test_starter_user_is_at_least_starter(): void
    {
        $user = User::factory()->starter()->create();
        $this->assertTrue($user->isAtLeastStarter());
    }

    public function test_pro_user_is_at_least_starter(): void
    {
        $user = User::factory()->pro()->create();
        $this->assertTrue($user->isAtLeastStarter());
    }

    // ── tierFromPriceId ───────────────────────────────────────────────────────

    public function test_pro_monthly_price_resolves_to_pro_tier(): void
    {
        config(['services.stripe.pro_monthly_price_id' => 'price_pro_monthly']);
        $this->assertSame('pro', UserLimits::tierFromPriceId('price_pro_monthly'));
    }

    public function test_starter_yearly_price_resolves_to_starter_tier(): void
    {
        config(['services.stripe.starter_yearly_price_id' => 'price_starter_yearly']);
        $this->assertSame('starter', UserLimits::tierFromPriceId('price_starter_yearly'));
    }

    public function test_unknown_price_resolves_to_free(): void
    {
        $this->assertSame('free', UserLimits::tierFromPriceId('price_unknown'));
    }
}
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
php artisan test --compact tests/Feature/TierLimitsTest.php
```

Expected: multiple failures — `UserLimits`, `planTier()`, `isAtLeastStarter()` do not exist yet.

- [ ] **Step 3: Create `app/Services/UserLimits.php`**

```php
<?php

namespace App\Services;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Support\Carbon;

class UserLimits
{
    private const FREE_TEMPLATES = ['classic', 'modern', 'ats'];

    private const ALL_TEMPLATES = [
        'classic', 'modern', 'minimal', 'minimal-ruled',
        'sidebar', 'creative', 'executive', 'ats',
    ];

    public static function resumeLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free'    => 2,
            'starter' => 5,
            default   => null,
        };
    }

    public static function coverLetterLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free'    => 1,
            'starter' => 5,
            default   => null,
        };
    }

    public static function jobLimit(User $user): ?int
    {
        return $user->planTier() === 'free' ? 3 : null;
    }

    public static function aiLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free'    => 5,
            'starter' => 30,
            default   => 500,
        };
    }

    public static function allowedTemplates(User $user): array
    {
        return $user->planTier() === 'free' ? self::FREE_TEMPLATES : self::ALL_TEMPLATES;
    }

    public static function canDocx(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canAts(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function aiUsageThisPeriod(User $user): int
    {
        $query = AiUsageLog::where('user_id', $user->id);

        if ($user->planTier() !== 'free') {
            $query->where('created_at', '>=', Carbon::now()->startOfMonth());
        }

        return $query->count();
    }

    public static function atAiLimit(User $user): bool
    {
        $limit = self::aiLimit($user);

        return $limit !== null && self::aiUsageThisPeriod($user) >= $limit;
    }

    public static function tierFromPriceId(string $priceId): string
    {
        $proPrices = array_filter([
            config('services.stripe.pro_monthly_price_id'),
            config('services.stripe.pro_yearly_price_id'),
        ]);

        $starterPrices = array_filter([
            config('services.stripe.starter_monthly_price_id'),
            config('services.stripe.starter_yearly_price_id'),
        ]);

        if (in_array($priceId, $proPrices, true)) {
            return 'pro';
        }

        if (in_array($priceId, $starterPrices, true)) {
            return 'starter';
        }

        return 'free';
    }
}
```

- [ ] **Step 4: Update `app/Models/User.php`**

Add `'plan_tier'` to the `#[Fillable]` attribute and add these methods:

```php
#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'is_master_admin', 'is_pro', 'plan_tier'])]
```

Add to `casts()`:
```php
'plan_tier' => 'string',
```

Add methods after `isPro()`:

```php
public function planTier(): string
{
    if ($this->is_master_admin || $this->is_pro) {
        return 'pro';
    }

    return $this->plan_tier ?? 'free';
}

public function isAtLeastStarter(): bool
{
    return in_array($this->planTier(), ['starter', 'pro'], true);
}
```

Update `isPro()` to stay backward-compatible (Cashier `subscribed()` check kept as safety net):

```php
public function isPro(): bool
{
    return $this->planTier() === 'pro' || $this->subscribed('default');
}
```

- [ ] **Step 5: Run tests**

```bash
php artisan test --compact tests/Feature/TierLimitsTest.php
```

Expected: all pass.

- [ ] **Step 6: Run pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 7: Commit**

```bash
git add app/Services/UserLimits.php app/Models/User.php tests/Feature/TierLimitsTest.php
git commit -m "feat: add UserLimits service and User tier methods (planTier, isAtLeastStarter)"
```

---

## Task 4: Resume gates — count, duplicate, DOCX, template

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `tests/Feature/ResumeBuilderTest.php`
- Modify: `tests/Feature/BillingTest.php`

- [ ] **Step 1: Update `BillingTest` to reflect new free limit (2)**

In `tests/Feature/BillingTest.php`, replace these two tests:

```php
public function test_free_user_at_limit_is_redirected_when_creating_resume(): void
{
    $user = User::factory()->create();
    for ($i = 0; $i < 2; $i++) {
        $user->resumes()->create(['name' => "Resume $i", 'pdf_filename' => "$i.pdf"]);
    }

    $this->actingAs($user)
        ->post(route('builder.store'), ['name' => 'Third Resume'])
        ->assertRedirect()
        ->assertSessionHas('featureGate.feature', 'resume_limit');
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
            ->where('resumeLimit', 2)
        );
}
```

- [ ] **Step 2: Add gate tests to `ResumeBuilderTest`**

Add these tests at the end of `tests/Feature/ResumeBuilderTest.php`:

```php
public function test_free_user_cannot_use_restricted_template(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

    $this->actingAs($user)
        ->put(route('builder.update', $resume->id), ['template' => 'creative'])
        ->assertRedirect()
        ->assertSessionHas('featureGate.feature', 'template_access');
}

public function test_starter_user_can_use_restricted_template(): void
{
    $user = User::factory()->starter()->create();
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

    $this->actingAs($user)
        ->put(route('builder.update', $resume->id), ['template' => 'creative'])
        ->assertRedirect();

    $this->assertDatabaseHas('resumes', ['id' => $resume->id, 'template' => 'creative']);
}

public function test_free_user_cannot_download_docx(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

    $this->actingAs($user)
        ->get(route('builder.docx', $resume->id))
        ->assertRedirect()
        ->assertSessionHas('featureGate.feature', 'docx_export');
}

public function test_starter_user_can_download_docx(): void
{
    $user = User::factory()->starter()->create();
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

    $this->actingAs($user)
        ->get(route('builder.docx', $resume->id))
        ->assertOk();
}

public function test_free_user_at_resume_limit_cannot_duplicate(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $r1 = $user->resumes()->create(['name' => 'A', 'pdf_filename' => 'a.pdf']);
    $user->resumes()->create(['name' => 'B', 'pdf_filename' => 'b.pdf']);

    $this->actingAs($user)
        ->post(route('builder.duplicate', $r1->id))
        ->assertRedirect()
        ->assertSessionHas('featureGate.feature', 'resume_limit');
}
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
php artisan test --compact tests/Feature/ResumeBuilderTest.php tests/Feature/BillingTest.php
```

Expected: new gate tests fail, existing billing tests fail (wrong limit/response).

- [ ] **Step 4: Update `ResumeBuilderController`**

Add at top of file: `use App\Services\UserLimits;`

Replace `index()`:

```php
public function index(Request $request): Response
{
    $user = $request->user();
    $resumes = $user->resumes()
        ->orderByDesc('updated_at')
        ->get(['id', 'name', 'pdf_filename', 'updated_at']);

    $resumeLimit = UserLimits::resumeLimit($user);

    return Inertia::render('ResumeBuilder/Index', [
        'resumes'      => $resumes,
        'resumeCount'  => $resumes->count(),
        'resumeLimit'  => $resumeLimit,
    ]);
}
```

Replace `store()`:

```php
public function store(Request $request)
{
    $user = $request->user();
    $limit = UserLimits::resumeLimit($user);

    if ($limit !== null && $user->resumes()->count() >= $limit) {
        return back()->with('featureGate', [
            'feature'      => 'resume_limit',
            'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
        ]);
    }

    $validated = $request->validate([
        'name' => ['required', 'string', 'max:255'],
    ]);

    $resume = $user->resumes()->create([
        'name'         => $validated['name'],
        'pdf_filename' => Str::uuid().'.pdf',
    ]);

    return redirect()->route('builder.edit', $resume->id);
}
```

Replace `duplicate()`:

```php
public function duplicate(Resume $resume)
{
    $this->authorize('update', $resume);

    $user = $resume->user;
    $limit = UserLimits::resumeLimit($user);

    if ($limit !== null && $user->resumes()->count() >= $limit) {
        return back()->with('featureGate', [
            'feature'      => 'resume_limit',
            'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
        ]);
    }

    $copy = $user->resumes()->create([
        'name'           => 'Copy of '.$resume->name,
        'pdf_filename'   => Str::uuid().'.pdf',
        'template'       => $resume->template,
        'accent_color'   => $resume->accent_color,
        'font_family'    => $resume->font_family,
        'summary'        => $resume->summary,
        'contact'        => $resume->contact,
        'experience'     => $resume->experience,
        'education'      => $resume->education,
        'skills'         => $resume->skills,
        'certifications' => $resume->certifications,
        'font_sizes'     => $resume->font_sizes,
    ]);

    return redirect()->route('builder.edit', $copy->id);
}
```

Add template gate at the start of `update()`, before `$resume->update($validated)`:

```php
public function update(Request $request, Resume $resume)
{
    $this->authorize('update', $resume);

    $validated = $request->validate(self::resumeRules());

    if (isset($validated['template'])) {
        $allowed = UserLimits::allowedTemplates($request->user());
        if (! in_array($validated['template'], $allowed, true)) {
            return back()->with('featureGate', [
                'feature'      => 'template_access',
                'requiredTier' => 'starter',
            ]);
        }
    }

    $resume->update($validated);

    return back();
}
```

Replace `downloadDocx()`:

```php
public function downloadDocx(Resume $resume): \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\RedirectResponse
{
    $this->authorize('update', $resume);

    if (! UserLimits::canDocx(auth()->user())) {
        return back()->with('featureGate', [
            'feature'      => 'docx_export',
            'requiredTier' => 'starter',
        ]);
    }

    $word = app(\App\Services\DocxGenerator::class)->generate($resume);

    $filename = $resume->name
        ? preg_replace('/[^a-zA-Z0-9_\-]/', '_', $resume->name).'.docx'
        : $resume->id.'.docx';

    return response()->stream(function () use ($word) {
        $writer = \PhpOffice\PhpWord\IOFactory::createWriter($word, 'Word2007');
        $writer->save('php://output');
    }, 200, [
        'Content-Type'        => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition' => 'attachment; filename="'.$filename.'"',
    ]);
}
```

- [ ] **Step 5: Run tests**

```bash
php artisan test --compact tests/Feature/ResumeBuilderTest.php tests/Feature/BillingTest.php
```

Expected: all pass.

- [ ] **Step 6: Run pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/ResumeBuilderTest.php tests/Feature/BillingTest.php
git commit -m "feat: enforce resume count, template, and DOCX tier gates"
```

---

## Task 5: ATS + AI suggest gates

**Files:**
- Modify: `app/Http/Controllers/AtsScoreController.php`
- Modify: `app/Http/Controllers/AiSuggestController.php`
- Modify: `tests/Feature/AtsScoreTest.php`
- Modify: `tests/Feature/AiSuggestTest.php`

- [ ] **Step 1: Add gate tests to `AtsScoreTest`**

Add to `tests/Feature/AtsScoreTest.php`:

```php
public function test_free_user_cannot_access_ats_score(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

    $this->actingAs($user)
        ->getJson(route('builder.ats-score', $resume->id))
        ->assertStatus(402)
        ->assertJson(['required_tier' => 'starter']);
}

public function test_starter_user_can_access_ats_score(): void
{
    $user = User::factory()->starter()->create();
    $resume = $user->resumes()->create([
        'name' => 'CV', 'pdf_filename' => 'cv.pdf',
        'ats_cache' => ['score' => 80, 'breakdown' => [], 'missing' => []],
    ]);

    $this->actingAs($user)
        ->getJson(route('builder.ats-score', $resume->id))
        ->assertOk();
}
```

- [ ] **Step 2: Add cap tests to `AiSuggestTest`**

Add to `tests/Feature/AiSuggestTest.php` (add `use App\Models\AiUsageLog;` at the top):

```php
public function test_free_user_at_lifetime_ai_limit_gets_402(): void
{
    config(['services.anthropic.key' => 'test-key']);
    $user = User::factory()->create(['plan_tier' => 'free']);
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

    for ($i = 0; $i < 5; $i++) {
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now()->subMonths(3),
        ]);
    }

    $this->actingAs($user)
        ->postJson(route('builder.ai-suggest', $resume->id), [
            'field' => 'summary', 'context' => ['summary' => 'test'], 'provider' => 'claude',
        ])
        ->assertStatus(402)
        ->assertJson(['required_tier' => 'starter']);
}

public function test_starter_user_at_monthly_ai_limit_gets_402(): void
{
    config(['services.anthropic.key' => 'test-key']);
    $user = User::factory()->starter()->create();
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

    for ($i = 0; $i < 30; $i++) {
        AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now(),
        ]);
    }

    $this->actingAs($user)
        ->postJson(route('builder.ai-suggest', $resume->id), [
            'field' => 'summary', 'context' => ['summary' => 'test'], 'provider' => 'claude',
        ])
        ->assertStatus(402)
        ->assertJson(['required_tier' => 'pro']);
}
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
php artisan test --compact tests/Feature/AtsScoreTest.php tests/Feature/AiSuggestTest.php
```

Expected: new tests fail (no gate yet).

- [ ] **Step 4: Update `AtsScoreController`**

Add at top: `use App\Services\UserLimits;`

Add gate at the start of `show()`:

```php
public function show(Resume $resume): JsonResponse
{
    $this->authorize('update', $resume);

    if (! UserLimits::canAts(auth()->user())) {
        return response()->json([
            'error'         => 'ATS scoring requires a Starter or Pro plan.',
            'required_tier' => 'starter',
        ], 402);
    }

    if ($resume->ats_cache !== null) {
        return response()->json($resume->ats_cache);
    }

    $result = AtsScorer::score($resume);
    $resume->update(['ats_cache' => $result, 'ats_cached_at' => now()]);

    return response()->json($result);
}
```

- [ ] **Step 5: Update `AiSuggestController`**

Add at top: `use App\Services\UserLimits;`

Add cap check at the start of `suggest()`, after `$this->authorize(...)`:

```php
public function suggest(Request $request, Resume $resume): JsonResponse
{
    $this->authorize('update', $resume);

    $user = $request->user();
    if (UserLimits::atAiLimit($user)) {
        return response()->json([
            'error'         => 'Monthly AI suggestion limit reached.',
            'required_tier' => $user->planTier() === 'free' ? 'starter' : 'pro',
        ], 402);
    }

    $validated = $request->validate([
        'field'           => ['required', 'in:summary,bullets,skills,title'],
        'context'         => ['required', 'array'],
        'context.summary' => ['nullable', 'string'],
        'context.title'   => ['nullable', 'string'],
        'context.company' => ['nullable', 'string'],
        'context.bullets' => ['nullable', 'string'],
        'context.skills'  => ['nullable', 'array'],
        'provider'        => ['required', 'in:claude,openai'],
    ]);

    if ($validated['provider'] === 'claude') {
        return $this->suggestWithClaude($validated['field'], $validated['context']);
    }

    return $this->suggestWithOpenAI($validated['field'], $validated['context']);
}
```

- [ ] **Step 6: Run tests**

```bash
php artisan test --compact tests/Feature/AtsScoreTest.php tests/Feature/AiSuggestTest.php
```

Expected: all pass.

- [ ] **Step 7: Run pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/AtsScoreController.php app/Http/Controllers/AiSuggestController.php tests/Feature/AtsScoreTest.php tests/Feature/AiSuggestTest.php
git commit -m "feat: enforce ATS scoring and AI suggest monthly tier gates"
```

---

## Task 6: Cover letter + job application gates

**Files:**
- Modify: `app/Http/Controllers/CoverLetterController.php`
- Modify: `app/Http/Controllers/JobApplicationController.php`
- Modify: `tests/Feature/CoverLetterTest.php`
- Modify: `tests/Feature/JobApplicationTest.php`

- [ ] **Step 1: Add gate tests to `CoverLetterTest`**

Add to `tests/Feature/CoverLetterTest.php` (add `use App\Models\User;` if not present):

```php
public function test_free_user_at_cover_letter_limit_is_blocked(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $user->coverLetters()->create([
        'name' => 'Existing', 'template_key' => 'standard', 'body' => 'text',
    ]);

    $this->actingAs($user)
        ->post(route('cover-letters.store'), ['name' => 'Second', 'template_key' => 'standard'])
        ->assertRedirect()
        ->assertSessionHas('featureGate.feature', 'cover_letter_limit');
}

public function test_starter_user_can_create_up_to_5_cover_letters(): void
{
    $user = User::factory()->starter()->create();
    for ($i = 0; $i < 4; $i++) {
        $user->coverLetters()->create([
            'name' => "Letter $i", 'template_key' => 'standard', 'body' => 'text',
        ]);
    }

    $this->actingAs($user)
        ->post(route('cover-letters.store'), ['name' => 'Fifth', 'template_key' => 'standard'])
        ->assertRedirect(fn ($url) => ! str_contains($url, 'billing'));

    $this->assertSame(5, $user->coverLetters()->count());
}
```

- [ ] **Step 2: Add gate tests to `JobApplicationTest`**

Add to `tests/Feature/JobApplicationTest.php`:

```php
public function test_free_user_at_job_limit_is_blocked(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    for ($i = 0; $i < 3; $i++) {
        $user->jobApplications()->create([
            'company' => "Co $i", 'role' => 'Engineer', 'status' => 'applied',
        ]);
    }

    $this->actingAs($user)
        ->post(route('jobs.store'), [
            'company' => 'Fourth Co', 'role' => 'Engineer', 'status' => 'applied',
        ])
        ->assertRedirect()
        ->assertSessionHas('featureGate.feature', 'job_limit');
}

public function test_starter_user_can_create_unlimited_job_applications(): void
{
    $user = User::factory()->starter()->create();
    for ($i = 0; $i < 10; $i++) {
        $user->jobApplications()->create([
            'company' => "Co $i", 'role' => 'Dev', 'status' => 'applied',
        ]);
    }

    $this->actingAs($user)
        ->post(route('jobs.store'), [
            'company' => 'Eleventh', 'role' => 'Dev', 'status' => 'applied',
        ])
        ->assertRedirect();

    $this->assertSame(11, $user->jobApplications()->count());
}
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
php artisan test --compact tests/Feature/CoverLetterTest.php tests/Feature/JobApplicationTest.php
```

Expected: new gate tests fail.

- [ ] **Step 4: Update `CoverLetterController`**

Add at top: `use App\Services\UserLimits;`

Add gate at start of `store()`:

```php
public function store(Request $request)
{
    $user = $request->user();
    $limit = UserLimits::coverLetterLimit($user);

    if ($limit !== null && $user->coverLetters()->count() >= $limit) {
        return back()->with('featureGate', [
            'feature'      => 'cover_letter_limit',
            'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
        ]);
    }

    $validated = $request->validate([
        'template_key' => ['required', 'in:'.implode(',', CoverLetterTemplates::keys())],
        'name'         => ['required', 'string', 'max:255'],
    ]);

    $letter = $user->coverLetters()->create([
        'name'         => $validated['name'],
        'template_key' => $validated['template_key'],
        'body'         => CoverLetterTemplates::render($validated['template_key'], [
            'name' => $user->name,
        ]),
    ]);

    return redirect()->route('cover-letters.edit', $letter->id);
}
```

- [ ] **Step 5: Update `JobApplicationController`**

Add at top: `use App\Services\UserLimits;`

Add gate at start of `store()`:

```php
public function store(Request $request)
{
    $user = $request->user();
    $limit = UserLimits::jobLimit($user);

    if ($limit !== null && $user->jobApplications()->count() >= $limit) {
        return back()->with('featureGate', [
            'feature'      => 'job_limit',
            'requiredTier' => 'starter',
        ]);
    }

    $validated = $this->validateData($request, true);
    $user->jobApplications()->create($validated);

    return redirect()->route('jobs.index');
}
```

- [ ] **Step 6: Run tests**

```bash
php artisan test --compact tests/Feature/CoverLetterTest.php tests/Feature/JobApplicationTest.php
```

Expected: all pass.

- [ ] **Step 7: Pass limit props from `CoverLetterController::index()` and `JobApplicationController::index()`**

In `CoverLetterController::index()`, add to the Inertia render:
```php
'coverLetterLimit' => UserLimits::coverLetterLimit($request->user()),
'coverLetterCount' => $request->user()->coverLetters()->count(),
```

In `JobApplicationController::index()`, add to the Inertia render:
```php
'jobLimit' => UserLimits::jobLimit($request->user()),
'jobCount' => $request->user()->jobApplications()->count(),
```

- [ ] **Step 8: Run pint + commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/CoverLetterController.php app/Http/Controllers/JobApplicationController.php tests/Feature/CoverLetterTest.php tests/Feature/JobApplicationTest.php
git commit -m "feat: enforce cover letter and job application tier gates"
```

---

## Task 7: BillingController updates + Subscription observer

**Files:**
- Modify: `app/Http/Controllers/BillingController.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Modify: `tests/Feature/BillingTest.php`

- [ ] **Step 1: Add billing tests**

Add to `tests/Feature/BillingTest.php`:

```php
public function test_billing_page_passes_starter_plan_data(): void
{
    $user = User::factory()->starter()->create();
    $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

    $this->actingAs($user)
        ->get(route('billing.index'))
        ->assertInertia(fn ($page) => $page
            ->where('plan', 'starter')
            ->where('resumeLimit', 5)
        );
}

public function test_billing_page_passes_pro_plan_data(): void
{
    $user = User::factory()->pro()->create();

    $this->actingAs($user)
        ->get(route('billing.index'))
        ->assertInertia(fn ($page) => $page
            ->where('plan', 'pro')
            ->where('resumeLimit', null)
        );
}

public function test_checkout_requires_tier_param(): void
{
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('billing.checkout'), ['interval' => 'monthly'])
        ->assertSessionHasErrors('tier');
}

public function test_subscription_observer_sets_plan_tier_on_active(): void
{
    config([
        'services.stripe.starter_monthly_price_id' => 'price_starter_monthly_test',
        'services.stripe.starter_yearly_price_id'  => 'price_starter_yearly_test',
        'services.stripe.pro_monthly_price_id'     => 'price_pro_monthly_test',
        'services.stripe.pro_yearly_price_id'      => 'price_pro_yearly_test',
    ]);

    $user = User::factory()->create(['plan_tier' => 'free']);

    $subscription = new \Laravel\Cashier\Subscription([
        'billable_id'   => $user->id,
        'billable_type' => \App\Models\User::class,
        'type'          => 'default',
        'stripe_id'     => 'sub_test_'.uniqid(),
        'stripe_status' => 'active',
    ]);
    $subscription->save();

    $item = new \Laravel\Cashier\SubscriptionItem([
        'subscription_id' => $subscription->id,
        'stripe_id'       => 'si_test_'.uniqid(),
        'stripe_price'    => 'price_starter_monthly_test',
        'quantity'        => 1,
    ]);
    $item->save();

    // Simulate the observer by calling the subscription saved again with a fresh load
    $subscription->touch();

    $this->assertSame('starter', $user->fresh()->plan_tier);
}

public function test_subscription_observer_resets_to_free_on_cancel(): void
{
    $user = User::factory()->starter()->create();

    $subscription = new \Laravel\Cashier\Subscription([
        'billable_id'   => $user->id,
        'billable_type' => \App\Models\User::class,
        'type'          => 'default',
        'stripe_id'     => 'sub_test_'.uniqid(),
        'stripe_status' => 'canceled',
    ]);
    $subscription->save();

    $this->assertSame('free', $user->fresh()->plan_tier);
}
```

- [ ] **Step 2: Run tests to confirm new tests fail**

```bash
php artisan test --compact tests/Feature/BillingTest.php
```

Expected: new tests fail.

- [ ] **Step 3: Update `BillingController`**

Add at top: `use App\Services\UserLimits;`

Replace `index()`:

```php
public function index(Request $request): Response
{
    $user = $request->user();

    return Inertia::render('Billing/Index', [
        'plan'         => $user->planTier(),
        'resumeCount'  => $user->resumes()->count(),
        'resumeLimit'  => UserLimits::resumeLimit($user),
        'aiUsed'       => UserLimits::aiUsageThisPeriod($user),
        'aiLimit'      => UserLimits::aiLimit($user),
        'limitReached' => session('limitReached', false),
    ]);
}
```

Replace `checkout()`:

```php
public function checkout(Request $request): RedirectResponse
{
    $request->validate([
        'interval' => ['required', 'in:monthly,yearly'],
        'tier'     => ['required', 'in:starter,pro'],
    ]);

    $key     = $request->tier.'_'.$request->interval.'_price_id';
    $priceId = config("services.stripe.{$key}");

    $checkout = $request->user()->newSubscription('default', $priceId)
        ->checkout([
            'success_url' => route('builder.index'),
            'cancel_url'  => route('billing.index'),
        ]);

    return redirect($checkout->url);
}
```

- [ ] **Step 4: Update `AppServiceProvider` to register Subscription observers**

Replace the `boot()` method in `app/Providers/AppServiceProvider.php`:

```php
public function boot(): void
{
    Vite::prefetch(concurrency: 3);

    \Laravel\Cashier\Subscription::saved(function (\Laravel\Cashier\Subscription $subscription) {
        if (in_array($subscription->stripe_status, ['canceled', 'incomplete_expired', 'unpaid'])) {
            \App\Models\User::where('id', $subscription->billable_id)->update(['plan_tier' => 'free']);
            return;
        }

        if (! in_array($subscription->stripe_status, ['active', 'trialing'])) {
            return;
        }

        $item = $subscription->items()->first();
        if (! $item) {
            return;
        }

        $tier = \App\Services\UserLimits::tierFromPriceId($item->stripe_price);
        \App\Models\User::where('id', $subscription->billable_id)->update(['plan_tier' => $tier]);
    });

    \Laravel\Cashier\Subscription::deleted(function (\Laravel\Cashier\Subscription $subscription) {
        \App\Models\User::where('id', $subscription->billable_id)->update(['plan_tier' => 'free']);
    });
}
```

Add at top: `use Illuminate\Support\Facades\Vite;`

- [ ] **Step 5: Run tests**

```bash
php artisan test --compact tests/Feature/BillingTest.php
```

Expected: all pass.

- [ ] **Step 6: Run pint + commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/BillingController.php app/Providers/AppServiceProvider.php tests/Feature/BillingTest.php
git commit -m "feat: tier-aware BillingController and Subscription observer for plan_tier sync"
```

---

## Task 8: Shared `featureGate` prop + `UpgradeModal` component

**Files:**
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Create: `resources/js/Components/UpgradeModal.tsx`
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx`

- [ ] **Step 1: Update `HandleInertiaRequests::share()`**

Add `featureGate` to the shared props:

```php
public function share(Request $request): array
{
    return [
        ...parent::share($request),
        'auth' => [
            'user' => $request->user(),
        ],
        'flash' => [
            'success' => session('success'),
            'error'   => session('error'),
        ],
        'featureGate' => session()->pull('featureGate'),
    ];
}
```

- [ ] **Step 2: Create `resources/js/Components/UpgradeModal.tsx`**

```tsx
import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

type FeatureGate = {
    feature: string;
    requiredTier: 'starter' | 'pro';
};

const FEATURE_LABELS: Record<string, string> = {
    resume_limit:       'creating more resumes',
    template_access:    'premium templates',
    docx_export:        'DOCX export',
    ats_scoring:        'ATS scoring',
    ai_suggest:         'AI suggestions',
    cover_letter_limit: 'creating more cover letters',
    job_limit:          'tracking more job applications',
};

const TIER_NAMES: Record<string, string> = {
    starter: 'Starter',
    pro:     'Pro',
};

const TIER_PRICES: Record<string, string> = {
    starter: '$9/mo',
    pro:     '$19/mo',
};

/** Call this from any XHR handler that receives a 402 response. */
export function triggerUpgradeModal(feature: string, requiredTier: 'starter' | 'pro'): void {
    window.dispatchEvent(
        new CustomEvent('upgrade-required', { detail: { feature, requiredTier } })
    );
}

export default function UpgradeModal() {
    const page = usePage().props as { featureGate?: FeatureGate | null };
    const [gate, setGate] = useState<FeatureGate | null>(null);

    // Flash-based trigger (Inertia redirect with featureGate session)
    useEffect(() => {
        if (page.featureGate) {
            setGate(page.featureGate);
        }
    }, [page.featureGate]);

    // XHR-based trigger (402 JSON responses)
    useEffect(() => {
        const handler = (e: Event) => setGate((e as CustomEvent<FeatureGate>).detail);
        window.addEventListener('upgrade-required', handler);
        return () => window.removeEventListener('upgrade-required', handler);
    }, []);

    if (!gate) return null;

    const featureLabel = FEATURE_LABELS[gate.feature] ?? gate.feature;
    const tierName     = TIER_NAMES[gate.requiredTier] ?? gate.requiredTier;
    const tierPrice    = TIER_PRICES[gate.requiredTier] ?? '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100">
                    <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                </div>
                <h2 className="mt-4 text-lg font-extrabold tracking-tight text-[#0f0f1a]">
                    Upgrade to {tierName}
                </h2>
                <p className="mt-1.5 text-sm text-[#71717a]">
                    {tierName} ({tierPrice}) is required for {featureLabel}.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                    <a
                        href={route('billing.index')}
                        className="block w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:opacity-90"
                    >
                        View Plans →
                    </a>
                    <button
                        type="button"
                        onClick={() => setGate(null)}
                        className="block w-full rounded-lg border border-[#eeeef5] px-4 py-2.5 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Add `<UpgradeModal />` to `AuthenticatedLayout.tsx`**

Add the import at the top:
```tsx
import UpgradeModal from '@/Components/UpgradeModal';
```

Add inside the returned JSX, directly before the closing `</div>` of the root element:
```tsx
<UpgradeModal />
```

- [ ] **Step 4: Run pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 5: Commit**

```bash
git add app/Http/Middleware/HandleInertiaRequests.php resources/js/Components/UpgradeModal.tsx resources/js/Layouts/AuthenticatedLayout.tsx
git commit -m "feat: add featureGate shared Inertia prop and UpgradeModal component"
```

---

## Task 9: Frontend locked states — `Index.tsx` and `Edit.tsx`

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
- Modify: `app/Http/Controllers/ResumeBuilderController.php` (edit action)
- Modify: `resources/js/Components/AISuggestButton.tsx`

- [ ] **Step 1: Update `ResumeBuilderController::edit()` to pass tier props**

In `edit()`, add `use App\Services\UserLimits;` at the top of the file (already done in Task 4). Add to the Inertia render call:

```php
public function edit(Request $request, Resume $resume): Response
{
    $this->authorize('update', $resume);
    $resume->load(['shareLinks', 'questions.shareLink']);

    $questions = $resume->questions->map(fn ($q) => [
        'id'           => $q->id,
        'sender_name'  => $q->sender_name,
        'sender_email' => $q->sender_email,
        'sender_phone' => $q->sender_phone,
        'message'      => $q->message,
        'is_read'      => $q->is_read,
        'link_label'   => $q->shareLink?->label ?? '(unlabelled)',
        'created_at'   => $q->created_at->toDateTimeString(),
    ]);

    $user = $request->user();
    $isFirstResume = ! $user->has_completed_onboarding
        && $user->resumes()->count() === 1;

    return Inertia::render('ResumeBuilder/Edit', [
        'resume'       => $resume,
        'shareLinks'   => $resume->shareLinks,
        'questions'    => $questions,
        'isFirstResume' => $isFirstResume,
        'aiCapabilities' => [
            'claude' => ! empty(config('services.anthropic.key')),
            'openai' => ! empty(config('services.openai.key')),
        ],
        'canAts'  => UserLimits::canAts($user),
        'canDocx' => UserLimits::canDocx($user),
        'aiUsed'  => UserLimits::aiUsageThisPeriod($user),
        'aiLimit' => UserLimits::aiLimit($user),
    ]);
}
```

- [ ] **Step 2: Update `ResumeBuilder/Index.tsx`**

Replace the Props type and destructuring:

```tsx
type Props = {
    resumes: ResumeRow[];
    resumeCount: number;
    resumeLimit: number | null;
};

export default function Index({ resumes, resumeCount, resumeLimit }: Props) {
    const atLimit = resumeLimit !== null && resumeCount >= resumeLimit;
```

Update the "New Resume" button to show limit context:
```tsx
onClick={() => atLimit ? undefined : setCreating(true)}
title={atLimit ? `Upgrade to create more resumes (${resumeCount}/${resumeLimit} used)` : undefined}
className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${atLimit ? 'cursor-not-allowed bg-[#a0a0b0]' : 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] hover:opacity-90'}`}
```

Replace the button text:
```tsx
{atLimit ? `+ New Resume (${resumeCount}/${resumeLimit})` : '+ New Resume'}
```

- [ ] **Step 3: Update `Edit.tsx` Props type and DOCX/ATS locked states**

Add to the Props type at the top of `Edit.tsx` (find the existing `Props` type and add these fields):

```tsx
canAts: boolean;
canDocx: boolean;
aiUsed: number;
aiLimit: number;
```

Add to the destructured props in the component function signature.

For the DOCX link (around line 479), replace with:
```tsx
{canDocx ? (
    <a
        href={route('builder.docx', resume.id)}
        className="rounded-lg border border-[#eeeef5] bg-white px-3 py-1.5 text-xs font-medium text-[#71717a] transition hover:bg-[#fafafe]"
    >
        DOCX
    </a>
) : (
    <button
        type="button"
        onClick={() => triggerUpgradeModal('docx_export', 'starter')}
        className="rounded-lg border border-[#eeeef5] bg-white px-3 py-1.5 text-xs font-medium text-[#a0a0b0] transition hover:bg-[#fafafe]"
        title="Upgrade to Starter to download DOCX"
    >
        🔒 DOCX
    </button>
)}
```

Add the import at the top of `Edit.tsx`:
```tsx
import { triggerUpgradeModal } from '@/Components/UpgradeModal';
```

For the ATS panel button/header (around line 570), wrap with a lock state:
```tsx
{!canAts ? (
    <button
        type="button"
        onClick={() => triggerUpgradeModal('ats_scoring', 'starter')}
        className="flex w-full items-center justify-between rounded-xl border border-[#eeeef5] bg-white px-4 py-3 text-left text-sm font-semibold text-[#a0a0b0]"
    >
        <span>🔒 ATS Score</span>
        <span className="text-xs">Starter+</span>
    </button>
) : (
    // existing ATS panel JSX stays here
)}
```

- [ ] **Step 4: Update `AISuggestButton.tsx` to handle 402**

Add the import at the top:
```tsx
import { triggerUpgradeModal } from '@/Components/UpgradeModal';
```

In the `fetchSuggestions` function, after `const data = await res.json();`, replace the `!res.ok` handler:

```tsx
if (!res.ok) {
    if (res.status === 402 && data.required_tier) {
        triggerUpgradeModal('ai_suggest', data.required_tier);
        setStatus('idle');
        return;
    }
    setError(data.error ?? 'Something went wrong');
    setStatus('error');
    return;
}
```

- [ ] **Step 5: Run pint + commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/ResumeBuilderController.php \
        resources/js/Pages/ResumeBuilder/Index.tsx \
        resources/js/Pages/ResumeBuilder/Edit.tsx \
        resources/js/Components/AISuggestButton.tsx
git commit -m "feat: add tier-aware locked states to ResumeBuilder Index and Edit pages"
```

---

## Task 10: `Billing/Index.tsx` — 3-card layout (Free / Starter / Pro)

**Files:**
- Modify: `resources/js/Pages/Billing/Index.tsx`

- [ ] **Step 1: Replace `Billing/Index.tsx`**

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

type Props = {
    plan: 'free' | 'starter' | 'pro';
    resumeCount: number;
    resumeLimit: number | null;
    aiUsed: number;
    aiLimit: number | null;
    limitReached: boolean;
};

const PLAN_FEATURES: Record<string, string[]> = {
    free:    ['2 resumes', '3 templates', '5 lifetime AI credits', '1 cover letter', '3 job applications'],
    starter: ['5 resumes', 'All 8 templates', '30 AI credits/month', 'ATS scoring', 'DOCX export', '5 cover letters', 'Unlimited job tracking'],
    pro:     ['Unlimited resumes', 'All templates (current + future)', '500 AI credits/month', 'ATS scoring', 'DOCX export', 'Unlimited cover letters', 'API access'],
};

export default function BillingIndex({ plan, resumeCount, resumeLimit, aiUsed, aiLimit, limitReached }: Props) {
    const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

    const usagePct = resumeLimit ? Math.min(100, Math.round((resumeCount / resumeLimit) * 100)) : 0;

    const checkout = (tier: 'starter' | 'pro') =>
        router.post(route('billing.checkout'), { interval, tier });

    const manageSubscription = () => { window.location.href = route('billing.portal'); };

    return (
        <AuthenticatedLayout>
            <Head title="Billing" />

            <div className="py-8">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">

                    <div className="mb-6">
                        <h1 className="text-xl font-extrabold tracking-tight text-[#0f0f1a]">Billing &amp; Plan</h1>
                        <p className="mt-1 text-sm text-[#a0a0b0]">Manage your subscription</p>
                    </div>

                    {limitReached && (
                        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            You've reached your plan's resume limit. Upgrade to create more.
                        </div>
                    )}

                    {/* Interval toggle */}
                    {plan === 'free' && (
                        <div className="mb-6 flex w-fit overflow-hidden rounded-lg border border-[#eeeef5] text-xs">
                            <button type="button" onClick={() => setInterval('monthly')}
                                className={`px-4 py-1.5 font-semibold transition ${interval === 'monthly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                                Monthly
                            </button>
                            <button type="button" onClick={() => setInterval('yearly')}
                                className={`px-4 py-1.5 font-semibold transition ${interval === 'yearly' ? 'bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] text-white' : 'bg-white text-[#71717a] hover:bg-[#fafafe]'}`}>
                                Yearly <span className="text-emerald-600 font-bold">–30%</span>
                            </button>
                        </div>
                    )}

                    {/* Plan cards */}
                    <div className="grid gap-4 sm:grid-cols-3">

                        {/* Free */}
                        <div className={`rounded-xl border-2 p-5 ${plan === 'free' ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] bg-white'}`}>
                            {plan === 'free' && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>}
                            <p className="text-2xl font-extrabold tracking-tight text-[#0f0f1a]">Free</p>
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">$0 / month</p>
                            {plan === 'free' && resumeLimit !== null && (
                                <>
                                    <p className="mt-2 text-xs text-[#71717a]">{resumeCount} of {resumeLimit} resumes used</p>
                                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#c7d2fe]">
                                        <div className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] to-[#7c3aed]" style={{ width: `${usagePct}%` }} />
                                    </div>
                                    {aiLimit !== null && (
                                        <p className="mt-1 text-xs text-[#71717a]">{aiUsed} of {aiLimit} lifetime AI credits used</p>
                                    )}
                                </>
                            )}
                            <ul className="mt-4 space-y-1.5 text-xs text-[#71717a]">
                                {PLAN_FEATURES.free.map(f => <li key={f} className="flex items-center gap-1.5"><span className="text-[#4f46e5]">✓</span>{f}</li>)}
                            </ul>
                        </div>

                        {/* Starter */}
                        <div className={`rounded-xl border-2 p-5 ${plan === 'starter' ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] bg-white'}`}>
                            {plan === 'starter' && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>}
                            <p className="text-2xl font-extrabold tracking-tight text-[#0f0f1a]">Starter</p>
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">
                                {interval === 'monthly' ? '$9 / month' : '$79 / year'}
                            </p>
                            <ul className="mt-4 space-y-1.5 text-xs text-[#71717a]">
                                {PLAN_FEATURES.starter.map(f => <li key={f} className="flex items-center gap-1.5"><span className="text-[#4f46e5]">✓</span>{f}</li>)}
                            </ul>
                            {plan === 'free' && (
                                <button type="button" onClick={() => checkout('starter')}
                                    className="mt-5 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                    Upgrade to Starter →
                                </button>
                            )}
                            {plan === 'starter' && (
                                <button type="button" onClick={manageSubscription}
                                    className="mt-5 w-full rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]">
                                    Manage subscription →
                                </button>
                            )}
                        </div>

                        {/* Pro */}
                        <div className={`rounded-xl border-2 p-5 ${plan === 'pro' ? 'border-[#4f46e5] bg-[#eef2ff]' : 'border-[#eeeef5] bg-white'}`}>
                            {plan === 'pro' && <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5]">Current Plan</p>}
                            <p className="text-2xl font-extrabold tracking-tight text-[#0f0f1a]">Pro</p>
                            <p className="mt-0.5 text-sm text-[#a0a0b0]">
                                {interval === 'monthly' ? '$19 / month' : '$149 / year'}
                            </p>
                            <ul className="mt-4 space-y-1.5 text-xs text-[#71717a]">
                                {PLAN_FEATURES.pro.map(f => <li key={f} className="flex items-center gap-1.5"><span className="text-[#4f46e5]">✓</span>{f}</li>)}
                            </ul>
                            {(plan === 'free' || plan === 'starter') && (
                                <button type="button" onClick={() => checkout('pro')}
                                    className="mt-5 w-full rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                    Upgrade to Pro →
                                </button>
                            )}
                            {plan === 'pro' && (
                                <button type="button" onClick={manageSubscription}
                                    className="mt-5 w-full rounded-lg border border-[#eeeef5] px-4 py-2 text-sm font-medium text-[#71717a] transition hover:bg-[#fafafe]">
                                    Manage subscription →
                                </button>
                            )}
                        </div>

                    </div>

                    <p className="mt-4 text-center text-xs text-[#a0a0b0]">
                        {plan !== 'free' ? 'To cancel, use the Manage subscription button above.' : 'No credit card required for the free plan.'}
                    </p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Run the TypeScript check**

```bash
npm run build 2>&1 | head -40
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Billing/Index.tsx
git commit -m "feat: update Billing page to 3-card layout (Free/Starter/Pro)"
```

---

## Task 11: API 402 gates

**Files:**
- Modify: `app/Http/Controllers/Api/ResumeController.php`
- Modify: `app/Http/Controllers/Api/AiSuggestController.php`
- Create or modify: `app/Http/Controllers/Api/AtsScoreController.php` (check if it exists)
- Modify: `tests/Feature/Api/ResumeApiTest.php`
- Modify: `tests/Feature/Api/AiSuggestApiTest.php`
- Modify: `tests/Feature/Api/AtsScoreApiTest.php`

- [ ] **Step 1: Check if `app/Http/Controllers/Api/AtsScoreController.php` exists**

```bash
ls app/Http/Controllers/Api/
```

- [ ] **Step 2: Add API gate tests to `tests/Feature/Api/ResumeApiTest.php`**

Add these tests (file extends `ApiTestCase`):

```php
public function test_api_store_blocks_free_user_at_limit_with_402(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $user->resumes()->create(['name' => 'A', 'pdf_filename' => 'a.pdf']);
    $user->resumes()->create(['name' => 'B', 'pdf_filename' => 'b.pdf']);
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/resumes', ['name' => 'Third'])
        ->assertStatus(402)
        ->assertJsonPath('required_tier', 'starter');
}

public function test_api_store_allows_starter_user_under_limit(): void
{
    $user = User::factory()->starter()->create();
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->postJson('/api/resumes', ['name' => 'First'])
        ->assertCreated();
}
```

- [ ] **Step 3: Add API gate tests to `tests/Feature/Api/AiSuggestApiTest.php`**

```php
public function test_api_ai_suggest_returns_402_when_at_limit(): void
{
    config(['services.anthropic.key' => 'fake-key']);

    $user = User::factory()->create(['plan_tier' => 'free']);
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
    $token = $user->createToken('test')->plainTextToken;

    for ($i = 0; $i < 5; $i++) {
        \App\Models\AiUsageLog::create([
            'user_id' => $user->id, 'provider' => 'anthropic',
            'model' => 'claude-sonnet-4-6', 'feature' => 'ai_suggest',
            'input_tokens' => 100, 'output_tokens' => 50, 'cost_usd' => 0.0,
            'created_at' => now(),
        ]);
    }

    $this->withToken($token)
        ->postJson("/api/resumes/{$resume->id}/ai-suggest", [
            'field' => 'summary', 'context' => ['title' => 'Dev'], 'provider' => 'claude',
        ])
        ->assertStatus(402)
        ->assertJsonPath('required_tier', 'starter');
}
```

- [ ] **Step 4: Add API ATS gate test**

In `tests/Feature/Api/AtsScoreApiTest.php`, add:

```php
public function test_api_ats_score_returns_402_for_free_user(): void
{
    $user = User::factory()->create(['plan_tier' => 'free']);
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
    $token = $user->createToken('test')->plainTextToken;

    $this->withToken($token)
        ->getJson("/api/resumes/{$resume->id}/ats-score")
        ->assertStatus(402)
        ->assertJsonPath('required_tier', 'starter');
}
```

- [ ] **Step 5: Run tests to confirm they fail**

```bash
php artisan test --compact tests/Feature/Api/ResumeApiTest.php tests/Feature/Api/AiSuggestApiTest.php tests/Feature/Api/AtsScoreApiTest.php
```

- [ ] **Step 6: Update `Api/ResumeController::store()`**

Add at top: `use App\Services\UserLimits;`

Replace the limit check in `store()`:

```php
public function store(Request $request): JsonResponse
{
    $user = $request->user();
    $limit = UserLimits::resumeLimit($user);

    if ($limit !== null && $user->resumes()->count() >= $limit) {
        return response()->json([
            'message'       => 'Resume limit reached.',
            'required_tier' => $user->planTier() === 'free' ? 'starter' : 'pro',
        ], 402);
    }

    $validated = $request->validate([
        'name' => ['required', 'string', 'max:255'],
    ]);

    $resume = $user->resumes()->create([
        'name'         => $validated['name'],
        'pdf_filename' => Str::uuid().'.pdf',
    ]);

    return response()->json($resume, 201);
}
```

Also add the same gate to `duplicate()` in `Api/ResumeController`:

```php
public function duplicate(Resume $resume): JsonResponse
{
    $this->authorize('update', $resume);

    $user = $resume->user;
    $limit = UserLimits::resumeLimit($user);

    if ($limit !== null && $user->resumes()->count() >= $limit) {
        return response()->json([
            'message'       => 'Resume limit reached.',
            'required_tier' => $user->planTier() === 'free' ? 'starter' : 'pro',
        ], 402);
    }

    $copy = $user->resumes()->create([
        'name'           => 'Copy of '.$resume->name,
        'pdf_filename'   => Str::uuid().'.pdf',
        'template'       => $resume->template,
        'accent_color'   => $resume->accent_color,
        'font_family'    => $resume->font_family,
        'summary'        => $resume->summary,
        'contact'        => $resume->contact,
        'experience'     => $resume->experience,
        'education'      => $resume->education,
        'skills'         => $resume->skills,
        'certifications' => $resume->certifications,
        'font_sizes'     => $resume->font_sizes,
    ]);

    return response()->json($copy, 201);
}
```

- [ ] **Step 7: Update `Api/AiSuggestController::suggest()`**

Add at top: `use App\Services\UserLimits;`

Add after `$this->authorize(...)`:

```php
$user = $request->user();
if (UserLimits::atAiLimit($user)) {
    return response()->json([
        'error'         => 'Monthly AI suggestion limit reached.',
        'required_tier' => $user->planTier() === 'free' ? 'starter' : 'pro',
    ], 402);
}
```

- [ ] **Step 8: Update or create `Api/AtsScoreController`**

If `app/Http/Controllers/Api/AtsScoreController.php` exists, add the gate at the start of `show()`. If it does not exist, create it:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use App\Services\AtsScorer;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;

class AtsScoreController extends Controller
{
    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if (! UserLimits::canAts(auth()->user())) {
            return response()->json([
                'error'         => 'ATS scoring requires a Starter or Pro plan.',
                'required_tier' => 'starter',
            ], 402);
        }

        if ($resume->ats_cache !== null) {
            return response()->json($resume->ats_cache);
        }

        $result = AtsScorer::score($resume);
        $resume->update(['ats_cache' => $result, 'ats_cached_at' => now()]);

        return response()->json($result);
    }
}
```

- [ ] **Step 9: Run tests**

```bash
php artisan test --compact tests/Feature/Api/ResumeApiTest.php tests/Feature/Api/AiSuggestApiTest.php tests/Feature/Api/AtsScoreApiTest.php
```

Expected: all pass.

- [ ] **Step 10: Run pint + commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Api/ResumeController.php \
        app/Http/Controllers/Api/AiSuggestController.php \
        app/Http/Controllers/Api/AtsScoreController.php \
        tests/Feature/Api/ResumeApiTest.php \
        tests/Feature/Api/AiSuggestApiTest.php \
        tests/Feature/Api/AtsScoreApiTest.php
git commit -m "feat: add 402 tier gates to API resume, AI suggest, and ATS endpoints"
```

---

## Task 12: Full test suite + final verification

- [ ] **Step 1: Run the complete test suite**

```bash
php artisan test --compact
```

Expected: all tests pass. If any fail, fix before proceeding.

- [ ] **Step 2: TypeScript build check**

```bash
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors, build succeeds.

- [ ] **Step 3: Final commit if any pint fixes remain**

```bash
./vendor/bin/pint --dirty --format agent
git add -p  # stage only pint changes
git commit -m "style: pint formatting pass"
```
