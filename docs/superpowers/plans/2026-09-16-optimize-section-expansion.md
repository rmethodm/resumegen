# Optimize Section Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four free deterministic checks + a credit-metered, 5-preset AI critique to the Workstation's Optimize tab, all in one panel (no new tab).

**Architecture:** Four pure TypeScript check functions render as a checklist card with static guidance dialogs (no backend). A single `AiService::reviewResume()` method (already exists, orphaned) gains a `$preset` parameter; a new `ResumeController::aiReview` action gates it with the existing `AiUsageLimiter`/`AiCreditService` credit system (same convention as `QaBankEntryController::draft`), caches the result on the resume, and a new `ai-critique-panel.tsx` renders locked/unlocked/results states.

**Tech Stack:** Laravel 13 / PHP 8.5, `openai-php/laravel`, Pest; React 19 / TypeScript, Inertia v3, Vitest, shadcn/ui (`Card`, `Badge`, `Dialog`, `Select`).

**Spec:** `docs/superpowers/specs/2026-09-16-optimize-section-expansion-design.md`

## Global Constraints

- Credit cost for the AI critique: **3 credits** per run (from the spec).
- Gate: `subscribed('default')` + balance ≥ cost + not `ai_blocked` → 402 (not subscribed/insufficient) or 429 (`ai_blocked`) — exact convention already live in `App\Services\AiUsageLimiter::refusalStatus()` and used by `QaBankEntryController::draft`. Do not invent a new gating mechanism.
- Presets: `general`, `tailor_jd`, `concise`, `leadership`, `quantify`. `tailor_jd` requires a non-empty `target_job_description` on the resume.
- No per-bullet AI rewrite, no AI gap-fill, no separate "fit verdict", no new "Coach" tab — everything lives in the existing Optimize tab (`WORKSTATION_TABS = ['Edit', 'Optimize']` stays unchanged).
- Never auto-trigger the AI critique on edits — explicit "Run"/"Re-run" only.
- Match existing codebase conventions exactly where a precedent exists: `ExportCheck`-shaped check objects (`resources/js/lib/export-checklist.ts`), `onJump: (check) => void` prop pattern (`score-coach.tsx`, `export-checklist-modal.tsx`), inline ownership checks (no `ResumePolicy`), plain `fetch()` + CSRF meta tag for non-Inertia POSTs (`inspector-fields.tsx`'s `UrlField`).
- Run `./vendor/bin/pint` on touched PHP files before considering a task done.

---

### Task 1: Backend — `ai_review_preset` column + `AiService::reviewResume` presets

**Files:**
- Create: `database/migrations/2026_09_16_120000_add_ai_review_preset_to_resumes_table.php`
- Modify: `app/Services/AiService.php` (existing `reviewResume` method, currently lines 141-228)
- Test: `tests/Unit/AiServiceReviewPresetTest.php`

**Interfaces:**
- Consumes: nothing new — `app/Services/AiService.php` already has `OpenAI::chat()->create()`, `costMicroCents()`.
- Produces: `AiService::reviewResume(User $user, array $resumeData, ?string $jd, string $preset = 'general'): array{suggestions: array, prompt_tokens: int, completion_tokens: int, ai_request_id: int}` (adds `ai_request_id` to the existing return shape so callers can link credit spend to the request, matching `rewriteSection`'s and `draftQaAnswer`'s return shape). Throws `InvalidArgumentException` for an unknown preset.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Unit;

use App\Models\Resume;
use App\Models\User;
use App\Services\AiService;
use InvalidArgumentException;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiServiceReviewPresetTest extends TestCase
{
    use RefreshDatabase;

    private function fakeReviewResponse(): void
    {
        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => '{"suggestions":[{"id":"s1","label":"Tighten the summary","severity":"medium","section":"summary","detail":"Cut it to two sentences."}]}']],
                ],
                'usage' => ['prompt_tokens' => 50, 'completion_tokens' => 20],
            ]),
        ]);
    }

    public function test_general_preset_ignores_jd_even_when_present(): void
    {
        $user = User::factory()->create();
        $this->fakeReviewResponse();

        $result = app(AiService::class)->reviewResume($user, ['summary' => 'x'], 'Senior PHP Engineer', 'general');

        $sentPrompt = OpenAI::chat()->create->getArgs()[0]['messages'][0]['content'] ?? '';
        $this->assertStringNotContainsString('Senior PHP Engineer', $sentPrompt);
        $this->assertSame('s1', $result['suggestions'][0]['id']);
        $this->assertArrayHasKey('ai_request_id', $result);
    }

    public function test_tailor_jd_preset_includes_jd_in_prompt(): void
    {
        $user = User::factory()->create();
        $this->fakeReviewResponse();

        app(AiService::class)->reviewResume($user, ['summary' => 'x'], 'Senior PHP Engineer', 'tailor_jd');

        $sentPrompt = OpenAI::chat()->create->getArgs()[0]['messages'][0]['content'] ?? '';
        $this->assertStringContainsString('Senior PHP Engineer', $sentPrompt);
    }

    public function test_unknown_preset_throws(): void
    {
        $user = User::factory()->create();

        $this->expectException(InvalidArgumentException::class);

        app(AiService::class)->reviewResume($user, ['summary' => 'x'], null, 'not-a-real-preset');
    }

    public function test_logs_ai_request_with_resume_review_feature(): void
    {
        $user = User::factory()->create();
        $this->fakeReviewResponse();

        app(AiService::class)->reviewResume($user, ['summary' => 'x'], null, 'general');

        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'resume_review',
            'model' => 'gpt-4o',
        ]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Unit/AiServiceReviewPresetTest.php`
Expected: FAIL — `reviewResume()` doesn't accept a 4th `$preset` argument yet (TypeError or "too many arguments" style failure), and `OpenAI::chat()->create->getArgs()` assertion style may need adjusting once you see the real fake API — if the fake client doesn't expose `getArgs()` this way, replace those two assertions with `OpenAI::chat()->create()->assertSent(...)`-style calls per the version of `openai-php/laravel`'s testing helpers actually installed (check `vendor/openai-php/client/src/Testing` for the exact fake API before finalizing this step — the test's *intent*, not this exact call, is load-bearing: assert the JD text is/isn't in the sent prompt).

- [ ] **Step 3: Implement**

In `app/Services/AiService.php`, add near the top of the class (after `private const REVIEW_MODEL = 'gpt-4o';`):

```php
private const REVIEW_PRESETS = ['general', 'tailor_jd', 'concise', 'leadership', 'quantify'];

