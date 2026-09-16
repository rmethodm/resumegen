# AI expansion: bullet-rewrite UI + full-resume review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the existing bullet-rewrite endpoint into the Workstation editor, and add a new "Coach" tab that runs a full-resume AI review (JD-aware when a JD is pasted), replacing the count-based AI cap with real cost logging.

**Architecture:** Backend: `AiUsageLimiter::allows()` drops the count cap (only `ai_blocked` refuses); `AiService` gains a pricing map + `reviewResume()` (gpt-4o, structured JSON output) alongside the existing `rewriteBullet()` (gpt-4o-mini); a new `resumes.ai_review`/`ai_review_generated_at` cache pair persists the last review. Frontend: `bullets-editor.tsx` gets a per-bullet "Rewrite with AI" toolbar action (cursor-scoped, tiptap-native); a new `coach-panel.tsx` renders under a new `'Coach'` `WorkstationTab`.

**Tech Stack:** Laravel 13 / PHP 8.5, PHPUnit-style Pest-free tests (`extends TestCase`, matching `AiSuggestionTest.php`), React 19 + TypeScript, Tiptap 2, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-ai-review-and-bullet-rewrite-ui-design.md`

## Global Constraints

- No `aiEnabled` prop, no feature flag, no billing/tier gating (spec Non-goals).
- No `cost_micro_cents` UI surfacing — logged only.
- Ownership checks stay inline (`abort_unless($resume->user_id === $request->user()->id, 404)`) — no `ResumePolicy`.
- Route: `POST /resumes/{resume}/ai-review`, `throttle:20,1`, inside the existing `auth` group (matches `ai.rewrite-bullet`).
- CSRF/fetch convention for all new non-Inertia POSTs: mirror `UrlField` in `resources/js/Components/workstation/inspector-fields.tsx:310-433` exactly — `Content-Type: application/json`, `Accept: application/json`, `X-Requested-With: XMLHttpRequest`, `X-CSRF-TOKEN` read from `meta[name="csrf-token"]`. Do NOT use `resources/js/hooks/useAiSuggestion.ts` — it is dead code from the deleted tier/quota AI system (402 quota shape, references deleted `Edit.tsx`/`UpgradeModal`), not the current `AiUsageLimiter` 429/`ai_blocked` shape.
- `AiReviewSuggestion.section` union: `'contact' | 'summary' | 'experience' | 'skills' | 'education'` (spec's exact shape).

## Design deviations found during planning (flagging per Rule 7 — surface, don't silently absorb)

1. **Bullet rewrite is cursor-scoped, not row-scoped.** `bullets-editor.tsx`'s `BulletsField` is a single Tiptap rich-text editor over the whole bullet list (not one row per bullet), so "a 'Rewrite with AI' action per bullet" (spec §2) is implemented as one toolbar button that rewrites whichever list item the cursor is currently in, using Tiptap's selection API. This is the smallest change that fits the existing architecture (ladder rung 4).
2. **No component-render test infra exists.** No `@testing-library/react` dependency and no prior RTL-style test in the codebase — only pure-function `vitest` tests (`describe`/`it` over exported functions). Spec §5's "Vitest component test for the bullet-rewrite accept/discard interaction" is implemented as a pure-function reducer test (`bulletRewriteReducer`) instead of a rendered-component test, matching the codebase's only existing test pattern rather than introducing a new test-tooling dependency.
3. **No existing `AiUsageLimiter` test asserts the count cap** — `tests/Feature/AiSuggestionTest.php` only tests `ai_blocked`. Changing `allows()` therefore breaks nothing existing; Task 1 adds one new unit test for the new behavior instead of "updating" a count-cap test that doesn't exist.

---

### Task 1: Cost control — drop the count cap, log real cost

**Files:**
- Modify: `app/Services/AiUsageLimiter.php`
- Modify: `app/Services/AiService.php`
- Modify: `tests/Feature/AiSuggestionTest.php`
- Test: `tests/Unit/AiServiceCostTest.php` (create)

**Interfaces:**
- Produces: `AiService::costMicroCents(string $model, int $promptTokens, int $completionTokens): int` (public static) — later tasks (Task 3) call it.
- Produces: `AiUsageLimiter::allows(User $user): bool` — unchanged signature, changed body.

- [ ] **Step 1: Write the failing cost-calculation test**

Create `tests/Unit/AiServiceCostTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Services\AiService;
use Tests\TestCase;

class AiServiceCostTest extends TestCase
{
    public function test_gpt_4o_mini_cost_is_computed_from_pinned_rates(): void
    {
        // 1000 prompt + 1000 completion tokens = 15000 + 60000 micro-cents.
        $this->assertSame(75000, AiService::costMicroCents('gpt-4o-mini', 1000, 1000));
    }

    public function test_gpt_4o_cost_is_computed_from_pinned_rates(): void
    {
        // 1000 prompt + 1000 completion tokens = 250000 + 1000000 micro-cents.
        $this->assertSame(1250000, AiService::costMicroCents('gpt-4o', 1000, 1000));
    }

    public function test_unknown_model_costs_zero(): void
    {
        $this->assertSame(0, AiService::costMicroCents('some-future-model', 1000, 1000));
    }

