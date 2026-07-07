# AI Career Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, single-thread AI career coach chat (Pro/Agency-gated), grounded in the user's latest resume, per `docs/superpowers/specs/2026-07-05-ai-career-coach-design.md`.

**Architecture:** New `career_coach_messages` table/model (append-only, one thread per user). `AiService::chat()` gets an additive `messages` option so the controller can pass full conversation history instead of a single prompt. `CareerCoachController` handles gating, persistence-before-AI-call, and history truncation. Frontend is a new Inertia page styled like `ResumeBuilder/Thread.tsx` but posting via `fetch()` (XHR-append) like the existing interview-coach button in `Edit.tsx`, not a full Inertia reload.

**Tech Stack:** Laravel 13 / PHP 8.4, PHPUnit, Inertia v2 + React 18 + TypeScript, existing `AiService` (OpenAI).

## Global Constraints

- One ongoing thread per user — no thread/conversation grouping table.
- History sent to the model is capped at the last 20 messages.
- No automatic resume edits from the conversation.
- `AiService::chat()` change must be fully backward-compatible — no existing caller passes `messages`, so omitting it must reproduce today's exact behavior.
- Tier gate: `UserLimits::canCareerCoach()` returns true only for `pro`/`agency` (`planTier()`), independent of `isAtLeastStarter()`.
- Route names: `career-coach.index` (GET `/career-coach`), `career-coach.send` (POST `/career-coach/messages`).

---

### Task 1: Migration + `CareerCoachMessage` model

**Files:**
- Create: `database/migrations/2026_07_06_000001_create_career_coach_messages_table.php`
- Create: `app/Models/CareerCoachMessage.php`
- Test: `tests/Unit/CareerCoachMessageTest.php`

**Interfaces:**
- Produces: `CareerCoachMessage` Eloquent model, `$fillable = ['user_id', 'role', 'content']`, `user(): BelongsTo`, no `updated_at` column.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\CareerCoachMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CareerCoachMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_message_belongs_to_user(): void
    {
        $user = User::factory()->create();

        $message = CareerCoachMessage::create([
            'user_id' => $user->id,
            'role' => 'user',
            'content' => 'How do I switch careers?',
        ]);

        $this->assertTrue($message->user->is($user));
        $this->assertDatabaseHas('career_coach_messages', [
            'id' => $message->id,
            'role' => 'user',
            'content' => 'How do I switch careers?',
        ]);
    }

    public function test_deletes_when_user_deleted(): void
    {
        $user = User::factory()->create();
        CareerCoachMessage::create([
            'user_id' => $user->id,
            'role' => 'user',
            'content' => 'Hi',
        ]);

        $user->delete();

        $this->assertDatabaseCount('career_coach_messages', 0);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/CareerCoachMessageTest.php`
Expected: FAIL — class `App\Models\CareerCoachMessage` not found / table doesn't exist.

- [ ] **Step 3: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('career_coach_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            $table->text('content');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('career_coach_messages');
    }
};
```

- [ ] **Step 4: Write the model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CareerCoachMessage extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'role', 'content'];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
```

- [ ] **Step 5: Run migration and test**

Run: `php artisan migrate && php artisan test --compact tests/Unit/CareerCoachMessageTest.php`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_07_06_000001_create_career_coach_messages_table.php app/Models/CareerCoachMessage.php tests/Unit/CareerCoachMessageTest.php
git commit -m "feat: add career_coach_messages table and model"
```

---

### Task 2: `UserLimits::canCareerCoach()`

