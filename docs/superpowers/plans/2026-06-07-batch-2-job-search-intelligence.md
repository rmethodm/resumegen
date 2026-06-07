# Batch 2 — Job Search Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Kanban job board, salary intelligence, interview notes, and view count badge to strengthen the job search workflow.

**Architecture:** Four independent features touching `Jobs/*` pages and `ResumeBuilder/Index.tsx`. No new external dependencies — `@dnd-kit` is already installed. Salary data is static PHP array. Interview notes is a new append-only table. View count is a subquery on the existing `resume_share_events` table.

**Tech Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, @dnd-kit/core + @dnd-kit/sortable (already installed), SQLite, PHPUnit 12

---

### Task 1: Interview Notes — Migration & Model

**Files:**
- Create: `database/migrations/2026_06_07_200000_create_interview_notes_table.php`
- Create: `app/Models/InterviewNote.php`

- [ ] **Step 1: Create migration**

```bash
php artisan make:migration create_interview_notes_table --no-interaction
```

Edit the migration `up()`:
```php
public function up(): void
{
    Schema::create('interview_notes', function (Blueprint $table): void {
        $table->id();
        $table->foreignId('job_application_id')
            ->constrained('job_applications')
            ->cascadeOnDelete();
        $table->text('body');
        $table->timestamp('created_at')->useCurrent();
    });
}

public function down(): void
{
    Schema::dropIfExists('interview_notes');
}
```

- [ ] **Step 2: Run migration**

```bash
php artisan migrate --no-interaction
```

Expected: migrated `2026_06_07_200000_create_interview_notes_table`

- [ ] **Step 3: Create model**

```bash
php artisan make:model InterviewNote --no-interaction
```

Set content of `app/Models/InterviewNote.php`:
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InterviewNote extends Model
{
    public $timestamps = false;

    protected $fillable = ['job_application_id', 'body'];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function jobApplication(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class);
    }
}
```

- [ ] **Step 4: Add `interviewNotes()` HasMany to `JobApplication` model**

In `app/Models/JobApplication.php`, add:
```php
use Illuminate\Database\Eloquent\Relations\HasMany;

public function interviewNotes(): HasMany
{
    return $this->hasMany(InterviewNote::class)->orderByDesc('created_at');
}
```

- [ ] **Step 5: Commit**

```bash
git add database/migrations/2026_06_07_200000_create_interview_notes_table.php app/Models/InterviewNote.php app/Models/JobApplication.php
git commit -m "feat: add interview_notes table — append-only per-application note log"
```

---

### Task 2: Interview Notes — Controller & Routes

**Files:**
- Create: `app/Http/Controllers/InterviewNoteController.php`
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/JobApplicationController.php` (add `notes_log` to `edit()`)

- [ ] **Step 1: Create controller**

```bash
php artisan make:controller InterviewNoteController --no-interaction
```

Set content of `app/Http/Controllers/InterviewNoteController.php`:
```php
<?php

namespace App\Http\Controllers;

use App\Models\InterviewNote;
use App\Models\JobApplication;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InterviewNoteController extends Controller
{
    public function store(Request $request, JobApplication $application): RedirectResponse
    {
        $this->authorize('update', $application);

        $validated = $request->validate([
            'body' => ['required', 'string', 'min:1', 'max:2000'],
        ]);

        $application->interviewNotes()->create($validated);

        return back();
    }

    public function destroy(Request $request, JobApplication $application, InterviewNote $note): RedirectResponse
    {
        $this->authorize('update', $application);

        abort_if($note->job_application_id !== $application->id, 403);

        $note->delete();

        return back();
    }
}
```

- [ ] **Step 2: Register routes in `routes/web.php`**

Inside the `auth` + middleware group (after the existing jobs routes), add:
```php
use App\Http\Controllers\InterviewNoteController;

Route::post('/jobs/{application}/notes', [InterviewNoteController::class, 'store'])->name('jobs.notes.store');
Route::delete('/jobs/{application}/notes/{note}', [InterviewNoteController::class, 'destroy'])->name('jobs.notes.destroy');
```

- [ ] **Step 3: Add `notes_log` prop to `JobApplicationController::edit()`**

In `app/Http/Controllers/JobApplicationController.php`, find the `edit()` method and add `notes_log` to the Inertia response:
```php
public function edit(Request $request, JobApplication $application): Response
{
    $this->authorize('update', $application);

    $resumes = $request->user()->resumes()->orderBy('name')->get(['id', 'name']);

    return Inertia::render('Jobs/Edit', [
        'application' => $application->load('resume:id,name'),
        'resumes' => $resumes,
        'statuses' => JobApplication::STATUSES,
        'notes_log' => $application->interviewNotes()->get(['id', 'body', 'created_at']),
    ]);
}
```

- [ ] **Step 4: Add `InterviewNote` type to `resources/js/types/index.d.ts`**

```ts
export interface InterviewNote {
    id: number;
    body: string;
    created_at: string;
}
```