    public function test_zero_tokens_costs_zero(): void
    {
        $this->assertSame(0, AiService::costMicroCents('gpt-4o-mini', 0, 0));
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Unit/AiServiceCostTest.php`
Expected: FAIL — `Call to undefined method App\Services\AiService::costMicroCents()`.

- [ ] **Step 3: Add the pricing map and `costMicroCents()` to `AiService`**

In `app/Services/AiService.php`, add inside the class (after `private const MODEL = 'gpt-4o-mini';`):

```php
    /**
     * Per-1,000-token pricing in micro-cents (1 cent = 1,000,000 micro-cents),
     * a point-in-time snapshot of OpenAI's published per-token rates as of
     * 2026-09-09. Verify against https://openai.com/api/pricing before
     * relying on this for real spend decisions — it is not fetched
     * dynamically and will drift.
     *
     * @var array<string, array{prompt: float, completion: float}>
     */
    private const PRICING_PER_1K_TOKENS_MICRO_CENTS = [
        'gpt-4o-mini' => ['prompt' => 15000.0, 'completion' => 60000.0],
        'gpt-4o' => ['prompt' => 250000.0, 'completion' => 1000000.0],
    ];

    public static function costMicroCents(string $model, int $promptTokens, int $completionTokens): int
    {
        $rates = self::PRICING_PER_1K_TOKENS_MICRO_CENTS[$model] ?? null;

        if ($rates === null) {
            return 0;
        }

        $cost = ($promptTokens / 1000) * $rates['prompt']
            + ($completionTokens / 1000) * $rates['completion'];

        return (int) round($cost);
    }
```

- [ ] **Step 4: Run the cost test to verify it passes**

Run: `php artisan test tests/Unit/AiServiceCostTest.php`
Expected: PASS, 4/4.

- [ ] **Step 5: Write the failing test for cost being logged on bullet rewrite**

In `tests/Feature/AiSuggestionTest.php`, extend `test_a_bullet_is_rewritten_and_logged`:

```php
    public function test_a_bullet_is_rewritten_and_logged(): void
    {
        $user = User::factory()->create();

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    [
                        'message' => ['role' => 'assistant', 'content' => 'Led backend migration reducing latency 30%.'],
                    ],
                ],
                'usage' => ['prompt_tokens' => 40, 'completion_tokens' => 12],
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('ai.rewrite-bullet'), ['bullet' => 'Did backend stuff']);

        $response->assertOk()->assertJson(['text' => 'Led backend migration reducing latency 30%.']);

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'bullet_rewrite',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 40,
            'completion_tokens' => 12,
            'cost_micro_cents' => 600 + 720, // (40/1000*15000) + (12/1000*60000)
        ]);
    }
```

- [ ] **Step 6: Run it to verify it fails**

Run: `php artisan test tests/Feature/AiSuggestionTest.php --filter=test_a_bullet_is_rewritten_and_logged`
Expected: FAIL — `cost_micro_cents` is `0` in the database, not `1320`.

- [ ] **Step 7: Make `rewriteBullet()` log real cost**

In `app/Services/AiService.php`, in `rewriteBullet()`, change the `aiRequests()->create()` call:

```php
        $promptTokens = $response->usage->promptTokens ?? 0;
        $completionTokens = $response->usage->completionTokens ?? 0;

        $user->aiRequests()->create([
            'feature' => 'bullet_rewrite',
            'model' => self::MODEL,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'cost_micro_cents' => self::costMicroCents(self::MODEL, $promptTokens, $completionTokens),
        ]);

        return [
            'text' => $text,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
        ];
```

(Remove the now-duplicate `$response->usage->promptTokens ?? 0` / `completionTokens` expressions further down that this replaces — keep the two local variables as the single source.)

- [ ] **Step 8: Run the feature test to verify it passes**

Run: `php artisan test tests/Feature/AiSuggestionTest.php`
Expected: PASS, 3/3 (including the still-passing `test_blocked_users_are_refused`).

- [ ] **Step 9: Write the failing test for the disabled count cap**

Add to `tests/Feature/AiSuggestionTest.php`:

```php
    public function test_the_count_cap_no_longer_blocks_usage(): void
    {
        $user = User::factory()->create();

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => 'Rewritten.']],
                ],
            ]),
        ]);

        for ($i = 0; $i < 12; $i++) {
            $this->actingAs($user)
                ->postJson(route('ai.rewrite-bullet'), ['bullet' => "Bullet {$i}"])
                ->assertOk();
        }
    }
```

- [ ] **Step 10: Run it to verify it fails**

Run: `php artisan test tests/Feature/AiSuggestionTest.php --filter=test_the_count_cap_no_longer_blocks_usage`
Expected: FAIL on the 11th request — 429 "Daily AI limit reached."

- [ ] **Step 11: Change `AiUsageLimiter::allows()`**

In `app/Services/AiUsageLimiter.php`, replace `allows()`:

```php
    public function allows(User $user): bool
    {
        return ! $user->ai_blocked;
    }
```

Leave `remaining()` and `DEFAULT_DAILY_LIMIT` in place — dead but cheap to revive, per spec §1.

- [ ] **Step 12: Run the full AI suggestion suite to verify it passes**

Run: `php artisan test tests/Feature/AiSuggestionTest.php`
Expected: PASS, 4/4.

- [ ] **Step 13: Commit**

```bash
git add app/Services/AiUsageLimiter.php app/Services/AiService.php tests/Feature/AiSuggestionTest.php tests/Unit/AiServiceCostTest.php
git commit -m "$(cat <<'EOF'
Drop AI count cap, log real per-request cost

AiUsageLimiter::allows() now only enforces ai_blocked; AiService gains
a pinned per-model pricing map and computes cost_micro_cents on every
call instead of leaving it at 0.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `ai_review` cache columns on `resumes`

**Files:**
- Create: `database/migrations/2026_09_09_040000_add_ai_review_to_resumes_table.php`
- Modify: `app/Models/Resume.php`
- Test: `tests/Feature/ResumeAiReviewCacheTest.php` (create)

