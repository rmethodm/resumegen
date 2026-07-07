# Batch 11: Master Resume, Recruiter Heatmaps, Referral Rewards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add master resume branching with stale-copy detection, section-level recruiter attention heatmaps, and complete the referral reward loop (upgrade event + free month grant).

**Architecture:** Three independent features. Master Resume adds three columns to `resumes` and three new controller methods with dashboard + editor UI. Recruiter Heatmaps adds a new `resume_section_events` table, a public beacon endpoint, and an analytics page; tracking is client-side IntersectionObserver in `PublicView.tsx`. Referral Rewards extracts a `ReferralRewardService` and wires it into the existing Subscription observer in `AppServiceProvider`.

**Tech Stack:** Laravel 13, PHP 8.4, Inertia.js v2, React 18, TypeScript, Tailwind CSS v3, Laravel Cashier v16, SQLite (test), PHPUnit 12.

---

## File Map

### Feature 1 — Master Resume

| Action | File |
|---|---|
| Create | `database/migrations/2026_06_07_180000_add_master_resume_fields_to_resumes_table.php` |
| Modify | `app/Models/Resume.php` — add to `$fillable` + `$casts` |
| Modify | `app/Http/Controllers/ResumeBuilderController.php` — update `index()`, update `edit()`, add `setMaster()`, `createTailoredCopy()`, `syncMaster()` |
| Modify | `routes/web.php` — 3 new builder routes |
| Modify | `resources/js/types/index.d.ts` — extend `ResumeRow` |
| Modify | `resources/js/Pages/ResumeBuilder/Index.tsx` — master badge, stale badge, tailored-copy button |
| Modify | `resources/js/Pages/ResumeBuilder/Edit.tsx` — stale-copy amber banner |
| Create | `tests/Feature/MasterResumeTest.php` |

### Feature 2 — Recruiter Heatmaps

| Action | File |
|---|---|
| Create | `database/migrations/2026_06_07_180001_create_resume_section_events_table.php` |
| Create | `app/Models/ResumeSectionEvent.php` |
| Create | `app/Http/Controllers/SectionEventController.php` |
| Create | `app/Http/Controllers/HeatmapController.php` |
| Modify | `routes/web.php` — 1 public route + 1 auth route |
| Modify | `resources/js/Pages/ResumeBuilder/PublicView.tsx` — `data-section` attrs + `useSectionHeatmap` hook |
| Modify | `resources/js/Pages/ResumeBuilder/Index.tsx` — heatmap link per resume card |
| Modify | `resources/js/types/index.d.ts` — add `has_active_share_link` to `ResumeRow` |
| Create | `resources/js/Pages/ResumeBuilder/Heatmap.tsx` |
| Create | `tests/Feature/HeatmapTest.php` |

### Feature 3 — Referral Rewards

| Action | File |
|---|---|
| Create | `app/Services/ReferralRewardService.php` |
| Modify | `app/Providers/AppServiceProvider.php` — call service in Subscription observer |
| Create | `tests/Feature/ReferralUpgradeTest.php` |

---

## Task 1: Master Resume — Migration, Model, Backend

**Files:**
- Create: `database/migrations/2026_06_07_180000_add_master_resume_fields_to_resumes_table.php`
- Modify: `app/Models/Resume.php`
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `routes/web.php`
- Create: `tests/Feature/MasterResumeTest.php`

- [ ] **Step 1: Write the failing tests**

```bash
php artisan make:test --phpunit MasterResumeTest
```