- [ ] **Step 5: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/InterviewNoteController.php app/Http/Controllers/JobApplicationController.php routes/web.php --format agent
```

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/InterviewNoteController.php app/Http/Controllers/JobApplicationController.php routes/web.php resources/js/types/index.d.ts
git commit -m "feat: add InterviewNoteController — store/destroy with ownership guard; notes_log prop on Jobs/Edit"
```

---

### Task 3: Interview Notes — Feature Test

**Files:**
- Create: `tests/Feature/InterviewNoteTest.php`

- [ ] **Step 1: Create test file**

```bash
php artisan make:test InterviewNoteTest --phpunit --no-interaction
```

- [ ] **Step 2: Write tests**

Replace content of `tests/Feature/InterviewNoteTest.php`:
```php
<?php

namespace Tests\Feature;

use App\Models\InterviewNote;
use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InterviewNoteTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_add_note_to_own_application(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('jobs.notes.store', $job), ['body' => 'Good first interview.'])
            ->assertRedirect();

        $this->assertDatabaseHas('interview_notes', [
            'job_application_id' => $job->id,
            'body' => 'Good first interview.',
        ]);
    }

    public function test_notes_returned_on_edit_page_newest_first(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();

        $note1 = InterviewNote::create(['job_application_id' => $job->id, 'body' => 'First note']);
        $note2 = InterviewNote::create(['job_application_id' => $job->id, 'body' => 'Second note']);

        $response = $this->actingAs($user)->get(route('jobs.edit', $job));

        $response->assertInertia(
            fn ($page) => $page->component('Jobs/Edit')
                ->has('notes_log', 2)
        );
    }

    public function test_user_cannot_add_note_to_others_application(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $job = JobApplication::factory()->for($owner)->create();

        $this->actingAs($other)
            ->post(route('jobs.notes.store', $job), ['body' => 'Hacking notes'])
            ->assertForbidden();
    }

    public function test_empty_body_rejected(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('jobs.notes.store', $job), ['body' => ''])
            ->assertSessionHasErrors('body');
    }

    public function test_user_can_delete_own_note(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();
        $note = InterviewNote::create(['job_application_id' => $job->id, 'body' => 'Delete me.']);

        $this->actingAs($user)
            ->delete(route('jobs.notes.destroy', [$job, $note]))
            ->assertRedirect();

        $this->assertDatabaseMissing('interview_notes', ['id' => $note->id]);
    }

    public function test_user_cannot_delete_note_from_others_application(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $job = JobApplication::factory()->for($owner)->create();
        $note = InterviewNote::create(['job_application_id' => $job->id, 'body' => 'Private note.']);

        $this->actingAs($other)
            ->delete(route('jobs.notes.destroy', [$job, $note]))
            ->assertForbidden();
    }
}
```

- [ ] **Step 3: Run tests**

```bash
php artisan test tests/Feature/InterviewNoteTest.php --compact
```

Expected: 6 tests passing.

- [ ] **Step 4: Commit**

```bash
git add tests/Feature/InterviewNoteTest.php
git commit -m "test: add InterviewNoteTest — 6 tests covering store, delete, auth, ordering"
```

---

### Task 4: Interview Notes — Frontend in Jobs/Edit.tsx

**Files:**
- Modify: `resources/js/Pages/Jobs/Edit.tsx`

- [ ] **Step 1: Read current Edit.tsx**

Read `resources/js/Pages/Jobs/Edit.tsx` in full.

- [ ] **Step 2: Add notes_log prop and InterviewNoteLog UI**

Update `Jobs/Edit.tsx` to accept `notes_log: InterviewNote[]` prop and render the note log section below the existing content. Here is the full pattern for the notes section to append inside the form container (below the existing fields, before the submit button area):

```tsx
import type { InterviewNote, JobApplication, JobStatus } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';

// Add to Props:
// notes_log: InterviewNote[];

// Add state for new note:
const [noteBody, setNoteBody] = useState('');
const [addingNote, setAddingNote] = useState(false);

const submitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    router.post(route('jobs.notes.store', application.id), { body: noteBody }, {
        onSuccess: () => { setNoteBody(''); setAddingNote(false); },
        preserveScroll: true,
    });
};

const deleteNote = (noteId: number) => {
    if (!confirm('Delete this note?')) return;
    router.delete(route('jobs.notes.destroy', [application.id, noteId]), { preserveScroll: true });
};

const relativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
};
```

