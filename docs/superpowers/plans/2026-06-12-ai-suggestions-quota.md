# AI Suggestions + Quota Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three AI editor features (rewrite-bullet, generate-summary, ATS-keyword-gaps) behind one gated pipeline that enforces the per-tier monthly AI quota.

**Architecture:** A single `AiSuggestionController` with three thin actions sharing a private `run()` helper (gate → prompt → `AiService::chat` → JSON). Prompt strings come from a pure `App\Data\AiPrompts` builder. Quota math lives in `UserLimits` (already present; needs success-only counting plus three small helpers). The frontend calls the JSON endpoints via a `useAiSuggestion` hook that handles the tier-aware over-quota response and tracks remaining uses.

**Tech Stack:** Laravel 13 / PHP 8.4, `openai-php/laravel` (already installed, client bound as `OpenAI\Contracts\ClientContract`), Inertia + React 18 / TypeScript, PHPUnit (`OpenAI\Testing\ClientFake` for fakes).

**Spec:** `docs/superpowers/specs/2026-06-12-ai-suggestions-quota-design.md`

---

## File Structure

| File | Responsibility | New/Modify |
|---|---|---|
| `app/Services/UserLimits.php` | Quota math: success-only count + `aiRemaining`/`aiCanUpgrade`/`aiNextTier` | Modify |
| `app/Data/AiPrompts.php` | Pure prompt builder, one branch per feature key | Create |
| `app/Http/Controllers/AiSuggestionController.php` | HTTP, authorization, gate orchestration | Create |
| `routes/web.php` | Three `builder.ai.*` routes (auth group, throttled) | Modify |
| `app/Http/Controllers/ResumeBuilderController.php` | Add `aiRemaining`/`aiCanUpgrade` props to `edit()` | Modify |
| `resources/js/hooks/useAiSuggestion.ts` | Client transport, 402/503 UX, remaining state | Create |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Indicator + three AI triggers | Modify |
| `tests/Feature/UserLimitsAiTest.php` | Quota helper tests | Create |
| `tests/Unit/AiPromptsTest.php` | Prompt builder tests | Create |
| `tests/Feature/AiSuggestionTest.php` | Endpoint contract tests | Create |

**Testing boundary:** Backend is fully TDD'd with fakes (no real OpenAI calls). The frontend (hook + Edit.tsx wiring) has no JS test harness in this project; its verification is `npm run build` (tsc type-check) plus manual smoke. This is called out in Tasks 5–6.

---

## Task 1: UserLimits quota helpers