**Files:**
- Modify: `app/Services/UserLimits.php`
- Test: `tests/Unit/UserLimitsTest.php` (create if it doesn't exist)

**Interfaces:**
- Consumes: `User::planTier(): string` (`app/Models/User.php:64`)
- Produces: `UserLimits::canCareerCoach(User $user): bool` — used by Task 3's controller.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_career_coach_gate_by_tier(): void
    {
        $this->assertFalse(UserLimits::canCareerCoach(User::factory()->free()->create()));
        $this->assertFalse(UserLimits::canCareerCoach(User::factory()->starter()->create()));
        $this->assertTrue(UserLimits::canCareerCoach(User::factory()->pro()->create()));
        $this->assertTrue(UserLimits::canCareerCoach(User::factory()->agency()->create()));
    }
}
```

If `tests/Unit/UserLimitsTest.php` already exists, add `test_career_coach_gate_by_tier` as a new method instead of creating the file.

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact tests/Unit/UserLimitsTest.php --filter=test_career_coach_gate_by_tier`
Expected: FAIL — `Call to undefined method UserLimits::canCareerCoach()`

- [ ] **Step 3: Implement the method**

Add to `app/Services/UserLimits.php`, near `canAiTailoring()`:

```php
    public static function canCareerCoach(User $user): bool
    {
        return in_array($user->planTier(), ['pro', 'agency'], true);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact tests/Unit/UserLimitsTest.php --filter=test_career_coach_gate_by_tier`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/Services/UserLimits.php tests/Unit/UserLimitsTest.php
git commit -m "feat: add UserLimits::canCareerCoach pro/agency gate"
```

---

### Task 3: `AiService::chat()` `messages` option

**Files:**
- Modify: `app/Services/AiService.php:20-57`
- Test: `tests/Unit/AiServiceTest.php` (create if it doesn't exist)

**Interfaces:**
- Consumes: `OpenAI\Contracts\ClientContract` (existing constructor dependency), `OpenAI\Testing\ClientFake`.
- Produces: `AiService::chat(string $prompt, array $options = [])` now accepts `$options['messages']` (`array<array{role: string, content: string}>`). When present, it replaces the `[['role' => 'user', 'content' => $prompt]]` array sent to OpenAI's `chat()->create()`. `$prompt` is still passed to `moderate()` unchanged. Consumed by Task 4's `CareerCoachController`.

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Unit;

use App\Services\AiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class AiServiceTest extends TestCase
{
    use RefreshDatabase;

    private function fake(): ClientFake
    {
        $fake = new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'reply']]],
                'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 5, 'total_tokens' => 15],
            ]),
        ]);
        $this->app->instance(ClientContract::class, $fake);

        return $fake;
    }

    public function test_default_behavior_sends_single_prompt_message(): void
    {
        $fake = $this->fake();

        app(AiService::class)->chat('Hello');

        $fake->assertSent(\OpenAI\Resources\Chat::class, function ($method, $parameters) {
            return $method === 'create'
                && $parameters['messages'] === [['role' => 'user', 'content' => 'Hello']];
        });
    }

    public function test_messages_option_overrides_default_array(): void
    {
        $fake = $this->fake();

        $history = [
            ['role' => 'system', 'content' => 'You are a coach.'],
            ['role' => 'user', 'content' => 'Hi'],
            ['role' => 'assistant', 'content' => 'Hello!'],
            ['role' => 'user', 'content' => 'Hello'],
        ];

        app(AiService::class)->chat('Hello', ['messages' => $history]);

        $fake->assertSent(\OpenAI\Resources\Chat::class, function ($method, $parameters) use ($history) {
            return $method === 'create' && $parameters['messages'] === $history;
        });
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/AiServiceTest.php`
Expected: `test_default_behavior_sends_single_prompt_message` PASSES already (documents current behavior); `test_messages_option_overrides_default_array` FAILS because `messages` option is ignored today.

- [ ] **Step 3: Implement the option**

In `app/Services/AiService.php`, inside `chat()`, replace:

```php
            $params = [
                'model' => $model,
                'messages' => [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'user' => $this->userId($user),
                'max_tokens' => $maxTokens,
            ];
```

with:

```php
            $params = [
                'model' => $model,
                'messages' => $options['messages'] ?? [
                    ['role' => 'user', 'content' => $prompt],
                ],
                'user' => $this->userId($user),
                'max_tokens' => $maxTokens,
            ];
```

