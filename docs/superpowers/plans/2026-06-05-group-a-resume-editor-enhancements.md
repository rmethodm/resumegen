# Group A: Resume Editor Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add section drag-and-drop reordering, custom sections (structured entries), a resume strength bar on the dashboard, and 5 new templates (skills-first, skills-first-visual, academic, bold, timeline) to Resumegen.

**Architecture:** Two new nullable JSON columns (`section_order`, `custom_sections`) on the `resumes` table feed the editor and PDF renderer. A new `ResumeStrengthScorer` service computes a 0–100 score shown on the resume list dashboard. dnd-kit handles section reordering in React. All 5 new templates are rendered server-side in the existing Blade PDF view.

**Tech Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, dnd-kit (`@dnd-kit/core` + `@dnd-kit/sortable`), PHPUnit 12

---

## File Map

**New files:**
- `database/migrations/2026_06_05_100000_add_section_order_and_custom_sections_to_resumes_table.php`
- `app/Services/ResumeStrengthScorer.php`
- `tests/Unit/ResumeStrengthScorerTest.php`
- `tests/Feature/CustomSectionsTest.php`
- `tests/Feature/SectionOrderTest.php`

**Modified files:**
- `app/Models/Resume.php` — add `section_order`, `custom_sections` to `$fillable` and `$casts`
- `app/Services/UserLimits.php` — add `customSectionLimit()`, update `FREE_TEMPLATES` and `ALL_TEMPLATES`
- `app/Http/Controllers/ResumeBuilderController.php` — accept new fields in `resumeRules()`, call scorer in `index()`, pass `customSectionLimit` in `edit()`
- `resources/js/Pages/ResumeBuilder/Index.tsx` — add strength bar to each resume card
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — add dnd-kit, custom sections UI, section_order state, academic synergy banner, ATS badges
- `resources/js/types/index.d.ts` — add `section_order`, `custom_sections`, `strength`, `strength_tip`, `custom_section_limit` to Resume type
- `resources/views/resume-pdf.blade.php` — add custom_sections render loop + 5 new template branches
- `tests/Feature/ResumeBuilderTest.php` — add template gate tests for new templates

---

## Task 1: Migration — `section_order` and `custom_sections`

**Files:**
- Create: `database/migrations/2026_06_05_100000_add_section_order_and_custom_sections_to_resumes_table.php`

- [ ] **Step 1: Create the migration**

```bash
php artisan make:migration add_section_order_and_custom_sections_to_resumes_table --no-interaction
```

Replace the generated file body with:

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
            $table->json('section_order')->nullable()->after('font_sizes');
            $table->json('custom_sections')->nullable()->after('section_order');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropColumn(['section_order', 'custom_sections']);
        });
    }
};
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate
```

Expected output: `Migrating: 2026_06_05_100000_add_section_order_and_custom_sections_to_resumes_table` followed by `Migrated`.

- [ ] **Step 3: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 4: Commit**

```bash
git add database/migrations/2026_06_05_100000_add_section_order_and_custom_sections_to_resumes_table.php
git commit -m "feat: add section_order and custom_sections columns to resumes"
```

---

## Task 2: Resume Model + UserLimits Updates

**Files:**
- Modify: `app/Models/Resume.php`
- Modify: `app/Services/UserLimits.php`

- [ ] **Step 1: Update `app/Models/Resume.php`**

Add `section_order` and `custom_sections` to `$fillable`:

```php
protected $fillable = [
    'user_id', 'name', 'pdf_filename', 'template',
    'accent_color', 'font_family',
    'contact', 'summary', 'experience', 'education',
    'skills', 'certifications', 'font_sizes',
    'ats_cache', 'ats_cached_at',
    'section_order', 'custom_sections',
];
```

Add both to `$casts`:

```php
protected $casts = [
    'contact' => 'array',
    'experience' => 'array',
    'education' => 'array',
    'skills' => 'array',
    'certifications' => 'array',
    'font_sizes' => 'array',
    'ats_cache' => 'array',
    'ats_cached_at' => 'datetime',
    'section_order' => 'array',
    'custom_sections' => 'array',
];
```

- [ ] **Step 2: Update `app/Services/UserLimits.php`**

Replace the two template constants and add `customSectionLimit()`:

```php
private const FREE_TEMPLATES = ['classic', 'modern', 'ats', 'skills-first', 'bold'];

private const ALL_TEMPLATES = [
    'classic', 'modern', 'minimal', 'minimal-ruled',
    'sidebar', 'creative', 'executive', 'ats',
    'skills-first', 'skills-first-visual', 'academic', 'bold', 'timeline',
];
```

Add this method after `canAts()`:

```php
public static function customSectionLimit(User $user): ?int
{
    return $user->planTier() === 'free' ? 2 : null;
}

public static function canTailor(User $user): bool
{
    return $user->isAtLeastStarter();
}
```

Note: `canTailor` already exists — only add `customSectionLimit`. Do not duplicate `canTailor`.

- [ ] **Step 3: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 4: Commit**

```bash
git add app/Models/Resume.php app/Services/UserLimits.php
git commit -m "feat: add section_order and custom_sections to Resume model, add customSectionLimit to UserLimits"
```

---

## Task 3: `ResumeStrengthScorer` Service + Unit Tests

**Files:**
- Create: `app/Services/ResumeStrengthScorer.php`
- Create: `tests/Unit/ResumeStrengthScorerTest.php`

- [ ] **Step 1: Create the unit test**

```bash
php artisan make:test --phpunit --unit ResumeStrengthScorerTest --no-interaction
```

Replace the generated file with:

```php
<?php

namespace Tests\Unit;

use App\Models\Resume;
use App\Services\ResumeStrengthScorer;
use PHPUnit\Framework\TestCase;

class ResumeStrengthScorerTest extends TestCase
{
    private function makeResume(array $attrs = []): Resume
    {
        $resume = new Resume();
        $resume->setRawAttributes(array_merge([
            'contact' => json_encode([]),
            'summary' => null,
            'experience' => json_encode([]),
            'education' => json_encode([]),
            'skills' => json_encode([]),
            'certifications' => json_encode([]),
            'custom_sections' => json_encode([]),
        ], $attrs));

        return $resume;
    }

    public function test_empty_resume_scores_zero(): void
    {
        $resume = $this->makeResume();
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(0, $result['score']);
    }