**Files:**
- Modify: `app/Services/UserLimits.php`
- Test: `tests/Feature/UserLimitsAiTest.php`

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserLimitsAiTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_count_ignores_error_rows(): void
    {
        $user = User::factory()->free()->create();
        AiRequest::factory()->count(2)->create(['user_id' => $user->id, 'status' => 'success']);
        AiRequest::factory()->count(3)->create(['user_id' => $user->id, 'status' => 'error']);

        $this->assertSame(2, UserLimits::aiRequestsThisMonth($user));
    }

    public function test_remaining_is_limit_minus_successes(): void
    {
        $user = User::factory()->free()->create(); // free limit = 10
        AiRequest::factory()->count(4)->create(['user_id' => $user->id, 'status' => 'success']);

        $this->assertSame(6, UserLimits::aiRemaining($user));
    }

    public function test_remaining_never_negative(): void
    {
        config()->set('ai.monthly_limits.free', 1);
        $user = User::factory()->free()->create();
        AiRequest::factory()->count(3)->create(['user_id' => $user->id, 'status' => 'success']);

        $this->assertSame(0, UserLimits::aiRemaining($user));
    }

    public function test_can_upgrade_by_tier(): void
    {
        $this->assertTrue(UserLimits::aiCanUpgrade(User::factory()->free()->create()));
        $this->assertTrue(UserLimits::aiCanUpgrade(User::factory()->starter()->create()));
        $this->assertFalse(UserLimits::aiCanUpgrade(User::factory()->pro()->create()));
    }

    public function test_next_tier_by_tier(): void
    {
        $this->assertSame('starter', UserLimits::aiNextTier(User::factory()->free()->create()));
        $this->assertSame('pro', UserLimits::aiNextTier(User::factory()->starter()->create()));
        $this->assertNull(UserLimits::aiNextTier(User::factory()->pro()->create()));
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/UserLimitsAiTest.php`
Expected: FAIL — `test_monthly_count_ignores_error_rows` fails on the count, and `aiRemaining`/`aiCanUpgrade`/`aiNextTier` error as undefined methods.

- [ ] **Step 3: Update `aiRequestsThisMonth` and add the three helpers**

In `app/Services/UserLimits.php`, change the body of `aiRequestsThisMonth` to filter on success:

```php
    public static function aiRequestsThisMonth(User $user): int
    {
        return AiRequest::where('user_id', $user->id)
            ->where('status', 'success')
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();
    }
```

Then add these three methods directly after `canUseAi`:

```php
    public static function aiRemaining(User $user): int
    {
        return max(0, self::aiMonthlyLimit($user) - self::aiRequestsThisMonth($user));
    }

    public static function aiCanUpgrade(User $user): bool
    {
        return in_array($user->planTier(), ['free', 'starter'], true);
    }

    public static function aiNextTier(User $user): ?string
    {
        return match ($user->planTier()) {
            'free' => 'starter',
            'starter' => 'pro',
            default => null,
        };
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Feature/UserLimitsAiTest.php`
Expected: PASS (5 tests).

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Services/UserLimits.php tests/Feature/UserLimitsAiTest.php
git commit -m "feat: success-only AI quota counting + remaining/upgrade helpers"
```

---

## Task 2: AiPrompts builder

**Files:**
- Create: `app/Data/AiPrompts.php`
- Test: `tests/Unit/AiPromptsTest.php`

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Unit;

use App\Data\AiPrompts;
use PHPUnit\Framework\TestCase;

class AiPromptsTest extends TestCase
{
    public function test_rewrite_bullet_includes_the_text(): void
    {
        $prompt = AiPrompts::build('rewrite_bullet', ['text' => 'managed a team of five']);

        $this->assertStringContainsString('managed a team of five', $prompt);
        $this->assertNotEmpty($prompt);
    }

    public function test_generate_summary_includes_serialized_content(): void
    {
        $prompt = AiPrompts::build('generate_summary', [
            'experience' => [['title' => 'Engineer', 'company' => 'Acme']],
            'skills' => ['PHP', 'React'],
        ]);

        $this->assertStringContainsString('Engineer', $prompt);
        $this->assertStringContainsString('PHP', $prompt);
    }

    public function test_ats_keywords_includes_role(): void
    {
        $prompt = AiPrompts::build('ats_keywords', [
            'role' => 'Senior Backend Engineer',
            'experience' => [],
            'skills' => ['Go'],
        ]);

        $this->assertStringContainsString('Senior Backend Engineer', $prompt);
    }

    public function test_unknown_feature_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        AiPrompts::build('nope', []);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Unit/AiPromptsTest.php`
Expected: FAIL — class `App\Data\AiPrompts` not found.

- [ ] **Step 3: Create the prompt builder**

Create `app/Data/AiPrompts.php`:

```php
<?php

namespace App\Data;

use InvalidArgumentException;

class AiPrompts
{
    /**
     * Build the OpenAI prompt for a given feature key.
     *
     * @param  array<string, mixed>  $input
     */
    public static function build(string $feature, array $input): string
    {
        return match ($feature) {
            'rewrite_bullet' => self::rewriteBullet($input),
            'generate_summary' => self::generateSummary($input),
            'ats_keywords' => self::atsKeywords($input),
            default => throw new InvalidArgumentException("Unknown AI feature: {$feature}"),
        };
    }

    /**
     * @param  array{text: string}  $input
     */
    private static function rewriteBullet(array $input): string
    {
        $text = $input['text'] ?? '';

        return <<<PROMPT
        Rewrite this resume bullet point to be more impactful. Start with a strong action verb,
        keep it to a single concise line, quantify impact where the original implies it, and do
        not invent facts. Return ONLY the rewritten bullet with no quotes or preamble.

        Bullet: {$text}
        PROMPT;
    }

    /**
     * @param  array{experience: array<mixed>, skills: array<mixed>}  $input
     */
    private static function generateSummary(array $input): string
    {
        $experience = json_encode($input['experience'] ?? [], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        $skills = json_encode($input['skills'] ?? [], JSON_UNESCAPED_SLASHES);

        return <<<PROMPT
        Write a professional resume summary (2-3 sentences, first-person implied, no "I").
        Base it strictly on the experience and skills below; do not invent employers or titles.
        Return ONLY the summary paragraph with no heading or preamble.

        Experience: {$experience}
        Skills: {$skills}
        PROMPT;
    }

    /**
     * @param  array{role: string, experience: array<mixed>, skills: array<mixed>}  $input
     */
    private static function atsKeywords(array $input): string
    {
        $role = $input['role'] ?? '';
        $experience = json_encode($input['experience'] ?? [], JSON_UNESCAPED_SLASHES);
        $skills = json_encode($input['skills'] ?? [], JSON_UNESCAPED_SLASHES);

        return <<<PROMPT
        You are an ATS keyword analyst. For the target role "{$role}", list up to 15 important
        keywords or skills that are commonly expected but appear MISSING from the resume content
        below. Return ONLY a comma-separated list, no numbering, no commentary.

        Current skills: {$skills}
        Current experience: {$experience}
        PROMPT;
    }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Unit/AiPromptsTest.php`
Expected: PASS (4 tests).

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Data/AiPrompts.php tests/Unit/AiPromptsTest.php
git commit -m "feat: AiPrompts builder for rewrite/summary/ats-keywords"
```

---

## Task 3: AiSuggestionController + routes

**Files:**
- Create: `app/Http/Controllers/AiSuggestionController.php`
- Modify: `routes/web.php` (inside the existing `auth`-protected group, near the other `builder.*` routes ~line 96)
- Test: `tests/Feature/AiSuggestionTest.php`

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class AiSuggestionTest extends TestCase
{
    use RefreshDatabase;

    private function fakeReply(string $content): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
                'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
            ]),
        ]));
    }

    public function test_rewrite_bullet_returns_suggestion_and_logs_success(): void
    {
        $this->fakeReply('Led a team of five engineers to ship X.');
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $res = $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'managed a team of five']
        );

        $res->assertOk()
            ->assertJson(['suggestion' => 'Led a team of five engineers to ship X.', 'remaining' => 9]);
        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'rewrite_bullet',
            'status' => 'success',
        ]);
    }

    public function test_ats_keywords_split_into_array(): void
    {
        $this->fakeReply("Kubernetes, Terraform\nObservability"); // double quotes: real newline
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $res = $this->actingAs($user)->postJson(
            route('builder.ai.ats-keywords', $resume),
            ['role' => 'SRE']
        );

        $res->assertOk()->assertJson(['keywords' => ['Kubernetes', 'Terraform', 'Observability']]);
    }

    public function test_over_quota_free_user_gets_upgrade_payload(): void
    {
        config()->set('ai.monthly_limits.free', 0);
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $res = $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'anything']
        );

        $res->assertStatus(402)
            ->assertJson(['can_upgrade' => true, 'next_tier' => 'starter', 'limit' => 0]);
        $this->assertDatabaseCount('ai_requests', 0); // gate runs before any OpenAI call
    }

    public function test_over_quota_pro_user_gets_no_upgrade(): void
    {
        config()->set('ai.monthly_limits.pro', 0);
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'anything']
        )->assertStatus(402)->assertJson(['can_upgrade' => false, 'next_tier' => null]);
    }

    public function test_openai_failure_returns_503_and_does_not_count(): void
    {
        $mock = \Mockery::mock(ClientContract::class);
        $mock->shouldReceive('chat->create')->andThrow(new \RuntimeException('boom'));
        $this->app->instance(ClientContract::class, $mock);

        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'anything']
        )->assertStatus(503);

        $this->assertDatabaseHas('ai_requests', ['user_id' => $user->id, 'status' => 'error']);
        $this->assertSame(0, \App\Services\UserLimits::aiRequestsThisMonth($user->fresh()));
    }

    public function test_cannot_use_another_users_resume(): void
    {
        $this->fakeReply('x');
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for(User::factory()->free())->create();

        $this->actingAs($user)->postJson(
            route('builder.ai.rewrite-bullet', $resume),
            ['text' => 'anything']
        )->assertStatus(403);
    }

    public function test_rewrite_bullet_requires_text(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.rewrite-bullet', $resume), [])
            ->assertStatus(422);
    }

    public function test_summary_422_when_no_content(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create(['experience' => [], 'skills' => []]);

        $this->actingAs($user)->postJson(route('builder.ai.summary', $resume), [])
            ->assertStatus(422);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `php artisan test --compact tests/Feature/AiSuggestionTest.php`
Expected: FAIL — routes `builder.ai.*` are not defined (RouteNotFoundException).

- [ ] **Step 3: Create the controller**

Create `app/Http/Controllers/AiSuggestionController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Models\Resume;
use App\Models\User;
use App\Services\AiService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AiSuggestionController extends Controller
{
    public function __construct(private AiService $ai) {}

    public function rewriteBullet(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $data = $request->validate(['text' => ['required', 'string', 'max:2000']]);

        return $this->run($request->user(), 'rewrite_bullet', ['text' => $data['text']],
            fn (string $reply): array => ['suggestion' => trim($reply)]);
    }

    public function summary(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        if (empty($resume->experience) && empty($resume->skills)) {
            abort(422, 'Add experience or skills before generating a summary.');
        }

        return $this->run($request->user(), 'generate_summary', [
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ], fn (string $reply): array => ['suggestion' => trim($reply)]);
    }

    public function atsKeywords(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $data = $request->validate(['role' => ['nullable', 'string', 'max:200']]);
        $role = $data['role'] ?? $request->user()->target_role ?? '';

        return $this->run($request->user(), 'ats_keywords', [
            'role' => $role,
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ], fn (string $reply): array => ['keywords' => $this->splitKeywords($reply)]);
    }

    /**
     * Gate, call OpenAI, and shape the JSON response. Shared by all three actions.
     *
     * @param  array<string, mixed>  $input
     * @param  callable(string): array<string, mixed>  $shape
     */
    private function run(User $user, string $feature, array $input, callable $shape): JsonResponse
    {
        if (! UserLimits::canUseAi($user)) {
            return response()->json([
                'error' => 'Monthly AI limit reached.',
                'can_upgrade' => UserLimits::aiCanUpgrade($user),
                'next_tier' => UserLimits::aiNextTier($user),
                'limit' => UserLimits::aiMonthlyLimit($user),
                'used' => UserLimits::aiRequestsThisMonth($user),
                'resets_at' => now()->startOfMonth()->addMonth()->format('M j'),
            ], 402);
        }

        try {
            $reply = $this->ai->chat(
                AiPrompts::build($feature, $input),
                ['user' => $user, 'feature' => $feature],
            );
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        return response()->json(array_merge($shape($reply), [
            'remaining' => UserLimits::aiRemaining($user),
        ]));
    }

    /**
     * @return array<int, string>
     */
    private function splitKeywords(string $reply): array
    {
        return collect(preg_split('/[,\n]+/', $reply) ?: [])
            ->map(fn (string $k): string => trim($k, " \t\n\r\0\x0B-•*"))
            ->filter()
            ->take(20)
            ->values()
            ->all();
    }
}
```

- [ ] **Step 4: Register the routes**

In `routes/web.php`, inside the existing `auth`-protected group alongside the other `builder.*` routes (after the `builder.tags.destroy` route ~line 105), add:

```php
    Route::middleware('throttle:20,1')->group(function () {
        Route::post('/builder/{resume}/ai/rewrite-bullet', [AiSuggestionController::class, 'rewriteBullet'])->name('builder.ai.rewrite-bullet');
        Route::post('/builder/{resume}/ai/summary', [AiSuggestionController::class, 'summary'])->name('builder.ai.summary');
        Route::post('/builder/{resume}/ai/ats-keywords', [AiSuggestionController::class, 'atsKeywords'])->name('builder.ai.ats-keywords');
    });
```

Add the import at the top of `routes/web.php` with the other controller imports:

```php
use App\Http\Controllers\AiSuggestionController;
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `php artisan test --compact tests/Feature/AiSuggestionTest.php`
Expected: PASS (8 tests).

- [ ] **Step 6: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/AiSuggestionController.php routes/web.php tests/Feature/AiSuggestionTest.php
git commit -m "feat: gated AI suggestion endpoints (rewrite/summary/ats-keywords)"
```

---

## Task 4: Expose quota props to the editor

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php` (`edit()` method)
- Test: `tests/Feature/AiSuggestionTest.php` (add one test)

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/AiSuggestionTest.php`:

```php
    public function test_edit_page_exposes_ai_quota_props(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->get(route('builder.edit', $resume))
            ->assertInertia(fn (\Inertia\Testing\AssertableInertia $page) => $page
                ->where('aiRemaining', 10)
                ->where('aiCanUpgrade', true)
            );
    }
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `php artisan test --compact tests/Feature/AiSuggestionTest.php --filter=test_edit_page_exposes_ai_quota_props`
Expected: FAIL — props `aiRemaining`/`aiCanUpgrade` are missing.

- [ ] **Step 3: Add the props**

In `app/Http/Controllers/ResumeBuilderController.php`, inside the `Inertia::render('ResumeBuilder/Edit', [...])` array in `edit()`, add these two entries (alongside `canDocx` etc.):

```php
            'aiRemaining' => UserLimits::aiRemaining($user),
            'aiCanUpgrade' => UserLimits::aiCanUpgrade($user),
```

(`UserLimits` is already imported and `$user` is already in scope in this method.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `php artisan test --compact tests/Feature/AiSuggestionTest.php --filter=test_edit_page_exposes_ai_quota_props`
Expected: PASS.

- [ ] **Step 5: Format and commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/AiSuggestionTest.php
git commit -m "feat: expose aiRemaining/aiCanUpgrade props to resume editor"
```

---

## Task 5: useAiSuggestion hook

**Files:**
- Create: `resources/js/hooks/useAiSuggestion.ts`

No JS test harness exists in this project; verification is the type-check in Task 6 (`npm run build`). Keep the hook self-contained.

- [ ] **Step 1: Create the hook**

Create `resources/js/hooks/useAiSuggestion.ts`:

```ts
import { useCallback, useState } from 'react';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';

const csrf = (): string =>
    document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

interface OverQuota {
    error: string;
    can_upgrade: boolean;
    next_tier: 'starter' | 'pro' | null;
    limit: number;
    used: number;
    resets_at: string;
}

/**
 * Centralizes AI suggestion XHR calls: tier-aware over-quota handling, error
 * toasts, and tracking of remaining monthly uses. `run` returns the parsed
 * success payload, or null if the call was gated or failed.
 */
export function useAiSuggestion(initialRemaining: number) {
    const [remaining, setRemaining] = useState(initialRemaining);
    const [loadingUrl, setLoadingUrl] = useState<string | null>(null);

    const run = useCallback(
        async <T = Record<string, unknown>>(
            url: string,
            body: Record<string, unknown> = {},
        ): Promise<(T & { remaining: number }) | null> => {
            setLoadingUrl(url);
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN': csrf(),
                    },
                    body: JSON.stringify(body),
                });
                const data = await res.json().catch(() => ({}));

                if (res.status === 402) {
                    const q = data as OverQuota;
                    if (q.can_upgrade && q.next_tier) {
                        triggerUpgradeModal('ai', q.next_tier);
                    } else {
                        // Replace with the app's toast helper if one is adopted later.
                        window.alert(
                            `You've used all ${q.limit} AI requests this month. Resets ${q.resets_at}.`,
                        );
                    }
                    return null;
                }

                if (!res.ok) {
                    window.alert(data.error ?? 'AI request failed. Try again.');
                    return null;
                }

                if (typeof data.remaining === 'number') {
                    setRemaining(data.remaining);
                }
                return data;
            } finally {
                setLoadingUrl(null);
            }
        },
        [],
    );

    return { remaining, loadingUrl, run };
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/hooks/useAiSuggestion.ts
git commit -m "feat: useAiSuggestion hook (quota-aware AI XHR client)"
```

---

## Task 6: Wire the editor

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

This task integrates with existing editor state. Use the component's existing state setters for `summary` and `experience` (identify them in the file — they follow the `useState` + refs pattern described in CLAUDE.md). Verification is `npm run build` (tsc) plus manual smoke; there is no JS unit test.

- [ ] **Step 1: Accept the new props and init the hook**

Add `aiRemaining: number;` and `aiCanUpgrade: boolean;` to the Edit page's props interface. At the top of the component body, add:

```ts
import { useAiSuggestion } from '@/hooks/useAiSuggestion';
// ...inside the component:
const ai = useAiSuggestion(aiRemaining);
const [keywordGaps, setKeywordGaps] = useState<string[]>([]);
```

- [ ] **Step 2: Add the handlers**

Add these inside the component. Wire `setSummary`/`setExperience` to the existing setters, and call the existing save callback (the `save()`/`router.put` used by the onBlur handlers) after applying a suggestion so it persists:

```ts
const handleGenerateSummary = async () => {
    const data = await ai.run<{ suggestion: string }>(route('builder.ai.summary', resume.id));
    if (data?.suggestion) {
        setSummary(data.suggestion); // existing summary state setter
        save();                      // existing persistence trigger
    }
};

