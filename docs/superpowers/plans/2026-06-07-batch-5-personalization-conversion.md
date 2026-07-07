# Batch 5: Personalization & Conversion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 4 features — Resume Freshness Nudges, Profile Photo Support, Application Funnel Analytics, and Salary Negotiation Scripts.

**Architecture:** Each feature is independent. Freshness nudges extend the scheduler. Photo support uses spatie/laravel-medialibrary (already installed). Funnel analytics extend existing Jobs/Index props. Negotiation scripts add a new AI endpoint pattern identical to job tailoring.

**Tech Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, SQLite, PHPUnit 12, spatie/laravel-medialibrary (already installed + migrated)

---

## Task 1: Resume Freshness Nudges

**Files:**
- Create: `database/migrations/TIMESTAMP_add_stale_nudge_sent_at_to_users_table.php`
- Create: `app/Mail/StaleResumeNudgeMail.php`
- Create: `app/Console/Commands/NudgeStalResumesCommand.php`
- Modify: `routes/console.php`
- Create: `tests/Feature/StaleNudgeTest.php`

- [ ] **Step 1: Create migration**

```bash
php artisan make:migration add_stale_nudge_sent_at_to_users_table --no-interaction
```

Edit the generated file:

```php
public function up(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->timestamp('stale_nudge_sent_at')->nullable()->after('referral_rewards_earned');
    });
}

public function down(): void
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn('stale_nudge_sent_at');
    });
}
```

Run: `php artisan migrate`

- [ ] **Step 2: Create the mailable**

```bash
php artisan make:mail StaleResumeNudgeMail --no-interaction
```

Replace the generated file at `app/Mail/StaleResumeNudgeMail.php`:

```php
<?php

namespace App\Mail;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaleResumeNudgeMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public Resume $resume,
        public int $daysSinceEdit,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Time to refresh your resume, {$this->user->name}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.stale-resume-nudge',
            with: [
                'userName' => $this->user->name,
                'resumeName' => $this->resume->name,
                'daysSinceEdit' => $this->daysSinceEdit,
                'editUrl' => route('builder.edit', $this->resume->id),
            ],
        );
    }
}
```

- [ ] **Step 3: Create the email Blade view**

Create `resources/views/emails/stale-resume-nudge.blade.php`:

```blade
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px; }
        .btn { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
        .muted { color: #71717a; font-size: 14px; }
    </style>
</head>
<body>
    <h2>Hi {{ $userName }},</h2>
    <p>Your resume <strong>{{ $resumeName }}</strong> hasn't been updated in {{ $daysSinceEdit }} days.</p>
    <p>Recruiters often filter for recent activity — a quick refresh keeps you competitive.</p>
    <a href="{{ $editUrl }}" class="btn">Update Resume →</a>
    <p class="muted" style="margin-top: 32px;">You're receiving this because you have a Resumegen account. <a href="{{ route('profile.edit') }}">Manage preferences</a></p>
</body>
</html>
```

- [ ] **Step 4: Write failing tests**

Create `tests/Feature/StaleNudgeTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Console\Commands\NudgeStaleResumesCommand;
use App\Mail\StaleResumeNudgeMail;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class StaleNudgeTest extends TestCase
{
    use RefreshDatabase;

    public function test_sends_mail_for_user_with_stale_resume(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        Resume::factory()->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(31),
            'is_snapshot' => false,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertSent(StaleResumeNudgeMail::class, fn ($m) => $m->hasTo($user->email));
    }

    public function test_skips_user_nudged_within_7_days(): void
    {
        Mail::fake();
        $user = User::factory()->create(['stale_nudge_sent_at' => now()->subDays(3)]);
        Resume::factory()->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(31),
            'is_snapshot' => false,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertNotSent(StaleResumeNudgeMail::class);
    }

    public function test_skips_user_with_no_stale_resumes(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        Resume::factory()->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(10),
            'is_snapshot' => false,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertNotSent(StaleResumeNudgeMail::class);
    }

    public function test_skips_snapshots(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        Resume::factory()->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(31),
            'is_snapshot' => true,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertNotSent(StaleResumeNudgeMail::class);
    }

    public function test_sends_one_mail_per_user_with_multiple_stale_resumes(): void
    {
        Mail::fake();
        $user = User::factory()->create();
        Resume::factory()->count(3)->create([
            'user_id' => $user->id,
            'updated_at' => now()->subDays(31),
            'is_snapshot' => false,
        ]);

        $this->artisan('resumes:nudge-stale')->assertSuccessful();

        Mail::assertSent(StaleResumeNudgeMail::class, 1);
    }
}
```

