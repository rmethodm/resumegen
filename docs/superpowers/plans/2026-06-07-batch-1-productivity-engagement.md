# Batch 1 — Productivity & Engagement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement follow-up reminders, resume versioning, grammar/spell check, and a full resume strength score panel with history tracking.

**Architecture:** Four independent features, each self-contained. Follow-up reminders extend `job_applications` + scheduler. Resume versioning adds a self-referential FK on `resumes` with a sidebar panel in the editor. Spell check is pure client-side (Typo.js, offline dictionary). Strength score extends the existing `ResumeStrengthScorer` service, adds a snapshot table, and renders a collapsible panel in the editor with a hand-rolled SVG sparkline (no new chart library).

**Tech Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, SQLite, PHPUnit 12. 376 tests passing at baseline.

---

## File Map

**Task 1 — Follow-up Reminders: DB + Model**
- Create: `database/migrations/TIMESTAMP_add_follow_up_at_to_job_applications_table.php`
- Modify: `app/Models/JobApplication.php`
- Modify: `app/Http/Controllers/JobApplicationController.php`
- Modify: `resources/js/types/index.d.ts`
- Create: `tests/Feature/FollowUpReminderTest.php` (stub, filled in Task 2)

**Task 2 — Follow-up Reminders: Mail & Scheduler**
- Create: `app/Mail/FollowUpReminderMail.php`
- Create: `resources/views/mail/follow-up-reminder.blade.php`
- Create: `app/Console/Commands/SendFollowUpReminders.php`
- Modify: `bootstrap/app.php`
- Fill: `tests/Feature/FollowUpReminderTest.php`

**Task 3 — Follow-up Reminders: Frontend**
- Modify: `resources/js/Pages/Jobs/Edit.tsx`
- Modify: `resources/js/Pages/Jobs/Index.tsx`

**Task 4 — Resume Versioning: DB + Model**
- Create: `database/migrations/TIMESTAMP_add_versioning_to_resumes_table.php`
- Modify: `app/Models/Resume.php`
- Modify: `app/Services/UserLimits.php`
- Create: `tests/Feature/ResumeVersioningTest.php` (stub)

**Task 5 — Resume Versioning: Backend**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `routes/web.php`
- Fill: `tests/Feature/ResumeVersioningTest.php`

**Task 6 — Resume Versioning: Frontend**
- Modify: `resources/js/types/index.d.ts`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

**Task 7 — Grammar/Spell Check**
- Install: `typo-js` npm package
- Copy: `public/dictionaries/en_US.aff` + `public/dictionaries/en_US.dic`
- Create: `resources/js/hooks/useSpellCheck.ts`
- Create: `resources/js/Components/SpellBadge.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

**Task 8 — Strength Score Panel: Backend**
- Modify: `app/Services/ResumeStrengthScorer.php`
- Create: `database/migrations/TIMESTAMP_create_resume_strength_snapshots_table.php`
- Create: `app/Models/ResumeStrengthSnapshot.php`
- Create: `app/Http/Controllers/StrengthScoreController.php`
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Create: `tests/Feature/StrengthScorePanelTest.php`

**Task 9 — Strength Score Panel: Frontend**
- Modify: `resources/js/types/index.d.ts`
- Create: `resources/js/Pages/ResumeBuilder/Partials/StrengthScorePanel.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

**Task 10 — Final Verification**
- Full test suite + build

---

## Task 1: Follow-up Reminders — DB + Model

**Files:**
- Create: migration
- Modify: `app/Models/JobApplication.php`
- Modify: `app/Http/Controllers/JobApplicationController.php`
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Create the migration**

```bash
php artisan make:migration add_follow_up_at_to_job_applications_table --no-interaction
```

Open the generated file in `database/migrations/` and replace its `up()` and `down()` with:

```php
public function up(): void
{
    Schema::table('job_applications', function (Blueprint $table): void {
        $table->date('follow_up_at')->nullable()->after('applied_at');
    });
}

public function down(): void
{
    Schema::table('job_applications', function (Blueprint $table): void {
        $table->dropColumn('follow_up_at');
    });
}
```

- [ ] **Step 2: Run the migration**

```bash
php artisan migrate --no-interaction
```

Expected: `Migrating: TIMESTAMP_add_follow_up_at_to_job_applications_table` then `Migrated`.

- [ ] **Step 3: Update `app/Models/JobApplication.php`**

Add `'follow_up_at'` to `$fillable` and add it to `$casts`:

```php
protected $fillable = [
    'user_id', 'resume_id', 'company', 'role', 'status',
    'applied_at', 'follow_up_at', 'notes', 'job_url',
];

protected $casts = [
    'applied_at'    => 'date',
    'follow_up_at'  => 'date',
];
```

- [ ] **Step 4: Update `validateData()` in `app/Http/Controllers/JobApplicationController.php`**

Add `follow_up_at` to the validation rules array inside `validateData()`:

```php
'follow_up_at' => ['sometimes', 'nullable', 'date'],
```

Also update the `index()` query to include `follow_up_at` in the selected columns:

```php
$applications = $user
    ->jobApplications()
    ->with('resume:id,name')
    ->orderByDesc('updated_at')
    ->get([
        'id', 'company', 'role', 'status', 'resume_id',
        'applied_at', 'follow_up_at', 'job_url', 'updated_at',
    ]);
```

- [ ] **Step 5: Update TypeScript types in `resources/js/types/index.d.ts`**

Add `follow_up_at` to both `JobApplicationRow` and `JobApplication` interfaces:

```ts
export interface JobApplicationRow {
    id: number;
    company: string;
    role: string;
    status: JobStatus;
    resume_id: number | null;
    resume?: { id: number; name: string } | null;
    applied_at: string | null;
    follow_up_at: string | null;
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
    follow_up_at: string | null;
    notes: string | null;
    job_url: string | null;
    created_at: string;
    updated_at: string;
}
```

- [ ] **Step 6: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 7: Commit**

```bash
git add database/migrations app/Models/JobApplication.php app/Http/Controllers/JobApplicationController.php resources/js/types/index.d.ts
git commit -m "feat: add follow_up_at to job_applications — migration, model, validation, TS types"
```

---

## Task 2: Follow-up Reminders — Mail & Scheduler

