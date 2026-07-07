# Resume Translator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Starter+ users translate a resume's free-text content into one of 7 languages with one click, always producing a new resume copy (never overwriting the original).

**Architecture:** New `AiSuggestionController::translate()` action gates on tier + resume limit + AI quota (mirroring existing patterns in the same controller), calls `AiService::chat()` with a new `translate_resume` prompt that round-trips structured JSON, then uses the existing `ResumeCopier::copy()` + a mass-update to persist the translated copy. Frontend adds a `TranslatePanel` sidebar panel mirroring `CareerMapPanel`'s collapsible shell.

**Tech Stack:** Laravel 13 / PHP 8.4 (backend), Inertia v2 + React 18 + TypeScript (frontend), existing `AiService`/OpenAI integration, PHPUnit.

## Global Constraints

- Supported languages (exact 7, exact keys): `spanish`, `french`, `german`, `portuguese`, `italian`, `mandarin`, `japanese`.
- Never overwrite the original resume — always create a copy via `ResumeCopier::copy()`.
- Only true free-text content is sent to the AI: `summary`, `experience`, `education`, `skills`, `skills_groups`, `skill_narratives`, `custom_sections`. **`projects` is explicitly excluded** — it's an existing dead/unwired column (cast but not in `Resume::$fillable`, unused by any controller); translating it is out of scope for this feature (confirmed with user).
- No schema changes, no new dependencies.
- **Resolved spec ambiguity:** the design spec's frontend section says all three 402 reasons (tier gate, resume limit, AI quota) "share the same JSON shape," but the backend section defines tier-gate/resume-limit as `{error, required_tier}` and AI-quota as the existing `{error, can_upgrade, next_tier, limit, used, resets_at}` shape (no `required_tier`). These are different shapes. Resolution used throughout this plan: the frontend reads `data.required_tier ?? data.next_tier ?? 'starter'` to get a tier for `triggerUpgradeModal`, which works correctly against both shapes without changing either backend response.
- If the AI reply isn't valid JSON, or its top-level keys don't match the request's content keys (regardless of order), treat it as a 503 failure. No resume copy is created on any AI failure path.

---

### Task 1: `translate_resume` AI prompt

**Files:**
- Modify: `app/Data/AiPrompts.php`
- Test: `tests/Unit/AiPromptsTest.php`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AiPrompts::build('translate_resume', ['language' => string, 'content' => array<string, mixed>]): string` — later tasks call this via `AiPrompts::build()`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/Unit/AiPromptsTest.php` (before the final `test_unknown_feature_throws` method):

```php
    public function test_translate_resume_includes_language_and_content(): void
    {
        $prompt = AiPrompts::build('translate_resume', [
            'language' => 'spanish',
            'content' => ['summary' => 'Senior backend engineer.', 'skills' => ['PHP', 'Laravel']],
        ]);

        $this->assertStringContainsString('Spanish', $prompt);
        $this->assertStringContainsString('Senior backend engineer.', $prompt);
        $this->assertStringContainsString('PHP', $prompt);
        $this->assertStringContainsString('proper nouns', $prompt);
    }

    public function test_translate_resume_labels_mandarin(): void
    {
        $prompt = AiPrompts::build('translate_resume', [
            'language' => 'mandarin',
            'content' => ['summary' => 'Engineer.'],
        ]);

        $this->assertStringContainsString('Mandarin', $prompt);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Unit/AiPromptsTest.php`
Expected: FAIL — `Unknown AI feature: translate_resume` (thrown by the `default` arm of `AiPrompts::build()`).

- [ ] **Step 3: Implement the prompt**

In `app/Data/AiPrompts.php`, add a new match arm in `build()` (after the `resignation_letter` line):

```php
            'resignation_letter' => self::resignationLetter($input),
            'translate_resume' => self::translateResume($input),
            default => throw new InvalidArgumentException("Unknown AI feature: {$feature}"),
```

Then add the new private method (place it near `careerMap()`):

```php
    /**
     * @param  array{language?: string, content?: array<string, mixed>}  $input
     */
    private static function translateResume(array $input): string
    {
        $labels = [
            'spanish' => 'Spanish', 'french' => 'French', 'german' => 'German',
            'portuguese' => 'Portuguese', 'italian' => 'Italian',
            'mandarin' => 'Mandarin (Simplified Chinese)', 'japanese' => 'Japanese',
        ];
        $language = $input['language'] ?? 'spanish';
        $languageLabel = $labels[$language] ?? ucfirst($language);
        $content = json_encode($input['content'] ?? [], JSON_PRETTY_PRINT);

        return <<<PROMPT
        Translate the following resume content JSON into {$languageLabel}. Translate every string
        value into {$languageLabel}. Preserve the exact key structure, nesting, and array ordering
        of the input JSON exactly — do not add, remove, or reorder any keys. Do NOT translate proper
        nouns: company names, school names, product names, or people's names — leave those exactly
        as written.

        Content:
        {$content}

        Return ONLY the translated JSON object with the same structure as the input. No markdown
        fences, no explanation, no preamble.
        PROMPT;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test --compact tests/Unit/AiPromptsTest.php`
