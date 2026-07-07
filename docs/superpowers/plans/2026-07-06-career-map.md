# Career Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Pro/Agency users click a button on the Resume Builder page and get 3 AI-suggested career-path directions (title, reasoning, skill gaps), reusing the existing one-shot AI infrastructure.

**Architecture:** A new tier gate (`UserLimits::canCareerMap`), a new prompt-builder branch (`AiPrompts::careerMap`), and one new controller action (`AiSuggestionController::careerMap`) that calls the existing shared `run()` helper — the same pattern `atsKeywords` and `rewriteBullet` already use. No new table, no caching. Frontend is one new collapsible panel on the Resume Builder sidebar, wired through the existing `useAiSuggestion` hook.

**Tech Stack:** Laravel 13 / PHP 8.4, PHPUnit, Inertia.js v2, React 18 + TypeScript, Tailwind CSS v3.

## Global Constraints

- No schema changes, no new table, no cache columns. Reuses `ai_requests` with `feature: 'career_map'`.
- No caching — every click regenerates and consumes one AI quota unit (unlike `summary`/`ats_keywords`, which pass a `$cacheKey` to `run()`; `career_map` passes none).
- Tier gate: `UserLimits::canCareerMap(User $user): bool` returns `in_array($user->planTier(), ['pro', 'agency'], true)`.
- 402 tier-gate response shape (checked before `run()` is called): `{ error: 'Career Map is a Pro feature.', required_tier: 'pro' }`.
- Route: `POST /builder/{resume}/ai/career-map` named `builder.ai.career-map`, grouped with the other `builder.ai.*` routes.
- `AiPrompts::build('career_map', ['experience' => ..., 'skills' => ...])` must return a prompt instructing the model to reply with a JSON array of exactly 3 objects shaped `{"title": ..., "reasoning": ..., "skill_gaps": [...]}`.
- **Deliberate small extension to the shared `run()` helper (Task 3):** today `run()`'s try/catch only wraps the OpenAI call, not the `$shape` callback. Career Map's malformed-JSON handling (spec: "let run()'s existing malformed-response path apply, 503, matching interview_coach's fallback") requires the shape callback to be able to trigger that same 503. Task 3 moves the `$shape($reply)` call inside the existing try/catch so a thrown exception from any shape callback is caught the same way a `Throwable` from the AI call already is. This is additive: `rewriteBullet`, `summary`, and `atsKeywords`'s shape callbacks never throw, so their behavior is provably unchanged — the existing `tests/Feature/AiSuggestionTest.php` suite must still pass unmodified after this change.
- Frontend tier gating is primarily client-side (a locked/upgrade CTA rendered instead of the panel's action, mirroring `canAiTailoring`'s existing pattern in `Edit.tsx`) — the server-side 402 is defense-in-depth, not the primary UX gate. On a 402, the existing `useAiSuggestion` hook already falls back to a generic `window.alert(data.error)` for non-quota 402 shapes (this is `ats_keywords`'s current behavior too) — no hook changes needed.

---

### Task 1: `UserLimits::canCareerMap` tier gate

**Files:**
- Modify: `app/Services/UserLimits.php` (add method after `canCareerCoach`, currently lines 53-56)
- Test: `tests/Unit/UserLimitsTest.php`

**Interfaces:**
- Produces: `UserLimits::canCareerMap(User $user): bool` — `true` for `pro`/`agency` tier, `false` otherwise. Consumed by Task 3's controller.

- [ ] **Step 1: Write the failing test**

Add to `tests/Unit/UserLimitsTest.php` (inside the existing test class, after `test_career_coach_gate_by_tier`):

```php
public function test_career_map_gate_by_tier(): void
{
    $this->assertFalse(UserLimits::canCareerMap(User::factory()->free()->create()));
    $this->assertFalse(UserLimits::canCareerMap(User::factory()->starter()->create()));
    $this->assertTrue(UserLimits::canCareerMap(User::factory()->pro()->create()));
    $this->assertTrue(UserLimits::canCareerMap(User::factory()->agency()->create()));
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --compact --filter=test_career_map_gate_by_tier`
Expected: FAIL — `Call to undefined method App\Services\UserLimits::canCareerMap()`

- [ ] **Step 3: Add the method**

In `app/Services/UserLimits.php`, add immediately after `canCareerCoach`:

```php
    public static function canCareerMap(User $user): bool
    {
        return in_array($user->planTier(), ['pro', 'agency'], true);
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --compact --filter=test_career_map_gate_by_tier`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add app/Services/UserLimits.php tests/Unit/UserLimitsTest.php
git commit -m "feat: add UserLimits::canCareerMap tier gate"
```

---

### Task 2: `AiPrompts::build('career_map', ...)` prompt builder

**Files:**
- Modify: `app/Data/AiPrompts.php` (add match arm in `build()`, currently lines 16-23; add new private method after `careerCoach`, currently ending line 149)
- Test: `tests/Unit/AiPromptsTest.php`

**Interfaces:**
- Consumes: none from other tasks.
- Produces: `AiPrompts::build('career_map', ['experience' => array<mixed>, 'skills' => array<mixed>]): string`. Consumed by Task 3's controller via `AiPrompts::build($feature, $input)` inside the shared `run()` helper.

- [ ] **Step 1: Write the failing tests**

Add to `tests/Unit/AiPromptsTest.php` (after `test_career_coach_handles_missing_resume`, before `test_unknown_feature_throws`):

```php
public function test_career_map_includes_experience_and_skills(): void
{
    $prompt = AiPrompts::build('career_map', [
        'experience' => [['title' => 'Backend Engineer', 'company' => 'Acme']],
        'skills' => ['PHP', 'Laravel'],
    ]);

    $this->assertStringContainsString('Backend Engineer', $prompt);
    $this->assertStringContainsString('PHP', $prompt);
    $this->assertStringContainsString('title', $prompt);
    $this->assertStringContainsString('reasoning', $prompt);
    $this->assertStringContainsString('skill_gaps', $prompt);
}

public function test_career_map_handles_empty_input(): void
{
    $prompt = AiPrompts::build('career_map', []);

    $this->assertStringContainsString('No experience listed', $prompt);
    $this->assertStringContainsString('No skills listed', $prompt);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact --filter=test_career_map`
Expected: FAIL — `test_career_map_includes_experience_and_skills` fails with `InvalidArgumentException: Unknown AI feature: career_map`

- [ ] **Step 3: Add the match arm**

In `app/Data/AiPrompts.php`, in the `build()` method's `match`, add after the `'career_coach'` arm (line 21):

```php
            'career_map' => self::careerMap($input),
```

- [ ] **Step 4: Add the `careerMap` method**

In `app/Data/AiPrompts.php`, add after the `careerCoach` method (after line 149):

```php
    /**
     * @param  array{experience?: array<mixed>, skills?: array<mixed>}  $input
     */
    private static function careerMap(array $input): string
    {
        $skills = implode(', ', array_slice($input['skills'] ?? [], 0, 15)) ?: 'No skills listed';

        $experienceLines = [];
        foreach (array_slice($input['experience'] ?? [], 0, 5) as $exp) {
            $line = implode(' at ', array_filter([$exp['title'] ?? null, $exp['company'] ?? null]));
            if ($line) {
                $experienceLines[] = $line;
            }
        }
        $experienceText = $experienceLines ? implode("\n", $experienceLines) : 'No experience listed';

        return <<<PROMPT
        You are a career-path advisor. Based strictly on the candidate's skills and experience below,
        suggest exactly 3 realistic career-path directions they could grow into next. Do not invent
        employers, titles, or skills they haven't demonstrated.

        Skills: {$skills}
        Experience:
        {$experienceText}

        Return a JSON array of exactly 3 objects with this shape:
        [{"title": "Engineering Manager", "reasoning": "...", "skill_gaps": ["...", "..."]}]

        Return ONLY the JSON array. No markdown fences, no explanation, no preamble.
        PROMPT;
    }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test --compact --filter=test_career_map`
Expected: PASS (2 tests)

- [ ] **Step 6: Run the full AiPromptsTest file to check for regressions**

Run: `php artisan test --compact tests/Unit/AiPromptsTest.php`
Expected: PASS (all tests)

- [ ] **Step 7: Commit**

```bash
git add app/Data/AiPrompts.php tests/Unit/AiPromptsTest.php
git commit -m "feat: add career_map prompt builder"
```

---

### Task 3: `AiSuggestionController::careerMap` + route + shared `run()` extension

**Files:**
- Modify: `app/Http/Controllers/AiSuggestionController.php`
- Modify: `routes/web.php` (add route next to `builder.ai.ats-keywords`, currently line 99)
- Test: `tests/Feature/CareerMapTest.php` (new)

**Interfaces:**
- Consumes: `UserLimits::canCareerMap()` (Task 1), `AiPrompts::build('career_map', ...)` (Task 2).
- Produces: `POST /builder/{resume}/ai/career-map` (route name `builder.ai.career-map`) → `{ paths: [{title, reasoning, skill_gaps}, ...3 total], remaining: int }` on success. Consumed by Task 4's frontend panel.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/CareerMapTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use OpenAI\Contracts\ClientContract;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse;
use OpenAI\Testing\ClientFake;
use Tests\TestCase;

class CareerMapTest extends TestCase
{
    use RefreshDatabase;

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

    private function fakeServiceFailure(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => false]]]),
            new \Exception('Simulated OpenAI outage'),
        ]));
    }

    private function samplePaths(): string
    {
        return json_encode([
            ['title' => 'Engineering Manager', 'reasoning' => 'Led two projects.', 'skill_gaps' => ['People management']],
            ['title' => 'Staff Engineer', 'reasoning' => 'Deep technical ownership.', 'skill_gaps' => ['System design']],
            ['title' => 'Solutions Architect', 'reasoning' => 'Cross-team scope.', 'skill_gaps' => ['Client communication']],
        ]);
    }

    public function test_free_user_gets_402(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(402)
            ->assertJson(['error' => 'Career Map is a Pro feature.', 'required_tier' => 'pro']);
    }

    public function test_starter_user_gets_402(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(402)
            ->assertJson(['error' => 'Career Map is a Pro feature.', 'required_tier' => 'pro']);
    }

    public function test_pro_user_gets_three_paths(): void
    {
        $this->fakeReply($this->samplePaths());
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create([
            'experience' => [['title' => 'Backend Engineer', 'company' => 'Acme']],
            'skills' => ['PHP', 'Laravel'],
        ]);

        $res = $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume));

        $res->assertOk();
        $res->assertJsonCount(3, 'paths');
        $res->assertJsonStructure(['paths' => [['title', 'reasoning', 'skill_gaps']], 'remaining']);
        $this->assertDatabaseHas('ai_requests', [
            'user_id' => $user->id,
            'feature' => 'career_map',
            'status' => 'success',
        ]);
    }

    public function test_quota_exhausted_returns_402(): void
    {
        config()->set('ai.monthly_limits.pro', 0);
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(402)
            ->assertJson(['can_upgrade' => false, 'next_tier' => null]);
    }

    public function test_moderation_rejection_returns_422(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(422);
    }

    public function test_ai_service_failure_returns_503(): void
    {
        $this->fakeServiceFailure();
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(503);
    }

    public function test_malformed_reply_returns_503(): void
    {
        $this->fakeReply('not valid json at all');
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.career-map', $resume))
            ->assertStatus(503);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/CareerMapTest.php`
Expected: FAIL — route `builder.ai.career-map` not defined

- [ ] **Step 3: Extend the shared `run()` helper to catch shape-callback exceptions**

In `app/Http/Controllers/AiSuggestionController.php`, replace the `run()` method body (currently lines 89-128):

```php
    private function run(User $user, string $feature, array $input, callable $shape, ?string $cacheKey = null): JsonResponse
    {
        if ($cacheKey && Cache::has($cacheKey)) {
            return response()->json(array_merge($shape(Cache::get($cacheKey)), [
                'remaining' => UserLimits::aiRemaining($user),
            ]));
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

        try {
            $reply = $this->ai->chat(
                AiPrompts::build($feature, $input),
                ['user' => $user, 'feature' => $feature],
            );

            $shaped = $shape($reply);
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        if ($cacheKey) {
            Cache::put($cacheKey, $reply, now()->addDay());
        }

        return response()->json(array_merge($shaped, [
            'remaining' => UserLimits::aiRemaining($user),
        ]));
    }
```

This is the only change to `run()`: the `$shape($reply)` call moves inside the try block so a thrown exception from any shape callback hits the same `catch (Throwable $e)` 503 path. `rewriteBullet`, `summary`, and `atsKeywords` pass shape callbacks that never throw, so this is behavior-preserving for them.

- [ ] **Step 4: Add the `careerMap` action and its shape helper**

In `app/Http/Controllers/AiSuggestionController.php`, add this method after `atsKeywords` (currently ending line 81):

```php
    public function careerMap(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $user = $request->user();

        if (! UserLimits::canCareerMap($user)) {
            return response()->json([
                'error' => 'Career Map is a Pro feature.',
                'required_tier' => 'pro',
            ], 402);
        }

        $input = [
            'experience' => $resume->experience ?? [],
            'skills' => $resume->skills ?? [],
        ];

        return $this->run($user, 'career_map', $input,
            fn (string $reply): array => $this->shapeCareerMap($reply));
    }
```

And add this private helper after `splitKeywords` (currently ending line 141, just before the closing `}` of the class):

```php
    /**
     * @return array{paths: array<int, mixed>}
     */
    private function shapeCareerMap(string $reply): array
    {
        $decoded = json_decode($reply, true);

        if (! is_array($decoded) || $decoded === []) {
            throw new \RuntimeException('Malformed career_map AI reply.');
        }

        return ['paths' => array_slice(array_values($decoded), 0, 3)];
    }
```

- [ ] **Step 5: Add the route**

In `routes/web.php`, add immediately after the `builder.ai.ats-keywords` route (currently line 99):

```php
        Route::post('/builder/{resume}/ai/career-map', [AiSuggestionController::class, 'careerMap'])->name('builder.ai.career-map');
```

- [ ] **Step 6: Run the new tests**

Run: `php artisan test --compact tests/Feature/CareerMapTest.php`
Expected: PASS (7 tests)

- [ ] **Step 7: Run the full AiSuggestionTest suite to confirm the `run()` change is behavior-preserving**

Run: `php artisan test --compact tests/Feature/AiSuggestionTest.php`
Expected: PASS (all tests, no regressions)

- [ ] **Step 8: Commit**

```bash
git add app/Http/Controllers/AiSuggestionController.php routes/web.php tests/Feature/CareerMapTest.php
git commit -m "feat: add career_map AI suggestion endpoint"
```

---

### Task 4: Frontend `CareerMapPanel.tsx` + Resume Builder wiring

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Partials/CareerMapPanel.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
- Modify: `app/Http/Controllers/ResumeBuilderController.php:118-153` (`edit()` method's Inertia props)

**Interfaces:**
- Consumes: `route('builder.ai.career-map', resume.id)` (Task 3), `useAiSuggestion` hook (existing, `resources/js/hooks/useAiSuggestion.ts`), `triggerUpgradeModal` (existing, `@/Components/UpgradeModal`).
- Produces: `<CareerMapPanel paths={paths} aiButton={ReactNode} />` component, rendered in `Edit.tsx`'s sidebar alongside `AtsMatchPanel`.

- [ ] **Step 1: Pass `canCareerMap` as an Inertia prop**

In `app/Http/Controllers/ResumeBuilderController.php`, in the `edit()` method's `Inertia::render('ResumeBuilder/Edit', [...])` array, add immediately after `'canAiTailoring' => UserLimits::canAiTailoring($user),` (currently line 142):

```php
            'canCareerMap' => UserLimits::canCareerMap($user),
```

- [ ] **Step 2: Create the panel component**

Create `resources/js/Pages/ResumeBuilder/Partials/CareerMapPanel.tsx`:

```tsx
import { useState } from 'react';

interface CareerPath {
    title: string;
    reasoning: string;
    skill_gaps: string[];
}

interface CareerMapPanelProps {
    paths: CareerPath[];
    aiButton: React.ReactNode;
}

export default function CareerMapPanel({ paths, aiButton }: CareerMapPanelProps) {
    const [open, setOpen] = useState(true);

    return (
        <div className="border-t border-gray-100 pt-3">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
            >
                <span className="flex items-center gap-1.5">
                    Career Map
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-indigo-500">✨ AI</span>
                </span>
                <span>{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="mt-3 space-y-2">
                    {aiButton}
                    {paths.length > 0 && (
                        <div className="space-y-2">
                            {paths.map((path, i) => (
                                <div key={i} className="rounded border border-gray-200 p-2">
                                    <p className="text-xs font-semibold text-gray-800">{path.title}</p>
                                    <p className="mt-1 text-xs text-gray-600">{path.reasoning}</p>
                                    {path.skill_gaps.length > 0 && (
                                        <div className="mt-1.5 flex flex-wrap gap-1">
                                            {path.skill_gaps.map(gap => (
                                                <span key={gap} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{gap}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Wire the panel into `Edit.tsx`**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`, add the import after the existing `AtsMatchPanel` import (currently line 3):

```tsx
import CareerMapPanel from './Partials/CareerMapPanel';
```

Add `canCareerMap` to the destructured props (currently line 423-425, alongside `canDocx, canAiTailoring, canInterviewCoach`):

```tsx
    isFirstResume, canDocx, canAiTailoring, canCareerMap, canInterviewCoach, interviewCoachUsesRemaining,
```

Add `canCareerMap: boolean;` to the props type (currently near line 432-433, alongside `canAiTailoring: boolean;`):

```tsx
    canAiTailoring: boolean;
    canCareerMap: boolean;
```

Add local state for the paths, near the other AI-result state declarations (find where `keywordGaps` state is declared, e.g. `const [keywordGaps, setKeywordGaps] = useState<string[]>([]);`, and add immediately after it):

```tsx
    const [careerPaths, setCareerPaths] = useState<{ title: string; reasoning: string; skill_gaps: string[] }[]>([]);
```

Add the handler after `handleKeywordGaps` (currently lines 590-593):

```tsx
    const handleCareerMap = async () => {
        const data = await ai.run<{ paths: { title: string; reasoning: string; skill_gaps: string[] }[] }>(route('builder.ai.career-map', resume.id));
        if (data?.paths) { setCareerPaths(data.paths); }
    };
```

Render the panel in the sidebar, immediately after the `<AtsMatchPanel ... />` block (currently lines 895-907, inside the same `{sidebarOpen && ( ... )}` — add as its own sibling `{sidebarOpen && (...)}` block right after it):

```tsx
                        {sidebarOpen && (
                            <CareerMapPanel
                                paths={careerPaths}
                                aiButton={
                                    canCareerMap
                                        ? renderAiButton({ idle: '✨ Suggest career paths', onRun: handleCareerMap })
                                        : <button type="button" onClick={() => triggerUpgradeModal('career_map', 'pro')} className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors">🔒 Career Map (Pro)</button>
                                }
                            />
                        )}
```

- [ ] **Step 4: Verify the TypeScript build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 5: Add a feature test asserting the Inertia prop is present**

Add `use Inertia\Testing\AssertableInertia;` to the imports at the top of `tests/Feature/CareerMapTest.php` (alongside the existing `use OpenAI\...` imports). Then add this test (append after `test_malformed_reply_returns_503`):

```php
    public function test_edit_page_exposes_can_career_map_prop(): void
    {
        $user = User::factory()->pro()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->get(route('builder.edit', $resume))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('canCareerMap', true));
    }
```

- [ ] **Step 6: Run the test**

Run: `php artisan test --compact --filter=test_edit_page_exposes_can_career_map_prop`
Expected: PASS

- [ ] **Step 7: Manual smoke test**

Start the dev server (`composer run dev` if not already running), log in as a Pro/Agency user, open a resume in the Builder, confirm the "Career Map" panel appears in the sidebar with a "✨ Suggest career paths" button, click it, and confirm 3 path cards render. Then check as a Free/Starter user that the panel shows the locked "🔒 Career Map (Pro)" button instead, and clicking it opens the upgrade modal.

- [ ] **Step 8: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Partials/CareerMapPanel.tsx resources/js/Pages/ResumeBuilder/Edit.tsx app/Http/Controllers/ResumeBuilderController.php tests/Feature/CareerMapTest.php
git commit -m "feat: add Career Map panel to Resume Builder"
```

---

### Task 5: Full regression pass

**Files:** none (verification only)

**Interfaces:** none — this task verifies Tasks 1-4 together.

- [ ] **Step 1: Run the full test suite**

Run: `php artisan test --compact`
Expected: PASS — all tests green, including every test added in Tasks 1-4 and the full pre-existing suite (confirming the `run()` extension in Task 3 introduced no regressions).

- [ ] **Step 2: Run Pint**

Run: `./vendor/bin/pint --dirty --format agent`
Expected: No formatting violations remain (fixes auto-applied if any were found).

- [ ] **Step 3: Commit any Pint fixes, if there were any**

```bash
git add -A
git commit -m "style: pint formatting for career map"
```

If Pint made no changes, skip this step — do not create an empty commit.