The JSX for the notes section:
```tsx
{/* Notes Log */}
<div className="mt-6 border-t border-[#e8e8f0] pt-6">
    <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#23232d]">Notes Log</h3>
        <button type="button" onClick={() => setAddingNote(v => !v)}
            className="text-xs text-[#4338ca] hover:underline">
            + Add Note
        </button>
    </div>
    {addingNote && (
        <form onSubmit={submitNote} className="mb-4">
            <textarea
                value={noteBody}
                onChange={e => setNoteBody(e.target.value)}
                rows={3}
                placeholder="Interview details, recruiter feedback, what to prepare…"
                className="w-full rounded-lg border border-[#e8e8f0] px-3 py-2 text-sm text-[#23232d] focus:border-[#4338ca] focus:outline-none resize-none"
            />
            <div className="mt-2 flex gap-2">
                <button type="submit"
                    className="rounded-lg bg-[#4338ca] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3730a3]">
                    Save Note
                </button>
                <button type="button" onClick={() => setAddingNote(false)}
                    className="rounded-lg px-3 py-1.5 text-xs text-[#6b7280] hover:bg-[#f5f5fb]">
                    Cancel
                </button>
            </div>
        </form>
    )}
    {notes_log.length === 0 ? (
        <p className="text-sm text-[#a0a0b0]">No notes yet.</p>
    ) : (
        <ul className="space-y-3">
            {notes_log.map(note => (
                <li key={note.id} className="rounded-lg bg-[#f5f5fb] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-[#23232d] whitespace-pre-wrap">{note.body}</p>
                        <button type="button" onClick={() => deleteNote(note.id)}
                            aria-label="Delete note"
                            className="shrink-0 text-[#a0a0b0] hover:text-red-500 transition">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-[#a0a0b0]">{relativeTime(note.created_at)}</p>
                </li>
            ))}
        </ul>
    )}
</div>
```