const handleImproveBullet = async (expIndex: number, bulletIndex: number, text: string) => {
    const data = await ai.run<{ suggestion: string }>(
        route('builder.ai.rewrite-bullet', resume.id),
        { text },
    );
    if (data?.suggestion) {
        // Replace the one bullet using the existing experience setter, then save().
        // Shape follows the existing experience state in this component.
        applyBulletText(expIndex, bulletIndex, data.suggestion);
        save();
    }
};

const handleKeywordGaps = async () => {
    const data = await ai.run<{ keywords: string[] }>(
        route('builder.ai.ats-keywords', resume.id),
        { role: userPersona.target_role ?? '' },
    );
    if (data?.keywords) {
        setKeywordGaps(data.keywords);
    }
};
```

> `applyBulletText` is shorthand for "update bullet at `[expIndex][bulletIndex]` in the existing experience state." Implement it inline against whatever shape `experience` uses in this file (e.g. map the experience array, replace the target bullet). Do not introduce a new state shape.

- [ ] **Step 3: Add the indicator and buttons**

Add the quota indicator near the AI affordances (disable buttons at zero):

```tsx
<span className="text-xs text-gray-500">✨ {ai.remaining} AI uses left this month</span>
```

- Beside the summary field:

```tsx
<button
    type="button"
    onClick={handleGenerateSummary}
    disabled={ai.remaining === 0 || ai.loadingUrl !== null}
    className="text-xs font-medium text-indigo-600 disabled:opacity-50"