Replace the generated file content with:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterResumeTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_set_resume_as_master(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['is_master' => false]);

        $this->actingAs($user)
            ->patch(route('builder.set-master', $resume->id))
            ->assertRedirect();

        $this->assertTrue($resume->fresh()->is_master);
    }

    public function test_user_can_create_tailored_copy(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create(['name' => 'My Resume', 'is_master' => true]);

        $this->actingAs($user)
            ->post(route('builder.create-tailored-copy', $resume->id))
            ->assertRedirect();

        $copy = Resume::where('master_resume_id', $resume->id)->first();
        $this->assertNotNull($copy);
        $this->assertStringContainsString('Tailored', $copy->name);
        $this->assertEquals($resume->id, $copy->master_resume_id);
    }

    public function test_dashboard_index_includes_master_resume_fields(): void
    {
        $user = User::factory()->create();
        $master = Resume::factory()->for($user)->create(['is_master' => true]);
        Resume::factory()->for($user)->create(['master_resume_id' => $master->id]);

        $this->actingAs($user)
            ->get(route('builder.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('ResumeBuilder/Index')
                ->has('resumes', 2)
            );
    }

    public function test_edit_page_includes_master_out_of_sync_when_master_is_newer(): void
    {
        $user = User::factory()->create();
        $master = Resume::factory()->for($user)->create(['is_master' => true]);
        $copy = Resume::factory()->for($user)->create([
            'master_resume_id' => $master->id,
            'master_synced_at' => now()->subHour(),
        ]);
        $master->touch();

        $this->actingAs($user)
            ->get(route('builder.edit', $copy->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('masterOutOfSync', true)
                ->where('masterResume.id', $master->id)
            );
    }

    public function test_syncing_master_records_current_timestamp(): void
    {
        $user = User::factory()->create();
        $master = Resume::factory()->for($user)->create(['is_master' => true]);
        $copy = Resume::factory()->for($user)->create([
            'master_resume_id' => $master->id,
            'master_synced_at' => now()->subHour(),
        ]);

        $this->actingAs($user)
            ->patch(route('builder.sync-master', $copy->id))
            ->assertRedirect();

        $this->assertNotNull($copy->fresh()->master_synced_at);
        $this->assertTrue($copy->fresh()->master_synced_at->gt(now()->subMinute()));
    }
}
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
php artisan test --compact tests/Feature/MasterResumeTest.php
```

Expected: 5 failures (routes not found / columns missing).

- [ ] **Step 3: Create the migration**

```bash
php artisan make:migration add_master_resume_fields_to_resumes_table --table=resumes
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
        Schema::table('resumes', function (Blueprint $table): void {
            $table->foreignId('master_resume_id')
                ->nullable()
                ->constrained('resumes')
                ->nullOnDelete()
                ->after('ab_parent_id');
            $table->boolean('is_master')->default(false)->after('master_resume_id');
            $table->timestamp('master_synced_at')->nullable()->after('is_master');
        });
    }

    public function down(): void
    {
        Schema::table('resumes', function (Blueprint $table): void {
            $table->dropForeign(['master_resume_id']);
            $table->dropColumn(['master_resume_id', 'is_master', 'master_synced_at']);
        });
    }
};
```

```bash
php artisan migrate
```

- [ ] **Step 4: Update `app/Models/Resume.php`**

Add to the `$fillable` array (after `'ab_parent_id'`):
```php
'master_resume_id',
'is_master',
'master_synced_at',
```

Add to the `$casts` array:
```php
'is_master' => 'boolean',
'master_synced_at' => 'datetime',
```

- [ ] **Step 5: Add three controller methods to `ResumeBuilderController`**

Add these methods after the `createVariant` method (around line 395):

```php
public function setMaster(Resume $resume): RedirectResponse
{
    $this->authorize('update', $resume);

    $resume->update(['is_master' => ! $resume->is_master]);

    return back();
}

public function createTailoredCopy(Resume $resume): RedirectResponse
{
    $this->authorize('update', $resume);

    $user = $resume->user;
    $limit = UserLimits::resumeLimit($user);

    if ($limit !== null && $user->resumes()->where('is_snapshot', false)->count() >= $limit) {
        return back()->with('featureGate', [
            'feature' => 'resume_limit',
            'requiredTier' => $user->planTier() === 'free' ? 'starter' : 'pro',
        ]);
    }

    $copy = $resume->replicate();
    $copy->name = $resume->name . ' (Tailored)';
    $copy->master_resume_id = $resume->id;
    $copy->master_synced_at = now();
    $copy->is_master = false;
    $copy->is_snapshot = false;
    $copy->ab_parent_id = null;
    $copy->save();

    return redirect()->route('builder.edit', $copy->id);
}

public function syncMaster(Resume $resume): RedirectResponse
{
    $this->authorize('update', $resume);

    $resume->update(['master_synced_at' => now()]);

    return back();
}
```

- [ ] **Step 6: Update `index()` in `ResumeBuilderController` to include master fields**

After the existing `$viewCounts` query (around line 35), add:

```php
$masterIds = $resumeCollection->pluck('master_resume_id')->filter()->unique();
$masterUpdatedAts = $masterIds->isNotEmpty()
    ? Resume::whereIn('id', $masterIds)->pluck('updated_at', 'id')
    : collect();