/**
 * @var array<string, string>
 */
private const PRESET_INSTRUCTIONS = [
    'general' => 'Give a broad, prioritized critique covering clarity, impact, and completeness.',
    'tailor_jd' => 'Focus specifically on how well the resume matches the target job description below — flag every meaningful gap between the resume and what it asks for.',
    'concise' => 'Focus on trimming wordiness — flag redundant phrases, filler words, and bullets that could say the same thing in fewer words.',
    'leadership' => 'Focus on leadership and ownership — flag bullets that undersell initiative, decision-making, or team impact, and suggest how to reframe them.',
    'quantify' => 'Focus on quantification — flag every bullet lacking a number, percentage, or measurable outcome, and suggest what metric could be added.',
];
```

Replace the existing `reviewResume` method signature and body:

```php
    /**
     * @param  array<string, mixed>  $resumeData
     * @return array{suggestions: array<int, array<string, mixed>>, prompt_tokens: int, completion_tokens: int, ai_request_id: int}
     */
    public function reviewResume(User $user, array $resumeData, ?string $jd, string $preset = 'general'): array
    {
        if (! in_array($preset, self::REVIEW_PRESETS, true)) {
            throw new \InvalidArgumentException("Unknown review preset: {$preset}");
        }

        // 'general' means a broad pass regardless of a pasted JD; only
        // 'tailor_jd' (and any future JD-aware preset) factors it in.
        $effectiveJd = $preset === 'tailor_jd' ? $jd : null;

        $response = OpenAI::chat()->create([
            'model' => self::REVIEW_MODEL,
            'messages' => [
                ['role' => 'user', 'content' => $this->buildReviewPrompt($resumeData, $effectiveJd, $preset)],
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

        $aiRequest = $user->aiRequests()->create([
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
            'ai_request_id' => $aiRequest->id,
        ];
    }

    /**
     * @param  array<string, mixed>  $resumeData
     */
    private function buildReviewPrompt(array $resumeData, ?string $jd, string $preset): string
    {
        $resumeJson = json_encode($resumeData, JSON_PRETTY_PRINT);
        $prompt = 'You are a resume reviewer. Read the resume below and return a '
            .'prioritized list of concrete improvement suggestions. Each suggestion '
            .'needs an id (short slug), a label (one short sentence), a severity '
            .'(high, medium, or low), a section it applies to (contact, summary, '
            .'experience, skills, or education), and a detail (one to two sentences '
            ."explaining why and how to fix it). Be specific, reference actual content \n"
            ."from the resume, and do not invent facts.\n\n"
            .self::PRESET_INSTRUCTIONS[$preset]."\n\nResume:\n{$resumeJson}";

        if ($jd !== null && trim($jd) !== '') {
            $prompt .= "\n\nTailor the review against this target job description — "
                ."flag gaps between the resume and what it asks for:\n{$jd}";
        }

        return $prompt;
    }
```

Remove the old `buildReviewPrompt(array $resumeData, ?string $jd)` (2-argument) method entirely — it's replaced by the 3-argument version above.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Unit/AiServiceReviewPresetTest.php`
Expected: PASS. If the fake-client assertion style from Step 2 needed adjusting, confirm it now actually distinguishes "JD present in sent prompt" vs "JD absent" — that's the behavior under test, not the exact assertion syntax.

- [ ] **Step 5: Migration for `ai_review_preset`**

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
            $table->string('ai_review_preset')->nullable()->after('ai_review_generated_at');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn('ai_review_preset');
        });
    }
};
```

Run: `php artisan migrate`
Expected: migration applies cleanly.

- [ ] **Step 6: Run the full test suite for this task's area, then Pint**

Run: `php artisan test tests/Unit/AiServiceReviewPresetTest.php tests/Unit/AiServiceCostTest.php && ./vendor/bin/pint app/Services/AiService.php database/migrations/2026_09_16_120000_add_ai_review_preset_to_resumes_table.php`
Expected: all PASS, Pint clean (no diff).

- [ ] **Step 7: Commit**

```bash
git add app/Services/AiService.php database/migrations/2026_09_16_120000_add_ai_review_preset_to_resumes_table.php tests/Unit/AiServiceReviewPresetTest.php
git commit -m "feat: add preset support to AiService::reviewResume"
```

---

### Task 2: Backend — `ResumeController::aiReview` endpoint + route + cost config

**Files:**
- Modify: `app/Http/Controllers/ResumeController.php` (add a new public action; imports)
- Modify: `config/ai.php`
- Modify: `routes/web.php` (near line 123, alongside `resumes.download-docx` / `resumes.duplicate`)
- Modify: `app/Models/Resume.php` (`aiReviewPresetLabel` not needed — no model change beyond what Task 1's migration already gives via `casts()`, which already has `ai_review`/`ai_review_generated_at`; `ai_review_preset` needs no cast, plain string)
- Test: `tests/Feature/ResumeAiReviewTest.php`

**Interfaces:**
- Consumes: `AiService::reviewResume(User, array, ?string, string): array{suggestions, prompt_tokens, completion_tokens, ai_request_id}` (Task 1). `AiUsageLimiter::refusalStatus(User, int): ?int` (existing). `AiCreditService::spend(User, int, string, ?int)` and `::balance(User): int` (existing). `App\Support\ResumeDocument::toArray(Resume): array` (existing, already used elsewhere in this controller).
- Produces: `POST /resumes/{resume}/ai-review` (route name `resumes.ai-review`), request body `{ preset: string }`, success JSON `{ suggestions: array, generated_at: string, preset: string, credits_remaining: int }`; 402/422/429/500 error JSON `{ message: string }`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Laravel\Facades\OpenAI;
use OpenAI\Responses\Chat\CreateResponse;
use Tests\Concerns\CreatesCashierSubscription;
use Tests\TestCase;

class ResumeAiReviewTest extends TestCase
{
    use CreatesCashierSubscription;
    use RefreshDatabase;

    private function subscribedUserWithCredits(int $credits = 5): User
    {
        $user = User::factory()->create();
        $this->subscribeUser($user);
        app(AiCreditService::class)->grant($user, $credits, 'admin');

        return $user;
    }

    private function fakeReviewResponse(): void
    {
        OpenAI::fake([
            CreateResponse::fake([
                'choices' => [
                    ['message' => ['role' => 'assistant', 'content' => '{"suggestions":[{"id":"s1","label":"Tighten the summary","severity":"medium","section":"summary","detail":"Cut it to two sentences."}]}']],
                ],
                'usage' => ['prompt_tokens' => 50, 'completion_tokens' => 20],
            ]),
        ]);
    }

    public function test_unsubscribed_user_gets_402(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'general'])
            ->assertStatus(402)
            ->assertJson(['message' => 'Subscription or AI credits required.']);
    }

    public function test_ai_blocked_user_gets_429(): void
    {
        $user = $this->subscribedUserWithCredits();
        $user->forceFill(['ai_blocked' => true])->save();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'general'])
            ->assertStatus(429);
    }

    public function test_tailor_jd_without_a_jd_is_rejected(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create(['target_job_description' => '']);

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'tailor_jd'])
            ->assertStatus(422);
    }

    public function test_successful_review_spends_credits_and_caches_result(): void
    {
        $user = $this->subscribedUserWithCredits(5);
        $resume = Resume::factory()->for($user)->create();
        $this->fakeReviewResponse();

        $response = $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'general']);

        $response->assertOk()->assertJsonPath('suggestions.0.id', 's1');
        $this->assertSame(2, app(AiCreditService::class)->balance($user));

        $resume->refresh();
        $this->assertSame('s1', $resume->ai_review[0]['id']);
        $this->assertNotNull($resume->ai_review_generated_at);
        $this->assertSame('general', $resume->ai_review_preset);
    }

    public function test_non_owner_gets_404(): void
    {
        $owner = $this->subscribedUserWithCredits();
        $intruder = User::factory()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($intruder)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'general'])
            ->assertNotFound();
    }

    public function test_invalid_preset_is_rejected(): void
    {
        $user = $this->subscribedUserWithCredits();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->postJson(route('resumes.ai-review', $resume), ['preset' => 'not-a-preset'])
            ->assertStatus(422);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/ResumeAiReviewTest.php`