>
    ✨ Generate
</button>
```

- For each experience bullet (inside the bullet row, passing that bullet's indices/text):

```tsx
<button
    type="button"
    onClick={() => handleImproveBullet(expIndex, bulletIndex, bulletText)}
    disabled={ai.remaining === 0 || ai.loadingUrl !== null}
    className="text-xs text-indigo-600 disabled:opacity-50"
>
    ✨ Improve
</button>
```

- For the ATS keyword gaps trigger + read-only chips (place in the skills area):

```tsx
<button
    type="button"
    onClick={handleKeywordGaps}
    disabled={ai.remaining === 0 || ai.loadingUrl !== null}
    className="text-xs font-medium text-indigo-600 disabled:opacity-50"
>
    ✨ Keyword gaps
</button>
{keywordGaps.length > 0 && (
    <div className="mt-2 flex flex-wrap gap-1">
        {keywordGaps.map((k) => (
            <span key={k} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {k}
            </span>
        ))}
    </div>
)}
```

- [ ] **Step 4: Type-check and build**

Run: `npm run build`
Expected: PASS — `tsc` reports no type errors and Vite emits to `public/build/`.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: wire AI suggestion buttons + quota indicator into editor"
```

---

## Task 7: Full suite + manual smoke

- [ ] **Step 1: Run the AI-related tests together**