Expected: PASS (10 tests total).

- [ ] **Step 5: Commit**

```bash
git add app/Data/AiPrompts.php tests/Unit/AiPromptsTest.php
git commit -m "feat: add translate_resume AI prompt"
```

---

### Task 2: Backend translate endpoint

**Files:**
- Modify: `app/Services/UserLimits.php`
- Modify: `app/Http/Controllers/AiSuggestionController.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php` (add `canTranslate` to `edit()` props)
- Modify: `routes/web.php`
- Test: `tests/Feature/ResumeTranslateTest.php`

**Interfaces:**
- Consumes: `AiPrompts::build('translate_resume', ...)` from Task 1; existing `ResumeCopier::copy(Resume $source, User $owner, string $name): Resume`; existing `UserLimits::resumeLimit()`, `canUseAi()`, `aiRemaining()`, `aiCanUpgrade()`, `aiNextTier()`, `aiMonthlyLimit()`, `aiRequestsThisMonth()`.
- Produces: `UserLimits::canTranslate(User $user): bool`; route `builder.ai.translate` (`POST /builder/{resume}/ai/translate`); JSON response `{resume_id: int, remaining: int}` on success — Task 3 consumes this exact shape.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/ResumeTranslateTest.php`:

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

class ResumeTranslateTest extends TestCase
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

    public function test_free_user_gets_402(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(402)->assertJson(['required_tier' => 'starter']);
    }

    public function test_starter_user_at_resume_limit_gets_402(): void
    {
        $user = User::factory()->starter()->create();
        Resume::factory()->count(10)->create(['user_id' => $user->id]);
        $resume = $user->resumes()->first();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(402)->assertJson(['required_tier' => 'pro']);
    }

    public function test_starter_user_can_translate_and_creates_new_resume(): void
    {
        $translated = json_encode([
            'summary' => 'Ingeniero backend senior.',
            'experience' => [],
            'education' => [],
            'skills' => ['PHP', 'Laravel'],
            'skills_groups' => [],
            'skill_narratives' => [],
            'custom_sections' => [],
        ]);
        $this->fakeReply($translated);

        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create([
            'name' => 'My Resume',
            'summary' => 'Senior backend engineer.',
            'skills' => ['PHP', 'Laravel'],
            'contact' => ['email' => 'me@example.com'],
            'template' => 'classic',
        ]);

        $res = $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ]);

        $res->assertOk()->assertJsonStructure(['resume_id', 'remaining']);

        $copy = Resume::find($res->json('resume_id'));
        $this->assertNotNull($copy);
        $this->assertNotEquals($resume->id, $copy->id);
        $this->assertSame('Ingeniero backend senior.', $copy->summary);
        $this->assertSame(['PHP', 'Laravel'], $copy->skills);
        // Untouched structural fields carried over unchanged from the original.
        $this->assertSame($resume->contact, $copy->contact);
        $this->assertSame($resume->template, $copy->template);
    }

    public function test_free_tier_cannot_translate_even_under_resume_limit(): void
    {
        $user = User::factory()->create(['plan_tier' => 'free']);
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'french',
        ])->assertStatus(402)->assertJson(['required_tier' => 'starter']);
    }

    public function test_ai_quota_exhausted_returns_402(): void
    {
        config()->set('ai.monthly_limits.starter', 0);
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(402);
    }

    public function test_moderation_rejection_returns_422(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(422);

        $this->assertSame(1, Resume::count());
    }

    public function test_ai_service_failure_returns_503_and_creates_no_copy(): void
    {
        $this->fakeServiceFailure();
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(503);

        $this->assertSame(1, Resume::count());
    }

    public function test_malformed_json_reply_returns_503_and_creates_no_copy(): void
    {
        $this->fakeReply('not valid json');
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(503);

        $this->assertSame(1, Resume::count());
    }

    public function test_mismatched_shape_reply_returns_503_and_creates_no_copy(): void
    {
        $this->fakeReply(json_encode(['summary' => 'Only summary, missing other keys.']));
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertStatus(503);

        $this->assertSame(1, Resume::count());
    }

    public function test_invalid_language_is_rejected(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'klingon',
        ])->assertStatus(422);
    }

    public function test_other_user_cannot_translate(): void
    {
        $owner = User::factory()->starter()->create();
        $other = User::factory()->starter()->create();
        $resume = Resume::factory()->for($owner)->create();

        $this->actingAs($other)->postJson(route('builder.ai.translate', $resume), [
            'language' => 'spanish',
        ])->assertForbidden();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test --compact tests/Feature/ResumeTranslateTest.php`
