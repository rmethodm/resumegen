# Admin AI Usage Reporting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a master-admin AI dashboard that reports cost, abuse, and usage (with charts), exposes per-user controls (reset quota, custom limit, block), shows a flagged-content review queue, and reconciles our internal estimate against OpenAI's actual billed spend.

**Architecture:** A new `Admin\AdminAiController` drives four Inertia pages under `/admin/ai` (Overview, Users, User detail, Flagged), gated by the existing `master_admin` middleware. Per-user controls add three `users` columns wired into `UserLimits`. Flagged input text is persisted in a new nullable `ai_requests.flagged_text` column and pruned on a schedule. A standalone `OpenAiUsageService` calls OpenAI's org Costs/Usage API (cached, fail-soft). Charts are pure-CSS/inline-SVG — no new dependency.

**Tech Stack:** Laravel 13 / PHP 8.4 / Postgres / Inertia v2 / React 18 / TypeScript / Tailwind v3 / PHPUnit 12.

---

## Conventions to follow (read before starting)

- Admin controllers live in `app/Http/Controllers/Admin/`, extend the base `Controller`, return `Inertia::render('Admin/...')`. Mirror `app/Http/Controllers/Admin/AdminUserController.php`.
- Admin pages use `AdminLayout` (`resources/js/Layouts/AdminLayout.tsx`), which renders the admin sub-nav. Mirror `resources/js/Pages/Admin/Users/Index.tsx`.
- Admin routes are registered in `routes/web.php` inside the `Route::middleware(['auth', 'master_admin'])->prefix('admin')->name('admin.')->group(...)` block (starts at line 207).
- Always use `route('named.route')` on the frontend, never hardcoded URLs.
- Run `vendor/bin/pint --dirty --format agent` after PHP edits.
- **ClientFake gotcha (AI tests):** `OpenAI\Testing\ClientFake` replays responses FIFO and type-agnostically. Any test that triggers `AiService::chat()` must prepend a clean moderation fake (`ModerationResponse::fake(['results' => [['flagged' => false]]])`) before the `CreateResponse::fake(...)`. See `tests/Feature/AiServiceTest.php`.
- DB is Postgres in this environment. Use Eloquent/query-builder aggregates (`selectRaw`) — they run on Postgres and SQLite alike.

---

## Task 1: Schema + model changes

**Files:**
- Create: `database/migrations/2026_06_13_190000_add_ai_admin_columns.php`
- Modify: `app/Models/AiRequest.php`
- Modify: `app/Models/User.php` (casts only)
- Test: `tests/Feature/Admin/AiAdminSchemaTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Admin/AiAdminSchemaTest.php`:

```php
<?php

namespace Tests\Feature\Admin;

use App\Models\AiRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiAdminSchemaTest extends TestCase
{
    use RefreshDatabase;

    public function test_ai_request_stores_flagged_text(): void
    {
        $row = AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'bad input']);

        $this->assertSame('bad input', $row->fresh()->flagged_text);
    }

    public function test_user_has_ai_admin_columns_with_defaults(): void
    {
        $user = User::factory()->create();

        $this->assertNull($user->ai_limit_override);
        $this->assertFalse($user->ai_blocked);
        $this->assertNull($user->ai_usage_reset_at);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Admin/AiAdminSchemaTest.php`
Expected: FAIL — `flagged_text`/`ai_blocked` columns do not exist.

- [ ] **Step 3: Create the migration**

Run: `php artisan make:migration add_ai_admin_columns --no-interaction`

Then replace the generated file's body (rename it to the path above if needed) with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            $table->text('flagged_text')->nullable()->after('status');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedInteger('ai_limit_override')->nullable()->after('plan_tier');
            $table->boolean('ai_blocked')->default(false)->after('ai_limit_override');
            $table->timestamp('ai_usage_reset_at')->nullable()->after('ai_blocked');
        });
    }

    public function down(): void
    {
        Schema::table('ai_requests', function (Blueprint $table) {
            $table->dropColumn('flagged_text');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['ai_limit_override', 'ai_blocked', 'ai_usage_reset_at']);
        });
    }
};
```

> Note: `after()` is a no-op on Postgres but harmless; it documents intent and works on MySQL/SQLite.

- [ ] **Step 4: Add `flagged_text` to `AiRequest` fillable**

In `app/Models/AiRequest.php`, add `'flagged_text'` to the `$fillable` array (after `'status'`):

```php
    protected $fillable = [
        'user_id',
        'feature',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'estimated_cost_cents',
        'status',
        'flagged_text',
    ];
```

- [ ] **Step 5: Cast and allow-list the new user columns**

`app/Models/User.php` uses a PHP `#[Fillable([...])]` attribute (line 16) and a `casts()` method (line 23) — not `$fillable`/`$casts` properties.

(a) Append the three column names inside the existing `#[Fillable([...])]` attribute array (after `'years_experience'`):

```php
    'ai_limit_override', 'ai_blocked', 'ai_usage_reset_at'
```

(b) Add two casts inside the `casts()` return array (`ai_limit_override` needs no cast — it arrives as int|null):

```php
            'ai_blocked' => 'boolean',
            'ai_usage_reset_at' => 'datetime',
```

- [ ] **Step 6: Run migration + test to verify it passes**