**Interfaces:**
- Produces: `resumes.ai_review` (json, nullable, cast to `array`), `resumes.ai_review_generated_at` (timestamp, nullable, cast to `datetime`) on the `Resume` model. Task 3 writes these directly (`$resume->ai_review = ...; $resume->save();`) — they are deliberately NOT in `$fillable`, so mass assignment (`update()`, `UpdateResumeRequest`) can never touch them from the regular save path.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/ResumeAiReviewCacheTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeAiReviewCacheTest extends TestCase
{
    use RefreshDatabase;

    public function test_ai_review_is_cast_to_array_and_generated_at_to_datetime(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $resume->ai_review = [['id' => 'a', 'label' => 'x', 'severity' => 'high', 'section' => 'summary', 'detail' => 'y']];
        $resume->ai_review_generated_at = now();
        $resume->save();

        $fresh = $resume->fresh();

        $this->assertIsArray($fresh->ai_review);
        $this->assertSame('a', $fresh->ai_review[0]['id']);
        $this->assertNotNull($fresh->ai_review_generated_at);
        $this->assertTrue($fresh->ai_review_generated_at->isToday());
    }

    public function test_ai_review_is_not_mass_assignable(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $resume->update(['ai_review' => [['id' => 'x']]]);

        $this->assertNull($resume->fresh()->ai_review);
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Feature/ResumeAiReviewCacheTest.php`
Expected: FAIL — `Unknown column 'ai_review'`.

- [ ] **Step 3: Create the migration**

Create `database/migrations/2026_09_09_040000_add_ai_review_to_resumes_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->json('ai_review')->nullable();
            $table->timestamp('ai_review_generated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn(['ai_review', 'ai_review_generated_at']);
        });
    }
};
```

- [ ] **Step 4: Run migrations**

Run: `php artisan migrate`
Expected: `2026_09_09_040000_add_ai_review_to_resumes_table` shown as `Migrated`.

- [ ] **Step 5: Add casts to `Resume`**

In `app/Models/Resume.php`, change `casts()`:

```php
    protected function casts(): array
    {
        return [
            'section_order' => 'array',
            'ai_review' => 'array',
            'ai_review_generated_at' => 'datetime',
        ];
    }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `php artisan test tests/Feature/ResumeAiReviewCacheTest.php`
Expected: PASS, 2/2.

- [ ] **Step 7: Commit**

```bash
git add database/migrations/2026_09_09_040000_add_ai_review_to_resumes_table.php app/Models/Resume.php tests/Feature/ResumeAiReviewCacheTest.php
git commit -m "$(cat <<'EOF'
Add resumes.ai_review cache columns

json ai_review + timestamp ai_review_generated_at cache the last full
AI review, same category as the existing section_order JSON column.
Deliberately excluded from $fillable — only direct assignment writes it.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Backend — `reviewResume()` service, controller, route

**Files:**
- Modify: `app/Services/AiService.php`
- Modify: `app/Http/Controllers/AiSuggestionController.php`
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/ResumeController.php`
- Modify: `tests/Feature/AiSuggestionTest.php`

**Interfaces:**
- Consumes: `AiService::costMicroCents()` (Task 1), `Resume::$ai_review`/`$ai_review_generated_at` casts (Task 2), `App\Support\ResumeDocument::toArray()` (existing).
- Produces: `AiService::reviewResume(User $user, array $resumeData, ?string $jd = null): array{suggestions: array, prompt_tokens: int, completion_tokens: int}`. `AiSuggestionController::reviewResume(Request, Resume, AiService, AiUsageLimiter): JsonResponse`. Route name `resumes.ai-review`. Response JSON: `{ suggestions: AiReviewSuggestion[], generated_at: string }` (Task 5 frontend consumes this shape).

- [ ] **Step 1: Write the failing feature test**

Add to `tests/Feature/AiSuggestionTest.php`:

```php
    public function test_a_resume_is_reviewed_and_cached(): void
    {
        $user = User::factory()->create();
        $resume = \App\Models\Resume::factory()->for($user)->create([
            'target_job_description' => 'Looking for a senior backend engineer with AWS experience.',
        ]);

        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    [
                        'message' => [
                            'role' => 'assistant',
                            'content' => json_encode([
                                'suggestions' => [
                                    [
                                        'id' => 'summary-vague',
                                        'label' => 'Summary is too generic',
                                        'severity' => 'high',
                                        'section' => 'summary',
                                        'detail' => 'Mention AWS explicitly since the target JD asks for it.',
                                    ],
                                ],
                            ]),
                        ],
                    ],
                ],
                'usage' => ['prompt_tokens' => 500, 'completion_tokens' => 80],
            ]),
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume));

        $response->assertOk()
            ->assertJsonPath('suggestions.0.id', 'summary-vague')
            ->assertJsonPath('suggestions.0.severity', 'high');

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'resume_review',
            'model' => 'gpt-4o',
        ]);

        $row = \DB::table('ai_requests')->where('feature', 'resume_review')->first();
        $this->assertGreaterThan(0, $row->cost_micro_cents);

        $resume->refresh();
        $this->assertNotNull($resume->ai_review);
        $this->assertSame('summary-vague', $resume->ai_review[0]['id']);
        $this->assertNotNull($resume->ai_review_generated_at);
    }

    public function test_reviewing_another_users_resume_is_not_found(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $resume = \App\Models\Resume::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->postJson(route('resumes.ai-review', $resume))
            ->assertNotFound();
    }

    public function test_blocked_users_cannot_review(): void
    {
        $user = User::factory()->create(['ai_blocked' => true]);
        $resume = \App\Models\Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume))
            ->assertStatus(429);
    }
```

- [ ] **Step 2: Run it to verify it fails**

Run: `php artisan test tests/Feature/AiSuggestionTest.php --filter=test_a_resume_is_reviewed_and_cached`
Expected: FAIL — route `resumes.ai-review` not defined.

- [ ] **Step 3: Add `reviewResume()` to `AiService`**