Run: `php artisan test tests/Feature/StaleNudgeTest.php --compact`  
Expected: FAIL (command does not exist yet)

- [ ] **Step 5: Create the Artisan command**

```bash
php artisan make:command NudgeStaleResumesCommand --no-interaction
```

Replace `app/Console/Commands/NudgeStaleResumesCommand.php`:

```php
<?php

namespace App\Console\Commands;

use App\Mail\StaleResumeNudgeMail;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class NudgeStaleResumesCommand extends Command
{
    protected $signature = 'resumes:nudge-stale';
    protected $description = 'Send re-engagement emails for resumes not updated in 30+ days';

    public function handle(): int
    {
        $cutoff = now()->subDays(30);
        $nudgeCooloff = now()->subDays(7);

        User::whereHas('resumes', function ($q) use ($cutoff) {
            $q->where('updated_at', '<', $cutoff)->where('is_snapshot', false);
        })
        ->where(function ($q) use ($nudgeCooloff) {
            $q->whereNull('stale_nudge_sent_at')
              ->orWhere('stale_nudge_sent_at', '<', $nudgeCooloff);
        })
        ->each(function (User $user) use ($cutoff) {
            $staleResume = $user->resumes()
                ->where('updated_at', '<', $cutoff)
                ->where('is_snapshot', false)
                ->latest('updated_at')
                ->first();

            if (! $staleResume) {
                return;
            }

            $days = (int) now()->diffInDays($staleResume->updated_at);

            Mail::to($user->email)->queue(new StaleResumeNudgeMail($user, $staleResume, $days));

            $user->update(['stale_nudge_sent_at' => now()]);
        });

        return self::SUCCESS;
    }
}
```

- [ ] **Step 6: Register in scheduler**

In `routes/console.php`, add:

```php
Schedule::command('resumes:nudge-stale')->daily();
```

- [ ] **Step 7: Run tests**

```bash
php artisan test tests/Feature/StaleNudgeTest.php --compact
```

Expected: 5/5 PASS

- [ ] **Step 8: Add `stale_nudge_sent_at` to User model fillable**

In `app/Models/User.php`, find the `#[Fillable]` attribute and add `'stale_nudge_sent_at'`.

- [ ] **Step 9: Run Pint**

```bash
./vendor/bin/pint app/Console/Commands/NudgeStaleResumesCommand.php app/Mail/StaleResumeNudgeMail.php app/Models/User.php --format agent
```

- [ ] **Step 10: Commit**

```bash
git add database/migrations/*stale_nudge* app/Console/Commands/NudgeStaleResumesCommand.php app/Mail/StaleResumeNudgeMail.php resources/views/emails/stale-resume-nudge.blade.php routes/console.php app/Models/User.php tests/Feature/StaleNudgeTest.php
git commit -m "feat: add resume freshness nudges — daily command, mail, scheduler (5 tests)"
```

---

## Task 2: Profile Photo Support

