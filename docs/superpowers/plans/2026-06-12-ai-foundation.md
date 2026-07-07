# AI Foundation Implementation Plan (Effort C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold an OpenAI client seam, per-request usage logging, and AI usage-limit helpers — infrastructure only, nothing user-facing — and smoke-test the live API key.

**Architecture:** A single `AiService::chat()` seam wraps the `openai-php/laravel` client, logs every call to an append-only `ai_requests` table, and computes an estimated cost. `UserLimits` gains AI-quota helpers reading `config/ai.php`. No routes, controllers, or UI consume these yet.

**Tech Stack:** Laravel 13 / PHP 8.4 / SQLite, `openai-php/laravel` v0.19, PHPUnit 12.

**Spec:** `docs/superpowers/specs/2026-06-12-ai-foundation-cleanup-autocomplete-design.md` (Effort C)

---

## File Structure

- Create `config/ai.php` — our AI settings (default model, per-tier monthly caps, per-model pricing).
- Create `database/migrations/*_create_ai_requests_table.php` — append-only usage log.
- Create `app/Models/AiRequest.php` — model (`UPDATED_AT = null`, `user()` belongsTo).
- Create `database/factories/AiRequestFactory.php` — test factory.
- Create `app/Services/AiService.php` — the single AI seam.
- Modify `app/Services/UserLimits.php` — add `aiMonthlyLimit`, `aiRequestsThisMonth`, `canUseAi`.
- Modify `config/openai.php` (published by the SDK) — no edits needed beyond publish.
- Create `tests/Feature/AiServiceTest.php`, `tests/Feature/AiUserLimitsTest.php`.

---

## Task 1: Install the OpenAI SDK and publish config

**Files:**
- Modify: `composer.json` / `composer.lock` (via composer)
- Create: `config/openai.php` (published)

- [ ] **Step 1: Require the package**

Run: `composer require openai-php/laravel`
Expected: installs `openai-php/laravel` (~v0.19.x) and `openai-php/client`. No errors.

- [ ] **Step 2: Publish the SDK config**

Run: `php artisan vendor:publish --provider="OpenAI\Laravel\ServiceProvider"`
Expected: creates `config/openai.php` (reads `OPENAI_API_KEY`, `OPENAI_ORGANIZATION` from env).

- [ ] **Step 3: Confirm the client resolves**

Run: `php artisan tinker --execute 'echo get_class(app(\OpenAI\Contracts\ClientContract::class));'`
Expected: prints `OpenAI\Client` (the binding resolves; no error). This does NOT make a network call.

- [ ] **Step 4: Commit**

```bash
git add composer.json composer.lock config/openai.php
git commit -m "chore: install openai-php/laravel SDK"
```

---

## Task 2: AI config file

**Files:**
- Create: `config/ai.php`

- [ ] **Step 1: Create the config**

Create `config/ai.php`:

```php
<?php

return [
    /*
     * Default chat model used by App\Services\AiService when no model is passed.
     */
    'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),

    /*
     * Per-tier monthly AI request caps. Consumed by App\Services\UserLimits.
     * Not enforced on any route yet — foundation for a future feature.
     */
    'monthly_limits' => [
        'free' => 10,
        'starter' => 100,
        'pro' => 1000,
        'agency' => 5000,
    ],

    /*
     * Per-model pricing in cents per 1,000 tokens. Used to estimate request cost.
     * Models without an entry are billed as 0.
     */
    'pricing' => [
        'gpt-4o-mini' => ['input' => 0.015, 'output' => 0.06],
    ],
];
```

- [ ] **Step 2: Confirm it loads**

Run: `php artisan config:show ai.model`
Expected: prints `gpt-4o-mini`.

- [ ] **Step 3: Commit**

```bash
git add config/ai.php
git commit -m "feat: add config/ai.php for model, limits, and pricing"
```

---

## Task 3: ai_requests table, model, and factory