**Files:**
- Create: `app/Mail/FollowUpReminderMail.php`
- Create: `resources/views/mail/follow-up-reminder.blade.php`
- Create: `app/Console/Commands/SendFollowUpReminders.php`
- Modify: `bootstrap/app.php`
- Create: `tests/Feature/FollowUpReminderTest.php`

- [ ] **Step 1: Create the failing test**

```bash
php artisan make:test FollowUpReminderTest --no-interaction
```

Replace the contents of `tests/Feature/FollowUpReminderTest.php` with:

```php
<?php

namespace Tests\Feature;

use App\Mail\FollowUpReminderMail;
use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class FollowUpReminderTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_sends_mail_for_todays_followups(): void
    {
        Mail::fake();

        $user = User::factory()->create(['email' => 'test@example.com']);
        JobApplication::factory()->create([
            'user_id'      => $user->id,
            'company'      => 'Acme Corp',
            'role'         => 'Engineer',
            'status'       => 'applied',
            'follow_up_at' => now()->toDateString(),
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertQueued(FollowUpReminderMail::class, function ($mail) use ($user) {
            return $mail->hasTo($user->email);
        });
    }

    public function test_command_does_not_send_for_future_followups(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        JobApplication::factory()->create([
            'user_id'      => $user->id,
            'follow_up_at' => now()->addDay()->toDateString(),
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_command_does_not_send_for_past_followups(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        JobApplication::factory()->create([
            'user_id'      => $user->id,
            'follow_up_at' => now()->subDay()->toDateString(),
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_command_does_not_send_when_no_follow_up_date(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        JobApplication::factory()->create([
            'user_id'      => $user->id,
            'follow_up_at' => null,
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertNothingQueued();
    }

    public function test_sends_one_mail_per_application_not_per_user(): void
    {
        Mail::fake();

        $user = User::factory()->create();
        JobApplication::factory()->count(3)->create([
            'user_id'      => $user->id,
            'follow_up_at' => now()->toDateString(),
        ]);

        $this->artisan('app:send-followup-reminders')->assertSuccessful();

        Mail::assertQueuedCount(3);
    }
}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
php artisan test --compact tests/Feature/FollowUpReminderTest.php
```

Expected: command not found / class not found errors.

- [ ] **Step 3: Create `app/Mail/FollowUpReminderMail.php`**

```bash
php artisan make:mail FollowUpReminderMail --no-interaction
```

Replace the generated file contents with:

```php
<?php

namespace App\Mail;

use App\Models\JobApplication;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FollowUpReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly JobApplication $application,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Follow up on your application to {$this->application->company}",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.follow-up-reminder',
        );
    }
}
```

- [ ] **Step 4: Create the mail view at `resources/views/mail/follow-up-reminder.blade.php`**

```blade
<x-mail::message>
# Follow up on {{ $application->company }}

A reminder to follow up on your **{{ $application->role }}** application at **{{ $application->company }}**.

Today is a good day to send a brief, polite check-in email to the hiring team.

@if($application->notes)
<x-mail::panel>
**Your notes:** {{ $application->notes }}
</x-mail::panel>
@endif

<x-mail::button :url="route('jobs.edit', $application->id)">
View Application
</x-mail::button>

Good luck!
</x-mail::message>
```

- [ ] **Step 5: Create the Artisan command**

```bash
php artisan make:command SendFollowUpReminders --no-interaction
```

Replace the generated `app/Console/Commands/SendFollowUpReminders.php` with:

```php
<?php

namespace App\Console\Commands;

use App\Mail\FollowUpReminderMail;
use App\Models\JobApplication;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendFollowUpReminders extends Command
{
    protected $signature = 'app:send-followup-reminders';

    protected $description = 'Send follow-up reminder emails for job applications due today';

    public function handle(): int
    {
        $applications = JobApplication::with('user')
            ->whereDate('follow_up_at', today())
            ->get();

        foreach ($applications as $application) {
            Mail::to($application->user->email)
                ->queue(new FollowUpReminderMail($application));
        }

        $this->info("Sent {$applications->count()} follow-up reminder(s).");

        return self::SUCCESS;
    }
}
```

- [ ] **Step 6: Register the scheduler in `bootstrap/app.php`**

Add the `withSchedule` call and imports. Replace the `return Application::configure(...)` block with:

```php
use App\Console\Commands\SendFollowUpReminders;
use Illuminate\Console\Scheduling\Schedule;
```

Add these two `use` lines at the top of `bootstrap/app.php` (after the existing `use` statements), then add `->withSchedule()` before `->withExceptions()`:

```php
->withSchedule(function (Schedule $schedule): void {
    $schedule->command(SendFollowUpReminders::class)->dailyAt('08:00');
})
```

The full `bootstrap/app.php` should look like:

```php
<?php

use App\Console\Commands\SendFollowUpReminders;
use App\Http\Middleware\EnsureMasterAdmin;
use App\Http\Middleware\EnsureTwoFactorSetup;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequiresTwoFactorChallenge;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'master_admin'          => EnsureMasterAdmin::class,
            'two_factor_challenge'  => RequiresTwoFactorChallenge::class,
            'two_factor_setup'      => EnsureTwoFactorSetup::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'stripe/webhook',
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command(SendFollowUpReminders::class)->dailyAt('08:00');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
```

- [ ] **Step 7: Update `JobApplicationFactory` to include `follow_up_at`**

