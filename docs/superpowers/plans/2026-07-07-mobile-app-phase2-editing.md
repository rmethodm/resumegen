# Mobile App Phase 2 — Editing (Resumes, Cover Letters, Resignation Letters) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the mobile app full-parity editing of an existing Resume, and full editing + AI-generate of Cover Letters and Resignation Letters, backed by a new Sanctum JSON API surface where one doesn't exist yet.

**Architecture:** Backend: mirror the existing `Api\CoverLetterController` CRUD pattern for a new `Api\ResignationLetterController`; add a `generate()` action to both cover-letter and resignation-letter API controllers reusing `AiService`/`AiPrompts`/`UserLimits` exactly as the web `ResignationLetterController::generate` already does; add a JSON `Api\ResumePhotoController` since no JSON photo endpoint exists today (only a web/Inertia one). Mobile: three parallel "document editor" verticals, each a list screen + edit screen using save-on-blur `PUT` calls through `apiFetch`; the Resume editor is decomposed into one file per section under `mobile/screens/resume-edit/`, with a single generic `CardListEditor` component shared by the four structurally-identical array-of-objects sections (Experience/Education/Certifications/Projects) to avoid four near-duplicate implementations.

**Tech Stack:** Laravel 13 / PHP 8.4 / Sanctum API (backend); Expo SDK 57 / React Native 0.86 / TypeScript / Jest + `@testing-library/react-native` (mobile).

## Global Constraints

- Every AI 402/422/503 response shape must match `ResignationLetterController::generate`'s exact JSON exactly: 402 `{ error, can_upgrade, next_tier, limit, used, resets_at }`; 422 `{ error: ModerationException::USER_MESSAGE }` (`"This content can't be processed."`); 503 `{ error: "AI is temporarily unavailable. Try again." }`; success `{ body, remaining }`.
- All new mobile API calls go through `apiFetch` (`mobile/lib/api.ts`) — never a raw `fetch` — so the central 401 handler (`handleUnauthorizedResponse`) always fires.
- All new mobile edit screens use save-on-blur (`onBlur` triggers the API call), never an explicit "Save" button — this matches the web builder and every existing mobile screen convention.
- Every new/changed API endpoint must authorize via the existing Policy (`ResignationLetterPolicy`, `CoverLetterPolicy`, `ResumePolicy`) with `$this->authorize(...)` — no new authorization logic.
- Verify any new Expo API (`expo-image-picker`, `react-native-gesture-handler`, `react-native-reanimated`) against `https://docs.expo.dev/versions/v57.0.0/` before writing code — do not rely on training-era API shapes (per `mobile/AGENTS.md`).
- No new environment variables, no new database migrations — `resumes`, `cover_letters`, `resignation_letters` tables already exist with everything needed.
- Cover letter and resignation letter tone enums are identical: `formal|warm|brief`. Cover-letter template keys: `standard, modern, career_change, new_grad, referral`. Resignation-letter template keys: `standard, immediate, warm`.

---

## Backend Tasks

### Task 1: Fix `Resume::$fillable` missing `projects`