```

In the `$resumeCollection->map(...)` callback, add after `'tags'`:

```php
'is_master' => $resume->is_master,
'master_resume_id' => $resume->master_resume_id,
'master_updated_at' => $resume->master_resume_id
    ? optional($masterUpdatedAts->get($resume->master_resume_id))?->toISOString()
    : null,
'master_synced_at' => $resume->master_synced_at?->toISOString(),
```

- [ ] **Step 7: Update `edit()` in `ResumeBuilderController` to include stale-copy props**

Add after the `$isFirstResume` assignment (around line 117):

```php
$masterOutOfSync = false;
$masterResume = null;
if ($resume->master_resume_id) {
    $master = Resume::find($resume->master_resume_id);
    if ($master) {
        $masterResume = ['id' => $master->id, 'name' => $master->name];
        $masterOutOfSync = $resume->master_synced_at === null
            || $master->updated_at->gt($resume->master_synced_at);
    }
}
```

Add these two props to the `Inertia::render('ResumeBuilder/Edit', [...])` array:

```php
'masterOutOfSync' => $masterOutOfSync,
'masterResume' => $masterResume,
```

- [ ] **Step 8: Add 3 routes to `routes/web.php`**

After `Route::post('/builder/{resume}/create-variant', ...)` (around line 91), add:

```php
Route::patch('/builder/{resume}/set-master', [ResumeBuilderController::class, 'setMaster'])->name('builder.set-master');
Route::post('/builder/{resume}/create-tailored-copy', [ResumeBuilderController::class, 'createTailoredCopy'])->name('builder.create-tailored-copy');
Route::patch('/builder/{resume}/sync-master', [ResumeBuilderController::class, 'syncMaster'])->name('builder.sync-master');
```

- [ ] **Step 9: Run pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 10: Run tests — confirm they pass**

```bash
php artisan test --compact tests/Feature/MasterResumeTest.php
```

Expected: 5 passed.

- [ ] **Step 11: Commit**

```bash
git add database/migrations/ app/Models/Resume.php app/Http/Controllers/ResumeBuilderController.php routes/web.php tests/Feature/MasterResumeTest.php
git commit -m "feat: master resume — migration, model, controller methods, 5 tests"
```

---

## Task 2: Master Resume — Frontend

**Files:**
- Modify: `resources/js/types/index.d.ts`
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

- [ ] **Step 1: Extend `ResumeRow` in `resources/js/types/index.d.ts`**

Find the `ResumeRow` interface (around line 145) and add four fields:

```typescript
export interface ResumeRow {
    id: number;
    name: string;
    pdf_filename: string | null;
    updated_at: string;
    strength: number;
    strength_tip: string;
    view_count: number;
    ab_parent_id: number | null;
    tags: ResumeTag[];
    is_master: boolean;
    master_resume_id: number | null;
    master_updated_at: string | null;
    master_synced_at: string | null;
    has_active_share_link: boolean;
}
```

(`has_active_share_link` is added here for Task 4 — include it now to avoid a second edit.)

- [ ] **Step 2: Add master badge + stale badge + tailored-copy button to `Index.tsx`**

In the resume table row (around where `r.ab_parent_id !== null` check is), add after that badge check:

```tsx
{r.is_master && (
    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
        Master
    </span>
)}
{r.master_resume_id !== null && r.master_updated_at && r.master_synced_at && r.master_updated_at > r.master_synced_at && (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        ⚠ Master updated
    </span>
)}
```

In the actions column (where the A/B and Duplicate buttons are), add after the A/B button:

```tsx
{r.is_master && (
    <button
        onClick={() => router.post(route('builder.create-tailored-copy', r.id), {}, { preserveScroll: false })}
        title="Create tailored copy"
        className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f5f5fb] transition text-xs font-semibold"
    >
        Tailored
    </button>
)}
<button
    onClick={() => router.patch(route('builder.set-master', r.id), {}, { preserveScroll: true })}
    title={r.is_master ? 'Unset master' : 'Set as master'}
    className={`rounded-lg p-1.5 transition text-xs font-semibold ${r.is_master ? 'text-violet-600 hover:bg-violet-50' : 'text-[#71717a] hover:bg-[#f5f5fb]'}`}
>
    {r.is_master ? 'Master ✓' : 'Master'}