Expected: FAIL — route `resumes.ai-review` does not exist yet.

- [ ] **Step 3: Add the cost config**

In `config/ai.php`, change:

```php
    'costs' => [
        'qa_bank_draft' => 1,
    ],
```

to:

```php
    'costs' => [
        'qa_bank_draft' => 1,
        'resume_review' => 3,
    ],
```

- [ ] **Step 4: Add the controller action**

In `app/Http/Controllers/ResumeController.php`, add to the `use` imports at the top:

```php
use App\Services\AiCreditService;
use App\Services\AiService;
use App\Services\AiUsageLimiter;
use Illuminate\Http\JsonResponse;
use Throwable;
```

Add this method (placed after `downloadDocx`, before the `private function render(...)`):

```php
    public function aiReview(Request $request, Resume $resume, AiService $ai, AiUsageLimiter $limiter, AiCreditService $credits): JsonResponse
    {
        $user = $request->user();

        abort_unless($resume->user_id === $user->id, 404);

        $validated = $request->validate([
            'preset' => 'required|string|in:general,tailor_jd,concise,leadership,quantify',
        ]);
        $preset = $validated['preset'];

        if ($preset === 'tailor_jd' && trim((string) $resume->target_job_description) === '') {
            return response()->json(['message' => 'Paste a job description first.'], 422);
        }

        $cost = (int) config('ai.costs.resume_review');

        if ($status = $limiter->refusalStatus($user, $cost)) {
            $message = $status === 429 ? 'AI access is blocked.' : 'Subscription or AI credits required.';

            return response()->json(['message' => $message], $status);
        }

        try {
            $result = $ai->reviewResume($user, ResumeDocument::toArray($resume), $resume->target_job_description, $preset);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'AI review failed.'], 500);
        }

        $credits->spend($user, $cost, 'resume_review', $result['ai_request_id']);

        $resume->ai_review = $result['suggestions'];
        $resume->ai_review_generated_at = now();
        $resume->ai_review_preset = $preset;
        $resume->save();

        return response()->json([
            'suggestions' => $result['suggestions'],
            'generated_at' => $resume->ai_review_generated_at->toIso8601String(),
            'preset' => $preset,
            'credits_remaining' => $credits->balance($user),
        ]);
    }
```

- [ ] **Step 5: Add the route**

In `routes/web.php`, after the `resumes.download-docx` line (around line 123):

```php
    Route::post('/resumes/{resume}/ai-review', [ResumeController::class, 'aiReview'])
        ->middleware('throttle:20,1')
        ->name('resumes.ai-review');
```

- [ ] **Step 6: Run test to verify it passes**

Run: `php artisan test tests/Feature/ResumeAiReviewTest.php`
Expected: PASS, all 6 tests.

- [ ] **Step 7: Update `ResumeController::render()` to expose the preset**

At line ~326 (`$document['ai_review_generated_at'] = ...`), add directly after it:

```php
        $document['ai_review_preset'] = $resume->ai_review_preset;
```

- [ ] **Step 8: Run the full backend suite for touched files, then Pint**

Run: `php artisan test tests/Feature/ResumeAiReviewTest.php tests/Feature/ResumeAiReviewCacheTest.php tests/Feature/QaBankEntryTest.php && ./vendor/bin/pint app/Http/Controllers/ResumeController.php config/ai.php routes/web.php`
Expected: all PASS, Pint clean.

- [ ] **Step 9: Commit**

```bash
git add app/Http/Controllers/ResumeController.php config/ai.php routes/web.php tests/Feature/ResumeAiReviewTest.php
git commit -m "feat: add credit-metered AI resume review endpoint"
```