    public function test_complete_contact_adds_15_points(): void
    {
        // contact uses 'full_name' key (matches Blade template convention)
        $resume = $this->makeResume([
            'contact' => json_encode(['full_name' => 'Alex Johnson', 'email' => 'a@b.com', 'location' => 'SF']),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(15, $result['score']);
    }

    public function test_summary_adds_15_points(): void
    {
        $resume = $this->makeResume(['summary' => 'Senior engineer with 5 years experience.']);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(15, $result['score']);
    }

    public function test_one_experience_adds_15_points(): void
    {
        // bullets is a newline-separated string, not an array
        $resume = $this->makeResume([
            'experience' => json_encode([['id' => '1', 'company' => 'Acme', 'bullets' => '']]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(15, $result['score']);
    }

    public function test_two_experiences_adds_25_points(): void
    {
        $resume = $this->makeResume([
            'experience' => json_encode([
                ['id' => '1', 'company' => 'Acme', 'bullets' => ''],
                ['id' => '2', 'company' => 'Beta', 'bullets' => ''],
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(25, $result['score']); // 15 (>=1) + 10 (>=2)
    }

    public function test_education_adds_10_points(): void
    {
        $resume = $this->makeResume([
            'education' => json_encode([['id' => '1', 'school' => 'MIT']]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(10, $result['score']);
    }

    public function test_three_skills_adds_10_points(): void
    {
        $resume = $this->makeResume([
            'skills' => json_encode([['name' => 'PHP'], ['name' => 'React'], ['name' => 'SQL']]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(10, $result['score']);
    }

    public function test_fewer_than_three_skills_adds_zero(): void
    {
        $resume = $this->makeResume([
            'skills' => json_encode([['name' => 'PHP'], ['name' => 'React']]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(0, $result['score']);
    }

    public function test_bullet_with_number_adds_10_points(): void
    {
        // bullets is a newline-separated string
        $resume = $this->makeResume([
            'experience' => json_encode([
                ['id' => '1', 'company' => 'Acme', 'bullets' => "Reduced latency by 40%\nImproved test coverage"],
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(25, $result['score']); // 15 (>=1 exp) + 10 (metric bullet)
    }

    public function test_linkedin_url_adds_5_points(): void
    {
        $resume = $this->makeResume([
            'contact' => json_encode([
                'full_name' => 'Alex', 'email' => 'a@b.com', 'location' => 'SF',
                'linkedin' => 'https://linkedin.com/in/alex',
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(20, $result['score']); // 15 (complete contact) + 5 (linkedin)
    }

    public function test_experience_with_3_bullets_adds_5_bonus_points(): void
    {
        // bullets is a newline-separated string
        $resume = $this->makeResume([
            'experience' => json_encode([
                ['id' => '1', 'bullets' => "Bullet A\nBullet B\nBullet C"],
            ]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(20, $result['score']); // 15 (>=1 exp) + 5 (3+ bullets)
    }

    public function test_custom_section_adds_5_points(): void
    {
        $resume = $this->makeResume([
            'custom_sections' => json_encode([['id' => '1', 'name' => 'Publications', 'entries' => []]]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(5, $result['score']);
    }

    public function test_tip_is_highest_point_unmet_criterion(): void
    {
        // Summary (15pts) and experience (15pts) both missing — tip should mention summary or experience
        $resume = $this->makeResume([
            'contact' => json_encode(['name' => 'Alex', 'email' => 'a@b.com', 'location' => 'SF']),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        // Both summary and experience are 15pts; either is valid as the tip
        $this->assertStringContainsString('summary', strtolower($result['tip']));
    }

    public function test_perfect_resume_scores_100(): void
    {
        // skills is plain string[], bullets is newline-separated string, contact uses full_name
        $resume = $this->makeResume([
            'contact' => json_encode([
                'full_name' => 'Alex Johnson', 'email' => 'a@b.com', 'location' => 'SF',
                'linkedin' => 'https://linkedin.com/in/alex',
            ]),
            'summary' => 'Senior engineer.',
            'experience' => json_encode([
                ['id' => '1', 'company' => 'Acme', 'bullets' => "Led 5-person team\nCut costs 30%\nBuilt 10 features"],
                ['id' => '2', 'company' => 'Beta', 'bullets' => "Shipped v2 in 60 days"],
            ]),
            'education' => json_encode([['id' => '1', 'school' => 'MIT']]),
            'skills' => json_encode(['PHP', 'React', 'SQL']),
            'certifications' => json_encode([['id' => '1', 'name' => 'AWS']]),
        ]);
        $result = ResumeStrengthScorer::score($resume);
        $this->assertSame(100, $result['score']);
    }
}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
php artisan test --compact tests/Unit/ResumeStrengthScorerTest.php
```

Expected: multiple FAILs — `ResumeStrengthScorer` not found.

- [ ] **Step 3: Create `app/Services/ResumeStrengthScorer.php`**

**Important data shape notes:**
- `skills` is a plain `string[]` array e.g. `['PHP', 'React', 'SQL']` — not `{name: string}` objects.
- `experience[*]['bullets']` is a **newline-separated string**, not a string array. Use `explode("\n", ...)` to split it.
- `contact` field name for full name is `full_name` (matches the Blade template), not `name`.

```php
<?php

namespace App\Services;

use App\Models\Resume;

class ResumeStrengthScorer
{
    public static function score(Resume $resume): array
    {
        $points = 0;
        $tips = [];

        $contact = $resume->contact ?? [];
        $experience = $resume->experience ?? [];
        $education = $resume->education ?? [];
        $skills = $resume->skills ?? [];
        $certifications = $resume->certifications ?? [];
        $customSections = $resume->custom_sections ?? [];

        // Contact info complete — 15pts
        if (!empty($contact['full_name']) && !empty($contact['email']) && !empty($contact['location'])) {
            $points += 15;
        } else {
            $tips[] = ['pts' => 15, 'tip' => 'Complete your contact information'];
        }

        // Professional summary — 15pts
        if (!empty($resume->summary)) {
            $points += 15;
        } else {
            $tips[] = ['pts' => 15, 'tip' => 'Add a professional summary'];
        }

        // At least 1 experience — 15pts
        if (count($experience) >= 1) {
            $points += 15;
        } else {
            $tips[] = ['pts' => 15, 'tip' => 'Add at least one work experience'];
        }

        // Education — 10pts
        if (count($education) >= 1) {
            $points += 10;
        } else {
            $tips[] = ['pts' => 10, 'tip' => 'Add your education'];
        }

        // At least 3 skills — 10pts (skills is a plain string[])
        if (count($skills) >= 3) {
            $points += 10;
        } else {
            $tips[] = ['pts' => 10, 'tip' => 'Add at least 3 skills'];
        }

        // Bullet with number or metric — 10pts
        // bullets is a newline-separated string per experience entry
        $allBullets = collect($experience)
            ->flatMap(fn ($e) => array_filter(explode("\n", $e['bullets'] ?? '')))
            ->all();
        $hasMetric = collect($allBullets)->contains(fn ($b) => (bool) preg_match('/\d/', $b));
        if ($hasMetric) {
            $points += 10;
        } else {
            $tips[] = ['pts' => 10, 'tip' => 'Add numbers or metrics to your bullets'];
        }

        // At least 2 experiences — 10pts
        if (count($experience) >= 2) {
            $points += 10;
        } else {
            $tips[] = ['pts' => 10, 'tip' => 'Add a second work experience'];
        }

        // LinkedIn URL — 5pts
        if (!empty($contact['linkedin'])) {
            $points += 5;
        } else {
            $tips[] = ['pts' => 5, 'tip' => 'Add your LinkedIn URL'];
        }

        // At least one experience with 3+ bullets — 5pts
        $hasRichBullets = collect($experience)
            ->contains(fn ($e) => count(array_filter(explode("\n", $e['bullets'] ?? ''))) >= 3);
        if ($hasRichBullets) {
            $points += 5;
        } else {
            $tips[] = ['pts' => 5, 'tip' => 'Add 3+ bullets to a work experience entry'];
        }

        // Custom section or certification — 5pts
        if (count($certifications) >= 1 || count($customSections) >= 1) {
            $points += 5;
        } else {
            $tips[] = ['pts' => 5, 'tip' => 'Add a certification or custom section'];
        }

        usort($tips, fn ($a, $b) => $b['pts'] - $a['pts']);
        $tip = $tips[0]['tip'] ?? 'Your resume looks great!';

        return ['score' => $points, 'tip' => $tip];
    }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
php artisan test --compact tests/Unit/ResumeStrengthScorerTest.php
```

Expected: all tests PASS.

- [ ] **Step 5: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 6: Commit**

```bash
git add app/Services/ResumeStrengthScorer.php tests/Unit/ResumeStrengthScorerTest.php
git commit -m "feat: add ResumeStrengthScorer service with unit tests"
```

---

## Task 4: Strength Bar — Controller + Dashboard UI

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Update `ResumeBuilderController@index`**

Add `use App\Services\ResumeStrengthScorer;` to the imports.

Replace the `index()` method:

```php
public function index(Request $request)
{
    $user = $request->user();
    $resumes = $user->resumes()
        ->orderByDesc('updated_at')
        ->get()
        ->map(function (Resume $resume) {
            $strength = ResumeStrengthScorer::score($resume);

            return [
                'id' => $resume->id,
                'name' => $resume->name,
                'pdf_filename' => $resume->pdf_filename,
                'updated_at' => $resume->updated_at,
                'strength' => $strength['score'],
                'strength_tip' => $strength['tip'],
            ];
        });

    return Inertia::render('ResumeBuilder/Index', [
        'resumes' => $resumes,
        'resumeCount' => $resumes->count(),
        'resumeLimit' => UserLimits::resumeLimit($user),
        'allowedTemplates' => UserLimits::allowedTemplates($user),
    ]);
}
```

- [ ] **Step 2: Update the Resume TypeScript type in `resources/js/types/index.d.ts`**

Find the `Resume` interface (or type) and add:

```ts
strength: number;
strength_tip: string;
```

- [ ] **Step 3: Add strength bar to each resume card in `resources/js/Pages/ResumeBuilder/Index.tsx`**

Locate where the resume name is rendered in the table row (around the `<p className="cursor-pointer font-bold ...">` line). Directly below that name element, add:

```tsx
<div className="mt-1 flex items-center gap-2">
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#eeeef5]">
        <div
            className={`h-full rounded-full ${
                r.strength <= 40
                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                    : r.strength <= 70
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                      : 'bg-gradient-to-r from-indigo-500 to-violet-600'
            }`}
            style={{ width: `${r.strength}%` }}
        />
    </div>
    <span
        className={`text-xs font-bold tabular-nums ${
            r.strength <= 40
                ? 'text-red-500'
                : r.strength <= 70
                  ? 'text-amber-500'
                  : 'text-indigo-600'
        }`}
    >
        {r.strength}%
    </span>
</div>
{r.strength < 100 && (
    <p className="mt-0.5 text-xs text-[#a0a0b0]">{r.strength_tip}</p>
)}
```

- [ ] **Step 4: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 5: Build frontend and verify**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php resources/js/Pages/ResumeBuilder/Index.tsx resources/js/types/index.d.ts
git commit -m "feat: add resume strength bar to dashboard with color-coded score"
```

---

## Task 5: Controller — Accept `section_order` + `custom_sections`

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Create: `tests/Feature/SectionOrderTest.php`

- [ ] **Step 1: Create the feature test**

```bash
php artisan make:test --phpunit SectionOrderTest --no-interaction
```

Replace with:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SectionOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_section_order_can_be_saved(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $order = ['summary', 'skills', 'experience', 'education', 'certifications'];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['section_order' => $order])
            ->assertRedirect();

        $this->assertSame($order, $resume->fresh()->section_order);
    }

    public function test_section_order_persists_across_saves(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->put(route('builder.update', $resume), [
            'section_order' => ['skills', 'summary', 'experience', 'education', 'certifications'],
        ]);

        $this->actingAs($user)->put(route('builder.update', $resume), [
            'summary' => 'Updated summary',
        ]);

        $this->assertSame(
            ['skills', 'summary', 'experience', 'education', 'certifications'],
            $resume->fresh()->section_order
        );
    }

    public function test_other_user_cannot_update_section_order(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->put(route('builder.update', $resume), ['section_order' => ['summary']])
            ->assertForbidden();
    }
}
```

- [ ] **Step 2: Run test to confirm failure**

```bash
php artisan test --compact tests/Feature/SectionOrderTest.php
```

Expected: FAILs — `section_order` not accepted by validation.

- [ ] **Step 3: Update `resumeRules()` in `ResumeBuilderController`**

Replace `resumeRules()`:

```php
private static function resumeRules(): array
{
    return [
        'name'            => ['sometimes', 'required', 'string', 'max:255'],
        'template'        => ['sometimes', 'required', 'in:classic,modern,minimal,minimal-ruled,sidebar,creative,executive,ats,skills-first,skills-first-visual,academic,bold,timeline'],
        'accent_color'    => ['sometimes', 'nullable', 'in:#4f46e5,#1e3a5f,#475569,#166534,#7f1d1d,#1f2937,#0f766e,#78716c'],
        'font_family'     => ['sometimes', 'nullable', 'in:sans,serif,mono'],
        'summary'         => ['nullable', 'string'],
        'contact'         => ['nullable', 'array'],
        'experience'      => ['nullable', 'array'],
        'education'       => ['nullable', 'array'],
        'skills'          => ['nullable', 'array'],
        'certifications'  => ['nullable', 'array'],
        'font_sizes'      => ['nullable', 'array'],
        'section_order'   => ['nullable', 'array'],
        'section_order.*' => ['string'],
        'custom_sections' => ['nullable', 'array'],
    ];
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
php artisan test --compact tests/Feature/SectionOrderTest.php
```

Expected: all PASS.

- [ ] **Step 5: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/SectionOrderTest.php
git commit -m "feat: accept section_order and custom_sections in resume update, add new template keys to validation"
```

---

## Task 6: Custom Sections — Backend + Tests

**Files:**
- Create: `tests/Feature/CustomSectionsTest.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php` (edit method)
- Modify: `app/Services/UserLimits.php` (already updated in Task 2)

- [ ] **Step 1: Create the feature test**

```bash
php artisan make:test --phpunit CustomSectionsTest --no-interaction
```

Replace with:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomSectionsTest extends TestCase
{
    use RefreshDatabase;

    private function makeSection(string $id, string $name): array
    {
        return [
            'id' => $id,
            'name' => $name,
            'entries' => [
                [
                    'id' => 'entry-1',
                    'title' => 'My Paper',
                    'subtitle' => 'Journal of Things',
                    'start_date' => '2024-03',
                    'end_date' => null,
                    'description' => 'A great paper.',
                    'bullets' => ['Finding one', 'Finding two'],
                ],
            ],
        ];
    }

    public function test_custom_sections_can_be_saved(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $sections = [$this->makeSection('abc', 'Publications')];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['custom_sections' => $sections])
            ->assertRedirect();

        $saved = $resume->fresh()->custom_sections;
        $this->assertCount(1, $saved);
        $this->assertSame('Publications', $saved[0]['name']);
        $this->assertSame('My Paper', $saved[0]['entries'][0]['title']);
    }

    public function test_free_user_can_save_up_to_2_custom_sections(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $sections = [
            $this->makeSection('s1', 'Publications'),
            $this->makeSection('s2', 'Projects'),
        ];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['custom_sections' => $sections])
            ->assertRedirect();

        $this->assertCount(2, $resume->fresh()->custom_sections);
    }

    public function test_free_user_cannot_save_more_than_2_custom_sections(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $sections = [
            $this->makeSection('s1', 'Publications'),
            $this->makeSection('s2', 'Projects'),
            $this->makeSection('s3', 'Awards'),
        ];

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['custom_sections' => $sections])
            ->assertStatus(302);

        // Resume should not have been updated with 3 sections
        $this->assertNull($resume->fresh()->custom_sections);
    }

    public function test_starter_user_can_save_unlimited_custom_sections(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $sections = array_map(
            fn ($i) => $this->makeSection("s{$i}", "Section {$i}"),
            range(1, 10)
        );

        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['custom_sections' => $sections])
            ->assertRedirect();

        $this->assertCount(10, $resume->fresh()->custom_sections);
    }

    public function test_custom_section_limit_is_returned_in_edit_props(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume));
        $response->assertInertia(fn ($page) => $page->has('customSectionLimit'));
    }
}
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
php artisan test --compact tests/Feature/CustomSectionsTest.php
```

Expected: FAILs — no custom section limit enforcement yet.

- [ ] **Step 3: Add custom section limit enforcement in `ResumeBuilderController@update`**

In `update()`, after `$validated = $request->validate(self::resumeRules());` and before the template check, add:

```php
if (isset($validated['custom_sections'])) {
    $limit = UserLimits::customSectionLimit($request->user());
    if ($limit !== null && count($validated['custom_sections']) > $limit) {
        return back()->with('featureGate', [
            'feature' => 'custom_sections',
            'requiredTier' => 'starter',
            'message' => "Free accounts are limited to {$limit} custom sections.",
        ]);
    }
}
```

- [ ] **Step 4: Pass `customSectionLimit` in `edit()` method**

In the `edit()` method's `Inertia::render()` call, add to the props array:

```php
'customSectionLimit' => UserLimits::customSectionLimit($user),
```

- [ ] **Step 5: Run tests**

```bash
php artisan test --compact tests/Feature/CustomSectionsTest.php
```

Expected: all PASS.

- [ ] **Step 6: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php tests/Feature/CustomSectionsTest.php
git commit -m "feat: enforce custom section limit per tier, pass customSectionLimit to editor"
```

---

## Task 7: Custom Sections — Frontend Editor UI

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Add types to `resources/js/types/index.d.ts`**

Add these interfaces (find the existing Resume-related types and add alongside):

```ts
export interface CustomSectionEntry {
    id: string;
    title: string;
    subtitle: string;
    start_date: string;
    end_date: string | null;
    description: string;
    bullets: string[];
}

export interface CustomSection {
    id: string;
    name: string;
    entries: CustomSectionEntry[];
}
```

Add to the Resume page props (wherever `canAts`, `canDocx` etc. are defined):

```ts
customSectionLimit: number | null;
```

- [ ] **Step 2: Add `custom_sections` state to `Edit.tsx`**

At the top of the `Edit` component where other `useState` calls live, add:

```tsx
const [customSections, setCustomSections] = useState<CustomSection[]>(
    resume.custom_sections ?? []
);
```

Add a ref to mirror it (same pattern as other fields):

```tsx
const customSectionsRef = useRef(customSections);
useEffect(() => { customSectionsRef.current = customSections; }, [customSections]);
```

- [ ] **Step 3: Include `custom_sections` in the save payload**

In the `save` callback where `router.put` is called, add `custom_sections: customSectionsRef.current` to the data object alongside `experience`, `education`, etc.

- [ ] **Step 4: Add helper functions for custom section CRUD**

Add these functions inside the `Edit` component (after the existing `addExp`, `addEdu` helpers):

```tsx
const addCustomSection = () => {
    const id = crypto.randomUUID();
    setCustomSections(prev => [
        ...prev,
        { id, name: 'New Section', entries: [] },
    ]);
};

const updateCustomSection = (sectionId: string, field: 'name', value: string) => {
    setCustomSections(prev =>
        prev.map(s => (s.id === sectionId ? { ...s, [field]: value } : s))
    );
};

const deleteCustomSection = (sectionId: string) => {
    if (!window.confirm('Delete this section and all its entries?')) { return; }
    setCustomSections(prev => prev.filter(s => s.id !== sectionId));
};

const addCustomEntry = (sectionId: string) => {
    const entryId = crypto.randomUUID();
    setCustomSections(prev =>
        prev.map(s =>
            s.id === sectionId
                ? {
                      ...s,
                      entries: [
                          ...s.entries,
                          { id: entryId, title: '', subtitle: '', start_date: '', end_date: null, description: '', bullets: [] },
                      ],
                  }
                : s
        )
    );
};

const updateCustomEntry = (sectionId: string, entryId: string, field: keyof CustomSectionEntry, value: string | string[] | null) => {
    setCustomSections(prev =>
        prev.map(s =>
            s.id === sectionId
                ? { ...s, entries: s.entries.map(e => (e.id === entryId ? { ...e, [field]: value } : e)) }
                : s
        )
    );
};

const deleteCustomEntry = (sectionId: string, entryId: string) => {
    setCustomSections(prev =>
        prev.map(s =>
            s.id === sectionId ? { ...s, entries: s.entries.filter(e => e.id !== entryId) } : s
        )
    );
};
```

- [ ] **Step 5: Render custom sections in the editor**

After the last built-in section block (Certifications), and before the closing `</div>` of the editor panel, add:

```tsx
{/* Custom Sections */}
{customSections.map(section => (
    <div key={section.id} className="mb-5 rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
        <div className="flex w-full items-center justify-between border-l-4 border-indigo-400 bg-indigo-50 px-4 py-3">
            <input
                className="flex-1 bg-transparent text-sm font-semibold text-indigo-700 focus:outline-none"
                value={section.name}
                onChange={e => updateCustomSection(section.id, 'name', e.target.value)}
                onBlur={save}
            />
            <button
                type="button"
                onClick={() => { deleteCustomSection(section.id); setTimeout(save, 0); }}
                className="ml-2 text-xs text-red-400 hover:text-red-600"
                title="Delete section"
            >
                ✕
            </button>
        </div>
        <div className="divide-y divide-gray-100 bg-white">
            {section.entries.map((entry, idx) => (
                <div key={entry.id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400">Entry {idx + 1}</span>
                        <button
                            type="button"
                            onClick={() => { deleteCustomEntry(section.id, entry.id); setTimeout(save, 0); }}
                            className="text-xs text-red-400 hover:text-red-600"
                        >
                            Remove
                        </button>
                    </div>
                    <input
                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Title"
                        value={entry.title}
                        onChange={e => updateCustomEntry(section.id, entry.id, 'title', e.target.value)}
                        onBlur={save}
                    />
                    <input
                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Subtitle / Institution"
                        value={entry.subtitle}
                        onChange={e => updateCustomEntry(section.id, entry.id, 'subtitle', e.target.value)}
                        onBlur={save}
                    />
                    <div className="flex gap-2">
                        <input
                            className="w-1/2 rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="Start date"
                            value={entry.start_date}
                            onChange={e => updateCustomEntry(section.id, entry.id, 'start_date', e.target.value)}
                            onBlur={save}
                        />
                        <input
                            className="w-1/2 rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="End date (or blank)"
                            value={entry.end_date ?? ''}
                            onChange={e => updateCustomEntry(section.id, entry.id, 'end_date', e.target.value || null)}
                            onBlur={save}
                        />
                    </div>
                    <textarea
                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Description"
                        rows={2}
                        value={entry.description}
                        onChange={e => updateCustomEntry(section.id, entry.id, 'description', e.target.value)}
                        onBlur={save}
                    />
                    <textarea
                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Bullets (one per line)"
                        rows={3}
                        value={entry.bullets.join('\n')}
                        onChange={e => updateCustomEntry(section.id, entry.id, 'bullets', e.target.value.split('\n'))}
                        onBlur={save}
                    />
                </div>
            ))}
        </div>
        <button
            type="button"
            onClick={() => { addCustomEntry(section.id); }}
            className="mt-1 w-full rounded-b-lg bg-indigo-50 border-t border-indigo-200 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-100"
        >
            + Add entry
        </button>
    </div>
))}

{/* Add Section button */}
{(customSectionLimit === null || customSections.length < customSectionLimit) ? (
    <button
        type="button"
        onClick={addCustomSection}
        className="mt-2 w-full rounded-lg border-2 border-dashed border-indigo-200 bg-white py-2.5 text-sm font-medium text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50 transition"
    >
        + Add Custom Section
    </button>
) : (
    <button
        type="button"
        onClick={() => triggerUpgradeModal('custom_sections', 'starter')}
        className="mt-2 w-full rounded-lg border-2 border-dashed border-gray-200 bg-white py-2.5 text-sm font-medium text-[#a0a0b0] cursor-not-allowed"
    >
        🔒 Add Custom Section (Starter+)
    </button>
)}
```

- [ ] **Step 6: Build frontend**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx resources/js/types/index.d.ts
git commit -m "feat: add custom sections UI to resume editor with tier limit enforcement"
```

---

## Task 8: Section Drag-and-Drop

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Install dnd-kit**

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Add `section_order` state to `Edit.tsx`**

Define the default section order as a constant at the top of the file (module scope, not inside the component):

```tsx
const DEFAULT_SECTION_ORDER = ['summary', 'experience', 'education', 'skills', 'certifications'];
```

Add state in the `Edit` component:

```tsx
const [sectionOrder, setSectionOrder] = useState<string[]>(
    resume.section_order ?? DEFAULT_SECTION_ORDER
);
const sectionOrderRef = useRef(sectionOrder);
useEffect(() => { sectionOrderRef.current = sectionOrder; }, [sectionOrder]);
```

Include `section_order: sectionOrderRef.current` in the `save` payload.

- [ ] **Step 3: Add imports for dnd-kit**

At the top of `Edit.tsx`:

```tsx
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
    arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

- [ ] **Step 4: Create a `DraggableSectionWrapper` component**

Add this component above the `Edit` function:

```tsx
function DraggableSectionWrapper({ id, children }: { id: string; children: React.ReactNode }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="mb-5 relative">
            <div
                {...attributes}
                {...listeners}
                className="absolute left-0 top-0 flex h-full w-6 cursor-grab items-center justify-center rounded-l-lg text-indigo-300 hover:text-indigo-500 active:cursor-grabbing z-10"
                title="Drag to reorder"
            >
                <svg viewBox="0 0 20 20" width="14" fill="currentColor">
                    <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
                </svg>
            </div>
            <div className="pl-6">{children}</div>
        </div>
    );
}
```

- [ ] **Step 5: Add `handleDragEnd` and `sensors` inside the `Edit` component**

```tsx
const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        setSectionOrder(prev => {
            const oldIndex = prev.indexOf(active.id as string);
            const newIndex = prev.indexOf(over.id as string);
            const next = arrayMove(prev, oldIndex, newIndex);
            return next;
        });
        setTimeout(save, 0);
    }
};
```

- [ ] **Step 6: Wrap the sortable sections with DndContext**

In the JSX, find the area where the built-in sections (summary, experience, education, skills, certifications) and custom sections are rendered. Wrap them in:

```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={[...sectionOrder, ...customSections.map(s => `custom_${s.id}`)]} strategy={verticalListSortingStrategy}>
        {/* Contact section — NOT draggable, always first */}
        <div className="mb-5 rounded-lg border border-indigo-200 overflow-hidden shadow-sm">
            {/* existing Contact section JSX */}
        </div>

        {/* Sortable built-in sections — rendered in sectionOrder */}
        {sectionOrder.map(key => {
            if (key === 'summary') return (
                <DraggableSectionWrapper key="summary" id="summary">
                    {/* existing Summary section JSX (without the outer mb-5 div) */}
                </DraggableSectionWrapper>
            );
            if (key === 'experience') return (
                <DraggableSectionWrapper key="experience" id="experience">
                    {/* existing Experience section JSX */}
                </DraggableSectionWrapper>
            );
            if (key === 'education') return (
                <DraggableSectionWrapper key="education" id="education">
                    {/* existing Education section JSX */}
                </DraggableSectionWrapper>
            );
            if (key === 'skills') return (
                <DraggableSectionWrapper key="skills" id="skills">
                    {/* existing Skills section JSX */}
                </DraggableSectionWrapper>
            );
            if (key === 'certifications') return (
                <DraggableSectionWrapper key="certifications" id="certifications">
                    {/* existing Certifications section JSX */}
                </DraggableSectionWrapper>
            );
            // Custom section
            const customId = key.startsWith('custom_') ? key.slice(7) : key;
            const section = customSections.find(s => s.id === customId);
            if (!section) { return null; }
            return (
                <DraggableSectionWrapper key={key} id={key}>
                    {/* custom section JSX from Task 7 (without its outer mb-5 div) */}
                </DraggableSectionWrapper>
            );
        })}

        {/* Add Section button */}
        {/* ... same as Task 7 ... */}
    </SortableContext>
</DndContext>
```

**Note:** When wrapping sections, move the `mb-5` and outer div responsibility to `DraggableSectionWrapper` (it already has `mb-5 relative`). Remove the duplicate `mb-5` from the inner section JSX.

Also update `addCustomSection` to append the new section's sortable key to `sectionOrder`:

```tsx
const addCustomSection = () => {
    const id = crypto.randomUUID();
    setCustomSections(prev => [...prev, { id, name: 'New Section', entries: [] }]);
    setSectionOrder(prev => [...prev, `custom_${id}`]);
};

const deleteCustomSection = (sectionId: string) => {
    if (!window.confirm('Delete this section and all its entries?')) { return; }
    setCustomSections(prev => prev.filter(s => s.id !== sectionId));
    setSectionOrder(prev => prev.filter(k => k !== `custom_${sectionId}`));
    setTimeout(save, 0);
};
```

- [ ] **Step 7: Update `resources/views/partials/resume-body.blade.php` to respect `section_order` and render custom sections**

The Blade architecture uses a shared partial `partials/resume-body.blade.php` that all templates include. Modify this partial — do NOT touch the if/elseif chain in `resume-pdf.blade.php` for this step.

Replace the entire content of `resources/views/partials/resume-body.blade.php` with:

```blade
@php
    $atsMode = $atsMode ?? false;
    $sep = $atsMode ? ', ' : ' • ';

    $defaultOrder = ['summary', 'experience', 'education', 'skills', 'certifications'];
    $sectionOrder = $resume->section_order ?? $defaultOrder;
    // ensure no built-in sections are dropped if section_order was saved before a section existed
    $sectionOrder = array_unique(array_merge($sectionOrder, $defaultOrder));
@endphp

@foreach ($sectionOrder as $sectionKey)

    @if ($sectionKey === 'summary' && $resume->summary)
        <h2>Summary</h2>
        <p>{{ $resume->summary }}</p>

    @elseif ($sectionKey === 'experience' && $resume->experience && count(array_filter($resume->experience, fn($e) => !empty($e['company']) || !empty($e['title']))))
        <h2>Work Experience</h2>
        @foreach($resume->experience as $exp)
          @if(!empty($exp['company']) || !empty($exp['title']))
          <div class="entry">
            <div class="row">
              <span class="title">{{ $exp['title'] ?? '' }}</span>
              <span class="date">{{ $exp['start_date'] ?? '' }}{{ ($exp['start_date'] ?? '') || ($exp['end_date'] ?? '') ? ' – ' : '' }}{{ ($exp['current'] ?? false) ? 'Present' : ($exp['end_date'] ?? '') }}</span>
            </div>
            <div class="sub">{{ $exp['company'] ?? '' }}</div>
            @if(!empty($exp['bullets']))
            <ul>@foreach(array_filter(explode("\n", $exp['bullets'])) as $b)<li>{{ $b }}</li>@endforeach</ul>
            @endif
          </div>
          @endif
        @endforeach

    @elseif ($sectionKey === 'education' && $resume->education && count(array_filter($resume->education, fn($e) => !empty($e['school']))))
        <h2>Education</h2>
        @foreach($resume->education as $edu)
          @if(!empty($edu['school']))
          <div class="entry row">
            <div>
              <span class="title">{{ $edu['school'] }}</span>
              <span class="sub" style="margin-left:8px;">{{ implode(' in ', array_filter([$edu['degree'] ?? null, $edu['field'] ?? null])) }}</span>
            </div>
            <span class="date">{{ $edu['grad_year'] ?? '' }}</span>
          </div>
          @endif
        @endforeach

    @elseif ($sectionKey === 'skills' && $resume->skills && count($resume->skills))
        <h2>Skills</h2>
        {{-- skills is a plain string[] --}}
        <p>{{ implode($sep, $resume->skills) }}</p>

    @elseif ($sectionKey === 'certifications' && $resume->certifications && count(array_filter($resume->certifications, fn($c2) => !empty($c2['name']))))
        <h2>Certifications</h2>
        @foreach($resume->certifications as $cert)
          @if(!empty($cert['name']))
          <div class="entry row">
            <span class="title">{{ $cert['name'] }}</span>
            <span class="date">{{ implode(', ', array_filter([$cert['issuer'] ?? null, $cert['date'] ?? null])) }}</span>
          </div>
          @endif
        @endforeach

    @elseif (str_starts_with($sectionKey, 'custom_'))
        @php $customId = substr($sectionKey, 7); @endphp
        @foreach (($resume->custom_sections ?? []) as $cs)
            @if ($cs['id'] === $customId)
                <h2>{{ $cs['name'] }}</h2>
                @foreach ($cs['entries'] ?? [] as $entry)
                    <div class="entry">
                        <div class="row">
                            <span class="title">{{ $entry['title'] ?? '' }}</span>
                            <span class="date">
                                {{ $entry['start_date'] ?? '' }}
                                @if (!empty($entry['end_date'])) – {{ $entry['end_date'] }} @endif
                            </span>
                        </div>
                        @if (!empty($entry['subtitle']))
                            <div class="sub">{{ $entry['subtitle'] }}</div>
                        @endif
                        @if (!empty($entry['description']))
                            <p>{{ $entry['description'] }}</p>
                        @endif
                        @if (!empty($entry['bullets']))
                            <ul>
                                @foreach ($entry['bullets'] as $b)
                                    @if (!empty($b)) <li>{{ $b }}</li> @endif
                                @endforeach
                            </ul>
                        @endif
                    </div>
                @endforeach
            @endif
        @endforeach
    @endif

@endforeach
```

**Note:** Custom section entries store `bullets` as a `string[]` array (set in the React editor via `split('\n')`), unlike experience bullets which are a newline-joined string. The `@foreach ($entry['bullets'] as $b)` handles the array form correctly.

- [ ] **Step 8: Build frontend**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx resources/js/types/index.d.ts resources/views/resume-pdf.blade.php package.json package-lock.json
git commit -m "feat: add section drag-and-drop reordering with dnd-kit, persist section_order to PDF"
```

---

## Task 9: New Templates — CSS + Blade branches in `resume-pdf.blade.php`

**Files:**
- Modify: `resources/views/resume-pdf.blade.php`

**Architecture note:** Most templates share `partials/resume-body.blade.php` (which now handles section_order + custom sections). New templates either (a) add CSS classes to the `<style>` block and use the `@else` branch, or (b) add their own `@elseif` branch for templates with unique outer structure (skills-first chip block, skills-first-visual proficiency bars, timeline experience layout).

- [ ] **Step 1: Add CSS for new templates to the `<style>` block**

Inside the `<style>` block in `resume-pdf.blade.php`, add after the `.ats` rules:

```css
  /* bold template */
  .bold h1 { font-size: 22pt; font-weight: 900; letter-spacing: -0.5px; }
  .bold h2 { border-bottom: 3px solid {{ $accent }}; color: {{ $accent }}; font-weight: 900; letter-spacing: 2px; }

  /* academic template */
  .academic h2 { color: #444; border-bottom-color: #ccc; font-weight: bold; }

  /* skills-first template (chip block handled in @elseif branch below) */
  .skills-first-chips { background: #eef2ff; border-radius: 4pt; padding: 6pt 8pt; margin-bottom: 8pt; font-size: {{ $sizeBody }}pt; }
  .skills-first-chips .label { font-size: 7pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #4f46e5; margin-bottom: 4pt; }
```

- [ ] **Step 2: Add `bold` and `academic` to the `@else` branch**

The `@else` branch (lines 142–150) already handles classic/modern/minimal. Replace it with:

```blade
@else
  @php
    $outerClass = match($template) {
        'bold'     => 'bold',
        'academic' => 'academic',
        default    => '',
    };
  @endphp
  <div class="page {{ $outerClass }}">
    <div style="text-align:center; border-bottom: 2px solid {{ in_array($template, ['classic','minimal','minimal-ruled']) ? '#222' : $accent }}; padding-bottom: 10px; margin-bottom: 12px;">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @include('partials.resume-body')
  </div>
@endif
```

- [ ] **Step 3: Add `skills-first` branch — before the `@else` block**

Insert before the `@else` on the line before it:

```blade
@elseif ($template === 'skills-first')
  <div class="page">
    <div style="text-align:center; border-bottom: 2px solid {{ $accent }}; padding-bottom: 10px; margin-bottom: 12px;">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @if ($resume->skills && count($resume->skills))
      {{-- skills is a plain string[] —  render as chips before the body --}}
      <div class="skills-first-chips">
        <div class="label">Core Competencies</div>
        <div>{{ implode(' · ', $resume->skills) }}</div>
      </div>
    @endif
    {{-- Pass skipSections so resume-body skips 'skills' (already rendered above) --}}
    @include('partials.resume-body', ['skipSections' => ['skills']])
  </div>
```

Update `partials/resume-body.blade.php` to respect `skipSections`. At the top of the partial, add:

```blade
@php
    $skipSections = $skipSections ?? [];
@endphp
```

And in the `@foreach ($sectionOrder as $sectionKey)` loop, add a skip check as the very first line inside the loop:

```blade
@if (in_array($sectionKey, $skipSections)) @continue @endif
```

- [ ] **Step 4: Add `skills-first-visual` branch**

Skills are plain strings — we cannot derive a proficiency level from them. Render with a fixed-width gradient bar (all at 80% width as a visual device):

```blade
@elseif ($template === 'skills-first-visual')
  <div class="page">
    <div style="border-left: 4px solid {{ $accent }}; padding-left: 8pt; margin-bottom: 10pt;">
      <h1 style="text-align:left;">{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: {{ $accent }}; font-weight: bold;">
        {{ $resume->contact['title'] ?? '' }}
      </div>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @if ($resume->skills && count($resume->skills))
      <h2>Technical Skills</h2>
      @foreach ($resume->skills as $skill)
        <div style="display:flex; align-items:center; margin-bottom:3pt; gap:8pt;">
          <span style="font-size:{{ $sizeBody }}pt; width:100pt; flex-shrink:0;">{{ $skill }}</span>
          <div style="height:3pt; flex:1; background:#eeeef5; border-radius:99pt; overflow:hidden;">
            <div style="height:3pt; width:80%; background:{{ $accent }}; border-radius:99pt;"></div>
          </div>
        </div>
      @endforeach
    @endif
    @include('partials.resume-body', ['skipSections' => ['skills']])
  </div>
```

- [ ] **Step 5: Add `timeline` branch**

Timeline replaces the experience section's rendering. Use the partial but pass `skipSections => ['experience']` and manually render experience as a timeline before including the rest:

```blade
@elseif ($template === 'timeline')
  <div class="page">
    <div style="text-align:center; border-bottom: 2px solid {{ $accent }}; padding-bottom: 10px; margin-bottom: 12px;">
      <h1>{{ $c['full_name'] ?? $resume->name }}</h1>
      <div style="font-size: {{ $sizeContact }}pt; color: #555;">{{ implode(' • ', $contactParts) }}</div>
    </div>
    @if ($resume->summary)
      <h2>Summary</h2>
      <p>{{ $resume->summary }}</p>
    @endif
    @if ($resume->experience && count($resume->experience))
      <h2>Experience</h2>
      @foreach ($resume->experience as $exp)
        @if (!empty($exp['company']) || !empty($exp['title']))
        <div style="display:flex; gap:8pt; margin-bottom:6pt;">
          <div style="display:flex; flex-direction:column; align-items:center; width:10pt; flex-shrink:0;">
            <div style="width:7pt; height:7pt; border-radius:50%; background:{{ $accent }}; flex-shrink:0;"></div>
            <div style="width:1pt; flex:1; background:#c7d2fe; margin-top:2pt;"></div>
          </div>
          <div style="flex:1; padding-bottom:4pt;">
            <div style="font-weight:bold; font-size:{{ $sizeBody }}pt;">{{ $exp['title'] ?? '' }}</div>
            <div style="font-size:{{ $sizeContact }}pt; color:#71717a;">
              {{ $exp['company'] ?? '' }}
              @if(($exp['start_date'] ?? '') || ($exp['end_date'] ?? ''))
                · {{ $exp['start_date'] ?? '' }} – {{ ($exp['current'] ?? false) ? 'Present' : ($exp['end_date'] ?? '') }}
              @endif
            </div>
            @foreach (array_filter(explode("\n", $exp['bullets'] ?? '')) as $b)
              <div style="font-size:{{ $sizeBody }}pt; padding-left:8pt;">• {{ $b }}</div>
            @endforeach
          </div>
        </div>
        @endif
      @endforeach
    @endif
    @include('partials.resume-body', ['skipSections' => ['summary', 'experience']])
  </div>
```

- [ ] **Step 6: Commit**

```bash
git add resources/views/resume-pdf.blade.php resources/views/partials/resume-body.blade.php
git commit -m "feat: add skills-first, skills-first-visual, bold, academic, timeline PDF templates"
```

---

## Task 10: Template Picker — ATS Badges, Tier Gates, Academic Synergy Banner

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add ATS warning badge to the template picker**

Locate the template `<select>` or template picker UI in `Edit.tsx`. The non-ATS-safe templates need a visual indicator. Find where template options are rendered and add a flag for the two flagged templates:

```tsx
const NON_ATS_TEMPLATES = ['skills-first-visual', 'timeline'];
const TEMPLATE_LABELS: Record<string, string> = {
    'classic': 'Classic',
    'modern': 'Modern',
    'minimal': 'Minimal',
    'minimal-ruled': 'Minimal Ruled',
    'sidebar': 'Sidebar',
    'creative': 'Creative',
    'executive': 'Executive',
    'ats': 'ATS',
    'skills-first': 'Skills-First',
    'skills-first-visual': 'Skills-First Visual ⚠️',
    'academic': 'Academic CV',
    'bold': 'Minimalist Bold',
    'timeline': 'Timeline ⚠️',
};
```

In the template `<select>`:

```tsx
<select
    value={template}
    onChange={e => { setTemplate(e.target.value); setTimeout(save, 0); }}
    className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
>
    {allowedTemplates.map(t => (
        <option key={t} value={t}>{TEMPLATE_LABELS[t] ?? t}</option>
    ))}
</select>
```

If the current template is one of the non-ATS ones, show a small amber warning below the select:

```tsx
{NON_ATS_TEMPLATES.includes(template) && (
    <p className="mt-1 text-xs text-amber-600">
        ⚠️ Design-focused · Not ATS-optimized
    </p>
)}
```

- [ ] **Step 2: Add academic synergy banner**

Add state for the banner:

```tsx
const [showAcademicBanner, setShowAcademicBanner] = useState(
    template === 'academic' && (resume.custom_sections ?? []).length === 0
);
```

Add a `useEffect` to show it when the user switches to `academic`:

```tsx
useEffect(() => {
    if (template === 'academic' && customSections.length === 0) {
        setShowAcademicBanner(true);
    } else {
        setShowAcademicBanner(false);
    }
}, [template]);
```

Render the banner at the top of the editor panel (below the font/template controls):

```tsx
{showAcademicBanner && (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm">
        <span className="text-indigo-500 mt-0.5">🎓</span>
        <div className="flex-1">
            <p className="font-semibold text-indigo-700">Add suggested CV sections?</p>
            <p className="text-indigo-600 text-xs mt-0.5">Pre-fill Publications, Teaching Experience, Presentations, and Grants.</p>
        </div>
        <div className="flex gap-2">
            <button
                type="button"
                onClick={() => {
                    const suggested = ['Publications', 'Teaching Experience', 'Presentations', 'Grants'];
                    const newSections = suggested.map(name => ({
                        id: crypto.randomUUID(),
                        name,
                        entries: [],
                    }));
                    setCustomSections(prev => [...prev, ...newSections]);
                    setSectionOrder(prev => [...prev, ...newSections.map(s => `custom_${s.id}`)]);
                    setShowAcademicBanner(false);
                    setTimeout(save, 0);
                }}
                className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
            >
                Add them
            </button>
            <button
                type="button"
                onClick={() => setShowAcademicBanner(false)}
                className="rounded-md border border-indigo-300 px-3 py-1 text-xs text-indigo-600 hover:bg-indigo-100"
            >
                Dismiss
            </button>
        </div>
    </div>
)}
```

- [ ] **Step 3: Add new template gate tests to `tests/Feature/ResumeBuilderTest.php`**

Find the existing template gate tests (the ones testing that free users can't use `sidebar`, `creative`, etc.) and add:

```php
public function test_free_user_can_use_skills_first_template(): void
{
    $user = User::factory()->free()->create();
    $resume = Resume::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('builder.update', $resume), ['template' => 'skills-first'])
        ->assertRedirect();

    $this->assertSame('skills-first', $resume->fresh()->template);
}

public function test_free_user_can_use_bold_template(): void
{
    $user = User::factory()->free()->create();
    $resume = Resume::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('builder.update', $resume), ['template' => 'bold'])
        ->assertRedirect();

    $this->assertSame('bold', $resume->fresh()->template);
}

public function test_free_user_cannot_use_skills_first_visual_template(): void
{
    $user = User::factory()->free()->create();
    $resume = Resume::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('builder.update', $resume), ['template' => 'skills-first-visual'])
        ->assertRedirect();

    $this->assertNotSame('skills-first-visual', $resume->fresh()->template);
}

public function test_free_user_cannot_use_academic_template(): void
{
    $user = User::factory()->free()->create();
    $resume = Resume::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('builder.update', $resume), ['template' => 'academic'])
        ->assertRedirect();

    $this->assertNotSame('academic', $resume->fresh()->template);
}

public function test_free_user_cannot_use_timeline_template(): void
{
    $user = User::factory()->free()->create();
    $resume = Resume::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('builder.update', $resume), ['template' => 'timeline'])
        ->assertRedirect();

    $this->assertNotSame('timeline', $resume->fresh()->template);
}

public function test_starter_user_can_use_all_new_templates(): void
{
    $user = User::factory()->starter()->create();
    $resume = Resume::factory()->create(['user_id' => $user->id]);

    foreach (['skills-first', 'skills-first-visual', 'academic', 'bold', 'timeline'] as $tpl) {
        $this->actingAs($user)
            ->put(route('builder.update', $resume), ['template' => $tpl])
            ->assertRedirect();
        $this->assertSame($tpl, $resume->fresh()->template, "Failed for template: {$tpl}");
    }
}
```

- [ ] **Step 4: Run all new tests**

```bash
php artisan test --compact tests/Feature/ResumeBuilderTest.php tests/Feature/CustomSectionsTest.php tests/Feature/SectionOrderTest.php tests/Unit/ResumeStrengthScorerTest.php
```

Expected: all PASS.

- [ ] **Step 5: Run the full test suite**

```bash
php artisan test --compact
```

Expected: all PASS.

- [ ] **Step 6: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 7: Build frontend**

```bash
npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx tests/Feature/ResumeBuilderTest.php
git commit -m "feat: add ATS warning badges, academic synergy banner, and new template gate tests"
```