Import `TrashIcon` from `@heroicons/react/24/outline` (already used in Index.tsx — verify it's available).

- [ ] **Step 3: Verify TypeScript builds**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Jobs/Edit.tsx
git commit -m "feat: add interview notes log to Jobs/Edit — append-only timestamped notes with delete"
```

---

### Task 5: Salary Intelligence — Data & Controller

**Files:**
- Create: `app/Data/SalaryRanges.php`
- Create: `app/Http/Controllers/SalaryController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Create salary data file**

```bash
php artisan make:class app/Data/SalaryRanges --no-interaction
```

Set content of `app/Data/SalaryRanges.php`:
```php
<?php

namespace App\Data;

class SalaryRanges
{
    /** @return array<string, array{min: int, max: int, median: int}> */
    public static function all(): array
    {
        return [
            'software engineer'              => ['min' => 95000,  'max' => 160000, 'median' => 125000],
            'senior software engineer'       => ['min' => 130000, 'max' => 220000, 'median' => 170000],
            'staff software engineer'        => ['min' => 165000, 'max' => 280000, 'median' => 210000],
            'principal engineer'             => ['min' => 180000, 'max' => 320000, 'median' => 240000],
            'engineering manager'            => ['min' => 150000, 'max' => 260000, 'median' => 195000],
            'frontend engineer'              => ['min' => 90000,  'max' => 155000, 'median' => 120000],
            'backend engineer'               => ['min' => 90000,  'max' => 160000, 'median' => 122000],
            'fullstack engineer'             => ['min' => 90000,  'max' => 155000, 'median' => 118000],
            'devops engineer'                => ['min' => 95000,  'max' => 165000, 'median' => 128000],
            'site reliability engineer'      => ['min' => 110000, 'max' => 190000, 'median' => 145000],
            'data engineer'                  => ['min' => 100000, 'max' => 165000, 'median' => 130000],
            'data scientist'                 => ['min' => 95000,  'max' => 160000, 'median' => 125000],
            'machine learning engineer'      => ['min' => 120000, 'max' => 210000, 'median' => 160000],
            'ai engineer'                    => ['min' => 130000, 'max' => 220000, 'median' => 170000],
            'product manager'                => ['min' => 100000, 'max' => 175000, 'median' => 135000],
            'senior product manager'         => ['min' => 130000, 'max' => 220000, 'median' => 165000],
            'director of product'            => ['min' => 160000, 'max' => 280000, 'median' => 210000],
            'product designer'               => ['min' => 85000,  'max' => 145000, 'median' => 112000],
            'ux designer'                    => ['min' => 80000,  'max' => 140000, 'median' => 107000],
            'ui designer'                    => ['min' => 75000,  'max' => 130000, 'median' => 100000],
            'ux researcher'                  => ['min' => 85000,  'max' => 145000, 'median' => 110000],
            'design lead'                    => ['min' => 120000, 'max' => 190000, 'median' => 150000],
            'marketing manager'              => ['min' => 70000,  'max' => 120000, 'median' => 90000],
            'content marketing manager'      => ['min' => 65000,  'max' => 110000, 'median' => 85000],
            'growth marketer'                => ['min' => 75000,  'max' => 130000, 'median' => 97000],
            'seo specialist'                 => ['min' => 55000,  'max' => 95000,  'median' => 72000],
            'social media manager'           => ['min' => 50000,  'max' => 85000,  'median' => 64000],
            'sales engineer'                 => ['min' => 90000,  'max' => 160000, 'median' => 122000],
            'account executive'              => ['min' => 65000,  'max' => 130000, 'median' => 92000],
            'solutions architect'            => ['min' => 130000, 'max' => 220000, 'median' => 170000],
            'customer success manager'       => ['min' => 70000,  'max' => 120000, 'median' => 90000],
            'data analyst'                   => ['min' => 65000,  'max' => 110000, 'median' => 85000],
            'business analyst'               => ['min' => 70000,  'max' => 115000, 'median' => 88000],
            'financial analyst'              => ['min' => 65000,  'max' => 110000, 'median' => 85000],
            'finance manager'                => ['min' => 90000,  'max' => 150000, 'median' => 115000],
            'hr manager'                     => ['min' => 70000,  'max' => 120000, 'median' => 88000],
            'recruiter'                      => ['min' => 55000,  'max' => 95000,  'median' => 72000],
            'technical recruiter'            => ['min' => 70000,  'max' => 120000, 'median' => 88000],
            'project manager'                => ['min' => 80000,  'max' => 135000, 'median' => 103000],
            'program manager'                => ['min' => 90000,  'max' => 155000, 'median' => 118000],
            'scrum master'                   => ['min' => 85000,  'max' => 140000, 'median' => 108000],
            'qa engineer'                    => ['min' => 75000,  'max' => 125000, 'median' => 97000],
            'security engineer'              => ['min' => 110000, 'max' => 185000, 'median' => 145000],
            'cloud engineer'                 => ['min' => 105000, 'max' => 175000, 'median' => 135000],
            'mobile engineer'                => ['min' => 95000,  'max' => 165000, 'median' => 128000],
            'ios engineer'                   => ['min' => 95000,  'max' => 165000, 'median' => 128000],
            'android engineer'               => ['min' => 90000,  'max' => 158000, 'median' => 122000],
            'content writer'                 => ['min' => 50000,  'max' => 85000,  'median' => 63000],
            'technical writer'               => ['min' => 65000,  'max' => 110000, 'median' => 85000],
            'operations manager'             => ['min' => 75000,  'max' => 130000, 'median' => 95000],
            'chief of staff'                 => ['min' => 100000, 'max' => 180000, 'median' => 135000],
        ];
    }

    /**
     * @return array{min: int|null, max: int|null, median: int|null, match: string}
     */
    public static function lookup(string $role): array
    {
        $normalised = strtolower(trim($role));
        $data = self::all();

        // Exact match first
        if (isset($data[$normalised])) {
            return [...$data[$normalised], 'match' => 'exact'];
        }

        // Partial match: role contains key or key contains role
        $best = null;
        $bestScore = 0;
        foreach ($data as $key => $range) {
            $score = 0;
            if (str_contains($normalised, $key)) {
                $score = strlen($key);
            } elseif (str_contains($key, $normalised)) {
                $score = strlen($normalised);
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best = $range;
            }
        }

        if ($best !== null && $bestScore >= 5) {
            return [...$best, 'match' => 'partial'];
        }

        return ['min' => null, 'max' => null, 'median' => null, 'match' => 'none'];
    }
}
```

- [ ] **Step 2: Create SalaryController**

```bash
php artisan make:controller SalaryController --no-interaction
```

Set content of `app/Http/Controllers/SalaryController.php`:
```php
<?php

namespace App\Http\Controllers;

use App\Data\SalaryRanges;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SalaryController extends Controller
{
    public function hint(Request $request): JsonResponse
    {
        $request->validate(['role' => ['required', 'string', 'max:150']]);

        return response()->json(SalaryRanges::lookup($request->string('role')));
    }
}
```

- [ ] **Step 3: Register route**

In `routes/web.php`, inside the auth middleware group, add:
```php
use App\Http\Controllers\SalaryController;

Route::get('/jobs/salary', [SalaryController::class, 'hint'])->name('jobs.salary')->middleware('throttle:30,1');
```

**Important:** This route must be registered BEFORE the `/jobs/{application}` wildcard route.

- [ ] **Step 4: Run Pint**

```bash
./vendor/bin/pint app/Data/SalaryRanges.php app/Http/Controllers/SalaryController.php routes/web.php --format agent
```

- [ ] **Step 5: Commit**

```bash
git add app/Data/SalaryRanges.php app/Http/Controllers/SalaryController.php routes/web.php
git commit -m "feat: add salary intelligence — static range data with fuzzy role match"
```

---

### Task 6: Salary Intelligence — Feature Test

**Files:**
- Create: `tests/Feature/SalaryIntelligenceTest.php`

- [ ] **Step 1: Create test**

```bash
php artisan make:test SalaryIntelligenceTest --phpunit --no-interaction
```

Replace content of `tests/Feature/SalaryIntelligenceTest.php`:
```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SalaryIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_exact_match_returns_range(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('jobs.salary', ['role' => 'software engineer']))
            ->assertOk()
            ->assertJsonFragment(['match' => 'exact', 'min' => 95000, 'max' => 160000]);
    }

    public function test_partial_match_returns_range(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('jobs.salary', ['role' => 'senior data scientist']))
            ->assertOk()
            ->assertJsonFragment(['match' => 'partial']);
    }

    public function test_unknown_role_returns_nulls(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('jobs.salary', ['role' => 'blockchain sandwich artist']))
            ->assertOk()
            ->assertJsonFragment(['match' => 'none', 'min' => null, 'max' => null]);
    }

    public function test_missing_role_returns_validation_error(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson(route('jobs.salary'))
            ->assertStatus(422);
    }

    public function test_unauthenticated_returns_redirect(): void
    {
        $this->getJson(route('jobs.salary', ['role' => 'engineer']))
            ->assertStatus(401);
    }
}
```

- [ ] **Step 2: Run tests**

```bash
php artisan test tests/Feature/SalaryIntelligenceTest.php --compact
```

Expected: 5 tests passing.

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/SalaryIntelligenceTest.php
git commit -m "test: add SalaryIntelligenceTest — exact match, partial match, no match, validation"
```

---

### Task 7: Salary Intelligence — Frontend in Jobs/Edit.tsx

**Files:**
- Modify: `resources/js/Pages/Jobs/Edit.tsx`

- [ ] **Step 1: Add salary range card to Jobs/Edit.tsx**

Read current `resources/js/Pages/Jobs/Edit.tsx`.

Add state and fetch logic for salary data. Below the `role` input, add a salary range card that fetches on role blur with a 500ms debounce.

Add to component:
```tsx
const [salaryRange, setSalaryRange] = useState<{
    min: number | null; max: number | null; median: number | null; match: string;
} | null>(null);
const salaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const fetchSalary = (roleValue: string) => {
    if (salaryTimer.current) clearTimeout(salaryTimer.current);
    if (!roleValue.trim()) { setSalaryRange(null); return; }
    salaryTimer.current = setTimeout(async () => {
        try {
            const res = await fetch(route('jobs.salary') + '?role=' + encodeURIComponent(roleValue), {
                headers: { 'Accept': 'application/json' },
            });
            if (res.ok) setSalaryRange(await res.json());
        } catch { /* silent */ }
    }, 500);
};
```

Add `onBlur` to the role input:
```tsx
onBlur={e => fetchSalary(e.target.value)}
```

Add the salary card JSX below the role input:
```tsx
{salaryRange && salaryRange.match !== 'none' && salaryRange.min && (
    <div className="mt-2 rounded-lg bg-[#f0f9ff] border border-[#bae6fd] px-3 py-2 text-xs text-[#0369a1]">
        <span className="font-semibold">Market range: </span>
        ${salaryRange.min.toLocaleString()} – ${salaryRange.max!.toLocaleString()} / year
        <span className="ml-2 text-[#7dd3fc]">· median ${salaryRange.median!.toLocaleString()}</span>
        <span className="ml-2 text-[#93c5fd]">(US avg, 2025)</span>
    </div>
)}
```

- [ ] **Step 2: Verify TypeScript builds**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Jobs/Edit.tsx
git commit -m "feat: add salary range card to job edit — debounced fetch on role blur"
```

---

### Task 8: View Count Badge — Backend

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `resources/js/types/index.d.ts`
- Modify: `database/migrations/` — no schema changes needed (uses existing `resume_share_events`)

- [ ] **Step 1: Add `view_count` to `ResumeBuilderController::index()` query**

In `app/Http/Controllers/ResumeBuilderController.php`, find the `index()` method. Add a subquery to select `view_count` alongside each resume.

Locate where `$user->resumes()` is queried in `index()` and add a subquery:
```php
use App\Models\ResumeShareEvent;

$resumes = $user->resumes()
    ->where('is_snapshot', false)
    ->orderByDesc('updated_at')
    ->select([
        'id', 'name', 'pdf_filename', 'updated_at',
    ])
    ->selectSub(
        ResumeShareEvent::selectRaw('COUNT(*)')
            ->whereColumn('resume_id', 'resumes.id')
            ->where('event_type', 'page_view'),
        'view_count'
    )
    ->get();
```

The strength score calculation (if done inline or via a separate query) should remain unchanged.

**Note:** Check how the current `index()` method builds the `ResumeRow` collection — it may add `strength` and `strength_tip` via a `->map()` call. Add `view_count` from the subquery to that map result (or it may already be on the model if using `select + selectSub`).

Read the current `index()` method implementation before editing to ensure `view_count` ends up on the returned row alongside `strength` and `strength_tip`.

- [ ] **Step 2: Add `view_count` to `ResumeRow` TypeScript type**

In `resources/js/types/index.d.ts`, update `ResumeRow`:
```ts
export interface ResumeRow {
    id: number;
    name: string;
    pdf_filename: string | null;
    updated_at: string;
    strength: number;
    strength_tip: string;
    view_count: number;  // add this line
}
```

- [ ] **Step 3: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/ResumeBuilderController.php --format agent
```

- [ ] **Step 4: Run tests to make sure existing tests pass**

```bash
php artisan test tests/Feature/ResumeBuilderTest.php --compact
```

Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php resources/js/types/index.d.ts
git commit -m "feat: add view_count subquery to resume index — from resume_share_events page_view events"
```

---

### Task 9: View Count Badge — Test & Frontend

**Files:**
- Create: `tests/Feature/ViewCountBadgeTest.php`
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`

- [ ] **Step 1: Create test**

```bash
php artisan make:test ViewCountBadgeTest --phpunit --no-interaction
```

Replace content of `tests/Feature/ViewCountBadgeTest.php`:
```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ViewCountBadgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_view_count_zero_when_no_events(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/Index')
                ->where('resumes.0.view_count', 0)
            );
    }

    public function test_view_count_reflects_page_view_events(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create();

        ResumeShareEvent::create(['resume_id' => $resume->id, 'link_id' => $link->id, 'event_type' => 'page_view', 'ip_hash' => 'abc']);
        ResumeShareEvent::create(['resume_id' => $resume->id, 'link_id' => $link->id, 'event_type' => 'page_view', 'ip_hash' => 'def']);
        ResumeShareEvent::create(['resume_id' => $resume->id, 'link_id' => $link->id, 'event_type' => 'pdf_download', 'ip_hash' => 'abc']);

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/Index')
                ->where('resumes.0.view_count', 2)
            );
    }

    public function test_snapshots_excluded_from_index(): void
    {
        $user = User::factory()->create();
        $parent = Resume::factory()->for($user)->create();
        $snapshot = Resume::factory()->for($user)->create(['is_snapshot' => true, 'parent_resume_id' => $parent->id]);

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertInertia(fn ($page) => $page->component('ResumeBuilder/Index')
                ->has('resumes', 1)
            );
    }
}
```

- [ ] **Step 2: Run tests**

```bash
php artisan test tests/Feature/ViewCountBadgeTest.php --compact
```

Expected: 3 tests passing.

- [ ] **Step 3: Add view count badge to Resume Index.tsx**

Read `resources/js/Pages/ResumeBuilder/Index.tsx`.

Find the resume card rendering. Add an eye icon badge showing view count. Import `EyeIcon` from `@heroicons/react/24/outline`.

In the resume card footer/stats area, add:
```tsx
{resume.view_count > 0 && (
    <span className="flex items-center gap-1 text-xs text-[#6b7280]"
          title={`${resume.view_count} public view${resume.view_count !== 1 ? 's' : ''}`}>
        <EyeIcon className="h-3.5 w-3.5" />
        {resume.view_count}
    </span>
)}
```

- [ ] **Step 4: Verify TypeScript builds**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/ViewCountBadgeTest.php resources/js/Pages/ResumeBuilder/Index.tsx
git commit -m "feat: add view count badge to resume index — eye icon shows public page view count"
```