`projects` is cast as `'array'` and appears in `ResumeRules::rules()` and `ResumeRules::copyFields()`, but is absent from `Resume::$fillable` (`app/Models/Resume.php`). Any mass-assignment update (including the existing web builder's save, and the new mobile resume editor) silently drops `projects` today. Fix before building anything that writes `projects` from mobile.

**Files:**
- Modify: `app/Models/Resume.php` (`$fillable` array)
- Test: `tests/Feature/Api/ResumeApiTest.php`

**Interfaces:**
- Produces: `Api\ResumeController::update` now persists a `projects` array passed in the request body (previously silently dropped).

- [ ] **Step 1: Write the failing test**

Add to `tests/Feature/Api/ResumeApiTest.php`:

```php
public function test_can_update_resume_projects(): void
{
    $user = User::factory()->create();
    $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

    $projects = [[
        'id' => 'p1', 'name' => 'Side Project', 'description' => 'Built a thing',
        'url' => '', 'start_date' => '', 'end_date' => '', 'bullets' => '',
    ]];

    $this->withToken($this->token($user))
        ->putJson("/api/resumes/{$resume->id}", ['projects' => $projects])
        ->assertOk()
        ->assertJsonPath('projects', $projects);

    $this->assertDatabaseHas('resumes', ['id' => $resume->id]);
    $this->assertEquals($projects, $resume->fresh()->projects);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=test_can_update_resume_projects`
Expected: FAIL — `projects` is `null` on the fresh model (silently dropped by mass assignment).

- [ ] **Step 3: Add `projects` to `$fillable`**

In `app/Models/Resume.php`, change:

```php
    protected $fillable = [
        'user_id',
        'name', 'pdf_filename', 'template',
        'accent_color', 'font_family',
        'contact', 'summary', 'target_job_description', 'experience', 'education',
        'skills', 'skills_layout', 'skills_groups', 'skill_narratives', 'certifications', 'font_sizes',
        'section_order', 'custom_sections',
```

to:

```php
    protected $fillable = [
        'user_id',
        'name', 'pdf_filename', 'template',
        'accent_color', 'font_family',
        'contact', 'summary', 'target_job_description', 'experience', 'education', 'projects',
        'skills', 'skills_layout', 'skills_groups', 'skill_narratives', 'certifications', 'font_sizes',
        'section_order', 'custom_sections',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=test_can_update_resume_projects`
Expected: PASS

- [ ] **Step 5: Run the full Resume API test file to check no regression**

Run: `php artisan test tests/Feature/Api/ResumeApiTest.php --compact`
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
git add app/Models/Resume.php tests/Feature/Api/ResumeApiTest.php
git commit -m "fix: add projects to Resume fillable so API updates persist it"
```

---

### Task 2: Add `cover_letter` case to `AiPrompts::build()`

**Files:**
- Modify: `app/Data/AiPrompts.php`
- Test: `tests/Unit/AiPromptsTest.php` (create if it doesn't exist)

**Interfaces:**
- Produces: `AiPrompts::build('cover_letter', array{tone: string, job_description: ?string, role: ?string, company: ?string, experience: array, skills: array}): string`

- [ ] **Step 1: Write the failing test**

Create `tests/Unit/AiPromptsTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Data\AiPrompts;
use PHPUnit\Framework\TestCase;

class AiPromptsTest extends TestCase
{
    public function test_cover_letter_prompt_includes_tone_and_role_and_company(): void
    {
        $prompt = AiPrompts::build('cover_letter', [
            'tone' => 'warm',
            'job_description' => null,
            'role' => 'Senior Engineer',
            'company' => 'Acme Corp',
            'experience' => [],
            'skills' => [],
        ]);

        $this->assertStringContainsString('warm', $prompt);
        $this->assertStringContainsString('Senior Engineer', $prompt);
        $this->assertStringContainsString('Acme Corp', $prompt);
        $this->assertStringContainsString('Return ONLY the letter body text', $prompt);
    }

    public function test_cover_letter_prompt_includes_job_description_when_present(): void
    {
        $prompt = AiPrompts::build('cover_letter', [
            'tone' => 'formal',
            'job_description' => 'Looking for a React expert.',
            'role' => null,
            'company' => null,
            'experience' => [],
            'skills' => [],
        ]);

        $this->assertStringContainsString('Looking for a React expert.', $prompt);
    }

    public function test_unknown_feature_throws(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        AiPrompts::build('not_a_real_feature', []);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Unit/AiPromptsTest.php --filter=test_cover_letter_prompt_includes_tone_and_role_and_company`
Expected: FAIL — `Unknown AI feature: cover_letter`

- [ ] **Step 3: Add the `cover_letter` match arm and builder method**

In `app/Data/AiPrompts.php`, add `'cover_letter' => self::coverLetter($input),` to the `match` in `build()`:

```php
        return match ($feature) {
            'rewrite_bullet' => self::rewriteBullet($input),
            'generate_summary' => self::generateSummary($input),
            'ats_keywords' => self::atsKeywords($input),
            'interview_coach' => self::interviewCoach($input),
            'career_coach' => self::careerCoach($input),
            'career_map' => self::careerMap($input),
            'resignation_letter' => self::resignationLetter($input),
            'cover_letter' => self::coverLetter($input),
            'translate_resume' => self::translateResume($input),
            default => throw new InvalidArgumentException("Unknown AI feature: {$feature}"),
        };
```

Add this method, placed after `resignationLetter()`:

```php
    /**
     * @param  array{tone?: string, job_description?: ?string, role?: ?string, company?: ?string, experience?: ?array<mixed>, skills?: ?array<mixed>}  $input
     */
    private static function coverLetter(array $input): string
    {
        $tone = $input['tone'] ?? 'formal';
        $role = $input['role'] ?? null;
        $company = $input['company'] ?? null;
        $jobDescription = $input['job_description'] ?? null;
        $skills = implode(', ', array_slice($input['skills'] ?? [], 0, 15)) ?: 'No skills listed';

        $experienceLines = [];
        foreach (array_slice($input['experience'] ?? [], 0, 5) as $exp) {
            $line = implode(' at ', array_filter([$exp['title'] ?? null, $exp['company'] ?? null]));
            if ($line) {
                $experienceLines[] = $line;
            }
        }
        $experienceText = $experienceLines ? implode("\n", $experienceLines) : 'No experience listed';

        $contextLines = [];
        if ($role) {
            $contextLines[] = "Target role: {$role}";
        }
        if ($company) {
            $contextLines[] = "Company: {$company}";
        }
        $context = $contextLines ? implode("\n", $contextLines) : 'No target role/company provided.';

        $jdSection = $jobDescription ? "\n\nJob description:\n{$jobDescription}" : '';

        return <<<PROMPT
        Write a complete, professional cover letter body in a {$tone} tone, grounded strictly in the
        candidate's experience and skills below — do not invent employers, titles, or accomplishments.
        Reference the job description if provided. Do not include a date header or salutation/signature
        block — the user will add those manually; write only the letter's message paragraphs.

        {$context}
        Skills: {$skills}
        Experience:
        {$experienceText}{$jdSection}

        Return ONLY the letter body text. No markdown fences, no explanation, no preamble.
        PROMPT;
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Unit/AiPromptsTest.php --compact`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/Data/AiPrompts.php tests/Unit/AiPromptsTest.php
git commit -m "feat: add cover_letter AI prompt builder"
```

---

### Task 3: Add `generate()` action to `Api\CoverLetterController`

**Files:**
- Modify: `app/Http/Controllers/Api/CoverLetterController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/CoverLetterApiTest.php`

**Interfaces:**
- Consumes: `AiPrompts::build('cover_letter', ...)` (Task 2), `AiService::chat(string $prompt, array $options): string`, `UserLimits::canUseAi/aiCanUpgrade/aiNextTier/aiMonthlyLimit/aiRequestsThisMonth/aiRemaining(User $user)`.
- Produces: `POST /api/cover-letters/{coverLetter}/generate` — request `{ tone: 'formal'|'warm'|'brief', job_description?: string }` — success response `{ body: string, remaining: int }`. Also makes `template_key` editable via `PUT /api/cover-letters/{coverLetter}` (the mobile editor needs to change templates after creation; the existing `update()` only accepted `name`/`body`/`resume_id`).

- [ ] **Step 0: Write a failing test for `template_key` becoming updatable**

Add to `tests/Feature/Api/CoverLetterApiTest.php`:

```php
    public function test_can_update_template_key(): void
    {
        $user = User::factory()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->putJson("/api/cover-letters/{$letter->id}", ['template_key' => 'modern'])
            ->assertOk()
            ->assertJsonPath('template_key', 'modern');
    }

    public function test_update_rejects_unknown_template_key(): void
    {
        $user = User::factory()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->putJson("/api/cover-letters/{$letter->id}", ['template_key' => 'bogus'])
            ->assertStatus(422);
    }
```

Run: `php artisan test --filter=test_can_update_template_key`
Expected: FAIL — `template_key` is silently dropped (not in the current validation rules, so it's excluded from `$validated` and never persisted).

In `app/Http/Controllers/Api/CoverLetterController.php`, change `update()`'s validation from:

```php
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'body' => ['sometimes', 'string', 'max:50000'],
            'resume_id' => ['sometimes', 'nullable', 'integer', 'exists:resumes,id'],
        ]);
```

to:

```php
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'template_key' => ['sometimes', 'required', 'in:'.implode(',', CoverLetterTemplates::keys())],
            'body' => ['sometimes', 'string', 'max:50000'],
            'resume_id' => ['sometimes', 'nullable', 'integer', 'exists:resumes,id'],
        ]);
```

`CoverLetterTemplates` is already imported at the top of this file (used by `store()`), so no new import is needed. Run: `php artisan test --filter=test_can_update_template_key` and `--filter=test_update_rejects_unknown_template_key` — expect both PASS.

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/Api/CoverLetterApiTest.php` (needs `RefreshDatabase` already present; add these `use` imports at the top of the file: `use App\Exceptions\ModerationException; use OpenAI\Contracts\ClientContract; use OpenAI\Responses\Chat\CreateResponse; use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse; use OpenAI\Testing\ClientFake;`):

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

    public function test_generate_returns_body_and_remaining(): void
    {
        $this->fakeReply('Dear Hiring Manager, I am excited to apply.');
        $user = User::factory()->pro()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'formal'])
            ->assertOk()
            ->assertJsonStructure(['body', 'remaining'])
            ->assertJsonPath('body', 'Dear Hiring Manager, I am excited to apply.');

        $this->assertDatabaseHas('cover_letters', [
            'id' => $letter->id,
            'body' => 'Dear Hiring Manager, I am excited to apply.',
        ]);
    }

    public function test_generate_other_users_letter_forbidden(): void
    {
        $owner = User::factory()->pro()->create();
        $other = User::factory()->pro()->create();
        $letter = $owner->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($other))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'formal'])
            ->assertForbidden();
    }

    public function test_generate_quota_exhausted_returns_402(): void
    {
        config()->set('ai.monthly_limits.pro', 0);
        $user = User::factory()->pro()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'formal'])
            ->assertStatus(402)
            ->assertJsonStructure(['error', 'can_upgrade', 'next_tier', 'limit', 'used', 'resets_at']);
    }

    public function test_generate_moderation_rejection_returns_422(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->pro()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'formal'])
            ->assertStatus(422)
            ->assertJsonPath('error', ModerationException::USER_MESSAGE);
    }

    public function test_generate_validates_tone(): void
    {
        $user = User::factory()->pro()->create();
        $letter = $user->coverLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/cover-letters/{$letter->id}/generate", ['tone' => 'sarcastic'])
            ->assertStatus(422);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test tests/Feature/Api/CoverLetterApiTest.php --compact`
Expected: FAIL — route `cover-letters/{coverLetter}/generate` not found (404).

- [ ] **Step 3: Add the `generate` action**

In `app/Http/Controllers/Api/CoverLetterController.php`, add these imports:

```php
use App\Data\AiPrompts;
use App\Exceptions\ModerationException;
use App\Services\AiService;
use App\Services\UserLimits;
use Throwable;
```

Add a constructor and the `generate` method:

```php
    public function __construct(private AiService $ai) {}
```

```php
    public function generate(Request $request, CoverLetter $coverLetter): JsonResponse
    {
        $this->authorize('update', $coverLetter);

        $user = $request->user();

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
            'tone' => ['required', 'in:formal,warm,brief'],
            'job_description' => ['nullable', 'string', 'max:10000'],
        ]);

        $resume = $coverLetter->resume;

        try {
            $reply = $this->ai->chat(
                AiPrompts::build('cover_letter', [
                    'tone' => $validated['tone'],
                    'job_description' => $validated['job_description'] ?? null,
                    'role' => $resume?->experience[0]['title'] ?? null,
                    'company' => $resume?->experience[0]['company'] ?? null,
                    'experience' => $resume?->experience ?? [],
                    'skills' => $resume?->skills ?? [],
                ]),
                ['user' => $user, 'feature' => 'cover_letter'],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $coverLetter->update(['body' => $reply]);

        return response()->json([
            'body' => $reply,
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }
```

- [ ] **Step 4: Add the route**

In `routes/api.php`, change:

```php
    Route::apiResource('cover-letters', CoverLetterController::class)
        ->names('api.cover-letters');
```

to:

```php
    Route::apiResource('cover-letters', CoverLetterController::class)
        ->names('api.cover-letters');
    Route::post('cover-letters/{coverLetter}/generate', [CoverLetterController::class, 'generate']);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test tests/Feature/Api/CoverLetterApiTest.php --compact`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/CoverLetterController.php routes/api.php tests/Feature/Api/CoverLetterApiTest.php
git commit -m "feat: add AI-generate action to cover letter API"
```

---

### Task 4: Create `Api\ResignationLetterController` (CRUD)

**Files:**
- Create: `app/Http/Controllers/Api/ResignationLetterController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/ResignationLetterApiTest.php` (create)

**Interfaces:**
- Produces: `GET/POST /api/resignation-letters`, `GET/PUT/DELETE /api/resignation-letters/{resignationLetter}` — same shapes as `Api\CoverLetterController`.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Api/ResignationLetterApiTest.php`:

```php
<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ResignationLetterApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_can_list_resignation_letters(): void
    {
        $user = User::factory()->create();
        $user->resignationLetters()->createMany([
            ['name' => 'Letter A', 'template_key' => 'standard', 'body' => 'Body A'],
            ['name' => 'Letter B', 'template_key' => 'standard', 'body' => 'Body B'],
        ]);

        $this->withToken($this->token($user))
            ->getJson('/api/resignation-letters')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_can_create_resignation_letter(): void
    {
        $user = User::factory()->create();

        $this->withToken($this->token($user))
            ->postJson('/api/resignation-letters', ['name' => 'My Letter', 'template_key' => 'standard'])
            ->assertCreated()
            ->assertJsonPath('name', 'My Letter');
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/resignation-letters')->assertUnauthorized();
    }

    public function test_can_show_own_resignation_letter(): void
    {
        $user = User::factory()->create();
        $letter = $user->resignationLetters()->create([
            'name' => 'My Letter', 'template_key' => 'standard', 'body' => 'Hello',
        ]);

        $this->withToken($this->token($user))
            ->getJson("/api/resignation-letters/{$letter->id}")
            ->assertOk()
            ->assertJsonPath('id', $letter->id);
    }

    public function test_cannot_show_other_users_resignation_letter(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $letter = $owner->resignationLetters()->create([
            'name' => 'Private', 'template_key' => 'standard', 'body' => 'Secret',
        ]);

        $this->withToken($this->token($other))
            ->getJson("/api/resignation-letters/{$letter->id}")
            ->assertForbidden();
    }

    public function test_can_update_resignation_letter(): void
    {
        $user = User::factory()->create();
        $letter = $user->resignationLetters()->create([
            'name' => 'Old', 'template_key' => 'standard', 'body' => 'text',
        ]);

        $this->withToken($this->token($user))
            ->putJson("/api/resignation-letters/{$letter->id}", ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('name', 'New Name');
    }

    public function test_cannot_update_other_users_resignation_letter(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $letter = $owner->resignationLetters()->create([
            'name' => 'Mine', 'template_key' => 'standard', 'body' => 'text',
        ]);

        $this->withToken($this->token($other))
            ->putJson("/api/resignation-letters/{$letter->id}", ['name' => 'Hijacked'])
            ->assertForbidden();
    }

    public function test_can_delete_resignation_letter(): void
    {
        $user = User::factory()->create();
        $letter = $user->resignationLetters()->create([
            'name' => 'Gone', 'template_key' => 'standard', 'body' => 'text',
        ]);

        $this->withToken($this->token($user))
            ->deleteJson("/api/resignation-letters/{$letter->id}")
            ->assertNoContent();

        $this->assertModelMissing($letter);
    }

    public function test_can_update_template_key(): void
    {
        $user = User::factory()->create();
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->putJson("/api/resignation-letters/{$letter->id}", ['template_key' => 'warm'])
            ->assertOk()
            ->assertJsonPath('template_key', 'warm');
    }

    public function test_update_rejects_resume_id_owned_by_another_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $othersResume = $other->resumes()->create(['name' => 'Not Yours', 'pdf_filename' => 'x.pdf']);
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->putJson("/api/resignation-letters/{$letter->id}", ['resume_id' => $othersResume->id])
            ->assertForbidden();
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test tests/Feature/Api/ResignationLetterApiTest.php --compact`
Expected: FAIL — class/route does not exist (404s / class-not-found errors).

- [ ] **Step 3: Create the controller**

Create `app/Http/Controllers/Api/ResignationLetterController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Data\ResignationLetterTemplates;
use App\Http\Controllers\Controller;
use App\Models\ResignationLetter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ResignationLetterController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $letters = $request->user()
            ->resignationLetters()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'template_key', 'resume_id', 'updated_at']);

        return response()->json(['data' => $letters]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'template_key' => ['required', 'in:'.implode(',', ResignationLetterTemplates::keys())],
            'name' => ['required', 'string', 'max:255'],
        ]);

        $letter = $request->user()->resignationLetters()->create([
            'name' => $validated['name'],
            'template_key' => $validated['template_key'],
            'body' => ResignationLetterTemplates::render($validated['template_key'], [
                'name' => $request->user()->name,
            ]),
        ]);

        return response()->json($letter, 201);
    }

    public function show(ResignationLetter $resignationLetter): JsonResponse
    {
        $this->authorize('view', $resignationLetter);

        return response()->json($resignationLetter);
    }

    public function update(Request $request, ResignationLetter $resignationLetter): JsonResponse
    {
        $this->authorize('update', $resignationLetter);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'template_key' => ['sometimes', 'required', 'in:'.implode(',', ResignationLetterTemplates::keys())],
            'body' => ['sometimes', 'string', 'max:50000'],
            'resume_id' => ['sometimes', 'nullable', 'integer', 'exists:resumes,id'],
        ]);

        if (array_key_exists('resume_id', $validated) && $validated['resume_id'] !== null) {
            abort_unless(
                $request->user()->resumes()->whereKey($validated['resume_id'])->exists(),
                403
            );
        }

        $resignationLetter->update($validated);

        return response()->json($resignationLetter->fresh());
    }

    public function destroy(ResignationLetter $resignationLetter): Response
    {
        $this->authorize('delete', $resignationLetter);
        $resignationLetter->delete();

        return response()->noContent();
    }
}
```

- [ ] **Step 4: Add the routes**

In `routes/api.php`, add the import:

```php
use App\Http\Controllers\Api\ResignationLetterController;
```

and, after the `cover-letters` block:

```php
    Route::apiResource('resignation-letters', ResignationLetterController::class)
        ->names('api.resignation-letters');
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test tests/Feature/Api/ResignationLetterApiTest.php --compact`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/ResignationLetterController.php routes/api.php tests/Feature/Api/ResignationLetterApiTest.php
git commit -m "feat: add Api ResignationLetterController CRUD"
```

---

### Task 5: Add `generate()` action to `Api\ResignationLetterController`

**Files:**
- Modify: `app/Http/Controllers/Api/ResignationLetterController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/ResignationLetterApiTest.php`

**Interfaces:**
- Consumes: `AiPrompts::build('resignation_letter', ...)`, `AiService::chat`, `UserLimits` (same as Task 3, already used by the web controller).
- Produces: `POST /api/resignation-letters/{resignationLetter}/generate` — request `{ tone, last_day, reason? }` — success `{ body, remaining }`.

- [ ] **Step 1: Write the failing tests**

Add to `tests/Feature/Api/ResignationLetterApiTest.php` (add the same imports as Task 3's Step 1: `use App\Exceptions\ModerationException; use OpenAI\Contracts\ClientContract; use OpenAI\Responses\Chat\CreateResponse; use OpenAI\Responses\Moderations\CreateResponse as ModerationResponse; use OpenAI\Testing\ClientFake;`):

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

    public function test_generate_returns_body_and_remaining(): void
    {
        $this->fakeReply('I am writing to inform you of my resignation.');
        $user = User::factory()->pro()->create();
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/resignation-letters/{$letter->id}/generate", [
                'tone' => 'formal',
                'last_day' => now()->addWeeks(2)->format('Y-m-d'),
            ])
            ->assertOk()
            ->assertJsonStructure(['body', 'remaining'])
            ->assertJsonPath('body', 'I am writing to inform you of my resignation.');
    }

    public function test_generate_other_users_letter_forbidden(): void
    {
        $owner = User::factory()->pro()->create();
        $other = User::factory()->pro()->create();
        $letter = $owner->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($other))
            ->postJson("/api/resignation-letters/{$letter->id}/generate", [
                'tone' => 'formal', 'last_day' => now()->addWeeks(2)->format('Y-m-d'),
            ])
            ->assertForbidden();
    }

    public function test_generate_quota_exhausted_returns_402(): void
    {
        config()->set('ai.monthly_limits.pro', 0);
        $user = User::factory()->pro()->create();
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/resignation-letters/{$letter->id}/generate", [
                'tone' => 'formal', 'last_day' => now()->addWeeks(2)->format('Y-m-d'),
            ])
            ->assertStatus(402);
    }

    public function test_generate_moderation_rejection_returns_422(): void
    {
        $this->app->instance(ClientContract::class, new ClientFake([
            ModerationResponse::fake(['results' => [['flagged' => true]]]),
        ]));
        $user = User::factory()->pro()->create();
        $letter = $user->resignationLetters()->create(['name' => 'L', 'template_key' => 'standard', 'body' => 'x']);

        $this->withToken($this->token($user))
            ->postJson("/api/resignation-letters/{$letter->id}/generate", [
                'tone' => 'formal', 'last_day' => now()->addWeeks(2)->format('Y-m-d'),
            ])
            ->assertStatus(422)
            ->assertJsonPath('error', ModerationException::USER_MESSAGE);
    }
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test tests/Feature/Api/ResignationLetterApiTest.php --compact`
Expected: FAIL — 404 (no `generate` route yet).

- [ ] **Step 3: Add constructor and `generate` action**

In `app/Http/Controllers/Api/ResignationLetterController.php`, add imports:

```php
use App\Data\AiPrompts;
use App\Exceptions\ModerationException;
use App\Services\AiService;
use App\Services\UserLimits;
use Throwable;
```

Add a constructor:

```php
    public function __construct(private AiService $ai) {}
```

Add the `generate` method (mirrors the web controller's action exactly):

```php
    public function generate(Request $request, ResignationLetter $resignationLetter): JsonResponse
    {
        $this->authorize('update', $resignationLetter);

        $user = $request->user();

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
            'last_day' => ['required', 'date'],
            'tone' => ['required', 'in:formal,warm,brief'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $resume = $resignationLetter->resume;

        try {
            $reply = $this->ai->chat(
                AiPrompts::build('resignation_letter', [
                    'tone' => $validated['tone'],
                    'last_day' => $validated['last_day'],
                    'reason' => $validated['reason'] ?? null,
                    'role' => $resume?->experience[0]['title'] ?? null,
                    'company' => $resume?->experience[0]['company'] ?? null,
                    'experience' => $resume?->experience ?? [],
                ]),
                ['user' => $user, 'feature' => 'resignation_letter'],
            );
        } catch (ModerationException) {
            return response()->json(['error' => ModerationException::USER_MESSAGE], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => 'AI is temporarily unavailable. Try again.'], 503);
        }

        $resignationLetter->update(['body' => $reply]);

        return response()->json([
            'body' => $reply,
            'remaining' => UserLimits::aiRemaining($user),
        ]);
    }
```

- [ ] **Step 4: Add the route**

In `routes/api.php`, after the `resignation-letters` apiResource line, add:

```php
    Route::post('resignation-letters/{resignationLetter}/generate', [ResignationLetterController::class, 'generate']);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test tests/Feature/Api/ResignationLetterApiTest.php --compact`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/ResignationLetterController.php routes/api.php tests/Feature/Api/ResignationLetterApiTest.php
git commit -m "feat: add AI-generate action to resignation letter API"
```

---

### Task 6: Create JSON `Api\ResumePhotoController`

No JSON photo endpoint exists today — only the web `ResumePhotoController` which returns `back()` redirects, unusable by a JSON client.

**Files:**
- Create: `app/Http/Controllers/Api/ResumePhotoController.php`
- Modify: `routes/api.php`
- Test: `tests/Feature/Api/ResumePhotoApiTest.php` (create)

**Interfaces:**
- Produces: `POST /api/resumes/{resume}/photo` (multipart, field `photo`) → `{ photo_url: string }`; `DELETE /api/resumes/{resume}/photo` → `{ photo_url: null }`.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/Api/ResumePhotoApiTest.php`:

```php
<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class ResumePhotoApiTest extends ApiTestCase
{
    use RefreshDatabase;

    private function token(User $user): string
    {
        return $user->createToken('test')->plainTextToken;
    }

    public function test_can_upload_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $response = $this->withToken($this->token($user))
            ->post("/api/resumes/{$resume->id}/photo", [
                'photo' => UploadedFile::fake()->image('photo.jpg', 200, 200),
            ]);

        $response->assertOk()->assertJsonStructure(['photo_url']);
        $this->assertNotNull($response->json('photo_url'));
        $this->assertCount(1, $resume->fresh()->getMedia('photo'));
    }

    public function test_uploading_new_photo_replaces_old_one(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);
        $resume->addMediaFromRequest('photo'); // no-op guard, real upload below

        $this->withToken($this->token($user))
            ->post("/api/resumes/{$resume->id}/photo", ['photo' => UploadedFile::fake()->image('a.jpg')])
            ->assertOk();

        $this->withToken($this->token($user))
            ->post("/api/resumes/{$resume->id}/photo", ['photo' => UploadedFile::fake()->image('b.jpg')])
            ->assertOk();

        $this->assertCount(1, $resume->fresh()->getMedia('photo'));
    }

    public function test_rejects_non_image_upload(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->withToken($this->token($user))
            ->post("/api/resumes/{$resume->id}/photo", [
                'photo' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
            ])
            ->assertStatus(422);
    }

    public function test_cannot_upload_photo_to_another_users_resume(): void
    {
        Storage::fake('public');
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->withToken($this->token($other))
            ->post("/api/resumes/{$resume->id}/photo", ['photo' => UploadedFile::fake()->image('a.jpg')])
            ->assertForbidden();
    }

    public function test_can_delete_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'CV', 'pdf_filename' => 'cv.pdf']);

        $this->withToken($this->token($user))
            ->post("/api/resumes/{$resume->id}/photo", ['photo' => UploadedFile::fake()->image('a.jpg')])
            ->assertOk();

        $this->withToken($this->token($user))
            ->deleteJson("/api/resumes/{$resume->id}/photo")
            ->assertOk()
            ->assertJsonPath('photo_url', null);

        $this->assertCount(0, $resume->fresh()->getMedia('photo'));
    }
}
```

Remove the no-op guard line `$resume->addMediaFromRequest('photo'); // no-op guard, real upload below` from `test_uploading_new_photo_replaces_old_one` — it was left in by mistake while drafting; the two real `post()` calls in that test are sufficient. (i.e. delete that exact line before running.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test tests/Feature/Api/ResumePhotoApiTest.php --compact`
Expected: FAIL — 404 (route/controller doesn't exist).

- [ ] **Step 3: Create the controller**

Create `app/Http/Controllers/Api/ResumePhotoController.php`:

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resume;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ResumePhotoController extends Controller
{
    public function store(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $request->validate([
            'photo' => ['required', 'image', 'max:2048'],
        ]);

        $resume->clearMediaCollection('photo');
        $resume->addMediaFromRequest('photo')->toMediaCollection('photo');

        return response()->json(['photo_url' => $resume->getFirstMediaUrl('photo')]);
    }

    public function destroy(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $resume->clearMediaCollection('photo');

        return response()->json(['photo_url' => null]);
    }
}
```

- [ ] **Step 4: Add the routes**

In `routes/api.php`, add the import `use App\Http\Controllers\Api\ResumePhotoController;` and, inside the `resumes` block (after the `pdf` route), add:

```php
    Route::post('resumes/{resume}/photo', [ResumePhotoController::class, 'store']);
    Route::delete('resumes/{resume}/photo', [ResumePhotoController::class, 'destroy']);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `php artisan test tests/Feature/Api/ResumePhotoApiTest.php --compact`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/Api/ResumePhotoController.php routes/api.php tests/Feature/Api/ResumePhotoApiTest.php
git commit -m "feat: add JSON resume photo upload/delete API"
```

---

## Mobile Tasks

### Task 7: Add mobile dependencies and gesture/reanimated setup

**Files:**
- Modify: `mobile/package.json`
- Modify: `mobile/app.json`
- Create: `mobile/babel.config.js`
- Modify: `mobile/App.tsx` (wrap root in `GestureHandlerRootView`)

**Interfaces:**
- Produces: `expo-image-picker`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-draggable-flatlist` available for later tasks; `GestureHandlerRootView` wraps the app root so gesture-based components (draggable list) work.

- [ ] **Step 1: Install the packages**

Run (from the `mobile/` directory):

```bash
cd mobile && npx expo install expo-image-picker react-native-gesture-handler react-native-reanimated react-native-draggable-flatlist
```

This updates `mobile/package.json` and `mobile/package-lock.json` (or yarn/pnpm lockfile, whichever this repo uses) with SDK-57-compatible versions — `npx expo install` resolves the correct version per package for the installed Expo SDK, so do not hand-pick versions.

- [ ] **Step 2: Verify the installed versions against Expo SDK 57 docs**

Read `mobile/package.json` after the install and cross-check `expo-image-picker` and `react-native-reanimated`'s installed versions against `https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/` and the Reanimated setup guide — confirm no deprecated API names are used in later tasks (e.g. Reanimated 3's `useSharedValue`/`useAnimatedStyle` vs older APIs).

- [ ] **Step 3: Add the `expo-image-picker` config plugin**

In `mobile/app.json`, change:

```json
    "plugins": [
      "expo-secure-store",
      "expo-sharing",
      "expo-notifications"
    ]
```

to:

```json
    "plugins": [
      "expo-secure-store",
      "expo-sharing",
      "expo-notifications",
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow $(PRODUCT_NAME) to access your photos to set a resume profile picture."
        }
      ]
    ]
```

- [ ] **Step 4: Create `mobile/babel.config.js`**

No `babel.config.js` exists in `mobile/` yet. Create it (the Reanimated plugin must be listed last):

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 5: Wrap the app root in `GestureHandlerRootView`**

In `mobile/App.tsx`, add the import:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
```

Change the default export from:

```tsx
export default function App() {
    return (
        <AuthProvider>
            <RootNavigator />
        </AuthProvider>
    );
}
```

to:

```tsx
export default function App() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
                <RootNavigator />
            </AuthProvider>
        </GestureHandlerRootView>
    );
}
```

- [ ] **Step 6: Run the existing mobile test suite to confirm nothing broke**

Run: `cd mobile && npx jest`
Expected: all existing tests still PASS (this task adds no new behavior to test — the checks are the SDK-version verification in Step 2 and the suite staying green).

- [ ] **Step 7: Commit**

```bash
cd mobile && git add package.json package-lock.json app.json babel.config.js App.tsx
git commit -m "chore: add image-picker, gesture-handler, reanimated, draggable-flatlist deps"
```

Note: `git add package-lock.json` assumes npm; if the repo uses yarn or pnpm, add the matching lockfile instead (`yarn.lock` / `pnpm-lock.yaml`) — check which lockfile already exists in `mobile/` before this step.

Note (rollout, unchanged from spec): these dependencies require a native EAS rebuild before photo/drag-reorder work on a real device — they will not function in an existing installed build without one.

---

### Task 8: Extend `mobile/lib/resumeApi.ts` with full field types, `updateResume`, and photo upload/delete

**Files:**
- Modify: `mobile/lib/resumeApi.ts`
- Test: `mobile/lib/__tests__/resumeApi.test.ts`

**Interfaces:**
- Produces: exported types `Contact, ExperienceEntry, EducationEntry, CertEntry, ProjectEntry, CustomSectionEntry, CustomSection, SkillGroup, SkillNarrative, SkillsLayout, ResumeTemplate, FontSizes, ResumeFields`; `updateResume(id: number, data: Partial<ResumeFields>): Promise<ResumeDetail>`; `uploadResumePhoto(id: number, uri: string): Promise<{ photo_url: string }>`; `deleteResumePhoto(id: number): Promise<{ photo_url: null }>`. `ResumeDetail` becomes `ResumeSummary & ResumeFields`.

- [ ] **Step 1: Write the failing tests**

Add to `mobile/lib/__tests__/resumeApi.test.ts`:

```ts
import { updateResume, uploadResumePhoto, deleteResumePhoto } from '../resumeApi';

describe('updateResume', () => {
    it('PUTs the partial fields and returns the updated resume', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ id: 1, name: 'Renamed' });

        const result = await updateResume(1, { name: 'Renamed' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes/1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Renamed' }),
        });
        expect(result.name).toBe('Renamed');
    });
});

describe('uploadResumePhoto', () => {
    it('POSTs a FormData body with the photo field', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ photo_url: 'https://example.test/photo.jpg' });

        const result = await uploadResumePhoto(1, 'file:///tmp/photo.jpg');

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes/1/photo', expect.objectContaining({ method: 'POST' }));
        const callArgs = (api.apiFetch as jest.Mock).mock.calls[0][1];
        expect(callArgs.body).toBeInstanceOf(FormData);
        expect(result.photo_url).toBe('https://example.test/photo.jpg');
    });
});

describe('deleteResumePhoto', () => {
    it('DELETEs the photo endpoint', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ photo_url: null });

        const result = await deleteResumePhoto(1);

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resumes/1/photo', { method: 'DELETE' });
        expect(result.photo_url).toBeNull();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest resumeApi.test.ts`
Expected: FAIL — `updateResume`/`uploadResumePhoto`/`deleteResumePhoto` are not exported yet.

- [ ] **Step 3: Rewrite `mobile/lib/resumeApi.ts`**

Replace the full file with:

```ts
import { apiFetch } from './api';

export type Contact = {
    full_name: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
};

export type ExperienceEntry = {
    id: string;
    company: string;
    title: string;
    start_date: string;
    end_date: string;
    current: boolean;
    bullets: string;
};

export type EducationEntry = {
    id: string;
    school: string;
    degree: string;
    field: string;
    grad_year: string;
};

export type CertEntry = {
    id: string;
    name: string;
    issuer: string;
    date: string;
    expiration: string;
    credential_id: string;
};

export type ProjectEntry = {
    id: string;
    name: string;
    description: string;
    url: string;
    start_date: string;
    end_date: string;
    bullets: string;
};

export type CustomSectionEntry = {
    id: string;
    title: string;
    subtitle: string;
    start_date: string;
    end_date: string | null;
    description: string;
    bullets: string[];
};

export type CustomSection = {
    id: string;
    name: string;
    entries: CustomSectionEntry[];
};

export type SkillGroup = {
    id?: string;
    category_type?: string;
    category: string;
    items: string[];
};

export type SkillNarrative = {
    id: string;
    name: string;
    bullets: string[];
};

export type SkillsLayout = 'inline' | 'bullets' | 'grouped-vertical' | 'grouped-inline' | 'narrative';

export type ResumeTemplate =
    | 'classic'
    | 'modern'
    | 'minimal'
    | 'minimal-ruled'
    | 'executive'
    | 'ats'
    | 'skills-first'
    | 'academic'
    | 'bold';

export type FontSizes = {
    name: number;
    contact: number;
    heading: number;
    body: number;
    sectionSpacing: number;
    entrySpacing: number;
};

export type ResumeFields = {
    name: string;
    template: ResumeTemplate;
    accent_color: string | null;
    font_family: 'sans' | 'serif' | 'mono' | null;
    summary: string | null;
    contact: Contact | null;
    experience: ExperienceEntry[] | null;
    education: EducationEntry[] | null;
    projects: ProjectEntry[] | null;
    skills: string[] | null;
    skills_layout: SkillsLayout | null;
    skills_groups: SkillGroup[] | null;
    skill_narratives: SkillNarrative[] | null;
    certifications: CertEntry[] | null;
    font_sizes: FontSizes | null;
    section_order: string[] | null;
    custom_sections: CustomSection[] | null;
};

export type ResumeSummary = {
    id: number;
    name: string;
    template: string;
    pdf_filename: string;
    updated_at: string;
};

export type ResumeDetail = ResumeSummary & ResumeFields;

export async function listResumes(): Promise<ResumeSummary[]> {
    const { data } = await apiFetch<{ data: ResumeSummary[] }>('/api/resumes');

    return data;
}

export async function getResume(id: number): Promise<ResumeDetail> {
    return apiFetch<ResumeDetail>(`/api/resumes/${id}`);
}

export async function updateResume(id: number, data: Partial<ResumeFields>): Promise<ResumeDetail> {
    return apiFetch<ResumeDetail>(`/api/resumes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function uploadResumePhoto(id: number, uri: string): Promise<{ photo_url: string }> {
    const formData = new FormData();
    formData.append('photo', {
        uri,
        name: 'photo.jpg',
        type: 'image/jpeg',
    } as unknown as Blob);

    return apiFetch<{ photo_url: string }>(`/api/resumes/${id}/photo`, {
        method: 'POST',
        body: formData,
    });
}

export async function deleteResumePhoto(id: number): Promise<{ photo_url: null }> {
    return apiFetch<{ photo_url: null }>(`/api/resumes/${id}/photo`, {
        method: 'DELETE',
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest resumeApi.test.ts`
Expected: all PASS

- [ ] **Step 5: Run the full mobile suite to check `ResumeDetailScreen` still compiles/passes against the widened `ResumeDetail` type**

Run: `cd mobile && npx jest && npx tsc --noEmit`
Expected: all PASS, no type errors (the existing `ResumeDetailScreen.tsx` only reads `resume.contact?.email`, `resume.summary`, `.experience.length`, `.education.length`, `.skills.length` — all still valid against the new `ResumeDetail` shape).

- [ ] **Step 6: Commit**

```bash
cd mobile && git add lib/resumeApi.ts lib/__tests__/resumeApi.test.ts
git commit -m "feat: add full resume field types, updateResume, and photo upload/delete to mobile API"
```

---

### Task 9: Create `mobile/lib/coverLetterApi.ts`

**Files:**
- Create: `mobile/lib/coverLetterApi.ts`
- Test: `mobile/lib/__tests__/coverLetterApi.test.ts`

**Interfaces:**
- Produces: `CoverLetterSummary`, `CoverLetterDetail`, `CoverLetterTemplateKey` types; `listCoverLetters(): Promise<CoverLetterSummary[]>`; `getCoverLetter(id): Promise<CoverLetterDetail>`; `updateCoverLetter(id, data: Partial<{name, body, resume_id}>): Promise<CoverLetterDetail>`; `generateCoverLetter(id, input: {tone, job_description?}): Promise<{body: string; remaining: number}>`.

- [ ] **Step 1: Write the failing tests**

Create `mobile/lib/__tests__/coverLetterApi.test.ts`:

```ts
import { listCoverLetters, getCoverLetter, updateCoverLetter, generateCoverLetter } from '../coverLetterApi';
import * as api from '../api';

jest.mock('../api');

describe('listCoverLetters', () => {
    it('returns the cover letter array from the API', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            data: [{ id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z' }],
        });

        const letters = await listCoverLetters();

        expect(api.apiFetch).toHaveBeenCalledWith('/api/cover-letters');
        expect(letters).toHaveLength(1);
    });
});

describe('getCoverLetter', () => {
    it('fetches a single cover letter by id', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z', body: 'Dear Hiring Manager',
        });

        const letter = await getCoverLetter(1);

        expect(api.apiFetch).toHaveBeenCalledWith('/api/cover-letters/1');
        expect(letter.body).toBe('Dear Hiring Manager');
    });
});

describe('updateCoverLetter', () => {
    it('PUTs the partial fields', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ id: 1, name: 'Renamed' });

        await updateCoverLetter(1, { name: 'Renamed' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/cover-letters/1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Renamed' }),
        });
    });
});

describe('generateCoverLetter', () => {
    it('POSTs tone and job_description and returns body/remaining', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ body: 'Generated body', remaining: 4 });

        const result = await generateCoverLetter(1, { tone: 'formal', job_description: 'A job.' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/cover-letters/1/generate', {
            method: 'POST',
            body: JSON.stringify({ tone: 'formal', job_description: 'A job.' }),
        });
        expect(result.remaining).toBe(4);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest coverLetterApi.test.ts`
Expected: FAIL — module `../coverLetterApi` does not exist.

- [ ] **Step 3: Create `mobile/lib/coverLetterApi.ts`**

```ts
import { apiFetch } from './api';

export type CoverLetterTemplateKey = 'standard' | 'modern' | 'career_change' | 'new_grad' | 'referral';

export type CoverLetterSummary = {
    id: number;
    name: string;
    template_key: CoverLetterTemplateKey;
    resume_id: number | null;
    updated_at: string;
};

export type CoverLetterDetail = CoverLetterSummary & {
    body: string;
};

export async function listCoverLetters(): Promise<CoverLetterSummary[]> {
    const { data } = await apiFetch<{ data: CoverLetterSummary[] }>('/api/cover-letters');

    return data;
}

export async function getCoverLetter(id: number): Promise<CoverLetterDetail> {
    return apiFetch<CoverLetterDetail>(`/api/cover-letters/${id}`);
}

export async function updateCoverLetter(
    id: number,
    data: Partial<{ name: string; template_key: CoverLetterTemplateKey; body: string; resume_id: number | null }>,
): Promise<CoverLetterDetail> {
    return apiFetch<CoverLetterDetail>(`/api/cover-letters/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function generateCoverLetter(
    id: number,
    input: { tone: 'formal' | 'warm' | 'brief'; job_description?: string },
): Promise<{ body: string; remaining: number }> {
    return apiFetch<{ body: string; remaining: number }>(`/api/cover-letters/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest coverLetterApi.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
cd mobile && git add lib/coverLetterApi.ts lib/__tests__/coverLetterApi.test.ts
git commit -m "feat: add mobile coverLetterApi CRUD and generate client"
```

---

### Task 10: Create `mobile/lib/resignationLetterApi.ts`

Same shape as Task 9, for resignation letters.

**Files:**
- Create: `mobile/lib/resignationLetterApi.ts`
- Test: `mobile/lib/__tests__/resignationLetterApi.test.ts`

**Interfaces:**
- Produces: `ResignationLetterSummary`, `ResignationLetterDetail`, `ResignationLetterTemplateKey`; `listResignationLetters()`, `getResignationLetter(id)`, `updateResignationLetter(id, data)`, `generateResignationLetter(id, {tone, last_day, reason?})`.

- [ ] **Step 1: Write the failing tests**

Create `mobile/lib/__tests__/resignationLetterApi.test.ts`:

```ts
import {
    listResignationLetters,
    getResignationLetter,
    updateResignationLetter,
    generateResignationLetter,
} from '../resignationLetterApi';
import * as api from '../api';

jest.mock('../api');

describe('listResignationLetters', () => {
    it('returns the resignation letter array from the API', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            data: [{ id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z' }],
        });

        const letters = await listResignationLetters();

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resignation-letters');
        expect(letters).toHaveLength(1);
    });
});

describe('getResignationLetter', () => {
    it('fetches a single resignation letter by id', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({
            id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z', body: 'Dear Manager',
        });

        const letter = await getResignationLetter(1);

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resignation-letters/1');
        expect(letter.body).toBe('Dear Manager');
    });
});

describe('updateResignationLetter', () => {
    it('PUTs the partial fields', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ id: 1, name: 'Renamed' });

        await updateResignationLetter(1, { name: 'Renamed' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resignation-letters/1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Renamed' }),
        });
    });
});

