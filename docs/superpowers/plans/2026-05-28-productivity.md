# Productivity Features Implementation Plan

## Goal

Add three productivity surfaces to Resumegen that help users move from "I have a resume" to "I am applying to jobs":

1. **ATS Keyword Scoring** — give each resume a 0–100 score based on a built-in keyword database, exposed as a header badge and a sidebar panel inside the existing `Edit.tsx` editor. No external job-description input; the score reflects best-practice ATS hygiene.
2. **Cover Letter Builder** — full CRUD for cover letters with five starter templates, an Index page (cards) and an Edit page (textarea), optionally linked to a resume.
3. **Job Application Tracker** — full CRUD for job applications with status workflow, optional resume link, sortable table Index, dedicated Edit form.

## Architecture

All three features follow the established Resumegen pattern:

- **Backend:** Eloquent model + Laravel policy (`update`/`delete` gated on `user_id`) + thin controller returning Inertia responses. Routes live inside the existing `Route::middleware('auth')->group(...)` in `routes/web.php`.
- **Frontend:** Inertia pages under `resources/js/Pages/{CoverLetter,Jobs}/` using `AuthenticatedLayout`, Ziggy `route()` helper, `useForm` from `@inertiajs/react`. ATS UI is bolted into the existing `ResumeBuilder/Edit.tsx`.
- **Data:** ATS keywords live in a pure PHP array (`app/Data/AtsKeywords.php`). Cover letter templates live in `app/Data/CoverLetterTemplates.php`. Two new tables (`cover_letters`, `job_applications`) — neither uses JSON columns; all fields are flat strings/text/enum/date.
- **Authorization:** `CoverLetterPolicy` and `JobApplicationPolicy` both implement `update` and `delete` returning `$user->id === $model->user_id`. Controllers call `$this->authorize('update', $model)` (and `delete` for destroy).
- **Tests:** Feature tests under `tests/Feature/` using `RefreshDatabase`, `actingAs`, named route helpers, `assertDatabaseHas` — same pattern as `ResumeBuilderTest`.

ATS scoring is computed on-demand (no caching) by a small pure function `AtsScorer::score(Resume $resume): array`. The controller returns JSON, not Inertia, because it is consumed by `fetch()` from the Edit page after each save.

## Tech Stack

- Laravel 13 / PHP 8.3 / SQLite
- Inertia.js v2 + React 18 + TypeScript + Tailwind CSS v3
- Ziggy for typed route names
- Pest/PHPUnit via `php artisan test`
- Laravel Pint for code style

## File Map

| Path | Action | Purpose |
|---|---|---|
| `app/Data/AtsKeywords.php` | create | Static keyword DB across 4 categories |
| `app/Services/AtsScorer.php` | create | Pure score-computation service |
| `app/Http/Controllers/AtsScoreController.php` | create | GET endpoint returning JSON score payload |
| `routes/web.php` | edit | Register ATS, cover-letter, job-application routes |
| `tests/Feature/AtsScoreTest.php` | create | Score endpoint feature tests |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | edit | Add ATS badge in header + collapsible sidebar panel |
| `resources/js/types/index.d.ts` | edit | Add `AtsScore`, `CoverLetter`, `JobApplication` types |
| `database/migrations/2026_05_28_120000_create_cover_letters_table.php` | create | Cover letter schema |
| `app/Models/CoverLetter.php` | create | CoverLetter model |
| `app/Policies/CoverLetterPolicy.php` | create | CoverLetter authorization |
| `app/Data/CoverLetterTemplates.php` | create | Five template strings + descriptions |
| `app/Http/Controllers/CoverLetterController.php` | create | Cover letter CRUD |
| `database/factories/CoverLetterFactory.php` | create | Factory for tests |
| `tests/Feature/CoverLetterTest.php` | create | Cover letter feature tests |
| `resources/js/Pages/CoverLetter/Index.tsx` | create | Cover letter list + template picker modal |
| `resources/js/Pages/CoverLetter/Edit.tsx` | create | Cover letter editor (title + textarea + resume picker) |
| `database/migrations/2026_05_28_120100_create_job_applications_table.php` | create | Job application schema |
| `app/Models/JobApplication.php` | create | JobApplication model |
| `app/Policies/JobApplicationPolicy.php` | create | JobApplication authorization |
| `app/Http/Controllers/JobApplicationController.php` | create | Job application CRUD |
| `database/factories/JobApplicationFactory.php` | create | Factory for tests |
| `tests/Feature/JobApplicationTest.php` | create | Job application feature tests |
| `resources/js/Pages/Jobs/Index.tsx` | create | Sortable job application table + inline new row |
| `resources/js/Pages/Jobs/Edit.tsx` | create | Job application edit form |
| `resources/js/Layouts/AuthenticatedLayout.tsx` | edit | Add `Cover Letters` and `Jobs` nav links (desktop + mobile) |

---

## Task 1: ATS Keyword Database

### Step 1.1 — Create the keyword data file

Create `app/Data/AtsKeywords.php`:

```php
<?php

namespace App\Data;

class AtsKeywords
{
    public const ACTION_VERBS = [
        'achieved', 'accelerated', 'adapted', 'administered', 'analyzed', 'architected',
        'automated', 'built', 'collaborated', 'created', 'delivered', 'deployed',
        'designed', 'developed', 'directed', 'drove', 'engineered', 'enhanced',
        'established', 'executed', 'expanded', 'facilitated', 'generated', 'implemented',
        'improved', 'increased', 'initiated', 'integrated', 'launched', 'led',
        'managed', 'mentored', 'migrated', 'negotiated', 'optimized', 'orchestrated',
        'oversaw', 'pioneered', 'planned', 'produced', 'reduced', 'refactored',
        'researched', 'resolved', 'scaled', 'shipped', 'solved', 'spearheaded',
        'streamlined', 'supervised', 'trained', 'transformed',
    ];

    public const TECHNICAL = [
        'php', 'laravel', 'symfony', 'python', 'django', 'flask', 'fastapi',
        'javascript', 'typescript', 'react', 'vue', 'angular', 'svelte', 'next.js',
        'node.js', 'express', 'nestjs', 'java', 'spring', 'kotlin', 'go', 'rust',
        'ruby', 'rails', 'c#', '.net', 'swift', 'objective-c',
        'mysql', 'postgresql', 'sqlite', 'mongodb', 'redis', 'elasticsearch',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible',
        'jenkins', 'github actions', 'gitlab ci', 'circleci',
        'rest', 'graphql', 'grpc', 'websockets', 'oauth', 'jwt',
        'tdd', 'ci/cd', 'agile', 'scrum', 'kanban',
        'html', 'css', 'tailwind', 'sass', 'webpack', 'vite',
        'figma', 'sketch', 'jira', 'confluence', 'slack',
        'tensorflow', 'pytorch', 'pandas', 'numpy', 'jupyter',
        'sql', 'nosql', 'etl', 'data warehouse', 'snowflake', 'bigquery',
        'unit testing', 'integration testing', 'cypress', 'jest', 'phpunit', 'pytest',
        'linux', 'bash', 'git', 'github', 'gitlab', 'bitbucket',
        'microservices', 'monolith', 'serverless', 'lambda',
    ];

    public const SOFT_SKILLS = [
        'leadership', 'communication', 'collaboration', 'problem solving', 'teamwork',
        'mentorship', 'cross-functional', 'stakeholder', 'strategic', 'analytical',
        'detail-oriented', 'customer-focused', 'self-starter', 'ownership',
        'adaptability', 'time management', 'prioritization', 'decision making',
        'critical thinking', 'creativity', 'initiative', 'accountability',
    ];

    /**
     * Returns true if the resume contains at least one quantified achievement
     * (a digit followed by % / x / + / k / m / "million" / "billion", or a $ amount).
     */
    public static function quantifiedAchievementRegex(): string
    {
        return '/(\$\s?\d|\d+\s?(%|x|\+|k\b|m\b|million|billion))/i';
    }
}
```

