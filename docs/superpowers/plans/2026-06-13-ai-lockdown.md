# AI Lockdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Protect the OpenAI key with a moderation pre-check, per-user attribution, and a completion-token cap — all inside `AiService`, one exception class, and one config key. No new deps or tables.

**Architecture:** `AiService::chat()` runs `moderate()` (free moderations endpoint) before the chat call; flagged input logs a `flagged` `AiRequest` row and throws `ModerationException`. The chat payload gains `user` (`user_{id}`/`guest`) and `max_tokens`. The single caller (`AiSuggestionController`) catches `ModerationException` → 422.

**Tech Stack:** Laravel 13, PHP 8.4, openai-php (`ClientFake` FIFO test double), PHPUnit.

Spec: `docs/superpowers/specs/2026-06-13-ai-lockdown-design.md`

**Key test-harness fact:** `ClientFake::record()` is FIFO and type-agnostic (`array_shift`). Because `chat()` now calls `moderations()->create()` *before* `chat()->create()`, every fake response array must list the **moderation response first**, then the chat response. The moderation fixture defaults to `flagged => true`, so a *clean* moderation must be faked explicitly as `['results' => [['flagged' => false]]]`.

---

### Task 1: ModerationException

**Files:**
- Create: `app/Exceptions/ModerationException.php`

- [ ] **Step 1: Create the exception (no test yet — exercised in Task 3/5)**

```php
<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModerationException extends Exception
{
    public const USER_MESSAGE = "This content can't be processed.";

    public function render(Request $request): JsonResponse
    {
        return response()->json(['error' => self::USER_MESSAGE], 422);
    }
}
```

- [ ] **Step 2: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Exceptions/ModerationException.php
git commit -m "feat: ModerationException (422 render)"
```

---

### Task 2: max_completion_tokens config

**Files:**
- Modify: `config/ai.php`

- [ ] **Step 1: Add the config key under `'model'`**

In `config/ai.php`, after the `'model' => ...,` line add:

```php
    /*
     * Hard cap on completion tokens per chat call. 1000 fits the longest
     * multi-line bullet rewrites (input cap is 8000 chars).
     */
    'max_completion_tokens' => 1000,
```

- [ ] **Step 2: Commit**

```bash
git add config/ai.php
git commit -m "feat: ai.max_completion_tokens default 1000"
```

---

### Task 3: Moderation + attribution + token cap in AiService

**Files:**
- Modify: `app/Services/AiService.php`
- Test: `tests/Feature/AiServiceTest.php`

- [ ] **Step 1: Update existing AiServiceTest fakes to prepend a clean moderation, and add two new tests**

In `tests/Feature/AiServiceTest.php`, add imports near the top:

```php
use App\Exceptions\ModerationException;
use OpenAI\Resources\Chat;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
```

For **each** of the three existing tests that build a `ClientFake`/mock, prepend a clean moderation response:

In `test_chat_returns_text_and_logs_a_request`, change the `new ClientFake([ ... ])` array to:

```php
$this->app->instance(ClientContract::class, new ClientFake([
    ModerationResponse::fake(['results' => [['flagged' => false]]]),
    CreateResponse::fake([
        'model' => 'gpt-4o-mini',
        'choices' => [
            ['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'pong']],
        ],
        'usage' => ['prompt_tokens' => 12, 'completion_tokens' => 3, 'total_tokens' => 15],
    ]),
]));
```

In `test_chat_estimates_cost_from_pricing`, prepend the same clean moderation line before the chat `CreateResponse::fake([...])` inside the array.

In `test_chat_logs_error_and_rethrows_on_failure`, the Mockery mock must answer the moderation call cleanly before chat throws. Add this line after creating `$mock`:

```php
$mock->shouldReceive('moderations->create')
    ->andReturn(ModerationResponse::fake(['results' => [['flagged' => false]]]));
```

Then add two new tests:

```php
public function test_flagged_input_throws_logs_flagged_and_skips_chat(): void
{
    $fake = new ClientFake([
        ModerationResponse::fake(['results' => [['flagged' => true]]]),
    ]);
    $this->app->instance(ClientContract::class, $fake);

    $user = User::factory()->create();

    $this->expectException(ModerationException::class);

    try {
        app(AiService::class)->chat('bad stuff', ['user' => $user, 'feature' => 'smoke']);
    } finally {
        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'smoke',
            'status' => 'flagged',
        ]);
        $fake->assertNotSent(Chat::class);
    }
}

