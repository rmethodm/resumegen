# Apply Flow Part 1 (Add job, tailored version, cross-links, Next up, wizard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make "Add job" a first-class entry point that creates a Kanban card plus a tailored sibling resume version from a user-picked base, links the two in both directions, surfaces "Next up" work and a first-week checklist on the Dashboard, and adds a skippable apply wizard.

**Architecture:** One action class, `App\Actions\CreateJobApplication`, owns the create-card-plus-tailored-version transaction and is called from both the web controller and the extension API. Everything else is presentation over existing tables (`job_applications.resume_id` already exists, `nullOnDelete`). Two new user columns hold the wizard preference and checklist dismissal. No AI in this plan; Part 2 (`2026-09-15-apply-flow-part2-ai-suggestions.md`) adds the `tailor_with_ai` checkbox, `resume_ai_suggestions`, and the prompt library on top of this.

**Tech Stack:** Laravel 13 / PHP 8.5, Inertia v3, React 19 + TypeScript, Tailwind v4, Pest-style PHPUnit feature tests on SQLite, Vitest, Pint.

**Spec:** `docs/superpowers/specs/2026-09-15-apply-flow-design.md` (Sections 1, 2 minus AI, 4, 5 minus AI).

## Global Constraints

- Ownership checks are inline `abort_unless($model->user_id === $request->user()->id, 404)`. No policies.
- `job_description` validation is `['nullable', 'string', 'max:10000']` (matches `App\Data\ResumeRules` for `target_job_description`).
- Tailored version title format is exactly `"{Company} – {Role}"` (en dash, U+2013, spaces around it).
- Sidebar nav items are unchanged: Dashboard, Resumes, Shares, Applications, Profile.
- Run `./vendor/bin/pint --dirty` before every commit that touches PHP. Run `npm run build` (tsc + vite) before every commit that touches TS.
- Migrations are forward-only. Never run `migrate:rollback`. Use `php artisan migrate` locally; tests use in-memory SQLite via `RefreshDatabase`.
- After editing files call `graph_register_edit(files: [...])`.
- Do not touch Shares pages, Stats page, onboarding wizard, mobile API.

---

## File map

| Path | Responsibility |
|---|---|
| `database/migrations/2026_09_15_100000_add_apply_flow_columns_to_users_table.php` | `prefers_apply_wizard`, `dismissed_checklist_at` |
| `app/Models/User.php` | fillable + casts for the two columns |
| `app/Actions/CreateJobApplication.php` | create card, log status event, optionally duplicate base resume into tailored version and link it |
| `app/Http/Requests/StoreJobApplicationRequest.php` | add `base_resume_id`, `job_description` |
| `app/Http/Controllers/JobApplicationController.php` | `store` delegates to the action; `index` adds resume scores |
| `app/Http/Controllers/Api/ExtensionController.php` | `jobApplicationStore` delegates to the action |
| `app/Http/Controllers/ResumeController.php` | Workstation `render` adds `application` prop |
| `app/Http/Controllers/ResumeCompareController.php` | version rows carry linked application status |
| `app/Http/Controllers/DashboardController.php` | `nextUp` and `checklist` props |
| `app/Http/Controllers/UserPreferenceController.php` | `dismissChecklist`, `setApplyWizardPreference` |
| `app/Http/Controllers/ApplyWizardController.php` | `GET /apply/new` |
| `routes/web.php` | three new routes |
| `resources/js/Components/jobs/add-job-modal.tsx` | shared Add-job form used by Dashboard and Kanban create |
| `resources/js/Pages/Jobs/Kanban.tsx` | use AddJobModal for create; card "Open resume"; highlight |
| `resources/js/Components/workstation/application-chip.tsx` | linked-application chip with status select |
| `resources/js/Components/workstation/workstation-header.tsx` | render the chip |
| `resources/js/Pages/Resumes/Workstation.tsx` | pass `application` prop through |
| `resources/js/Components/dashboard/next-up-strip.tsx` | Next up list |
| `resources/js/Components/dashboard/first-week-checklist.tsx` | checklist |
| `resources/js/lib/checklist-steps.ts` | pure step computation (unit-tested) |
| `resources/js/Pages/Dashboard.tsx` | second CTA, strip, checklist |
| `resources/js/Pages/Apply/Wizard.tsx` | 4-step wizard |
| `resources/js/Pages/Profile/Partials/ApplyWizardPreferenceForm.tsx` | toggle |
| `resources/js/Pages/Resumes/Compare.tsx` | status label per version |
| `resources/js/types/index.d.ts` | new types |
| `tests/Feature/CreateJobApplicationTest.php` | action + web store |
| `tests/Feature/Api/ExtensionApiTest.php` | extension fields |
| `tests/Feature/WorkstationApplicationLinkTest.php` | Workstation prop, Compare prop |
| `tests/Feature/DashboardNextUpTest.php` | next up + checklist |
| `tests/Feature/ApplyWizardTest.php` | wizard + preference |
| `resources/js/lib/checklist-steps.test.ts` | vitest |

---

### Task 1: User columns for wizard preference and checklist dismissal

**Files:**
- Create: `database/migrations/2026_09_15_100000_add_apply_flow_columns_to_users_table.php`
- Modify: `app/Models/User.php:20` (Fillable attribute) and `:70-89` (casts)
- Test: `tests/Feature/ApplyWizardTest.php` (created here, extended in Task 9)

**Interfaces:**
- Produces: `users.prefers_apply_wizard` (bool, default true), `users.dismissed_checklist_at` (nullable timestamp). Both mass-assignable.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/ApplyWizardTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplyWizardTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_prefer_the_wizard_and_have_not_dismissed_the_checklist(): void
    {
        $user = User::factory()->create();

        $this->assertTrue($user->fresh()->prefers_apply_wizard);
        $this->assertNull($user->fresh()->dismissed_checklist_at);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/ApplyWizardTest.php`
Expected: FAIL. `prefers_apply_wizard` is null because the column does not exist (assertTrue fails).

- [ ] **Step 3: Write the migration**

Create `database/migrations/2026_09_15_100000_add_apply_flow_columns_to_users_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('prefers_apply_wizard')->default(true);
            $table->timestamp('dismissed_checklist_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['prefers_apply_wizard', 'dismissed_checklist_at']);
        });
    }
};
```

- [ ] **Step 4: Add fillable and casts on User**

In `app/Models/User.php`, change the `#[Fillable([...])]` attribute to append two names:

```php
#[Fillable(['name', 'email', 'password', 'has_completed_onboarding', 'profile', 'stale_nudge_sent_at', 'view_nudge_sent_at', 'preferred_template', 'target_role', 'industry', 'years_experience', 'registration_ip', 'oauth_provider', 'oauth_provider_id', 'prefers_apply_wizard', 'dismissed_checklist_at'])]
```

In `casts()` add two entries after `'ai_starter_credits_granted_at' => 'datetime',`:

```php
            'prefers_apply_wizard' => 'boolean',
            'dismissed_checklist_at' => 'datetime',
```

- [ ] **Step 5: Run test to verify it passes**

Run: `php artisan test tests/Feature/ApplyWizardTest.php`
Expected: PASS.

- [ ] **Step 6: Run the migration locally and commit**

```bash
php artisan migrate
./vendor/bin/pint --dirty
git add database/migrations/2026_09_15_100000_add_apply_flow_columns_to_users_table.php app/Models/User.php tests/Feature/ApplyWizardTest.php
git commit -m "Add apply-wizard preference and checklist dismissal columns to users"
```

---

### Task 2: `CreateJobApplication` action and web store

**Files:**
- Create: `app/Actions/CreateJobApplication.php`
- Modify: `app/Http/Requests/StoreJobApplicationRequest.php:27-36`
- Modify: `app/Http/Controllers/JobApplicationController.php:33-50` (`store`)
- Test: `tests/Feature/CreateJobApplicationTest.php`