### Step 1.2 — Verify the file parses

Run:

```bash
php -l app/Data/AtsKeywords.php
```

Expected output: `No syntax errors detected in app/Data/AtsKeywords.php`.

---

## Task 2: ATS Scorer Service (TDD)

### Step 2.1 — Write the failing test

Create `tests/Feature/AtsScoreTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AtsScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_endpoint_requires_auth(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

        $this->getJson(route('builder.ats-score', $resume->id))->assertUnauthorized();
    }

    public function test_owner_can_fetch_score(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create([
            'name'         => 'r',
            'pdf_filename' => 'r.pdf',
            'summary'      => 'Senior engineer who led teams and shipped scalable systems.',
            'experience'   => [[
                'id' => '1', 'company' => 'X', 'title' => 'Engineer',
                'start_date' => '2020', 'end_date' => '2024', 'current' => false,
                'bullets' => "- Built and deployed React apps\n- Reduced costs by 30%",
            ]],
            'skills'       => ['PHP', 'Laravel', 'React', 'TypeScript', 'AWS'],
        ]);

        $response = $this->actingAs($user)
            ->getJson(route('builder.ats-score', $resume->id));

        $response->assertOk()
            ->assertJsonStructure(['score', 'found', 'missing', 'breakdown' => ['action_verbs', 'technical', 'soft_skills', 'format_signals']]);

        $this->assertIsInt($response->json('score'));
        $this->assertGreaterThan(0, $response->json('score'));
        $this->assertLessThanOrEqual(100, $response->json('score'));
    }

    public function test_non_owner_is_forbidden(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = $owner->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

        $this->actingAs($other)
            ->getJson(route('builder.ats-score', $resume->id))
            ->assertForbidden();
    }

    public function test_empty_resume_scores_low(): void
    {
        $user = User::factory()->create();
        $resume = $user->resumes()->create(['name' => 'r', 'pdf_filename' => 'r.pdf']);

        $score = $this->actingAs($user)
            ->getJson(route('builder.ats-score', $resume->id))
            ->json('score');

        $this->assertLessThan(20, $score);
    }
}
```

Run:

```bash
php artisan test --filter=AtsScoreTest
```

Expected: all four tests fail (route does not exist yet).

### Step 2.2 — Create the scorer service

Create `app/Services/AtsScorer.php`:

```php
<?php

namespace App\Services;

use App\Data\AtsKeywords;
use App\Models\Resume;

class AtsScorer
{
    /**
     * @return array{score:int, found:array<string,string[]>, missing:array<string,string[]>, breakdown:array<string,int>}
     */
    public static function score(Resume $resume): array
    {
        $summary = (string) ($resume->summary ?? '');
        $bullets = self::collectBullets($resume);
        $skills  = self::collectSkills($resume);

        $bulletText  = strtolower(implode("\n", $bullets));
        $summaryText = strtolower($summary);
        $skillsText  = strtolower(implode(',', $skills));
        $allText     = $summaryText . "\n" . $bulletText . "\n" . $skillsText;

        // 1. Action verbs (30%) — search bullets + summary
        $verbSource = $bulletText . "\n" . $summaryText;
        [$verbsFound, $verbsMissing] = self::matchKeywords(AtsKeywords::ACTION_VERBS, $verbSource);
        $verbScore = self::ratio(count($verbsFound), 12) * 30; // 12 verbs = full credit

        // 2. Technical keywords (40%) — search skills + bullets
        $techSource = $skillsText . "\n" . $bulletText;
        [$techFound, $techMissing] = self::matchKeywords(AtsKeywords::TECHNICAL, $techSource);
        $techScore = self::ratio(count($techFound), 8) * 40; // 8 technical = full credit

        // 3. Soft skills (15%) — search summary + bullets
        $softSource = $summaryText . "\n" . $bulletText;
        [$softFound, $softMissing] = self::matchKeywords(AtsKeywords::SOFT_SKILLS, $softSource);
        $softScore = self::ratio(count($softFound), 4) * 15;

        // 4. Format signals (15%)
        $hasSummary = strlen(trim($summary)) >= 40 ? 1 : 0;
        $hasBullets = count($bullets) >= 3 ? 1 : 0;
        $hasDates   = self::hasDates($resume) ? 1 : 0;
        $hasQuant   = preg_match(AtsKeywords::quantifiedAchievementRegex(), $bulletText . ' ' . $summaryText) === 1 ? 1 : 0;
        $formatScore = (($hasSummary + $hasBullets + $hasDates + $hasQuant) / 4) * 15;

        $total = (int) round($verbScore + $techScore + $softScore + $formatScore);
        $total = max(0, min(100, $total));

        return [
            'score'   => $total,
            'found'   => [
                'action_verbs' => $verbsFound,
                'technical'    => $techFound,
                'soft_skills'  => $softFound,
            ],
            'missing' => [
                'action_verbs' => array_slice($verbsMissing, 0, 10),
                'technical'    => array_slice($techMissing, 0, 10),
                'soft_skills'  => array_slice($softMissing, 0, 10),
            ],
            'breakdown' => [
                'action_verbs'   => (int) round($verbScore),
                'technical'      => (int) round($techScore),
                'soft_skills'    => (int) round($softScore),
                'format_signals' => (int) round($formatScore),
            ],
        ];
    }

    /** @return array{0:string[],1:string[]} [found, missing] */
    private static function matchKeywords(array $keywords, string $haystack): array
    {
        $found = [];
        $missing = [];
        foreach ($keywords as $kw) {
            $needle = strtolower($kw);
            // word-boundary match, but `.`, `#`, `+`, `/` in keywords are literal
            $pattern = '/(?<![a-z0-9])' . preg_quote($needle, '/') . '(?![a-z0-9])/i';
            if (preg_match($pattern, $haystack) === 1) {
                $found[] = $kw;
            } else {
                $missing[] = $kw;
            }
        }
        return [$found, $missing];
    }

    private static function ratio(int $found, int $target): float
    {
        if ($target <= 0) return 0.0;
        return min(1.0, $found / $target);
    }

    private static function collectBullets(Resume $resume): array
    {
        $out = [];
        foreach (($resume->experience ?? []) as $entry) {
            if (!empty($entry['bullets'])) {
                $out[] = (string) $entry['bullets'];
            }
        }
        return $out;
    }

    private static function collectSkills(Resume $resume): array
    {
        return array_values(array_filter((array) ($resume->skills ?? []), fn($s) => is_string($s) && trim($s) !== ''));
    }

    private static function hasDates(Resume $resume): bool
    {
        foreach (($resume->experience ?? []) as $entry) {
            if (!empty($entry['start_date'])) return true;
        }
        return false;
    }
}
```

### Step 2.3 — Create the controller

Create `app/Http/Controllers/AtsScoreController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Services\AtsScorer;
use Illuminate\Http\JsonResponse;