---

### Task 3: Frontend types — `AiReviewPreset`, `Resume.ai_review*` fields

**Files:**
- Modify: `resources/js/types/resume.ts`

**Interfaces:**
- Produces: `export type AiReviewPreset = 'general' | 'tailor_jd' | 'concise' | 'leadership' | 'quantify';` and `Resume` (and therefore `ResumeDraft`) formally carrying `ai_review?`, `ai_review_generated_at?`, `ai_review_preset?`.

- [ ] **Step 1: Edit the type file**

In `resources/js/types/resume.ts`, replace:

```ts
export type AiReviewSeverity = 'high' | 'medium' | 'low';

export type AiReviewSuggestion = {
    id: string;
    label: string;
    severity: AiReviewSeverity;
    section: 'contact' | 'summary' | 'experience' | 'skills' | 'education';
    detail: string;
};

/**
 * Document payload plus concurrency token. `updated_at` is server-owned and
 * not written by ResumeDocument; it rides on the Inertia page for C11.
 */
export type ResumePageDocument = Resume & {
    updated_at?: string | null;
    ai_review?: AiReviewSuggestion[] | null;
    ai_review_generated_at?: string | null;
};
```

with:

```ts
export type AiReviewSeverity = 'high' | 'medium' | 'low';

export type AiReviewPreset =
    | 'general'
    | 'tailor_jd'
    | 'concise'
    | 'leadership'
    | 'quantify';

export type AiReviewSuggestion = {
    id: string;
    label: string;
    severity: AiReviewSeverity;
    section: 'contact' | 'summary' | 'experience' | 'skills' | 'education';
    detail: string;
};

/**
 * Document payload plus concurrency token. `updated_at` is server-owned and
 * not written by ResumeDocument; it rides on the Inertia page for C11.
 */
export type ResumePageDocument = Resume & {
    updated_at?: string | null;
};
```

Then, in the same file, find the `Resume` type definition (starts `export type Resume = {` near line 55) and add these three fields directly after `target_job_description: string;`:

```ts
    /** Cached AI critique — regenerated explicitly, never auto-triggered. */
    ai_review?: import('./resume').AiReviewSuggestion[] | null;
    ai_review_generated_at?: string | null;
    ai_review_preset?: AiReviewPreset | null;
```

Since `AiReviewSuggestion` is declared later in the same file (after `Resume`), use a plain forward reference instead of the `import('./resume')` workaround — TypeScript allows referencing a type declared later in the same module, so just write:

```ts
    ai_review?: AiReviewSuggestion[] | null;
    ai_review_generated_at?: string | null;
    ai_review_preset?: AiReviewPreset | null;
```

directly after `target_job_description: string;` in the `Resume` type (remove the `import('./resume')` version above — that line was a self-correction, not two separate edits).

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no new errors. (`ResumePageDocument`'s two removed fields are now inherited from `Resume`, so any existing usage like `resume.ai_review` in `ResumeController`-fed props still type-checks.)

- [ ] **Step 3: Commit**

```bash
git add resources/js/types/resume.ts
git commit -m "feat: add AiReviewPreset and ai_review fields to Resume type"
```

---

### Task 4: Frontend — four free deterministic checks

**Files:**
- Create: `resources/js/lib/optimize-checks.ts`
- Test: `resources/js/lib/optimize-checks.test.ts`

**Interfaces:**
- Consumes: `ResumeDraft` (has `template: ResumeTemplateKey`, `experiences: ResumeExperience[]` where `ResumeExperience.bullets: string[]`).
- Produces: `export type OptimizeCheck = { id: string; label: string; severity: 'error' | 'warn' | 'ok'; section?: ResumeSectionKey; detail: string };` (same shape family as `ExportCheck` in `resources/js/lib/export-checklist.ts`, plus a `detail` field for the guidance dialog body) and four functions: `atsParseabilityCheck`, `weakLanguageCheck`, `quantificationCheck`, `readabilityCheck`, each `(draft: ResumeDraft) => OptimizeCheck[]`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
    atsParseabilityCheck,
    quantificationCheck,
    readabilityCheck,
    weakLanguageCheck,
} from './optimize-checks';
import type { ResumeDraft } from '@/types';

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 't',
        target_role: '',
        target_company: '',
        target_job_description: '',
        full_name: '',
        headline: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
        summary: '',
        template: 'ats-plain',
        font: 'inter',
        density: 'balanced',
        skills_layout: 'bullets',
        bullet_style: 'bullet',
        section_order: [],
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        ...overrides,
    } as ResumeDraft;
}

describe('atsParseabilityCheck', () => {
    it('passes for the ats-plain template', () => {
        const result = atsParseabilityCheck(draft({ template: 'ats-plain' }));
        expect(result[0].severity).toBe('ok');
    });

    it('warns for a non-ats-plain template', () => {
        const result = atsParseabilityCheck(draft({ template: 'modern' }));
        expect(result[0].severity).toBe('warn');
    });
});

describe('weakLanguageCheck', () => {
    it('flags a bullet using a weak opener', () => {
        const result = weakLanguageCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Responsible for the payments team'],
                    },
                ],
            }),
        );
        expect(result.some((c) => c.severity === 'warn')).toBe(true);
    });

    it('passes when no weak language is present', () => {
        const result = weakLanguageCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Led the payments team rewrite'],
                    },
                ],
            }),
        );
        expect(result.every((c) => c.severity === 'ok')).toBe(true);
    });
});

describe('quantificationCheck', () => {
    it('flags a bullet with no number or metric', () => {
        const result = quantificationCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Increased sales'],
                    },
                ],
            }),
        );
        expect(result.some((c) => c.severity === 'warn')).toBe(true);
    });

    it('passes a bullet with a percentage', () => {
        const result = quantificationCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Increased sales 23%'],
                    },
                ],
            }),
        );
        expect(result.every((c) => c.severity === 'ok')).toBe(true);
    });
});