Update the method's PHPDoc `@param` line to document the new key:

```php
     * @param  array{model?: string, user?: User|null, feature?: string|null, response_format?: array<string,string>, max_tokens?: int, messages?: array<array{role: string, content: string}>}  $options
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/AiServiceTest.php`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full existing AI-related test suite to confirm no regression**

Run: `php artisan test --compact tests/Feature/InterviewCoachTest.php`
Expected: PASS (all 7 tests, unchanged) — confirms callers that don't pass `messages` are unaffected.

- [ ] **Step 6: Commit**

```bash
git add app/Services/AiService.php tests/Unit/AiServiceTest.php
git commit -m "feat: allow AiService::chat to accept explicit message history"
```

---

### Task 4: `AiPrompts::build('career_coach', ...)`

**Files:**
- Modify: `app/Data/AiPrompts.php`
- Test: `tests/Unit/AiPromptsTest.php` (create if it doesn't exist)

**Interfaces:**
- Produces: `AiPrompts::build('career_coach', ['resume_context' => array{summary?: ?string, experience?: array<mixed>, skills?: array<mixed>}|null])` — returns a system-message string. Consumed by Task 5's `CareerCoachController`.

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Unit;

use App\Data\AiPrompts;
use PHPUnit\Framework\TestCase;

class AiPromptsTest extends TestCase
{
    public function test_career_coach_includes_resume_context(): void
    {
        $prompt = AiPrompts::build('career_coach', [
            'resume_context' => [
                'summary' => 'Senior backend engineer.',
                'experience' => [['title' => 'Engineer', 'company' => 'Acme']],
                'skills' => ['PHP', 'Laravel'],
            ],
        ]);

        $this->assertStringContainsString('Senior backend engineer.', $prompt);
        $this->assertStringContainsString('Engineer', $prompt);
        $this->assertStringContainsString('PHP', $prompt);
    }

    public function test_career_coach_handles_missing_resume(): void
    {
        $prompt = AiPrompts::build('career_coach', ['resume_context' => null]);

        $this->assertStringContainsString('no resume', strtolower($prompt));
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/AiPromptsTest.php`
Expected: FAIL — `InvalidArgumentException: Unknown AI feature: career_coach`

- [ ] **Step 3: Implement the branch**

In `app/Data/AiPrompts.php`, add `'career_coach' => self::careerCoach($input),` to the `match` in `build()`:

```php
    public static function build(string $feature, array $input): string
    {
        return match ($feature) {
            'rewrite_bullet' => self::rewriteBullet($input),
            'generate_summary' => self::generateSummary($input),
            'ats_keywords' => self::atsKeywords($input),
            'interview_coach' => self::interviewCoach($input),
            'career_coach' => self::careerCoach($input),
            default => throw new InvalidArgumentException("Unknown AI feature: {$feature}"),
        };
    }
```

Add the private method (place after `interviewCoach()`):

```php
    /**
     * @param  array{resume_context?: array{summary?: ?string, experience?: array<mixed>, skills?: array<mixed>}|null}  $input
     */
    private static function careerCoach(array $input): string
    {
        $context = $input['resume_context'] ?? null;

        if ($context === null) {
            $resumeSection = 'The candidate has no resume on file yet — ask about their background '
                .'directly instead of assuming any prior experience.';
        } else {
            $summary = $context['summary'] ?? 'No summary provided.';
            $skills = implode(', ', array_slice($context['skills'] ?? [], 0, 15)) ?: 'No skills listed';

            $experienceLines = [];
            foreach (array_slice($context['experience'] ?? [], 0, 5) as $exp) {
                $line = implode(' at ', array_filter([$exp['title'] ?? null, $exp['company'] ?? null]));
                if ($line) {
                    $experienceLines[] = $line;
                }
            }
            $experienceText = $experienceLines ? implode("\n", $experienceLines) : 'No experience listed';

            $resumeSection = <<<CONTEXT
            Candidate's most recent resume:
            Summary: {$summary}
            Skills: {$skills}
            Experience:
            {$experienceText}
            CONTEXT;
        }

        return <<<PROMPT
        You are a supportive, practical career coach having an ongoing conversation with this candidate.
        Give specific, actionable advice grounded in their actual background below — do not invent
        employers, titles, or accomplishments they haven't mentioned. Keep replies conversational and
        concise (a few short paragraphs, not an essay).

        {$resumeSection}
        PROMPT;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/AiPromptsTest.php`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/Data/AiPrompts.php tests/Unit/AiPromptsTest.php
git commit -m "feat: add career_coach system prompt builder"
```

---

### Task 5: `CareerCoachController` + routes

**Files:**
- Create: `app/Http/Controllers/CareerCoachController.php`
- Modify: `routes/web.php` (add `use` statement near line 14, add routes near line 108)
- Test: `tests/Feature/CareerCoachTest.php`

**Interfaces:**
- Consumes: `UserLimits::canCareerCoach()` (Task 2), `AiService::chat()` with `messages` (Task 3), `AiPrompts::build('career_coach', ...)` (Task 4), `CareerCoachMessage` (Task 1), `App\Exceptions\ModerationException` (existing, `app/Exceptions/ModerationException.php`).
- Produces: `GET /career-coach` → `career-coach.index` (Inertia page `CareerCoach/Index` with props `messages: array<{id:int,role:string,content:string,created_at:string}>`, `canUseCareerCoach: bool`, `remaining: int`); `POST /career-coach/messages` → `career-coach.send` (JSON). Consumed by Task 6's frontend page.

- [ ] **Step 1: Write the failing tests**

```php
<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\CareerCoachMessage;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class CareerCoachTest extends TestCase
{
    use RefreshDatabase;

    private function fakeReply(string $content = 'Here is some advice.'): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => $content]]],
                'usage' => ['prompt_tokens' => 100, 'completion_tokens' => 50, 'total_tokens' => 150],
            ]),
        ]));
    }

    private function fakeFlagged(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
    }

    public function test_index_returns_402_for_starter_user(): void
    {
        $user = User::factory()->starter()->create();

        $response = $this->actingAs($user)->get(route('career-coach.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->where('canUseCareerCoach', false));
    }

    public function test_send_returns_402_for_starter_user(): void
    {
        $user = User::factory()->starter()->create();

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), ['message' => 'Hi']);

        $response->assertStatus(402);
        $response->assertJsonPath('required_tier', 'pro');
        $this->assertDatabaseCount('career_coach_messages', 0);
    }

    public function test_pro_user_can_send_and_receive_reply(): void
    {
        $this->fakeReply('Focus on your Laravel experience.');
        $user = User::factory()->pro()->create();
        Resume::factory()->create(['user_id' => $user->id, 'updated_at' => now()]);

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), [
            'message' => 'How do I pivot into backend roles?',
        ]);

        $response->assertOk();
        $response->assertJsonPath('message.role', 'assistant');
        $response->assertJsonPath('message.content', 'Focus on your Laravel experience.');

        $this->assertDatabaseHas('career_coach_messages', [
            'user_id' => $user->id,
            'role' => 'user',
            'content' => 'How do I pivot into backend roles?',
        ]);
        $this->assertDatabaseHas('career_coach_messages', [
            'user_id' => $user->id,
            'role' => 'assistant',
            'content' => 'Focus on your Laravel experience.',
        ]);
    }

    public function test_history_capped_at_20_messages_sent_to_ai(): void
    {
        $fake = new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            CreateResponse::fake([
                'model' => 'gpt-4o-mini',
                'choices' => [['index' => 0, 'message' => ['role' => 'assistant', 'content' => 'ok']]],
                'usage' => ['prompt_tokens' => 10, 'completion_tokens' => 5, 'total_tokens' => 15],
            ]),
        ]);
        $this->app->instance(ClientContract::class, $fake);

        $user = User::factory()->agency()->create();
        CareerCoachMessage::factory()->count(25)->create(['user_id' => $user->id]);

        $this->actingAs($user)->postJson(route('career-coach.send'), ['message' => 'Latest question']);

        $fake->assertSent(\OpenAI\Resources\Chat::class, function ($method, $parameters) {
            // 1 system message + 20 history messages (capped), including the just-created user message.
            return $method === 'create' && count($parameters['messages']) === 21;
        });
    }

    public function test_moderation_rejection_keeps_user_message_without_assistant_reply(): void
    {
        $this->fakeFlagged();
        $user = User::factory()->pro()->create();

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), [
            'message' => 'flagged content',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('career_coach_messages', ['user_id' => $user->id, 'role' => 'user']);
        $this->assertDatabaseMissing('career_coach_messages', ['user_id' => $user->id, 'role' => 'assistant']);
    }

    public function test_ai_quota_exhausted_keeps_user_message_without_assistant_reply(): void
    {
        $user = User::factory()->pro()->create();
        AiRequest::factory()->count(500)->create(['user_id' => $user->id, 'status' => 'success']);

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), ['message' => 'Hi']);

        $response->assertStatus(402);
        $this->assertDatabaseHas('career_coach_messages', ['user_id' => $user->id, 'role' => 'user']);
        $this->assertDatabaseMissing('career_coach_messages', ['user_id' => $user->id, 'role' => 'assistant']);
    }

    public function test_validation_requires_message(): void
    {
        $user = User::factory()->pro()->create();

        $response = $this->actingAs($user)->postJson(route('career-coach.send'), []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['message']);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/CareerCoachTest.php`
Expected: FAIL — route `career-coach.index` / `career-coach.send` not defined, `CareerCoachMessage::factory()` missing.

- [ ] **Step 3: Add a factory for `CareerCoachMessage`**

Create `database/factories/CareerCoachMessageFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\CareerCoachMessage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CareerCoachMessage>
 */
class CareerCoachMessageFactory extends Factory
{
    protected $model = CareerCoachMessage::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'role' => 'user',
            'content' => $this->faker->sentence(),
        ];
    }
}
```

- [ ] **Step 4: Write the controller**

```php
<?php

namespace App\Http\Controllers;

use App\Data\AiPrompts;
use App\Exceptions\ModerationException;
use App\Models\CareerCoachMessage;
use App\Services\AiService;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class CareerCoachController extends Controller
{
    public function __construct(private AiService $ai) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        $messages = CareerCoachMessage::where('user_id', $user->id)
            ->orderBy('created_at')
            ->get(['id', 'role', 'content', 'created_at']);

        return Inertia::render('CareerCoach/Index', [
            'messages' => $messages,
            'canUseCareerCoach' => UserLimits::canCareerCoach($user),
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }

    public function send(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! UserLimits::canCareerCoach($user)) {
            return response()->json([
                'error' => 'Career Coach is a Pro feature.',
                'required_tier' => 'pro',
            ], 402);
        }

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

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $userMessage = CareerCoachMessage::create([
            'user_id' => $user->id,
            'role' => 'user',
            'content' => $validated['message'],
        ]);

        $history = CareerCoachMessage::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['role', 'content'])
            ->reverse()
            ->map(fn (CareerCoachMessage $m) => ['role' => $m->role, 'content' => $m->content])
            ->values()
            ->all();

        $resume = $user->resumes()->latest('updated_at')->first();
        $resumeContext = $resume ? [
            'summary' => $resume->summary,
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ] : null;

        try {
            $reply = $this->ai->chat(
                $userMessage->content,
                [
                    'messages' => [
                        ['role' => 'system', 'content' => AiPrompts::build('career_coach', ['resume_context' => $resumeContext])],
                        ...$history,
                    ],
                    'user' => $user,
                    'feature' => 'career_coach',
                ],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $assistantMessage = CareerCoachMessage::create([
            'user_id' => $user->id,
            'role' => 'assistant',
            'content' => $reply,
        ]);

        return response()->json([
            'message' => [
                'role' => $assistantMessage->role,
                'content' => $assistantMessage->content,
                'created_at' => $assistantMessage->created_at,
            ],
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }
}
```

- [ ] **Step 5: Add routes**

In `routes/web.php`, add the `use` statement alphabetically near the other controller imports (after `use App\Http\Controllers\BillingController;`):

```php
use App\Http\Controllers\CareerCoachController;
```

Add the routes inside the existing `Route::middleware(['auth', 'verified', 'two_factor_challenge'])->group(...)` block, after the `messages.index`-style routes or near the interview-coach block (after line 100's closing `});` for the `throttle:20,1` group):

```php
    Route::get('/career-coach', [CareerCoachController::class, 'index'])->name('career-coach.index');
    Route::middleware('throttle:20,1')->post('/career-coach/messages', [CareerCoachController::class, 'send'])->name('career-coach.send');
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/CareerCoachTest.php`
Expected: PASS (8 tests)

- [ ] **Step 7: Run Pint**

Run: `./vendor/bin/pint --dirty --format agent`
Expected: no violations, or auto-fixed cleanly.

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/CareerCoachController.php routes/web.php database/factories/CareerCoachMessageFactory.php tests/Feature/CareerCoachTest.php
git commit -m "feat: add CareerCoachController with tier gating and history cap"
```

---

### Task 6: Frontend chat page

**Files:**
- Create: `resources/js/Pages/CareerCoach/Index.tsx`
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx` (nav links, desktop + mobile)

**Interfaces:**
- Consumes: `route('career-coach.index')`, `route('career-coach.send')` (Task 5); Inertia props `messages: {id:number, role:string, content:string, created_at:string}[]`, `canUseCareerCoach: boolean`, `remaining: number`.

- [ ] **Step 1: Add the nav links**

In `resources/js/Layouts/AuthenticatedLayout.tsx`, add a desktop `NavLink` after the `messages.index` link (line 49):

```tsx
                                <NavLink href={route('career-coach.index')} active={route().current('career-coach.*')}>Career Coach</NavLink>
```

And a mobile `ResponsiveNavLink` after the corresponding `messages.index` mobile link (line 109):

```tsx
                        <ResponsiveNavLink href={route('career-coach.index')} active={route().current('career-coach.*')}>Career Coach</ResponsiveNavLink>
```

- [ ] **Step 2: Write the page component**

Create `resources/js/Pages/CareerCoach/Index.tsx`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FormEvent, useEffect, useRef, useState } from 'react';

interface CoachMessage {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
}

interface CareerCoachIndexProps {
    messages: CoachMessage[];
    canUseCareerCoach: boolean;
    remaining: number;
}

function formatTime(str: string) {
    return new Date(str).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
}

function csrfToken(): string {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export default function CareerCoachIndex({ messages: initialMessages, canUseCareerCoach, remaining }: CareerCoachIndexProps) {
    const [messages, setMessages] = useState<CoachMessage[]>(initialMessages);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    if (!canUseCareerCoach) {
        return (
            <AuthenticatedLayout>
                <Head title="Career Coach" />
                <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-3 bg-[#f9f9fc] px-5 text-center">
                    <p className="text-lg font-semibold text-[#0f0f1a]">Career Coach is a Pro feature</p>
                    <p className="max-w-sm text-sm text-[#71717a]">
                        Upgrade to Pro to get an ongoing AI career coach grounded in your resume.
                    </p>
                    <a
                        href={route('billing.index')}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                    >
                        Upgrade to Pro
                    </a>
                </div>
            </AuthenticatedLayout>
        );
    }

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const content = draft.trim();
        if (!content || sending) return;

        setSending(true);
        setError(null);

        const optimisticId = Date.now();
        setMessages(prev => [...prev, { id: optimisticId, role: 'user', content, created_at: new Date().toISOString() }]);
        setDraft('');

        try {
            const res = await fetch(route('career-coach.send'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ message: content }),
            });
            const json = await res.json();

            if (res.ok) {
                setMessages(prev => [...prev, { id: optimisticId + 1, ...json.message }]);
            } else {
                setError(json.error ?? "Couldn't get a reply, try again.");
            }
        } catch {
            setError("Couldn't get a reply, try again.");
        } finally {
            setSending(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Career Coach" />

            <div className="flex h-[calc(100vh-4rem)] flex-col">
                <div className="flex items-center justify-between border-b border-[#eeeef5] bg-white px-5 py-3">
                    <span className="text-sm font-semibold text-[#0f0f1a]">Career Coach</span>
                    <span className="text-xs text-[#a0a0b0]">{remaining} AI generations left this month</span>
                </div>

                <div className="flex-1 overflow-y-auto bg-[#f9f9fc] px-5 py-6">
                    <div className="mx-auto max-w-2xl space-y-3">
                        {messages.length === 0 && (
                            <p className="text-center text-sm text-[#a0a0b0]">
                                Ask your career coach anything — it knows your latest resume.
                            </p>
                        )}
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                                    msg.role === 'user'
                                        ? 'rounded-br-sm bg-indigo-600 text-white'
                                        : 'rounded-bl-sm bg-white text-[#0f0f1a]'
                                }`}>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                                    <p className={`mt-1 text-right text-[10px] ${msg.role === 'user' ? 'text-indigo-200' : 'text-[#b0b0c0]'}`}>
                                        {formatTime(msg.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {error && <p className="text-center text-xs text-red-500">{error}</p>}
                        <div ref={bottomRef} />
                    </div>
                </div>

                <div className="border-t border-[#eeeef5] bg-white px-5 py-4">
                    <form onSubmit={submit} className="mx-auto flex max-w-2xl gap-3">
                        <div className="flex-1">
                            <textarea
                                value={draft}
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e as unknown as FormEvent);
                                }}
                                rows={2}
                                placeholder="Ask your career coach…"
                                className="w-full resize-none rounded-xl border border-[#e0e0ea] px-3 py-2 text-sm text-[#0f0f1a] placeholder-[#b0b0c0] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={sending || !draft.trim()}
                            className="self-end rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {sending ? 'Sending…' : 'Send'}
                        </button>
                    </form>
                    <p className="mx-auto mt-1 max-w-2xl text-right text-[10px] text-[#c0c0cc]">⌘+Enter to send</p>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Type-check the frontend**

Run: `npm run build`
Expected: TypeScript compiles with no errors (this project runs `tsc` before `vite build` per `package.json`).

- [ ] **Step 4: Manual verification**

Run `composer run dev`, log in as a Pro/Agency user, visit `/career-coach`, send a message, confirm the reply appears without a full page reload and the textarea clears. Then log in as a Free/Starter user and confirm the locked state renders with the upgrade CTA.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/CareerCoach/Index.tsx resources/js/Layouts/AuthenticatedLayout.tsx
git commit -m "feat: add Career Coach chat page and nav link"
```

---

### Task 7: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `php artisan test --compact`
Expected: all tests pass, including the new `CareerCoachMessageTest`, `UserLimitsTest::test_career_coach_gate_by_tier`, `AiServiceTest`, `AiPromptsTest`, `CareerCoachTest`, plus every pre-existing test (confirming `AiService::chat()`'s additive change didn't break `rewrite_bullet`/`generate_summary`/`ats_keywords`/`interview_coach`).

- [ ] **Step 2: Run Pint across the whole diff**

Run: `./vendor/bin/pint --dirty --format agent`
Expected: clean.