public function test_chat_payload_includes_user_and_max_tokens(): void
{
    $fake = new ClientFake([
        ModerationResponse::fake(['results' => [['flagged' => false]]]),
        CreateResponse::fake([
            'model' => 'gpt-4o-mini',
            'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'ok']]],
            'usage' => ['prompt_tokens' => 1, 'completion_tokens' => 1, 'total_tokens' => 2],
        ]),
    ]);
    $this->app->instance(ClientContract::class, $fake);

    $user = User::factory()->create();
    app(AiService::class)->chat('hi', ['user' => $user]);

    $fake->assertSent(Chat::class, fn (string $method, array $parameters): bool => $method === 'create'
        && $parameters['user'] === 'user_'.$user->id
        && $parameters['max_tokens'] === 1000);
}
```

- [ ] **Step 2: Run to verify the new tests fail**

Run: `php artisan test --compact tests/Feature/AiServiceTest.php`
Expected: FAIL — `moderate()` doesn't exist yet; `user`/`max_tokens` not in payload; flagged path not implemented. (The three updated existing tests will also fail until Step 3, because chat now consumes the moderation response first.)

- [ ] **Step 3: Implement moderation + attribution + cap**

In `app/Services/AiService.php`, add the import:

```php
use App\Exceptions\ModerationException;
```

Replace the `chat()` method body's start and the chat payload, and add two private helpers:

```php
public function chat(string $prompt, array $options = []): string
{
    $model = $options['model'] ?? config('ai.model');
    $user = $options['user'] ?? null;
    $feature = $options['feature'] ?? null;

    $this->moderate($prompt, $user, $feature, $model);

    try {
        $response = $this->client->chat()->create([
            'model' => $model,
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'user' => $this->userId($user),
            'max_tokens' => config('ai.max_completion_tokens', 1000),
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

/**
 * Pre-screen user text with OpenAI's free moderations endpoint. Flagged input
 * is logged and rejected before it ever reaches the chat completion endpoint.
 */
private function moderate(string $text, ?User $user, ?string $feature, string $model): void
{
    $result = $this->client->moderations()->create([
        'input' => $text,
        'user' => $this->userId($user),
    ]);

    if ($result->results[0]->flagged ?? false) {
        $this->log($user, $feature, $model, 0, 0, 0, 'flagged');

        throw new ModerationException;
    }
}

private function userId(?User $user): string
{
    return $user ? 'user_'.$user->id : 'guest';
}
```

Note: `moderate()` runs **before** the `try`, so `ModerationException` is never caught by the chat error handler and propagates untouched.

- [ ] **Step 4: Run to verify all AiServiceTest pass**

Run: `php artisan test --compact tests/Feature/AiServiceTest.php`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Services/AiService.php tests/Feature/AiServiceTest.php
git commit -m "feat: AiService moderation pre-check + user attribution + max_tokens"
```

---

### Task 4: Controller returns 422 on flagged input

**Files:**
- Modify: `app/Http/Controllers/AiSuggestionController.php`
- Test: `tests/Feature/AiSuggestionTest.php`

- [ ] **Step 1: Update the shared fake helper + add a flagged feature test**

In `tests/Feature/AiSuggestionTest.php`, add the import:

```php
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
```

Update `fakeReply()` to prepend a clean moderation response (so all existing suggestion tests keep passing):

```php
private function fakeReply(string $content): void
{
    $this->app->instance(ClientContract::class, new ClientFake([
        ModerationResponse::fake(['results' => [['flagged' => false]]]),
        CreateResponse::fake([
            'model' => 'gpt-4o-mini',
            'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
            'usage' => ['prompt_tokens' => 5, 'completion_tokens' => 5, 'total_tokens' => 10],
        ]),
    ]));
}
```

Add a new test (place it near the other rewrite-bullet tests):

```php
public function test_flagged_input_returns_422_and_does_not_count_quota(): void
{
    $this->app->instance(ClientContract::class, new ClientFake([
        ModerationResponse::fake(['results' => [['flagged' => true]]]),
    ]));
    $user = User::factory()->free()->create();
    $resume = Resume::factory()->for($user)->create();

    $this->actingAs($user)->postJson(
        route('builder.ai.rewrite-bullet', $resume),
        ['text' => 'something disallowed']
    )->assertStatus(422)
        ->assertJson(['error' => "This content can't be processed."]);

    // flagged row logged, but no success row → quota untouched
    $this->assertDatabaseHas('ai_requests', ['user_id' => $user->id, 'status' => 'flagged']);
    $this->assertSame(0, UserLimits::aiRequestsThisMonth($user));
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `php artisan test --compact --filter=test_flagged_input_returns_422_and_does_not_count_quota`
Expected: FAIL — controller currently converts the thrown `ModerationException` into a 503 via its generic `catch (Throwable)`.

- [ ] **Step 3: Add the ModerationException catch in the controller**

In `app/Http/Controllers/AiSuggestionController.php`, add the import:

```php
use App\Exceptions\ModerationException;
```

Change the `try`/`catch` block (around line 78) so a moderation rejection returns 422 before the generic handler:

```php
        try {
            $reply = $this->ai->chat(
                AiPrompts::build($feature, $input),
                ['user' => $user, 'feature' => $feature],
            );
        } catch (ModerationException $e) {
            return $e->render($request);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }
```

- [ ] **Step 4: Run to verify it passes**

Run: `php artisan test --compact tests/Feature/AiSuggestionTest.php`
Expected: PASS (all suggestion tests, including the new flagged case).

- [ ] **Step 5: Commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/AiSuggestionController.php tests/Feature/AiSuggestionTest.php
git commit -m "feat: AI suggestion endpoint returns 422 on flagged content"
```

---

### Task 5: Full-suite regression

- [ ] **Step 1: Run the whole suite**

Run: `php artisan test --compact`
Expected: all green. If any other AI test built its own `ClientFake` with only a chat response, prepend a clean moderation response (search: `grep -rn "ClientFake" tests/`). Per current audit only `AiServiceTest` and `AiSuggestionTest` fake the client, and both are handled above.

- [ ] **Step 2: Commit any fixups**

```bash
git add tests/
git commit -m "test: prepend clean moderation fakes where missing"
```

---

## Self-Review

**Spec coverage:** ✅ A moderation pre-check + `flagged` row + skip chat (Task 3); B `user_{id}`/`guest` on both payloads (Task 3 `userId()`); C `max_tokens` from new config default 1000 (Tasks 2–3); `ModerationException` with `render()` 422 (Task 1) + controller wiring since the existing `catch (Throwable)` would otherwise swallow it (Task 4); flagged rows don't burn quota because `aiRequestsThisMonth` counts only `success` (asserted in Task 4). `OpenAI::fake`-style tests via `ClientFake` (Tasks 3–4).

**Placeholders:** none — full code in every step.

**Type consistency:** `ModerationException::USER_MESSAGE` defined Task 1, used in Task 4 assertion via the rendered `error` string. `userId()`/`moderate()` defined and consumed within Task 3. Moderation-first FIFO ordering applied consistently in every fake array.