Open `database/factories/JobApplicationFactory.php` and check that `follow_up_at` defaults to `null` (it's nullable so nothing may need changing, but ensure the factory definition has a sensible default):

```php
public function definition(): array
{
    return [
        'user_id'      => User::factory(),
        'company'      => $this->faker->company(),
        'role'         => $this->faker->jobTitle(),
        'status'       => 'applied',
        'applied_at'   => $this->faker->dateTimeBetween('-3 months', 'now')->format('Y-m-d'),
        'follow_up_at' => null,
        'notes'        => null,
        'job_url'      => null,
        'resume_id'    => null,
    ];
}
```

- [ ] **Step 8: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 9: Run the tests**

```bash
php artisan test --compact tests/Feature/FollowUpReminderTest.php
```

Expected: all 5 tests green.

- [ ] **Step 10: Commit**

```bash
git add app/Mail/FollowUpReminderMail.php resources/views/mail/follow-up-reminder.blade.php app/Console/Commands/SendFollowUpReminders.php bootstrap/app.php database/factories/JobApplicationFactory.php tests/Feature/FollowUpReminderTest.php
git commit -m "feat: follow-up reminders — mail, artisan command, daily scheduler"
```

---

## Task 3: Follow-up Reminders — Frontend

**Files:**
- Modify: `resources/js/Pages/Jobs/Edit.tsx`
- Modify: `resources/js/Pages/Jobs/Index.tsx`

- [ ] **Step 1: Add the follow-up date field to `resources/js/Pages/Jobs/Edit.tsx`**

In the `useForm` initialization, add `follow_up_at`:

```tsx
const form = useForm({
    company:      application.company,
    role:         application.role,
    status:       application.status,
    resume_id:    (application.resume_id ?? '') as number | '',
    applied_at:   application.applied_at ?? '',
    follow_up_at: application.follow_up_at ?? '',
    job_url:      application.job_url ?? '',
    notes:        application.notes ?? '',
});
```

In the `submit` handler's `form.transform`, add `follow_up_at`:

```tsx
form.transform(data => ({
    ...data,
    resume_id:    data.resume_id === '' ? null : data.resume_id,
    applied_at:   data.applied_at || null,
    follow_up_at: data.follow_up_at || null,
    job_url:      data.job_url || null,
    notes:        data.notes || null,
}));
```

Find the section where `applied_at` is rendered and add the follow-up date field immediately after it:

```tsx
<div className="grid grid-cols-2 gap-4">
    <div>
        <label className={labelCls}>Applied Date</label>
        <input
            type="date"
            value={form.data.applied_at}
            onChange={e => form.setData('applied_at', e.target.value)}
            className={inputCls}
        />
    </div>
    <div>
        <label className={labelCls}>Follow-up Date</label>
        <input
            type="date"
            value={form.data.follow_up_at}
            onChange={e => form.setData('follow_up_at', e.target.value)}
            className={inputCls}
        />
        {form.data.follow_up_at && (
            <p className="mt-1 text-xs text-gray-400">
                Reminder email will be sent on this date.
            </p>
        )}
    </div>
</div>
```

- [ ] **Step 2: Show follow-up date in `resources/js/Pages/Jobs/Index.tsx`**

Find the table header row and add a "Follow-up" column header after "Applied":

```tsx
<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#a0a0b0]">Follow-up</th>
```

In the table body row for each application, add the follow-up cell after the "Applied" cell:

```tsx
<td className="px-4 py-3 text-sm text-gray-600">
    {app.follow_up_at ? (
        <span className={
            new Date(app.follow_up_at) < new Date(new Date().toDateString())
                ? 'font-medium text-amber-600'
                : 'text-gray-600'
        }>
            {new Date(app.follow_up_at).toLocaleDateString()}
        </span>
    ) : (
        <span className="text-[#d0d0e0]">—</span>
    )}
</td>
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: zero TypeScript errors, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Jobs/Edit.tsx resources/js/Pages/Jobs/Index.tsx
git commit -m "feat: follow-up date picker in job edit, overdue indicator in job tracker index"
```

---

## Task 4: Resume Versioning — DB + Model

**Files:**
- Create: migration
- Modify: `app/Models/Resume.php`
- Modify: `app/Services/UserLimits.php`

- [ ] **Step 1: Create the failing test stub**

```bash
php artisan make:test ResumeVersioningTest --no-interaction
```

Replace `tests/Feature/ResumeVersioningTest.php` with the following (will be filled with real assertions in Task 5):

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeVersioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_snapshots_excluded_from_resume_limit_count(): void
    {
        $user = User::factory()->free()->create();

        Resume::factory()->count(5)->create(['user_id' => $user->id]);
        $parent = $user->resumes()->first();
        Resume::factory()->create([
            'user_id'          => $user->id,
            'parent_resume_id' => $parent->id,
            'is_snapshot'      => true,
        ]);

        $nonSnapshotCount = $user->resumes()->where('is_snapshot', false)->count();
        $this->assertEquals(5, $nonSnapshotCount);
        $this->assertTrue(UserLimits::resumeLimit($user) !== null && $nonSnapshotCount <= UserLimits::resumeLimit($user));
    }
}
```

- [ ] **Step 2: Run the test to confirm it fails (column not found)**

```bash
php artisan test --compact tests/Feature/ResumeVersioningTest.php
```

Expected: error about unknown column `is_snapshot`.

- [ ] **Step 3: Create the migration**

```bash
php artisan make:migration add_versioning_to_resumes_table --no-interaction
```

Replace the migration body with:

```php
public function up(): void
{
    Schema::table('resumes', function (Blueprint $table): void {
        $table->foreignId('parent_resume_id')->nullable()->after('user_id')
            ->constrained('resumes')->nullOnDelete();
        $table->boolean('is_snapshot')->default(false)->after('parent_resume_id');
    });
}

public function down(): void
{
    Schema::table('resumes', function (Blueprint $table): void {
        $table->dropForeign(['parent_resume_id']);
        $table->dropColumn(['parent_resume_id', 'is_snapshot']);
    });
}
```

- [ ] **Step 4: Run the migration**

```bash
php artisan migrate --no-interaction
```

- [ ] **Step 5: Update `app/Models/Resume.php`**

Add `parent_resume_id` and `is_snapshot` to `$fillable`, add `is_snapshot` to `$casts`, and add the `snapshots()` relationship:

```php
protected $fillable = [
    'user_id', 'parent_resume_id', 'is_snapshot',
    'name', 'pdf_filename', 'template',
    'accent_color', 'font_family',
    'contact', 'summary', 'experience', 'education',
    'skills', 'certifications', 'font_sizes',
    'ats_cache', 'ats_cached_at',
    'section_order', 'custom_sections',
];