In `app/Services/AiService.php`, add:

```php
    private const REVIEW_MODEL = 'gpt-4o';

    /**
     * @param  array<string, mixed>  $resumeData
     * @return array{suggestions: array<int, array<string, mixed>>, prompt_tokens: int, completion_tokens: int}
     */
    public function reviewResume(User $user, array $resumeData, ?string $jd = null): array
    {
        $response = OpenAI::chat()->create([
            'model' => self::REVIEW_MODEL,
            'messages' => [
                ['role' => 'user', 'content' => $this->buildReviewPrompt($resumeData, $jd)],
            ],
            'temperature' => 0.3,
            'response_format' => [
                'type' => 'json_schema',
                'json_schema' => [
                    'name' => 'resume_review',
                    'strict' => true,
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'suggestions' => [
                                'type' => 'array',
                                'items' => [
                                    'type' => 'object',
                                    'properties' => [
                                        'id' => ['type' => 'string'],
                                        'label' => ['type' => 'string'],
                                        'severity' => ['type' => 'string', 'enum' => ['high', 'medium', 'low']],
                                        'section' => ['type' => 'string', 'enum' => ['contact', 'summary', 'experience', 'skills', 'education']],
                                        'detail' => ['type' => 'string'],
                                    ],
                                    'required' => ['id', 'label', 'severity', 'section', 'detail'],
                                    'additionalProperties' => false,
                                ],
                            ],
                        ],
                        'required' => ['suggestions'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
        ]);

        $content = $response->choices[0]->message->content ?? '{"suggestions":[]}';
        $decoded = json_decode($content, true);
        $suggestions = is_array($decoded['suggestions'] ?? null) ? $decoded['suggestions'] : [];

        $promptTokens = $response->usage->promptTokens ?? 0;
        $completionTokens = $response->usage->completionTokens ?? 0;

        $user->aiRequests()->create([
            'feature' => 'resume_review',
            'model' => self::REVIEW_MODEL,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'cost_micro_cents' => self::costMicroCents(self::REVIEW_MODEL, $promptTokens, $completionTokens),
        ]);

        return [
            'suggestions' => $suggestions,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
        ];
    }

    /**
     * @param  array<string, mixed>  $resumeData
     */
    private function buildReviewPrompt(array $resumeData, ?string $jd): string
    {
        $resumeJson = json_encode($resumeData, JSON_PRETTY_PRINT);
        $prompt = 'You are a resume reviewer. Read the resume below and return a '
            .'prioritized list of concrete improvement suggestions. Each suggestion '
            .'needs an id (short slug), a label (one short sentence), a severity '
            .'(high, medium, or low), a section it applies to (contact, summary, '
            .'experience, skills, or education), and a detail (one to two sentences '
            ."explaining why and how to fix it). Be specific, reference actual content \n"
            ."from the resume, and do not invent facts.\n\nResume:\n{$resumeJson}";

        if ($jd !== null && trim($jd) !== '') {
            $prompt .= "\n\nTailor the review against this target job description — "
                ."flag gaps between the resume and what it asks for:\n{$jd}";
        }

        return $prompt;
    }
```

- [ ] **Step 4: Add `reviewResume()` to `AiSuggestionController`**

Replace `app/Http/Controllers/AiSuggestionController.php` with:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\RewriteBulletRequest;
use App\Models\Resume;
use App\Services\AiService;
use App\Services\AiUsageLimiter;
use App\Support\ResumeDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSuggestionController extends Controller
{
    public function rewriteBullet(RewriteBulletRequest $request, AiService $ai, AiUsageLimiter $limiter): JsonResponse
    {
        $user = $request->user();

        if (! $limiter->allows($user)) {
            return response()->json(['message' => 'Daily AI limit reached.'], 429);
        }

        $result = $ai->rewriteBullet(
            $user,
            (string) $request->validated('bullet'),
            $request->validated('target_role'),
        );

        return response()->json(['text' => $result['text']]);
    }

    public function reviewResume(Request $request, Resume $resume, AiService $ai, AiUsageLimiter $limiter): JsonResponse
    {
        $user = $request->user();

        abort_unless($resume->user_id === $user->id, 404);

        if (! $limiter->allows($user)) {
            return response()->json(['message' => 'Daily AI limit reached.'], 429);
        }

        $jd = $resume->target_job_description;
        $result = $ai->reviewResume($user, ResumeDocument::toArray($resume), $jd !== '' ? $jd : null);

        $resume->ai_review = $result['suggestions'];
        $resume->ai_review_generated_at = now();
        $resume->save();

        return response()->json([
            'suggestions' => $resume->ai_review,
            'generated_at' => $resume->ai_review_generated_at->toIso8601String(),
        ]);
    }
}
```

- [ ] **Step 5: Add the route**

In `routes/web.php`, immediately after the existing `ai.rewrite-bullet` route (around line 155), add:

```php
    Route::middleware('throttle:20,1')->post('/resumes/{resume}/ai-review', [AiSuggestionController::class, 'reviewResume'])
        ->name('resumes.ai-review');
```

- [ ] **Step 6: Expose `ai_review`/`ai_review_generated_at` on the Workstation Inertia prop**

In `app/Http/Controllers/ResumeController.php`, in `render()`, right after the existing `$document['updated_at'] = ...` line (around line 322), add:

```php
        $document['ai_review'] = $resume->ai_review;
        $document['ai_review_generated_at'] = $resume->ai_review_generated_at?->toIso8601String();
