# Resume Job Tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users tag a tailored resume copy to a specific job application so both sides of the tracker show the link.

**Architecture:** Add a nullable `job_application_id` FK to `resumes`. The dashboard shows a "Linked to [Role @ Company]" badge on tailored copies with a dropdown to change it. A new `PATCH /builder/{resume}/link-job` endpoint updates the field. The job application edit page already has a resume picker via `resume_id` on `job_applications`; this feature adds the reverse direction (resume → job).

**Tech Stack:** Laravel 13, Inertia v2, React 18, TypeScript, SQLite.

---

## Codebase context

- Resume model: `app/Models/Resume.php`. Fillable includes `master_resume_id`, `is_master`, etc.
- JobApplication model: `app/Models/JobApplication.php`. Has `resume_id` FK (job→resume direction already exists).
- Dashboard controller: `app/Http/Controllers/ResumeBuilderController.php` — `index()` maps resumes to `ResumeRow` objects.
- Dashboard page: `resources/js/Pages/ResumeBuilder/Index.tsx`. Renders resume cards in a grid.
- Types: `resources/js/types/index.d.ts` — `ResumeRow` interface at line ~146.
- Routes: `routes/web.php` — resume routes under `auth` middleware group.
- Policy: `app/Policies/ResumePolicy.php` — `update()` checks `$user->id === $resume->user_id`.
- Tests: `tests/Feature/` — follow `ResumeBuilderTest.php` for patterns.

---

## File Map

### New Files
- `database/migrations/2026_06_08_220000_add_job_application_id_to_resumes_table.php`
- `tests/Feature/ResumeJobTaggingTest.php`

### Modified Files
- `app/Models/Resume.php` — add `job_application_id` to fillable, add `linkedJob()` relationship
- `app/Models/JobApplication.php` — add `taggedResumes()` hasMany relationship
- `app/Http/Controllers/ResumeBuilderController.php` — `index()` includes linked job; new `linkJob()` action
- `routes/web.php` — add `PATCH /builder/{resume}/link-job`
- `resources/js/types/index.d.ts` — add `job_application_id`, `linked_job` to `ResumeRow`
- `resources/js/Pages/ResumeBuilder/Index.tsx` — show linked job badge + inline dropdown on tailored copy cards

---

## Task 1: Migration + Model Updates