protected $casts = [
    'contact'        => 'array',
    'experience'     => 'array',
    'education'      => 'array',
    'skills'         => 'array',
    'certifications' => 'array',
    'font_sizes'     => 'array',
    'ats_cache'      => 'array',
    'ats_cached_at'  => 'datetime',
    'section_order'  => 'array',
    'custom_sections' => 'array',
    'is_snapshot'    => 'boolean',
];
```

Add the `snapshots()` relationship method to the class:

```php
public function snapshots(): HasMany
{
    return $this->hasMany(Resume::class, 'parent_resume_id')->orderByDesc('created_at');
}
```

- [ ] **Step 6: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 7: Run the test**

```bash
php artisan test --compact tests/Feature/ResumeVersioningTest.php
```

Expected: green.

- [ ] **Step 8: Run the full suite to confirm no regressions**

```bash
php artisan test --compact
```

Expected: all green (376+ tests).

- [ ] **Step 9: Commit**

```bash
git add database/migrations app/Models/Resume.php tests/Feature/ResumeVersioningTest.php
git commit -m "feat: add parent_resume_id + is_snapshot columns for resume versioning"
```

---

## Task 5: Resume Versioning — Backend

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `routes/web.php`
- Fill: `tests/Feature/ResumeVersioningTest.php`

- [ ] **Step 1: Add `saveVersion()` to `ResumeBuilderController`**

Add this method to `app/Http/Controllers/ResumeBuilderController.php` (before the `destroy` method):

```php
public function saveVersion(Request $request, Resume $resume): \Illuminate\Http\RedirectResponse
{
    $this->authorize('update', $resume);

    $validated = $request->validate([
        'name' => ['nullable', 'string', 'max:255'],
    ]);

    $snapshotName = $validated['name']
        ?? $resume->name.' — '.now()->format('M j, Y');

    $snapshot = $resume->replicate(['id', 'created_at', 'updated_at']);
    $snapshot->name = $snapshotName;
    $snapshot->parent_resume_id = $resume->id;
    $snapshot->is_snapshot = true;
    $snapshot->save();

    return back()->with('versionSaved', $snapshotName);
}
```

Also update the `edit()` method to pass the snapshot list as an Inertia prop. Find where `Inertia::render('ResumeBuilder/Edit', [...])` is called and add `'snapshots'` to the props array:

```php
'snapshots' => $resume->snapshots()->get(['id', 'name', 'created_at'])->map(fn ($s) => [
    'id'         => $s->id,
    'name'       => $s->name,
    'created_at' => $s->created_at->toDateString(),
]),
```

- [ ] **Step 2: Add the route in `routes/web.php`**

Find the `builder.*` route group and add after the `builder.duplicate` route:

```php
Route::post('/builder/{resume}/versions', [ResumeBuilderController::class, 'saveVersion'])
    ->name('builder.save-version');
```

- [ ] **Step 3: Add more tests to `tests/Feature/ResumeVersioningTest.php`**

Replace the file with the full test suite:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeVersioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_snapshots_excluded_from_resume_limit_count(): void
    {
        $user = User::factory()->free()->create();

        Resume::factory()->count(5)->create(['user_id' => $user->id]);
        $parent = $user->resumes()->first();
        Resume::factory()->create([
            'user_id'          => $user->id,
            'parent_resume_id' => $parent->id,
            'is_snapshot'      => true,
        ]);

        $nonSnapshotCount = $user->resumes()->where('is_snapshot', false)->count();
        $this->assertEquals(5, $nonSnapshotCount);
        $this->assertTrue(UserLimits::resumeLimit($user) >= $nonSnapshotCount);
    }

    public function test_save_version_creates_snapshot(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'name' => 'My Resume']);

        $response = $this->actingAs($user)->post(route('builder.save-version', $resume), [
            'name' => 'My Resume — Acme Application',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('resumes', [
            'user_id'          => $user->id,
            'parent_resume_id' => $resume->id,
            'is_snapshot'      => true,
            'name'             => 'My Resume — Acme Application',
        ]);
    }

    public function test_save_version_auto_names_if_no_name_given(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id, 'name' => 'Dev Resume']);

        $this->actingAs($user)->post(route('builder.save-version', $resume));

        $snapshot = Resume::where('parent_resume_id', $resume->id)->first();
        $this->assertNotNull($snapshot);
        $this->assertStringContainsString('Dev Resume', $snapshot->name);
    }

    public function test_cannot_save_version_of_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->post(route('builder.save-version', $resume));

        $response->assertStatus(403);
        $this->assertDatabaseCount('resumes', 1);
    }

    public function test_snapshot_is_excluded_from_resume_index(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        Resume::factory()->create([
            'user_id'          => $user->id,
            'parent_resume_id' => $resume->id,
            'is_snapshot'      => true,
        ]);

        $this->actingAs($user)->get(route('builder.index'))
            ->assertInertia(fn ($page) => $page->has('resumes', 1));
    }

    public function test_edit_page_includes_snapshots_prop(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        Resume::factory()->create([
            'user_id'          => $user->id,
            'parent_resume_id' => $resume->id,
            'is_snapshot'      => true,
            'name'             => 'My Resume — v1',
        ]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume));

        $response->assertInertia(fn ($page) => $page
            ->has('snapshots', 1)
            ->where('snapshots.0.name', 'My Resume — v1')
        );
    }
}
```

- [ ] **Step 4: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 5: Run the tests**

```bash
php artisan test --compact tests/Feature/ResumeVersioningTest.php
```