---

### Task 10: Kanban Job Tracker — Components

**Files:**
- Create: `resources/js/Pages/Jobs/KanbanCard.tsx`
- Create: `resources/js/Pages/Jobs/KanbanColumn.tsx`
- Create: `resources/js/Pages/Jobs/KanbanView.tsx`

- [ ] **Step 1: Create KanbanCard component**

Create `resources/js/Pages/Jobs/KanbanCard.tsx`:
```tsx
import type { JobApplicationRow, JobStatus } from '@/types';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@inertiajs/react';

const STATUS_CLASSES: Record<JobStatus, string> = {
    saved:        'bg-[#eef2ff] text-[#4f46e5]',
    applied:      'bg-blue-50 text-blue-700',
    interviewing: 'bg-amber-50 text-amber-700',
    offered:      'bg-emerald-50 text-emerald-700',
    rejected:     'bg-red-50 text-red-600',
    closed:       'bg-[#f5f5fb] text-[#a0a0b0]',
};

type Props = { job: JobApplicationRow };

export default function KanbanCard({ job }: Props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: job.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isOverdue = job.follow_up_at && new Date(job.follow_up_at) < new Date();
    const fmt = (iso: string | null) =>
        iso ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso)) : null;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}
            className="rounded-lg bg-white border border-[#e8e8f0] p-3 shadow-sm cursor-grab active:cursor-grabbing select-none">
            <p className="font-semibold text-sm text-[#23232d] truncate">{job.company}</p>
            <p className="text-xs text-[#6b7280] mt-0.5 truncate">{job.role}</p>
            {job.resume && (
                <p className="text-xs text-[#a0a0b0] mt-1 truncate">📄 {job.resume.name}</p>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap">
                {job.applied_at && (
                    <span className="text-xs text-[#a0a0b0]">{fmt(job.applied_at)}</span>
                )}
                {isOverdue && (
                    <span className="rounded-full bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5">
                        Follow up
                    </span>
                )}
            </div>
            <div className="mt-2">
                <Link href={route('jobs.edit', job.id)}
                    onClick={e => e.stopPropagation()}
                    className="text-xs text-[#4338ca] hover:underline">
                    Edit →
                </Link>
            </div>
        </div>
    );
}
```