</button>
```

- [ ] **Step 3: Add stale-copy banner to `Edit.tsx`**

Find the `Edit` component's props interface (top of the file) and add:

```typescript
masterOutOfSync?: boolean;
masterResume?: { id: number; name: string } | null;
```

In the component body, destructure the new props alongside the existing ones:

```typescript
const { resume, masterOutOfSync, masterResume, /* ...existing props... */ } = props;
```

Add a `useState` to allow local dismissal:

```typescript
const [syncDismissed, setSyncDismissed] = useState(false);
```

In the JSX, add a banner near the top of the left editor panel (before the first section editor), inside the scrollable editor area:

```tsx
{masterOutOfSync && !syncDismissed && masterResume && (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
        <span className="text-amber-800">
            Your master resume has been updated — this tailored copy may be out of date.
        </span>
        <div className="ml-4 flex shrink-0 gap-3">
            <a href={route('builder.edit', masterResume.id)} className="font-medium text-amber-700 underline hover:text-amber-900">
                View master →
            </a>
            <button
                className="font-medium text-amber-600 hover:text-amber-800"
                onClick={() => {
                    setSyncDismissed(true);
                    router.patch(route('builder.sync-master', resume.id), {}, { preserveScroll: true });
                }}
            >
                Dismiss
            </button>
        </div>
    </div>
)}
```

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: `tsc` and `vite build` complete with no errors.

- [ ] **Step 5: Commit**

```bash
git add resources/js/types/index.d.ts resources/js/Pages/ResumeBuilder/Index.tsx resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: master resume — dashboard badges, tailored-copy button, stale banner in editor"
```

---

## Task 3: Recruiter Heatmaps — Migration, Model, Backend

**Files:**
- Create: `database/migrations/2026_06_07_180001_create_resume_section_events_table.php`
- Create: `app/Models/ResumeSectionEvent.php`
- Create: `app/Http/Controllers/SectionEventController.php`
- Create: `app/Http/Controllers/HeatmapController.php`
- Modify: `routes/web.php`
- Create: `tests/Feature/HeatmapTest.php`

- [ ] **Step 1: Write the failing tests**

```bash
php artisan make:test --phpunit HeatmapTest
```

Replace file content:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeSectionEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HeatmapTest extends TestCase
{
    use RefreshDatabase;

    public function test_section_events_stored_for_valid_active_token(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $this->postJson(route('public.section-events', $link->token), [
            'sections' => [
                ['section' => 'summary', 'dwell_ms' => 3000],
                ['section' => 'experience', 'dwell_ms' => 8000],
            ],
        ])->assertOk();

        $this->assertDatabaseCount('resume_section_events', 2);
        $this->assertDatabaseHas('resume_section_events', ['section' => 'summary', 'dwell_ms' => 3000]);
    }

    public function test_invalid_or_inactive_token_returns_404(): void
    {
        $this->postJson('/r/no-such-token/section-events', [
            'sections' => [['section' => 'summary', 'dwell_ms' => 1000]],
        ])->assertStatus(404);

        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => false]);

        $this->postJson(route('public.section-events', $link->token), [
            'sections' => [['section' => 'summary', 'dwell_ms' => 1000]],
        ])->assertStatus(404);
    }

    public function test_dwell_ms_is_clamped_to_120000(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $link = ResumeShareLink::factory()->for($resume)->create(['is_active' => true]);

        $this->postJson(route('public.section-events', $link->token), [
            'sections' => [['section' => 'experience', 'dwell_ms' => 999999]],
        ])->assertOk();

        $this->assertEquals(120000, ResumeSectionEvent::first()->dwell_ms);
    }

    public function test_heatmap_page_returns_sections_aggregated_by_view_count(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        foreach (['experience', 'experience', 'summary'] as $section) {
            ResumeSectionEvent::create([
                'resume_id' => $resume->id,
                'section' => $section,
                'dwell_ms' => 5000,
                'ip_hash' => 'abc123',
            ]);
        }

        $this->actingAs($user)
            ->get(route('builder.heatmap', $resume->id))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('ResumeBuilder/Heatmap')
                ->where('sections.0.section', 'experience')
                ->where('sections.0.view_count', 2)
            );
    }

    public function test_heatmap_page_requires_authentication(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        $this->get(route('builder.heatmap', $resume->id))
            ->assertRedirect(route('login'));
    }
}
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
php artisan test --compact tests/Feature/HeatmapTest.php
```