Expected: all green. (The `test_snapshot_is_excluded_from_resume_index` test may fail if the index query doesn't filter — fix by adding `.where('is_snapshot', false)` to the resumes query in `ResumeBuilderController::index()`.)

If `index()` needs fixing, find `$user->resumes()` in `ResumeBuilderController::index()` and add:

```php
->where('is_snapshot', false)
```

- [ ] **Step 6: Commit**

```bash
git add app/Http/Controllers/ResumeBuilderController.php routes/web.php tests/Feature/ResumeVersioningTest.php
git commit -m "feat: saveVersion endpoint creates resume snapshot; snapshots excluded from index"
```

---

## Task 6: Resume Versioning — Frontend

**Files:**
- Modify: `resources/js/types/index.d.ts`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add `ResumeSnapshot` type to `resources/js/types/index.d.ts`**

Add after `InterviewQuestion`:

```ts
export interface ResumeSnapshot {
    id: number;
    name: string;
    created_at: string;
}
```

- [ ] **Step 2: Wire versioning into `resources/js/Pages/ResumeBuilder/Edit.tsx`**

**2a.** Import `ResumeSnapshot` at the top:

```tsx
import type { ..., ResumeSnapshot } from '@/types';
```

**2b.** Add `snapshots` to the page props destructuring (alongside `canInterviewCoach`, etc.):

```tsx
snapshots: ResumeSnapshot[];
```

**2c.** Add state for the version panel and the save-version modal (near other panel state):

```tsx
const [showVersions, setShowVersions] = useState(false);
const [versionName, setVersionName] = useState('');
const [savingVersion, setSavingVersion] = useState(false);
```

**2d.** Add a `handleSaveVersion` function:

```tsx
const handleSaveVersion = () => {
    setSavingVersion(true);
    router.post(
        route('builder.save-version', resume.id),
        { name: versionName || undefined },
        {
            onFinish: () => { setSavingVersion(false); setVersionName(''); },
        },
    );
};
```

**2e.** In the left sidebar, add a "Versions" collapsible section. Find where the ATS Score or Interview Coach sections are in the sidebar and add this block after them:

```tsx
{/* Version History */}
<div className="border-t border-gray-100 pt-3">
    <button
        type="button"
        onClick={() => setShowVersions(v => !v)}
        className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
    >
        <span>Versions {snapshots.length > 0 && `(${snapshots.length})`}</span>
        <span>{showVersions ? '−' : '+'}</span>
    </button>

    {showVersions && (
        <div className="mt-2 space-y-2">
            {/* Save current version */}
            <div className="flex gap-1">
                <input
                    type="text"
                    placeholder="Version name (optional)"
                    value={versionName}
                    onChange={e => setVersionName(e.target.value)}
                    className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:border-indigo-400 focus:outline-none"
                />
                <button
                    type="button"
                    onClick={handleSaveVersion}
                    disabled={savingVersion}
                    className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                    {savingVersion ? '…' : 'Save'}
                </button>
            </div>

            {/* List of existing snapshots */}
            {snapshots.length === 0 ? (
                <p className="text-xs text-gray-400">No saved versions yet.</p>
            ) : (
                <ul className="space-y-1">
                    {snapshots.map(snap => (
                        <li key={snap.id} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5">
                            <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-gray-700">{snap.name}</p>
                                <p className="text-xs text-gray-400">{snap.created_at}</p>
                            </div>
                            <button
                                type="button"
                                title="Restore as editable copy"
                                onClick={() => router.post(route('builder.duplicate', snap.id))}
                                className="ml-2 shrink-0 text-xs text-indigo-600 hover:underline"
                            >
                                Copy
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )}
</div>
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: zero TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/types/index.d.ts resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: resume versioning sidebar — save version, list snapshots, restore as copy"
```

---

## Task 7: Grammar / Spell Check

**Files:**
- Install: `typo-js`
- Create: `public/dictionaries/en_US.aff` + `en_US.dic`
- Create: `resources/js/hooks/useSpellCheck.ts`
- Create: `resources/js/Components/SpellBadge.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Install typo-js**

```bash
npm install typo-js
npm install --save-dev @types/typo-js
```

- [ ] **Step 2: Copy dictionary files to public/**

```bash
mkdir -p public/dictionaries
cp node_modules/typo-js/typo/dictionaries/en_US/en_US.aff public/dictionaries/
cp node_modules/typo-js/typo/dictionaries/en_US/en_US.dic public/dictionaries/
```

Verify they exist:

```bash
ls -lh public/dictionaries/
```

Expected: `en_US.aff` (~50 KB) and `en_US.dic` (~1.5 MB).

- [ ] **Step 3: Create `resources/js/hooks/useSpellCheck.ts`**

Create `resources/js/hooks/` directory if needed, then create the file:

```ts
import Typo from 'typo-js';
import { useCallback, useEffect, useRef, useState } from 'react';

let typoInstance: Typo | null = null;
let loadingPromise: Promise<Typo> | null = null;

async function getTypo(): Promise<Typo> {
    if (typoInstance) return typoInstance;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
        const [aff, dic] = await Promise.all([
            fetch('/dictionaries/en_US.aff').then(r => r.text()),
            fetch('/dictionaries/en_US.dic').then(r => r.text()),
        ]);
        typoInstance = new Typo('en_US', aff, dic, { platform: 'any' });
        return typoInstance;
    })();

    return loadingPromise;
}