- [ ] **Step 2: Create KanbanColumn component**

Create `resources/js/Pages/Jobs/KanbanColumn.tsx`:
```tsx
import type { JobApplicationRow, JobStatus } from '@/types';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import KanbanCard from './KanbanCard';

const COLUMN_COLORS: Record<JobStatus, string> = {
    saved:        'border-t-[#4f46e5]',
    applied:      'border-t-blue-500',
    interviewing: 'border-t-amber-500',
    offered:      'border-t-emerald-500',
    rejected:     'border-t-red-400',
    closed:       'border-t-[#a0a0b0]',
};

type Props = {
    status: JobStatus;
    label: string;
    jobs: JobApplicationRow[];
};

export default function KanbanColumn({ status, label, jobs }: Props) {
    const { setNodeRef, isOver } = useDroppable({ id: status });

    return (
        <div className={`flex flex-col min-w-[260px] max-w-[300px] flex-1 rounded-xl border-t-4 ${COLUMN_COLORS[status]} bg-[#f8f8fc] border border-[#e8e8f0]`}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#e8e8f0]">
                <span className="text-sm font-semibold text-[#23232d] capitalize">{label}</span>
                <span className="rounded-full bg-[#e8e8f0] text-[#6b7280] text-xs px-2 py-0.5 font-medium">
                    {jobs.length}
                </span>
            </div>
            <SortableContext items={jobs.map(j => j.id)} strategy={verticalListSortingStrategy}>
                <div ref={setNodeRef}
                    className={`flex-1 min-h-[120px] p-2 space-y-2 transition-colors ${isOver ? 'bg-[#f0f0ff]' : ''}`}>
                    {jobs.map(job => <KanbanCard key={job.id} job={job} />)}
                </div>
            </SortableContext>
        </div>
    );
}
```

- [ ] **Step 3: Create KanbanView component**

Create `resources/js/Pages/Jobs/KanbanView.tsx`:
```tsx
import type { JobApplicationRow, JobStatus } from '@/types';
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { router } from '@inertiajs/react';
import KanbanColumn from './KanbanColumn';