**Files:**
- Create: `database/migrations/2026_06_12_000001_create_ai_requests_table.php`
- Create: `app/Models/AiRequest.php`
- Create: `database/factories/AiRequestFactory.php`

- [ ] **Step 1: Create the migration**

Run: `php artisan make:migration create_ai_requests_table --no-interaction`

Then replace the generated file's contents (use the actual generated filename) with:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_requests', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('feature')->nullable();
            $table->string('model');
            $table->unsignedInteger('prompt_tokens')->default(0);
            $table->unsignedInteger('completion_tokens')->default(0);
            $table->unsignedInteger('total_tokens')->default(0);
            $table->unsignedInteger('estimated_cost_cents')->default(0);
            $table->string('status')->default('success');
            $table->timestamp('created_at')->nullable();

            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_requests');
    }
};
```

- [ ] **Step 2: Create the model**

Create `app/Models/AiRequest.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiRequest extends Model
{
    /** @use HasFactory<\Database\Factories\AiRequestFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'feature',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'estimated_cost_cents',
        'status',
    ];

    /**
     * @return BelongsTo<User, AiRequest>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 3: Create the factory**

Create `database/factories/AiRequestFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\AiRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AiRequest>
 */
class AiRequestFactory extends Factory
{
    protected $model = AiRequest::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'feature' => null,
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 10,
            'completion_tokens' => 5,
            'total_tokens' => 15,
            'estimated_cost_cents' => 0,
            'status' => 'success',
        ];
    }
}
```

- [ ] **Step 4: Run the migration against the test DB**

Run: `php artisan migrate --no-interaction`
Expected: `ai_requests` table created, no errors.

- [ ] **Step 5: Verify the model + factory resolve**

Run: `php artisan tinker --execute 'echo \App\Models\AiRequest::factory()->make()->model;'`
Expected: prints `gpt-4o-mini`.

- [ ] **Step 6: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add database/migrations/*_create_ai_requests_table.php app/Models/AiRequest.php database/factories/AiRequestFactory.php
git commit -m "feat: add ai_requests table, model, and factory"
```

---

## Task 4: AiService seam

**Files:**
- Create: `app/Services/AiService.php`
- Test: `tests/Feature/AiServiceTest.php`

`openai-php/laravel` exposes a chat client via `OpenAI\Contracts\ClientContract`. A chat call is
`$client->chat()->create([...])`; the response gives `->choices[0]->message->content` and
`->usage->promptTokens` / `->completionTokens` / `->totalTokens`. Tests use the SDK's
`OpenAI\Laravel\Facades\OpenAI::fake([...])`, which binds a fake client into the container so the
injected `ClientContract` resolves to it.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/AiServiceTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\TestCase;

class AiServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_chat_returns_text_and_logs_a_request(): void
    {
        OpenAI::fake([
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [
                    ['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'pong']],
                ],
                'usage' => ['prompt_tokens' => 12, 'completion_tokens' => 3, 'total_tokens' => 15],
            ]),
        ]);

        $user = User::factory()->create();

        $reply = app(AiService::class)->chat('ping', ['user' => $user, 'feature' => 'smoke']);

        $this->assertSame('pong', $reply);
        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'smoke',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 12,
            'completion_tokens' => 3,
            'total_tokens' => 15,
            'status' => 'success',
        ]);
    }

    public function test_chat_estimates_cost_from_pricing(): void
    {
        config()->set('ai.pricing', ['gpt-4o-mini' => ['input' => 1.0, 'output' => 2.0]]);

        OpenAI::fake([
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'ok']]],
                'usage' => ['prompt_tokens' => 1000, 'completion_tokens' => 1000, 'total_tokens' => 2000],
            ]),
        ]);

        app(AiService::class)->chat('hi');

        // 1000/1000 * 1.0 + 1000/1000 * 2.0 = 3 cents
        $this->assertDatabaseHas('ai_requests', ['estimated_cost_cents' => 3]);
    }

    public function test_chat_logs_error_and_rethrows_on_failure(): void
    {
        // The SDK fake replays canned responses; to exercise the catch branch we
        // bind a mock client whose chat()->create() throws.
        $mock = \Mockery::mock(\OpenAI\Contracts\ClientContract::class);
        $mock->shouldReceive('chat->create')->andThrow(new \RuntimeException('boom'));
        $this->app->instance(\OpenAI\Contracts\ClientContract::class, $mock);

        $user = User::factory()->create();

        try {
            app(AiService::class)->chat('ping', ['user' => $user]);
            $this->fail('Expected exception was not thrown.');
        } catch (\RuntimeException $e) {
            $this->assertSame('boom', $e->getMessage());
        }

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'status' => 'error',
        ]);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=AiServiceTest`
Expected: FAIL — `App\Services\AiService` does not exist.

- [ ] **Step 3: Implement AiService**

Create `app/Services/AiService.php`:

```php
<?php