```

(Deliberately not added to `ResumeDocument::toArray()` — that method also serves `PublicResumeShareController`, and the AI review must not leak to public share viewers.)

- [ ] **Step 7: Run the tests to verify they pass**

Run: `php artisan test tests/Feature/AiSuggestionTest.php`
Expected: PASS, 7/7.

- [ ] **Step 8: Commit**

```bash
git add app/Services/AiService.php app/Http/Controllers/AiSuggestionController.php routes/web.php app/Http/Controllers/ResumeController.php tests/Feature/AiSuggestionTest.php
git commit -m "$(cat <<'EOF'
Add full-resume AI review backend

AiService::reviewResume() (gpt-4o, structured JSON output, JD-aware
when target_job_description is set) plus AiSuggestionController::
reviewResume, POST /resumes/{resume}/ai-review, and the resume's
ai_review/ai_review_generated_at cache exposed to the Workstation page.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Frontend types + severity sort helper

**Files:**
- Modify: `resources/js/types/resume.ts`
- Create: `resources/js/lib/ai-review.ts`
- Test: `resources/js/lib/ai-review.test.ts` (create)

**Interfaces:**
- Produces: `AiReviewSuggestion` type, `ResumePageDocument.ai_review`/`.ai_review_generated_at` (Task 5 and 6 consume these), `sortBySeverity(suggestions: AiReviewSuggestion[]): AiReviewSuggestion[]` (Task 5 consumes this).

- [ ] **Step 1: Write the failing test**

Create `resources/js/lib/ai-review.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { sortBySeverity } from './ai-review';
import type { AiReviewSuggestion } from '@/types';

function suggestion(
    overrides: Partial<AiReviewSuggestion> = {},
): AiReviewSuggestion {
    return {
        id: 'x',
        label: 'x',
        severity: 'low',
        section: 'summary',
        detail: 'x',
        ...overrides,
    };
}

describe('sortBySeverity', () => {
    it('orders high, then medium, then low', () => {
        const input = [
            suggestion({ id: 'a', severity: 'low' }),
            suggestion({ id: 'b', severity: 'high' }),
            suggestion({ id: 'c', severity: 'medium' }),
        ];

        expect(sortBySeverity(input).map((s) => s.id)).toEqual([
            'b',
            'c',
            'a',
        ]);
    });

    it('does not mutate the input array', () => {
        const input = [suggestion({ id: 'a', severity: 'low' })];
        const result = sortBySeverity(input);

        expect(result).not.toBe(input);
        expect(input[0]!.id).toBe('a');
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:js -- resources/js/lib/ai-review.test.ts`
Expected: FAIL — cannot find module `./ai-review`.

- [ ] **Step 3: Add the `AiReviewSuggestion` type**

In `resources/js/types/resume.ts`, after the `ResumeDraft` type (line 121), add:

```ts
export type AiReviewSeverity = 'high' | 'medium' | 'low';

export type AiReviewSuggestion = {
    id: string;
    label: string;
    severity: AiReviewSeverity;
    section: 'contact' | 'summary' | 'experience' | 'skills' | 'education';
    detail: string;
};
```

Then change `ResumePageDocument` (the following block) to:

```ts
export type ResumePageDocument = Resume & {
    updated_at?: string | null;
    ai_review?: AiReviewSuggestion[] | null;
    ai_review_generated_at?: string | null;
};
```

- [ ] **Step 4: Create `resources/js/lib/ai-review.ts`**

```ts
import type { AiReviewSuggestion } from '@/types';

const SEVERITY_ORDER: Record<AiReviewSuggestion['severity'], number> = {
    high: 0,
    medium: 1,
    low: 2,
};

/** Highest severity first; stable within a severity (keeps the model's own order). */
export function sortBySeverity(
    suggestions: AiReviewSuggestion[],
): AiReviewSuggestion[] {
    return [...suggestions].sort(
        (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
    );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm run test:js -- resources/js/lib/ai-review.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 6: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add resources/js/types/resume.ts resources/js/lib/ai-review.ts resources/js/lib/ai-review.test.ts
git commit -m "$(cat <<'EOF'
Add AiReviewSuggestion type and severity sort helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Coach tab (frontend)

**Files:**
- Modify: `resources/js/Components/workstation/workstation-format-toolbar.tsx`
- Create: `resources/js/Components/workstation/coach-panel.tsx`
- Modify: `resources/js/Pages/Resumes/Workstation.tsx`

**Interfaces:**
- Consumes: `AiReviewSuggestion`, `ResumePageDocument.ai_review`/`.ai_review_generated_at` (Task 4), `sortBySeverity` (Task 4), `route('resumes.ai-review', id)` (Task 3), `SaveStatus` (existing, from `@/types`).
- Produces: `CoachPanel` component with props `{ resumeId: number; aiReview: AiReviewSuggestion[] | null; aiReviewGeneratedAt: string | null; onReviewed: (suggestions: AiReviewSuggestion[], generatedAt: string) => void; saveStatus: SaveStatus; onFlushSave: () => void; onJumpSection: (section: AiReviewSuggestion['section']) => void }`.

- [ ] **Step 1: Add `'Coach'` to `WORKSTATION_TABS`**

In `resources/js/Components/workstation/workstation-format-toolbar.tsx`, line 48:

```ts
export const WORKSTATION_TABS = ['Edit', 'Review', 'Optimize', 'Coach'] as const;
```

- [ ] **Step 2: Create `coach-panel.tsx`**

Create `resources/js/Components/workstation/coach-panel.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { sortBySeverity } from '@/lib/ai-review';
import { cn } from '@/lib/utils';
import type { AiReviewSuggestion, SaveStatus } from '@/types';

const SEVERITY_STYLES: Record<AiReviewSuggestion['severity'], string> = {
    high: 'border-danger/30 bg-danger-subtle text-danger-text',
    medium: 'border-warning/30 bg-warning-subtle text-warning-text',
    low: 'border-surface-border bg-surface text-ink-muted',
};