class AtsScoreController extends Controller
{
    public function show(Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        return response()->json(AtsScorer::score($resume));
    }
}
```

### Step 2.4 — Register the route

In `routes/web.php`, inside the existing `Route::middleware('auth')->group(function () { ... })` block, add (after the existing `/builder/{resume}/ai-suggest` line):

```php
    Route::get('/builder/{resume}/ats-score', [\App\Http\Controllers\AtsScoreController::class, 'show'])
        ->middleware('throttle:10,1')
        ->name('builder.ats-score');
```

Also add the `use` statement at the top of `routes/web.php`:

```php
use App\Http\Controllers\AtsScoreController;
```

…and prefer using the short symbol in the route line:

```php
    Route::get('/builder/{resume}/ats-score', [AtsScoreController::class, 'show'])
        ->middleware('throttle:10,1')
        ->name('builder.ats-score');
```

### Step 2.5 — Rerun the tests

```bash
php artisan test --filter=AtsScoreTest
```

Expected: all four tests pass.

---

## Task 3: ATS UI in Edit.tsx

### Step 3.1 — Add the type

In `resources/js/types/index.d.ts`, append:

```ts
export interface AtsScoreCategory {
    action_verbs: string[];
    technical: string[];
    soft_skills: string[];
}

export interface AtsScore {
    score: number;
    found: AtsScoreCategory;
    missing: AtsScoreCategory;
    breakdown: {
        action_verbs: number;
        technical: number;
        soft_skills: number;
        format_signals: number;
    };
}
```

### Step 3.2 — Add a Ziggy type entry (if needed)

No action — Ziggy auto-discovers named routes; the existing `route()` typing already permits arbitrary route names.

### Step 3.3 — Wire badge + panel into Edit.tsx

Open `resources/js/Pages/ResumeBuilder/Edit.tsx`. At the top, with the other type imports:

```tsx
import type { AtsScore } from '@/types';
```

Inside the component (next to the existing `saving`/`skills` state), add:

```tsx
const [ats, setAts] = useState<AtsScore | null>(null);
const [atsLoading, setAtsLoading] = useState(false);
const [atsOpen, setAtsOpen] = useState(false);

const fetchAts = useCallback(async () => {
    setAtsLoading(true);
    try {
        const res = await fetch(route('builder.ats-score', resume.id), {
            headers: { Accept: 'application/json' },
            credentials: 'same-origin',
        });
        if (res.ok) {
            const data: AtsScore = await res.json();
            setAts(data);
        }
    } catch {
        // best-effort
    } finally {
        setAtsLoading(false);
    }
}, [resume.id]);