describe('readabilityCheck', () => {
    it('flags a bullet that is too long', () => {
        const longBullet = 'Word '.repeat(60).trim();
        const result = readabilityCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: [longBullet],
                    },
                ],
            }),
        );
        expect(result.some((c) => c.severity === 'warn')).toBe(true);
    });

    it('passes a reasonably sized bullet', () => {
        const result = readabilityCheck(
            draft({
                experiences: [
                    {
                        title: 'Engineer',
                        company: 'Acme',
                        start_date: '',
                        end_date: '',
                        is_current: false,
                        bullets: ['Led the payments team rewrite, cutting checkout latency 40%'],
                    },
                ],
            }),
        );
        expect(result.every((c) => c.severity === 'ok')).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:js -- optimize-checks`
Expected: FAIL — `./optimize-checks` module doesn't exist.

- [ ] **Step 3: Implement**

```ts
import type { ResumeDraft, ResumeSectionKey } from '@/types';

export type OptimizeCheck = {
    id: string;
    label: string;
    severity: 'error' | 'warn' | 'ok';
    section?: ResumeSectionKey;
    detail: string;
};

const WEAK_PHRASES = [
    'responsible for',
    'helped with',
    'worked on',
    'assisted with',
    'duties included',
    'tasked with',
];

function allBullets(draft: ResumeDraft): string[] {
    return draft.experiences.flatMap((exp) =>
        (exp.bullets ?? []).filter((b) => b.trim() !== ''),
    );
}

/**
 * Flags templates other than 'ats-plain' as carrying more ATS-parsing risk.
 * Single check, not per-bullet — the whole resume shares one template.
 */
export function atsParseabilityCheck(draft: ResumeDraft): OptimizeCheck[] {
    if (draft.template === 'ats-plain') {
        return [
            {
                id: 'ats-template',
                label: 'Template parses cleanly for ATS',
                severity: 'ok',
                detail: 'The ATS Plain template avoids columns, tables, and graphics that can confuse ATS parsers.',
            },
        ];
    }

    return [
        {
            id: 'ats-template',
            label: 'Template may carry ATS-parsing risk',
            severity: 'warn',
            detail: 'This template is not the ATS Plain template. Multi-column and graphical layouts can be misread by some applicant tracking systems — switch to ATS Plain if you plan to apply through an ATS-heavy pipeline.',
        },
    ];
}

/** Flags bullets opening with a weak, non-committal phrase. */
export function weakLanguageCheck(draft: ResumeDraft): OptimizeCheck[] {
    const bullets = allBullets(draft);

    if (bullets.length === 0) {
        return [];
    }

    const flagged = bullets.filter((bullet) => {
        const lower = bullet.toLowerCase();
        return WEAK_PHRASES.some((phrase) => lower.includes(phrase));
    });

    if (flagged.length === 0) {
        return [
            {
                id: 'weak-language',
                label: 'No weak language detected',
                severity: 'ok',
                detail: 'Bullets avoid passive, non-committal openers like "responsible for" or "helped with".',
            },
        ];
    }

    return [
        {
            id: 'weak-language',
            label: `${flagged.length} bullet${flagged.length === 1 ? '' : 's'} use weak language`,
            severity: 'warn',
            section: 'experience',
            detail: 'Phrases like "responsible for" or "helped with" undersell your role. Lead with a strong action verb that names what you actually did (Led, Built, Reduced, Negotiated).',
        },
    ];
}

/** Flags bullets that contain no digit, %, or currency symbol. */
export function quantificationCheck(draft: ResumeDraft): OptimizeCheck[] {
    const bullets = allBullets(draft);

    if (bullets.length === 0) {
        return [];
    }

    const hasMetric = /[0-9%$€£]/;
    const flagged = bullets.filter((bullet) => !hasMetric.test(bullet));

    if (flagged.length === 0) {
        return [
            {
                id: 'quantification',
                label: 'Bullets are quantified',
                severity: 'ok',
                detail: 'Every bullet includes a number, percentage, or currency amount.',
            },
        ];
    }

    return [
        {
            id: 'quantification',
            label: `${flagged.length} bullet${flagged.length === 1 ? '' : 's'} lack a number`,
            severity: 'warn',
            section: 'experience',
            detail: 'Bullets with no number read as vague. Where possible, add a metric — team size, percentage improvement, dollar amount, or count — even an estimate is stronger than none.',
        },
    ];
}

const MIN_BULLET_WORDS = 4;
const MAX_BULLET_WORDS = 40;

/** Flags bullets that are too short or too long to read well. */
export function readabilityCheck(draft: ResumeDraft): OptimizeCheck[] {
    const bullets = allBullets(draft);

    if (bullets.length === 0) {
        return [];
    }

    const flagged = bullets.filter((bullet) => {
        const words = bullet.trim().split(/\s+/).filter(Boolean).length;
        return words < MIN_BULLET_WORDS || words > MAX_BULLET_WORDS;
    });

    if (flagged.length === 0) {
        return [
            {
                id: 'readability',
                label: 'Bullet lengths look good',
                severity: 'ok',
                detail: 'Bullets are neither too terse nor too long to scan quickly.',
            },
        ];
    }

    return [
        {
            id: 'readability',
            label: `${flagged.length} bullet${flagged.length === 1 ? '' : 's'} may be hard to scan`,
            severity: 'warn',
            section: 'experience',
            detail: `A bullet under ${MIN_BULLET_WORDS} words reads as a fragment; one over ${MAX_BULLET_WORDS} words is hard to scan. Aim for one clear sentence.`,
        },
    ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:js -- optimize-checks`
Expected: PASS, all 8 tests.

- [ ] **Step 5: Commit**

```bash
git add resources/js/lib/optimize-checks.ts resources/js/lib/optimize-checks.test.ts
git commit -m "feat: add four free Optimize deterministic checks"
```

---

### Task 5: Frontend — `optimize-checklist.tsx` (checklist cards + guidance dialogs)

**Files:**
- Create: `resources/js/Components/workstation/optimize-checklist.tsx`
- Test: `resources/js/Components/workstation/optimize-checklist.test.tsx`

**Interfaces:**
- Consumes: `OptimizeCheck`, `atsParseabilityCheck`, `weakLanguageCheck`, `quantificationCheck`, `readabilityCheck` (Task 4). `Card`/`Badge` and `Dialog`/`DialogTrigger`/`DialogContent`/`DialogHeader`/`DialogTitle` from `resources/js/Components/ui/dialog.tsx` (confirmed exports, Radix-based, `DialogTrigger asChild` wraps a real button).
- Produces: `export function OptimizeChecklist({ draft, onJump }: { draft: ResumeDraft; onJump: (section: ResumeSectionKey) => void }): JSX.Element`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptimizeChecklist } from './optimize-checklist';
import type { ResumeDraft } from '@/types';

function draft(overrides: Partial<ResumeDraft> = {}): ResumeDraft {
    return {
        title: 't',
        target_role: '',
        target_company: '',
        target_job_description: '',
        full_name: '',
        headline: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        website: '',
        summary: '',
        template: 'ats-plain',
        font: 'inter',
        density: 'balanced',
        skills_layout: 'bullets',
        bullet_style: 'bullet',
        section_order: [],
        experiences: [],
        projects: [],
        education: [],
        certificates: [],
        skills: [],
        ...overrides,
    } as ResumeDraft;
}

describe('OptimizeChecklist', () => {
    it('renders all four checks', () => {
        render(<OptimizeChecklist draft={draft()} onJump={vi.fn()} />);
        expect(screen.getByText(/parses cleanly|ATS-parsing risk/)).toBeInTheDocument();
    });

    it('calls onJump with the check section when a flagged check is clicked', () => {
        const onJump = vi.fn();
        render(
            <OptimizeChecklist
                draft={draft({
                    experiences: [
                        {
                            title: 'Engineer',
                            company: 'Acme',
                            start_date: '',
                            end_date: '',
                            is_current: false,
                            bullets: ['Responsible for sales'],
                        },
                    ],
                })}
                onJump={onJump}
            />,
        );

        fireEvent.click(screen.getByText(/weak language/i));
        expect(onJump).toHaveBeenCalledWith('experience');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:js -- optimize-checklist`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```tsx
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import {
    atsParseabilityCheck,
    quantificationCheck,
    readabilityCheck,
    weakLanguageCheck,
    type OptimizeCheck,
} from '@/lib/optimize-checks';
import { Badge } from '@/Components/ui/badge';
import { Card } from '@/Components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/Components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ResumeDraft, ResumeSectionKey } from '@/types';

function severityBadge(severity: OptimizeCheck['severity']) {
    if (severity === 'ok') {
        return <Badge variant="secondary">Pass</Badge>;
    }
    if (severity === 'warn') {
        return <Badge variant="outline">Review</Badge>;
    }
    return <Badge variant="destructive">Fix</Badge>;
}

function CheckRow({
    check,
    onJump,
}: {
    check: OptimizeCheck;
    onJump: (section: ResumeSectionKey) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-3 py-2">
            <button
                type="button"
                disabled={check.severity === 'ok' || !check.section}
                onClick={() => check.section && onJump(check.section)}
                className={cn(
                    'text-left text-sm',
                    check.severity !== 'ok' && check.section
                        ? 'text-foreground hover:underline'
                        : 'text-foreground',
                )}
            >
                {check.label}
            </button>
            <div className="flex items-center gap-2">
                {severityBadge(check.severity)}
                <Dialog>
                    <DialogTrigger asChild>
                        <button type="button" aria-label={`About: ${check.label}`}>
                            <InformationCircleIcon className="size-4 text-muted-foreground" />
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{check.label}</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">{check.detail}</p>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}

export function OptimizeChecklist({
    draft,
    onJump,
}: {
    draft: ResumeDraft;
    onJump: (section: ResumeSectionKey) => void;
}) {
    const checks = [
        ...atsParseabilityCheck(draft),
        ...weakLanguageCheck(draft),
        ...quantificationCheck(draft),
        ...readabilityCheck(draft),
    ];

    return (
        <Card className="gap-0 p-4">
            <h2 className="mb-2 text-sm font-bold text-foreground">
                Deeper checks
            </h2>
            <div className="divide-y divide-border">
                {checks.map((check) => (
                    <CheckRow key={check.id} check={check} onJump={onJump} />
                ))}
            </div>
        </Card>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:js -- optimize-checklist`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Components/workstation/optimize-checklist.tsx resources/js/Components/workstation/optimize-checklist.test.tsx
git commit -m "feat: add Optimize checklist UI with guidance dialogs"
```

---

### Task 6: Frontend — `ai-critique-panel.tsx` (locked state, presets, run, results)

**Files:**
- Create: `resources/js/Components/workstation/ai-critique-panel.tsx`
- Test: `resources/js/Components/workstation/ai-critique-panel.test.tsx`

**Interfaces:**
- Consumes: `AiReviewSuggestion`, `AiReviewPreset` (Task 3), `sortBySeverity` (`resources/js/lib/ai-review.ts`, already exists), `AiCredits` type (`resources/js/types/index.d.ts`), `Button`/`Card`/`Badge`, and `Select` from `resources/js/Components/ui/select.tsx` — confirmed to be a thin wrapper around a native `<select>` (`React.ComponentProps<'select'>`, renders whatever `<option>` children you give it — no `SelectContent`/`SelectItem`/`SelectTrigger`/`SelectValue` sub-components exist in this codebase; see `share-resume-modal.tsx` for a real usage: `<Select value={...} onChange={(e) => ...}><option value={...}>...</option></Select>`).
- Produces: `export function AiCritiquePanel({ resumeId, jd, initialSuggestions, initialGeneratedAt, initialPreset, credits, onJump }: {...}): JSX.Element`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiCritiquePanel } from './ai-critique-panel';

const baseProps = {
    resumeId: 1,
    jd: '',
    initialSuggestions: null,
    initialGeneratedAt: null,
    initialPreset: null,
    onJump: vi.fn(),
};

describe('AiCritiquePanel', () => {
    beforeEach(() => {
        document.head.innerHTML = '<meta name="csrf-token" content="test-token">';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows a locked state when not subscribed', () => {
        render(
            <AiCritiquePanel
                {...baseProps}
                credits={{ balance: 0, subscribed: false, canPurchase: false }}
            />,
        );
        expect(screen.getByText(/subscribe/i)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /run critique/i })).not.toBeInTheDocument();
    });

    it('shows the run button when subscribed with credits', () => {
        render(
            <AiCritiquePanel
                {...baseProps}
                credits={{ balance: 3, subscribed: true, canPurchase: true }}
            />,
        );
        expect(screen.getByRole('button', { name: /run critique/i })).toBeInTheDocument();
    });

    it('runs a critique and renders results grouped by severity', async () => {
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                suggestions: [
                    { id: 'a', label: 'High issue', severity: 'high', section: 'summary', detail: 'x' },
                    { id: 'b', label: 'Low issue', severity: 'low', section: 'skills', detail: 'y' },
                ],
                generated_at: '2026-09-16T00:00:00Z',
                preset: 'general',
                credits_remaining: 2,
            }),
        }) as unknown as typeof fetch;

        render(
            <AiCritiquePanel
                {...baseProps}
                credits={{ balance: 3, subscribed: true, canPurchase: true }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /run critique/i }));

        await waitFor(() => {
            expect(screen.getByText('High issue')).toBeInTheDocument();
        });
        expect(screen.getByText('Low issue')).toBeInTheDocument();
    });

    it('disables the Tailor to JD preset when no JD is pasted', () => {
        render(
            <AiCritiquePanel
                {...baseProps}
                jd=""
                credits={{ balance: 3, subscribed: true, canPurchase: true }}
            />,
        );
        const select = screen.getByLabelText(/preset/i);
        const tailorOption = Array.from(select.querySelectorAll('option')).find(
            (opt) => opt.textContent?.includes('Tailor to this JD'),
        );
        expect(tailorOption).toBeDisabled();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:js -- ai-critique-panel`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

```tsx
import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Select } from '@/Components/ui/select';
import { sortBySeverity } from '@/lib/ai-review';
import type { AiCredits, AiReviewPreset, AiReviewSuggestion, ResumeSectionKey } from '@/types';

const PRESET_LABELS: Record<AiReviewPreset, string> = {
    general: 'General critique',
    tailor_jd: 'Tailor to this JD',
    concise: 'Make more concise',
    leadership: 'Emphasize leadership impact',
    quantify: 'Strengthen quantification',
};

const CRITIQUE_COST = 3;

function severityBadgeVariant(severity: AiReviewSuggestion['severity']) {
    if (severity === 'high') return 'destructive' as const;
    if (severity === 'medium') return 'outline' as const;
    return 'secondary' as const;
}

export function AiCritiquePanel({
    resumeId,
    jd,
    initialSuggestions,
    initialGeneratedAt,
    initialPreset,
    credits,
    onJump,
}: {
    resumeId: number;
    jd: string;
    initialSuggestions: AiReviewSuggestion[] | null;
    initialGeneratedAt: string | null;
    initialPreset: AiReviewPreset | null;
    credits: AiCredits | null;
    onJump: (section: ResumeSectionKey) => void;
}) {
    const [preset, setPreset] = useState<AiReviewPreset>(initialPreset ?? 'general');
    const [suggestions, setSuggestions] = useState(initialSuggestions);
    const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const jdPasted = jd.trim() !== '';
    const locked = credits === null || !credits.subscribed || credits.balance < CRITIQUE_COST;

    async function runCritique() {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/resumes/${resumeId}/ai-review`, {
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
                body: JSON.stringify({ preset }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message ?? 'AI review failed.');

                return;
            }

            setSuggestions(data.suggestions);
            setGeneratedAt(data.generated_at);
        } catch {
            setError('AI review failed. Try again.');
        } finally {
            setLoading(false);
        }
    }

    if (locked) {
        return (
            <Card className="gap-2 border-dashed p-4">
                <h2 className="text-sm font-bold text-foreground">AI resume critique</h2>
                <p className="text-xs text-muted-foreground">
                    Subscribe to unlock a full AI critique of your resume ({CRITIQUE_COST} credits per run).
                </p>
                <Button asChild size="sm" className="w-fit">
                    <a href="/billing/checkout">Subscribe</a>
                </Button>
            </Card>
        );
    }

    return (
        <Card className="gap-3 p-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-foreground">AI resume critique</h2>
                {generatedAt && (
                    <span className="text-xs text-muted-foreground">
                        Last reviewed {new Date(generatedAt).toLocaleString()}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Select
                    aria-label="Preset"
                    className="w-56"
                    value={preset}
                    onChange={(e) => setPreset(e.target.value as AiReviewPreset)}
                >
                    {(Object.keys(PRESET_LABELS) as AiReviewPreset[]).map((key) => (
                        <option
                            key={key}
                            value={key}
                            disabled={key === 'tailor_jd' && !jdPasted}
                        >
                            {PRESET_LABELS[key]}
                        </option>
                    ))}
                </Select>
                <Button size="sm" disabled={loading} onClick={runCritique}>
                    {loading
                        ? 'Running…'
                        : suggestions
                          ? `Re-run (${CRITIQUE_COST} credits)`
                          : `Run critique (${CRITIQUE_COST} credits)`}
                </Button>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {suggestions && suggestions.length > 0 && (
                <ul className="flex flex-col gap-2">
                    {sortBySeverity(suggestions).map((s) => (
                        <li key={s.id} className="flex items-start gap-2">
                            <Badge variant={severityBadgeVariant(s.severity)}>
                                {s.severity}
                            </Badge>
                            <button
                                type="button"
                                onClick={() => onJump(s.section)}
                                className="text-left text-sm text-foreground hover:underline"
                            >
                                {s.label}
                                <span className="block text-xs text-muted-foreground">
                                    {s.detail}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:js -- ai-critique-panel`
Expected: PASS, all 4 tests.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Components/workstation/ai-critique-panel.tsx resources/js/Components/workstation/ai-critique-panel.test.tsx
git commit -m "feat: add AI critique panel with locked state and presets"
```

---

### Task 7: Wire both new components into Optimize

**Files:**
- Modify: `resources/js/Components/workstation/optimize-panel.tsx`
- Modify: `resources/js/Pages/Resumes/Workstation.tsx`

**Interfaces:**
- Consumes: `OptimizeChecklist` (Task 5), `AiCritiquePanel` (Task 6), `scrollToSection` (already defined in `Workstation.tsx`, signature `(target: ResumeSectionKey) => void`), `page.props.aiCredits` (`AiCredits | null`, already shared via Inertia).

- [ ] **Step 1: Add props to `OptimizePanel`**

In `resources/js/Components/workstation/optimize-panel.tsx`, change the function signature from:

```tsx
export function OptimizePanel({
    draft,
    onChange,
    children,
}: {
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
    children?: ReactNode;
}) {
```

to:

```tsx
export function OptimizePanel({
    draft,
    onChange,
    resumeId,
    aiCredits,
    onJump,
    children,
}: {
    draft: ResumeDraft;
    onChange: (draft: ResumeDraft) => void;
    resumeId: number;
    aiCredits: AiCredits | null;
    onJump: (section: ResumeSectionKey) => void;
    children?: ReactNode;
}) {
```

Add the two new imports at the top of the file:

```tsx
import { OptimizeChecklist } from '@/Components/workstation/optimize-checklist';
import { AiCritiquePanel } from '@/Components/workstation/ai-critique-panel';
```

and add `AiCredits`, `ResumeSectionKey` to the existing `import type { ... } from '@/types';` line in this file (check what's already imported there and extend it rather than adding a second import line).

- [ ] **Step 2: Render the two new sections**

Inside the returned JSX, directly after the closing `</Card>` of the existing JD/keyword-overlap card and before `{children}`, add:

```tsx
            <OptimizeChecklist draft={draft} onJump={onJump} />

            <AiCritiquePanel
                resumeId={resumeId}
                jd={jd}
                initialSuggestions={draft.ai_review ?? null}
                initialGeneratedAt={draft.ai_review_generated_at ?? null}
                initialPreset={draft.ai_review_preset ?? null}
                credits={aiCredits}
                onJump={onJump}
            />
```

(`jd` is already computed at the top of this component as `const jd = draft.target_job_description ?? '';` — reuse it, don't redeclare.)

- [ ] **Step 3: Pass the new props from `Workstation.tsx`**

In `resources/js/Pages/Resumes/Workstation.tsx`, change the `<OptimizePanel ... >` call (around line 721) from:

```tsx
                                        <OptimizePanel
                                            draft={draft}
                                            onChange={setDraft}
                                        >
```

to:

```tsx
                                        <OptimizePanel
                                            draft={draft}
                                            onChange={setDraft}
                                            resumeId={id}
                                            aiCredits={page.props.aiCredits as AiCredits | null}
                                            onJump={scrollToSection}
                                        >
```

Add `AiCredits` to the existing `import type { ... } from '@/types';` block at the top of the file (it currently imports `LinkedApplication, ResumeDraft, ResumePageDocument, ResumeSectionKey, ResumeShareLink, ResumeVersion, SkillLibraryGroup` — add `AiCredits` alphabetically to that list).

Note: `page` is already destructured as `const page = usePage();` near the top of the component (line 82) — if `PageProps` is already applied as a generic to `usePage<PageProps>()` elsewhere in this file, drop the `as AiCredits | null` cast and rely on that typing instead; check the actual `usePage()` call's generic before finalizing this line.

- [ ] **Step 4: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: no errors.

- [ ] **Step 5: Run full Vitest suite**

Run: `npm run test:js`
Expected: all PASS (no regressions in unrelated Workstation/optimize-panel tests, if any exist).

- [ ] **Step 6: Commit**

```bash
git add resources/js/Components/workstation/optimize-panel.tsx resources/js/Pages/Resumes/Workstation.tsx
git commit -m "feat: wire Optimize checklist and AI critique panel into Workstation"
```

---

### Task 8: Full verification (Pest, Pint, tsc, Vitest, live browser)

**Files:** none (verification only).

- [ ] **Step 1: Full backend suite**

Run: `composer run test`
Expected: 100% pass, no skips. If any pre-existing unrelated test fails, stop and investigate before claiming this task done (per this repo's Verification Policy — do not paper over a failure with "pre-existing").

- [ ] **Step 2: Pint across all touched PHP files**

Run: `./vendor/bin/pint app/Http/Controllers/ResumeController.php app/Services/AiService.php config/ai.php routes/web.php database/migrations`
Expected: clean, no diff.

- [ ] **Step 3: Full frontend suite**

Run: `npx tsc --noEmit && npm run test:js && npm run build`
Expected: all pass, clean build.

- [ ] **Step 4: Live browser verification — subscribed user**

Start the dev server (`composer run dev`), log in as (or create via tinker) a user with an active `default` Cashier subscription and ≥3 AI credits. Open a resume's Workstation, go to the Optimize tab:
- Confirm the four checklist cards render with real pass/warn states for that resume's actual content.
- Click an info icon → dialog opens with the explanation text.
- Click a flagged check's label → page scrolls to the right section.
- Paste a job description, confirm "Tailor to this JD" preset becomes selectable.
- Run "General critique" → loading state, then real suggestions render grouped by severity; "Last reviewed" timestamp appears.
- Click a suggestion → page scrolls to its section.
- Re-run with a different preset → new results replace the old ones; credit balance visibly decremented (check `/billing/portal` or wherever balance displays, or re-query via tinker `app(App\Services\AiCreditService::class)->balance($user)`).

- [ ] **Step 5: Live browser verification — non-subscribed user**

Log in as a user with no active subscription. Open Optimize:
- Confirm the four free checks still work fully (no lock, no credit spend).
- Confirm the AI critique card shows the locked/subscribe state, no "Run" button.
- Confirm no network POST to `/resumes/{id}/ai-review` fires from this state (check DevTools Network tab).

- [ ] **Step 6: Report**

Summarize what was verified live (not just tests) per this repo's Verification Policy, and note any deviations made from this plan during implementation (e.g. if the `Select`/`Dialog` component APIs required adjusting Tasks 5/6 as flagged in their steps).