const SEVERITY_LABEL: Record<AiReviewSuggestion['severity'], string> = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
};

function timeAgo(iso: string): string {
    const ms = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(ms / 60000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function CoachPanel({
    resumeId,
    aiReview,
    aiReviewGeneratedAt,
    onReviewed,
    saveStatus,
    onFlushSave,
    onJumpSection,
}: {
    resumeId: number;
    aiReview: AiReviewSuggestion[] | null;
    aiReviewGeneratedAt: string | null;
    onReviewed: (suggestions: AiReviewSuggestion[], generatedAt: string) => void;
    saveStatus: SaveStatus;
    onFlushSave: () => void;
    onJumpSection: (section: AiReviewSuggestion['section']) => void;
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [awaitingSave, setAwaitingSave] = useState(false);

    async function runReview() {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(route('resumes.ai-review', resumeId), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                body: JSON.stringify({}),
            });

            if (res.status === 429) {
                setError('AI unavailable right now. Try again later.');
                return;
            }

            if (!res.ok) {
                setError('Review failed. Try again in a moment.');
                return;
            }

            const data = (await res.json()) as {
                suggestions: AiReviewSuggestion[];
                generated_at: string;
            };
            onReviewed(data.suggestions, data.generated_at);
        } catch {
            setError('Review failed. Try again in a moment.');
        } finally {
            setLoading(false);
        }
    }

    function handleReviewClick() {
        setError(null);

        if (saveStatus === 'dirty' || saveStatus === 'saving') {
            setAwaitingSave(true);
            onFlushSave();
            return;
        }

        void runReview();
    }

    useEffect(() => {
        if (awaitingSave && saveStatus === 'saved') {
            setAwaitingSave(false);
            void runReview();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [awaitingSave, saveStatus]);

    const busy = loading || awaitingSave;
    const sorted = aiReview ? sortBySeverity(aiReview) : [];

    return (
        <Card className="gap-0 p-4">
            <div className="mb-3 flex items-baseline justify-between">
                <div>
                    <h2 className="text-sm font-bold text-ink">Coach</h2>
                    <p className="text-xs text-ink-muted">
                        A full-resume AI review, prioritized by impact.
                        {aiReviewGeneratedAt && (
                            <> Last reviewed {timeAgo(aiReviewGeneratedAt)}.</>
                        )}
                    </p>
                </div>
                <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={handleReviewClick}
                >
                    {busy
                        ? awaitingSave
                            ? 'Saving…'
                            : 'Reviewing…'
                        : aiReview
                          ? 'Re-review'
                          : 'Review my resume'}
                </Button>
            </div>

            {error && (
                <p className="mb-3 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-xs font-medium text-danger-text">
                    {error}
                </p>
            )}

            {sorted.length === 0 && !busy && !error && (
                <p className="text-xs text-ink-muted">
                    {aiReview
                        ? 'No suggestions — your resume looks solid.'
                        : "Click \"Review my resume\" to get prioritized, AI-written suggestions."}
                </p>
            )}

            {sorted.length > 0 && (
                <ul className="space-y-2">
                    {sorted.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                onClick={() => onJumpSection(item.section)}
                                className="focus-ring w-full rounded-md border border-surface-border bg-white p-3 text-left hover:border-brand"
                            >
                                <div className="mb-1 flex items-center gap-2">
                                    <span
                                        className={cn(
                                            'rounded-full border px-2 py-0.5 text-xs font-medium',
                                            SEVERITY_STYLES[item.severity],
                                        )}
                                    >
                                        {SEVERITY_LABEL[item.severity]}
                                    </span>
                                    <span className="text-xs font-semibold text-ink">
                                        {item.label}
                                    </span>
                                </div>
                                <p className="text-xs text-ink-muted">
                                    {item.detail}
                                </p>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
```

- [ ] **Step 3: Wire `CoachPanel` into `Workstation.tsx`**

In `resources/js/Pages/Resumes/Workstation.tsx`:

Add to the imports:

```ts
import { CoachPanel } from '@/Components/workstation/coach-panel';
import type { AiReviewSuggestion } from '@/types';
```

Add local state near the other `useState` declarations (after `const [showSideTools, setShowSideTools] = useState(false);`):

```ts
    const [aiReview, setAiReview] = useState<AiReviewSuggestion[] | null>(
        resume.ai_review ?? null,
    );
    const [aiReviewGeneratedAt, setAiReviewGeneratedAt] = useState<
        string | null
    >(resume.ai_review_generated_at ?? null);
```

Add a handler near `jumpChecklist` (after it, around line 310):

```ts
    function jumpToSection(section: AiReviewSuggestion['section']) {
        setTab('Edit');
        scrollToSection(section);
    }
```

In the JSX, immediately after the `{tab === 'Optimize' && (...)}` block (after its closing `)}`, around line 757), add:

```tsx
                                {tab === 'Coach' && (
                                    <CoachPanel
                                        resumeId={id}
                                        aiReview={aiReview}
                                        aiReviewGeneratedAt={aiReviewGeneratedAt}
                                        onReviewed={(suggestions, generatedAt) => {
                                            setAiReview(suggestions);
                                            setAiReviewGeneratedAt(generatedAt);
                                        }}
                                        saveStatus={saveStatus}
                                        onFlushSave={retrySave}
                                        onJumpSection={jumpToSection}
                                    />
                                )}
```

- [ ] **Step 4: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors (verifies `WorkstationTab`, `AiReviewSuggestion['section']` vs `ResumeSectionKey`, and all new props line up).

- [ ] **Step 5: Manual verification in the running app**

Run: `composer run dev` (or ensure it's already running), open a resume's Workstation page in the browser.
- Click the "Coach" tab — empty state with "Review my resume" shows.
- Paste a job description on the Optimize tab, switch back to Coach, click "Review my resume" — button shows "Saving…" briefly then "Reviewing…", then a sorted suggestion list renders (or a real OpenAI call happens if `OPENAI_API_KEY` is configured; otherwise expect a 4xx/5xx and confirm the error banner renders instead of a crash).
- Click a suggestion — jumps to the Edit tab and scrolls to that section.

Report what was actually seen, not assumed.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Components/workstation/workstation-format-toolbar.tsx resources/js/Components/workstation/coach-panel.tsx resources/js/Pages/Resumes/Workstation.tsx
git commit -m "$(cat <<'EOF'
Add Coach tab for full-resume AI review

New WorkstationTab 'Coach' renders CoachPanel: cached review with
last-reviewed timestamp, severity-sorted suggestions that jump to
their section, and an explicit Re-review action (never auto-triggers).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Bullet-rewrite UI (per-bullet, cursor-scoped)

**Files:**
- Create: `resources/js/lib/bullet-rewrite.ts`
- Test: `resources/js/lib/bullet-rewrite.test.ts` (create)
- Modify: `resources/js/Components/workstation/bullets-editor.tsx`
- Modify: `resources/js/Components/workstation/inspector-sections.tsx`

**Interfaces:**
- Produces: `bulletRewriteReducer(state: BulletRewriteState, action: BulletRewriteAction): BulletRewriteState`, `BulletRewriteState`, `BulletRewriteAction` (exported from `bullet-rewrite.ts`).
- `BulletsField` gains an optional `targetRole?: string` prop (used by both call sites in `inspector-sections.tsx`).

- [ ] **Step 1: Write the failing reducer test**

Create `resources/js/lib/bullet-rewrite.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { bulletRewriteReducer } from './bullet-rewrite';

describe('bulletRewriteReducer', () => {
    it('starts idle, moves to loading on start', () => {
        const next = bulletRewriteReducer(
            { status: 'idle' },
            { type: 'start' },
        );
        expect(next).toEqual({ status: 'loading' });
    });

    it('moves to suggested on success', () => {
        const next = bulletRewriteReducer(
            { status: 'loading' },
            { type: 'success', original: 'Did stuff', suggestion: 'Led stuff' },
        );
        expect(next).toEqual({
            status: 'suggested',
            original: 'Did stuff',
            suggestion: 'Led stuff',
        });
    });

    it('accept returns to idle', () => {
        const next = bulletRewriteReducer(
            { status: 'suggested', original: 'a', suggestion: 'b' },
            { type: 'accept' },
        );
        expect(next).toEqual({ status: 'idle' });
    });

    it('discard returns to idle', () => {
        const next = bulletRewriteReducer(
            { status: 'suggested', original: 'a', suggestion: 'b' },
            { type: 'discard' },
        );
        expect(next).toEqual({ status: 'idle' });
    });

    it('moves to error on failure', () => {
        const next = bulletRewriteReducer(
            { status: 'loading' },
            { type: 'error', message: 'AI unavailable' },
        );
        expect(next).toEqual({ status: 'error', message: 'AI unavailable' });
    });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test:js -- resources/js/lib/bullet-rewrite.test.ts`
Expected: FAIL — cannot find module `./bullet-rewrite`.

- [ ] **Step 3: Create `bullet-rewrite.ts`**

```ts
export type BulletRewriteState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'suggested'; original: string; suggestion: string }
    | { status: 'error'; message: string };

export type BulletRewriteAction =
    | { type: 'start' }
    | { type: 'success'; original: string; suggestion: string }
    | { type: 'error'; message: string }
    | { type: 'accept' }
    | { type: 'discard' };

export function bulletRewriteReducer(
    state: BulletRewriteState,
    action: BulletRewriteAction,
): BulletRewriteState {
    switch (action.type) {
        case 'start':
            return { status: 'loading' };
        case 'success':
            return {
                status: 'suggested',
                original: action.original,
                suggestion: action.suggestion,
            };
        case 'error':
            return { status: 'error', message: action.message };
        case 'accept':
        case 'discard':
            return { status: 'idle' };
        default:
            return state;
    }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:js -- resources/js/lib/bullet-rewrite.test.ts`
Expected: PASS, 5/5.

- [ ] **Step 5: Wire the reducer and a toolbar button into `bullets-editor.tsx`**

In `resources/js/Components/workstation/bullets-editor.tsx`:

Add to imports:

```ts
import { SparklesIcon } from '@heroicons/react/24/outline';
import { type Editor } from '@tiptap/react';
import { useReducer } from 'react';
import { bulletRewriteReducer } from '@/lib/bullet-rewrite';
```

(Merge `useReducer` into the existing `import { useEffect, useMemo, type ReactNode } from 'react';` line rather than duplicating it — the actual edit is `import { useEffect, useMemo, useReducer, type ReactNode } from 'react';`.)

Add a module-level helper (outside the component, near the top of the file):

```ts
function currentListItemRange(
    editor: Editor,
): { from: number; to: number; text: string } | null {
    const { $from } = editor.state.selection;

    for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);

        if (node.type.name === 'listItem') {
            return {
                from: $from.before(depth) + 1,
                to: $from.after(depth) - 1,
                text: node.textContent,
            };
        }
    }

    return null;
}
```

Add `targetRole?: string` to `BulletsField`'s props type:

```ts
    label: string;
    value: string[];
    onChange: (value: string[]) => void;
    idPrefix?: string;
    max?: number;
    /** Threaded into the "Rewrite with AI" request; omitted if the resume has none. */
    targetRole?: string;
```

and destructure it in the function signature: `targetRole,` alongside the others.

Inside the component body, after the `editor` is created (after the `useEditor({...})` call, before the `useEffect` for undo/redo sync), add:

```ts
    const [rewrite, dispatchRewrite] = useReducer(bulletRewriteReducer, {
        status: 'idle',
    } as const);

    async function requestRewrite() {
        if (!editor) return;

        const range = currentListItemRange(editor);
        const bulletText = range?.text.trim();

        if (!range || !bulletText) return;

        dispatchRewrite({ type: 'start' });

        try {
            const res = await fetch(route('ai.rewrite-bullet'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                body: JSON.stringify({
                    bullet: bulletText,
                    target_role: targetRole || undefined,
                }),
            });

            if (res.status === 429) {
                dispatchRewrite({ type: 'error', message: 'AI unavailable' });
                return;
            }

            if (!res.ok) {
                dispatchRewrite({
                    type: 'error',
                    message: 'Rewrite failed. Try again.',
                });
                return;
            }

            const data = (await res.json()) as { text: string };
            dispatchRewrite({
                type: 'success',
                original: bulletText,
                suggestion: data.text,
            });
        } catch {
            dispatchRewrite({
                type: 'error',
                message: 'Rewrite failed. Try again.',
            });
        }
    }

    function acceptRewrite() {
        if (rewrite.status !== 'suggested' || !editor) return;

        const range = currentListItemRange(editor);

        if (range) {
            editor.chain().focus().insertContentAt(
                { from: range.from, to: range.to },
                rewrite.suggestion,
            ).run();
        }

        dispatchRewrite({ type: 'accept' });
    }
```

Add a toolbar button after the existing `ToolbarButton label="Link"` block (before the `<span className="mx-1 h-4 w-px bg-surface-border" aria-hidden />` separator that precedes the bullet-list button):

```tsx
                    <ToolbarButton
                        label="Rewrite with AI"
                        active={false}
                        onClick={() => void requestRewrite()}
                    >
                        <SparklesIcon className="size-3.5" />
                    </ToolbarButton>
```

Add the suggestion banner immediately below the toolbar `<div role="toolbar" ...>...</div>` block (as a sibling, inside the same bordered wrapper, before the `<EditorContent editor={editor} />` — locate `EditorContent` in the tail of the file and insert directly above it):

```tsx
            {rewrite.status === 'loading' && (
                <p className="border-t border-surface-border/80 bg-surface/40 px-3 py-1.5 text-xs text-ink-muted">
                    Rewriting…
                </p>
            )}
            {rewrite.status === 'error' && (
                <p className="border-t border-surface-border/80 bg-danger-subtle px-3 py-1.5 text-xs text-danger-text">
                    {rewrite.message}
                </p>
            )}
            {rewrite.status === 'suggested' && (
                <div className="border-t border-surface-border/80 bg-brand-subtle/40 px-3 py-2">
                    <p className="mb-1.5 text-xs text-ink-muted">
                        Suggested: <span className="text-ink">{rewrite.suggestion}</span>
                    </p>
                    <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={acceptRewrite}>
                            Accept
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => dispatchRewrite({ type: 'discard' })}
                        >
                            Discard
                        </Button>
                    </div>
                </div>
            )}
```

Add `import { Button } from '@/Components/ui/button';` to the imports if not already present in this file (check first — `ToolbarButton` is defined locally in this file and may already cover buttons; if `Button` is unused elsewhere in the file, add the import).

- [ ] **Step 6: Pass `targetRole` from both call sites**

In `resources/js/Components/workstation/inspector-sections.tsx`:

In `ExperienceFields`, the existing `<BulletsField ... />` call (around line 286) gets one new prop:

```tsx
                    <BulletsField
                        label="Bullets"
                        idPrefix={`experience-bullet-${index}`}
                        value={experience.bullets}
                        targetRole={resume.target_role || undefined}
                        onChange={(bullets) =>
                            patch(resume, onChange, 'experiences', index, {
                                bullets,
                            })
                        }
                    />
```

In `ProjectFields`, the existing call (around line 409):

```tsx
                    <BulletsField
                        label="Highlights"
                        value={project.highlights}
                        targetRole={resume.target_role || undefined}
                        onChange={(highlights) =>
                            patch(resume, onChange, 'projects', index, {
                                highlights,
                            })
                        }
                    />
```

- [ ] **Step 7: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Manual verification in the running app**

Run: `composer run dev`, open a resume's Workstation, Edit tab, expand an experience entry with at least one bullet.
- Click into a bullet, click the sparkle "Rewrite with AI" toolbar button — "Rewriting…" shows, then a suggestion banner with Accept/Discard.
- Click Accept — that bullet's text is replaced in the editor, banner disappears.
- Repeat, click Discard — original bullet text is unchanged, banner disappears.
- Confirm a 429 (e.g. temporarily set `ai_blocked` true on the test user via tinker) renders "AI unavailable" rather than a crash.

Report what was actually seen.

- [ ] **Step 9: Commit**

```bash
git add resources/js/lib/bullet-rewrite.ts resources/js/lib/bullet-rewrite.test.ts resources/js/Components/workstation/bullets-editor.tsx resources/js/Components/workstation/inspector-sections.tsx
git commit -m "$(cat <<'EOF'
Wire bullet-rewrite AI action into the Workstation editor

Cursor-scoped "Rewrite with AI" toolbar button in BulletsField calls
the existing /ai/rewrite-bullet endpoint; result is an explicit
accept/discard suggestion, never a silent overwrite.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

- [ ] Run `php artisan test` — full suite green.
- [ ] Run `npm run test:js` — full suite green.
- [ ] Run `./vendor/bin/pint` on touched PHP files.
- [ ] Run `npx tsc --noEmit` — no errors.
- [ ] Manual pass in the running app: bullet rewrite (Task 6 Step 8) and Coach tab (Task 5 Step 5) both actually exercised, not just tested.