**Files:**
- Modify: `app/Models/Resume.php` — add `HasMedia`, `InteractsWithMedia`, `registerMediaCollections()`
- Create: `app/Http/Controllers/ResumePhotoController.php`
- Modify: `routes/web.php` — 2 new routes
- Modify: `app/Http/Controllers/ResumeBuilderController.php` — pass `photoUrl` prop in `edit()`
- Modify: `resources/views/resume-pdf.blade.php` — embed photo in sidebar/creative/executive
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` — photo upload UI in design sidebar
- Create: `tests/Feature/ResumePhotoTest.php`

- [ ] **Step 1: Write failing tests**

Create `tests/Feature/ResumePhotoTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ResumePhotoTest extends TestCase
{
    use RefreshDatabase;

    public function test_upload_stores_photo_in_media_collection(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('headshot.jpg', 200, 200),
            ])
            ->assertRedirect();

        $this->assertCount(1, $resume->fresh()->getMedia('photo'));
    }

    public function test_upload_replaces_previous_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('first.jpg'),
            ]);

        $this->actingAs($user)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('second.jpg'),
            ]);

        $this->assertCount(1, $resume->fresh()->getMedia('photo'));
    }

    public function test_delete_removes_photo(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $resume->addMedia(UploadedFile::fake()->image('headshot.jpg'))->toMediaCollection('photo');

        $this->actingAs($user)
            ->delete(route('builder.photo.destroy', $resume->id))
            ->assertRedirect();

        $this->assertCount(0, $resume->fresh()->getMedia('photo'));
    }

    public function test_non_owner_cannot_upload(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($other)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('headshot.jpg'),
            ])
            ->assertForbidden();
    }

    public function test_invalid_file_type_returns_422(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf'),
            ])
            ->assertUnprocessable();
    }

    public function test_file_exceeding_2mb_returns_422(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->post(route('builder.photo.store', $resume->id), [
                'photo' => UploadedFile::fake()->image('big.jpg')->size(2049),
            ])
            ->assertUnprocessable();
    }
}
```

Run: `php artisan test tests/Feature/ResumePhotoTest.php --compact`  
Expected: FAIL (routes don't exist yet)

- [ ] **Step 2: Update Resume model**

In `app/Models/Resume.php`, add after the class imports:

```php
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;
```

Change class declaration:

```php
class Resume extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia;
```

Add method to the class:

```php
public function registerMediaCollections(): void
{
    $this->addMediaCollection('photo')
        ->singleFile()
        ->acceptsMimeTypes(['image/jpeg', 'image/png', 'image/webp']);
}
```

- [ ] **Step 3: Create the controller**

Create `app/Http/Controllers/ResumePhotoController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ResumePhotoController extends Controller
{
    public function store(Request $request, Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $request->validate([
            'photo' => ['required', 'image', 'max:2048'],
        ]);

        $resume->clearMediaCollection('photo');
        $resume->addMediaFromRequest('photo')->toMediaCollection('photo');

        return back();
    }

    public function destroy(Resume $resume): RedirectResponse
    {
        $this->authorize('update', $resume);

        $resume->clearMediaCollection('photo');

        return back();
    }
}
```

- [ ] **Step 4: Register routes**

In `routes/web.php`, inside the authenticated + verified group for builder routes, add:

```php
Route::post('/builder/{resume}/photo', [ResumePhotoController::class, 'store'])->name('builder.photo.store');
Route::delete('/builder/{resume}/photo', [ResumePhotoController::class, 'destroy'])->name('builder.photo.destroy');
```

Add import: `use App\Http\Controllers\ResumePhotoController;`

- [ ] **Step 5: Pass photoUrl prop in edit()**

In `app/Http/Controllers/ResumeBuilderController.php`, in the `edit()` method, add to the Inertia props array:

```php
'photoUrl' => $resume->getFirstMediaUrl('photo') ?: null,
```

- [ ] **Step 6: Run tests to confirm backend passes**

```bash
php artisan test tests/Feature/ResumePhotoTest.php --compact
```

Expected: 6/6 PASS

- [ ] **Step 7: Add photo to PDF templates**

In `resources/views/resume-pdf.blade.php`, find the sidebar/creative/executive template sections.

At the top of each of those 3 template sections, add a photo block. Pattern (repeat for each):

```blade
@php
    $photoPath = null;
    $photoMedia = $resume->getFirstMedia('photo');
    if ($photoMedia && file_exists($photoMedia->getPath())) {
        $photoData = base64_encode(file_get_contents($photoMedia->getPath()));
        $photoMime = $photoMedia->mime_type;
        $photoPath = "data:{$photoMime};base64,{$photoData}";
    }
@endphp
```

Then in the relevant section's header area:

```blade
@if($photoPath)
    <img src="{{ $photoPath }}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;margin-bottom:8px;" />