Expected: FAIL — route `builder.ai.translate` not defined (or 404/500), since none of the backend pieces exist yet.

- [ ] **Step 3: Add `UserLimits::canTranslate`**

In `app/Services/UserLimits.php`, add (near `canAiTailoring`):

```php
    public static function canTranslate(User $user): bool
    {
        return $user->isAtLeastStarter();
    }
```

- [ ] **Step 4: Add the route**

In `routes/web.php`, add after the `builder.ai.career-map` line:

```php
        Route::post('/builder/{resume}/ai/translate', [AiSuggestionController::class, 'translate'])->name('builder.ai.translate');
```

- [ ] **Step 5: Implement `AiSuggestionController::translate()`**

In `app/Http/Controllers/AiSuggestionController.php`:
- Add `use App\Services\ResumeCopier;` to the imports.
- Add this public method (after `careerMap()`):

```php
    public function translate(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);
        $user = $request->user();

        $data = $request->validate([
            'language' => ['required', 'string', 'in:spanish,french,german,portuguese,italian,mandarin,japanese'],
        ]);
        $language = $data['language'];

        if (! UserLimits::canTranslate($user)) {
            return response()->json([
                'error' => 'Resume translation is a Starter feature.',
                'required_tier' => 'starter',
            ], 402);
        }

        $limit = UserLimits::resumeLimit($user);
        if ($limit !== null && $user->resumes()->nonSnapshot()->count() >= $limit) {
            return response()->json([
                'error' => 'Resume limit reached.',
                'required_tier' => $user->planTier() === 'free' ? 'starter' : 'pro',
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

        $content = [
            'summary' => $resume->summary,
            'experience' => $resume->experience ?? [],
            'education' => $resume->education ?? [],
            'skills' => $resume->skills ?? [],
            'skills_groups' => $resume->skills_groups ?? [],
            'skill_narratives' => $resume->skill_narratives ?? [],
            'custom_sections' => $resume->custom_sections ?? [],
        ];

        try {
            $reply = $this->ai->chat(
                AiPrompts::build('translate_resume', ['language' => $language, 'content' => $content]),
                ['user' => $user, 'feature' => 'translate_resume'],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $translated = json_decode($reply, true);
        $sameShape = is_array($translated)
            && array_diff(array_keys($content), array_keys($translated)) === []
            && array_diff(array_keys($translated), array_keys($content)) === [];

        if (! $sameShape) {
            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $labels = [
            'spanish' => 'Spanish', 'french' => 'French', 'german' => 'German',
            'portuguese' => 'Portuguese', 'italian' => 'Italian', 'mandarin' => 'Mandarin', 'japanese' => 'Japanese',
        ];
        $copy = ResumeCopier::copy($resume, $user, "{$resume->name} ({$labels[$language]})");
        $copy->update($translated);

        return response()->json([
            'resume_id' => $copy->id,
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }
```

- [ ] **Step 6: Add `canTranslate` to `ResumeBuilderController::edit()` props**

In `app/Http/Controllers/ResumeBuilderController.php`, in the `edit()` method's returned props array, add a line next to `'canCareerMap' => UserLimits::canCareerMap($user),`:

```php
            'canTranslate' => UserLimits::canTranslate($user),
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `php artisan test --compact tests/Feature/ResumeTranslateTest.php`
Expected: PASS (11 tests).

Then run the full existing suite for regressions on touched files:

Run: `php artisan test --compact tests/Feature/ResumeBuilderTest.php tests/Unit/AiPromptsTest.php`
Expected: PASS (no regressions).

- [ ] **Step 8: Format and commit**

```bash
./vendor/bin/pint --dirty --format agent
git add app/Services/UserLimits.php app/Http/Controllers/AiSuggestionController.php app/Http/Controllers/ResumeBuilderController.php routes/web.php tests/Feature/ResumeTranslateTest.php
git commit -m "feat: add resume translation endpoint"
```

---

### Task 3: Frontend translate panel

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Partials/TranslatePanel.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

**Interfaces:**
- Consumes: route `builder.ai.translate` and its `{resume_id, remaining}` success shape from Task 2; `triggerUpgradeModal(feature: string, requiredTier: 'starter' | 'pro'): void` from `@/Components/UpgradeModal`; `canTranslate: boolean` prop passed from `Edit`'s Inertia props (set by Task 2 Step 6).
- Produces: `TranslatePanel({ resumeId, canTranslate }: { resumeId: number; canTranslate: boolean })` — default export, self-contained (owns its own fetch/loading/error state), no ref needed.

- [ ] **Step 1: Create the panel component**

Create `resources/js/Pages/ResumeBuilder/Partials/TranslatePanel.tsx`:

```tsx
import { useState } from 'react';
import { router } from '@inertiajs/react';
import { triggerUpgradeModal } from '@/Components/UpgradeModal';

const LANGUAGES: { value: string; label: string }[] = [
    { value: 'spanish', label: 'Spanish' },
    { value: 'french', label: 'French' },
    { value: 'german', label: 'German' },
    { value: 'portuguese', label: 'Portuguese' },
    { value: 'italian', label: 'Italian' },
    { value: 'mandarin', label: 'Mandarin' },
    { value: 'japanese', label: 'Japanese' },
];

interface Props {
    resumeId: number;
    canTranslate: boolean;
}

const xsrfToken = (): string => {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
};

export default function TranslatePanel({ resumeId, canTranslate }: Props) {
    const [open, setOpen] = useState(true);
    const [language, setLanguage] = useState('spanish');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const translate = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(route('builder.ai.translate', resumeId), {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ language }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.status === 402) {
                const tier = (data.required_tier ?? data.next_tier ?? 'starter') as 'starter' | 'pro';
                triggerUpgradeModal('translate', tier);
                return;
            }

            if (!res.ok) {
                setError(data.error ?? 'Translation failed. Try again.');
                return;
            }

            router.visit(route('builder.edit', data.resume_id));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="border-t border-gray-100 pt-3">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
            >
                <span className="flex items-center gap-1.5">
                    Translate
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-indigo-500">✨ AI</span>
                </span>
                <span>{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="mt-3 space-y-2">
                    {canTranslate ? (
                        <>
                            <select
                                value={language}
                                onChange={e => setLanguage(e.target.value)}
                                className="w-full rounded-md border border-[#cbd5e1] px-2 py-1.5 text-xs"
                            >
                                {LANGUAGES.map(l => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={translate}
                                disabled={loading}
                                className="w-full rounded-md bg-[#0f172a] px-3 py-1.5 text-center text-xs font-medium text-white hover:bg-[#1e293b] disabled:opacity-40 transition-colors"
                            >
                                {loading ? 'Translating…' : '✨ Translate resume'}
                            </button>
                            {error && <p className="text-xs text-red-600">{error}</p>}
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={() => triggerUpgradeModal('translate', 'starter')}
                            className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors"
                        >
                            🔒 Translate resume (Starter)
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Wire it into `Edit.tsx`**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`:

Add the import after the `CareerMapPanel` import (line 4):

```tsx
import TranslatePanel from './Partials/TranslatePanel';
```

Add `canTranslate` to the destructured props list (the line starting `isFirstResume, canDocx, canAiTailoring, canCareerMap, ...`):

```tsx
    isFirstResume, canDocx, canAiTailoring, canCareerMap, canTranslate, canInterviewCoach, interviewCoachUsesRemaining,
```

Add `canTranslate: boolean;` to the props type block, next to `canCareerMap: boolean;`:

```tsx
    canCareerMap: boolean;
    canTranslate: boolean;
```

Add the panel in the sidebar JSX, directly after the `CareerMapPanel` block:

```tsx
                        {sidebarOpen && <TranslatePanel resumeId={resume.id} canTranslate={canTranslate} />}
```

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: succeeds with no TypeScript errors.

- [ ] **Step 4: Manual verification**

Since this touches the UI, verify in the browser (Herd serves the site at its `.test` domain):
1. Open a Starter+ user's resume in the builder.
2. Confirm the "Translate" panel appears in the sidebar with a language dropdown and "✨ Translate resume" button.
3. Click translate; confirm it navigates to a new resume named `"<original name> (<Language>)"` with translated `summary`/`skills`, unchanged `contact`/`template`.
4. As a Free-tier user, confirm the panel shows the locked "🔒 Translate resume (Starter)" button and clicking it opens the upgrade modal.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Partials/TranslatePanel.tsx resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: add resume translation panel to builder sidebar"
```