useEffect(() => {
    fetchAts();
}, [fetchAts]);
```

In the existing `save()` callback, find the existing `router.put(...)` and add an `onFinish: () => fetchAts()` to the options object. If `onFinish` already exists, chain by calling `fetchAts()` after the existing logic.

Add the badge in the header area near the save indicator:

```tsx
{ats && (
    <span
        className={
            'ml-3 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
            (ats.score < 50
                ? 'bg-red-100 text-red-700'
                : ats.score < 75
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-green-100 text-green-800')
        }
        title="ATS keyword score"
    >
        {ats.score} ATS
    </span>
)}
{atsLoading && <span className="ml-2 text-xs text-gray-400">scoring…</span>}
```

Add the sidebar panel (place it in the sidebar above or below "Font Sizes"):

```tsx
<section className="mt-6 rounded-md border border-gray-200 bg-white">
    <button
        type="button"
        onClick={() => setAtsOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-gray-800 hover:bg-gray-50"
    >
        <span>ATS Score {ats ? `· ${ats.score}/100` : ''}</span>
        <span className="text-gray-400">{atsOpen ? '−' : '+'}</span>
    </button>

    {atsOpen && ats && (
        <div className="border-t border-gray-100 px-4 py-3 text-sm">
            <ul className="mb-3 space-y-1 text-xs text-gray-600">
                <li>Action verbs: {ats.breakdown.action_verbs}/30</li>
                <li>Technical: {ats.breakdown.technical}/40</li>
                <li>Soft skills: {ats.breakdown.soft_skills}/15</li>
                <li>Format signals: {ats.breakdown.format_signals}/15</li>
            </ul>

            {(['technical', 'action_verbs', 'soft_skills'] as const).map(cat => (
                ats.missing[cat].length > 0 && (
                    <div key={cat} className="mb-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Missing {cat.replace('_', ' ')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {ats.missing[cat].slice(0, 10).map(kw => (
                                <button
                                    key={kw}
                                    type="button"
                                    onClick={() => {
                                        setSkills(prev => {
                                            const next = Array.from(new Set([...(prev ?? []), kw]));
                                            return next;
                                        });
                                        // schedule save on next tick so state is committed
                                        setTimeout(() => save(), 0);
                                    }}
                                    className="rounded border border-gray-300 bg-gray-50 px-2 py-0.5 text-xs text-gray-700 hover:border-indigo-400 hover:bg-indigo-50"
                                    title="Add to skills"
                                >
                                    + {kw}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            ))}
        </div>
    )}
</section>
```

Ensure `useCallback`, `useEffect`, `useState` are imported from `react`. If the file already imports some of these, just add the missing ones.

### Step 3.4 — Type-check and build

```bash
npm run build
```

Expected: `tsc` passes and `vite build` writes assets to `public/build/`. Fix any TS errors flagged in `Edit.tsx`.

---

## Task 4: Cover Letter Migration + Model + Policy (TDD)

### Step 4.1 — Write the failing test first

Create `tests/Feature/CoverLetterTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\CoverLetter;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CoverLetterTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_only_my_letters(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        CoverLetter::factory()->for($me)->create(['name' => 'Mine']);
        CoverLetter::factory()->for($other)->create(['name' => 'Theirs']);

        $this->actingAs($me)
            ->get(route('cover-letters.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('CoverLetter/Index')->has('letters', 1));
    }

    public function test_store_creates_letter_from_template(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('cover-letters.store'), [
                'template_key' => 'standard',
                'name'         => 'My Cover Letter',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('cover_letters', [
            'user_id'      => $user->id,
            'template_key' => 'standard',
            'name'         => 'My Cover Letter',
        ]);
        $letter = CoverLetter::first();
        $this->assertNotEmpty($letter->body);
        $this->assertStringContainsString('Dear Hiring Manager', $letter->body);
    }

    public function test_store_rejects_unknown_template(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('cover-letters.store'), [
                'template_key' => 'bogus',
                'name'         => 'X',
            ])
            ->assertSessionHasErrors('template_key');
    }

    public function test_update_persists_changes(): void
    {
        $user = User::factory()->create();
        $letter = CoverLetter::factory()->for($user)->create();

        $this->actingAs($user)
            ->put(route('cover-letters.update', $letter->id), [
                'name' => 'Renamed',
                'body' => 'Hello world',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('cover_letters', ['id' => $letter->id, 'name' => 'Renamed', 'body' => 'Hello world']);
    }

    public function test_other_user_cannot_update(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $letter = CoverLetter::factory()->for($owner)->create();

        $this->actingAs($other)
            ->put(route('cover-letters.update', $letter->id), ['name' => 'Hacked'])
            ->assertForbidden();
    }

    public function test_destroy_deletes_letter(): void
    {
        $user = User::factory()->create();
        $letter = CoverLetter::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('cover-letters.destroy', $letter->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('cover_letters', ['id' => $letter->id]);
    }
}
```

Run:

```bash
php artisan test --filter=CoverLetterTest
```

Expected: every test fails (no model/route yet).

### Step 4.2 — Create the migration

Create `database/migrations/2026_05_28_120000_create_cover_letters_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cover_letters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->nullable()->constrained('resumes')->nullOnDelete();
            $table->string('name');
            $table->string('template_key', 50);
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cover_letters');
    }
};
```

Run:

```bash
php artisan migrate
```

Expected: migration runs successfully.

### Step 4.3 — Create the template data

Create `app/Data/CoverLetterTemplates.php`:

```php
<?php

namespace App\Data;

class CoverLetterTemplates
{
    public const TEMPLATES = [
        'standard' => [
            'label'       => 'Standard',
            'description' => 'A classic, professional cover letter for most roles.',
            'body'        => "Dear Hiring Manager,\n\nI am writing to express my interest in the {{role}} position at {{company}}. With my background and skills, I am confident I would be a valuable addition to your team.\n\n[Body paragraph about relevant experience]\n\n[Body paragraph about why this company]\n\nThank you for considering my application. I look forward to discussing this opportunity with you.\n\nSincerely,\n{{name}}",
        ],
        'modern' => [
            'label'       => 'Modern',
            'description' => 'Short, punchy, conversational — great for startups.',
            'body'        => "Hi {{company}} team,\n\nI'd love to join you as {{role}}. Here's why:\n\n[3-4 sentences on your biggest relevant win]\n\n[1-2 sentences on what excites you about this company]\n\nLet's talk — {{name}}",
        ],
        'career_change' => [
            'label'       => 'Career Change',
            'description' => 'Highlights transferable skills for a pivot into a new field.',
            'body'        => "Dear Hiring Manager,\n\nMy career has taken an unconventional path to {{role}}, and that's exactly why I'm the right fit for {{company}}.\n\n[Paragraph: transferable skills from previous career]\n\n[Paragraph: specific skills directly applicable to this role]\n\nI'd welcome the chance to discuss how my background brings fresh perspective to your team.\n\nBest,\n{{name}}",
        ],
        'new_grad' => [
            'label'       => 'New Grad',
            'description' => 'Frames coursework, projects, and energy for early-career roles.',
            'body'        => "Dear Hiring Manager,\n\nAs a recent graduate eager to begin my career, I am excited to apply for the {{role}} position at {{company}}.\n\n[Paragraph: relevant coursework, projects, or internships]\n\n[Paragraph: enthusiasm for the company and role]\n\nThank you for this opportunity. I am ready to bring fresh energy and skills to your team.\n\nSincerely,\n{{name}}",
        ],
        'referral' => [
            'label'       => 'Referral',
            'description' => 'Opens with a referral hook for warmest possible intro.',
            'body'        => "Dear Hiring Manager,\n\nI was referred to this opportunity by [Referral Name], who spoke highly of {{company}} and thought my background would be a strong match for the {{role}} position.\n\n[Paragraph: relevant experience]\n\n[Paragraph: why you're excited about this role]\n\nThank you for your time and consideration.\n\nBest regards,\n{{name}}",
        ],
    ];

    public static function keys(): array
    {
        return array_keys(self::TEMPLATES);
    }

    public static function render(string $key, array $vars = []): string
    {
        $tpl = self::TEMPLATES[$key]['body'] ?? '';
        $defaults = [
            'name'    => '',
            'company' => '[Company]',
            'role'    => '[Role]',
            'date'    => now()->format('F j, Y'),
        ];
        $merged = array_merge($defaults, $vars);
        $out = $tpl;
        foreach ($merged as $k => $v) {
            $out = str_replace('{{' . $k . '}}', (string) $v, $out);
        }
        return $out;
    }
}
```

### Step 4.4 — Create the model

Create `app/Models/CoverLetter.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CoverLetter extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'resume_id', 'name', 'template_key', 'body',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
```

### Step 4.5 — Create the factory

Create `database/factories/CoverLetterFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CoverLetterFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'resume_id'    => null,
            'name'         => 'My Cover Letter',
            'template_key' => 'standard',
            'body'         => 'Dear Hiring Manager, ...',
        ];
    }
}
```

### Step 4.6 — Create the policy

Create `app/Policies/CoverLetterPolicy.php`:

```php
<?php

namespace App\Policies;

use App\Models\CoverLetter;
use App\Models\User;

class CoverLetterPolicy
{
    public function update(User $user, CoverLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }

    public function delete(User $user, CoverLetter $letter): bool
    {
        return $user->id === $letter->user_id;
    }
}
```

Laravel 13 auto-discovers policies in `app/Policies/` for models in `app/Models/`, so no `AuthServiceProvider` change is needed. If the project is configured otherwise, register the policy in `app/Providers/AppServiceProvider::boot()`:

```php
Gate::policy(\App\Models\CoverLetter::class, \App\Policies\CoverLetterPolicy::class);
```

---

## Task 5: Cover Letter Controller + Routes

### Step 5.1 — Create the controller

Create `app/Http/Controllers/CoverLetterController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Data\CoverLetterTemplates;
use App\Models\CoverLetter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CoverLetterController extends Controller
{
    public function index(Request $request): Response
    {
        $letters = $request->user()
            ->coverLetters()
            ->orderByDesc('updated_at')
            ->get(['id', 'name', 'template_key', 'resume_id', 'updated_at']);

        return Inertia::render('CoverLetter/Index', [
            'letters'   => $letters,
            'templates' => collect(CoverLetterTemplates::TEMPLATES)->map(fn($t, $k) => [
                'key'         => $k,
                'label'       => $t['label'],
                'description' => $t['description'],
            ])->values(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'template_key' => ['required', 'in:' . implode(',', CoverLetterTemplates::keys())],
            'name'         => ['required', 'string', 'max:255'],
        ]);

        $letter = $request->user()->coverLetters()->create([
            'name'         => $validated['name'],
            'template_key' => $validated['template_key'],
            'body'         => CoverLetterTemplates::render($validated['template_key'], [
                'name' => $request->user()->name,
            ]),
        ]);

        return redirect()->route('cover-letters.edit', $letter->id);
    }

    public function edit(Request $request, CoverLetter $letter): Response
    {
        $this->authorize('update', $letter);

        $resumes = $request->user()
            ->resumes()
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('CoverLetter/Edit', [
            'letter'  => $letter,
            'resumes' => $resumes,
        ]);
    }

    public function update(Request $request, CoverLetter $letter)
    {
        $this->authorize('update', $letter);

        $validated = $request->validate([
            'name'      => ['sometimes', 'required', 'string', 'max:255'],
            'body'      => ['sometimes', 'string'],
            'resume_id' => ['sometimes', 'nullable', 'integer', 'exists:resumes,id'],
        ]);

        // If linking to a resume, make sure it's the current user's
        if (array_key_exists('resume_id', $validated) && $validated['resume_id'] !== null) {
            abort_unless(
                $request->user()->resumes()->whereKey($validated['resume_id'])->exists(),
                403
            );
        }

        $letter->update($validated);

        return back();
    }

    public function destroy(Request $request, CoverLetter $letter)
    {
        $this->authorize('delete', $letter);
        $letter->delete();
        return redirect()->route('cover-letters.index');
    }
}
```

### Step 5.2 — Add the `coverLetters` relationship to User

Open `app/Models/User.php` and add (after the existing `resumes()` relationship — if there is no `resumes()` method, also add it; check the file first):

```php
public function coverLetters(): \Illuminate\Database\Eloquent\Relations\HasMany
{
    return $this->hasMany(CoverLetter::class);
}
```

Confirm `App\Models\CoverLetter` is imported at the top, or use the fully-qualified class name in the return type as shown.

### Step 5.3 — Register routes

In `routes/web.php`, inside the existing `Route::middleware('auth')->group(...)` block, add:

```php
    Route::get('/cover-letters', [\App\Http\Controllers\CoverLetterController::class, 'index'])->name('cover-letters.index');
    Route::post('/cover-letters', [\App\Http\Controllers\CoverLetterController::class, 'store'])->name('cover-letters.store');
    Route::get('/cover-letters/{letter}', [\App\Http\Controllers\CoverLetterController::class, 'edit'])->name('cover-letters.edit');
    Route::put('/cover-letters/{letter}', [\App\Http\Controllers\CoverLetterController::class, 'update'])->name('cover-letters.update');
    Route::delete('/cover-letters/{letter}', [\App\Http\Controllers\CoverLetterController::class, 'destroy'])->name('cover-letters.destroy');
```

Also add the `use` import at the top of `routes/web.php`:

```php
use App\Http\Controllers\CoverLetterController;
```

Then simplify the route declarations:

```php
    Route::get('/cover-letters', [CoverLetterController::class, 'index'])->name('cover-letters.index');
    Route::post('/cover-letters', [CoverLetterController::class, 'store'])->name('cover-letters.store');
    Route::get('/cover-letters/{letter}', [CoverLetterController::class, 'edit'])->name('cover-letters.edit');
    Route::put('/cover-letters/{letter}', [CoverLetterController::class, 'update'])->name('cover-letters.update');
    Route::delete('/cover-letters/{letter}', [CoverLetterController::class, 'destroy'])->name('cover-letters.destroy');
```

The `{letter}` parameter resolves via implicit binding because the model is named `CoverLetter`; tell Laravel by adding the type-hint in the controller method (already done above as `CoverLetter $letter`). The route key defaults to `id`.

### Step 5.4 — Rerun cover letter tests

```bash
php artisan test --filter=CoverLetterTest
```

Expected: all tests pass.

---

## Task 6: Cover Letter Pages

### Step 6.1 — Add TypeScript types

In `resources/js/types/index.d.ts`, append:

```ts
export interface CoverLetterRow {
    id: number;
    name: string;
    template_key: string;
    resume_id: number | null;
    updated_at: string;
}

export interface CoverLetterTemplateOption {
    key: string;
    label: string;
    description: string;
}

export interface CoverLetter {
    id: number;
    user_id: number;
    resume_id: number | null;
    name: string;
    template_key: string;
    body: string;
    created_at: string;
    updated_at: string;
}
```

### Step 6.2 — Create the Index page

Create `resources/js/Pages/CoverLetter/Index.tsx`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetterRow, CoverLetterTemplateOption } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Props = {
    letters: CoverLetterRow[];
    templates: CoverLetterTemplateOption[];
};

export default function Index({ letters, templates }: Props) {
    const [picking, setPicking] = useState(false);
    const form = useForm({ template_key: '', name: 'My Cover Letter' });

    const choose = (key: string) => {
        form.setData('template_key', key);
        form.post(route('cover-letters.store'), {
            data: { template_key: key, name: 'My Cover Letter' } as any,
            onSuccess: () => setPicking(false),
        });
    };

    const destroy = (id: number, name: string) => {
        if (!confirm(`Delete "${name}"?`)) return;
        router.delete(route('cover-letters.destroy', id));
    };

    const fmt = (iso: string) =>
        new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso));

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Cover Letters</h2>}
        >
            <Head title="Cover Letters" />

            <div className="py-10">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-8 flex items-center justify-between">
                        <p className="text-sm text-gray-500">{letters.length} letter{letters.length !== 1 ? 's' : ''}</p>
                        <button
                            onClick={() => setPicking(true)}
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                        >
                            + New Cover Letter
                        </button>
                    </div>

                    {letters.length === 0 ? (
                        <div className="rounded-lg border-2 border-dashed border-gray-200 py-16 text-center">
                            <p className="text-gray-400">No cover letters yet. Click "+ New Cover Letter" to start.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white shadow-sm">
                            {letters.map(l => (
                                <li key={l.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium text-gray-900">{l.name}</p>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            {l.template_key} · Last edited {fmt(l.updated_at)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Link
                                            href={route('cover-letters.edit', l.id)}
                                            className="rounded-md bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => destroy(l.id, l.name)}
                                            className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {picking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Choose a template</h3>
                            <button onClick={() => setPicking(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {templates.map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => choose(t.key)}
                                    disabled={form.processing}
                                    className="rounded-md border border-gray-200 p-4 text-left hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-50"
                                >
                                    <p className="font-semibold text-gray-900">{t.label}</p>
                                    <p className="mt-1 text-xs text-gray-500">{t.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
```

### Step 6.3 — Create the Edit page

Create `resources/js/Pages/CoverLetter/Edit.tsx`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { CoverLetter } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

type ResumeOpt = { id: number; name: string };

type Props = {
    letter: CoverLetter;
    resumes: ResumeOpt[];
};

export default function Edit({ letter, resumes }: Props) {
    const [name, setName] = useState(letter.name);
    const [body, setBody] = useState(letter.body);
    const [resumeId, setResumeId] = useState<number | ''>(letter.resume_id ?? '');
    const [saving, setSaving] = useState(false);

    const save = (patch: Record<string, any>) => {
        setSaving(true);
        router.put(route('cover-letters.update', letter.id), patch, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => setSaving(false),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Cover Letter</h2>
                    <span className="text-xs text-gray-400">{saving ? 'Saving…' : 'Saved'}</span>
                </div>
            }
        >
            <Head title={letter.name} />

            <div className="py-10">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 flex items-center gap-4">
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={() => name !== letter.name && save({ name })}
                            className="flex-1 rounded-md border-gray-300 text-lg font-semibold shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            placeholder="Cover letter name"
                        />
                        <select
                            value={resumeId}
                            onChange={e => {
                                const val = e.target.value === '' ? null : Number(e.target.value);
                                setResumeId(val ?? '');
                                save({ resume_id: val });
                            }}
                            className="rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                            <option value="">No resume linked</option>
                            {resumes.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>

                    <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        onBlur={() => body !== letter.body && save({ body })}
                        className="h-[60vh] w-full rounded-md border-gray-300 font-mono text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Write your cover letter here…"
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

### Step 6.4 — Build the frontend

```bash
npm run build
```

Expected: TypeScript and Vite both succeed.

---

## Task 7: Cover Letters Nav Link

### Step 7.1 — Edit AuthenticatedLayout.tsx (desktop)

In `resources/js/Layouts/AuthenticatedLayout.tsx`, locate the desktop nav block:

```tsx
<NavLink
    href={route('builder.index')}
    active={route().current('builder.*')}
>
    Resume Builder
</NavLink>
```

…and add immediately after it:

```tsx
<NavLink
    href={route('cover-letters.index')}
    active={route().current('cover-letters.*')}
>
    Cover Letters
</NavLink>
```

### Step 7.2 — Edit AuthenticatedLayout.tsx (mobile)

Locate the mobile responsive nav block:

```tsx
<ResponsiveNavLink
    href={route('builder.index')}
    active={route().current('builder.*')}
>
    Resume Builder
</ResponsiveNavLink>
```

…and add immediately after it:

```tsx
<ResponsiveNavLink
    href={route('cover-letters.index')}
    active={route().current('cover-letters.*')}
>
    Cover Letters
</ResponsiveNavLink>
```

### Step 7.3 — Rebuild

```bash
npm run build
```

Expected: clean build.

---

## Task 8: Job Application Migration + Model + Policy (TDD)

### Step 8.1 — Failing test

Create `tests/Feature/JobApplicationTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobApplicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_only_my_applications(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        JobApplication::factory()->for($me)->create();
        JobApplication::factory()->for($other)->create();

        $this->actingAs($me)
            ->get(route('jobs.index'))
            ->assertOk()
            ->assertInertia(fn ($p) => $p->component('Jobs/Index')->has('applications', 1));
    }

    public function test_store_creates_application(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('jobs.store'), [
                'company' => 'Acme',
                'role'    => 'Engineer',
                'status'  => 'applied',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_applications', [
            'user_id' => $user->id,
            'company' => 'Acme',
            'role'    => 'Engineer',
            'status'  => 'applied',
        ]);
    }

    public function test_store_validates_status_enum(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('jobs.store'), [
                'company' => 'Acme',
                'role'    => 'Engineer',
                'status'  => 'bogus',
            ])
            ->assertSessionHasErrors('status');
    }

    public function test_update_persists_changes(): void
    {
        $user = User::factory()->create();
        $app = JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->put(route('jobs.update', $app->id), [
                'company' => 'Acme',
                'role'    => 'Engineer',
                'status'  => 'interviewing',
                'notes'   => 'Phone screen Friday',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_applications', [
            'id'     => $app->id,
            'status' => 'interviewing',
            'notes'  => 'Phone screen Friday',
        ]);
    }

    public function test_other_user_cannot_update(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $app = JobApplication::factory()->for($owner)->create();

        $this->actingAs($other)
            ->put(route('jobs.update', $app->id), [
                'company' => 'X',
                'role'    => 'Y',
                'status'  => 'saved',
            ])
            ->assertForbidden();
    }

    public function test_destroy_deletes_application(): void
    {
        $user = User::factory()->create();
        $app = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->delete(route('jobs.destroy', $app->id))
            ->assertRedirect();

        $this->assertDatabaseMissing('job_applications', ['id' => $app->id]);
    }
}
```

Run:

```bash
php artisan test --filter=JobApplicationTest
```

Expected: all fail (model/route not yet created).

### Step 8.2 — Migration

Create `database/migrations/2026_05_28_120100_create_job_applications_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('job_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->nullable()->constrained('resumes')->nullOnDelete();
            $table->string('company');
            $table->string('role');
            $table->string('status', 20)->default('saved'); // enum enforced in PHP / validation
            $table->date('applied_at')->nullable();
            $table->text('notes')->nullable();
            $table->string('job_url', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');
    }
};
```

Run:

```bash
php artisan migrate
```

### Step 8.3 — Model

Create `app/Models/JobApplication.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobApplication extends Model
{
    use HasFactory;

    public const STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'closed'];

    protected $fillable = [
        'user_id', 'resume_id', 'company', 'role', 'status', 'applied_at', 'notes', 'job_url',
    ];

    protected $casts = [
        'applied_at' => 'date',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
```

### Step 8.4 — Factory

Create `database/factories/JobApplicationFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobApplicationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'company' => $this->faker->company(),
            'role'    => $this->faker->jobTitle(),
            'status'  => $this->faker->randomElement(JobApplication::STATUSES),
        ];
    }
}
```

### Step 8.5 — Policy

Create `app/Policies/JobApplicationPolicy.php`:

```php
<?php

namespace App\Policies;

use App\Models\JobApplication;
use App\Models\User;

class JobApplicationPolicy
{
    public function update(User $user, JobApplication $application): bool
    {
        return $user->id === $application->user_id;
    }

    public function delete(User $user, JobApplication $application): bool
    {
        return $user->id === $application->user_id;
    }
}
```

### Step 8.6 — User relationship

In `app/Models/User.php`, add:

```php
public function jobApplications(): \Illuminate\Database\Eloquent\Relations\HasMany
{
    return $this->hasMany(JobApplication::class);
}
```

---

## Task 9: Job Application Controller + Routes

### Step 9.1 — Controller

Create `app/Http/Controllers/JobApplicationController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobApplicationController extends Controller
{
    public function index(Request $request): Response
    {
        $applications = $request->user()
            ->jobApplications()
            ->with('resume:id,name')
            ->orderByDesc('updated_at')
            ->get([
                'id', 'company', 'role', 'status', 'resume_id',
                'applied_at', 'job_url', 'updated_at',
            ]);

        $resumes = $request->user()->resumes()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Jobs/Index', [
            'applications' => $applications,
            'resumes'      => $resumes,
            'statuses'     => JobApplication::STATUSES,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validateData($request, creating: true);

        $request->user()->jobApplications()->create($validated);

        return redirect()->route('jobs.index');
    }

    public function edit(Request $request, JobApplication $application): Response
    {
        $this->authorize('update', $application);

        $resumes = $request->user()->resumes()->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Jobs/Edit', [
            'application' => $application,
            'resumes'     => $resumes,
            'statuses'    => JobApplication::STATUSES,
        ]);
    }

    public function update(Request $request, JobApplication $application)
    {
        $this->authorize('update', $application);

        $validated = $this->validateData($request, creating: false);

        if (array_key_exists('resume_id', $validated) && $validated['resume_id'] !== null) {
            abort_unless(
                $request->user()->resumes()->whereKey($validated['resume_id'])->exists(),
                403
            );
        }

        $application->update($validated);

        return redirect()->route('jobs.index');
    }

    public function destroy(Request $request, JobApplication $application)
    {
        $this->authorize('delete', $application);
        $application->delete();
        return redirect()->route('jobs.index');
    }

    private function validateData(Request $request, bool $creating): array
    {
        $required = $creating ? 'required' : 'sometimes';

        return $request->validate([
            'company'    => [$required, 'string', 'max:255'],
            'role'       => [$required, 'string', 'max:255'],
            'status'     => [$required, 'in:' . implode(',', JobApplication::STATUSES)],
            'resume_id'  => ['sometimes', 'nullable', 'integer', 'exists:resumes,id'],
            'applied_at' => ['sometimes', 'nullable', 'date'],
            'notes'      => ['sometimes', 'nullable', 'string'],
            'job_url'    => ['sometimes', 'nullable', 'url', 'max:500'],
        ]);
    }
}
```

### Step 9.2 — Routes

In `routes/web.php`, add the `use` at the top:

```php
use App\Http\Controllers\JobApplicationController;
```

…and inside the `auth` group:

```php
    Route::get('/jobs', [JobApplicationController::class, 'index'])->name('jobs.index');
    Route::post('/jobs', [JobApplicationController::class, 'store'])->name('jobs.store');
    Route::get('/jobs/{application}', [JobApplicationController::class, 'edit'])->name('jobs.edit');
    Route::put('/jobs/{application}', [JobApplicationController::class, 'update'])->name('jobs.update');
    Route::delete('/jobs/{application}', [JobApplicationController::class, 'destroy'])->name('jobs.destroy');
```

Implicit binding resolves `{application}` to `JobApplication`.

### Step 9.3 — Run job tests

```bash
php artisan test --filter=JobApplicationTest
```

Expected: all six tests pass.

---

## Task 10: Job Application Pages

### Step 10.1 — Add types

In `resources/js/types/index.d.ts`, append:

```ts
export type JobStatus = 'saved' | 'applied' | 'interviewing' | 'offered' | 'rejected' | 'closed';

export interface JobApplicationRow {
    id: number;
    company: string;
    role: string;
    status: JobStatus;
    resume_id: number | null;
    resume?: { id: number; name: string } | null;
    applied_at: string | null;
    job_url: string | null;
    updated_at: string;
}

export interface JobApplication {
    id: number;
    user_id: number;
    resume_id: number | null;
    company: string;
    role: string;
    status: JobStatus;
    applied_at: string | null;
    notes: string | null;
    job_url: string | null;
    created_at: string;
    updated_at: string;
}
```

### Step 10.2 — Create the Index page

Create `resources/js/Pages/Jobs/Index.tsx`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { JobApplicationRow, JobStatus } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { FormEvent, useMemo, useState } from 'react';

type ResumeOpt = { id: number; name: string };

type Props = {
    applications: JobApplicationRow[];
    resumes: ResumeOpt[];
    statuses: JobStatus[];
};

const STATUS_CLASSES: Record<JobStatus, string> = {
    saved:        'bg-gray-100 text-gray-700',
    applied:      'bg-blue-100 text-blue-800',
    interviewing: 'bg-amber-100 text-amber-800',
    offered:      'bg-green-100 text-green-800',
    rejected:     'bg-red-100 text-red-700',
    closed:       'bg-gray-100 text-gray-500',
};

type SortKey = 'company' | 'role' | 'status' | 'applied_at' | 'updated_at';

export default function Index({ applications, resumes, statuses }: Props) {
    const [adding, setAdding] = useState(false);
    const [sortKey, setSortKey] = useState<SortKey>('updated_at');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const form = useForm({
        company: '',
        role: '',
        status: 'saved' as JobStatus,
        resume_id: '' as number | '',
        applied_at: '',
        job_url: '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(route('jobs.store'), {
            data: {
                ...form.data,
                resume_id: form.data.resume_id === '' ? null : form.data.resume_id,
                applied_at: form.data.applied_at || null,
                job_url: form.data.job_url || null,
            } as any,
            onSuccess: () => {
                form.reset();
                setAdding(false);
            },
        });
    };

    const destroy = (id: number, label: string) => {
        if (!confirm(`Delete application for "${label}"?`)) return;
        router.delete(route('jobs.destroy', id));
    };

    const sorted = useMemo(() => {
        const copy = [...applications];
        copy.sort((a, b) => {
            const av = (a[sortKey] ?? '') as string;
            const bv = (b[sortKey] ?? '') as string;
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });
        return copy;
    }, [applications, sortKey, sortDir]);

    const toggleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(k); setSortDir('asc'); }
    };

    const fmt = (iso: string | null) =>
        iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso)) : '—';

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Job Applications</h2>}
        >
            <Head title="Jobs" />

            <div className="py-10">
                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-sm text-gray-500">{applications.length} application{applications.length !== 1 ? 's' : ''}</p>
                        {!adding && (
                            <button
                                onClick={() => setAdding(true)}
                                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500"
                            >
                                + New Application
                            </button>
                        )}
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                    <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('company')}>Company</th>
                                    <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('role')}>Role</th>
                                    <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('status')}>Status</th>
                                    <th className="px-4 py-3">Resume</th>
                                    <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort('applied_at')}>Applied</th>
                                    <th className="px-4 py-3">URL</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {adding && (
                                    <tr className="bg-indigo-50/40">
                                        <td className="px-4 py-2">
                                            <input value={form.data.company} onChange={e => form.setData('company', e.target.value)} className="w-full rounded border-gray-300 text-sm" placeholder="Company" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input value={form.data.role} onChange={e => form.setData('role', e.target.value)} className="w-full rounded border-gray-300 text-sm" placeholder="Role" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <select value={form.data.status} onChange={e => form.setData('status', e.target.value as JobStatus)} className="w-full rounded border-gray-300 text-sm">
                                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                value={form.data.resume_id === '' ? '' : String(form.data.resume_id)}
                                                onChange={e => form.setData('resume_id', e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-full rounded border-gray-300 text-sm"
                                            >
                                                <option value="">—</option>
                                                {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="date" value={form.data.applied_at} onChange={e => form.setData('applied_at', e.target.value)} className="w-full rounded border-gray-300 text-sm" />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="url" value={form.data.job_url} onChange={e => form.setData('job_url', e.target.value)} className="w-full rounded border-gray-300 text-sm" placeholder="https://…" />
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <form onSubmit={submit} className="inline-flex gap-2">
                                                <button type="submit" disabled={form.processing || !form.data.company || !form.data.role} className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
                                                    Add
                                                </button>
                                                <button type="button" onClick={() => { form.reset(); setAdding(false); }} className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700">
                                                    Cancel
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                )}

                                {sorted.length === 0 && !adding && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                                            No applications yet. Click "+ New Application" to start tracking.
                                        </td>
                                    </tr>
                                )}

                                {sorted.map(a => (
                                    <tr key={a.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">{a.company}</td>
                                        <td className="px-4 py-3 text-gray-700">{a.role}</td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[a.status]}`}>
                                                {a.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{a.resume?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-gray-600">{fmt(a.applied_at)}</td>
                                        <td className="px-4 py-3">
                                            {a.job_url ? (
                                                <a href={a.job_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">link</a>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={route('jobs.edit', a.id)} className="mr-2 text-xs font-medium text-indigo-600 hover:underline">Edit</Link>
                                            <button onClick={() => destroy(a.id, `${a.company} – ${a.role}`)} className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

### Step 10.3 — Create the Edit page

Create `resources/js/Pages/Jobs/Edit.tsx`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { JobApplication, JobStatus } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

type ResumeOpt = { id: number; name: string };

type Props = {
    application: JobApplication;
    resumes: ResumeOpt[];
    statuses: JobStatus[];
};

export default function Edit({ application, resumes, statuses }: Props) {
    const form = useForm({
        company:    application.company,
        role:       application.role,
        status:     application.status,
        resume_id:  application.resume_id ?? ('' as number | ''),
        applied_at: application.applied_at ?? '',
        job_url:    application.job_url ?? '',
        notes:      application.notes ?? '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put(route('jobs.update', application.id), {
            data: {
                ...form.data,
                resume_id: form.data.resume_id === '' ? null : form.data.resume_id,
                applied_at: form.data.applied_at || null,
                job_url: form.data.job_url || null,
                notes: form.data.notes || null,
            } as any,
        });
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Edit Application</h2>}
        >
            <Head title={`${application.company} – ${application.role}`} />

            <div className="py-10">
                <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
                    <form onSubmit={submit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Company</label>
                            <input value={form.data.company} onChange={e => form.setData('company', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Role</label>
                            <input value={form.data.role} onChange={e => form.setData('role', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Status</label>
                                <select value={form.data.status} onChange={e => form.setData('status', e.target.value as JobStatus)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Resume</label>
                                <select
                                    value={form.data.resume_id === '' ? '' : String(form.data.resume_id)}
                                    onChange={e => form.setData('resume_id', e.target.value === '' ? '' : Number(e.target.value))}
                                    className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    <option value="">No resume linked</option>
                                    {resumes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date Applied</label>
                                <input type="date" value={form.data.applied_at} onChange={e => form.setData('applied_at', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Job URL</label>
                                <input type="url" value={form.data.job_url} onChange={e => form.setData('job_url', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" placeholder="https://…" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea rows={5} value={form.data.notes} onChange={e => form.setData('notes', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                        </div>
                        <div className="flex justify-end gap-2">
                            <a href={route('jobs.index')} className="rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</a>
                            <button type="submit" disabled={form.processing} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

### Step 10.4 — Build

```bash
npm run build
```

Expected: clean type-check and build.

---

## Task 11: Jobs Nav Link

### Step 11.1 — Edit AuthenticatedLayout.tsx (desktop)

In `resources/js/Layouts/AuthenticatedLayout.tsx`, locate the `Cover Letters` `NavLink` just added and add immediately after it:

```tsx
<NavLink
    href={route('jobs.index')}
    active={route().current('jobs.*')}
>
    Jobs
</NavLink>
```

### Step 11.2 — Edit AuthenticatedLayout.tsx (mobile)

Locate the `Cover Letters` `ResponsiveNavLink` and add immediately after it:

```tsx
<ResponsiveNavLink
    href={route('jobs.index')}
    active={route().current('jobs.*')}
>
    Jobs
</ResponsiveNavLink>
```

### Step 11.3 — Rebuild

```bash
npm run build
```

Expected: clean build.

---

## Task 12: Full Regression

### Step 12.1 — Run all tests

```bash
php artisan test
```

Expected: 100% green, including the three new feature tests plus the existing suite (`AiSuggestTest`, `AnalyticsControllerTest`, `PublicResumeTest`, `ResumeBuilderTest`, etc.).

### Step 12.2 — Run Pint

```bash
./vendor/bin/pint
```

Expected: any formatting drift is auto-fixed; commit the result.

### Step 12.3 — Manual smoke

Start dev server:

```bash
composer run dev
```

Verify in browser:

1. Log in → top nav shows `Dashboard | Resume Builder | Cover Letters | Jobs`.
2. Open a resume → header shows an `{score} ATS` pill; sidebar has collapsible "ATS Score" panel. Click "Add to Skills" → keyword appears in skills, score updates.
3. Navigate to `/cover-letters` → click `+ New Cover Letter` → choose a template → redirected to editor. Edit title, body, resume picker — all save on blur.
4. Navigate to `/jobs` → click `+ New Application` → inline row appears → submit → row appears in table. Click `Edit` → form loads. Status badge colors render. URL link opens in new tab.

Stop the server with `Ctrl+C`.

### Step 12.4 — Final build for production

```bash
npm run build
```

Confirm assets land in `public/build/`.

---

## Notes / Concerns

- **Throttling on ATS endpoint.** With auto-fetch after every save, a fast-typing user could exceed `throttle:10,1`. The endpoint will return 429 silently — the UI falls back to the last known score and continues. If this becomes annoying we can debounce client-side or raise to `throttle:30,1`. Documented here so future work knows where to look.
- **`{{date}}` placeholder.** The cover-letter template substitution defaults to today's date at creation time. There is no field to edit it later — users edit the rendered body directly.
- **Status enum.** Stored as `string(20)` not a true DB-enum so future statuses can be added without a schema migration; values are enforced in `JobApplication::STATUSES` + validation.
- **Resume deletion cascades.** Both new tables use `nullOnDelete()` for `resume_id`, so deleting a resume orphans linked cover letters / applications instead of destroying them — matches expected user mental model.
- **Policy auto-discovery.** Laravel 11+ auto-discovers `App\Policies\FooPolicy` for `App\Models\Foo`. If policy resolution fails in tests, register policies explicitly in `AppServiceProvider::boot()`.
- **`Edit.tsx` is already large.** This plan adds ~80 LOC; if the file grows unwieldy after this change, a follow-up refactor to extract `AtsBadge` and `AtsPanel` components is recommended (out of scope here).
- **PDF and ATS scoring are decoupled.** Scoring runs only inside the editor; the PDF view is untouched.