namespace App\Services;

use App\Models\AiRequest;
use App\Models\User;
use OpenAI\Contracts\ClientContract;
use Throwable;

class AiService
{
    public function __construct(private ClientContract $client) {}

    /**
     * Send a single-prompt chat completion, log the request, and return the reply text.
     *
     * @param  array{model?: string, user?: User|null, feature?: string|null}  $options
     */
    public function chat(string $prompt, array $options = []): string
    {
        $model = $options['model'] ?? config('ai.model');
        $user = $options['user'] ?? null;
        $feature = $options['feature'] ?? null;

        try {
            $response = $this->client->chat()->create([
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            $promptTokens = $response->usage->promptTokens;
            $completionTokens = $response->usage->completionTokens;
            $totalTokens = $response->usage->totalTokens;

            $this->log($user, $feature, $model, $promptTokens, $completionTokens, $totalTokens, 'success');

            return $response->choices[0]->message->content ?? '';
        } catch (Throwable $e) {
            $this->log($user, $feature, $model, 0, 0, 0, 'error');

            throw $e;
        }
    }

    private function log(
        ?User $user,
        ?string $feature,
        string $model,
        int $promptTokens,
        int $completionTokens,
        int $totalTokens,
        string $status,
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
        ]);
    }

    private function estimateCostCents(string $model, int $promptTokens, int $completionTokens): int
    {
        $pricing = config("ai.pricing.{$model}");
        if (! $pricing) {
            return 0;
        }

        $cents = ($promptTokens / 1000) * $pricing['input']
            + ($completionTokens / 1000) * $pricing['output'];

        return (int) round($cents);
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact --filter=AiServiceTest`
Expected: PASS (3 tests).

- [ ] **Step 5: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add app/Services/AiService.php tests/Feature/AiServiceTest.php
git commit -m "feat: add AiService seam with usage logging and cost estimate"
```

---

## Task 5: UserLimits AI quota helpers

**Files:**
- Modify: `app/Services/UserLimits.php`
- Test: `tests/Feature/AiUserLimitsTest.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/AiUserLimitsTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiUserLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_limit_resolves_per_tier(): void
    {
        config()->set('ai.monthly_limits', ['free' => 10, 'starter' => 100, 'pro' => 1000, 'agency' => 5000]);

        $this->assertSame(10, UserLimits::aiMonthlyLimit(User::factory()->free()->create()));
        $this->assertSame(100, UserLimits::aiMonthlyLimit(User::factory()->starter()->create()));
        $this->assertSame(1000, UserLimits::aiMonthlyLimit(User::factory()->pro()->create()));
    }

    public function test_requests_this_month_counts_only_current_month(): void
    {
        $user = User::factory()->create();
        AiRequest::factory()->for($user)->create(['created_at' => now()]);
        AiRequest::factory()->for($user)->create(['created_at' => now()->subMonths(2)]);

        $this->assertSame(1, UserLimits::aiRequestsThisMonth($user));
    }

    public function test_can_use_ai_respects_the_limit(): void
    {
        config()->set('ai.monthly_limits', ['free' => 2, 'starter' => 100, 'pro' => 1000, 'agency' => 5000]);
        $user = User::factory()->free()->create();

        $this->assertTrue(UserLimits::canUseAi($user));

        AiRequest::factory()->for($user)->count(2)->create(['created_at' => now()]);

        $this->assertFalse(UserLimits::canUseAi($user));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact --filter=AiUserLimitsTest`
Expected: FAIL — `UserLimits::aiMonthlyLimit` does not exist.

- [ ] **Step 3: Add the helpers**

In `app/Services/UserLimits.php`, add these methods (place them after `customSectionLimit`, before `requirePro`). Add `use App\Models\AiRequest;` to the imports at the top (after `use App\Models\User;`).

```php
    public static function aiMonthlyLimit(User $user): int
    {
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
        return AiRequest::where('user_id', $user->id)
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();
    }

    public static function canUseAi(User $user): bool
    {
        return self::aiRequestsThisMonth($user) < self::aiMonthlyLimit($user);
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact --filter=AiUserLimitsTest`
Expected: PASS (3 tests).

- [ ] **Step 5: Run Pint**

Run: `vendor/bin/pint --dirty --format agent`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add app/Services/UserLimits.php tests/Feature/AiUserLimitsTest.php
git commit -m "feat: add AI monthly-quota helpers to UserLimits"
```

---

## Task 6: Live API key smoke test (#5)

**Files:** none (one-off manual verification — no permanent script, per project convention).

- [ ] **Step 1: Make one real call through the seam**

Run:
```bash
php artisan tinker --execute '$r = app(\App\Services\AiService::class)->chat("Reply with exactly the word: pong", ["feature" => "smoke-test"]); echo "REPLY: ".$r.PHP_EOL;'
```
Expected: prints `REPLY: pong` (or close). This makes a real OpenAI request using `OPENAI_API_KEY`.

- [ ] **Step 2: Confirm the call was logged**

Run:
```bash
php artisan tinker --execute 'echo \App\Models\AiRequest::where("feature","smoke-test")->latest("id")->first()?->status;'
```
Expected: prints `success`.

- [ ] **Step 3: If the key is invalid**

If Step 1 throws an auth error (e.g. `401`), STOP and report to the user that the key in `.env`
is rejected — do not proceed. (A failed call will still have logged an `ai_requests` row with
`status = 'error'`.)

No commit — this task makes no code changes.

---

## Task 7: Final verification

- [ ] **Step 1: Run all AI tests**

Run: `php artisan test --compact --filter="AiService|AiUserLimits"`
Expected: PASS (6 tests).

- [ ] **Step 2: Confirm no functionality was wired in**

Run: `php artisan route:list 2>&1 | grep -i ai || echo "no ai routes — correct"`
Expected: `no ai routes — correct` (AiService is not referenced by any route/controller).

- [ ] **Step 3: Full suite**

Run: `php artisan test --compact`
Expected: PASS (ask the user before running if slow).

---

## Self-Review Notes

- **Spec coverage:** SDK install + config → Tasks 1–2. `ai_requests` table/model/factory → Task 3.
  `AiService.chat()` with logging + cost + error path → Task 4. `UserLimits` AI stubs → Task 5.
  Live key smoke test (#5) → Task 6. "No functionality" guard → Task 7 Step 2.
- **Pricing:** `estimateCostCents` reads `config('ai.pricing.{model}')`, falls back to 0 — matches
  spec. Test `test_chat_estimates_cost_from_pricing` pins the formula.
- **Test isolation:** `AiServiceTest` uses `OpenAI::fake()` (no network); only Task 6 hits the real
  API. `AiUserLimitsTest` uses the `AiRequestFactory` and `User` tier states (`free`/`starter`/`pro`).
- **Type consistency:** `AiService::chat(string, array): string` and the `ai_requests` columns
  (`prompt_tokens`/`completion_tokens`/`total_tokens`/`estimated_cost_cents`/`status`) are identical
  across the migration, model `$fillable`, factory, service, and tests.