export function useSpellCheck(text: string, debounceMs = 300): string[] {
    const [misspelled, setMisspelled] = useState<string[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const check = useCallback(async (value: string) => {
        const typo = await getTypo();
        const words = value.match(/\b[a-zA-Z']{2,}\b/g) ?? [];
        const bad = words.filter(w => !typo.check(w));
        setMisspelled([...new Set(bad)]);
    }, []);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => check(text), debounceMs);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [text, debounceMs, check]);

    return misspelled;
}
```

- [ ] **Step 4: Create `resources/js/Components/SpellBadge.tsx`**

```tsx
import { useState } from 'react';

interface Props {
    words: string[];
}

export default function SpellBadge({ words }: Props) {
    const [open, setOpen] = useState(false);

    if (words.length === 0) return null;

    const badgeClass = words.length <= 3
        ? 'bg-amber-100 text-amber-700 border-amber-200'
        : 'bg-red-100 text-red-700 border-red-200';

    return (
        <div className="relative mt-1 inline-block">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClass}`}
            >
                {words.length} misspelled
            </button>
            {open && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                    <div className="absolute left-0 z-20 mt-1 max-w-xs rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                        <p className="mb-1.5 text-xs font-semibold text-gray-600">Possible misspellings:</p>
                        <ul className="space-y-0.5">
                            {words.map(w => (
                                <li key={w} className="text-xs text-red-600">{w}</li>
                            ))}
                        </ul>
                    </div>
                </>
            )}
        </div>
    );
}
```

- [ ] **Step 5: Wire spell check into `resources/js/Pages/ResumeBuilder/Edit.tsx`**

**5a.** Add imports near the top of `Edit.tsx`:

```tsx
import SpellBadge from '@/Components/SpellBadge';
import { useSpellCheck } from '@/hooks/useSpellCheck';
```

**5b.** Add spell-check hooks for the summary field (at module level inside the component, near other state):

```tsx
const summarySepll = useSpellCheck(summary ?? '');
```

**5c.** Find where the Summary textarea is rendered and add `<SpellBadge>` immediately below it:

```tsx
<SpellBadge words={summarySepll} />
```

**5d.** For experience bullets — add a `useSpellCheck` call per entry. Since the number of entries is dynamic, collect all bullet text into one joined string for a single hook call:

```tsx
const allBullets = (experience ?? []).map(e => e.bullets ?? '').join(' ');
const bulletSpell = useSpellCheck(allBullets);
```

Add a badge below the entire Experience section (not per-entry, to keep hook count stable):

```tsx
{bulletSpell.length > 0 && (
    <div className="mt-1">
        <SpellBadge words={bulletSpell} />
    </div>
)}
```

- [ ] **Step 6: Build**

```bash
npm run build
```

Expected: zero TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add public/dictionaries resources/js/hooks/useSpellCheck.ts resources/js/Components/SpellBadge.tsx resources/js/Pages/ResumeBuilder/Edit.tsx package.json package-lock.json
git commit -m "feat: client-side spell check (Typo.js en_US) with badge UI on summary and bullets"
```

---

## Task 8: Strength Score Panel — Backend

**Files:**
- Modify: `app/Services/ResumeStrengthScorer.php`
- Create: migration
- Create: `app/Models/ResumeStrengthSnapshot.php`
- Create: `app/Http/Controllers/StrengthScoreController.php`
- Modify: `routes/web.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Create: `tests/Feature/StrengthScorePanelTest.php`

- [ ] **Step 1: Create the failing test**

```bash
php artisan make:test StrengthScorePanelTest --no-interaction
```

Replace `tests/Feature/StrengthScorePanelTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeStrengthSnapshot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StrengthScorePanelTest extends TestCase
{
    use RefreshDatabase;

    public function test_endpoint_returns_score_and_checklist(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create([
            'user_id' => $user->id,
            'summary' => 'Experienced engineer.',
            'contact' => ['full_name' => 'Jane', 'email' => 'j@e.com', 'location' => 'NYC', 'phone' => '', 'linkedin' => '', 'website' => ''],
        ]);

        $response = $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'score',
            'checklist' => [['label', 'pts', 'passed']],
        ]);
    }

    public function test_snapshot_saved_on_first_call(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->assertDatabaseCount('resume_strength_snapshots', 0);

        $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $this->assertDatabaseCount('resume_strength_snapshots', 1);
    }

    public function test_snapshot_not_saved_when_score_unchanged(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)->get(route('builder.strength-score', $resume));
        $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $this->assertDatabaseCount('resume_strength_snapshots', 1);
    }

    public function test_snapshot_saved_when_score_changes_by_5_or_more(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        ResumeStrengthSnapshot::create([
            'resume_id' => $resume->id,
            'score'     => 20,
            'checklist' => [],
        ]);

        $resume->update(['summary' => 'Full professional summary here.']);

        $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $this->assertDatabaseCount('resume_strength_snapshots', 2);
    }

    public function test_history_is_null_for_free_users(): void
    {
        $user = User::factory()->free()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $response->assertJsonPath('history', null);
    }

    public function test_history_returned_for_starter_users(): void
    {
        $user = User::factory()->starter()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        ResumeStrengthSnapshot::create(['resume_id' => $resume->id, 'score' => 40, 'checklist' => []]);
        ResumeStrengthSnapshot::create(['resume_id' => $resume->id, 'score' => 60, 'checklist' => []]);

        $response = $this->actingAs($user)->get(route('builder.strength-score', $resume));

        $this->assertIsArray($response->json('history'));
        $this->assertGreaterThanOrEqual(2, count($response->json('history')));
    }

    public function test_cannot_score_another_users_resume(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $response = $this->actingAs($other)->get(route('builder.strength-score', $resume));

        $response->assertStatus(403);
    }
}
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
php artisan test --compact tests/Feature/StrengthScorePanelTest.php
```

Expected: route not found / class not found.

- [ ] **Step 3: Extend `app/Services/ResumeStrengthScorer.php` to return checklist**

Replace the `score()` method return statement. The method already builds a `$tips` array — add a `$checklist` array built in parallel. Replace the entire file content:

```php
<?php

namespace App\Services;

use App\Models\Resume;

class ResumeStrengthScorer
{
    public static function score(Resume $resume): array
    {
        $points    = 0;
        $tips      = [];
        $checklist = [];
        $order     = 0;

        $contact        = $resume->contact ?? [];
        $experience     = $resume->experience ?? [];
        $education      = $resume->education ?? [];
        $skills         = $resume->skills ?? [];
        $certifications = $resume->certifications ?? [];
        $customSections = $resume->custom_sections ?? [];

        // Professional summary — 15pts
        $hasSummary = ! empty($resume->summary);
        $points += $hasSummary ? 15 : 0;
        $checklist[] = ['label' => 'Professional summary', 'pts' => 15, 'passed' => $hasSummary];
        if (! $hasSummary) {
            $tips[] = ['pts' => 15, 'order' => $order++, 'tip' => 'Add a professional summary'];
        }

        // Contact info complete — 15pts
        $hasContact = ! empty($contact['full_name']) && ! empty($contact['email']) && ! empty($contact['location']);
        $points += $hasContact ? 15 : 0;
        $checklist[] = ['label' => 'Contact info complete', 'pts' => 15, 'passed' => $hasContact];
        if (! $hasContact) {
            $tips[] = ['pts' => 15, 'order' => $order++, 'tip' => 'Complete your contact information'];
        }

        // At least 1 experience — 15pts
        $hasExp = count($experience) >= 1;
        $points += $hasExp ? 15 : 0;
        $checklist[] = ['label' => 'At least one work experience', 'pts' => 15, 'passed' => $hasExp];
        if (! $hasExp) {
            $tips[] = ['pts' => 15, 'order' => $order++, 'tip' => 'Add at least one work experience'];
        }

        // Education — 10pts
        $hasEdu = count($education) >= 1;
        $points += $hasEdu ? 10 : 0;
        $checklist[] = ['label' => 'Education', 'pts' => 10, 'passed' => $hasEdu];
        if (! $hasEdu) {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add your education'];
        }

        // At least 3 skills — 10pts
        $hasSkills = count($skills) >= 3;
        $points += $hasSkills ? 10 : 0;
        $checklist[] = ['label' => '3+ skills listed', 'pts' => 10, 'passed' => $hasSkills];
        if (! $hasSkills) {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add at least 3 skills'];
        }

        // Bullet with number or metric — 10pts
        $allBullets = collect($experience)
            ->flatMap(fn ($e) => array_filter(explode("\n", $e['bullets'] ?? '')))
            ->all();
        $hasMetric = collect($allBullets)->contains(fn ($b) => (bool) preg_match('/\d/', $b));
        $points += $hasMetric ? 10 : 0;
        $checklist[] = ['label' => 'Quantified bullet (number/metric)', 'pts' => 10, 'passed' => $hasMetric];
        if (! $hasMetric) {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add numbers or metrics to your bullets'];
        }

        // At least 2 experiences — 10pts
        $hasMultiExp = count($experience) >= 2;
        $points += $hasMultiExp ? 10 : 0;
        $checklist[] = ['label' => 'Two or more work experiences', 'pts' => 10, 'passed' => $hasMultiExp];
        if (! $hasMultiExp) {
            $tips[] = ['pts' => 10, 'order' => $order++, 'tip' => 'Add a second work experience'];
        }

        // LinkedIn URL — 5pts
        $hasLinkedIn = ! empty($contact['linkedin']);
        $points += $hasLinkedIn ? 5 : 0;
        $checklist[] = ['label' => 'LinkedIn URL', 'pts' => 5, 'passed' => $hasLinkedIn];
        if (! $hasLinkedIn) {
            $tips[] = ['pts' => 5, 'order' => $order++, 'tip' => 'Add your LinkedIn URL'];
        }

        // At least one experience with 3+ bullets — 5pts
        $hasRichBullets = collect($experience)
            ->contains(fn ($e) => count(array_filter(explode("\n", $e['bullets'] ?? ''))) >= 3);
        $points += $hasRichBullets ? 5 : 0;
        $checklist[] = ['label' => '3+ bullets on one experience', 'pts' => 5, 'passed' => $hasRichBullets];
        if (! $hasRichBullets) {
            $tips[] = ['pts' => 5, 'order' => $order++, 'tip' => 'Add 3+ bullets to a work experience entry'];
        }

        // Custom section or certification — 5pts
        $hasExtra = count($certifications) >= 1 || count($customSections) >= 1;
        $points += $hasExtra ? 5 : 0;
        $checklist[] = ['label' => 'Certification or custom section', 'pts' => 5, 'passed' => $hasExtra];
        if (! $hasExtra) {
            $tips[] = ['pts' => 5, 'order' => $order++, 'tip' => 'Add a certification or custom section'];
        }

        usort($tips, fn ($a, $b) => $b['pts'] !== $a['pts'] ? $b['pts'] - $a['pts'] : $a['order'] - $b['order']);
        $tip = $tips[0]['tip'] ?? 'Your resume looks great!';

        return ['score' => $points, 'tip' => $tip, 'checklist' => $checklist];
    }
}
```

- [ ] **Step 4: Create the migration**

```bash
php artisan make:migration create_resume_strength_snapshots_table --no-interaction
```

Replace the migration body:

```php
public function up(): void
{
    Schema::create('resume_strength_snapshots', function (Blueprint $table): void {
        $table->id();
        $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
        $table->unsignedSmallInteger('score');
        $table->json('checklist');
        $table->timestamp('created_at')->useCurrent();
    });
}

public function down(): void
{
    Schema::dropIfExists('resume_strength_snapshots');
}
```

- [ ] **Step 5: Run the migration**

```bash
php artisan migrate --no-interaction
```

- [ ] **Step 6: Create `app/Models/ResumeStrengthSnapshot.php`**

```bash
php artisan make:model ResumeStrengthSnapshot --no-interaction
```

Replace the file:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeStrengthSnapshot extends Model
{
    public $timestamps = false;

    protected $fillable = ['resume_id', 'score', 'checklist'];

    protected $casts = [
        'checklist'  => 'array',
        'created_at' => 'datetime',
    ];

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
```

- [ ] **Step 7: Create `app/Http/Controllers/StrengthScoreController.php`**

```php
<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeStrengthSnapshot;
use App\Services\ResumeStrengthScorer;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StrengthScoreController extends Controller
{
    public function show(Request $request, Resume $resume): JsonResponse
    {
        $this->authorize('update', $resume);

        $result = ResumeStrengthScorer::score($resume);

        $last = ResumeStrengthSnapshot::where('resume_id', $resume->id)
            ->orderByDesc('created_at')
            ->first();

        if (! $last || abs($last->score - $result['score']) >= 5) {
            ResumeStrengthSnapshot::create([
                'resume_id' => $resume->id,
                'score'     => $result['score'],
                'checklist' => $result['checklist'],
            ]);
        }

        $user = $request->user();
        $history = null;

        if ($user->isAtLeastStarter()) {
            $history = ResumeStrengthSnapshot::where('resume_id', $resume->id)
                ->orderBy('created_at')
                ->limit(30)
                ->get(['score', 'created_at'])
                ->map(fn ($s) => ['score' => $s->score, 'date' => $s->created_at->toDateString()])
                ->values()
                ->all();
        }

        return response()->json([
            'score'     => $result['score'],
            'checklist' => $result['checklist'],
            'history'   => $history,
        ]);
    }
}
```

- [ ] **Step 8: Add route to `routes/web.php`**

Find the `builder.*` routes and add after the `builder.strength-score` area (or alongside other GET endpoints):

```php
Route::get('/builder/{resume}/strength-score', [StrengthScoreController::class, 'show'])
    ->middleware('throttle:10,1')
    ->name('builder.strength-score');
```

Add the import:

```php
use App\Http\Controllers\StrengthScoreController;
```

- [ ] **Step 9: Add `strengthHistoryEnabled` prop to `ResumeBuilderController::edit()`**

In `app/Http/Controllers/ResumeBuilderController.php`, in the `edit()` `Inertia::render()` call, add:

```php
'strengthHistoryEnabled' => $user->isAtLeastStarter(),
```

Also add the `ResumeStrengthScorer` import if not already present:

```php
use App\Services\ResumeStrengthScorer;
```

- [ ] **Step 10: Run Pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 11: Run the tests**

```bash
php artisan test --compact tests/Feature/StrengthScorePanelTest.php
```

Expected: all 7 tests green.

- [ ] **Step 12: Commit**

```bash
git add app/Services/ResumeStrengthScorer.php database/migrations app/Models/ResumeStrengthSnapshot.php app/Http/Controllers/StrengthScoreController.php routes/web.php app/Http/Controllers/ResumeBuilderController.php tests/Feature/StrengthScorePanelTest.php
git commit -m "feat: strength score panel backend — full checklist, snapshot history, Starter+ history gating"
```

---

## Task 9: Strength Score Panel — Frontend

**Files:**
- Modify: `resources/js/types/index.d.ts`
- Create: `resources/js/Pages/ResumeBuilder/Partials/StrengthScorePanel.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Add types to `resources/js/types/index.d.ts`**

Add after `ResumeSnapshot`:

```ts
export interface StrengthChecklistItem {
    label: string;
    pts: number;
    passed: boolean;
}

export interface StrengthHistoryPoint {
    score: number;
    date: string;
}
```

- [ ] **Step 2: Create `resources/js/Pages/ResumeBuilder/Partials/StrengthScorePanel.tsx`**

```tsx
import type { StrengthChecklistItem, StrengthHistoryPoint } from '@/types';
import { useState } from 'react';

interface Props {
    resumeId: number;
    strengthHistoryEnabled: boolean;
}

function Sparkline({ data }: { data: StrengthHistoryPoint[] }) {
    if (data.length < 2) return null;
    const scores = data.map(d => d.score);
    const max = Math.max(...scores, 100);
    const min = Math.min(...scores, 0);
    const range = max - min || 1;
    const w = 200;
    const h = 40;
    const pts = scores
        .map((v, i) => {
            const x = (i / (scores.length - 1)) * w;
            const y = h - ((v - min) / range) * (h - 4) - 2;
            return `${x},${y}`;
        })
        .join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: h }}>
            <polyline points={pts} fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default function StrengthScorePanel({ resumeId, strengthHistoryEnabled }: Props) {
    const [score, setScore] = useState<number | null>(null);
    const [checklist, setChecklist] = useState<StrengthChecklistItem[]>([]);
    const [history, setHistory] = useState<StrengthHistoryPoint[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const load = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch(route('builder.strength-score', resumeId), {
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '',
                },
            });
            const json = await res.json();
            setScore(json.score);
            setChecklist(json.checklist ?? []);
            setHistory(json.history ?? null);
        } finally {
            setLoading(false);
        }
    };

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next && score === null) load();
    };

    const color = score === null ? 'text-gray-400' : score <= 40 ? 'text-red-600' : score <= 70 ? 'text-amber-600' : 'text-green-600';
    const barColor = score === null ? 'bg-gray-200' : score <= 40 ? 'bg-red-400' : score <= 70 ? 'bg-amber-400' : 'bg-green-500';

    return (
        <div className="border-t border-gray-100 pt-3">
            <button
                type="button"
                onClick={toggle}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
            >
                <span>
                    Strength Score
                    {score !== null && (
                        <span className={`ml-1 ${color}`}>{score}%</span>
                    )}
                </span>
                <span>{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="mt-3 space-y-3">
                    {loading && <p className="text-xs text-gray-400">Analyzing…</p>}

                    {score !== null && (
                        <>
                            {/* Score bar */}
                            <div>
                                <div className="mb-1 flex justify-between text-xs">
                                    <span className={`font-bold ${color}`}>{score} / 100</span>
                                    <button type="button" onClick={load} className="text-gray-400 hover:text-gray-600">↻ Refresh</button>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${score}%` }} />
                                </div>
                            </div>

                            {/* Checklist */}
                            <ul className="space-y-1">
                                {checklist.map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-xs">
                                        <span className={item.passed ? 'text-green-500' : 'text-gray-300'}>
                                            {item.passed ? '✓' : '○'}
                                        </span>
                                        <span className={item.passed ? 'text-gray-700' : 'text-gray-400'}>
                                            {item.label}
                                        </span>
                                        {!item.passed && (
                                            <span className="ml-auto text-gray-300">+{item.pts}</span>
                                        )}
                                    </li>
                                ))}
                            </ul>

                            {/* History */}
                            {strengthHistoryEnabled ? (
                                history && history.length >= 2 && (
                                    <div>
                                        <p className="mb-1 text-xs font-semibold text-gray-400">Score History</p>
                                        <Sparkline data={history} />
                                        <div className="mt-0.5 flex justify-between text-xs text-gray-400">
                                            <span>{history[0]?.date}</span>
                                            <span>{history[history.length - 1]?.date}</span>
                                        </div>
                                    </div>
                                )
                            ) : (
                                <p className="text-xs text-gray-400">
                                    Upgrade to Starter to track score history over time.
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 3: Wire `StrengthScorePanel` into `resources/js/Pages/ResumeBuilder/Edit.tsx`**

**3a.** Import at the top:

```tsx
import StrengthScorePanel from './Partials/StrengthScorePanel';
```

**3b.** Add `strengthHistoryEnabled` to the page props type:

```tsx
strengthHistoryEnabled: boolean;
```

**3c.** In the left sidebar where the ATS Score and Versions sections are rendered, add `StrengthScorePanel`:

```tsx
<StrengthScorePanel
    resumeId={resume.id}
    strengthHistoryEnabled={strengthHistoryEnabled}
/>
```

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: zero TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add resources/js/types/index.d.ts resources/js/Pages/ResumeBuilder/Partials/StrengthScorePanel.tsx resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: strength score panel — full checklist, score bar, SVG history sparkline (Starter+)"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run the full test suite**

```bash
php artisan test --compact
```

Expected: all tests green (376 baseline + new tests).

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: zero TypeScript errors, Vite build succeeds.

- [ ] **Step 3: Run Pint on all changed PHP files**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 4: Verify commits**

```bash
git log --oneline -12
```

Expected (most recent first):
- `feat: strength score panel — full checklist, score bar, SVG history sparkline (Starter+)`
- `feat: strength score panel backend — full checklist, snapshot history, Starter+ history gating`
- `feat: client-side spell check (Typo.js en_US) with badge UI on summary and bullets`
- `feat: resume versioning sidebar — save version, list snapshots, restore as copy`
- `feat: saveVersion endpoint creates resume snapshot; snapshots excluded from index`
- `feat: add parent_resume_id + is_snapshot columns for resume versioning`
- `feat: follow-up date picker in job edit, overdue indicator in job tracker index`
- `feat: follow-up reminders — mail, artisan command, daily scheduler`
- `feat: add follow_up_at to job_applications — migration, model, validation, TS types`