**Files:**
- Create: `database/migrations/2026_06_08_220000_add_job_application_id_to_resumes_table.php`
- Modify: `app/Models/Resume.php`
- Modify: `app/Models/JobApplication.php`

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/ResumeJobTaggingTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeJobTaggingTest extends TestCase
{
    use RefreshDatabase;

    public function test_resume_can_be_linked_to_job_application(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $job = JobApplication::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('builder.link-job', $resume), ['job_application_id' => $job->id])
            ->assertRedirect();

        $this->assertEquals($job->id, $resume->fresh()->job_application_id);
    }

    public function test_resume_can_be_unlinked_from_job(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create();
        $resume = Resume::factory()->for($user)->create(['job_application_id' => $job->id]);

        $this->actingAs($user)
            ->patch(route('builder.link-job', $resume), ['job_application_id' => null])
            ->assertRedirect();

        $this->assertNull($resume->fresh()->job_application_id);
    }

    public function test_cannot_link_resume_to_another_users_job(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $otherJob = JobApplication::factory()->for($other)->create();

        $this->actingAs($user)
            ->patch(route('builder.link-job', $resume), ['job_application_id' => $otherJob->id])
            ->assertStatus(403);
    }

    public function test_dashboard_includes_linked_job_for_resumes(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create(['role' => 'SWE', 'company' => 'Google']);
        Resume::factory()->for($user)->create(['job_application_id' => $job->id]);

        $response = $this->actingAs($user)->get(route('builder.index'));

        $response->assertInertia(fn ($page) => $page
            ->component('ResumeBuilder/Index')
            ->where('resumes.0.linked_job.role', 'SWE')
            ->where('resumes.0.linked_job.company', 'Google')
        );
    }

    public function test_unauthenticated_cannot_link_job(): void
    {
        $resume = Resume::factory()->create();

        $this->patch(route('builder.link-job', $resume), ['job_application_id' => null])
            ->assertRedirect(route('login'));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
php artisan test --compact tests/Feature/ResumeJobTaggingTest.php
```

Expected: FAIL (route not found, column not found)

- [ ] **Step 3: Create the migration**

```bash
php artisan make:migration add_job_application_id_to_resumes_table --no-interaction
```

Edit the generated file:

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
            $table->foreignId('job_application_id')
                ->nullable()
                ->after('master_synced_at')
                ->constrained('job_applications')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\JobApplication::class);
        });
    }
};
```

- [ ] **Step 4: Run migration**

```bash
php artisan migrate
```

- [ ] **Step 5: Update Resume model**

In `app/Models/Resume.php`, add `job_application_id` to `$fillable`:

```php
protected $fillable = [
    // ... existing fields ...
    'master_resume_id',
    'master_synced_at',
    'is_master',
    'job_application_id',  // ADD THIS
];
```

Add relationship method after the `masterResume()` method:

```php
public function linkedJob(): BelongsTo
{
    return $this->belongsTo(JobApplication::class, 'job_application_id');
}
```

Add the import at the top if not already present:
```php
use App\Models\JobApplication;
```

- [ ] **Step 6: Update JobApplication model**

In `app/Models/JobApplication.php`, add after existing relationships:

```php
public function taggedResumes(): HasMany
{
    return $this->hasMany(Resume::class, 'job_application_id');
}
```

Add import if not present:
```php
use Illuminate\Database\Eloquent\Relations\HasMany;
```

- [ ] **Step 7: Commit**

```bash
git add database/migrations/2026_06_08_220000_add_job_application_id_to_resumes_table.php app/Models/Resume.php app/Models/JobApplication.php tests/Feature/ResumeJobTaggingTest.php
git commit -m "feat: add job_application_id to resumes for job tagging"
```

---

## Task 2: Controller + Route

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Add `linkJob()` to ResumeBuilderController**

In `app/Http/Controllers/ResumeBuilderController.php`, add this method after `setMaster()`:

```php
public function linkJob(Request $request, Resume $resume): RedirectResponse
{
    $this->authorize('update', $resume);

    $validated = $request->validate([
        'job_application_id' => ['nullable', 'integer'],
    ]);

    if ($validated['job_application_id'] !== null) {
        $owns = $request->user()
            ->jobApplications()
            ->whereKey($validated['job_application_id'])
            ->exists();
        abort_if(! $owns, 403);
    }

    $resume->update(['job_application_id' => $validated['job_application_id']]);

    return back();
}
```

Make sure `RedirectResponse` is imported (it should already be):
```php
use Illuminate\Http\RedirectResponse;
```

- [ ] **Step 2: Update `index()` to include linked job**

In `ResumeBuilderController::index()`, the `$resumeCollection->map(...)` block builds each row. Add `linked_job` to the mapped array after `master_synced_at`:

First, eager-load `linkedJob` in the query. Find the line that fetches resumes (currently `->where('is_snapshot', false)->orderBy(...)`) and add:

```php
->with('linkedJob:id,role,company')
```

Then inside the `map()` closure, add to the returned array:

```php
'job_application_id' => $resume->job_application_id,
'linked_job' => $resume->linkedJob
    ? ['id' => $resume->linkedJob->id, 'role' => $resume->linkedJob->role, 'company' => $resume->linkedJob->company]
    : null,
```

- [ ] **Step 3: Add route**

In `routes/web.php`, inside the auth group alongside other builder routes (near `builder.set-master`):

```php
Route::patch('/builder/{resume}/link-job', [ResumeBuilderController::class, 'linkJob'])->name('builder.link-job');
```

- [ ] **Step 4: Run tests**

```bash
php artisan test --compact tests/Feature/ResumeJobTaggingTest.php
```

Expected: PASS all 5 tests

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php routes/web.php
git commit -m "feat: link-job endpoint + eager-load linked_job in dashboard"
```

---

## Task 3: Frontend Types + Dashboard UI

**Files:**
- Modify: `resources/js/types/index.d.ts`
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`

- [ ] **Step 1: Update ResumeRow type**

In `resources/js/types/index.d.ts`, find `interface ResumeRow` and add after `has_active_share_link`:

```typescript
job_application_id: number | null;
linked_job: { id: number; role: string; company: string } | null;
```

- [ ] **Step 2: Add job applications prop to Index page**

The dashboard needs the user's job applications for the link dropdown. In `resources/js/Pages/ResumeBuilder/Index.tsx`, add `JobApplicationOpt` type and update the `Props` type:

```typescript
type JobApplicationOpt = { id: number; role: string; company: string };

type Props = {
    resumes: ResumeRow[];
    resumeLimit: number | null;
    // ... existing props ...
    jobApplications: JobApplicationOpt[];
};
```

Update the function signature to destructure `jobApplications`:

```typescript
export default function Index({ resumes, resumeLimit, /* ...existing... */ jobApplications }: Props) {
```

- [ ] **Step 3: Update controller to pass jobApplications**

In `ResumeBuilderController::index()`, add to the Inertia render props:

```php
'jobApplications' => $user->jobApplications()
    ->orderByDesc('updated_at')
    ->get(['id', 'role', 'company']),
```

Make sure `JobApplication` model is imported (add if not present):
```php
use App\Models\JobApplication;
```

- [ ] **Step 4: Add linked job badge and dropdown to resume cards**

In `resources/js/Pages/ResumeBuilder/Index.tsx`, find the resume card section that shows the master badge (`r.is_master && ...`) and add linked job display below it.

Find a good place in the card footer (near the existing badges). Add:

```tsx
{/* Linked job badge + picker for tailored copies */}
{r.master_resume_id !== null && (
    <div className="mt-1.5 flex items-center gap-1.5">
        <select
            value={r.job_application_id ?? ''}
            onChange={e => {
                const val = e.target.value === '' ? null : Number(e.target.value);
                router.patch(route('builder.link-job', r.id), { job_application_id: val }, { preserveScroll: true });
            }}
            className="max-w-[180px] truncate rounded border border-[#eeeef5] bg-white px-2 py-0.5 text-xs text-[#71717a] hover:border-[#4f46e5] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
            title="Link this copy to a job application"
        >
            <option value="">Link to job…</option>
            {jobApplications.map(j => (
                <option key={j.id} value={j.id}>{j.role} @ {j.company}</option>
            ))}
        </select>
        {r.linked_job && (
            <span className="text-xs text-[#4f46e5]">✓</span>
        )}
    </div>
)}
```

- [ ] **Step 5: Run all tests**

```bash
php artisan test --compact tests/Feature/ResumeJobTaggingTest.php
```

Expected: PASS

- [ ] **Step 6: Build frontend and run full suite**

```bash
npm run build
php artisan test --compact
```

Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add resources/js/types/index.d.ts resources/js/Pages/ResumeBuilder/Index.tsx app/Http/Controllers/ResumeBuilderController.php
git commit -m "feat: resume job tagging — link tailored copies to job applications"
```