@endif
```

- [ ] **Step 8: Add photo upload UI to Edit.tsx**

In `resources/js/Pages/ResumeBuilder/Edit.tsx`:

1. Add `photoUrl: string | null` to the `PageProps` interface.
2. Destructure it from props.
3. In the design sidebar section (near template selector), add a photo section that only renders when `template` is `'sidebar'`, `'creative'`, or `'executive'`:

```tsx
{['sidebar', 'creative', 'executive'].includes(template) && (
    <div className="mt-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Profile Photo</p>
        <div className="flex items-center gap-3">
            {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-100" />
            ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
            )}
            <div className="flex flex-col gap-1">
                <label className="cursor-pointer rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    Upload Photo
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const form = new FormData();
                            form.append('photo', file);
                            router.post(route('builder.photo.store', resume.id), form, { forceFormData: true, preserveScroll: true });
                        }}
                    />
                </label>
                {photoUrl && (
                    <button
                        type="button"
                        onClick={() => router.delete(route('builder.photo.destroy', resume.id), { preserveScroll: true })}
                        className="text-xs text-red-500 hover:text-red-700"
                    >
                        Remove
                    </button>
                )}
            </div>
        </div>
    </div>
)}
```

- [ ] **Step 9: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/ResumePhotoController.php app/Models/Resume.php --format agent
```

- [ ] **Step 10: Run full test suite check**

```bash
php artisan test tests/Feature/ResumePhotoTest.php --compact
```

Expected: 6/6 PASS

- [ ] **Step 11: Commit**

```bash
git add app/Models/Resume.php app/Http/Controllers/ResumePhotoController.php routes/web.php app/Http/Controllers/ResumeBuilderController.php resources/views/resume-pdf.blade.php resources/js/Pages/ResumeBuilder/Edit.tsx tests/Feature/ResumePhotoTest.php
git commit -m "feat: add profile photo support — spatie media upload, PDF embed in sidebar/creative/executive (6 tests)"
```

---

## Task 3: Application Funnel Analytics

**Files:**
- Modify: `app/Http/Controllers/JobApplicationController.php` — add `funnelStats` to index props
- Modify: `resources/js/Pages/Jobs/Index.tsx` — add FunnelChart component
- Modify: `resources/js/types/index.d.ts` — add FunnelStats type
- Modify: `tests/Feature/JobApplicationTest.php` — add 1 test for funnelStats prop

- [ ] **Step 1: Write failing test**

Open `tests/Feature/JobApplicationTest.php` and add this test:

```php
public function test_index_includes_funnel_stats(): void
{
    $user = User::factory()->create();
    JobApplication::factory()->create(['user_id' => $user->id, 'status' => 'applied']);
    JobApplication::factory()->create(['user_id' => $user->id, 'status' => 'applied']);
    JobApplication::factory()->create(['user_id' => $user->id, 'status' => 'interview']);
    JobApplication::factory()->create(['user_id' => $user->id, 'status' => 'offer']);

    $response = $this->actingAs($user)->get(route('jobs.index'));

    $response->assertInertia(fn ($page) => $page
        ->component('Jobs/Index')
        ->has('funnelStats')
        ->where('funnelStats.applied', 2)
        ->where('funnelStats.interview', 1)
        ->where('funnelStats.offer', 1)
    );
}
```

Run: `php artisan test --filter=test_index_includes_funnel_stats --compact`  
Expected: FAIL

- [ ] **Step 2: Update JobApplicationController@index**

In `app/Http/Controllers/JobApplicationController.php`, in the `index()` method, before the Inertia::render call, add:

```php
$funnelStats = $jobs->groupBy('status')
    ->map(fn ($group) => $group->count())
    ->toArray();

// Ensure all statuses are present with 0 default
$allStatuses = JobApplication::STATUSES;
foreach ($allStatuses as $status) {
    $funnelStats[$status] ??= 0;
}
```

Then add `'funnelStats' => $funnelStats` to the Inertia props array.

- [ ] **Step 3: Run test**

```bash
php artisan test --filter=test_index_includes_funnel_stats --compact
```

Expected: PASS

- [ ] **Step 4: Add FunnelStats type to index.d.ts**

In `resources/js/types/index.d.ts`, add:

```typescript
export interface FunnelStats {
    saved: number;
    applied: number;
    phone_screen: number;
    interview: number;
    offer: number;
    rejected: number;
}
```