**Interfaces:**
- Produces: `App\Actions\CreateJobApplication::handle(User $user, array $data): JobApplication`. `$data` is the validated request array and may contain `base_resume_id` (int|null) and `job_description` (string|null). Returns the created application with `resume_id` set when a base was given. The tailored version is reachable as `$application->resume`.
- Consumes: `App\Support\ResumeDocument::toArray()` / `::save()` (existing), `job_application_status_events` table (existing).

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/CreateJobApplicationTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Experience;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CreateJobApplicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_store_without_base_resume_creates_only_the_card(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'Product Manager',
        ])->assertRedirect(route('job-applications.index'));

        $application = $user->jobApplications()->sole();
        $this->assertNull($application->resume_id);
        $this->assertSame(0, $user->resumes()->count());
    }

    public function test_store_with_base_resume_creates_a_tailored_sibling_version_and_links_it(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create(['title' => 'PM base', 'summary' => 'Ships things.']);
        Experience::factory()->for($base)->create(['title' => 'PM', 'company' => 'Old Co']);

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'Product Manager',
            'base_resume_id' => $base->id,
            'job_description' => 'Own roadmap. SQL. Figma.',
        ])->assertRedirectContains('/resumes/');

        $application = $user->jobApplications()->sole();
        $version = $application->resume;

        $this->assertNotNull($version);
        $this->assertNotSame($base->id, $version->id);
        $this->assertSame($base->group_id, $version->group_id);
        $this->assertSame('Linear – Product Manager', $version->title);
        $this->assertSame('Linear', $version->target_company);
        $this->assertSame('Product Manager', $version->target_role);
        $this->assertSame('Own roadmap. SQL. Figma.', $version->target_job_description);
        $this->assertSame('Ships things.', $version->summary);
        $this->assertSame(1, $version->experiences()->count());
        // Base is untouched.
        $this->assertNull($base->fresh()->target_job_description);
        $this->assertSame(2, $user->resumes()->count());
    }

    public function test_store_redirects_to_the_new_versions_workstation(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create();

        $response = $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'PM',
            'base_resume_id' => $base->id,
        ]);

        $version = $user->jobApplications()->sole()->resume;
        $response->assertRedirect(route('resumes.workstation', $version));
    }

    public function test_store_rejects_a_base_resume_owned_by_someone_else(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $foreign = Resume::factory()->for($other)->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'PM',
            'base_resume_id' => $foreign->id,
        ])->assertSessionHasErrors('base_resume_id');

        $this->assertSame(0, $user->jobApplications()->count());
    }

    public function test_store_rejects_job_description_over_ten_thousand_characters(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'PM',
            'job_description' => str_repeat('x', 10001),
        ])->assertSessionHasErrors('job_description');
    }

    public function test_store_logs_one_status_event_even_with_a_tailored_version(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create();

        $this->actingAs($user)->post(route('job-applications.store'), [
            'company' => 'Linear',
            'role' => 'PM',
            'base_resume_id' => $base->id,
        ]);

        $this->assertDatabaseCount('job_application_status_events', 1);
        $this->assertDatabaseHas('job_application_status_events', ['from_status' => null, 'to_status' => 'saved']);
    }
}
```

If `Experience::factory()` does not exist, replace that line with `$base->experiences()->create(['title' => 'PM', 'company' => 'Old Co', 'position' => 0]);` and drop the `use App\Models\Experience;` import.

- [ ] **Step 2: Run tests to verify they fail**

Run: `php artisan test tests/Feature/CreateJobApplicationTest.php`
Expected: the first test fails on `assertRedirect(route('job-applications.index'))` because `store` returns `back()`; the tailored-version tests fail because `resume_id` stays null and `base_resume_id` is not validated.

- [ ] **Step 3: Extend the form request**

In `app/Http/Requests/StoreJobApplicationRequest.php` replace `rules()` with:

```php
    public function rules(): array
    {
        return [
            'company' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'resume_id' => ['nullable', 'integer', Rule::exists('resumes', 'id')->where('user_id', $this->user()?->id)],
            'base_resume_id' => ['nullable', 'integer', Rule::exists('resumes', 'id')->where('user_id', $this->user()?->id)],
            'job_description' => ['nullable', 'string', 'max:10000'],
            'job_url' => ['nullable', 'string', 'max:500'],
            'status' => ['sometimes', 'string', Rule::in(self::STATUSES)],
            'applied_at' => ['nullable', 'date'],
            'follow_up_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ];
    }
```

- [ ] **Step 4: Write the action**

Create `app/Actions/CreateJobApplication.php`:

```php
<?php

namespace App\Actions;

use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use App\Support\ResumeDocument;
use Illuminate\Support\Facades\DB;

/**
 * Create a Kanban card and, when a base resume is given, a tailored
 * sibling version of it (same ResumeGroup) carrying the job's company,
 * role, and description. The base is never modified. Both the web
 * controller and the extension API call this so the two paths cannot
 * drift.
 */
class CreateJobApplication
{
    /**
     * @param  array<string, mixed>  $data  Validated StoreJobApplicationRequest data.
     */
    public function handle(User $user, array $data): JobApplication
    {
        $baseResumeId = $data['base_resume_id'] ?? null;
        $jobDescription = $data['job_description'] ?? null;
        unset($data['base_resume_id'], $data['job_description']);

        $status = $data['status'] ?? 'saved';

        return DB::transaction(function () use ($user, $data, $status, $baseResumeId, $jobDescription): JobApplication {
            $application = $user->jobApplications()->create([
                ...$data,
                'status' => $status,
            ]);

            DB::table('job_application_status_events')->insert([
                'job_application_id' => $application->id,
                'from_status' => null,
                'to_status' => $status,
                'created_at' => now(),
            ]);

            if ($baseResumeId !== null) {
                /** @var Resume $base */
                $base = $user->resumes()->findOrFail($baseResumeId);
                $version = $this->tailoredVersion($user, $base, $application, $jobDescription);
                $application->update(['resume_id' => $version->id]);
            }

            return $application;
        });
    }

    private function tailoredVersion(User $user, Resume $base, JobApplication $application, ?string $jobDescription): Resume
    {
        $document = ResumeDocument::toArray($base);
        $document['title'] = "{$application->company} – {$application->role}";
        $document['target_company'] = $application->company;
        $document['target_role'] = $application->role;
        $document['target_job_description'] = $jobDescription ?? '';

        $version = $user->resumes()->create([
            'title' => $document['title'],
            'group_id' => $base->group_id,
        ]);

        ResumeDocument::save($version, $document);

        return $version;
    }
}
```

Check `App\Support\ResumeDocument::save()` writes `target_company`, `target_role`, and `target_job_description` from the document array. Open `app/Support/ResumeDocument.php` and confirm those three keys are in its scalar column list. If any is missing, add it to that list in the same commit (it is the document schema and the Workstation already saves these fields through `resumes.update`, so they belong there).

- [ ] **Step 5: Delegate the web controller**

In `app/Http/Controllers/JobApplicationController.php` add `use App\Actions\CreateJobApplication;` and replace `store()` with:

```php
    public function store(StoreJobApplicationRequest $request, CreateJobApplication $createJobApplication): RedirectResponse
    {
        $application = $createJobApplication->handle($request->user(), $request->validated());

        if (isset($request->validated()['base_resume_id'])) {
            return to_route('resumes.workstation', $application->resume_id);
        }

        return to_route('job-applications.index');
    }
```

Remove the now-unused `use Illuminate\Support\Facades\DB;` import only if `update()` no longer uses it. It still does (status events on update), so leave it.

- [ ] **Step 6: Run tests to verify they pass**

Run: `php artisan test tests/Feature/CreateJobApplicationTest.php tests/Feature/JobApplicationsTest.php tests/Feature/JobApplicationStatusEventsTest.php`
Expected: all PASS. If `JobApplicationsTest::test_store_creates_an_application_with_default_status` fails on `assertRedirect()`, it should still pass since `to_route` is a redirect; if an existing test asserts `assertRedirect(route('job-applications.index'))` versus `back()`, the new behavior is the intended one.

- [ ] **Step 7: Commit**

```bash
./vendor/bin/pint --dirty
git add app/Actions/CreateJobApplication.php app/Http/Requests/StoreJobApplicationRequest.php app/Http/Controllers/JobApplicationController.php app/Support/ResumeDocument.php tests/Feature/CreateJobApplicationTest.php
git commit -m "Add CreateJobApplication action: card plus tailored sibling version from a base resume"
```

---

### Task 3: Extension endpoint uses the action

**Files:**
- Modify: `app/Http/Controllers/Api/ExtensionController.php:188-213`
- Test: `tests/Feature/Api/ExtensionApiTest.php` (append)

**Interfaces:**
- Consumes: `CreateJobApplication::handle`.
- Produces: JSON `{ id, company, role, status, resume_id }` with 201.

- [ ] **Step 1: Write the failing test**

Append to `tests/Feature/Api/ExtensionApiTest.php` inside the class:

```php
    public function test_job_application_store_with_base_resume_creates_tailored_version(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create(['title' => 'Base']);
        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $response = $this->withToken($token)
            ->postJson('/api/extension/job-applications', [
                'company' => 'Acme Corp',
                'role' => 'Senior Engineer',
                'base_resume_id' => $base->id,
                'job_description' => 'Go and Kubernetes.',
            ])
            ->assertCreated();

        $versionId = $response->json('resume_id');
        $this->assertNotNull($versionId);
        $this->assertNotSame($base->id, $versionId);
        $this->assertDatabaseHas('resumes', [
            'id' => $versionId,
            'group_id' => $base->group_id,
            'title' => 'Acme Corp – Senior Engineer',
            'target_job_description' => 'Go and Kubernetes.',
        ]);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=test_job_application_store_with_base_resume_creates_tailored_version`
Expected: FAIL, `resume_id` is null (key missing from response).

- [ ] **Step 3: Delegate**

In `app/Http/Controllers/Api/ExtensionController.php` add `use App\Actions\CreateJobApplication;` and replace `jobApplicationStore()` with:

```php
    public function jobApplicationStore(StoreJobApplicationRequest $request, CreateJobApplication $createJobApplication): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $jobApplication = $createJobApplication->handle($request->user(), $request->validated());

        return response()->json([
            'id' => $jobApplication->id,
            'company' => $jobApplication->company,
            'role' => $jobApplication->role,
            'status' => $jobApplication->status,
            'resume_id' => $jobApplication->resume_id,
        ], 201);
    }
```

If `DB` is no longer used anywhere else in this controller, remove its import.

- [ ] **Step 4: Run tests to verify they pass**

Run: `php artisan test tests/Feature/Api/ExtensionApiTest.php`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
./vendor/bin/pint --dirty
git add app/Http/Controllers/Api/ExtensionController.php tests/Feature/Api/ExtensionApiTest.php
git commit -m "Extension job-application store creates tailored version via CreateJobApplication"
```

---

### Task 4: Shared AddJobModal, Kanban create uses it, card "Open resume", highlight

**Files:**
- Create: `resources/js/Components/jobs/add-job-modal.tsx`
- Modify: `resources/js/Pages/Jobs/Kanban.tsx` (create path, `JobCard`, highlight)
- Modify: `app/Http/Controllers/JobApplicationController.php:22-31` (`index` adds `score` to resumes)
- Modify: `resources/js/types/index.d.ts` (add `ResumeOption`)

**Interfaces:**
- Produces: `AddJobModal({ open, onClose, resumes, initial? })` where `resumes: ResumeOption[]` and `ResumeOption = { id: number; title: string; score: number }`. Posts to `route('job-applications.store')`.
- Kanban `index` prop `resumes` becomes `ResumeOption[]` with `score`.

- [ ] **Step 1: Add score to the Kanban resumes payload**

In `JobApplicationController::index` replace the two `resumes` lines with:

```php
        $resumes = $request->user()->resumes()
            ->with(['experiences', 'skills'])
            ->latest('updated_at')
            ->get();

        return Inertia::render('Jobs/Kanban', [
            'applications' => $applications->map(fn (JobApplication $job) => $this->present($job))->all(),
            'resumes' => $resumes->map(fn (Resume $resume) => [
                'id' => $resume->id,
                'title' => $resume->title,
                'score' => ResumeAnalysis::score($resume),
            ])->all(),
        ]);
```

Add `use App\Models\Resume;` and `use App\Support\ResumeAnalysis;`. Ordering changes from `title` to most recently updated so the modal's default (first option) is the newest resume.

- [ ] **Step 2: Add the shared type**

In `resources/js/types/index.d.ts` after the `JobApplication` interface add:

```ts
export interface ResumeOption {
    id: number;
    title: string;
    score: number;
}
```

- [ ] **Step 3: Create the modal**

Create `resources/js/Components/jobs/add-job-modal.tsx`:

```tsx
import { Link, router } from '@inertiajs/react';
import { FormEvent, useEffect, useState } from 'react';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import { Button } from '@/Components/ui/button';
import type { ResumeOption } from '@/types';

const selectClassName =
    'mt-1 block w-full rounded-lg border-surface-border text-sm shadow-xs transition-[border-color,box-shadow] duration-soft ease-soft focus:border-brand focus:ring-brand';

export type AddJobInitial = {
    company?: string;
    role?: string;
    job_url?: string;
    job_description?: string;
    base_resume_id?: number | null;
};

export function AddJobModal({
    open,
    onClose,
    resumes,
    initial,
    showWizardLink = true,
}: {
    open: boolean;
    onClose: () => void;
    /** Most recently updated first; the first one is the default base. */
    resumes: ResumeOption[];
    initial?: AddJobInitial;
    showWizardLink?: boolean;
}) {
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [jobUrl, setJobUrl] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [baseResumeId, setBaseResumeId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }
        setCompany(initial?.company ?? '');
        setRole(initial?.role ?? '');
        setJobUrl(initial?.job_url ?? '');
        setJobDescription(initial?.job_description ?? '');
        setBaseResumeId(
            initial?.base_resume_id !== undefined && initial.base_resume_id !== null
                ? String(initial.base_resume_id)
                : resumes[0]
                  ? String(resumes[0].id)
                  : '',
        );
        setError(null);
    }, [open, initial, resumes]);

    function submit(event: FormEvent) {
        event.preventDefault();
        setProcessing(true);
        setError(null);

        router.post(
            route('job-applications.store'),
            {
                company,
                role,
                job_url: jobUrl || null,
                job_description: jobDescription || null,
                base_resume_id: baseResumeId ? Number(baseResumeId) : null,
            },
            {
                preserveScroll: true,
                onSuccess: () => onClose(),
                onError: (errors: Record<string, string>) => {
                    setError(Object.values(errors)[0] ?? 'Could not save. Check the fields and try again.');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <Modal show={open} onClose={onClose} maxWidth="lg" title="Add job">
            <form onSubmit={submit} className="p-6">
                {error && (
                    <p className="mb-4 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger-text">
                        {error}
                    </p>
                )}
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <InputLabel value="Company" />
                            <TextInput
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                        </div>
                        <div>
                            <InputLabel value="Role" />
                            <TextInput
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="mt-1 block w-full"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <InputLabel value="Job posting URL" />
                        <TextInput
                            type="url"
                            value={jobUrl}
                            onChange={(e) => setJobUrl(e.target.value)}
                            className="mt-1 block w-full"
                            placeholder="https://…"
                        />
                    </div>
                    <div>
                        <InputLabel value="Job description" />
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            maxLength={10000}
                            rows={6}
                            className={selectClassName}
                            placeholder="Paste the posting. Used to score keyword match in the Optimize panel."
                        />
                    </div>
                    <div>
                        <InputLabel value="Create a tailored copy of" />
                        <select
                            value={baseResumeId}
                            onChange={(e) => setBaseResumeId(e.target.value)}
                            className={selectClassName}
                        >
                            <option value="">None, track only</option>
                            {resumes.map((resume) => (
                                <option key={resume.id} value={resume.id}>
                                    {resume.title} · {resume.score}/100
                                </option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-ink-faint">
                            The copy is a new version in the same group. Your original is not changed.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                    {showWizardLink ? (
                        <Link
                            href={route('apply.wizard')}
                            className="text-xs font-medium text-brand underline-offset-2 hover:underline"
                        >
                            Use the step-by-step wizard
                        </Link>
                    ) : (
                        <span />
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {baseResumeId ? 'Add job and open resume' : 'Add job'}
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
```

The `route('apply.wizard')` named route is added in Task 9. Until then `npm run build` will pass (Ziggy resolves at runtime) but clicking the link 500s. Task 9 lands before any browser verification.

- [ ] **Step 4: Wire Kanban create to the modal and add card link + highlight**

In `resources/js/Pages/Jobs/Kanban.tsx`:

1. Replace the local `type ResumeOption = { id: number; title: string };` with an import: add `ResumeOption` to the `import type { ... } from '@/types'` line, and add `import { AddJobModal } from '@/Components/jobs/add-job-modal';`.

2. Add `const [addOpen, setAddOpen] = useState(false);` next to the other state, and change `openCreate` to:

```tsx
    const openCreate = () => setAddOpen(true);
```

3. Change `resumesById` to keep the whole option: `const resumesById = new Map(resumes.map((r) => [r.id, r]));` and update the `Column` prop type to `resumesById: Map<number, ResumeOption>`, and in `Column` pass `resume={job.resume_id ? (resumesById.get(job.resume_id) ?? null) : null}` instead of `resumeTitle`.

4. Replace `JobCard`'s signature and the "Using:" block:

```tsx
function JobCard({ job, resume, highlighted }: { job: JobApplication; resume: ResumeOption | null; highlighted: boolean }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: job.id });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={
                transform
                    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 20 }
                    : undefined
            }
            className={cn(
                'cursor-grab rounded-lg border border-surface-border/80 bg-white p-3 shadow-card',
                'transition-[box-shadow,opacity,transform] duration-soft ease-soft',
                'hover:border-surface-border hover:shadow-ambient',
                'active:cursor-grabbing motion-reduce:transition-none',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-1',
                isDragging && 'scale-[1.03] opacity-95 shadow-ambient ring-1 ring-brand/20',
                highlighted && 'ring-2 ring-brand',
            )}
        >
            <div className="text-sm font-bold text-ink">{job.role}</div>
            <div className="text-xs font-medium text-ink-muted">{job.company}</div>
            {resume && (
                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-ink-faint">
                        {resume.title} · {resume.score}/100
                    </span>
                    <Link
                        href={route('resumes.workstation', resume.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="shrink-0 font-semibold text-brand underline-offset-2 hover:underline"
                    >
                        Open resume
                    </Link>
                </div>
            )}
            {job.follow_up_at && (
                <div className="mt-1.5 text-xs font-semibold text-brand">
                    Next step: {job.follow_up_at}
                </div>
            )}
        </div>
    );
}
```

`onPointerDown` stop-propagation keeps dnd-kit from swallowing the link click.

5. Highlight: in `JobApplicationKanban` add

```tsx
    const highlightId = (() => {
        const raw = new URLSearchParams(window.location.search).get('highlight');
        return raw ? Number(raw) : null;
    })();
```

and pass `highlightId` into `Column` (`highlightId: number | null`), which passes `highlighted={job.id === highlightId}` to `JobCard`.

6. Render the modal before the existing edit `<Modal>`:

```tsx
            <AddJobModal open={addOpen} onClose={() => setAddOpen(false)} resumes={resumes} />
```

7. In the existing edit `<Modal>`, the `form?.id ? 'Edit application' : 'New application'` title can stay; the form is now only reached via `openEdit`. Remove `emptyForm` if unused after this change (it is used in `openCreate` only; delete both the function and its `status` param if TypeScript flags it unused).

- [ ] **Step 5: Typecheck and build**

Run: `npm run build`
Expected: tsc clean, vite build succeeds.

- [ ] **Step 6: Run backend tests touching Kanban**

Run: `php artisan test tests/Feature/JobApplicationsTest.php`
Expected: PASS (the index test only asserts on `applications`).

- [ ] **Step 7: Commit**

```bash
./vendor/bin/pint --dirty
git add resources/js/Components/jobs/add-job-modal.tsx resources/js/Pages/Jobs/Kanban.tsx resources/js/types/index.d.ts app/Http/Controllers/JobApplicationController.php
git commit -m "Add shared AddJobModal with base-resume and JD fields; Kanban card links to its resume"
```

---

### Task 5: Workstation shows its linked application

**Files:**
- Modify: `app/Http/Controllers/ResumeController.php` (`render`, around line 327)
- Create: `resources/js/Components/workstation/application-chip.tsx`
- Modify: `resources/js/Components/workstation/workstation-header.tsx` (props + render after the Saved badge)
- Modify: `resources/js/Pages/Resumes/Workstation.tsx:65-81` (accept `application`) and the `<WorkstationHeader` call around line 658
- Modify: `resources/js/types/index.d.ts` (add `LinkedApplication`)
- Test: `tests/Feature/WorkstationApplicationLinkTest.php`

**Interfaces:**
- Produces: Inertia prop `application: { id: number; company: string; role: string; status: JobStatus } | null` on `Resumes/Workstation`.

- [ ] **Step 1: Write the failing test**

Create `tests/Feature/WorkstationApplicationLinkTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkstationApplicationLinkTest extends TestCase
{
    use RefreshDatabase;

    public function test_workstation_exposes_the_linked_application(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $application = JobApplication::factory()->for($user)->create([
            'resume_id' => $resume->id,
            'company' => 'Linear',
            'role' => 'PM',
            'status' => 'applied',
        ]);

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertInertia(fn ($page) => $page
                ->component('Resumes/Workstation')
                ->where('application.id', $application->id)
                ->where('application.company', 'Linear')
                ->where('application.role', 'PM')
                ->where('application.status', 'applied'));
    }

    public function test_workstation_application_is_null_when_unlinked(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->actingAs($user)
            ->get(route('resumes.workstation', $resume))
            ->assertInertia(fn ($page) => $page->where('application', null));
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test tests/Feature/WorkstationApplicationLinkTest.php`
Expected: FAIL, prop `application` missing.

- [ ] **Step 3: Add the prop in `render`**

In `ResumeController::render`, before `return Inertia::render($component, [` add:

```php
        // Newest linked Kanban card, if any. One resume can be attached to
        // several cards from the Kanban's edit form; the chip shows one.
        $application = JobApplication::query()
            ->where('user_id', $request->user()->id)
            ->where('resume_id', $resume->id)
            ->latest('id')
            ->first();
```

and inside the props array add:

```php
            'application' => $application === null ? null : [
                'id' => $application->id,
                'company' => $application->company,
                'role' => $application->role,
                'status' => $application->status,
            ],
```

Add `use App\Models\JobApplication;` to the imports.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test tests/Feature/WorkstationApplicationLinkTest.php`
Expected: PASS.

- [ ] **Step 5: Add the type and the chip**

In `resources/js/types/index.d.ts` after `ResumeOption` add:

```ts
export interface LinkedApplication {
    id: number;
    company: string;
    role: string;
    status: JobStatus;
}
```

Create `resources/js/Components/workstation/application-chip.tsx`:

```tsx
import { Link, router } from '@inertiajs/react';
import { BriefcaseIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import type { JobStatus, LinkedApplication } from '@/types';

const STATUSES: { value: JobStatus; label: string }[] = [
    { value: 'saved', label: 'Saved' },
    { value: 'applied', label: 'Applied' },
    { value: 'interviewing', label: 'Interviewing' },
    { value: 'offer', label: 'Offer' },
    { value: 'rejected', label: 'Rejected' },
];

/** "Company – Role · Status" chip in the Workstation header, linking to the Kanban card. */
export function ApplicationChip({ application }: { application: LinkedApplication }) {
    const [status, setStatus] = useState<JobStatus>(application.status);
    const [saving, setSaving] = useState(false);

    function changeStatus(next: JobStatus) {
        const previous = status;
        setStatus(next);
        setSaving(true);
        router.patch(
            route('job-applications.update', application.id),
            { status: next },
            {
                preserveScroll: true,
                preserveState: true,
                onError: () => setStatus(previous),
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-2.5 py-0.5 text-xs">
            <BriefcaseIcon className="size-3 text-brand" />
            <Link
                href={route('job-applications.index', { highlight: application.id })}
                className="max-w-48 truncate font-medium text-ink underline-offset-2 hover:underline"
                title="Open application"
            >
                {application.company} – {application.role}
            </Link>
            <span aria-hidden="true" className="text-ink-faint">·</span>
            <select
                aria-label="Application status"
                value={status}
                disabled={saving}
                onChange={(e) => changeStatus(e.target.value as JobStatus)}
                className="border-0 bg-transparent p-0 pr-5 text-xs font-medium text-brand focus:ring-0"
            >
                {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                        {s.label}
                    </option>
                ))}
            </select>
        </span>
    );
}
```

- [ ] **Step 6: Render the chip in the header**

In `workstation-header.tsx`:
- add `import { ApplicationChip } from '@/Components/workstation/application-chip';` and `LinkedApplication` to the `@/types` import;
- add prop `application?: LinkedApplication | null;` to the props type and `application = null,` to the destructure;
- after the `saveStatus === 'saving'` badge block (ends at line 193) insert:

```tsx
                    {application && <ApplicationChip application={application} />}
```

In `Workstation.tsx` add `application = null,` to the destructured props and `application?: LinkedApplication | null;` to its type (import `LinkedApplication` from `@/types`), then pass `application={application}` on `<WorkstationHeader`.

- [ ] **Step 7: Build and commit**

Run: `npm run build`
Expected: clean.

```bash
./vendor/bin/pint --dirty
git add app/Http/Controllers/ResumeController.php resources/js/Components/workstation/application-chip.tsx resources/js/Components/workstation/workstation-header.tsx resources/js/Pages/Resumes/Workstation.tsx resources/js/types/index.d.ts tests/Feature/WorkstationApplicationLinkTest.php
git commit -m "Show linked job application chip in the Workstation header"
```

---

### Task 6: Compare page shows application status per version

**Files:**
- Modify: `app/Http/Controllers/ResumeCompareController.php:39-46`
- Modify: `resources/js/Pages/Resumes/Compare.tsx:34-39` (Props) and wherever `versions` are listed in `CompareSidebar` (search the file for `versions.map`)
- Test: `tests/Feature/WorkstationApplicationLinkTest.php` (append)

**Interfaces:**
- Produces: `versions[].application_status: JobStatus | null` on `Resumes/Compare`.

- [ ] **Step 1: Write the failing test**

Append to `WorkstationApplicationLinkTest`:

```php
    public function test_compare_versions_carry_linked_application_status(): void
    {
        $user = User::factory()->create();
        $base = Resume::factory()->for($user)->create();
        $tailored = Resume::factory()->for($user)->create(['group_id' => $base->group_id]);
        JobApplication::factory()->for($user)->create(['resume_id' => $tailored->id, 'status' => 'interviewing']);

        $this->actingAs($user)
            ->get(route('resume-groups.compare', $base->group_id))
            ->assertInertia(fn ($page) => $page
                ->where('versions.0.application_status', null)
                ->where('versions.1.application_status', 'interviewing'));
    }
```

- [ ] **Step 2: Run to verify it fails**

Run: `php artisan test --filter=test_compare_versions_carry_linked_application_status`
Expected: FAIL, key missing.

- [ ] **Step 3: Add the status to the payload**

In `ResumeCompareController::show`, before the return:

```php
        $statusByResume = JobApplication::query()
            ->where('user_id', $request->user()->id)
            ->whereIn('resume_id', $versions->pluck('id'))
            ->orderBy('id')
            ->get(['resume_id', 'status'])
            ->keyBy('resume_id');
```

and change the versions map to:

```php
            'versions' => $versions
                ->map(fn (Resume $version): array => [
                    'id' => $version->id,
                    'title' => $version->title,
                    'application_status' => $statusByResume->get($version->id)?->status,
                ])
                ->all(),
```

Import `App\Models\JobApplication`.

- [ ] **Step 4: Show it in the sidebar**

In `Compare.tsx` change the Props type to `versions: { id: number; title: string; application_status: JobStatus | null }[];` (import `JobStatus` from `@/types`). Find `CompareSidebar` in the same file (or in `resources/js/Components/compare/` if extracted) and, next to each version title, render:

```tsx
{version.application_status && (
    <span className="ml-1.5 rounded-full bg-brand-subtle px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
        {version.application_status}
    </span>
)}
```

- [ ] **Step 5: Test, build, commit**

Run: `php artisan test tests/Feature/WorkstationApplicationLinkTest.php && npm run build`
Expected: PASS, clean build.

```bash
./vendor/bin/pint --dirty
git add app/Http/Controllers/ResumeCompareController.php resources/js/Pages/Resumes/Compare.tsx
git commit -m "Compare page shows linked application status per version"
```

---

### Task 7: Dashboard "Add job" CTA and "Next up" strip

**Files:**
- Modify: `app/Http/Controllers/DashboardController.php`
- Create: `resources/js/Components/dashboard/next-up-strip.tsx`
- Modify: `resources/js/Pages/Dashboard.tsx` (props, second CTA, strip, modal)
- Modify: `resources/js/types/index.d.ts` (add `NextUpItem`)
- Test: `tests/Feature/DashboardNextUpTest.php`

**Interfaces:**
- Produces: deferred prop `nextUp: NextUpItem[]` where `NextUpItem = { kind: 'follow_up' | 'interview' | 'unattached'; label: string; detail: string; href: string }`, plus `resumeOptions: ResumeOption[]` (eager) for the modal, plus `prefersApplyWizard: boolean`.
- Note: the `pending_suggestions` kind from the spec is added by Part 2.

- [ ] **Step 1: Write the failing tests**

Create `tests/Feature/DashboardNextUpTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\JobApplicationInterview;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardNextUpTest extends TestCase
{
    use RefreshDatabase;

    private function nextUp(User $user): array
    {
        return $this->actingAs($user)
            ->get(route('dashboard'), ['X-Inertia' => 'true', 'X-Inertia-Partial-Component' => 'Dashboard', 'X-Inertia-Partial-Data' => 'nextUp'])
            ->json('props.nextUp');
    }

    public function test_overdue_follow_up_appears(): void
    {
        $user = User::factory()->create();
        JobApplication::factory()->for($user)->create([
            'company' => 'Linear', 'role' => 'PM', 'status' => 'applied', 'follow_up_at' => now()->subDay(),
        ]);

        $items = $this->nextUp($user);

        $this->assertCount(1, $items);
        $this->assertSame('follow_up', $items[0]['kind']);
        $this->assertStringContainsString('Linear', $items[0]['label']);
    }

    public function test_future_follow_up_and_closed_cards_do_not_appear(): void
    {
        $user = User::factory()->create();
        JobApplication::factory()->for($user)->create(['status' => 'applied', 'follow_up_at' => now()->addDays(3)]);
        JobApplication::factory()->for($user)->create(['status' => 'rejected', 'follow_up_at' => now()->subDay()]);

        $this->assertSame([], $this->nextUp($user));
    }

    public function test_interview_in_next_seven_days_appears(): void
    {
        $user = User::factory()->create();
        $job = JobApplication::factory()->for($user)->create(['status' => 'interviewing', 'resume_id' => Resume::factory()->for($user)->create()->id]);
        JobApplicationInterview::factory()->for($job)->create(['scheduled_at' => now()->addDays(2)]);
        JobApplicationInterview::factory()->for($job)->create(['scheduled_at' => now()->addDays(20)]);

        $items = $this->nextUp($user);

        $this->assertCount(1, $items);
        $this->assertSame('interview', $items[0]['kind']);
    }

    public function test_card_without_resume_appears_as_unattached(): void
    {
        $user = User::factory()->create();
        JobApplication::factory()->for($user)->create(['status' => 'saved', 'resume_id' => null]);

        $items = $this->nextUp($user);

        $this->assertSame('unattached', $items[0]['kind']);
    }

    public function test_dashboard_passes_resume_options_and_wizard_preference(): void
    {
        $user = User::factory()->create(['prefers_apply_wizard' => false]);
        Resume::factory()->for($user)->create(['title' => 'Base']);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('prefersApplyWizard', false)
                ->has('resumeOptions', 1)
                ->where('resumeOptions.0.title', 'Base'));
    }
}
```

If the partial-reload header approach for deferred props does not return `nextUp`, replace `nextUp()` with `->assertInertia(fn ($page) => $page->has('nextUp', 1)...)`; Inertia's test helper resolves deferred props when the test requests the page normally in Inertia v3 (check `tests/Feature/DashboardTest.php` if present for the existing pattern used for the deferred `resumes` prop and copy it).

- [ ] **Step 2: Run to verify they fail**

Run: `php artisan test tests/Feature/DashboardNextUpTest.php`
Expected: FAIL, props missing.

- [ ] **Step 3: Implement in DashboardController**

Replace `__invoke` body with:

```php
        $user = $request->user();

        return Inertia::render('Dashboard', [
            'resumes' => Inertia::defer(fn () => $this->resumesForDashboard($request)),
            'nextUp' => Inertia::defer(fn () => $this->nextUp($user)),
            'resumeOptions' => $user->resumes()
                ->with(['experiences', 'skills'])
                ->latest('updated_at')
                ->get()
                ->map(fn (Resume $resume): array => [
                    'id' => $resume->id,
                    'title' => $resume->title,
                    'score' => ResumeAnalysis::score($resume),
                ])->all(),
            'prefersApplyWizard' => (bool) $user->prefers_apply_wizard,
            'hasStarterProfile' => $user->starterProfile()->exists(),
            'roleSamples' => RoleSamples::catalogue(),
        ]);
```

Add the method:

```php
    /**
     * Actionable items for the "Next up" strip. Order: overdue follow-ups,
     * upcoming interviews, cards with no resume. Each links straight to the
     * card (Kanban ?highlight) so the user lands on the thing to do.
     *
     * @return list<array{kind: string, label: string, detail: string, href: string}>
     */
    private function nextUp(User $user): array
    {
        $items = [];

        $followUps = $user->jobApplications()
            ->whereIn('status', ['saved', 'applied'])
            ->whereNotNull('follow_up_at')
            ->whereDate('follow_up_at', '<=', today())
            ->orderBy('follow_up_at')
            ->get();

        foreach ($followUps as $job) {
            $items[] = [
                'kind' => 'follow_up',
                'label' => "Follow up: {$job->company} – {$job->role}",
                'detail' => $job->follow_up_at->isToday() ? 'Due today' : 'Overdue since '.$job->follow_up_at->toFormattedDateString(),
                'href' => route('job-applications.index', ['highlight' => $job->id]),
            ];
        }

        $interviews = JobApplicationInterview::query()
            ->whereHas('jobApplication', fn ($q) => $q->where('user_id', $user->id))
            ->whereBetween('scheduled_at', [now(), now()->addDays(7)])
            ->with('jobApplication')
            ->orderBy('scheduled_at')
            ->get();

        foreach ($interviews as $interview) {
            $job = $interview->jobApplication;
            $items[] = [
                'kind' => 'interview',
                'label' => "Interview: {$job->company} – {$job->role}",
                'detail' => $interview->scheduled_at->diffForHumans(),
                'href' => route('job-applications.index', ['highlight' => $job->id]),
            ];
        }

        $unattached = $user->jobApplications()
            ->whereNull('resume_id')
            ->whereIn('status', ['saved', 'applied', 'interviewing'])
            ->latest()
            ->get();

        foreach ($unattached as $job) {
            $items[] = [
                'kind' => 'unattached',
                'label' => "No resume attached: {$job->company} – {$job->role}",
                'detail' => 'Attach or create a tailored version',
                'href' => route('job-applications.index', ['highlight' => $job->id]),
            ];
        }

        return $items;
    }
```

Imports: `App\Models\JobApplicationInterview`, `App\Models\User`. Confirm `JobApplicationInterview` has a `jobApplication()` BelongsTo; if it does not, add it:

```php
    public function jobApplication(): BelongsTo
    {
        return $this->belongsTo(JobApplication::class);
    }
```

- [ ] **Step 4: Run to verify they pass**

Run: `php artisan test tests/Feature/DashboardNextUpTest.php`
Expected: PASS.

- [ ] **Step 5: Frontend type and strip**

In `resources/js/types/index.d.ts` add:

```ts
export interface NextUpItem {
    kind: 'follow_up' | 'interview' | 'unattached' | 'pending_suggestions';
    label: string;
    detail: string;
    href: string;
}
```

Create `resources/js/Components/dashboard/next-up-strip.tsx`:

```tsx
import { Link } from '@inertiajs/react';
import { BellAlertIcon, CalendarDaysIcon, DocumentPlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Shell } from '@/Components/ui/shell';
import type { NextUpItem } from '@/types';

const ICON: Record<NextUpItem['kind'], typeof BellAlertIcon> = {
    follow_up: BellAlertIcon,
    interview: CalendarDaysIcon,
    unattached: DocumentPlusIcon,
    pending_suggestions: SparklesIcon,
};

export function NextUpStrip({ items }: { items: NextUpItem[] }) {
    if (items.length === 0) {
        return null;
    }

    return (
        <Shell innerClassName="p-4 sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">Next up</p>
            <ul className="mt-3 divide-y divide-surface-border/80">
                {items.map((item, index) => {
                    const Icon = ICON[item.kind];
                    return (
                        <li key={`${item.kind}-${index}`}>
                            <Link
                                href={item.href}
                                className="flex items-center gap-3 py-2.5 hover:bg-surface/60"
                            >
                                <Icon className="size-4 shrink-0 text-brand" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink">{item.label}</span>
                                    <span className="block text-xs text-ink-muted">{item.detail}</span>
                                </span>
                                <span className="text-ink-faint">→</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </Shell>
    );
}
```

- [ ] **Step 6: Dashboard page changes**

In `resources/js/Pages/Dashboard.tsx`:
- imports: `BriefcaseIcon` from heroicons, `AddJobModal` from `@/Components/jobs/add-job-modal`, `NextUpStrip` from `@/Components/dashboard/next-up-strip`, and `NextUpItem`, `ResumeOption` from `@/types`;
- props: add `nextUp`, `resumeOptions`, `prefersApplyWizard`:

```tsx
export default function Dashboard({
    resumes,
    nextUp,
    resumeOptions,
    prefersApplyWizard,
    hasStarterProfile,
    roleSamples = [],
}: {
    resumes: ResumeSummary[] | undefined;
    nextUp: NextUpItem[] | undefined;
    resumeOptions: ResumeOption[];
    prefersApplyWizard: boolean;
    hasStarterProfile: boolean;
    roleSamples?: { id: string; label: string; description: string; target_role: string }[];
}) {
```

- state: `const [addJobOpen, setAddJobOpen] = useState(false);`
- in the "Quick start" Shell, directly after the "New resume" `<Button>` and before the starter-profile `<Link>`, add the equal CTA. When the user prefers the wizard it is a Link to the wizard, otherwise a button opening the modal:

```tsx
                                {prefersApplyWizard ? (
                                    <Link
                                        href={route('apply.wizard')}
                                        className={cn(buttonClassName('default'), 'group w-full justify-between rounded-full')}
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <BriefcaseIcon className="size-4" />
                                            Add job
                                        </span>
                                        <span className="flex size-6 items-center justify-center rounded-full bg-white/15">
                                            <PlusIcon className="size-3.5" />
                                        </span>
                                    </Link>
                                ) : (
                                    <Button
                                        type="button"
                                        onClick={() => setAddJobOpen(true)}
                                        className="group w-full justify-between rounded-full"
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <BriefcaseIcon className="size-4" />
                                            Add job
                                        </span>
                                        <span className="flex size-6 items-center justify-center rounded-full bg-white/15 transition-transform duration-soft ease-soft group-hover:scale-105">
                                            <PlusIcon className="size-3.5" />
                                        </span>
                                    </Button>
                                )}
```

- after the starter-profile tip block and before the "Your resumes" label, add the strip inside its own `Deferred`:

```tsx
                        <Deferred data="nextUp" fallback={null}>
                            <NextUpStrip items={nextUp ?? []} />
                        </Deferred>
```

- next to `<NewResumeModal ... />` add:

```tsx
            <AddJobModal open={addJobOpen} onClose={() => setAddJobOpen(false)} resumes={resumeOptions} />
```

- [ ] **Step 7: Build and commit**

Run: `npm run build`
Expected: clean (the `apply.wizard` route name resolves once Task 9 registers it; Ziggy only checks at runtime).

```bash
./vendor/bin/pint --dirty
git add app/Http/Controllers/DashboardController.php app/Models/JobApplicationInterview.php resources/js/Components/dashboard/next-up-strip.tsx resources/js/Pages/Dashboard.tsx resources/js/types/index.d.ts tests/Feature/DashboardNextUpTest.php
git commit -m "Dashboard: equal Add job CTA and Next up strip"
```

---

### Task 8: First-week checklist

**Files:**
- Create: `resources/js/lib/checklist-steps.ts`, `resources/js/lib/checklist-steps.test.ts`
- Create: `resources/js/Components/dashboard/first-week-checklist.tsx`
- Create: `app/Http/Controllers/UserPreferenceController.php`
- Modify: `app/Http/Controllers/DashboardController.php` (add `checklist` prop)
- Modify: `routes/web.php` (one route)
- Modify: `resources/js/Pages/Dashboard.tsx`
- Test: `tests/Feature/DashboardNextUpTest.php` (append)

**Interfaces:**
- Produces: Inertia prop `checklist: { dismissed: boolean; facts: ChecklistFacts } ` where `ChecklistFacts = { has_starter_profile: boolean; resume_count: number; extension_connected: boolean; job_count: number; applied_count: number }`; route `PATCH /user/checklist/dismiss` named `checklist.dismiss`; pure `checklistSteps(facts): ChecklistStep[]`.

- [ ] **Step 1: Write the failing vitest**

Create `resources/js/lib/checklist-steps.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checklistSteps, type ChecklistFacts } from './checklist-steps';

const none: ChecklistFacts = {
    has_starter_profile: false,
    resume_count: 0,
    extension_connected: false,
    job_count: 0,
    applied_count: 0,
};

describe('checklistSteps', () => {
    it('lists five steps in order, all incomplete for a fresh account', () => {
        const steps = checklistSteps(none);
        expect(steps.map((s) => s.key)).toEqual(['profile', 'resume', 'extension', 'job', 'applied']);
        expect(steps.every((s) => !s.done)).toBe(true);
    });

    it('marks steps done from facts', () => {
        const steps = checklistSteps({ ...none, has_starter_profile: true, resume_count: 2, applied_count: 1 });
        expect(steps.find((s) => s.key === 'profile')?.done).toBe(true);
        expect(steps.find((s) => s.key === 'resume')?.done).toBe(true);
        expect(steps.find((s) => s.key === 'extension')?.done).toBe(false);
        expect(steps.find((s) => s.key === 'applied')?.done).toBe(true);
    });

    it('reports completion when every step is done', () => {
        const steps = checklistSteps({ has_starter_profile: true, resume_count: 1, extension_connected: true, job_count: 1, applied_count: 1 });
        expect(steps.every((s) => s.done)).toBe(true);
    });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run resources/js/lib/checklist-steps.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the pure function**

Create `resources/js/lib/checklist-steps.ts`:

```ts
export type ChecklistFacts = {
    has_starter_profile: boolean;
    resume_count: number;
    extension_connected: boolean;
    job_count: number;
    applied_count: number;
};

export type ChecklistStep = {
    key: 'profile' | 'resume' | 'extension' | 'job' | 'applied';
    label: string;
    done: boolean;
    /** Named route to send the user to for this step. */
    route: string;
};

export function checklistSteps(facts: ChecklistFacts): ChecklistStep[] {
    return [
        { key: 'profile', label: 'Fill your starter profile', done: facts.has_starter_profile, route: 'starter-profile.edit' },
        { key: 'resume', label: 'Build your first resume', done: facts.resume_count > 0, route: 'resumes.index' },
        { key: 'extension', label: 'Connect the browser extension', done: facts.extension_connected, route: 'extension.connect' },
        { key: 'job', label: 'Add your first job', done: facts.job_count > 0, route: 'job-applications.index' },
        { key: 'applied', label: 'Mark an application as Applied', done: facts.applied_count > 0, route: 'job-applications.index' },
    ];
}
```

- [ ] **Step 4: Run vitest to verify it passes**

Run: `npx vitest run resources/js/lib/checklist-steps.test.ts`
Expected: PASS.

- [ ] **Step 5: Backend facts, dismiss route, tests**

Append to `tests/Feature/DashboardNextUpTest.php`:

```php
    public function test_dashboard_checklist_facts_and_dismissal(): void
    {
        $user = User::factory()->create();
        Resume::factory()->for($user)->create();
        JobApplication::factory()->for($user)->create(['status' => 'applied']);
        $user->createToken(\App\Support\ResumeFillProfile::TOKEN_NAME, [\App\Support\ResumeFillProfile::TOKEN_ABILITY]);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('checklist.dismissed', false)
                ->where('checklist.facts.has_starter_profile', false)
                ->where('checklist.facts.resume_count', 1)
                ->where('checklist.facts.extension_connected', true)
                ->where('checklist.facts.job_count', 1)
                ->where('checklist.facts.applied_count', 1));

        $this->actingAs($user)->patch(route('checklist.dismiss'))->assertRedirect();

        $this->assertNotNull($user->fresh()->dismissed_checklist_at);
        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page->where('checklist.dismissed', true));
    }
```

Run: `php artisan test --filter=test_dashboard_checklist_facts_and_dismissal`
Expected: FAIL, route not defined.

Create `app/Http/Controllers/UserPreferenceController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/** Small per-user UI preferences that do not belong on the Profile form. */
class UserPreferenceController extends Controller
{
    public function dismissChecklist(Request $request): RedirectResponse
    {
        $request->user()->update(['dismissed_checklist_at' => now()]);

        return back();
    }

    public function setApplyWizardPreference(Request $request): RedirectResponse
    {
        $request->validate(['prefers_apply_wizard' => ['required', 'boolean']]);

        $request->user()->update(['prefers_apply_wizard' => $request->boolean('prefers_apply_wizard')]);

        return back();
    }
}
```

In `routes/web.php`, inside the authenticated group after the onboarding routes, add:

```php
    Route::patch('/user/checklist/dismiss', [UserPreferenceController::class, 'dismissChecklist'])->name('checklist.dismiss');
    Route::patch('/user/apply-wizard-preference', [UserPreferenceController::class, 'setApplyWizardPreference'])->name('apply-wizard.preference');
```

with `use App\Http\Controllers\UserPreferenceController;` at the top.

In `DashboardController::__invoke` add the prop:

```php
            'checklist' => [
                'dismissed' => $user->dismissed_checklist_at !== null,
                'facts' => [
                    'has_starter_profile' => $user->starterProfile()->exists(),
                    'resume_count' => $user->resumes()->count(),
                    'extension_connected' => $user->tokens()
                        ->where('abilities', 'like', '%'.ResumeFillProfile::TOKEN_ABILITY.'%')
                        ->exists(),
                    'job_count' => $user->jobApplications()->count(),
                    'applied_count' => $user->jobApplications()->whereIn('status', ['applied', 'interviewing', 'offer', 'rejected'])->count(),
                ],
            ],
```

Import `App\Support\ResumeFillProfile`. Sanctum stores abilities as a JSON array string, so the `like` match on the ability name is the same approach the app can rely on for a single fixed ability token; keep it.

Run: `php artisan test tests/Feature/DashboardNextUpTest.php`
Expected: PASS.

- [ ] **Step 6: Checklist component and Dashboard wiring**

Create `resources/js/Components/dashboard/first-week-checklist.tsx`:

```tsx
import { Link, router } from '@inertiajs/react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { Shell } from '@/Components/ui/shell';
import { checklistSteps, type ChecklistFacts } from '@/lib/checklist-steps';
import { cn } from '@/lib/utils';

export function FirstWeekChecklist({ facts, dismissed }: { facts: ChecklistFacts; dismissed: boolean }) {
    const steps = checklistSteps(facts);
    const doneCount = steps.filter((s) => s.done).length;

    if (dismissed || doneCount === steps.length) {
        return null;
    }

    function dismiss() {
        router.patch(route('checklist.dismiss'), {}, { preserveScroll: true });
    }

    return (
        <Shell innerClassName="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">Your first week</p>
                    <p className="mt-1 text-sm text-ink-muted">{doneCount} of {steps.length} done</p>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    aria-label="Dismiss checklist"
                    className="rounded-md p-1 text-ink-faint hover:bg-surface hover:text-ink"
                >
                    <XMarkIcon className="size-4" />
                </button>
            </div>
            <ol className="mt-3 space-y-1.5">
                {steps.map((step) => (
                    <li key={step.key}>
                        <Link
                            href={route(step.route)}
                            className={cn(
                                'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface/60',
                                step.done ? 'text-ink-faint line-through' : 'font-medium text-ink',
                            )}
                        >
                            {step.done ? (
                                <CheckCircleSolid className="size-4 text-success" />
                            ) : (
                                <CheckCircleIcon className="size-4 text-ink-faint" />
                            )}
                            {step.label}
                        </Link>
                    </li>
                ))}
            </ol>
        </Shell>
    );
}
```

In `Dashboard.tsx` add the prop `checklist: { dismissed: boolean; facts: ChecklistFacts }` (import `ChecklistFacts` from `@/lib/checklist-steps` and `FirstWeekChecklist`), and render `<FirstWeekChecklist facts={checklist.facts} dismissed={checklist.dismissed} />` directly above the `NextUpStrip` `Deferred`.

- [ ] **Step 7: Build, test, commit**

Run: `npm run build && npx vitest run && php artisan test tests/Feature/DashboardNextUpTest.php`
Expected: all clean.

```bash
./vendor/bin/pint --dirty
git add resources/js/lib/checklist-steps.ts resources/js/lib/checklist-steps.test.ts resources/js/Components/dashboard/first-week-checklist.tsx app/Http/Controllers/UserPreferenceController.php app/Http/Controllers/DashboardController.php routes/web.php resources/js/Pages/Dashboard.tsx tests/Feature/DashboardNextUpTest.php
git commit -m "Dashboard first-week checklist with dismiss"
```

---

### Task 9: Apply wizard and preference toggle

**Files:**
- Create: `app/Http/Controllers/ApplyWizardController.php`
- Create: `resources/js/Pages/Apply/Wizard.tsx`
- Create: `resources/js/Pages/Profile/Partials/ApplyWizardPreferenceForm.tsx`
- Modify: `routes/web.php` (one route), `resources/js/Pages/Profile/Edit.tsx` (render the partial), `app/Http/Controllers/ProfileController.php::edit` (pass `prefersApplyWizard`)
- Test: `tests/Feature/ApplyWizardTest.php` (append)

**Interfaces:**
- Produces: `GET /apply/new` named `apply.wizard` rendering `Apply/Wizard` with `resumeOptions: ResumeOption[]`. Wizard submit posts to `job-applications.store`. Skip sets `prefers_apply_wizard=false` via `apply-wizard.preference` then opens the Kanban with `?add=1` and the values in the query string.

- [ ] **Step 1: Write the failing tests**

Append to `tests/Feature/ApplyWizardTest.php`:

```php
    public function test_wizard_renders_with_resume_options(): void
    {
        $user = User::factory()->create();
        \App\Models\Resume::factory()->for($user)->create(['title' => 'Base']);

        $this->actingAs($user)
            ->get(route('apply.wizard'))
            ->assertInertia(fn ($page) => $page
                ->component('Apply/Wizard')
                ->has('resumeOptions', 1)
                ->where('resumeOptions.0.title', 'Base'));
    }

    public function test_preference_endpoint_toggles_wizard(): void
    {
        $user = User::factory()->create(['prefers_apply_wizard' => true]);

        $this->actingAs($user)
            ->patch(route('apply-wizard.preference'), ['prefers_apply_wizard' => false])
            ->assertRedirect();
        $this->assertFalse($user->fresh()->prefers_apply_wizard);

        $this->actingAs($user)
            ->patch(route('apply-wizard.preference'), ['prefers_apply_wizard' => true])
            ->assertRedirect();
        $this->assertTrue($user->fresh()->prefers_apply_wizard);
    }

    public function test_preference_endpoint_requires_boolean(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->patch(route('apply-wizard.preference'), ['prefers_apply_wizard' => 'maybe'])
            ->assertSessionHasErrors('prefers_apply_wizard');
    }

    public function test_guest_cannot_open_the_wizard(): void
    {
        $this->get(route('apply.wizard'))->assertRedirect(route('login'));
    }
```

- [ ] **Step 2: Run to verify they fail**

Run: `php artisan test tests/Feature/ApplyWizardTest.php`
Expected: the wizard tests FAIL on undefined route `apply.wizard`; the preference tests PASS already (route from Task 8).

- [ ] **Step 3: Controller and route**

Create `app/Http/Controllers/ApplyWizardController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Support\ResumeAnalysis;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Step-by-step "Add job" for first-timers. Submits to the same
 * job-applications.store endpoint as the modal; this controller only
 * renders the page.
 */
class ApplyWizardController extends Controller
{
    public function show(Request $request): Response
    {
        return Inertia::render('Apply/Wizard', [
            'resumeOptions' => $request->user()->resumes()
                ->with(['experiences', 'skills'])
                ->latest('updated_at')
                ->get()
                ->map(fn (Resume $resume): array => [
                    'id' => $resume->id,
                    'title' => $resume->title,
                    'score' => ResumeAnalysis::score($resume),
                ])->all(),
        ]);
    }
}
```

In `routes/web.php` inside the authenticated group, after the job-applications routes:

```php
    Route::get('/apply/new', [ApplyWizardController::class, 'show'])->name('apply.wizard');
```

with the `use App\Http\Controllers\ApplyWizardController;` import.

Run: `php artisan test tests/Feature/ApplyWizardTest.php`
Expected: PASS.

- [ ] **Step 4: The wizard page**

Create `resources/js/Pages/Apply/Wizard.tsx`:

```tsx
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { Button, buttonClassName } from '@/Components/ui/button';
import { Shell } from '@/Components/ui/shell';
import { cn } from '@/lib/utils';
import type { ResumeOption } from '@/types';

const STEPS = ['Job', 'Resume', 'Tailor', 'Review'] as const;
type Step = (typeof STEPS)[number];

const fieldClassName =
    'mt-1 block w-full rounded-lg border-surface-border text-sm shadow-xs focus:border-brand focus:ring-brand';

export default function ApplyWizard({ resumeOptions }: { resumeOptions: ResumeOption[] }) {
    const [step, setStep] = useState<Step>('Job');
    const [company, setCompany] = useState('');
    const [role, setRole] = useState('');
    const [jobUrl, setJobUrl] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [baseResumeId, setBaseResumeId] = useState<string>(resumeOptions[0] ? String(resumeOptions[0].id) : '');
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const index = STEPS.indexOf(step);
    const canContinue = step === 'Job' ? company.trim() !== '' && role.trim() !== '' : true;

    function next() {
        setStep(STEPS[Math.min(index + 1, STEPS.length - 1)]);
    }
    function back() {
        setStep(STEPS[Math.max(index - 1, 0)]);
    }

    function skipWizard() {
        // Remember the choice, then hand the typed values to the Kanban modal.
        router.patch(
            route('apply-wizard.preference'),
            { prefers_apply_wizard: false },
            {
                preserveState: false,
                onFinish: () =>
                    router.get(route('job-applications.index'), {
                        add: 1,
                        company,
                        role,
                        job_url: jobUrl,
                        job_description: jobDescription,
                        base_resume_id: baseResumeId,
                    }),
            },
        );
    }

    function submit() {
        setProcessing(true);
        setError(null);
        router.post(
            route('job-applications.store'),
            {
                company,
                role,
                job_url: jobUrl || null,
                job_description: jobDescription || null,
                base_resume_id: baseResumeId ? Number(baseResumeId) : null,
            },
            {
                onSuccess: () => {
                    // Completing the wizard once flips the preference so the
                    // CTA opens the modal next time.
                    router.patch(route('apply-wizard.preference'), { prefers_apply_wizard: false }, { preserveState: true });
                },
                onError: (errors: Record<string, string>) => {
                    setError(Object.values(errors)[0] ?? 'Could not save. Check the fields and try again.');
                    setStep('Job');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    const base = resumeOptions.find((r) => String(r.id) === baseResumeId) ?? null;

    return (
        <AuthenticatedLayout>
            <Head title="Add job" />
            <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
                <ol className="mb-6 flex items-center gap-2 text-xs font-semibold">
                    {STEPS.map((s, i) => (
                        <li
                            key={s}
                            className={cn(
                                'rounded-full px-3 py-1',
                                i === index ? 'bg-brand text-white' : i < index ? 'bg-brand-subtle text-brand' : 'bg-surface text-ink-faint',
                            )}
                        >
                            {i + 1}. {s}
                        </li>
                    ))}
                </ol>

                <Shell innerClassName="p-6">
                    {error && (
                        <p className="mb-4 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger-text">{error}</p>
                    )}

                    {step === 'Job' && (
                        <div className="space-y-4">
                            <h1 className="text-lg font-bold text-ink">Which job?</h1>
                            <div>
                                <InputLabel value="Company" />
                                <TextInput value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1 block w-full" required />
                            </div>
                            <div>
                                <InputLabel value="Role" />
                                <TextInput value={role} onChange={(e) => setRole(e.target.value)} className="mt-1 block w-full" required />
                            </div>
                            <div>
                                <InputLabel value="Job posting URL (optional)" />
                                <TextInput type="url" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} className="mt-1 block w-full" placeholder="https://…" />
                            </div>
                        </div>
                    )}

                    {step === 'Resume' && (
                        <div className="space-y-4">
                            <h1 className="text-lg font-bold text-ink">Start from which resume?</h1>
                            <p className="text-sm text-ink-muted">
                                We make a copy tailored to this job. Your original stays as it is.
                            </p>
                            {resumeOptions.length === 0 ? (
                                <p className="rounded-md bg-surface p-3 text-sm text-ink-muted">
                                    You have no resumes yet.{' '}
                                    <Link href={route('resumes.index')} className="font-medium text-brand underline-offset-2 hover:underline">
                                        Build one first
                                    </Link>{' '}
                                    or continue to track this job only.
                                </p>
                            ) : (
                                <select value={baseResumeId} onChange={(e) => setBaseResumeId(e.target.value)} className={fieldClassName}>
                                    <option value="">None, track only</option>
                                    {resumeOptions.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.title} · {r.score}/100
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    {step === 'Tailor' && (
                        <div className="space-y-4">
                            <h1 className="text-lg font-bold text-ink">Paste the job description</h1>
                            <p className="text-sm text-ink-muted">
                                The Optimize panel scores keyword overlap and lists what is missing so you can tailor by hand.
                            </p>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                maxLength={10000}
                                rows={10}
                                className={fieldClassName}
                            />
                        </div>
                    )}

                    {step === 'Review' && (
                        <div className="space-y-3 text-sm">
                            <h1 className="text-lg font-bold text-ink">Ready?</h1>
                            <dl className="grid grid-cols-3 gap-y-2">
                                <dt className="text-ink-muted">Job</dt>
                                <dd className="col-span-2 font-medium text-ink">{company} – {role}</dd>
                                <dt className="text-ink-muted">Resume</dt>
                                <dd className="col-span-2 font-medium text-ink">{base ? `Tailored copy of “${base.title}”` : 'Track only'}</dd>
                                <dt className="text-ink-muted">Description</dt>
                                <dd className="col-span-2 font-medium text-ink">{jobDescription ? `${jobDescription.length} characters` : 'None'}</dd>
                            </dl>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-between">
                        <button type="button" onClick={skipWizard} className="text-xs font-medium text-ink-muted underline-offset-2 hover:underline">
                            Skip wizard
                        </button>
                        <div className="flex gap-2">
                            {index > 0 && (
                                <Button type="button" variant="outline" onClick={back}>
                                    Back
                                </Button>
                            )}
                            {step !== 'Review' ? (
                                <Button type="button" onClick={next} disabled={!canContinue}>
                                    Continue
                                </Button>
                            ) : (
                                <Button type="button" onClick={submit} disabled={processing}>
                                    {base ? 'Add job and open resume' : 'Add job'}
                                </Button>
                            )}
                        </div>
                    </div>
                </Shell>

                <p className="mt-4 text-center text-xs text-ink-faint">
                    <Link href={route('dashboard')} className={buttonClassName('ghost', 'sm')}>Cancel</Link>
                </p>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 5: Kanban opens the modal from `?add=1` with carried values**

In `resources/js/Pages/Jobs/Kanban.tsx` replace the `addOpen` state initializer and add an `initial` for the modal:

```tsx
    const params = new URLSearchParams(window.location.search);
    const [addOpen, setAddOpen] = useState(params.get('add') === '1');
    const addInitial = {
        company: params.get('company') ?? undefined,
        role: params.get('role') ?? undefined,
        job_url: params.get('job_url') ?? undefined,
        job_description: params.get('job_description') ?? undefined,
        base_resume_id: params.get('base_resume_id') ? Number(params.get('base_resume_id')) : undefined,
    };
```

and pass `initial={addInitial}` to `<AddJobModal>`. Reuse `params` for `highlightId` from Task 4 (`params.get('highlight')`).

- [ ] **Step 6: Profile toggle**

Create `resources/js/Pages/Profile/Partials/ApplyWizardPreferenceForm.tsx`:

```tsx
import { router } from '@inertiajs/react';
import { useState } from 'react';

export default function ApplyWizardPreferenceForm({ prefersApplyWizard }: { prefersApplyWizard: boolean }) {
    const [checked, setChecked] = useState(prefersApplyWizard);

    function toggle(next: boolean) {
        setChecked(next);
        router.patch(route('apply-wizard.preference'), { prefers_apply_wizard: next }, { preserveScroll: true });
    }

    return (
        <section>
            <header>
                <h2 className="text-lg font-medium text-gray-900">Add job wizard</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Walk through job, resume, and description one step at a time. Turn off to use the quick form.
                </p>
            </header>
            <label className="mt-4 flex items-center gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggle(e.target.checked)}
                    className="rounded-sm border-gray-300 text-brand focus:ring-brand"
                />
                Use the step-by-step wizard when I click "Add job"
            </label>
        </section>
    );
}
```

Open `resources/js/Pages/Profile/Edit.tsx`, find where the existing partials (for example `UpdateProfileInformationForm`) are rendered inside their card wrappers, and add another card with `<ApplyWizardPreferenceForm prefersApplyWizard={prefersApplyWizard} />` using the same wrapper markup as its neighbors. Add `prefersApplyWizard: boolean` to the page props. In `ProfileController::edit` add `'prefersApplyWizard' => (bool) $request->user()->prefers_apply_wizard,` to the Inertia props.

- [ ] **Step 7: Build, full tests, commit**

Run: `npm run build && php artisan test`
Expected: clean build; full suite green.

```bash
./vendor/bin/pint --dirty
git add app/Http/Controllers/ApplyWizardController.php app/Http/Controllers/ProfileController.php routes/web.php resources/js/Pages/Apply/Wizard.tsx resources/js/Pages/Jobs/Kanban.tsx resources/js/Pages/Profile/Edit.tsx resources/js/Pages/Profile/Partials/ApplyWizardPreferenceForm.tsx tests/Feature/ApplyWizardTest.php
git commit -m "Add skippable apply wizard and wizard preference toggle"
```

---

### Task 10: Live browser verification, docs, ledger

**Files:**
- Modify: `CLAUDE.md` (Architecture: add "Apply flow" paragraph), `PRODUCT.md` (Operating Context), `docs/UNFORGET.md` (no new deferrals unless found)

- [ ] **Step 1: Run the app**

Run: `composer run dev` (or confirm Herd is serving `resumegen.test`). Log in as a seeded user.

- [ ] **Step 2: Drive each surface and record what you saw**

Check every line and note any mismatch as a bug to fix before Step 3:

1. Dashboard shows "New resume" and "Add job" as equal buttons in Quick start. New account: "Add job" goes to `/apply/new`. After completing the wizard once, "Add job" opens the modal.
2. Wizard: Job step blocks Continue until company and role are typed. "Skip wizard" lands on the Kanban with the modal open and the typed values present.
3. Modal: pick a base resume, paste a JD, submit. You land on the Workstation of a new version titled "Company – Role". Optimize panel already shows the JD and keyword overlap. Header shows the chip "Company – Role · Saved".
4. Change the chip's status to Applied. Reload. Kanban card is in Applied, card shows the resume title and score and "Open resume" returns to the same Workstation. Kanban URL with `?highlight=<id>` from the chip link shows a ring on that card.
5. Set a follow-up date in the past on a Saved card. Dashboard "Next up" lists it and the link highlights the card.
6. First-week checklist shows on a fresh account, ticks steps as they complete, hides on dismiss, and stays hidden after reload.
7. Compare page for the group shows a status pill on the tailored version.
8. Desktop width (1440px): Quick start buttons align, chip does not wrap the header onto a third line. Phone width (400px): modal and wizard usable.

- [ ] **Step 3: Docs**

In `CLAUDE.md` under "### Frontend page structure" add:

```markdown
**Apply flow (2026-09-15):** "Add job" is an entry point equal to "New resume". `App\Actions\CreateJobApplication` creates the Kanban card and, when `base_resume_id` is given, a tailored sibling version (same `ResumeGroup`, title "Company – Role", JD stored in `target_job_description`) and sets `job_applications.resume_id`. Web (`JobApplicationController@store`) and extension (`ExtensionController@jobApplicationStore`) both call it. Surfaces: `Components/jobs/add-job-modal.tsx` (Dashboard + Kanban), `Pages/Apply/Wizard.tsx` at `/apply/new` (skippable; `users.prefers_apply_wizard` decides which the Dashboard CTA opens), Workstation header `application-chip`, Dashboard `next-up-strip` and `first-week-checklist` (`users.dismissed_checklist_at`). AI tailoring is Part 2 of the spec and is not wired yet.
```

In `PRODUCT.md` Operating Context, after the "Applying:" bullet add: "Add job creates the card and a tailored resume version from a user-picked base in one step; Dashboard shows Next up items and a first-week checklist."

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md PRODUCT.md
git commit -m "Document the apply flow (Part 1)"
```

---

## Self-review

**Spec coverage (Part 1 scope):**
- Section 1 entry points, wizard, preference: Tasks 7, 9. ✔
- Section 2 modal fields except `tailor_with_ai`/`tailor_mode` (Part 2), one endpoint, tailored version, extension parity, FK check (already `nullOnDelete`, verified): Tasks 2, 3, 4. ✔
- Section 4 cross-links (Kanban card, Workstation chip with status, Compare status), Next up (three of four kinds; `pending_suggestions` is Part 2), checklist, wizard: Tasks 4, 5, 6, 7, 8, 9. ✔
- Section 5 tests listed for non-AI items, live verification, docs: every task has tests; Task 10. ✔
- Not in this plan by design: `resume_ai_suggestions`, prompt config, `TailorResumeJob`, review panel, Optimize upsell card, credit reservation. All in Part 2.

**Placeholder scan:** none. Two conditional instructions remain ("if `Experience::factory()` does not exist", "if `JobApplicationInterview::jobApplication()` is missing") with the exact fallback code given.

**Type consistency:** `ResumeOption { id, title, score }` is used identically in Tasks 4, 7, 9. `LinkedApplication` in Task 5 matches the `application` prop. `NextUpItem.kind` includes `pending_suggestions` so Part 2 adds no type change. Route names: `apply.wizard`, `apply-wizard.preference`, `checklist.dismiss` are consistent across Tasks 4, 7, 8, 9.