Run: `php artisan test --compact tests/Feature/AiSuggestionTest.php tests/Feature/UserLimitsAiTest.php tests/Unit/AiPromptsTest.php`
Expected: PASS (all).

- [ ] **Step 2: Run the full suite to confirm nothing regressed**

Run: `php artisan test --compact`
Expected: PASS.

- [ ] **Step 3: Manual smoke (real OpenAI, optional but recommended)**

Start `composer run dev`, open a resume in the editor, and confirm: the "N AI uses left" indicator shows, "✨ Improve" rewrites a bullet, "✨ Generate" fills the summary, "✨ Keyword gaps" lists chips, and the indicator decrements after each. Set `ai.monthly_limits.free` to a low number in `config/ai.php` temporarily to verify the over-quota upgrade modal / reset message.

---

## Notes for the implementer

- **No real OpenAI calls in tests** — always bind `ClientFake` (success) or a Mockery mock that throws (error path), per the existing `tests/Feature/AiServiceTest.php`.
- **Gate before call** — `run()` checks `canUseAi` before invoking OpenAI, so over-quota requests never create an `AiRequest` row. Keep it that way.
- **Quota counts successes only** — never revert `aiRequestsThisMonth` to counting all rows; the 503 path depends on error rows not counting.
- **`triggerUpgradeModal(feature, tier)`** — `tier` is typed `'starter' | 'pro'`, which matches `next_tier`'s non-null values exactly.
- **Out of scope (Spec 2):** tailor-to-job-description (JD input + diff/apply UI). It will add a fourth `AiPrompts` branch + endpoint reusing this exact pipeline.
```