- [ ] **Step 5: Add FunnelChart to Jobs/Index.tsx**

In `resources/js/Pages/Jobs/Index.tsx`:

1. Add `funnelStats: FunnelStats` to the Props interface (import `FunnelStats` from types).
2. Destructure from props.
3. Add a `FunnelChart` component at the top of the page (before the view-toggle and table/kanban):

```tsx
function FunnelChart({ stats }: { stats: FunnelStats }) {
    const stages = [
        { key: 'applied', label: 'Applied' },
        { key: 'phone_screen', label: 'Phone Screen' },
        { key: 'interview', label: 'Interview' },
        { key: 'offer', label: 'Offer' },
    ] as const;

    const maxCount = Math.max(...stages.map((s) => stats[s.key]), 1);

    const conversionRate = (from: number, to: number) =>
        from === 0 ? '—' : `${Math.round((to / from) * 100)}%`;

    return (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">Application Funnel</h3>
                <div className="flex gap-4 text-xs text-gray-500">
                    <span>Saved: {stats.saved}</span>
                    <span>Rejected: {stats.rejected}</span>
                </div>
            </div>
            <div className="flex items-end gap-3">
                {stages.map((stage, i) => {
                    const count = stats[stage.key];
                    const heightPct = Math.max((count / maxCount) * 100, 4);
                    const prev = i > 0 ? stats[stages[i - 1].key] : null;
                    return (
                        <div key={stage.key} className="flex flex-1 flex-col items-center gap-1">
                            {prev !== null && (
                                <p className="text-[10px] text-gray-400">
                                    {conversionRate(prev, count)}
                                </p>
                            )}
                            <div className="flex w-full flex-col items-center justify-end" style={{ height: 80 }}>
                                <div
                                    className="w-full rounded-t-md bg-indigo-500 transition-all"
                                    style={{ height: `${heightPct}%` }}
                                />
                            </div>
                            <p className="text-xs font-semibold text-gray-900">{count}</p>
                            <p className="text-[10px] text-gray-500">{stage.label}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
```

Render `<FunnelChart stats={funnelStats} />` at the top of the main content area (after the page header, before the view toggle buttons).

- [ ] **Step 6: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/JobApplicationController.php --format agent
```

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/JobApplicationController.php resources/js/Pages/Jobs/Index.tsx resources/js/types/index.d.ts tests/Feature/JobApplicationTest.php
git commit -m "feat: add application funnel analytics — conversion bars on Jobs index (1 test)"
```

---

## Task 4: Salary Negotiation Scripts

**Files:**
- Create: `app/Http/Controllers/NegotiationScriptController.php`
- Modify: `app/Services/UserLimits.php` — add `canNegotiation()`
- Modify: `routes/web.php` — add throttled route
- Modify: `app/Http/Controllers/JobApplicationController.php` — pass `canNegotiation` prop
- Modify: `resources/js/Pages/Jobs/Edit.tsx` — negotiation card UI
- Create: `tests/Feature/NegotiationScriptTest.php`

- [ ] **Step 1: Write failing tests**