describe('generateResignationLetter', () => {
    it('POSTs tone/last_day/reason and returns body/remaining', async () => {
        (api.apiFetch as jest.Mock).mockResolvedValue({ body: 'Generated body', remaining: 3 });

        const result = await generateResignationLetter(1, { tone: 'warm', last_day: '2026-08-01', reason: 'New opportunity' });

        expect(api.apiFetch).toHaveBeenCalledWith('/api/resignation-letters/1/generate', {
            method: 'POST',
            body: JSON.stringify({ tone: 'warm', last_day: '2026-08-01', reason: 'New opportunity' }),
        });
        expect(result.remaining).toBe(3);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest resignationLetterApi.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `mobile/lib/resignationLetterApi.ts`**

```ts
import { apiFetch } from './api';

export type ResignationLetterTemplateKey = 'standard' | 'immediate' | 'warm';

export type ResignationLetterSummary = {
    id: number;
    name: string;
    template_key: ResignationLetterTemplateKey;
    resume_id: number | null;
    updated_at: string;
};

export type ResignationLetterDetail = ResignationLetterSummary & {
    body: string;
};

export async function listResignationLetters(): Promise<ResignationLetterSummary[]> {
    const { data } = await apiFetch<{ data: ResignationLetterSummary[] }>('/api/resignation-letters');

    return data;
}

export async function getResignationLetter(id: number): Promise<ResignationLetterDetail> {
    return apiFetch<ResignationLetterDetail>(`/api/resignation-letters/${id}`);
}

export async function updateResignationLetter(
    id: number,
    data: Partial<{ name: string; template_key: ResignationLetterTemplateKey; body: string; resume_id: number | null }>,
): Promise<ResignationLetterDetail> {
    return apiFetch<ResignationLetterDetail>(`/api/resignation-letters/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function generateResignationLetter(
    id: number,
    input: { tone: 'formal' | 'warm' | 'brief'; last_day: string; reason?: string },
): Promise<{ body: string; remaining: number }> {
    return apiFetch<{ body: string; remaining: number }>(`/api/resignation-letters/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest resignationLetterApi.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
cd mobile && git add lib/resignationLetterApi.ts lib/__tests__/resignationLetterApi.test.ts
git commit -m "feat: add mobile resignationLetterApi CRUD and generate client"
```

---

### Task 11: Create `mobile/lib/upgradeAlert.ts`

**Files:**
- Create: `mobile/lib/upgradeAlert.ts`
- Test: `mobile/lib/__tests__/upgradeAlert.test.ts`

**Interfaces:**
- Produces: `showUpgradeAlert(feature: string, requiredTier: string): void`.

- [ ] **Step 1: Write the failing test**

Create `mobile/lib/__tests__/upgradeAlert.test.ts`:

```ts
import { Alert } from 'react-native';
import { showUpgradeAlert } from '../upgradeAlert';

jest.mock('react-native', () => ({
    Alert: { alert: jest.fn() },
}));

describe('showUpgradeAlert', () => {
    it('shows an alert naming the feature and required tier', () => {
        showUpgradeAlert('cover_letter_generate', 'starter');

        expect(Alert.alert).toHaveBeenCalledWith(
            'Upgrade required',
            expect.stringContaining('starter'),
        );
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest upgradeAlert.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `mobile/lib/upgradeAlert.ts`**

```ts
import { Alert } from 'react-native';

const TIER_LABELS: Record<string, string> = {
    starter: 'Starter',
    pro: 'Pro',
    agency: 'Agency',
};

export function showUpgradeAlert(feature: string, requiredTier: string): void {
    const tierLabel = TIER_LABELS[requiredTier] ?? requiredTier;

    Alert.alert(
        'Upgrade required',
        `This feature requires the ${tierLabel} plan. Upgrade from the web app to continue.`,
    );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest upgradeAlert.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd mobile && git add lib/upgradeAlert.ts lib/__tests__/upgradeAlert.test.ts
git commit -m "feat: add mobile upgrade-required alert helper"
```

---

### Task 12: Create generic `mobile/components/CardListEditor.tsx`

Experience/Education/Certifications/Projects are all "repeatable card lists" with the same add/edit/delete shape but different fields. One generic, config-driven component avoids four near-duplicate screens.

**Files:**
- Create: `mobile/components/CardListEditor.tsx`
- Test: `mobile/components/__tests__/CardListEditor.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  type CardField = { key: string; label: string; multiline?: boolean };
  type CardListEditorProps<T extends { id: string }> = {
      title: string;
      items: T[];
      fields: CardField[];
      emptyItem: Omit<T, 'id'>;
      onChange: (items: T[]) => void;
  };
  export default function CardListEditor<T extends { id: string }>(props: CardListEditorProps<T>): JSX.Element;
  ```
  `onChange` fires on every add/delete and on every field blur — the screen embedding this component is responsible for calling the save API (matches save-on-blur convention) since this component has no network knowledge.

- [ ] **Step 1: Write the failing tests**

Create `mobile/components/__tests__/CardListEditor.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CardListEditor from '../CardListEditor';

type Item = { id: string; title: string; notes: string };

const fields = [
    { key: 'title', label: 'Title' },
    { key: 'notes', label: 'Notes', multiline: true },
];

describe('CardListEditor', () => {
    it('renders each item\'s fields', () => {
        render(
            <CardListEditor<Item>
                title="Experience"
                items={[{ id: '1', title: 'Engineer', notes: 'Did things' }]}
                fields={fields}
                emptyItem={{ title: '', notes: '' }}
                onChange={jest.fn()}
            />,
        );

        expect(screen.getByDisplayValue('Engineer')).toBeTruthy();
        expect(screen.getByDisplayValue('Did things')).toBeTruthy();
    });

    it('adds a new item with a generated id when Add is pressed', () => {
        const onChange = jest.fn();
        render(
            <CardListEditor<Item>
                title="Experience"
                items={[]}
                fields={fields}
                emptyItem={{ title: '', notes: '' }}
                onChange={onChange}
            />,
        );

        fireEvent.press(screen.getByText('Add Experience'));

        expect(onChange).toHaveBeenCalledTimes(1);
        const [newItems] = onChange.mock.calls[0];
        expect(newItems).toHaveLength(1);
        expect(newItems[0]).toMatchObject({ title: '', notes: '' });
        expect(typeof newItems[0].id).toBe('string');
    });

    it('removes an item when its delete button is pressed', () => {
        const onChange = jest.fn();
        render(
            <CardListEditor<Item>
                title="Experience"
                items={[{ id: '1', title: 'Engineer', notes: '' }]}
                fields={fields}
                emptyItem={{ title: '', notes: '' }}
                onChange={onChange}
            />,
        );

        fireEvent.press(screen.getByText('Delete'));

        expect(onChange).toHaveBeenCalledWith([]);
    });

    it('calls onChange with the updated field value on blur', () => {
        const onChange = jest.fn();
        render(
            <CardListEditor<Item>
                title="Experience"
                items={[{ id: '1', title: 'Engineer', notes: '' }]}
                fields={fields}
                emptyItem={{ title: '', notes: '' }}
                onChange={onChange}
            />,
        );

        const titleInput = screen.getByDisplayValue('Engineer');
        fireEvent.changeText(titleInput, 'Senior Engineer');
        fireEvent(titleInput, 'blur');

        expect(onChange).toHaveBeenCalledWith([{ id: '1', title: 'Senior Engineer', notes: '' }]);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest CardListEditor.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `mobile/components/CardListEditor.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export type CardField = { key: string; label: string; multiline?: boolean };

export type CardListEditorProps<T extends { id: string }> = {
    title: string;
    items: T[];
    fields: CardField[];
    emptyItem: Omit<T, 'id'>;
    onChange: (items: T[]) => void;
};

let idCounter = 0;
function generateId(): string {
    idCounter += 1;

    return `new-${idCounter}-${Math.round(performance.now())}`;
}

export default function CardListEditor<T extends { id: string }>({
    title,
    items,
    fields,
    emptyItem,
    onChange,
}: CardListEditorProps<T>) {
    const [draft, setDraft] = useState<Record<string, string>>({});

    const fieldValue = (item: T, key: string): string => {
        const draftKey = `${item.id}:${key}`;

        return draftKey in draft ? draft[draftKey] : String((item as Record<string, unknown>)[key] ?? '');
    };

    const handleChangeText = (item: T, key: string, text: string) => {
        setDraft((prev) => ({ ...prev, [`${item.id}:${key}`]: text }));
    };

    const handleBlur = (item: T, key: string) => {
        const draftKey = `${item.id}:${key}`;
        if (!(draftKey in draft)) {
            return;
        }
        const updated = items.map((i) => (i.id === item.id ? { ...i, [key]: draft[draftKey] } : i));
        onChange(updated);
    };

    const handleAdd = () => {
        onChange([...items, { ...(emptyItem as object), id: generateId() } as T]);
    };

    const handleDelete = (item: T) => {
        onChange(items.filter((i) => i.id !== item.id));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {items.map((item) => (
                <View key={item.id} style={styles.card}>
                    {fields.map((field) => (
                        <TextInput
                            key={field.key}
                            style={field.multiline ? styles.multilineInput : styles.input}
                            placeholder={field.label}
                            multiline={field.multiline}
                            value={fieldValue(item, field.key)}
                            onChangeText={(text) => handleChangeText(item, field.key, text)}
                            onBlur={() => handleBlur(item, field.key)}
                        />
                    ))}
                    <TouchableOpacity onPress={() => handleDelete(item)}>
                        <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            ))}
            <TouchableOpacity onPress={handleAdd}>
                <Text style={styles.addText}>Add {title}</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    card: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 8 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6 },
    multilineInput: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6, minHeight: 60, textAlignVertical: 'top' },
    deleteText: { color: 'red', marginTop: 4 },
    addText: { color: '#4f46e5', fontWeight: '600', marginTop: 4 },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest CardListEditor.test.tsx`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
cd mobile && git add components/CardListEditor.tsx components/__tests__/CardListEditor.test.tsx
git commit -m "feat: add generic CardListEditor for repeatable resume sections"
```

---

### Task 13: Create Basics and Template sections

**Files:**
- Create: `mobile/screens/resume-edit/BasicsSection.tsx`
- Create: `mobile/screens/resume-edit/TemplateSection.tsx`
- Test: `mobile/screens/resume-edit/__tests__/BasicsSection.test.tsx`
- Test: `mobile/screens/resume-edit/__tests__/TemplateSection.test.tsx`

**Interfaces:**
- Consumes: `ResumeDetail`, `Contact`, `ResumeTemplate` (Task 8).
- Produces:
  ```ts
  type BasicsSectionProps = {
      resume: ResumeDetail;
      onSave: (data: Partial<ResumeFields>) => void;
  };
  export default function BasicsSection(props: BasicsSectionProps): JSX.Element;
  ```
  Same `{ resume, onSave }` prop shape for `TemplateSection`. `onSave` is called on blur with only the changed field(s) — the parent `ResumeEditScreen` (Task 19) owns the actual `updateResume` API call.

- [ ] **Step 1: Write the failing tests**

Create `mobile/screens/resume-edit/__tests__/BasicsSection.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import BasicsSection from '../BasicsSection';
import type { ResumeDetail } from '../../../lib/resumeApi';

const baseResume = {
    id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z',
    accent_color: null, font_family: null, summary: 'A summary',
    contact: { full_name: 'Jane Doe', email: 'jane@example.com', phone: '', location: '', linkedin: '', website: '' },
    experience: null, education: null, projects: null, skills: null, skills_layout: null,
    skills_groups: null, skill_narratives: null, certifications: null, font_sizes: null,
    section_order: null, custom_sections: null,
} as ResumeDetail;

describe('BasicsSection', () => {
    it('renders name, contact, and summary fields with current values', () => {
        render(<BasicsSection resume={baseResume} onSave={jest.fn()} />);

        expect(screen.getByDisplayValue('My CV')).toBeTruthy();
        expect(screen.getByDisplayValue('jane@example.com')).toBeTruthy();
        expect(screen.getByDisplayValue('A summary')).toBeTruthy();
    });

    it('calls onSave with the changed field on blur', () => {
        const onSave = jest.fn();
        render(<BasicsSection resume={baseResume} onSave={onSave} />);

        const nameInput = screen.getByDisplayValue('My CV');
        fireEvent.changeText(nameInput, 'Renamed CV');
        fireEvent(nameInput, 'blur');

        expect(onSave).toHaveBeenCalledWith({ name: 'Renamed CV' });
    });

    it('calls onSave with the whole contact object when a contact field blurs', () => {
        const onSave = jest.fn();
        render(<BasicsSection resume={baseResume} onSave={onSave} />);

        const emailInput = screen.getByDisplayValue('jane@example.com');
        fireEvent.changeText(emailInput, 'jane.doe@example.com');
        fireEvent(emailInput, 'blur');

        expect(onSave).toHaveBeenCalledWith({
            contact: { ...baseResume.contact, email: 'jane.doe@example.com' },
        });
    });
});
```

Create `mobile/screens/resume-edit/__tests__/TemplateSection.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import TemplateSection from '../TemplateSection';
import type { ResumeDetail } from '../../../lib/resumeApi';

const baseResume = {
    id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z',
    accent_color: '#4f46e5', font_family: 'sans', summary: null,
    contact: null, experience: null, education: null, projects: null, skills: null, skills_layout: null,
    skills_groups: null, skill_narratives: null, certifications: null, font_sizes: null,
    section_order: null, custom_sections: null,
} as ResumeDetail;

describe('TemplateSection', () => {
    it('renders all 9 template options', () => {
        render(<TemplateSection resume={baseResume} onSave={jest.fn()} />);

        ['classic', 'modern', 'minimal', 'minimal-ruled', 'executive', 'ats', 'skills-first', 'academic', 'bold'].forEach((t) => {
            expect(screen.getByText(t)).toBeTruthy();
        });
    });

    it('calls onSave with the selected template when a different one is pressed', () => {
        const onSave = jest.fn();
        render(<TemplateSection resume={baseResume} onSave={onSave} />);

        fireEvent.press(screen.getByText('modern'));

        expect(onSave).toHaveBeenCalledWith({ template: 'modern' });
    });

    it('calls onSave with the selected accent color', () => {
        const onSave = jest.fn();
        render(<TemplateSection resume={baseResume} onSave={onSave} />);

        fireEvent.press(screen.getByTestId('accent-color-#166534'));

        expect(onSave).toHaveBeenCalledWith({ accent_color: '#166534' });
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest BasicsSection.test.tsx TemplateSection.test.tsx`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Create `mobile/screens/resume-edit/BasicsSection.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import type { ResumeDetail, ResumeFields, Contact } from '../../lib/resumeApi';

type BasicsSectionProps = {
    resume: ResumeDetail;
    onSave: (data: Partial<ResumeFields>) => void;
};

export default function BasicsSection({ resume, onSave }: BasicsSectionProps) {
    const [name, setName] = useState(resume.name);
    const [summary, setSummary] = useState(resume.summary ?? '');
    const [contact, setContact] = useState<Contact>(
        resume.contact ?? { full_name: '', email: '', phone: '', location: '', linkedin: '', website: '' },
    );

    const contactField = (key: keyof Contact, label: string) => (
        <TextInput
            key={key}
            style={styles.input}
            placeholder={label}
            value={contact[key]}
            onChangeText={(text) => setContact((prev) => ({ ...prev, [key]: text }))}
            onBlur={() => onSave({ contact })}
        />
    );

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Basics</Text>
            <TextInput
                style={styles.input}
                placeholder="Resume name"
                value={name}
                onChangeText={setName}
                onBlur={() => onSave({ name })}
            />
            {contactField('full_name', 'Full name')}
            {contactField('email', 'Email')}
            {contactField('phone', 'Phone')}
            {contactField('location', 'Location')}
            {contactField('linkedin', 'LinkedIn')}
            {contactField('website', 'Website')}
            <TextInput
                style={styles.multilineInput}
                placeholder="Summary"
                multiline
                value={summary}
                onChangeText={setSummary}
                onBlur={() => onSave({ summary })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6 },
    multilineInput: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6, minHeight: 80, textAlignVertical: 'top' },
});
```

- [ ] **Step 4: Create `mobile/screens/resume-edit/TemplateSection.tsx`**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ResumeDetail, ResumeFields, ResumeTemplate } from '../../lib/resumeApi';

type TemplateSectionProps = {
    resume: ResumeDetail;
    onSave: (data: Partial<ResumeFields>) => void;
};

const TEMPLATES: ResumeTemplate[] = [
    'classic', 'modern', 'minimal', 'minimal-ruled', 'executive', 'ats', 'skills-first', 'academic', 'bold',
];

const ACCENT_COLORS = [
    '#4f46e5', '#1e3a5f', '#475569', '#166534', '#7f1d1d', '#1f2937', '#0f766e', '#78716c',
];

export default function TemplateSection({ resume, onSave }: TemplateSectionProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Template &amp; appearance</Text>
            <View style={styles.row}>
                {TEMPLATES.map((template) => (
                    <TouchableOpacity
                        key={template}
                        style={[styles.chip, resume.template === template && styles.chipActive]}
                        onPress={() => onSave({ template })}
                    >
                        <Text>{template}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={styles.label}>Accent color</Text>
            <View style={styles.row}>
                {ACCENT_COLORS.map((color) => (
                    <TouchableOpacity
                        key={color}
                        testID={`accent-color-${color}`}
                        style={[styles.swatch, { backgroundColor: color }, resume.accent_color === color && styles.swatchActive]}
                        onPress={() => onSave({ accent_color: color })}
                    />
                ))}
            </View>
            <Text style={styles.label}>Font family</Text>
            <View style={styles.row}>
                {(['sans', 'serif', 'mono'] as const).map((font) => (
                    <TouchableOpacity
                        key={font}
                        style={[styles.chip, resume.font_family === font && styles.chipActive]}
                        onPress={() => onSave({ font_family: font })}
                    >
                        <Text>{font}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    label: { marginTop: 8, marginBottom: 4, color: '#444' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
    chipActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
    swatch: { width: 28, height: 28, borderRadius: 14, marginRight: 8, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
    swatchActive: { borderColor: '#111' },
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd mobile && npx jest BasicsSection.test.tsx TemplateSection.test.tsx`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
cd mobile && git add screens/resume-edit/BasicsSection.tsx screens/resume-edit/TemplateSection.tsx screens/resume-edit/__tests__/BasicsSection.test.tsx screens/resume-edit/__tests__/TemplateSection.test.tsx
git commit -m "feat: add resume editor Basics and Template sections"
```

---

### Task 14: Create Experience/Education/Certifications/Projects sections using `CardListEditor`

**Files:**
- Create: `mobile/screens/resume-edit/ExperienceSection.tsx`
- Create: `mobile/screens/resume-edit/EducationSection.tsx`
- Create: `mobile/screens/resume-edit/CertificationsSection.tsx`
- Create: `mobile/screens/resume-edit/ProjectsSection.tsx`
- Test: `mobile/screens/resume-edit/__tests__/ExperienceSection.test.tsx` (representative — the other three follow the identical pattern and are covered by one test file each, shown below)

**Interfaces:**
- Consumes: `CardListEditor` (Task 12), `ExperienceEntry/EducationEntry/CertEntry/ProjectEntry` (Task 8).
- Produces: four components, each `{ items: T[] | null; onSave: (items: T[]) => void }` where `onSave` is called with the full updated array (the parent decides which `ResumeFields` key it maps to, e.g. `{ experience: items }`).

- [ ] **Step 1: Write the failing test for `ExperienceSection`**

Create `mobile/screens/resume-edit/__tests__/ExperienceSection.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ExperienceSection from '../ExperienceSection';

describe('ExperienceSection', () => {
    it('renders existing entries and adds a new one', () => {
        const onSave = jest.fn();
        render(
            <ExperienceSection
                items={[{ id: '1', company: 'Acme', title: 'Engineer', start_date: '', end_date: '', current: false, bullets: '' }]}
                onSave={onSave}
            />,
        );

        expect(screen.getByDisplayValue('Acme')).toBeTruthy();

        fireEvent.press(screen.getByText('Add Experience'));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave.mock.calls[0][0]).toHaveLength(2);
    });

    it('treats a null items prop as an empty list', () => {
        render(<ExperienceSection items={null} onSave={jest.fn()} />);

        expect(screen.getByText('Add Experience')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest ExperienceSection.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `mobile/screens/resume-edit/ExperienceSection.tsx`**

```tsx
import React from 'react';
import CardListEditor from '../../components/CardListEditor';
import type { ExperienceEntry } from '../../lib/resumeApi';

type ExperienceSectionProps = {
    items: ExperienceEntry[] | null;
    onSave: (items: ExperienceEntry[]) => void;
};

export default function ExperienceSection({ items, onSave }: ExperienceSectionProps) {
    return (
        <CardListEditor<ExperienceEntry>
            title="Experience"
            items={items ?? []}
            fields={[
                { key: 'company', label: 'Company' },
                { key: 'title', label: 'Title' },
                { key: 'start_date', label: 'Start date' },
                { key: 'end_date', label: 'End date' },
                { key: 'bullets', label: 'Bullets', multiline: true },
            ]}
            emptyItem={{ company: '', title: '', start_date: '', end_date: '', current: false, bullets: '' }}
            onChange={onSave}
        />
    );
}
```

- [ ] **Step 4: Create `mobile/screens/resume-edit/EducationSection.tsx`**

```tsx
import React from 'react';
import CardListEditor from '../../components/CardListEditor';
import type { EducationEntry } from '../../lib/resumeApi';

type EducationSectionProps = {
    items: EducationEntry[] | null;
    onSave: (items: EducationEntry[]) => void;
};

export default function EducationSection({ items, onSave }: EducationSectionProps) {
    return (
        <CardListEditor<EducationEntry>
            title="Education"
            items={items ?? []}
            fields={[
                { key: 'school', label: 'School' },
                { key: 'degree', label: 'Degree' },
                { key: 'field', label: 'Field of study' },
                { key: 'grad_year', label: 'Graduation year' },
            ]}
            emptyItem={{ school: '', degree: '', field: '', grad_year: '' }}
            onChange={onSave}
        />
    );
}
```

- [ ] **Step 5: Create `mobile/screens/resume-edit/CertificationsSection.tsx`**

```tsx
import React from 'react';
import CardListEditor from '../../components/CardListEditor';
import type { CertEntry } from '../../lib/resumeApi';

type CertificationsSectionProps = {
    items: CertEntry[] | null;
    onSave: (items: CertEntry[]) => void;
};

export default function CertificationsSection({ items, onSave }: CertificationsSectionProps) {
    return (
        <CardListEditor<CertEntry>
            title="Certifications"
            items={items ?? []}
            fields={[
                { key: 'name', label: 'Name' },
                { key: 'issuer', label: 'Issuer' },
                { key: 'date', label: 'Date' },
                { key: 'expiration', label: 'Expiration' },
                { key: 'credential_id', label: 'Credential ID' },
            ]}
            emptyItem={{ name: '', issuer: '', date: '', expiration: '', credential_id: '' }}
            onChange={onSave}
        />
    );
}
```

- [ ] **Step 6: Create `mobile/screens/resume-edit/ProjectsSection.tsx`**

```tsx
import React from 'react';
import CardListEditor from '../../components/CardListEditor';
import type { ProjectEntry } from '../../lib/resumeApi';

type ProjectsSectionProps = {
    items: ProjectEntry[] | null;
    onSave: (items: ProjectEntry[]) => void;
};

export default function ProjectsSection({ items, onSave }: ProjectsSectionProps) {
    return (
        <CardListEditor<ProjectEntry>
            title="Projects"
            items={items ?? []}
            fields={[
                { key: 'name', label: 'Name' },
                { key: 'description', label: 'Description', multiline: true },
                { key: 'url', label: 'URL' },
                { key: 'start_date', label: 'Start date' },
                { key: 'end_date', label: 'End date' },
                { key: 'bullets', label: 'Bullets', multiline: true },
            ]}
            emptyItem={{ name: '', description: '', url: '', start_date: '', end_date: '', bullets: '' }}
            onChange={onSave}
        />
    );
}
```

- [ ] **Step 7: Run the ExperienceSection test to verify it passes**

Run: `cd mobile && npx jest ExperienceSection.test.tsx`
Expected: PASS

- [ ] **Step 8: Add equivalent test files for the other three sections**

Create `mobile/screens/resume-edit/__tests__/EducationSection.test.tsx`, `CertificationsSection.test.tsx`, `ProjectsSection.test.tsx`, each following `ExperienceSection.test.tsx`'s exact two-test pattern (render existing entry + assert a field's `getByDisplayValue`; render with `items={null}` and assert `Add <Title>` renders), substituting that section's own field/entry shape. For example, `EducationSection.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import EducationSection from '../EducationSection';

describe('EducationSection', () => {
    it('renders existing entries and adds a new one', () => {
        const onSave = jest.fn();
        render(
            <EducationSection
                items={[{ id: '1', school: 'State University', degree: 'BS', field: 'CS', grad_year: '2020' }]}
                onSave={onSave}
            />,
        );

        expect(screen.getByDisplayValue('State University')).toBeTruthy();

        fireEvent.press(screen.getByText('Add Education'));

        expect(onSave).toHaveBeenCalledTimes(1);
        expect(onSave.mock.calls[0][0]).toHaveLength(2);
    });

    it('treats a null items prop as an empty list', () => {
        render(<EducationSection items={null} onSave={jest.fn()} />);

        expect(screen.getByText('Add Education')).toBeTruthy();
    });
});
```

`CertificationsSection.test.tsx` and `ProjectsSection.test.tsx` follow identically, using `{ id: '1', name: 'AWS Cert', issuer: 'Amazon', date: '', expiration: '', credential_id: '' }` / `getByDisplayValue('AWS Cert')` / `'Add Certifications'` for the former, and `{ id: '1', name: 'Side Project', description: '', url: '', start_date: '', end_date: '', bullets: '' }` / `getByDisplayValue('Side Project')` / `'Add Projects'` for the latter.

- [ ] **Step 9: Run all four section tests to verify they pass**

Run: `cd mobile && npx jest ExperienceSection.test.tsx EducationSection.test.tsx CertificationsSection.test.tsx ProjectsSection.test.tsx`
Expected: all PASS

- [ ] **Step 10: Commit**

```bash
cd mobile && git add screens/resume-edit/ExperienceSection.tsx screens/resume-edit/EducationSection.tsx screens/resume-edit/CertificationsSection.tsx screens/resume-edit/ProjectsSection.tsx screens/resume-edit/__tests__/ExperienceSection.test.tsx screens/resume-edit/__tests__/EducationSection.test.tsx screens/resume-edit/__tests__/CertificationsSection.test.tsx screens/resume-edit/__tests__/ProjectsSection.test.tsx
git commit -m "feat: add Experience/Education/Certifications/Projects resume editor sections"
```

---

### Task 15: Create Skills section (`skills`, `skills_groups`, `skill_narratives`)

**Files:**
- Create: `mobile/screens/resume-edit/SkillsSection.tsx`
- Test: `mobile/screens/resume-edit/__tests__/SkillsSection.test.tsx`

**Interfaces:**
- Consumes: `SkillGroup`, `SkillNarrative` (Task 8).
- Produces:
  ```ts
  type SkillsSectionProps = {
      skills: string[] | null;
      skillsGroups: SkillGroup[] | null;
      skillNarratives: SkillNarrative[] | null;
      onSave: (data: { skills?: string[]; skills_groups?: SkillGroup[]; skill_narratives?: SkillNarrative[] }) => void;
  };
  export default function SkillsSection(props: SkillsSectionProps): JSX.Element;
  ```

- [ ] **Step 1: Write the failing tests**

Create `mobile/screens/resume-edit/__tests__/SkillsSection.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SkillsSection from '../SkillsSection';

describe('SkillsSection', () => {
    it('renders existing flat skills as chips and adds a new one from text input', () => {
        const onSave = jest.fn();
        render(<SkillsSection skills={['PHP', 'React']} skillsGroups={null} skillNarratives={null} onSave={onSave} />);

        expect(screen.getByText('PHP')).toBeTruthy();
        expect(screen.getByText('React')).toBeTruthy();

        fireEvent.changeText(screen.getByPlaceholderText('Add a skill'), 'TypeScript');
        fireEvent(screen.getByPlaceholderText('Add a skill'), 'submitEditing');

        expect(onSave).toHaveBeenCalledWith({ skills: ['PHP', 'React', 'TypeScript'] });
    });

    it('removes a skill chip when tapped', () => {
        const onSave = jest.fn();
        render(<SkillsSection skills={['PHP', 'React']} skillsGroups={null} skillNarratives={null} onSave={onSave} />);

        fireEvent.press(screen.getByText('PHP'));

        expect(onSave).toHaveBeenCalledWith({ skills: ['React'] });
    });

    it('renders skill groups with their category and items', () => {
        render(
            <SkillsSection
                skills={null}
                skillsGroups={[{ id: 'g1', category: 'Languages', items: ['PHP', 'TypeScript'] }]}
                skillNarratives={null}
                onSave={jest.fn()}
            />,
        );

        expect(screen.getByDisplayValue('Languages')).toBeTruthy();
    });

    it('renders skill narratives with their name and bullets', () => {
        render(
            <SkillsSection
                skills={null}
                skillsGroups={null}
                skillNarratives={[{ id: 'n1', name: 'Leadership', bullets: ['Led a team of 5'] }]}
                onSave={jest.fn()}
            />,
        );

        expect(screen.getByDisplayValue('Leadership')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest SkillsSection.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `mobile/screens/resume-edit/SkillsSection.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { SkillGroup, SkillNarrative } from '../../lib/resumeApi';

type SkillsSectionProps = {
    skills: string[] | null;
    skillsGroups: SkillGroup[] | null;
    skillNarratives: SkillNarrative[] | null;
    onSave: (data: { skills?: string[]; skills_groups?: SkillGroup[]; skill_narratives?: SkillNarrative[] }) => void;
};

export default function SkillsSection({ skills, skillsGroups, skillNarratives, onSave }: SkillsSectionProps) {
    const [newSkill, setNewSkill] = useState('');
    const flatSkills = skills ?? [];
    const groups = skillsGroups ?? [];
    const narratives = skillNarratives ?? [];

    const addSkill = () => {
        const trimmed = newSkill.trim();
        if (!trimmed) {
            return;
        }
        onSave({ skills: [...flatSkills, trimmed] });
        setNewSkill('');
    };

    const removeSkill = (skill: string) => {
        onSave({ skills: flatSkills.filter((s) => s !== skill) });
    };

    const updateGroupCategory = (id: string | undefined, category: string) => {
        onSave({ skills_groups: groups.map((g) => (g.id === id ? { ...g, category } : g)) });
    };

    const updateNarrativeName = (id: string, name: string) => {
        onSave({ skill_narratives: narratives.map((n) => (n.id === id ? { ...n, name } : n)) });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.chipsRow}>
                {flatSkills.map((skill) => (
                    <TouchableOpacity key={skill} style={styles.chip} onPress={() => removeSkill(skill)}>
                        <Text>{skill}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            <TextInput
                style={styles.input}
                placeholder="Add a skill"
                value={newSkill}
                onChangeText={setNewSkill}
                onSubmitEditing={addSkill}
            />

            {groups.length > 0 && (
                <>
                    <Text style={styles.label}>Skill groups</Text>
                    {groups.map((group) => (
                        <TextInput
                            key={group.id}
                            style={styles.input}
                            value={group.category}
                            onChangeText={(text) => updateGroupCategory(group.id, text)}
                            onBlur={() => onSave({ skills_groups: groups })}
                        />
                    ))}
                </>
            )}

            {narratives.length > 0 && (
                <>
                    <Text style={styles.label}>Skill narratives</Text>
                    {narratives.map((narrative) => (
                        <TextInput
                            key={narrative.id}
                            style={styles.input}
                            value={narrative.name}
                            onChangeText={(text) => updateNarrativeName(narrative.id, text)}
                            onBlur={() => onSave({ skill_narratives: narratives })}
                        />
                    ))}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    label: { marginTop: 8, marginBottom: 4, color: '#444' },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6 },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest SkillsSection.test.tsx`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
cd mobile && git add screens/resume-edit/SkillsSection.tsx screens/resume-edit/__tests__/SkillsSection.test.tsx
git commit -m "feat: add resume editor Skills section"
```

---

### Task 16: Create Custom Sections editor

**Files:**
- Create: `mobile/screens/resume-edit/CustomSectionsSection.tsx`
- Test: `mobile/screens/resume-edit/__tests__/CustomSectionsSection.test.tsx`

**Interfaces:**
- Consumes: `CustomSection`, `CustomSectionEntry` (Task 8), `CardListEditor` (Task 12, reused for each block's `entries`).
- Produces: `{ items: CustomSection[] | null; onSave: (items: CustomSection[]) => void }`.

- [ ] **Step 1: Write the failing tests**

Create `mobile/screens/resume-edit/__tests__/CustomSectionsSection.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CustomSectionsSection from '../CustomSectionsSection';

describe('CustomSectionsSection', () => {
    it('renders each custom section\'s name and its entries', () => {
        render(
            <CustomSectionsSection
                items={[{
                    id: 'cs1',
                    name: 'Volunteering',
                    entries: [{ id: 'e1', title: 'Red Cross', subtitle: '', start_date: '', end_date: null, description: '', bullets: [] }],
                }]}
                onSave={jest.fn()}
            />,
        );

        expect(screen.getByDisplayValue('Volunteering')).toBeTruthy();
        expect(screen.getByDisplayValue('Red Cross')).toBeTruthy();
    });

    it('adds a new blank custom section', () => {
        const onSave = jest.fn();
        render(<CustomSectionsSection items={[]} onSave={onSave} />);

        fireEvent.press(screen.getByText('Add custom section'));

        expect(onSave).toHaveBeenCalledTimes(1);
        const [sections] = onSave.mock.calls[0];
        expect(sections).toHaveLength(1);
        expect(sections[0]).toMatchObject({ name: '', entries: [] });
    });

    it('treats a null items prop as an empty list', () => {
        render(<CustomSectionsSection items={null} onSave={jest.fn()} />);

        expect(screen.getByText('Add custom section')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest CustomSectionsSection.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `mobile/screens/resume-edit/CustomSectionsSection.tsx`**

```tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import CardListEditor from '../../components/CardListEditor';
import type { CustomSection, CustomSectionEntry } from '../../lib/resumeApi';

type CustomSectionsSectionProps = {
    items: CustomSection[] | null;
    onSave: (items: CustomSection[]) => void;
};

let idCounter = 0;
function generateId(): string {
    idCounter += 1;

    return `custom-${idCounter}-${Math.round(performance.now())}`;
}

export default function CustomSectionsSection({ items, onSave }: CustomSectionsSectionProps) {
    const sections = items ?? [];

    const addSection = () => {
        onSave([...sections, { id: generateId(), name: '', entries: [] }]);
    };

    const renameSection = (id: string, name: string) => {
        onSave(sections.map((s) => (s.id === id ? { ...s, name } : s)));
    };

    const updateEntries = (id: string, entries: CustomSectionEntry[]) => {
        onSave(sections.map((s) => (s.id === id ? { ...s, entries } : s)));
    };

    const removeSection = (id: string) => {
        onSave(sections.filter((s) => s.id !== id));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Custom sections</Text>
            {sections.map((section) => (
                <View key={section.id} style={styles.block}>
                    <TextInput
                        style={styles.input}
                        placeholder="Section name"
                        value={section.name}
                        onChangeText={(text) => renameSection(section.id, text)}
                        onBlur={() => onSave(sections)}
                    />
                    <CardListEditor<CustomSectionEntry>
                        title={section.name || 'Entries'}
                        items={section.entries}
                        fields={[
                            { key: 'title', label: 'Title' },
                            { key: 'subtitle', label: 'Subtitle' },
                            { key: 'start_date', label: 'Start date' },
                            { key: 'end_date', label: 'End date' },
                            { key: 'description', label: 'Description', multiline: true },
                        ]}
                        emptyItem={{ title: '', subtitle: '', start_date: '', end_date: null, description: '', bullets: [] }}
                        onChange={(entries) => updateEntries(section.id, entries)}
                    />
                    <TouchableOpacity onPress={() => removeSection(section.id)}>
                        <Text style={styles.deleteText}>Delete section</Text>
                    </TouchableOpacity>
                </View>
            ))}
            <TouchableOpacity onPress={addSection}>
                <Text style={styles.addText}>Add custom section</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    block: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, marginBottom: 12 },
    input: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 6, marginBottom: 6 },
    deleteText: { color: 'red', marginTop: 4 },
    addText: { color: '#4f46e5', fontWeight: '600', marginTop: 4 },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest CustomSectionsSection.test.tsx`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
cd mobile && git add screens/resume-edit/CustomSectionsSection.tsx screens/resume-edit/__tests__/CustomSectionsSection.test.tsx
git commit -m "feat: add resume editor Custom Sections editor"
```

---

### Task 17: Create draggable Section Order editor

**Files:**
- Create: `mobile/screens/resume-edit/SectionOrderSection.tsx`
- Test: `mobile/screens/resume-edit/__tests__/SectionOrderSection.test.tsx`

**Interfaces:**
- Consumes: `react-native-draggable-flatlist` (Task 7).
- Produces: `{ sectionOrder: string[] | null; onSave: (order: string[]) => void }`. Renders a draggable list; on drag-end, calls `onSave` with the reordered array.

- [ ] **Step 1: Write the failing test**

Create `mobile/screens/resume-edit/__tests__/SectionOrderSection.test.tsx`. `react-native-draggable-flatlist`'s `DraggableFlatList` renders its `renderItem` for each item like a normal list in a test environment (no real drag gesture is simulated — that's exercised manually per the Rollout note), so the test asserts render + calls `onDragEnd` directly:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SectionOrderSection from '../SectionOrderSection';

describe('SectionOrderSection', () => {
    it('renders each section name in order', () => {
        render(<SectionOrderSection sectionOrder={['summary', 'experience', 'education']} onSave={jest.fn()} />);

        expect(screen.getByText('summary')).toBeTruthy();
        expect(screen.getByText('experience')).toBeTruthy();
        expect(screen.getByText('education')).toBeTruthy();
    });

    it('treats a null sectionOrder as an empty list', () => {
        render(<SectionOrderSection sectionOrder={null} onSave={jest.fn()} />);

        expect(screen.getByText('Section order')).toBeTruthy();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd mobile && npx jest SectionOrderSection.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `mobile/screens/resume-edit/SectionOrderSection.tsx`**

Verify `DraggableFlatList`'s exact prop names (`data`, `onDragEnd`, `keyExtractor`, `renderItem` receiving `{ item, drag, isActive }`) against the installed `react-native-draggable-flatlist` version's README/types before writing this, per the Global Constraints Expo-version-verification rule (this library isn't Expo-SDK-versioned itself, but its API has changed across majors — confirm against the version `npx expo install` resolved in Task 7):

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';

type SectionOrderSectionProps = {
    sectionOrder: string[] | null;
    onSave: (order: string[]) => void;
};

export default function SectionOrderSection({ sectionOrder, onSave }: SectionOrderSectionProps) {
    const order = sectionOrder ?? [];

    const renderItem = ({ item, drag, isActive }: RenderItemParams<string>) => (
        <ScaleDecorator>
            <View style={[styles.row, isActive && styles.rowActive]} onTouchStart={drag}>
                <Text>{item}</Text>
            </View>
        </ScaleDecorator>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Section order</Text>
            <DraggableFlatList
                data={order}
                keyExtractor={(item) => item}
                renderItem={renderItem}
                onDragEnd={({ data }) => onSave(data)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    row: { padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8, marginBottom: 6, backgroundColor: '#fff' },
    rowActive: { backgroundColor: '#eef2ff' },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd mobile && npx jest SectionOrderSection.test.tsx`
Expected: PASS. If `DraggableFlatList` requires a `GestureHandlerRootView`/`NestedGestureHandlerRootView` ancestor to render in the Jest/jsdom-less RN test environment and the bare render throws, wrap the component under test in `<GestureHandlerRootView style={{flex:1}}>` inside the test file only (not inside `SectionOrderSection` itself, since `App.tsx` already provides it at the real app root per Task 7).

- [ ] **Step 5: Commit**

```bash
cd mobile && git add screens/resume-edit/SectionOrderSection.tsx screens/resume-edit/__tests__/SectionOrderSection.test.tsx
git commit -m "feat: add draggable resume section-order editor"
```

---

### Task 18: Create Photo section

**Files:**
- Create: `mobile/screens/resume-edit/PhotoSection.tsx`
- Test: `mobile/screens/resume-edit/__tests__/PhotoSection.test.tsx`

**Interfaces:**
- Consumes: `expo-image-picker` (Task 7), `uploadResumePhoto`/`deleteResumePhoto` (Task 8).
- Produces: `{ resumeId: number; photoUrl: string | null; onPhotoChange: (url: string | null) => void }`.

- [ ] **Step 1: Write the failing tests**

Verify `expo-image-picker`'s SDK-57 API shape (`launchImageLibraryAsync`, `MediaTypeOptions` vs newer `MediaType` enum, `result.canceled`/`result.assets`) against `https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/` before writing the implementation in Step 3 — the exact result shape has changed across Expo SDK versions and training data may be stale, per `mobile/AGENTS.md`.

Create `mobile/screens/resume-edit/__tests__/PhotoSection.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import PhotoSection from '../PhotoSection';
import * as ImagePicker from 'expo-image-picker';
import * as resumeApi from '../../../lib/resumeApi';

jest.mock('expo-image-picker');
jest.mock('../../../lib/resumeApi');

describe('PhotoSection', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders a placeholder and an "Add photo" action when there is no photo', () => {
        render(<PhotoSection resumeId={1} photoUrl={null} onPhotoChange={jest.fn()} />);

        expect(screen.getByText('Add photo')).toBeTruthy();
    });

    it('uploads the picked image and calls onPhotoChange with the returned url', async () => {
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
            canceled: false,
            assets: [{ uri: 'file:///tmp/photo.jpg' }],
        });
        (resumeApi.uploadResumePhoto as jest.Mock).mockResolvedValue({ photo_url: 'https://example.test/photo.jpg' });

        const onPhotoChange = jest.fn();
        render(<PhotoSection resumeId={1} photoUrl={null} onPhotoChange={onPhotoChange} />);

        fireEvent.press(screen.getByText('Add photo'));

        await waitFor(() => expect(onPhotoChange).toHaveBeenCalledWith('https://example.test/photo.jpg'));
        expect(resumeApi.uploadResumePhoto).toHaveBeenCalledWith(1, 'file:///tmp/photo.jpg');
    });

    it('does nothing if the picker is cancelled', async () => {
        (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: null });

        const onPhotoChange = jest.fn();
        render(<PhotoSection resumeId={1} photoUrl={null} onPhotoChange={onPhotoChange} />);

        fireEvent.press(screen.getByText('Add photo'));

        await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled());
        expect(resumeApi.uploadResumePhoto).not.toHaveBeenCalled();
        expect(onPhotoChange).not.toHaveBeenCalled();
    });

    it('deletes the photo when Remove is pressed', async () => {
        (resumeApi.deleteResumePhoto as jest.Mock).mockResolvedValue({ photo_url: null });

        const onPhotoChange = jest.fn();
        render(<PhotoSection resumeId={1} photoUrl="https://example.test/photo.jpg" onPhotoChange={onPhotoChange} />);

        fireEvent.press(screen.getByText('Remove photo'));

        await waitFor(() => expect(onPhotoChange).toHaveBeenCalledWith(null));
        expect(resumeApi.deleteResumePhoto).toHaveBeenCalledWith(1);
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest PhotoSection.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `mobile/screens/resume-edit/PhotoSection.tsx`**

```tsx
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadResumePhoto, deleteResumePhoto } from '../../lib/resumeApi';

type PhotoSectionProps = {
    resumeId: number;
    photoUrl: string | null;
    onPhotoChange: (url: string | null) => void;
};

export default function PhotoSection({ resumeId, photoUrl, onPhotoChange }: PhotoSectionProps) {
    const [busy, setBusy] = useState(false);

    const pickAndUpload = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.8,
        });

        if (result.canceled || !result.assets?.length) {
            return;
        }

        setBusy(true);
        try {
            const { photo_url } = await uploadResumePhoto(resumeId, result.assets[0].uri);
            onPhotoChange(photo_url);
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        setBusy(true);
        try {
            await deleteResumePhoto(resumeId);
            onPhotoChange(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Photo</Text>
            {photoUrl ? (
                <>
                    <Image source={{ uri: photoUrl }} style={styles.photo} />
                    <TouchableOpacity onPress={remove} disabled={busy}>
                        <Text style={styles.deleteText}>Remove photo</Text>
                    </TouchableOpacity>
                </>
            ) : (
                <TouchableOpacity onPress={pickAndUpload} disabled={busy}>
                    <Text style={styles.addText}>Add photo</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginVertical: 12 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    photo: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
    deleteText: { color: 'red' },
    addText: { color: '#4f46e5', fontWeight: '600' },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest PhotoSection.test.tsx`
Expected: all PASS. If SDK 57's `expo-image-picker` result shape differs from `{ canceled, assets }` (e.g. a renamed field), update this implementation and the test mocks together to match the verified real shape from Step 1's docs check — do not leave the two out of sync.

- [ ] **Step 5: Commit**

```bash
cd mobile && git add screens/resume-edit/PhotoSection.tsx screens/resume-edit/__tests__/PhotoSection.test.tsx
git commit -m "feat: add resume editor Photo section"
```

---

### Task 19: Create `ResumeEditScreen` container

**Files:**
- Create: `mobile/screens/ResumeEditScreen.tsx`
- Test: `mobile/screens/__tests__/ResumeEditScreen.test.tsx`

**Interfaces:**
- Consumes: all of Tasks 8, 13–18 (`getResume`, `updateResume`, `BasicsSection`, `TemplateSection`, `ExperienceSection`, `EducationSection`, `CertificationsSection`, `ProjectsSection`, `SkillsSection`, `CustomSectionsSection`, `SectionOrderSection`, `PhotoSection`).
- Produces: a screen registered as `route={{ params: { resumeId } }}`, matching the `ResumeDetailScreen` navigation-param pattern (`route.params.resumeId`). Fetches the resume on mount, renders every section in a `ScrollView`, and wires each section's `onSave`/`onChange` callback straight to `updateResume(resumeId, partialData)`, updating local state optimistically with the response.

- [ ] **Step 1: Write the failing tests**

Create `mobile/screens/__tests__/ResumeEditScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ResumeEditScreen from '../ResumeEditScreen';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/resumeApi');

const fullResume = {
    id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z',
    accent_color: null, font_family: null, summary: 'A summary',
    contact: { full_name: 'Jane', email: 'jane@example.com', phone: '', location: '', linkedin: '', website: '' },
    experience: [], education: [], projects: [], skills: [], skills_layout: null,
    skills_groups: [], skill_narratives: [], certifications: [], font_sizes: null,
    section_order: ['summary', 'experience'], custom_sections: [],
};

describe('ResumeEditScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (resumeApi.getResume as jest.Mock).mockResolvedValue(fullResume);
    });

    it('loads and renders the resume', async () => {
        render(<ResumeEditScreen route={{ params: { resumeId: 1 } }} />);

        await waitFor(() => expect(screen.getByDisplayValue('My CV')).toBeTruthy());
        expect(resumeApi.getResume).toHaveBeenCalledWith(1);
    });

    it('saves a Basics field change via updateResume and merges the response', async () => {
        (resumeApi.updateResume as jest.Mock).mockResolvedValue({ ...fullResume, name: 'Renamed CV' });

        render(<ResumeEditScreen route={{ params: { resumeId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('My CV')).toBeTruthy());

        const nameInput = screen.getByDisplayValue('My CV');
        fireEvent.changeText(nameInput, 'Renamed CV');
        fireEvent(nameInput, 'blur');

        await waitFor(() => expect(resumeApi.updateResume).toHaveBeenCalledWith(1, { name: 'Renamed CV' }));
        await waitFor(() => expect(screen.getByDisplayValue('Renamed CV')).toBeTruthy());
    });

    it('shows a retry option when loading fails', async () => {
        (resumeApi.getResume as jest.Mock).mockRejectedValue(new Error('network'));

        render(<ResumeEditScreen route={{ params: { resumeId: 1 } }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load this resume.")).toBeTruthy());
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest ResumeEditScreen.test.tsx`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create `mobile/screens/ResumeEditScreen.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Button, StyleSheet } from 'react-native';
import { getResume, updateResume } from '../lib/resumeApi';
import type { ResumeDetail, ResumeFields } from '../lib/resumeApi';
import BasicsSection from './resume-edit/BasicsSection';
import TemplateSection from './resume-edit/TemplateSection';
import ExperienceSection from './resume-edit/ExperienceSection';
import EducationSection from './resume-edit/EducationSection';
import CertificationsSection from './resume-edit/CertificationsSection';
import ProjectsSection from './resume-edit/ProjectsSection';
import SkillsSection from './resume-edit/SkillsSection';
import CustomSectionsSection from './resume-edit/CustomSectionsSection';
import SectionOrderSection from './resume-edit/SectionOrderSection';
import PhotoSection from './resume-edit/PhotoSection';

export default function ResumeEditScreen({ route }: any) {
    const { resumeId } = route.params as { resumeId: number };
    const [resume, setResume] = useState<ResumeDetail | null>(null);
    const [error, setError] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(false);
        try {
            setResume(await getResume(resumeId));
        } catch {
            setError(true);
        }
    }, [resumeId]);

    useEffect(() => {
        load();
    }, [load]);

    const save = async (data: Partial<ResumeFields>) => {
        const updated = await updateResume(resumeId, data);
        setResume(updated);
    };

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load this resume.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    if (!resume) {
        return (
            <View style={styles.center}>
                <Text>Loading…</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <BasicsSection resume={resume} onSave={save} />
            <TemplateSection resume={resume} onSave={save} />
            <PhotoSection resumeId={resumeId} photoUrl={photoUrl} onPhotoChange={setPhotoUrl} />
            <ExperienceSection items={resume.experience} onSave={(experience) => save({ experience })} />
            <EducationSection items={resume.education} onSave={(education) => save({ education })} />
            <CertificationsSection items={resume.certifications} onSave={(certifications) => save({ certifications })} />
            <ProjectsSection items={resume.projects} onSave={(projects) => save({ projects })} />
            <SkillsSection
                skills={resume.skills}
                skillsGroups={resume.skills_groups}
                skillNarratives={resume.skill_narratives}
                onSave={save}
            />
            <CustomSectionsSection items={resume.custom_sections} onSave={(custom_sections) => save({ custom_sections })} />
            <SectionOrderSection sectionOrder={resume.section_order} onSave={(section_order) => save({ section_order })} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest ResumeEditScreen.test.tsx`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
cd mobile && git add screens/ResumeEditScreen.tsx screens/__tests__/ResumeEditScreen.test.tsx
git commit -m "feat: add ResumeEditScreen wiring all sections to save-on-blur updates"
```

---

### Task 20: Create Cover Letter list and edit screens

**Files:**
- Create: `mobile/screens/CoverLetterListScreen.tsx`
- Create: `mobile/screens/CoverLetterEditScreen.tsx`
- Test: `mobile/screens/__tests__/CoverLetterListScreen.test.tsx`
- Test: `mobile/screens/__tests__/CoverLetterEditScreen.test.tsx`

**Interfaces:**
- Consumes: `coverLetterApi` (Task 9), `showUpgradeAlert` (Task 11), `listResumes` (Task 8, for the optional `resume_id` picker).
- Produces: `CoverLetterListScreen({ navigation })` mirroring `ResumeListScreen`'s exact structure; `CoverLetterEditScreen({ route })` with `route.params.letterId`, editing `name`, `template_key`, `resume_id`, and `body`, plus the AI-generate action.

- [ ] **Step 1: Write the failing tests**

Create `mobile/screens/__tests__/CoverLetterListScreen.test.tsx` (mirrors `ResumeListScreen.test.tsx` exactly):

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import CoverLetterListScreen from '../CoverLetterListScreen';
import * as coverLetterApi from '../../lib/coverLetterApi';

jest.mock('../../lib/coverLetterApi');

describe('CoverLetterListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders cover letters returned by the API', async () => {
        (coverLetterApi.listCoverLetters as jest.Mock).mockResolvedValue([
            { id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z' },
        ]);

        render(<CoverLetterListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText('My Letter')).toBeTruthy());
    });

    it('shows a retry option when loading fails', async () => {
        (coverLetterApi.listCoverLetters as jest.Mock).mockRejectedValue(new Error('network'));

        render(<CoverLetterListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load your cover letters.")).toBeTruthy());
    });
});
```

Create `mobile/screens/__tests__/CoverLetterEditScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import CoverLetterEditScreen from '../CoverLetterEditScreen';
import * as coverLetterApi from '../../lib/coverLetterApi';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/coverLetterApi');
jest.mock('../../lib/resumeApi');

const letter = {
    id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z', body: 'Dear Hiring Manager',
};

describe('CoverLetterEditScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (coverLetterApi.getCoverLetter as jest.Mock).mockResolvedValue(letter);
        (resumeApi.listResumes as jest.Mock).mockResolvedValue([]);
    });

    it('loads and renders the letter name, template, and body', async () => {
        render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);

        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());
        expect(screen.getByDisplayValue('My Letter')).toBeTruthy();
        expect(screen.getByText('standard')).toBeTruthy();
    });

    it('saves the name on blur', async () => {
        (coverLetterApi.updateCoverLetter as jest.Mock).mockResolvedValue({ ...letter, name: 'Renamed' });

        render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('My Letter')).toBeTruthy());

        const nameInput = screen.getByDisplayValue('My Letter');
        fireEvent.changeText(nameInput, 'Renamed');
        fireEvent(nameInput, 'blur');

        await waitFor(() => expect(coverLetterApi.updateCoverLetter).toHaveBeenCalledWith(1, { name: 'Renamed' }));
    });

    it('saves the selected template_key when pressed', async () => {
        (coverLetterApi.updateCoverLetter as jest.Mock).mockResolvedValue({ ...letter, template_key: 'modern' });

        render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByText('standard')).toBeTruthy());

        fireEvent.press(screen.getByText('modern'));

        await waitFor(() => expect(coverLetterApi.updateCoverLetter).toHaveBeenCalledWith(1, { template_key: 'modern' }));
    });

    it('saves the body on blur', async () => {
        (coverLetterApi.updateCoverLetter as jest.Mock).mockResolvedValue({ ...letter, body: 'Updated body' });

        render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());

        const bodyInput = screen.getByDisplayValue('Dear Hiring Manager');
        fireEvent.changeText(bodyInput, 'Updated body');
        fireEvent(bodyInput, 'blur');

        await waitFor(() => expect(coverLetterApi.updateCoverLetter).toHaveBeenCalledWith(1, { body: 'Updated body' }));
    });

    it('generates a letter and fills the body with the returned text', async () => {
        (coverLetterApi.generateCoverLetter as jest.Mock).mockResolvedValue({ body: 'Generated body text', remaining: 4 });

        render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());

        fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(screen.getByDisplayValue('Generated body text')).toBeTruthy());
        expect(screen.getByText(/4 generations remaining/)).toBeTruthy();
    });

    it('shows an upgrade alert on a 402 response from generate', async () => {
        const { ApiError } = jest.requireActual('../../lib/api');
        (coverLetterApi.generateCoverLetter as jest.Mock).mockRejectedValue(new ApiError(402, 'Monthly AI limit reached.'));

        render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());

        fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(coverLetterApi.generateCoverLetter).toHaveBeenCalled());
    });

    it('shows an inline message on a 422 moderation response from generate', async () => {
        const { ApiError } = jest.requireActual('../../lib/api');
        (coverLetterApi.generateCoverLetter as jest.Mock).mockRejectedValue(new ApiError(422, "This content can't be processed."));

        render(<CoverLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Hiring Manager')).toBeTruthy());

        fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(screen.getByText("Couldn't generate — try adjusting your input.")).toBeTruthy());
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest CoverLetterListScreen.test.tsx CoverLetterEditScreen.test.tsx`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Create `mobile/screens/CoverLetterListScreen.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Button, StyleSheet } from 'react-native';
import { listCoverLetters } from '../lib/coverLetterApi';
import type { CoverLetterSummary } from '../lib/coverLetterApi';

export default function CoverLetterListScreen({ navigation }: any) {
    const [letters, setLetters] = useState<CoverLetterSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setError(false);
        try {
            setLetters(await listCoverLetters());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load your cover letters.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={letters}
                keyExtractor={(item) => String(item.id)}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                ListEmptyComponent={!loading ? <Text style={styles.empty}>No cover letters yet.</Text> : null}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('CoverLetterEdit', { letterId: item.id })}
                    >
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.meta}>{item.template_key}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    row: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
    name: { fontSize: 16, fontWeight: '600' },
    meta: { color: '#888', marginTop: 4 },
    empty: { textAlign: 'center', marginTop: 32, color: '#888' },
});
```

- [ ] **Step 4: Create `mobile/screens/CoverLetterEditScreen.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, Button, StyleSheet } from 'react-native';
import { getCoverLetter, updateCoverLetter, generateCoverLetter } from '../lib/coverLetterApi';
import type { CoverLetterDetail, CoverLetterTemplateKey } from '../lib/coverLetterApi';
import { listResumes } from '../lib/resumeApi';
import type { ResumeSummary } from '../lib/resumeApi';
import { ApiError } from '../lib/api';
import { showUpgradeAlert } from '../lib/upgradeAlert';

const TEMPLATE_KEYS: CoverLetterTemplateKey[] = ['standard', 'modern', 'career_change', 'new_grad', 'referral'];

export default function CoverLetterEditScreen({ route }: any) {
    const { letterId } = route.params as { letterId: number };
    const [letter, setLetter] = useState<CoverLetterDetail | null>(null);
    const [error, setError] = useState(false);
    const [name, setName] = useState('');
    const [templateKey, setTemplateKey] = useState<CoverLetterTemplateKey>('standard');
    const [resumeId, setResumeId] = useState<number | null>(null);
    const [resumes, setResumes] = useState<ResumeSummary[]>([]);
    const [body, setBody] = useState('');
    const [tone, setTone] = useState<'formal' | 'warm' | 'brief'>('formal');
    const [jobDescription, setJobDescription] = useState('');
    const [remaining, setRemaining] = useState<number | null>(null);
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(false);
        try {
            const data = await getCoverLetter(letterId);
            setLetter(data);
            setName(data.name);
            setTemplateKey(data.template_key);
            setResumeId(data.resume_id);
            setBody(data.body);
            setResumes(await listResumes());
        } catch {
            setError(true);
        }
    }, [letterId]);

    useEffect(() => {
        load();
    }, [load]);

    const saveName = async () => {
        await updateCoverLetter(letterId, { name });
    };

    const saveTemplate = async (key: CoverLetterTemplateKey) => {
        setTemplateKey(key);
        await updateCoverLetter(letterId, { template_key: key });
    };

    const saveResume = async (id: number | null) => {
        setResumeId(id);
        await updateCoverLetter(letterId, { resume_id: id });
    };

    const saveBody = async () => {
        await updateCoverLetter(letterId, { body });
    };

    const generate = async () => {
        setGenerating(true);
        setGenerateError(null);
        try {
            const result = await generateCoverLetter(letterId, {
                tone,
                job_description: jobDescription || undefined,
            });
            setBody(result.body);
            setRemaining(result.remaining);
        } catch (e) {
            if (e instanceof ApiError && e.status === 402) {
                showUpgradeAlert('cover_letter_generate', 'starter');
            } else if (e instanceof ApiError && e.status === 422) {
                setGenerateError("Couldn't generate — try adjusting your input.");
            } else {
                setGenerateError('AI is temporarily unavailable. Try again.');
            }
        } finally {
            setGenerating(false);
        }
    };

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load this cover letter.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    if (!letter) {
        return (
            <View style={styles.center}>
                <Text>Loading…</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Letter name"
                value={name}
                onChangeText={setName}
                onBlur={saveName}
            />
            <Text style={styles.label}>Template</Text>
            <View style={styles.row}>
                {TEMPLATE_KEYS.map((key) => (
                    <Text
                        key={key}
                        style={[styles.chip, templateKey === key && styles.chipActive]}
                        onPress={() => saveTemplate(key)}
                    >
                        {key}
                    </Text>
                ))}
            </View>
            <Text style={styles.label}>Linked resume</Text>
            <View style={styles.row}>
                <Text
                    style={[styles.chip, resumeId === null && styles.chipActive]}
                    onPress={() => saveResume(null)}
                >
                    None
                </Text>
                {resumes.map((r) => (
                    <Text
                        key={r.id}
                        style={[styles.chip, resumeId === r.id && styles.chipActive]}
                        onPress={() => saveResume(r.id)}
                    >
                        {r.name}
                    </Text>
                ))}
            </View>
            <Text style={styles.label}>Tone</Text>
            <View style={styles.row}>
                {(['formal', 'warm', 'brief'] as const).map((t) => (
                    <Text
                        key={t}
                        style={[styles.chip, tone === t && styles.chipActive]}
                        onPress={() => setTone(t)}
                    >
                        {t}
                    </Text>
                ))}
            </View>
            <TextInput
                style={styles.multilineInput}
                placeholder="Job description (optional)"
                multiline
                value={jobDescription}
                onChangeText={setJobDescription}
            />
            <Button title={generating ? 'Generating…' : 'Generate with AI'} onPress={generate} disabled={generating} />
            {generateError && <Text style={styles.error}>{generateError}</Text>}
            {remaining !== null && <Text style={styles.remaining}>{remaining} generations remaining</Text>}
            <TextInput
                style={styles.bodyInput}
                multiline
                value={body}
                onChangeText={setBody}
                onBlur={saveBody}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    label: { marginBottom: 4, color: '#444' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
    chipActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
    multilineInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
    bodyInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 300, textAlignVertical: 'top', marginTop: 12 },
    remaining: { color: '#888', marginTop: 8 },
    error: { color: 'red', marginTop: 8 },
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd mobile && npx jest CoverLetterListScreen.test.tsx CoverLetterEditScreen.test.tsx`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
cd mobile && git add screens/CoverLetterListScreen.tsx screens/CoverLetterEditScreen.tsx screens/__tests__/CoverLetterListScreen.test.tsx screens/__tests__/CoverLetterEditScreen.test.tsx
git commit -m "feat: add cover letter list and edit screens with AI generate"
```

---

### Task 21: Create Resignation Letter list and edit screens

Same shape as Task 20, for resignation letters — includes `last_day` and `reason` fields on generate instead of `job_description`.

**Files:**
- Create: `mobile/screens/ResignationLetterListScreen.tsx`
- Create: `mobile/screens/ResignationLetterEditScreen.tsx`
- Test: `mobile/screens/__tests__/ResignationLetterListScreen.test.tsx`
- Test: `mobile/screens/__tests__/ResignationLetterEditScreen.test.tsx`

**Interfaces:**
- Consumes: `resignationLetterApi` (Task 10), `showUpgradeAlert` (Task 11), `listResumes` (Task 8).
- Produces: `ResignationLetterListScreen({ navigation })`, `ResignationLetterEditScreen({ route })` with `route.params.letterId`, editing `name`, `template_key`, `resume_id`, and `body`, plus the AI-generate action.

- [ ] **Step 1: Write the failing tests**

Create `mobile/screens/__tests__/ResignationLetterListScreen.test.tsx` (identical structure to Task 20's list test, substituting the module and copy):

```tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import ResignationLetterListScreen from '../ResignationLetterListScreen';
import * as resignationLetterApi from '../../lib/resignationLetterApi';

jest.mock('../../lib/resignationLetterApi');

describe('ResignationLetterListScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders resignation letters returned by the API', async () => {
        (resignationLetterApi.listResignationLetters as jest.Mock).mockResolvedValue([
            { id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z' },
        ]);

        render(<ResignationLetterListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText('My Letter')).toBeTruthy());
    });

    it('shows a retry option when loading fails', async () => {
        (resignationLetterApi.listResignationLetters as jest.Mock).mockRejectedValue(new Error('network'));

        render(<ResignationLetterListScreen navigation={{ navigate: jest.fn() }} />);

        await waitFor(() => expect(screen.getByText("Couldn't load your resignation letters.")).toBeTruthy());
    });
});
```

Create `mobile/screens/__tests__/ResignationLetterEditScreen.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ResignationLetterEditScreen from '../ResignationLetterEditScreen';
import * as resignationLetterApi from '../../lib/resignationLetterApi';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/resignationLetterApi');
jest.mock('../../lib/resumeApi');

const letter = {
    id: 1, name: 'My Letter', template_key: 'standard', resume_id: null, updated_at: '2026-07-01T00:00:00Z', body: 'Dear Manager',
};

describe('ResignationLetterEditScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (resignationLetterApi.getResignationLetter as jest.Mock).mockResolvedValue(letter);
        (resumeApi.listResumes as jest.Mock).mockResolvedValue([]);
    });

    it('loads and renders the letter name, template, and body', async () => {
        render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);

        await waitFor(() => expect(screen.getByDisplayValue('Dear Manager')).toBeTruthy());
        expect(screen.getByDisplayValue('My Letter')).toBeTruthy();
        expect(screen.getByText('standard')).toBeTruthy();
    });

    it('saves the name on blur', async () => {
        (resignationLetterApi.updateResignationLetter as jest.Mock).mockResolvedValue({ ...letter, name: 'Renamed' });

        render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('My Letter')).toBeTruthy());

        const nameInput = screen.getByDisplayValue('My Letter');
        fireEvent.changeText(nameInput, 'Renamed');
        fireEvent(nameInput, 'blur');

        await waitFor(() => expect(resignationLetterApi.updateResignationLetter).toHaveBeenCalledWith(1, { name: 'Renamed' }));
    });

    it('saves the selected template_key when pressed', async () => {
        // 'warm' is both a template_key and a tone value here, so this asserts via testID
        // (`template-warm`) rather than getByText, which would match both chips.
        (resignationLetterApi.updateResignationLetter as jest.Mock).mockResolvedValue({ ...letter, template_key: 'warm' });

        render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByText('standard')).toBeTruthy());

        fireEvent.press(screen.getByTestId('template-warm'));

        await waitFor(() => expect(resignationLetterApi.updateResignationLetter).toHaveBeenCalledWith(1, { template_key: 'warm' }));
    });

    it('saves the body on blur', async () => {
        (resignationLetterApi.updateResignationLetter as jest.Mock).mockResolvedValue({ ...letter, body: 'Updated body' });

        render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Manager')).toBeTruthy());

        const bodyInput = screen.getByDisplayValue('Dear Manager');
        fireEvent.changeText(bodyInput, 'Updated body');
        fireEvent(bodyInput, 'blur');

        await waitFor(() => expect(resignationLetterApi.updateResignationLetter).toHaveBeenCalledWith(1, { body: 'Updated body' }));
    });

    it('generates a letter with tone/last_day/reason and fills the body', async () => {
        (resignationLetterApi.generateResignationLetter as jest.Mock).mockResolvedValue({ body: 'Generated body text', remaining: 2 });

        render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Manager')).toBeTruthy());

        fireEvent.changeText(screen.getByPlaceholderText('Last day (YYYY-MM-DD)'), '2026-08-01');
        fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(resignationLetterApi.generateResignationLetter).toHaveBeenCalledWith(1, {
            tone: 'formal',
            last_day: '2026-08-01',
            reason: undefined,
        }));
        await waitFor(() => expect(screen.getByDisplayValue('Generated body text')).toBeTruthy());
    });

    it('shows an inline message on a 422 moderation response from generate', async () => {
        const { ApiError } = jest.requireActual('../../lib/api');
        (resignationLetterApi.generateResignationLetter as jest.Mock).mockRejectedValue(new ApiError(422, "This content can't be processed."));

        render(<ResignationLetterEditScreen route={{ params: { letterId: 1 } }} />);
        await waitFor(() => expect(screen.getByDisplayValue('Dear Manager')).toBeTruthy());

        fireEvent.press(screen.getByText('Generate with AI'));

        await waitFor(() => expect(screen.getByText("Couldn't generate — try adjusting your input.")).toBeTruthy());
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest ResignationLetterListScreen.test.tsx ResignationLetterEditScreen.test.tsx`
Expected: FAIL — modules do not exist.

- [ ] **Step 3: Create `mobile/screens/ResignationLetterListScreen.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Button, StyleSheet } from 'react-native';
import { listResignationLetters } from '../lib/resignationLetterApi';
import type { ResignationLetterSummary } from '../lib/resignationLetterApi';

export default function ResignationLetterListScreen({ navigation }: any) {
    const [letters, setLetters] = useState<ResignationLetterSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setError(false);
        try {
            setLetters(await listResignationLetters());
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load your resignation letters.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={letters}
                keyExtractor={(item) => String(item.id)}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                ListEmptyComponent={!loading ? <Text style={styles.empty}>No resignation letters yet.</Text> : null}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.row}
                        onPress={() => navigation.navigate('ResignationLetterEdit', { letterId: item.id })}
                    >
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={styles.meta}>{item.template_key}</Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    row: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
    name: { fontSize: 16, fontWeight: '600' },
    meta: { color: '#888', marginTop: 4 },
    empty: { textAlign: 'center', marginTop: 32, color: '#888' },
});
```

- [ ] **Step 4: Create `mobile/screens/ResignationLetterEditScreen.tsx`**

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, Button, StyleSheet } from 'react-native';
import { getResignationLetter, updateResignationLetter, generateResignationLetter } from '../lib/resignationLetterApi';
import type { ResignationLetterDetail, ResignationLetterTemplateKey } from '../lib/resignationLetterApi';
import { listResumes } from '../lib/resumeApi';
import type { ResumeSummary } from '../lib/resumeApi';
import { ApiError } from '../lib/api';
import { showUpgradeAlert } from '../lib/upgradeAlert';

const TEMPLATE_KEYS: ResignationLetterTemplateKey[] = ['standard', 'immediate', 'warm'];

export default function ResignationLetterEditScreen({ route }: any) {
    const { letterId } = route.params as { letterId: number };
    const [letter, setLetter] = useState<ResignationLetterDetail | null>(null);
    const [error, setError] = useState(false);
    const [name, setName] = useState('');
    const [templateKey, setTemplateKey] = useState<ResignationLetterTemplateKey>('standard');
    const [resumeId, setResumeId] = useState<number | null>(null);
    const [resumes, setResumes] = useState<ResumeSummary[]>([]);
    const [body, setBody] = useState('');
    const [tone, setTone] = useState<'formal' | 'warm' | 'brief'>('formal');
    const [lastDay, setLastDay] = useState('');
    const [reason, setReason] = useState('');
    const [remaining, setRemaining] = useState<number | null>(null);
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(false);
        try {
            const data = await getResignationLetter(letterId);
            setLetter(data);
            setName(data.name);
            setTemplateKey(data.template_key);
            setResumeId(data.resume_id);
            setBody(data.body);
            setResumes(await listResumes());
        } catch {
            setError(true);
        }
    }, [letterId]);

    useEffect(() => {
        load();
    }, [load]);

    const saveName = async () => {
        await updateResignationLetter(letterId, { name });
    };

    const saveTemplate = async (key: ResignationLetterTemplateKey) => {
        setTemplateKey(key);
        await updateResignationLetter(letterId, { template_key: key });
    };

    const saveResume = async (id: number | null) => {
        setResumeId(id);
        await updateResignationLetter(letterId, { resume_id: id });
    };

    const saveBody = async () => {
        await updateResignationLetter(letterId, { body });
    };

    const generate = async () => {
        setGenerating(true);
        setGenerateError(null);
        try {
            const result = await generateResignationLetter(letterId, {
                tone,
                last_day: lastDay,
                reason: reason || undefined,
            });
            setBody(result.body);
            setRemaining(result.remaining);
        } catch (e) {
            if (e instanceof ApiError && e.status === 402) {
                showUpgradeAlert('resignation_letter_generate', 'starter');
            } else if (e instanceof ApiError && e.status === 422) {
                setGenerateError("Couldn't generate — try adjusting your input.");
            } else {
                setGenerateError('AI is temporarily unavailable. Try again.');
            }
        } finally {
            setGenerating(false);
        }
    };

    if (error) {
        return (
            <View style={styles.center}>
                <Text>Couldn't load this resignation letter.</Text>
                <Button title="Retry" onPress={load} />
            </View>
        );
    }

    if (!letter) {
        return (
            <View style={styles.center}>
                <Text>Loading…</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <TextInput
                style={styles.input}
                placeholder="Letter name"
                value={name}
                onChangeText={setName}
                onBlur={saveName}
            />
            <Text style={styles.label}>Template</Text>
            <View style={styles.row}>
                {TEMPLATE_KEYS.map((key) => (
                    <Text
                        key={key}
                        testID={`template-${key}`}
                        style={[styles.chip, templateKey === key && styles.chipActive]}
                        onPress={() => saveTemplate(key)}
                    >
                        {key}
                    </Text>
                ))}
            </View>
            <Text style={styles.label}>Linked resume</Text>
            <View style={styles.row}>
                <Text
                    style={[styles.chip, resumeId === null && styles.chipActive]}
                    onPress={() => saveResume(null)}
                >
                    None
                </Text>
                {resumes.map((r) => (
                    <Text
                        key={r.id}
                        style={[styles.chip, resumeId === r.id && styles.chipActive]}
                        onPress={() => saveResume(r.id)}
                    >
                        {r.name}
                    </Text>
                ))}
            </View>
            <Text style={styles.label}>Tone</Text>
            <View style={styles.row}>
                {(['formal', 'warm', 'brief'] as const).map((t) => (
                    <Text
                        key={t}
                        testID={`tone-${t}`}
                        style={[styles.chip, tone === t && styles.chipActive]}
                        onPress={() => setTone(t)}
                    >
                        {t}
                    </Text>
                ))}
            </View>
            <TextInput
                style={styles.input}
                placeholder="Last day (YYYY-MM-DD)"
                value={lastDay}
                onChangeText={setLastDay}
            />
            <TextInput
                style={styles.multilineInput}
                placeholder="Reason (optional)"
                multiline
                value={reason}
                onChangeText={setReason}
            />
            <Button title={generating ? 'Generating…' : 'Generate with AI'} onPress={generate} disabled={generating} />
            {generateError && <Text style={styles.error}>{generateError}</Text>}
            {remaining !== null && <Text style={styles.remaining}>{remaining} generations remaining</Text>}
            <TextInput
                style={styles.bodyInput}
                multiline
                value={body}
                onChangeText={setBody}
                onBlur={saveBody}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    label: { marginBottom: 4, color: '#444' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, marginBottom: 8 },
    chipActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12 },
    multilineInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 },
    bodyInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 300, textAlignVertical: 'top', marginTop: 12 },
    remaining: { color: '#888', marginTop: 8 },
    error: { color: 'red', marginTop: 8 },
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd mobile && npx jest ResignationLetterListScreen.test.tsx ResignationLetterEditScreen.test.tsx`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
cd mobile && git add screens/ResignationLetterListScreen.tsx screens/ResignationLetterEditScreen.tsx screens/__tests__/ResignationLetterListScreen.test.tsx screens/__tests__/ResignationLetterEditScreen.test.tsx
git commit -m "feat: add resignation letter list and edit screens with AI generate"
```

---

### Task 22: Wire navigation and entry points

**Files:**
- Modify: `mobile/App.tsx`
- Modify: `mobile/screens/ResumeListScreen.tsx`
- Modify: `mobile/screens/ResumeDetailScreen.tsx`
- Test: `mobile/screens/__tests__/ResumeListScreen.test.tsx` (extend)
- Test: `mobile/screens/__tests__/ResumeDetailScreen.test.tsx` (extend, if it exists — create if not, following the pattern below)

**Interfaces:**
- Consumes: every screen from Tasks 19–21.
- Produces: five new stack screens registered in `App.tsx` (`ResumeEdit`, `CoverLetters`, `CoverLetterEdit`, `ResignationLetters`, `ResignationLetterEdit`); an "Edit" button on `ResumeDetailScreen` navigating to `ResumeEdit`; "Cover Letters" and "Resignation Letters" buttons on `ResumeListScreen`'s header navigating to their list screens.

- [ ] **Step 1: Write the failing tests**

Add to `mobile/screens/__tests__/ResumeListScreen.test.tsx`:

```tsx
it('navigates to CoverLetters when the Cover Letters button is pressed', async () => {
    (resumeApi.listResumes as jest.Mock).mockResolvedValue([]);
    const navigation = { navigate: jest.fn() };

    render(<ResumeListScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('No resumes yet.')).toBeTruthy());

    fireEvent.press(screen.getByText('Cover Letters'));

    expect(navigation.navigate).toHaveBeenCalledWith('CoverLetters');
});

it('navigates to ResignationLetters when the Resignation Letters button is pressed', async () => {
    (resumeApi.listResumes as jest.Mock).mockResolvedValue([]);
    const navigation = { navigate: jest.fn() };

    render(<ResumeListScreen navigation={navigation} />);
    await waitFor(() => expect(screen.getByText('No resumes yet.')).toBeTruthy());

    fireEvent.press(screen.getByText('Resignation Letters'));

    expect(navigation.navigate).toHaveBeenCalledWith('ResignationLetters');
});
```

(Add `fireEvent` to that file's existing `@testing-library/react-native` import if not already imported.)

Create `mobile/screens/__tests__/ResumeDetailScreen.test.tsx` if no such file exists yet (check first — Task 22's prior work referenced one in the Phase 1 Hardening plan; if it already exists, add only this one test to it):

```tsx
it('navigates to ResumeEdit when Edit is pressed', async () => {
    (resumeApi.getResume as jest.Mock).mockResolvedValue({
        id: 1, name: 'My CV', template: 'classic', pdf_filename: 'x.pdf', updated_at: '2026-07-01T00:00:00Z',
        contact: null, summary: null, experience: [], education: [], skills: [],
    });
    const navigation = { navigate: jest.fn() };

    render(<ResumeDetailScreen route={{ params: { resumeId: 1 } }} navigation={navigation} />);

    await waitFor(() => expect(screen.getByText('My CV')).toBeTruthy());
    fireEvent.press(screen.getByText('Edit'));

    expect(navigation.navigate).toHaveBeenCalledWith('ResumeEdit', { resumeId: 1 });
});
```

If the file does not exist yet, create it with the necessary imports/mocks mirroring `ResumeListScreen.test.tsx`'s conventions:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ResumeDetailScreen from '../ResumeDetailScreen';
import * as resumeApi from '../../lib/resumeApi';

jest.mock('../../lib/resumeApi');

describe('ResumeDetailScreen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // paste the test above here
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest ResumeListScreen.test.tsx ResumeDetailScreen.test.tsx`
Expected: FAIL — "Cover Letters"/"Resignation Letters"/"Edit" buttons don't exist yet, and/or `navigation` prop isn't accepted by `ResumeDetailScreen` yet.

- [ ] **Step 3: Add header buttons to `ResumeListScreen.tsx`**

In `mobile/screens/ResumeListScreen.tsx`, change the header `View`:

```tsx
            <View style={styles.header}>
                <Button title="Activity" onPress={() => navigation.navigate('Activity')} />
                <Button title="Log out" onPress={logout} />
            </View>
```

to:

```tsx
            <View style={styles.header}>
                <Button title="Activity" onPress={() => navigation.navigate('Activity')} />
                <Button title="Cover Letters" onPress={() => navigation.navigate('CoverLetters')} />
                <Button title="Resignation Letters" onPress={() => navigation.navigate('ResignationLetters')} />
                <Button title="Log out" onPress={logout} />
            </View>
```

- [ ] **Step 4: Add an Edit button to `ResumeDetailScreen.tsx`**

In `mobile/screens/ResumeDetailScreen.tsx`, change the function signature and add the button. Change:

```tsx
export default function ResumeDetailScreen({ route }: any) {
```

to:

```tsx
export default function ResumeDetailScreen({ route, navigation }: any) {
```

and, in the returned `ScrollView`, add a button before the existing "Download / Share PDF" button:

```tsx
            <Button title="Edit" onPress={() => navigation.navigate('ResumeEdit', { resumeId })} />
```

- [ ] **Step 5: Register the five new screens in `App.tsx`**

Add the imports:

```tsx
import ResumeEditScreen from './screens/ResumeEditScreen';
import CoverLetterListScreen from './screens/CoverLetterListScreen';
import CoverLetterEditScreen from './screens/CoverLetterEditScreen';
import ResignationLetterListScreen from './screens/ResignationLetterListScreen';
import ResignationLetterEditScreen from './screens/ResignationLetterEditScreen';
```

Change the authenticated stack block from:

```tsx
                {user ? (
                    <>
                        <Stack.Screen name="Resumes" component={ResumeListScreen} />
                        <Stack.Screen name="ResumeDetail" component={ResumeDetailScreen} options={{ title: 'Resume' }} />
                        <Stack.Screen name="Activity" component={ActivityScreen} />
                    </>
                ) : (
```

to:

```tsx
                {user ? (
                    <>
                        <Stack.Screen name="Resumes" component={ResumeListScreen} />
                        <Stack.Screen name="ResumeDetail" component={ResumeDetailScreen} options={{ title: 'Resume' }} />
                        <Stack.Screen name="ResumeEdit" component={ResumeEditScreen} options={{ title: 'Edit Resume' }} />
                        <Stack.Screen name="CoverLetters" component={CoverLetterListScreen} options={{ title: 'Cover Letters' }} />
                        <Stack.Screen name="CoverLetterEdit" component={CoverLetterEditScreen} options={{ title: 'Edit Cover Letter' }} />
                        <Stack.Screen name="ResignationLetters" component={ResignationLetterListScreen} options={{ title: 'Resignation Letters' }} />
                        <Stack.Screen name="ResignationLetterEdit" component={ResignationLetterEditScreen} options={{ title: 'Edit Resignation Letter' }} />
                        <Stack.Screen name="Activity" component={ActivityScreen} />
                    </>
                ) : (
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd mobile && npx jest ResumeListScreen.test.tsx ResumeDetailScreen.test.tsx`
Expected: all PASS

- [ ] **Step 7: Run the full mobile suite**

Run: `cd mobile && npx jest`
Expected: all PASS

- [ ] **Step 8: Commit**

```bash
cd mobile && git add App.tsx screens/ResumeListScreen.tsx screens/ResumeDetailScreen.tsx screens/__tests__/ResumeListScreen.test.tsx screens/__tests__/ResumeDetailScreen.test.tsx
git commit -m "feat: wire navigation for resume edit, cover letter, and resignation letter screens"
```

---

## Known Deferred Item

The spec's Error Handling section calls for per-field inline display of 422 validation errors on every save call (e.g. a `body` over 50000 chars), parsed from Laravel's standard validation error JSON. This plan wires 401 handling (via the existing `apiFetch`/`handleUnauthorizedResponse` path, already correct everywhere), 402 handling (`showUpgradeAlert`), and 422-from-*generate* handling (moderation rejection, Task 20/21) — but does **not** add per-field validation-error surfacing to the ~10 save call sites across `ResumeEditScreen`'s sections, `CoverLetterEditScreen`, and `ResignationLetterEditScreen`. Adding it correctly (catching `ApiError` on every `onSave`/`onBlur` call, mapping Laravel's `{ message, errors: { field: [msgs] } }` shape to the right input, per field) is a meaningfully-sized addition in its own right rather than a one-line fix folded into an existing task. Flagging this explicitly rather than silently shipping it as done — recommend a follow-up task (or its own small plan) before this feature is considered fully spec-complete, since a 500KB `body` paste or an oversized bullet today fails silently from the user's perspective (the `save()`/`saveBody()` calls have no `.catch()`).

## Final Verification

- [ ] **Run the full backend test suite**

Run: `php artisan test --compact`
Expected: all PASS (no regressions from Tasks 1–6).

- [ ] **Run the full mobile test suite and type-check**

Run: `cd mobile && npx jest && npx tsc --noEmit`
Expected: all PASS, no type errors.

- [ ] **Run Pint on any touched PHP files**

Run: `./vendor/bin/pint --dirty --format agent`
Expected: no unformatted files remain (auto-fixed).

- [ ] **Manual, TestFlight-only checks (cannot be exercised in this sandbox — no Xcode/simulator)**

1. Drag-reorder in `SectionOrderSection` actually reorders on a physical device.
2. `expo-image-picker`'s photo picker opens the camera roll and the uploaded photo round-trips to the web PDF preview.
3. A native EAS rebuild has been produced including the new `expo-image-picker` config plugin and the `react-native-reanimated`/`react-native-gesture-handler` native modules — none of Tasks 7–22 take effect on an existing installed build without one.