const STATUSES: { status: JobStatus; label: string }[] = [
    { status: 'saved',        label: 'Saved' },
    { status: 'applied',      label: 'Applied' },
    { status: 'interviewing', label: 'Interviewing' },
    { status: 'offered',      label: 'Offered' },
    { status: 'rejected',     label: 'Rejected' },
    { status: 'closed',       label: 'Closed' },
];

type Props = { jobs: JobApplicationRow[] };

export default function KanbanView({ jobs }: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const newStatus = over.id as JobStatus;
        const job = jobs.find(j => j.id === active.id);
        if (!job || job.status === newStatus) return;

        router.patch(route('jobs.update', active.id), { status: newStatus }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const jobsByStatus = (status: JobStatus) => jobs.filter(j => j.status === status);

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-4">
                {STATUSES.map(({ status, label }) => (
                    <KanbanColumn
                        key={status}
                        status={status}
                        label={label}
                        jobs={jobsByStatus(status)}
                    />
                ))}
            </div>
        </DndContext>
    );
}
```

- [ ] **Step 4: Verify TypeScript builds**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Jobs/KanbanCard.tsx resources/js/Pages/Jobs/KanbanColumn.tsx resources/js/Pages/Jobs/KanbanView.tsx
git commit -m "feat: add KanbanCard, KanbanColumn, KanbanView components using @dnd-kit"
```

---

### Task 11: Kanban — Wire into Jobs/Index.tsx + Feature Test

**Files:**
- Modify: `resources/js/Pages/Jobs/Index.tsx`
- Create: `tests/Feature/KanbanJobTrackerTest.php`

- [ ] **Step 1: Add view toggle to Jobs/Index.tsx**

Read current `resources/js/Pages/Jobs/Index.tsx`.

Add the following to the component:

```tsx
import KanbanView from './KanbanView';

// State for view (default kanban):
const [view, setView] = useState<'table' | 'kanban'>(() => {
    if (typeof window === 'undefined') return 'kanban';
    return (localStorage.getItem('resumegen_jobs_view') as 'table' | 'kanban') ?? 'kanban';
});

const switchView = (v: 'table' | 'kanban') => {
    setView(v);
    localStorage.setItem('resumegen_jobs_view', v);
};
```

In the page header area (where search and other controls sit), add the toggle buttons:
```tsx
<div className="flex rounded-lg border border-[#e8e8f0] overflow-hidden">
    <button type="button" onClick={() => switchView('kanban')}
        className={`px-3 py-1.5 text-xs font-medium transition ${view === 'kanban' ? 'bg-[#4338ca] text-white' : 'bg-white text-[#6b7280] hover:bg-[#f5f5fb]'}`}>
        Kanban
    </button>
    <button type="button" onClick={() => switchView('table')}
        className={`px-3 py-1.5 text-xs font-medium transition ${view === 'table' ? 'bg-[#4338ca] text-white' : 'bg-white text-[#6b7280] hover:bg-[#f5f5fb]'}`}>
        Table
    </button>
</div>
```

In the body of the page (where the table currently renders), add the conditional:
```tsx
{view === 'kanban' ? (
    <KanbanView jobs={applications} />
) : (
    /* existing table JSX */
)}
```