Run: `php artisan migrate --no-interaction && php artisan test --compact tests/Feature/Admin/AiAdminSchemaTest.php`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations app/Models/AiRequest.php app/Models/User.php tests/Feature/Admin/AiAdminSchemaTest.php
git commit -m "feat: add AI admin columns (flagged_text, per-user limit/block/reset)"
```

---

## Task 2: Wire columns into `UserLimits`

**Files:**
- Modify: `app/Services/UserLimits.php:74-98`
- Test: `tests/Feature/UserLimitsAiAdminTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/UserLimitsAiAdminTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserLimitsAiAdminTest extends TestCase
{
    use RefreshDatabase;

    public function test_override_replaces_tier_limit(): void
    {
        $user = User::factory()->free()->create(['ai_limit_override' => 999]);

        $this->assertSame(999, UserLimits::aiMonthlyLimit($user));
    }

    public function test_null_override_falls_back_to_tier_limit(): void
    {
        config()->set('ai.monthly_limits.free', 25);
        $user = User::factory()->free()->create(['ai_limit_override' => null]);

        $this->assertSame(25, UserLimits::aiMonthlyLimit($user));
    }

    public function test_blocked_user_cannot_use_ai(): void
    {
        $user = User::factory()->free()->create(['ai_blocked' => true]);

        $this->assertFalse(UserLimits::canUseAi($user));
    }

    public function test_reset_watermark_excludes_earlier_requests(): void
    {
        $user = User::factory()->free()->create();
        AiRequest::factory()->for($user)->create([
            'status' => 'success',
            'created_at' => now()->startOfMonth()->addDays(2),
        ]);

        $this->assertSame(1, UserLimits::aiRequestsThisMonth($user));

        $user->update(['ai_usage_reset_at' => now()->startOfMonth()->addDays(5)]);

        $this->assertSame(0, UserLimits::aiRequestsThisMonth($user->fresh()));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/UserLimitsAiAdminTest.php`
Expected: FAIL — override/block/watermark not honored.

- [ ] **Step 3: Update the three methods**

In `app/Services/UserLimits.php`, replace `aiMonthlyLimit`, `aiRequestsThisMonth`, and `canUseAi` (lines ~74-98) with:

```php
    public static function aiMonthlyLimit(User $user): int
    {
        if ($user->ai_limit_override !== null) {
            return (int) $user->ai_limit_override;
        }

        $limits = config('ai.monthly_limits', []);

        return match ($user->planTier()) {
            'starter' => $limits['starter'] ?? 0,
            'pro' => $limits['pro'] ?? 0,
            'agency' => $limits['agency'] ?? 0,
            'free' => $limits['free'] ?? 0,
            default => $limits['free'] ?? 0, // unknown — most restrictive
        };
    }

    public static function aiRequestsThisMonth(User $user): int
    {
        $since = now()->startOfMonth();
        if ($user->ai_usage_reset_at !== null && $user->ai_usage_reset_at->greaterThan($since)) {
            $since = $user->ai_usage_reset_at;
        }

        return AiRequest::where('user_id', $user->id)
            ->where('status', 'success')
            ->where('created_at', '>=', $since)
            ->count();
    }

    public static function canUseAi(User $user): bool
    {
        if ($user->ai_blocked) {
            return false;
        }

        return self::aiRequestsThisMonth($user) < self::aiMonthlyLimit($user);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/UserLimitsAiAdminTest.php`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the existing AI limit tests to confirm no regression**

Run: `php artisan test --compact --filter='UserLimitsAi|TierLimits|AiSuggestion'`
Expected: PASS (existing AI/tier tests still green).

- [ ] **Step 6: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Services/UserLimits.php tests/Feature/UserLimitsAiAdminTest.php
git commit -m "feat: UserLimits honors per-user AI override, block, and quota reset"
```

---

## Task 3: Persist flagged input text in `AiService`

**Files:**
- Modify: `app/Services/AiService.php` (the `moderate()` and `log()` methods)
- Test: `tests/Feature/AiServiceFlaggedTextTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/AiServiceFlaggedTextTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Exceptions\ModerationException;
use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class AiServiceFlaggedTextTest extends TestCase
{
    use RefreshDatabase;

    public function test_flagged_input_text_is_stored_on_the_logged_row(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->create();

        try {
            app(AiService::class)->chat('the offending text', ['user' => $user, 'feature' => 'rewrite_bullet']);
            $this->fail('Expected ModerationException.');
        } catch (ModerationException) {
            // expected
        }

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'status' => 'flagged',
            'flagged_text' => 'the offending text',
        ]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/AiServiceFlaggedTextTest.php`
Expected: FAIL — `flagged_text` is null (not yet written).

- [ ] **Step 3: Thread the text through `log()`**

In `app/Services/AiService.php`:

(a) Update the `moderate()` flagged branch to pass the text:

```php
        if ($result->results[0]->flagged ?? false) {
            $this->log($user, $feature, $model, 0, 0, 0, 'flagged', $text);

            throw new ModerationException;
        }
```

(b) Add a nullable `$flaggedText` parameter to `log()` and include it in the insert:

```php
    private function log(
        ?User $user,
        ?string $feature,
        string $model,
        int $promptTokens,
        int $completionTokens,
        int $totalTokens,
        string $status,
        ?string $flaggedText = null,
    ): void {
        AiRequest::create([
            'user_id' => $user?->id,
            'feature' => $feature,
            'model' => $model,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'total_tokens' => $totalTokens,
            'estimated_cost_cents' => $this->estimateCostCents($model, $promptTokens, $completionTokens),
            'status' => $status,
            'flagged_text' => $flaggedText,
        ]);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/AiServiceFlaggedTextTest.php`
Expected: PASS.

- [ ] **Step 5: Confirm existing AiService tests still pass**

Run: `php artisan test --compact tests/Feature/AiServiceTest.php`
Expected: PASS (success-path rows still log `flagged_text => null`).

- [ ] **Step 6: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Services/AiService.php tests/Feature/AiServiceFlaggedTextTest.php
git commit -m "feat: persist flagged input text on moderation-rejected AI requests"
```

---

## Task 4: `OpenAiUsageService` (fail-soft, cached cost/usage)

**Files:**
- Modify: `config/ai.php` (add `admin_key`)
- Create: `app/Services/OpenAiUsageService.php`
- Test: `tests/Feature/OpenAiUsageServiceTest.php`

- [ ] **Step 1: Add the config key**

In `config/ai.php`, add after the `'model'` entry:

```php
    /*
     * Org-level Admin API key (distinct from OPENAI_API_KEY) used only by
     * App\Services\OpenAiUsageService to read org Costs/Usage. Optional —
     * when absent, the admin dashboard degrades gracefully.
     */
    'admin_key' => env('OPENAI_ADMIN_KEY'),
```

- [ ] **Step 2: Write the failing test**

Create `tests/Feature/OpenAiUsageServiceTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Services\OpenAiUsageService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpenAiUsageServiceTest extends TestCase
{
    public function test_returns_total_cents_from_costs_endpoint(): void
    {
        config()->set('ai.admin_key', 'sk-admin-test');
        Cache::flush();
        Http::fake([
            'api.openai.com/v1/organization/costs*' => Http::response([
                'data' => [
                    ['results' => [['amount' => ['value' => 1.23, 'currency' => 'usd']]]],
                    ['results' => [['amount' => ['value' => 0.77, 'currency' => 'usd']]]],
                ],
            ], 200),
        ]);

        $cents = app(OpenAiUsageService::class)->totalCostCents(now()->subDays(7), now());

        $this->assertSame(200, $cents); // (1.23 + 0.77) * 100
    }

    public function test_missing_admin_key_returns_null_without_calling_http(): void
    {
        config()->set('ai.admin_key', null);
        Http::fake(); // any call would record; we assert none happen

        $cents = app(OpenAiUsageService::class)->totalCostCents(now()->subDays(7), now());

        $this->assertNull($cents);
        Http::assertNothingSent();
    }

    public function test_http_failure_degrades_to_null(): void
    {
        config()->set('ai.admin_key', 'sk-admin-test');
        Cache::flush();
        Http::fake(['api.openai.com/*' => Http::response('nope', 500)]);

        $cents = app(OpenAiUsageService::class)->totalCostCents(now()->subDays(7), now());

        $this->assertNull($cents);
    }
}
```

- [ ] **Step 3: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/OpenAiUsageServiceTest.php`
Expected: FAIL — class does not exist.

- [ ] **Step 4: Implement the service**

Create `app/Services/OpenAiUsageService.php`:

```php
<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class OpenAiUsageService
{
    private const COSTS_URL = 'https://api.openai.com/v1/organization/costs';

    /**
     * Total OpenAI-billed cost (in cents) for the window, or null when the
     * Admin key is missing or the API call fails. Cached for one hour.
     */
    public function totalCostCents(CarbonInterface $start, CarbonInterface $end): ?int
    {
        $key = config('ai.admin_key');
        if (empty($key)) {
            return null;
        }

        $cacheKey = 'openai_costs_'.$start->timestamp.'_'.$end->timestamp;

        return Cache::remember($cacheKey, now()->addHour(), function () use ($key, $start, $end): ?int {
            try {
                $response = Http::withToken($key)
                    ->timeout(10)
                    ->get(self::COSTS_URL, [
                        'start_time' => $start->timestamp,
                        'end_time' => $end->timestamp,
                        'bucket_width' => '1d',
                        'limit' => 180,
                    ]);

                if ($response->failed()) {
                    return null;
                }

                $dollars = collect($response->json('data', []))
                    ->flatMap(fn (array $bucket): array => $bucket['results'] ?? [])
                    ->sum(fn (array $result): float => (float) data_get($result, 'amount.value', 0));

                return (int) round($dollars * 100);
            } catch (Throwable $e) {
                Log::warning('OpenAI costs fetch failed', ['message' => $e->getMessage()]);

                return null;
            }
        });
    }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/OpenAiUsageServiceTest.php`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add config/ai.php app/Services/OpenAiUsageService.php tests/Feature/OpenAiUsageServiceTest.php
git commit -m "feat: OpenAiUsageService reads org costs (cached, fail-soft)"
```

---

## Task 5: Aggregator service for internal AI stats

**Files:**
- Create: `app/Services/AiUsageReport.php`
- Test: `tests/Feature/AiUsageReportTest.php`

This service centralizes the SQL aggregates so the controller stays thin and the math is unit-tested.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/AiUsageReportTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\AiUsageReport;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiUsageReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_overview_totals_for_period(): void
    {
        $user = User::factory()->create();
        AiRequest::factory()->for($user)->count(3)->create([
            'status' => 'success', 'total_tokens' => 10, 'estimated_cost_cents' => 2,
            'created_at' => now()->subDays(1),
        ]);
        AiRequest::factory()->for($user)->create([
            'status' => 'flagged', 'created_at' => now()->subDays(1),
        ]);
        // Outside the 7d window — must be excluded.
        AiRequest::factory()->for($user)->create([
            'status' => 'success', 'estimated_cost_cents' => 99,
            'created_at' => now()->subDays(40),
        ]);

        $report = new AiUsageReport;
        $totals = $report->totals('7d');

        $this->assertSame(4, $totals['requests']);          // 3 success + 1 flagged in window
        $this->assertSame(30, $totals['tokens']);
        $this->assertSame(6, $totals['estimated_cost_cents']);
        $this->assertSame(1, $totals['flagged']);
        $this->assertSame(1, $totals['active_users']);
    }

    public function test_breakdown_groups_by_column(): void
    {
        $user = User::factory()->create();
        AiRequest::factory()->for($user)->count(2)->create(['feature' => 'summary', 'created_at' => now()]);
        AiRequest::factory()->for($user)->create(['feature' => 'rewrite_bullet', 'created_at' => now()]);

        $rows = (new AiUsageReport)->breakdown('feature', 'all');

        $this->assertSame('summary', $rows[0]['label']);    // ordered by count desc
        $this->assertSame(2, $rows[0]['count']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/AiUsageReportTest.php`
Expected: FAIL — class does not exist.

- [ ] **Step 3: Implement the aggregator**

Create `app/Services/AiUsageReport.php`:

```php
<?php

namespace App\Services;

use App\Models\AiRequest;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

class AiUsageReport
{
    /**
     * Resolve a period token to a lower-bound timestamp (null = all time).
     */
    public function since(string $period): ?CarbonImmutable
    {
        return match ($period) {
            '7d' => CarbonImmutable::now()->subDays(7),
            '30d' => CarbonImmutable::now()->subDays(30),
            default => null, // 'all'
        };
    }

    private function scoped(string $period): Builder
    {
        $query = AiRequest::query();
        $since = $this->since($period);
        if ($since !== null) {
            $query->where('created_at', '>=', $since);
        }

        return $query;
    }

    /**
     * @return array{requests:int, tokens:int, estimated_cost_cents:int, flagged:int, success:int, active_users:int}
     */
    public function totals(string $period): array
    {
        $row = $this->scoped($period)
            ->selectRaw('COUNT(*) as requests')
            ->selectRaw('COALESCE(SUM(total_tokens),0) as tokens')
            ->selectRaw('COALESCE(SUM(estimated_cost_cents),0) as estimated_cost_cents')
            ->selectRaw("SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END) as flagged")
            ->selectRaw("SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as success")
            ->selectRaw('COUNT(DISTINCT user_id) as active_users')
            ->first();

        return [
            'requests' => (int) $row->requests,
            'tokens' => (int) $row->tokens,
            'estimated_cost_cents' => (int) $row->estimated_cost_cents,
            'flagged' => (int) $row->flagged,
            'success' => (int) $row->success,
            'active_users' => (int) $row->active_users,
        ];
    }

    /**
     * Grouped counts + cost for one of: feature, model, status.
     *
     * @return array<int, array{label:string, count:int, cost_cents:int}>
     */
    public function breakdown(string $column, string $period): array
    {
        if (! in_array($column, ['feature', 'model', 'status'], true)) {
            return [];
        }

        return $this->scoped($period)
            ->selectRaw("COALESCE({$column}, 'unknown') as label")
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('COALESCE(SUM(estimated_cost_cents),0) as cost_cents')
            ->groupBy('label')
            ->orderByDesc('count')
            ->get()
            ->map(fn ($r): array => [
                'label' => (string) $r->label,
                'count' => (int) $r->count,
                'cost_cents' => (int) $r->cost_cents,
            ])
            ->all();
    }

    /**
     * Daily request volume + cost series for charting.
     *
     * @return array<int, array{date:string, count:int, cost_cents:int}>
     */
    public function dailySeries(string $period): array
    {
        return $this->scoped($period)
            ->selectRaw('DATE(created_at) as date')
            ->selectRaw('COUNT(*) as count')
            ->selectRaw('COALESCE(SUM(estimated_cost_cents),0) as cost_cents')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($r): array => [
                'date' => (string) $r->date,
                'count' => (int) $r->count,
                'cost_cents' => (int) $r->cost_cents,
            ])
            ->all();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/AiUsageReportTest.php`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Services/AiUsageReport.php tests/Feature/AiUsageReportTest.php
git commit -m "feat: AiUsageReport aggregator (totals, breakdowns, daily series)"
```

---

## Task 6: Overview route + controller + page (with charts)

**Files:**
- Create: `app/Http/Controllers/Admin/AdminAiController.php`
- Modify: `routes/web.php` (inside the admin group at line ~207)
- Create: `resources/js/Pages/Admin/Ai/Charts.tsx`
- Create: `resources/js/Pages/Admin/Ai/Overview.tsx`
- Modify: `resources/js/Layouts/AdminLayout.tsx` (add nav item)
- Test: `tests/Feature/Admin/AdminAiOverviewTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Admin/AdminAiOverviewTest.php`:

```php
<?php

namespace Tests\Feature\Admin;

use App\Models\AiRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminAiOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_non_admin_is_forbidden(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)->get(route('admin.ai.overview'))->assertForbidden();
    }

    public function test_admin_sees_totals_and_breakdowns(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        AiRequest::factory()->for($admin)->count(2)->create([
            'status' => 'success', 'feature' => 'summary', 'estimated_cost_cents' => 5,
            'created_at' => now(),
        ]);

        $this->actingAs($admin)->get(route('admin.ai.overview'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Ai/Overview')
                ->where('period', '30d')
                ->where('totals.requests', 2)
                ->where('totals.estimated_cost_cents', 10)
                ->has('series')
                ->has('byFeature')
                ->has('byModel')
                ->has('byStatus')
                ->has('openAiCostCents') // null or int — present either way
            );
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Admin/AdminAiOverviewTest.php`
Expected: FAIL — route `admin.ai.overview` not defined.

- [ ] **Step 3: Create the controller**

Create `app/Http/Controllers/Admin/AdminAiController.php`:

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AiUsageReport;
use App\Services\OpenAiUsageService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminAiController extends Controller
{
    public function __construct(
        private AiUsageReport $report,
        private OpenAiUsageService $openAi,
    ) {}

    public function overview(Request $request): Response
    {
        $period = $this->period($request);
        $since = $this->report->since($period) ?? now()->subYears(5);

        return Inertia::render('Admin/Ai/Overview', [
            'period' => $period,
            'totals' => $this->report->totals($period),
            'series' => $this->report->dailySeries($period),
            'byFeature' => $this->report->breakdown('feature', $period),
            'byModel' => $this->report->breakdown('model', $period),
            'byStatus' => $this->report->breakdown('status', $period),
            'openAiCostCents' => $this->openAi->totalCostCents($since, now()),
        ]);
    }

    /**
     * Normalize the period query param to a known token.
     */
    private function period(Request $request): string
    {
        $period = (string) $request->query('period', '30d');

        return in_array($period, ['7d', '30d', 'all'], true) ? $period : '30d';
    }
}
```

- [ ] **Step 4: Register the route**

In `routes/web.php`, inside the `Route::middleware(['auth', 'master_admin'])->prefix('admin')->name('admin.')->group(function () {` block, add:

```php
    Route::get('/ai', [\App\Http\Controllers\Admin\AdminAiController::class, 'overview'])->name('ai.overview');
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Admin/AdminAiOverviewTest.php`
Expected: PASS (2 tests).

- [ ] **Step 6: Create the reusable chart primitives**

Create `resources/js/Pages/Admin/Ai/Charts.tsx`:

```tsx
type SeriesPoint = { date: string; count: number; cost_cents: number };
type BarRow = { label: string; count: number; cost_cents: number };

const fmtCents = (c: number) => `$${(c / 100).toFixed(2)}`;

// Inline-SVG line chart of daily counts. No chart dependency.
export function LineChart({ series, height = 120 }: { series: SeriesPoint[]; height?: number }) {
    if (series.length === 0) return <p className="text-sm text-gray-400">No data for this period.</p>;
    const w = 600;
    const max = Math.max(1, ...series.map((p) => p.count));
    const step = series.length > 1 ? w / (series.length - 1) : 0;
    const pts = series
        .map((p, i) => `${i * step},${height - (p.count / max) * height}`)
        .join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
            <polyline fill="none" stroke="#6366f1" strokeWidth="2" points={pts} />
        </svg>
    );
}

// Horizontal bars for a grouped breakdown.
export function BarList({ rows, showCost = false }: { rows: BarRow[]; showCost?: boolean }) {
    if (rows.length === 0) return <p className="text-sm text-gray-400">No data.</p>;
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <ul className="space-y-2">
            {rows.map((r) => (
                <li key={r.label}>
                    <div className="flex justify-between text-xs text-gray-600">
                        <span>{r.label}</span>
                        <span>{r.count}{showCost ? ` · ${fmtCents(r.cost_cents)}` : ''}</span>
                    </div>
                    <div className="h-2 rounded bg-gray-100">
                        <div className="h-2 rounded bg-indigo-500" style={{ width: `${(r.count / max) * 100}%` }} />
                    </div>
                </li>
            ))}
        </ul>
    );
}

// KPI stat card.
export function Stat({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
        </div>
    );
}

export { fmtCents };
```

- [ ] **Step 7: Create the Overview page**

Create `resources/js/Pages/Admin/Ai/Overview.tsx`:

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router } from '@inertiajs/react';
import { BarList, LineChart, Stat, fmtCents } from './Charts';

type BarRow = { label: string; count: number; cost_cents: number };
type Props = {
    period: string;
    totals: { requests: number; tokens: number; estimated_cost_cents: number; flagged: number; success: number; active_users: number };
    series: { date: string; count: number; cost_cents: number }[];
    byFeature: BarRow[];
    byModel: BarRow[];
    byStatus: BarRow[];
    openAiCostCents: number | null;
};

const PERIODS = ['7d', '30d', 'all'] as const;

export default function AiOverview({ period, totals, series, byFeature, byModel, byStatus, openAiCostCents }: Props) {
    const successRate = totals.requests > 0 ? Math.round((totals.success / totals.requests) * 100) : 0;
    const go = (p: string) => router.get(route('admin.ai.overview'), { period: p }, { preserveState: true, replace: true });

    return (
        <AdminLayout>
            <Head title="AI Usage" />
            <div className="mb-4 flex items-center justify-between">
                <h1 className="text-xl font-semibold">AI Usage</h1>
                <div className="flex gap-1">
                    {PERIODS.map((p) => (
                        <button key={p} onClick={() => go(p)}
                            className={`rounded px-3 py-1 text-sm ${period === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Requests" value={totals.requests} />
                <Stat label="Our est. cost" value={fmtCents(totals.estimated_cost_cents)} />
                <Stat label="OpenAI actual" value={openAiCostCents === null ? 'unavailable' : fmtCents(openAiCostCents)} />
                <Stat label="Success rate" value={`${successRate}%`} />
                <Stat label="Tokens" value={totals.tokens.toLocaleString()} />
                <Stat label="Flagged" value={totals.flagged} />
                <Stat label="Active users" value={totals.active_users} />
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                <h2 className="mb-2 text-sm font-medium text-gray-700">Daily requests</h2>
                <LineChart series={series} />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-2 text-sm font-medium text-gray-700">By feature</h2>
                    <BarList rows={byFeature} showCost />
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-2 text-sm font-medium text-gray-700">By model</h2>
                    <BarList rows={byModel} showCost />
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <h2 className="mb-2 text-sm font-medium text-gray-700">By status</h2>
                    <BarList rows={byStatus} />
                </div>
            </div>
        </AdminLayout>
    );
}
```

- [ ] **Step 8: Add the admin nav item**

In `resources/js/Layouts/AdminLayout.tsx`, replace the dead `AI Rates` nav entry (line ~20) with a working AI Usage link:

```tsx
    { label: 'AI Usage',  href: safeRoute('admin.ai.overview', '/admin/ai'),       pattern: 'admin.ai.*' },
```

- [ ] **Step 9: Build the frontend to type-check**

Run: `npm run build`
Expected: tsc + vite build succeed with no type errors.

- [ ] **Step 10: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Admin/AdminAiController.php routes/web.php resources/js/Pages/Admin/Ai/Charts.tsx resources/js/Pages/Admin/Ai/Overview.tsx resources/js/Layouts/AdminLayout.tsx tests/Feature/Admin/AdminAiOverviewTest.php
git commit -m "feat: admin AI overview dashboard with charts + period selector"
```

---

## Task 7: Users table + per-user detail + controls

**Files:**
- Modify: `app/Http/Controllers/Admin/AdminAiController.php` (add `users`, `user`, `resetQuota`, `setLimit`, `toggleBlock`)
- Modify: `routes/web.php` (admin group)
- Create: `resources/js/Pages/Admin/Ai/Users.tsx`
- Create: `resources/js/Pages/Admin/Ai/User.tsx`
- Test: `tests/Feature/Admin/AdminAiControlsTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Admin/AdminAiControlsTest.php`:

```php
<?php

namespace Tests\Feature\Admin;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminAiControlsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['is_master_admin' => true]);
    }

    public function test_users_table_lists_ai_active_users(): void
    {
        $admin = $this->admin();
        $target = User::factory()->free()->create();
        AiRequest::factory()->for($target)->create(['status' => 'success', 'estimated_cost_cents' => 7, 'created_at' => now()]);

        $this->actingAs($admin)->get(route('admin.ai.users'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Ai/Users')
                ->has('users.data', 1)
                ->where('users.data.0.id', $target->id)
                ->where('users.data.0.estimated_cost_cents', 7)
            );
    }

    public function test_reset_quota_sets_watermark(): void
    {
        $admin = $this->admin();
        $target = User::factory()->free()->create();
        AiRequest::factory()->for($target)->create(['status' => 'success', 'created_at' => now()->startOfMonth()->addDay()]);
        $this->assertSame(1, UserLimits::aiRequestsThisMonth($target));

        $this->actingAs($admin)->patch(route('admin.ai.reset-quota', $target))->assertRedirect();

        $this->assertNotNull($target->fresh()->ai_usage_reset_at);
        $this->assertSame(0, UserLimits::aiRequestsThisMonth($target->fresh()));
    }

    public function test_set_limit_override_and_clear(): void
    {
        $admin = $this->admin();
        $target = User::factory()->free()->create();

        $this->actingAs($admin)->patch(route('admin.ai.limit', $target), ['limit' => 500])->assertRedirect();
        $this->assertSame(500, $target->fresh()->ai_limit_override);

        $this->actingAs($admin)->patch(route('admin.ai.limit', $target), ['limit' => null])->assertRedirect();
        $this->assertNull($target->fresh()->ai_limit_override);
    }

    public function test_toggle_block_prevents_ai_use(): void
    {
        $admin = $this->admin();
        $target = User::factory()->free()->create();

        $this->actingAs($admin)->patch(route('admin.ai.block', $target))->assertRedirect();

        $this->assertTrue($target->fresh()->ai_blocked);
        $this->assertFalse(UserLimits::canUseAi($target->fresh()));
    }

    public function test_controls_are_master_admin_only(): void
    {
        $nonAdmin = User::factory()->create(['is_master_admin' => false]);
        $target = User::factory()->create();

        $this->actingAs($nonAdmin)->patch(route('admin.ai.block', $target))->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Admin/AdminAiControlsTest.php`
Expected: FAIL — routes not defined.

- [ ] **Step 3: Add controller methods**

Append these methods to `app/Http/Controllers/Admin/AdminAiController.php` (and add `use App\Models\AiRequest;`, `use App\Models\User;`, `use App\Services\UserLimits;`, `use Illuminate\Http\RedirectResponse;` to the imports):

```php
    public function users(Request $request): Response
    {
        $period = $this->period($request);
        $since = $this->report->since($period);

        $rows = AiRequest::query()
            ->when($since !== null, fn ($q) => $q->where('created_at', '>=', $since))
            ->selectRaw('user_id')
            ->selectRaw('COUNT(*) as requests')
            ->selectRaw('COALESCE(SUM(total_tokens),0) as tokens')
            ->selectRaw('COALESCE(SUM(estimated_cost_cents),0) as estimated_cost_cents')
            ->selectRaw("SUM(CASE WHEN status='flagged' THEN 1 ELSE 0 END) as flagged")
            ->selectRaw('MAX(created_at) as last_used')
            ->whereNotNull('user_id')
            ->groupBy('user_id')
            ->orderByDesc('estimated_cost_cents')
            ->paginate(25)
            ->withQueryString()
            ->through(function ($row) {
                $user = User::find($row->user_id);

                return [
                    'id' => $row->user_id,
                    'name' => $user?->name,
                    'email' => $user?->email,
                    'tier' => $user?->planTier(),
                    'requests' => (int) $row->requests,
                    'tokens' => (int) $row->tokens,
                    'estimated_cost_cents' => (int) $row->estimated_cost_cents,
                    'flagged' => (int) $row->flagged,
                    'blocked' => (bool) $user?->ai_blocked,
                    'limit' => $user ? UserLimits::aiMonthlyLimit($user) : null,
                    'used' => $user ? UserLimits::aiRequestsThisMonth($user) : null,
                    'last_used' => $row->last_used,
                ];
            });

        return Inertia::render('Admin/Ai/Users', [
            'users' => $rows,
            'period' => $period,
            'flash' => session()->only(['success', 'error']),
        ]);
    }

    public function user(User $user): Response
    {
        return Inertia::render('Admin/Ai/User', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'tier' => $user->planTier(),
                'ai_blocked' => $user->ai_blocked,
                'ai_limit_override' => $user->ai_limit_override,
                'limit' => UserLimits::aiMonthlyLimit($user),
                'used' => UserLimits::aiRequestsThisMonth($user),
            ],
            'recent' => $user->aiRequests()->latest()->limit(50)->get(['feature', 'model', 'status', 'total_tokens', 'estimated_cost_cents', 'created_at']),
            'flash' => session()->only(['success', 'error']),
        ]);
    }

    public function resetQuota(User $user): RedirectResponse
    {
        $user->update(['ai_usage_reset_at' => now()]);

        return back()->with('success', 'Monthly AI usage reset.');
    }

    public function setLimit(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate(['limit' => ['nullable', 'integer', 'min:0', 'max:100000']]);
        $user->update(['ai_limit_override' => $data['limit'] ?? null]);

        return back()->with('success', 'Custom AI limit updated.');
    }

    public function toggleBlock(User $user): RedirectResponse
    {
        $user->update(['ai_blocked' => ! $user->ai_blocked]);

        return back()->with('success', $user->ai_blocked ? 'User AI blocked.' : 'User AI unblocked.');
    }
```

- [ ] **Step 4: Add the `aiRequests` relation to the User model**

`HasMany` is already imported in `app/Models/User.php` (line 10). Add (near the other relations):

```php
    /**
     * @return HasMany<AiRequest, $this>
     */
    public function aiRequests(): HasMany
    {
        return $this->hasMany(AiRequest::class);
    }
```

- [ ] **Step 5: Register the routes**

In `routes/web.php`, in the admin group, below the `ai.overview` route add:

```php
    Route::get('/ai/users', [\App\Http\Controllers\Admin\AdminAiController::class, 'users'])->name('ai.users');
    Route::get('/ai/users/{user}', [\App\Http\Controllers\Admin\AdminAiController::class, 'user'])->name('ai.user');
    Route::patch('/ai/users/{user}/reset-quota', [\App\Http\Controllers\Admin\AdminAiController::class, 'resetQuota'])->name('ai.reset-quota');
    Route::patch('/ai/users/{user}/limit', [\App\Http\Controllers\Admin\AdminAiController::class, 'setLimit'])->name('ai.limit');
    Route::patch('/ai/users/{user}/block', [\App\Http\Controllers\Admin\AdminAiController::class, 'toggleBlock'])->name('ai.block');
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Admin/AdminAiControlsTest.php`
Expected: PASS (5 tests).

- [ ] **Step 7: Create the Users table page**

Create `resources/js/Pages/Admin/Ai/Users.tsx`:

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { fmtCents } from './Charts';

type Row = {
    id: number; name: string | null; email: string | null; tier: string | null;
    requests: number; tokens: number; estimated_cost_cents: number; flagged: number;
    blocked: boolean; limit: number | null; used: number | null; last_used: string | null;
};
type Props = { users: { data: Row[]; links: { url: string | null; label: string; active: boolean }[] }; period: string };

export default function AiUsers({ users }: Props) {
    return (
        <AdminLayout>
            <Head title="AI Usage by user" />
            <h1 className="mb-4 text-xl font-semibold">AI Usage by user</h1>
            <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                    <tr>
                        <th className="py-2">User</th><th>Tier</th><th>Requests</th>
                        <th>Est. cost</th><th>Flagged</th><th>Used / limit</th><th></th>
                    </tr>
                </thead>
                <tbody>
                    {users.data.map((u) => (
                        <tr key={u.id} className="border-t border-gray-100">
                            <td className="py-2">
                                <div className="font-medium">{u.name ?? '—'}{u.blocked && <span className="ml-2 rounded bg-red-100 px-1 text-xs text-red-700">blocked</span>}</div>
                                <div className="text-gray-400">{u.email}</div>
                            </td>
                            <td>{u.tier}</td>
                            <td>{u.requests}</td>
                            <td>{fmtCents(u.estimated_cost_cents)}</td>
                            <td>{u.flagged > 0 ? <span className="text-red-600">{u.flagged}</span> : 0}</td>
                            <td>{u.used} / {u.limit}</td>
                            <td><Link href={route('admin.ai.user', u.id)} className="text-indigo-600">Manage →</Link></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {users.data.length === 0 && <p className="mt-4 text-gray-400">No AI activity in this period.</p>}
        </AdminLayout>
    );
}
```

- [ ] **Step 8: Create the per-user detail + controls page**

Create `resources/js/Pages/Admin/Ai/User.tsx`:

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { fmtCents } from './Charts';

type Recent = { feature: string | null; model: string; status: string; total_tokens: number; estimated_cost_cents: number; created_at: string };
type Props = {
    user: { id: number; name: string; email: string; tier: string; ai_blocked: boolean; ai_limit_override: number | null; limit: number; used: number };
    recent: Recent[];
};

export default function AiUser({ user, recent }: Props) {
    const { data, setData, patch } = useForm({ limit: user.ai_limit_override ?? '' });
    const pct = user.limit > 0 ? Math.min(100, Math.round((user.used / user.limit) * 100)) : 0;

    return (
        <AdminLayout>
            <Head title={`AI · ${user.name}`} />
            <h1 className="text-xl font-semibold">{user.name} <span className="text-gray-400">({user.tier})</span></h1>
            <p className="text-gray-500">{user.email}</p>

            <div className="mt-4 max-w-md">
                <div className="flex justify-between text-xs text-gray-600"><span>Used this month</span><span>{user.used} / {user.limit}</span></div>
                <div className="h-3 rounded bg-gray-100"><div className="h-3 rounded bg-indigo-500" style={{ width: `${pct}%` }} /></div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={() => router.patch(route('admin.ai.reset-quota', user.id), {}, { preserveScroll: true })}
                    className="rounded bg-gray-100 px-3 py-2 text-sm">Reset monthly usage</button>
                <button onClick={() => router.patch(route('admin.ai.block', user.id), {}, { preserveScroll: true })}
                    className={`rounded px-3 py-2 text-sm ${user.ai_blocked ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {user.ai_blocked ? 'Unblock AI' : 'Block AI'}
                </button>
                <form onSubmit={(e) => { e.preventDefault(); patch(route('admin.ai.limit', user.id), { preserveScroll: true }); }} className="flex items-center gap-2">
                    <input type="number" min={0} value={data.limit} onChange={(e) => setData('limit', e.target.value)}
                        placeholder="tier default" className="w-32 rounded border-gray-300 text-sm" />
                    <button type="submit" className="rounded bg-indigo-600 px-3 py-2 text-sm text-white">Set limit</button>
                </form>
            </div>

            <h2 className="mt-8 mb-2 text-sm font-medium text-gray-700">Recent requests</h2>
            <table className="w-full text-sm">
                <thead className="text-left text-gray-500"><tr><th className="py-1">When</th><th>Feature</th><th>Status</th><th>Tokens</th><th>Cost</th></tr></thead>
                <tbody>
                    {recent.map((r, i) => (
                        <tr key={i} className="border-t border-gray-100">
                            <td className="py-1">{new Date(r.created_at).toLocaleString()}</td>
                            <td>{r.feature ?? '—'}</td>
                            <td className={r.status === 'flagged' ? 'text-red-600' : r.status === 'error' ? 'text-amber-600' : ''}>{r.status}</td>
                            <td>{r.total_tokens}</td>
                            <td>{fmtCents(r.estimated_cost_cents)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AdminLayout>
    );
}
```

- [ ] **Step 9: Build the frontend to type-check**

Run: `npm run build`
Expected: succeeds, no type errors.

- [ ] **Step 10: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Admin/AdminAiController.php app/Models/User.php routes/web.php resources/js/Pages/Admin/Ai/Users.tsx resources/js/Pages/Admin/Ai/User.tsx tests/Feature/Admin/AdminAiControlsTest.php
git commit -m "feat: admin AI per-user usage table + reset/limit/block controls"
```

---

## Task 8: Flagged review queue + retention prune

**Files:**
- Modify: `app/Http/Controllers/Admin/AdminAiController.php` (add `flagged`, `destroyFlagged`)
- Modify: `routes/web.php` (admin group)
- Create: `app/Console/Commands/PruneFlaggedAiText.php`
- Modify: `routes/console.php` (schedule)
- Create: `resources/js/Pages/Admin/Ai/Flagged.tsx`
- Test: `tests/Feature/Admin/AdminAiFlaggedTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/Admin/AdminAiFlaggedTest.php`:

```php
<?php

namespace Tests\Feature\Admin;

use App\Models\AiRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AdminAiFlaggedTest extends TestCase
{
    use RefreshDatabase;

    public function test_queue_lists_flagged_rows_with_text(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'nasty input', 'created_at' => now()]);

        $this->actingAs($admin)->get(route('admin.ai.flagged'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('Admin/Ai/Flagged')
                ->has('items.data', 1)
                ->where('items.data.0.flagged_text', 'nasty input')
            );
    }

    public function test_destroy_removes_a_flagged_entry(): void
    {
        $admin = User::factory()->create(['is_master_admin' => true]);
        $row = AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'x']);

        $this->actingAs($admin)->delete(route('admin.ai.flagged.destroy', $row))->assertRedirect();

        $this->assertDatabaseMissing('ai_requests', ['id' => $row->id]);
    }

    public function test_prune_command_nulls_old_text_but_keeps_row(): void
    {
        $old = AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'old', 'created_at' => now()->subDays(120)]);
        $recent = AiRequest::factory()->create(['status' => 'flagged', 'flagged_text' => 'recent', 'created_at' => now()->subDays(10)]);

        $this->artisan('ai:prune-flagged', ['--days' => 90])->assertExitCode(0);

        $this->assertNull($old->fresh()->flagged_text);
        $this->assertDatabaseHas('ai_requests', ['id' => $old->id]); // row kept
        $this->assertSame('recent', $recent->fresh()->flagged_text);
    }

    public function test_queue_is_master_admin_only(): void
    {
        $user = User::factory()->create(['is_master_admin' => false]);

        $this->actingAs($user)->get(route('admin.ai.flagged'))->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Feature/Admin/AdminAiFlaggedTest.php`
Expected: FAIL — routes and command not defined.

- [ ] **Step 3: Add controller methods**

Append to `app/Http/Controllers/Admin/AdminAiController.php`:

```php
    public function flagged(): Response
    {
        $items = AiRequest::query()
            ->where('status', 'flagged')
            ->whereNotNull('flagged_text')
            ->with('user:id,name,email')
            ->latest()
            ->paginate(25)
            ->through(fn (AiRequest $r): array => [
                'id' => $r->id,
                'feature' => $r->feature,
                'flagged_text' => $r->flagged_text,
                'created_at' => $r->created_at,
                'user' => $r->user ? ['id' => $r->user->id, 'name' => $r->user->name, 'email' => $r->user->email] : null,
            ]);

        return Inertia::render('Admin/Ai/Flagged', [
            'items' => $items,
            'flash' => session()->only(['success', 'error']),
        ]);
    }

    public function destroyFlagged(AiRequest $aiRequest): RedirectResponse
    {
        $aiRequest->delete();

        return back()->with('success', 'Flagged entry deleted.');
    }
```

- [ ] **Step 4: Register the routes**

In `routes/web.php`, admin group:

```php
    Route::get('/ai/flagged', [\App\Http\Controllers\Admin\AdminAiController::class, 'flagged'])->name('ai.flagged');
    Route::delete('/ai/flagged/{aiRequest}', [\App\Http\Controllers\Admin\AdminAiController::class, 'destroyFlagged'])->name('ai.flagged.destroy');
```

- [ ] **Step 5: Create the prune command**

Run: `php artisan make:command PruneFlaggedAiText --no-interaction`

Replace `app/Console/Commands/PruneFlaggedAiText.php` with:

```php
<?php

namespace App\Console\Commands;

use App\Models\AiRequest;
use Illuminate\Console\Command;

class PruneFlaggedAiText extends Command
{
    protected $signature = 'ai:prune-flagged {--days=90 : Age in days after which flagged_text is cleared}';

    protected $description = 'Null out stored flagged input text older than the retention window (keeps the metric row).';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $count = AiRequest::whereNotNull('flagged_text')
            ->where('created_at', '<', now()->subDays($days))
            ->update(['flagged_text' => null]);

        $this->info("Cleared flagged_text on {$count} row(s) older than {$days} days.");

        return self::SUCCESS;
    }
}
```

- [ ] **Step 6: Schedule the prune daily**

In `routes/console.php`, add (the `Schedule` facade is already imported there, alongside the existing `resumes:nudge-stale` / `strength-snapshots:prune` schedules):

```php
Schedule::command('ai:prune-flagged')->daily();
```

- [ ] **Step 7: Run test to verify it passes**

Run: `php artisan test --compact tests/Feature/Admin/AdminAiFlaggedTest.php`
Expected: PASS (4 tests).

- [ ] **Step 8: Create the Flagged queue page**

Create `resources/js/Pages/Admin/Ai/Flagged.tsx`:

```tsx
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, router } from '@inertiajs/react';

type Item = {
    id: number; feature: string | null; flagged_text: string; created_at: string;
    user: { id: number; name: string; email: string } | null;
};
type Props = { items: { data: Item[]; links: { url: string | null; label: string; active: boolean }[] } };

export default function AiFlagged({ items }: Props) {
    return (
        <AdminLayout>
            <Head title="Flagged AI content" />
            <h1 className="mb-4 text-xl font-semibold">Flagged AI content</h1>
            {items.data.length === 0 && <p className="text-gray-400">Nothing flagged. 🎉</p>}
            <ul className="space-y-3">
                {items.data.map((it) => (
                    <li key={it.id} className="rounded-lg border border-red-100 bg-red-50 p-4">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>
                                {it.user
                                    ? <Link href={route('admin.ai.user', it.user.id)} className="text-indigo-600">{it.user.name} ({it.user.email})</Link>
                                    : 'guest'} · {it.feature ?? '—'} · {new Date(it.created_at).toLocaleString()}
                            </span>
                            <button onClick={() => router.delete(route('admin.ai.flagged.destroy', it.id), { preserveScroll: true })}
                                className="text-red-600 hover:underline">Delete</button>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-800">{it.flagged_text}</p>
                    </li>
                ))}
            </ul>
        </AdminLayout>
    );
}
```

- [ ] **Step 9: Build the frontend to type-check**

Run: `npm run build`
Expected: succeeds, no type errors.

- [ ] **Step 10: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Admin/AdminAiController.php routes/web.php routes/console.php app/Console/Commands/PruneFlaggedAiText.php resources/js/Pages/Admin/Ai/Flagged.tsx tests/Feature/Admin/AdminAiFlaggedTest.php
git commit -m "feat: flagged AI content review queue + daily retention prune"
```

---

## Task 9: Full suite + docs

**Files:**
- Modify: `CLAUDE.md` (document the new admin AI section under the AI docs)

- [ ] **Step 1: Run the whole suite**

Run: `php artisan test --compact`
Expected: all green (existing 570 + the new tests). Fix any fallout before committing.

- [ ] **Step 2: Document the feature**

In `CLAUDE.md`, under the `### AI (OpenAI)` section, append a short paragraph:

```markdown
**Admin AI dashboard** (`/admin/ai`, master-admin gated): `Admin\AdminAiController` drives an Overview (KPIs + charts + 7d/30d/all period selector + OpenAI cost reconciliation via `OpenAiUsageService`), a per-user usage table, a per-user detail with controls (reset monthly quota via `ai_usage_reset_at`, set `ai_limit_override`, toggle `ai_blocked`), and a flagged-content review queue. Flagged input text is stored in `ai_requests.flagged_text` and pruned after 90 days by `ai:prune-flagged` (scheduled daily). `UserLimits` honors the per-user override/block/reset columns; `OPENAI_ADMIN_KEY` (optional) powers the cost reconciliation and degrades gracefully when absent.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document admin AI usage dashboard"
```

---

## Self-Review Notes (for the implementer)

- **Spec coverage:** Task 1 (schema), Task 2 (UserLimits wiring), Task 3 (flagged_text capture), Task 4 (OpenAI reconciliation, fail-soft), Task 5 (aggregator), Task 6 (overview + charts + nav + period selector), Task 7 (users table + per-user controls), Task 8 (flagged queue + retention prune + schedule), Task 9 (suite + docs). Every spec section maps to a task.
- **Charts:** Overview has line + bar charts; per-user has a progress bar; user table shows intensity via cost cells. All pure-CSS/SVG, no dependency (matches the "visual-first, no new dep" spec requirement).
- **Type consistency:** Controller prop keys (`totals`, `series`, `byFeature`, `byModel`, `byStatus`, `openAiCostCents`, `users`, `user`, `recent`, `items`) match each page's `Props`. Route names match between `routes/web.php`, controller, tests, and `route()` calls. `AiUsageReport::since()`/`breakdown()`/`totals()`/`dailySeries()` signatures are consistent across Tasks 5–8.
- **ClientFake rule** is called out in Task 3's test (prepend a moderation fake) and the conventions header.