Create `tests/Feature/NegotiationScriptTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class NegotiationScriptTest extends TestCase
{
    use RefreshDatabase;

    public function test_starter_user_gets_negotiation_script(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['type' => 'text', 'text' => 'Dear Hiring Manager, I am excited about the offer...']],
            ], 200),
        ]);

        $user = User::factory()->starter()->create();
        $job = JobApplication::factory()->create([
            'user_id' => $user->id,
            'role' => 'Software Engineer',
            'status' => 'offer',
        ]);

        $response = $this->actingAs($user)
            ->postJson(route('jobs.negotiation-script', $job->id), [
                'offered_salary' => '$120,000',
                'target_salary' => '$135,000',
            ]);

        $response->assertOk()->assertJsonStructure(['email_body']);
    }

    public function test_free_user_gets_402(): void
    {
        $user = User::factory()->free()->create();
        $job = JobApplication::factory()->create(['user_id' => $user->id, 'role' => 'Engineer', 'status' => 'offer']);

        $response = $this->actingAs($user)
            ->postJson(route('jobs.negotiation-script', $job->id), []);

        $response->assertStatus(402)->assertJsonPath('required_tier', 'starter');
    }

    public function test_non_owner_gets_403(): void
    {
        $owner = User::factory()->starter()->create();
        $other = User::factory()->starter()->create();
        $job = JobApplication::factory()->create(['user_id' => $owner->id, 'role' => 'Engineer', 'status' => 'offer']);

        $this->actingAs($other)
            ->postJson(route('jobs.negotiation-script', $job->id), [])
            ->assertForbidden();
    }

    public function test_missing_role_returns_422(): void
    {
        $user = User::factory()->starter()->create();
        $job = JobApplication::factory()->create(['user_id' => $user->id, 'role' => '', 'status' => 'offer']);

        $response = $this->actingAs($user)
            ->postJson(route('jobs.negotiation-script', $job->id), []);

        $response->assertUnprocessable();
    }

    public function test_script_logged_to_ai_usage_logs(): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'content' => [['type' => 'text', 'text' => 'Dear Hiring Manager...']],
                'usage' => ['input_tokens' => 200, 'output_tokens' => 150],
                'model' => 'claude-3-5-haiku-20241022',
            ], 200),
        ]);

        $user = User::factory()->starter()->create();
        $job = JobApplication::factory()->create([
            'user_id' => $user->id,
            'role' => 'Software Engineer',
            'status' => 'offer',
        ]);

        $this->actingAs($user)
            ->postJson(route('jobs.negotiation-script', $job->id), [
                'offered_salary' => '$100,000',
                'target_salary' => '$115,000',
            ]);

        $this->assertDatabaseHas('ai_usage_logs', [
            'user_id' => $user->id,
            'feature' => 'negotiation',
        ]);
    }
}
```