On mobile (add this CSS wrapper around the KanbanView):
```tsx
{view === 'kanban' ? (
    <div className="hidden sm:block">
        <KanbanView jobs={applications} />
    </div>
) : null}
{view === 'kanban' ? (
    <div className="sm:hidden">
        {/* Mobile fallback: grouped list */}
        {(['saved','applied','interviewing','offered','rejected','closed'] as JobStatus[]).map(status => {
            const groupJobs = applications.filter(a => a.status === status);
            if (groupJobs.length === 0) return null;
            return (
                <div key={status} className="mb-4">
                    <h3 className="text-xs font-semibold uppercase text-[#a0a0b0] mb-2 capitalize">{status}</h3>
                    <div className="space-y-2">
                        {groupJobs.map(j => (
                            <div key={j.id} className="rounded-lg bg-white border border-[#e8e8f0] p-3">
                                <p className="font-semibold text-sm">{j.company}</p>
                                <p className="text-xs text-[#6b7280]">{j.role}</p>
                                <Link href={route('jobs.edit', j.id)} className="text-xs text-[#4338ca] hover:underline">Edit →</Link>
                            </div>
                        ))}
                    </div>
                </div>
            );
        })}
    </div>
) : null}
```

- [ ] **Step 2: Create KanbanJobTrackerTest**

```bash
php artisan make:test KanbanJobTrackerTest --phpunit --no-interaction
```

Replace content of `tests/Feature/KanbanJobTrackerTest.php`:
```php
<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KanbanJobTrackerTest extends TestCase
{
    use RefreshDatabase;

    public function test_jobs_index_loads_with_applications(): void
    {
        $user = User::factory()->create();
        JobApplication::factory()->for($user)->create(['company' => 'Acme', 'status' => 'applied']);
        JobApplication::factory()->for($user)->create(['company' => 'Globex', 'status' => 'interviewing']);

        $this->actingAs($user)
            ->get(route('jobs.index'))
            ->assertInertia(fn ($page) => $page->component('Jobs/Index')
                ->has('applications', 2)
                ->where('applications.0.company', 'Globex')
            );
    }

    public function test_drag_status_update_persists(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->patch(route('jobs.update', $job), ['status' => 'applied'])
            ->assertRedirect();

        $this->assertDatabaseHas('job_applications', ['id' => $job->id, 'status' => 'applied']);
    }

    public function test_invalid_status_rejected(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create(['status' => 'saved']);

        $this->actingAs($user)
            ->patch(route('jobs.update', $job), ['status' => 'not_a_real_status'])
            ->assertSessionHasErrors('status');
    }

    public function test_other_user_cannot_update_status(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $job = JobApplication::factory()->for($owner)->create(['status' => 'saved']);

        $this->actingAs($other)
            ->patch(route('jobs.update', $job), ['status' => 'applied'])
            ->assertForbidden();
    }
}
```

- [ ] **Step 3: Run tests**

```bash
php artisan test tests/Feature/KanbanJobTrackerTest.php --compact
```

Expected: 4 tests passing.

- [ ] **Step 4: Run all tests**

```bash
php artisan test --compact
```

Expected: all tests passing.

- [ ] **Step 5: Verify TypeScript builds**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Jobs/Index.tsx tests/Feature/KanbanJobTrackerTest.php
git commit -m "feat: add Kanban view toggle to Jobs/Index — drag-and-drop with mobile grouped list fallback"
```

---

### Task 12: Final Verification

**Files:** None (read-only)

- [ ] **Step 1: Run full test suite**

```bash
php artisan test --compact
```

Expected: all tests passing (394+).

- [ ] **Step 2: TypeScript build**

```bash
npm run build
```

Expected: zero TypeScript errors, build succeeds.

- [ ] **Step 3: Pint check**

```bash
./vendor/bin/pint --dirty --format agent
```

Expected: no changes needed (already run after each task).

- [ ] **Step 4: Summarize git log**

```bash
git log --oneline -12
```

Expected: 10 new Batch 2 commits.

- [ ] **Step 5: Report DONE**

Report status: DONE

List all 10 commits with their SHA and message.

---

## Summary

| Task | Feature | Tests |
|------|---------|-------|
| 1 | Interview Notes migration + model | — |
| 2 | InterviewNoteController + routes | — |
| 3 | InterviewNoteTest | 6 tests |
| 4 | Interview notes UI in Jobs/Edit.tsx | — |
| 5 | Salary data + SalaryController | — |
| 6 | SalaryIntelligenceTest | 5 tests |
| 7 | Salary card UI in Jobs/Edit.tsx | — |
| 8 | View count subquery in ResumeBuilderController | — |
| 9 | ViewCountBadgeTest + badge on Index.tsx | 3 tests |
| 10 | KanbanCard + KanbanColumn + KanbanView components | — |
| 11 | Kanban wired into Jobs/Index.tsx + KanbanJobTrackerTest | 4 tests |
| 12 | Final verification | all |