Expected: all 5 fail.

- [ ] **Step 3: Create the migration**

```bash
php artisan make:migration create_resume_section_events_table
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
        Schema::create('resume_section_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->string('section');
            $table->unsignedInteger('dwell_ms');
            $table->string('ip_hash');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resume_section_events');
    }
};
```

```bash
php artisan migrate
```

- [ ] **Step 4: Create `app/Models/ResumeSectionEvent.php`**

```bash
php artisan make:model ResumeSectionEvent
```

Replace the generated file:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResumeSectionEvent extends Model
{
    public $timestamps = false;

    protected $fillable = ['resume_id', 'section', 'dwell_ms', 'ip_hash'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
```

- [ ] **Step 5: Create `app/Http/Controllers/SectionEventController.php`**

```bash
php artisan make:controller SectionEventController
```

Replace file content:

```php
<?php

namespace App\Http\Controllers;

use App\Models\ResumeSectionEvent;
use App\Models\ResumeShareLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SectionEventController extends Controller
{
    public function store(Request $request, string $token): JsonResponse
    {
        try {
            $link = ResumeShareLink::where('token', $token)->where('is_active', true)->first();
            if (! $link) {
                return response()->json(['ok' => false], 404);
            }

            $validated = $request->validate([
                'sections' => ['required', 'array', 'max:20'],
                'sections.*.section' => ['required', 'string', 'regex:/^(summary|experience|education|skills|certifications|custom_[a-z0-9_]+)$/'],
                'sections.*.dwell_ms' => ['required', 'integer', 'min:0'],
            ]);

            $ipHash = hash('sha256', $request->ip() ?? '');

            foreach ($validated['sections'] as $item) {
                ResumeSectionEvent::create([
                    'resume_id' => $link->resume_id,
                    'section' => $item['section'],
                    'dwell_ms' => min((int) $item['dwell_ms'], 120000),
                    'ip_hash' => $ipHash,
                ]);
            }

            return response()->json(['ok' => true]);
        } catch (\Throwable) {
            return response()->json(['ok' => false]);
        }
    }
}
```

- [ ] **Step 6: Create `app/Http/Controllers/HeatmapController.php`**

```bash
php artisan make:controller HeatmapController
```

Replace file content:

```php
<?php

namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeSectionEvent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HeatmapController extends Controller
{
    public function show(Request $request, Resume $resume): Response
    {
        $this->authorize('update', $resume);

        $sections = ResumeSectionEvent::query()
            ->where('resume_id', $resume->id)
            ->selectRaw('section, COUNT(*) as view_count, AVG(dwell_ms) as avg_dwell_ms')
            ->groupBy('section')
            ->orderByDesc('view_count')
            ->get()
            ->map(fn ($row) => [
                'section' => $row->section,
                'view_count' => (int) $row->view_count,
                'avg_dwell_ms' => (float) $row->avg_dwell_ms,
            ])
            ->all();

        return Inertia::render('ResumeBuilder/Heatmap', [
            'resume' => ['id' => $resume->id, 'name' => $resume->name],
            'sections' => $sections,
        ]);
    }
}
```

- [ ] **Step 7: Add 2 routes to `routes/web.php`**

In the public share link section (after the `/r/{token}/og-image` route, around line 195):

```php
Route::post('/r/{token}/section-events', [SectionEventController::class, 'store'])
    ->middleware('throttle:30,1')
    ->name('public.section-events');
```

Add the `use` import for `SectionEventController` at the top of `routes/web.php`.

In the authenticated builder routes block (after the existing compare route), add:

```php
Route::get('/builder/{resume}/heatmap', [HeatmapController::class, 'show'])->name('builder.heatmap');
```

Add the `use` import for `HeatmapController` at the top of `routes/web.php`.

- [ ] **Step 8: Add `has_active_share_link` to `index()` in `ResumeBuilderController`**

After the existing `$viewCounts` query, add:

```php
$activeShareResumeIds = \App\Models\ResumeShareLink::where('is_active', true)
    ->whereIn('resume_id', $resumeCollection->pluck('id'))
    ->pluck('resume_id')
    ->flip();
```

In the `$resumeCollection->map(...)` callback, add after `master_synced_at`:

```php
'has_active_share_link' => isset($activeShareResumeIds[$resume->id]),
```

- [ ] **Step 9: Run pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 10: Run tests — confirm they pass**

```bash
php artisan test --compact tests/Feature/HeatmapTest.php
```

Expected: 5 passed.

- [ ] **Step 11: Commit**

```bash
git add database/migrations/ app/Models/ResumeSectionEvent.php app/Http/Controllers/SectionEventController.php app/Http/Controllers/HeatmapController.php routes/web.php app/Http/Controllers/ResumeBuilderController.php tests/Feature/HeatmapTest.php
git commit -m "feat: recruiter heatmaps — migration, model, controllers, routes, 5 tests"
```

---

## Task 4: Recruiter Heatmaps — Frontend

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/PublicView.tsx`
- Create: `resources/js/Pages/ResumeBuilder/Heatmap.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Index.tsx`

- [ ] **Step 1: Add `useSectionHeatmap` hook and `data-section` attributes to `PublicView.tsx`**

At the top of the component file (before the `export default` function), add the hook:

```typescript
import { useEffect, useRef } from 'react';

function useSectionHeatmap(token: string): void {
    const startTimes = useRef<Record<string, number>>({});
    const accumulated = useRef<Record<string, number>>({});
    const pageStart = useRef<number>(Date.now());

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const section = (entry.target as HTMLElement).dataset.section;
                if (!section) { return; }
                if (entry.isIntersecting) {
                    startTimes.current[section] = Date.now();
                } else if (startTimes.current[section] !== undefined) {
                    accumulated.current[section] = (accumulated.current[section] ?? 0) + (Date.now() - startTimes.current[section]);
                    delete startTimes.current[section];
                }
            });
        }, { threshold: 0.25 });

        document.querySelectorAll('[data-section]').forEach(el => observer.observe(el));

        const handleUnload = (): void => {
            if (Date.now() - pageStart.current < 500) { return; }
            Object.entries(startTimes.current).forEach(([section, start]) => {
                accumulated.current[section] = (accumulated.current[section] ?? 0) + (Date.now() - start);
            });
            const sections = Object.entries(accumulated.current).map(([section, dwell_ms]) => ({ section, dwell_ms }));
            if (sections.length === 0) { return; }
            navigator.sendBeacon(
                route('public.section-events', token),
                JSON.stringify({ sections }),
            );
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            observer.disconnect();
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [token]);
}
```

In the `PublicView` component body, call the hook:

```typescript
useSectionHeatmap(token);
```

Add `data-section` attributes to the five section wrappers:

- Summary `<section>` tag: add `data-section="summary"`
- Experience `<section>` tag: add `data-section="experience"`
- Education `<section>` tag: add `data-section="education"`
- Skills `<section>` tag: add `data-section="skills"`
- Certifications `<section>` tag: add `data-section="certifications"`

Each becomes e.g.:
```tsx
{resume.summary && (
    <section className="mb-8" data-section="summary">
```

- [ ] **Step 2: Create `resources/js/Pages/ResumeBuilder/Heatmap.tsx`**

```typescript
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface HeatmapSection {
    section: string;
    view_count: number;
    avg_dwell_ms: number;
}

interface Props {
    resume: { id: number; name: string };
    sections: HeatmapSection[];
}

const SECTION_LABELS: Record<string, string> = {
    summary: 'Summary',
    experience: 'Work Experience',
    education: 'Education',
    skills: 'Skills',
    certifications: 'Certifications',
};

function formatSection(section: string): string {
    if (SECTION_LABELS[section]) {
        return SECTION_LABELS[section];
    }
    if (section.startsWith('custom_')) {
        return section
            .replace('custom_', '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, c => c.toUpperCase());
    }
    return section;
}

export default function Heatmap({ resume, sections }: Props) {
    const maxCount = Math.max(...sections.map(s => s.view_count), 1);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Resume Heatmap — {resume.name}
                </h2>
            }
        >
            <Head title={`Heatmap — ${resume.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6 lg:px-8">
                    <div>
                        <Link href={route('builder.index')} className="text-sm text-indigo-600 hover:underline">
                            ← Back to resumes
                        </Link>
                    </div>

                    {sections.length === 0 ? (
                        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
                            <p className="text-gray-500">No public views recorded yet.</p>
                            <p className="mt-1 text-sm text-gray-400">
                                Share your resume to start collecting section attention data.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                            {sections.map(s => (
                                <div key={s.section} className="flex items-center gap-4 px-6 py-4">
                                    <div className="w-36 shrink-0 text-sm font-medium text-gray-700">
                                        {formatSection(s.section)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-5 overflow-hidden rounded-full bg-gray-100">
                                            <div
                                                className="h-full rounded-full bg-indigo-500 transition-all"
                                                style={{ width: `${Math.round((s.view_count / maxCount) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="w-44 shrink-0 text-right text-sm text-gray-500">
                                        {s.view_count} view{s.view_count !== 1 ? 's' : ''} · avg {(s.avg_dwell_ms / 1000).toFixed(1)}s
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Add heatmap link to resume card in `Index.tsx`**

In the actions column of the resume table row (after the heatmap link makes sense — near the view count badge, or in the actions cell), add inside the actions div:

```tsx
{r.has_active_share_link && (
    <Link
        href={route('builder.heatmap', r.id)}
        title="View section heatmap"
        className="rounded-lg p-1.5 text-[#71717a] hover:bg-[#f5f5fb] transition text-xs"
    >
        Heatmap
    </Link>
)}
```

(`Link` is already imported from `@inertiajs/react` in Index.tsx.)

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: `tsc` and `vite build` complete with no errors.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/PublicView.tsx resources/js/Pages/ResumeBuilder/Heatmap.tsx resources/js/Pages/ResumeBuilder/Index.tsx
git commit -m "feat: recruiter heatmaps — IntersectionObserver tracking in PublicView, Heatmap analytics page"
```

---

## Task 5: Referral Upgrade Tracking + Rewards

**Files:**
- Create: `app/Services/ReferralRewardService.php`
- Modify: `app/Providers/AppServiceProvider.php`
- Create: `tests/Feature/ReferralUpgradeTest.php`

- [ ] **Step 1: Write the failing tests**

```bash
php artisan make:test --phpunit ReferralUpgradeTest
```

Replace file content:

```php
<?php

namespace Tests\Feature;

use App\Models\ReferralEvent;
use App\Models\User;
use App\Services\ReferralRewardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferralUpgradeTest extends TestCase
{
    use RefreshDatabase;

    public function test_upgrade_fires_referral_upgrade_event(): void
    {
        $referrer = User::factory()->create();
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);

        ReferralRewardService::grantIfEligible($referred);

        $this->assertDatabaseHas('referral_events', [
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referred->id,
            'event_type' => 'upgrade',
        ]);
    }

    public function test_referrer_rewards_earned_is_incremented(): void
    {
        $referrer = User::factory()->create(['referral_rewards_earned' => 0]);
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);

        ReferralRewardService::grantIfEligible($referred);

        $this->assertEquals(1, $referrer->fresh()->referral_rewards_earned);
    }

    public function test_double_upgrade_does_not_double_reward(): void
    {
        $referrer = User::factory()->create(['referral_rewards_earned' => 0]);
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);

        ReferralRewardService::grantIfEligible($referred);
        ReferralRewardService::grantIfEligible($referred);

        $this->assertEquals(1, $referrer->fresh()->referral_rewards_earned);
        $this->assertDatabaseCount('referral_events', 1);
    }

    public function test_no_reward_when_user_has_no_referrer(): void
    {
        $user = User::factory()->create(['referred_by_user_id' => null]);

        ReferralRewardService::grantIfEligible($user);

        $this->assertDatabaseCount('referral_events', 0);
    }

    public function test_referral_show_returns_correct_upgrade_counts(): void
    {
        $referrer = User::factory()->create(['referral_rewards_earned' => 2]);
        $referred = User::factory()->create(['referred_by_user_id' => $referrer->id]);

        ReferralEvent::create([
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referred->id,
            'event_type' => 'signup',
        ]);
        ReferralEvent::create([
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referred->id,
            'event_type' => 'upgrade',
        ]);

        $this->actingAs($referrer)
            ->get(route('referral.show'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('totalSignups', 1)
                ->where('totalUpgrades', 1)
                ->where('rewardsEarned', 2)
            );
    }
}
```

- [ ] **Step 2: Run tests — confirm they fail**

```bash
php artisan test --compact tests/Feature/ReferralUpgradeTest.php
```

Expected: all 5 fail (class not found).

- [ ] **Step 3: Create `app/Services/ReferralRewardService.php`**

```bash
php artisan make:class Services/ReferralRewardService
```

Replace file content:

```php
<?php

namespace App\Services;

use App\Models\ReferralEvent;
use App\Models\User;
use Laravel\Cashier\Cashier;

class ReferralRewardService
{
    public static function grantIfEligible(User $upgradedUser): void
    {
        try {
            if (! $upgradedUser->referred_by_user_id) {
                return;
            }

            if (ReferralEvent::where('referred_user_id', $upgradedUser->id)
                ->where('event_type', 'upgrade')
                ->exists()) {
                return;
            }

            $referrer = User::find($upgradedUser->referred_by_user_id);
            if (! $referrer) {
                return;
            }

            ReferralEvent::create([
                'referrer_user_id' => $referrer->id,
                'referred_user_id' => $upgradedUser->id,
                'event_type' => 'upgrade',
            ]);

            $referrer->increment('referral_rewards_earned');

            if ($referrer->subscribed('default')) {
                $referrer->subscription('default')->extend(now()->addMonth());
            } else {
                $referrer->createOrGetStripeCustomer();
                Cashier::stripe()->customers->createBalanceTransaction(
                    $referrer->stripeId(),
                    [
                        'amount' => -900,
                        'currency' => 'usd',
                        'description' => 'Referral reward — 1 free month',
                    ]
                );
            }
        } catch (\Throwable) {
            // Never crash the Stripe webhook handler
        }
    }
}
```

- [ ] **Step 4: Wire `ReferralRewardService` into `AppServiceProvider`**

In `app/Providers/AppServiceProvider.php`, add the import:

```php
use App\Services\ReferralRewardService;
```

In the `Subscription::saved` callback, after `User::where('id', $subscription->user_id)->update(['plan_tier' => $tier]);`, add:

```php
if (in_array($tier, ['starter', 'pro'])) {
    $user = User::find($subscription->user_id);
    if ($user) {
        ReferralRewardService::grantIfEligible($user);
    }
}
```

The full `Subscription::saved` closure now reads:

```php
Subscription::saved(function (Subscription $subscription) {
    if (in_array($subscription->stripe_status, ['canceled', 'incomplete_expired', 'unpaid'])) {
        User::where('id', $subscription->user_id)->update(['plan_tier' => 'free']);
        return;
    }

    if (! in_array($subscription->stripe_status, ['active', 'trialing'])) {
        return;
    }

    $item = $subscription->items()->first();
    if (! $item) {
        return;
    }

    $tier = UserLimits::tierFromPriceId($item->stripe_price);
    User::where('id', $subscription->user_id)->update(['plan_tier' => $tier]);

    if (in_array($tier, ['starter', 'pro'])) {
        $user = User::find($subscription->user_id);
        if ($user) {
            ReferralRewardService::grantIfEligible($user);
        }
    }
});
```

- [ ] **Step 5: Run pint**

```bash
./vendor/bin/pint --dirty --format agent
```

- [ ] **Step 6: Run tests — confirm they pass**

```bash
php artisan test --compact tests/Feature/ReferralUpgradeTest.php
```

Expected: 5 passed. (The Stripe code paths for subscribed users and customer balance are wrapped in try/catch so they gracefully no-op in the test environment with no real Stripe credentials.)

- [ ] **Step 7: Commit**

```bash
git add app/Services/ReferralRewardService.php app/Providers/AppServiceProvider.php tests/Feature/ReferralUpgradeTest.php
git commit -m "feat: referral upgrade tracking — ReferralRewardService, AppServiceProvider wiring, 5 tests"
```

---

## Task 6: Full Suite Verification

- [ ] **Step 1: Run full test suite**

```bash
php artisan test --compact
```

Expected: all tests pass (524 existing + 15 new = 539 total).

- [ ] **Step 2: Update CONTEXT.md**

```
# Resumegen Context

## Current Task
Batch 11 complete — master resume, recruiter heatmaps, referral rewards. 539/539 tests passing.

## Key Decisions
- Master resume uses is_master + master_resume_id + master_synced_at; copies detect stale via updated_at comparison
- Heatmap tracking uses IntersectionObserver + sendBeacon in PublicView.tsx; section_events table is append-only
- ReferralRewardService is called from Subscription observer; idempotency guard prevents double-rewarding

## Next Steps
- Batch 12 candidates: real-time live score, custom domain for public resume, recruiter multi-seat
```

- [ ] **Step 3: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: update CONTEXT.md — Batch 11 complete"
```