Run: `php artisan test tests/Feature/NegotiationScriptTest.php --compact`  
Expected: FAIL (routes don't exist)

- [ ] **Step 2: Add UserLimits::canNegotiation()**

In `app/Services/UserLimits.php`, add:

```php
public static function canNegotiation(User $user): bool
{
    return $user->planTier() !== 'free';
}
```

- [ ] **Step 3: Create NegotiationScriptController**

Create `app/Http/Controllers/NegotiationScriptController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use App\Services\AiUsageLogger;
use App\Services\UserLimits;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class NegotiationScriptController extends Controller
{
    public function store(Request $request, JobApplication $job): JsonResponse
    {
        $this->authorize('update', $job);

        $user = $request->user();

        if (! UserLimits::canNegotiation($user)) {
            return response()->json(['error' => 'Upgrade required', 'required_tier' => 'starter'], 402);
        }

        if (blank($job->role)) {
            return response()->json(['errors' => ['role' => ['Role is required.']]], 422);
        }

        $offeredSalary = $request->input('offered_salary', 'not specified');
        $targetSalary = $request->input('target_salary', 'not specified');

        $prompt = <<<PROMPT
Write a professional salary negotiation email for a candidate who received a job offer for the role of "{$job->role}".
Current offer: {$offeredSalary}
Target: {$targetSalary}
Write a 150-200 word email that is confident, professional, and collaborative in tone.
Return only the email body — no subject line, no placeholders.
PROMPT;

        $response = Http::withHeaders([
            'x-api-key' => config('services.anthropic.key'),
            'anthropic-version' => '2023-06-01',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-3-5-haiku-20241022',
            'max_tokens' => 500,
            'messages' => [['role' => 'user', 'content' => $prompt]],
        ]);

        $emailBody = $response->json('content.0.text', '');

        AiUsageLogger::log(
            user: $user,
            provider: 'anthropic',
            model: $response->json('model', 'claude-3-5-haiku-20241022'),
            feature: 'negotiation',
            inputTokens: $response->json('usage.input_tokens', 0),
            outputTokens: $response->json('usage.output_tokens', 0),
        );

        return response()->json(['email_body' => trim($emailBody)]);
    }
}
```

- [ ] **Step 4: Register route**

In `routes/web.php`, in the authenticated + verified group for jobs routes, add:

```php
Route::post('/jobs/{job}/negotiation-script', [NegotiationScriptController::class, 'store'])
    ->name('jobs.negotiation-script')
    ->middleware('throttle:5,1');
```

Add import: `use App\Http\Controllers\NegotiationScriptController;`

- [ ] **Step 5: Pass canNegotiation prop**

In `app/Http/Controllers/JobApplicationController.php`, in the `edit()` method, add to Inertia props:

```php
'canNegotiation' => UserLimits::canNegotiation($request->user()),
```

Add import: `use App\Services\UserLimits;` (if not already present)

- [ ] **Step 6: Run tests**

```bash
php artisan test tests/Feature/NegotiationScriptTest.php --compact
```

Expected: 5/5 PASS

- [ ] **Step 7: Add UI to Jobs/Edit.tsx**

In `resources/js/Pages/Jobs/Edit.tsx`:

1. Add `canNegotiation: boolean` to the `PageProps` interface.
2. Add state: `const [negotiationScript, setNegotiationScript] = useState<string | null>(null);`
3. Add state: `const [negotiationLoading, setNegotiationLoading] = useState(false);`
4. Add state: `const [offeredSalary, setOfferedSalary] = useState('');`
5. Add state: `const [targetSalary, setTargetSalary] = useState('');`

When `job.status === 'offer'`, render after the status field:

```tsx
{job.status === 'offer' && (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-center justify-between">
            <div>
                <p className="font-semibold text-amber-900">Offer received!</p>
                <p className="text-sm text-amber-700">Generate a salary negotiation email to maximize your offer.</p>
            </div>
        </div>
        {canNegotiation ? (
            <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                        type="text"
                        placeholder="Offered salary (optional)"
                        value={offeredSalary}
                        onChange={(e) => setOfferedSalary(e.target.value)}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none"
                    />
                    <input
                        type="text"
                        placeholder="Target salary (optional)"
                        value={targetSalary}
                        onChange={(e) => setTargetSalary(e.target.value)}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm focus:outline-none"
                    />
                </div>
                <button
                    type="button"
                    disabled={negotiationLoading}
                    onClick={() => {
                        setNegotiationLoading(true);
                        axios.post(route('jobs.negotiation-script', job.id), {
                            offered_salary: offeredSalary,
                            target_salary: targetSalary,
                        }).then((res) => {
                            setNegotiationScript(res.data.email_body);
                        }).finally(() => setNegotiationLoading(false));
                    }}
                    className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                    {negotiationLoading ? 'Generating…' : 'Generate Negotiation Script'}
                </button>
                {negotiationScript && (
                    <textarea
                        readOnly
                        value={negotiationScript}
                        rows={8}
                        className="mt-3 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none"
                        onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                    />
                )}
            </>
        ) : (
            <button
                type="button"
                onClick={() => triggerUpgradeModal('negotiation_script', 'starter')}
                className="mt-3 flex items-center gap-1 rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-800"
            >
                <span>🔒</span> Generate Negotiation Script
            </button>
        )}
    </div>
)}
```

Note: `axios` is already imported in `Edit.tsx`. `triggerUpgradeModal` is already available globally.

- [ ] **Step 8: Run Pint**

```bash
./vendor/bin/pint app/Http/Controllers/NegotiationScriptController.php app/Services/UserLimits.php app/Http/Controllers/JobApplicationController.php --format agent
```

- [ ] **Step 9: Build frontend**

```bash
npm run build
```

Expected: zero TypeScript errors

- [ ] **Step 10: Run full test suite**

```bash
php artisan test --compact
```

Expected: 470+ tests passing (453 + 17 new)

- [ ] **Step 11: Commit**

```bash
git add app/Http/Controllers/NegotiationScriptController.php app/Services/UserLimits.php routes/web.php app/Http/Controllers/JobApplicationController.php resources/js/Pages/Jobs/Edit.tsx tests/Feature/NegotiationScriptTest.php
git commit -m "feat: add salary negotiation scripts — Pro AI email generator on Offer status (5 tests)"
```

---

## Final Checklist

- [ ] All 4 features implemented and committed
- [ ] `php artisan test --compact` → 470+ tests passing
- [ ] `npm run build` → zero TypeScript errors
- [ ] `./vendor/bin/pint --dirty --format agent` → clean
