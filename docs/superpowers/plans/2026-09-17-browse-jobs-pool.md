# Browse Jobs + Application Pool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users search an imported job-listings dataset, save listings to a personal pool with a resume attached, and expose that pool to the Chrome extension via a new authenticated API endpoint.

**Architecture:** Two new tables (`job_listings`, `job_pool_entries`), a one-shot artisan import command, two new web controllers (`JobListingController`, `JobPoolController`) behind a single Inertia page (`Jobs/Browse.tsx`) with a client-side Browse/My Pool toggle, and one new method on the existing `ExtensionController` for the extension's read-only pool feed. No changes to `job_applications`/Kanban.

**Tech Stack:** Laravel 13, PHP 8.5, PostgreSQL (prod) / SQLite (tests), Inertia v3, React 19, TypeScript, existing `@/Components/ui/*` component set (Dialog, Button, Input, Label, Select — already used by `add-job-modal.tsx`).

**Spec:** `docs/superpowers/specs/2026-09-17-browse-jobs-pool-design.md`

## Global Constraints

- Search MUST use case-insensitive `LIKE`, not Postgres-only FTS (`to_tsvector`, GIN) — tests run on in-memory SQLite, which has no `tsvector` type. This deviates from the spec's `search_vector` column; see decision logged during planning. Deviation note lives in this plan only — do not edit the spec file to match.
- No `job_listings`/`job_pool_entries` row ever creates or touches a `JobApplication` row. Zero coupling to `CreateJobApplication` or `job_applications`.
- All new web routes go inside the existing `['auth', 'verified', 'two_factor_challenge']` group in `routes/web.php`.
- Ownership checks are inline `abort_unless(...)`, never a policy class — no `JobPoolPolicy`/`JobListingPolicy`. Matches every other controller in this app.
- `job_pool_entries.resume_id` is NOT NULL — a pool entry always has a resume attached, chosen at add-time.
- Extension endpoint follows `ExtensionController` conventions exactly: `ensureExtensionToken($request)` as the first line, ability check via existing helper, no new auth mechanism.
- Run `vendor/bin/pint --dirty --format agent` after PHP changes.
- Run `php artisan test --compact` (or a filtered subset) after each task; do not move on with red tests.
- New models are `JobListing` and `JobPoolEntry` — no other names.

---

## Task 1: `job_listings` table + `JobListing` model

**Files:**
- Create: `database/migrations/2026_09_17_130000_create_job_listings_table.php`
- Create: `app/Models/JobListing.php`
- Test: `tests/Unit/Models/JobListingTest.php`

**Interfaces:**
- Produces: `JobListing` Eloquent model, table `job_listings` with columns `id`, `external_id` (unique string), `title` (string), `company` (string), `location` (string, nullable), `job_url` (string), `description` (text, nullable), timestamps. `JobListing::query()`, `JobListing::create([...])`, `JobListing::where('external_id', ...)`.

- [ ] **Step 1: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_listings', function (Blueprint $table) {
            $table->id();
            $table->string('external_id')->unique();
            $table->string('title');
            $table->string('company');
            $table->string('location')->nullable();
            $table->string('job_url');
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index('company');
            $table->index('location');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_listings');
    }
};
```

- [ ] **Step 2: Write the model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobListing extends Model
{
    use HasFactory;

    protected $fillable = [
        'external_id',
        'title',
        'company',
        'location',
        'job_url',
        'description',
    ];
}
```

- [ ] **Step 3: Write the factory**

Create `database/factories/JobListingFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\JobListing;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobListingFactory extends Factory
{
    protected $model = JobListing::class;

    public function definition(): array
    {
        return [
            'external_id' => $this->faker->unique()->uuid(),
            'title' => $this->faker->jobTitle(),
            'company' => $this->faker->company(),
            'location' => $this->faker->city(),
            'job_url' => $this->faker->url(),
            'description' => $this->faker->paragraphs(3, true),
        ];
    }
}
```

- [ ] **Step 4: Write the failing test**

```php
<?php

namespace Tests\Unit\Models;

use App\Models\JobListing;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobListingTest extends TestCase
{
    use RefreshDatabase;

    public function test_external_id_is_unique(): void
    {
        JobListing::factory()->create(['external_id' => 'dup-1']);

        $this->expectException(\Illuminate\Database\QueryException::class);

        JobListing::factory()->create(['external_id' => 'dup-1']);
    }

    public function test_fillable_fields_persist(): void
    {
        $listing = JobListing::factory()->create([
            'title' => 'Backend Engineer',
            'company' => 'Acme Corp',
            'location' => 'Remote',
            'job_url' => 'https://example.com/jobs/1',
            'description' => 'Build things.',
        ]);

        $this->assertDatabaseHas('job_listings', [
            'id' => $listing->id,
            'title' => 'Backend Engineer',
            'company' => 'Acme Corp',
        ]);
    }
}
```

- [ ] **Step 5: Run migration and test**

Run: `php artisan test tests/Unit/Models/JobListingTest.php --compact`
Expected: PASS (migration runs automatically under `RefreshDatabase`)

- [ ] **Step 6: Pint + register + commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_17_130000_create_job_listings_table.php app/Models/JobListing.php database/factories/JobListingFactory.php tests/Unit/Models/JobListingTest.php
git commit -m "feat: add job_listings table and model

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 2: `job_pool_entries` table + `JobPoolEntry` model + relations

**Files:**
- Create: `database/migrations/2026_09_17_130100_create_job_pool_entries_table.php`
- Create: `app/Models/JobPoolEntry.php`
- Modify: `app/Models/User.php` — add `jobPoolEntries()` relation
- Modify: `app/Models/Resume.php` — add `jobPoolEntries()` relation
- Test: `tests/Unit/Models/JobPoolEntryTest.php`

**Interfaces:**
- Consumes: `JobListing` (Task 1), `Resume`, `User` (existing models).
- Produces: `JobPoolEntry` model with `belongsTo(User::class)`, `belongsTo(JobListing::class)`, `belongsTo(Resume::class)`. `User::jobPoolEntries(): HasMany`. `Resume::jobPoolEntries(): HasMany`.

- [ ] **Step 1: Write the migration**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_pool_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('job_listing_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'job_listing_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_pool_entries');
    }
};
```

- [ ] **Step 2: Write the model**

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JobPoolEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'job_listing_id',
        'resume_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function jobListing(): BelongsTo
    {
        return $this->belongsTo(JobListing::class);
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }
}
```

- [ ] **Step 3: Add relations to `User` and `Resume`**

In `app/Models/User.php`, add near the other `hasMany` relations (find `jobApplications()` and add after it):

```php
    public function jobPoolEntries(): HasMany
    {
        return $this->hasMany(JobPoolEntry::class);
    }
```

Add `use App\Models\JobPoolEntry;` is unnecessary (same namespace); confirm `use Illuminate\Database\Eloquent\Relations\HasMany;` is already imported (it is, for `jobApplications()`).

In `app/Models/Resume.php`, add near the other `hasMany` relations (e.g. next to `experiences()`):

```php
    public function jobPoolEntries(): HasMany
    {
        return $this->hasMany(JobPoolEntry::class);
    }
```

Confirm `HasMany` is already imported in `Resume.php` (it is, for `experiences()`/`skills()`).

- [ ] **Step 4: Write the factory**

Create `database/factories/JobPoolEntryFactory.php`:

```php
<?php

namespace Database\Factories;

use App\Models\JobListing;
use App\Models\JobPoolEntry;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class JobPoolEntryFactory extends Factory
{
    protected $model = JobPoolEntry::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'job_listing_id' => JobListing::factory(),
            'resume_id' => Resume::factory(),
        ];
    }
}
```

- [ ] **Step 5: Write the failing test**

```php
<?php

namespace Tests\Unit\Models;

use App\Models\JobListing;
use App\Models\JobPoolEntry;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobPoolEntryTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_cannot_pool_the_same_listing_twice(): void
    {
        $user = User::factory()->create();
        $listing = JobListing::factory()->create();
        $resume = Resume::factory()->for($user)->create();

        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->expectException(\Illuminate\Database\QueryException::class);

        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);
    }

    public function test_deleting_user_cascades_to_pool_entries(): void
    {
        $user = User::factory()->create();
        $listing = JobListing::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $entry = JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $user->delete();

        $this->assertDatabaseMissing('job_pool_entries', ['id' => $entry->id]);
    }

    public function test_user_job_pool_entries_relation(): void
    {
        $user = User::factory()->create();
        $listing = JobListing::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->assertCount(1, $user->fresh()->jobPoolEntries);
    }
}
```

- [ ] **Step 6: Run tests**

Run: `php artisan test tests/Unit/Models/JobPoolEntryTest.php --compact`
Expected: PASS

- [ ] **Step 7: Pint + register + commit**

```bash
vendor/bin/pint --dirty --format agent
git add database/migrations/2026_09_17_130100_create_job_pool_entries_table.php app/Models/JobPoolEntry.php app/Models/User.php app/Models/Resume.php database/factories/JobPoolEntryFactory.php tests/Unit/Models/JobPoolEntryTest.php
git commit -m "feat: add job_pool_entries table, model, and relations

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 3: `app:import-job-listings` artisan command

**Files:**
- Create: `app/Console/Commands/Jobs/ImportJobListings.php`
- Test: `tests/Feature/Console/ImportJobListingsTest.php`

**Interfaces:**
- Consumes: `JobListing` model (Task 1).
- Produces: artisan command `app:import-job-listings {path}` reading a JSONL file (one JSON object per line) with keys `external_id`, `title`, `company`, `location`, `job_url`, `description`; upserts into `job_listings` by `external_id`. Mirrors `App\Console\Commands\Companies\ImportCompanies` exactly (same chunked-upsert structure), but reads JSONL instead of a parquet-derived intermediate — the parquet→JSONL conversion is a one-off local step run manually before invoking this command (matches how `ImportCompanies` is fed), not something this command does itself.

- [ ] **Step 1: Write the command**

```php
<?php

namespace App\Console\Commands\Jobs;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('app:import-job-listings {path : Path to the JSONL file to import}')]
#[Description('Import job listings from a JSONL file (one JSON object per line) into the job_listings table')]
class ImportJobListings extends Command
{
    public function handle(): int
    {
        $path = $this->argument('path');

        if (! is_file($path)) {
            $this->error("File not found: {$path}");

            return self::FAILURE;
        }

        $columns = ['external_id', 'title', 'company', 'location', 'job_url', 'description'];

        $handle = fopen($path, 'r');
        $chunk = [];
        $total = 0;
        $chunkSize = 500;

        $this->output->progressStart();

        while (($line = fgets($handle)) !== false) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            $row = json_decode($line, true, flags: JSON_THROW_ON_ERROR);
            $now = now();
            $chunk[] = [
                ...array_intersect_key($row, array_flip($columns)),
                'created_at' => $now,
                'updated_at' => $now,
            ];

            if (count($chunk) >= $chunkSize) {
                DB::table('job_listings')->upsert($chunk, ['external_id'], $columns);
                $total += count($chunk);
                $chunk = [];
                $this->output->progressAdvance($chunkSize);
            }
        }

        if ($chunk !== []) {
            DB::table('job_listings')->upsert($chunk, ['external_id'], $columns);
            $total += count($chunk);
        }

        fclose($handle);
        $this->output->progressFinish();

        $this->info("Imported {$total} job listings.");

        return self::SUCCESS;
    }
}
```

- [ ] **Step 2: Write the failing test**

```php
<?php

namespace Tests\Feature\Console;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImportJobListingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_imports_and_upserts_by_external_id(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'job-listings').'.jsonl';
        file_put_contents($path, implode("\n", [
            json_encode([
                'external_id' => 'ext-1',
                'title' => 'Backend Engineer',
                'company' => 'Acme Corp',
                'location' => 'Remote',
                'job_url' => 'https://example.com/jobs/1',
                'description' => 'Build things.',
            ]),
            json_encode([
                'external_id' => 'ext-2',
                'title' => 'Frontend Engineer',
                'company' => 'Acme Corp',
                'location' => 'NYC',
                'job_url' => 'https://example.com/jobs/2',
                'description' => null,
            ]),
        ]));

        $this->artisan('app:import-job-listings', ['path' => $path])
            ->assertSuccessful();

        $this->assertDatabaseCount('job_listings', 2);
        $this->assertDatabaseHas('job_listings', ['external_id' => 'ext-1', 'title' => 'Backend Engineer']);

        // Re-run with an updated title for ext-1 — must upsert, not duplicate.
        file_put_contents($path, json_encode([
            'external_id' => 'ext-1',
            'title' => 'Staff Backend Engineer',
            'company' => 'Acme Corp',
            'location' => 'Remote',
            'job_url' => 'https://example.com/jobs/1',
            'description' => 'Build things.',
        ]));

        $this->artisan('app:import-job-listings', ['path' => $path])
            ->assertSuccessful();

        $this->assertDatabaseCount('job_listings', 2);
        $this->assertDatabaseHas('job_listings', ['external_id' => 'ext-1', 'title' => 'Staff Backend Engineer']);

        unlink($path);
    }

    public function test_it_fails_on_missing_file(): void
    {
        $this->artisan('app:import-job-listings', ['path' => '/tmp/does-not-exist.jsonl'])
            ->assertFailed();
    }
}
```

- [ ] **Step 3: Run tests**

Run: `php artisan test tests/Feature/Console/ImportJobListingsTest.php --compact`
Expected: PASS

- [ ] **Step 4: Pint + register + commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Console/Commands/Jobs/ImportJobListings.php tests/Feature/Console/ImportJobListingsTest.php
git commit -m "feat: add app:import-job-listings artisan command

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 4: `JobListingController` — browse/search endpoint

**Files:**
- Create: `app/Http/Controllers/JobListingController.php`
- Modify: `routes/web.php` — add `jobs.browse` route
- Test: `tests/Feature/JobListingControllerTest.php`

**Interfaces:**
- Consumes: `JobListing` model (Task 1).
- Produces: `GET /jobs/browse` → Inertia page `Jobs/Browse` with prop `listings: { data: JobListingRow[], links: ..., meta: ... }` (standard `LengthAwarePaginator::toArray()` shape from `paginate()->through(...)`), and prop `filters: { q: ?string, location: ?string, company: ?string }` echoing back the applied query params. `JobListingRow` shape: `{ id, title, company, location, job_url }` (no `description` — list view doesn't need the full text).

- [ ] **Step 1: Write the controller**

```php
<?php

namespace App\Http\Controllers;

use App\Models\JobListing;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobListingController extends Controller
{
    public function index(Request $request): Response
    {
        $query = JobListing::query();

        if ($q = $request->string('q')->trim()->toString()) {
            $query->where(function ($sub) use ($q) {
                $sub->where('title', 'like', "%{$q}%")
                    ->orWhere('description', 'like', "%{$q}%");
            });
        }

        if ($location = $request->string('location')->trim()->toString()) {
            $query->where('location', 'like', "%{$location}%");
        }

        if ($company = $request->string('company')->trim()->toString()) {
            $query->where('company', 'like', "%{$company}%");
        }

        $listings = $query->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (JobListing $listing) => [
                'id' => $listing->id,
                'title' => $listing->title,
                'company' => $listing->company,
                'location' => $listing->location,
                'job_url' => $listing->job_url,
            ]);

        return Inertia::render('Jobs/Browse', [
            'listings' => $listings,
            'filters' => [
                'q' => $request->string('q')->toString() ?: null,
                'location' => $request->string('location')->toString() ?: null,
                'company' => $request->string('company')->toString() ?: null,
            ],
        ]);
    }
}
```

- [ ] **Step 2: Add the route**

In `routes/web.php`, inside the authenticated group, immediately after the `job-applications.stats` line:

```php
    Route::get('/jobs/browse', [JobListingController::class, 'index'])->name('jobs.browse');
```

Add `use App\Http\Controllers\JobListingController;` to the `use` block at the top of the file (alphabetical order with the other controller imports).

- [ ] **Step 3: Write the failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\JobListing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class JobListingControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_job_listings(): void
    {
        $user = User::factory()->create();
        JobListing::factory()->count(3)->create();

        $this->actingAs($user)
            ->get(route('jobs.browse'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Jobs/Browse')
                ->has('listings.data', 3)
            );
    }

    public function test_it_filters_by_keyword(): void
    {
        $user = User::factory()->create();
        JobListing::factory()->create(['title' => 'Backend Engineer']);
        JobListing::factory()->create(['title' => 'Sales Associate']);

        $this->actingAs($user)
            ->get(route('jobs.browse', ['q' => 'Backend']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('listings.data', 1)
                ->where('listings.data.0.title', 'Backend Engineer')
            );
    }

    public function test_it_filters_by_location_and_company(): void
    {
        $user = User::factory()->create();
        JobListing::factory()->create(['company' => 'Acme Corp', 'location' => 'Remote']);
        JobListing::factory()->create(['company' => 'Other Inc', 'location' => 'NYC']);

        $this->actingAs($user)
            ->get(route('jobs.browse', ['company' => 'Acme', 'location' => 'Remote']))
            ->assertInertia(fn (Assert $page) => $page->has('listings.data', 1));
    }

    public function test_guests_are_redirected(): void
    {
        $this->get(route('jobs.browse'))->assertRedirect(route('login'));
    }
}
```

- [ ] **Step 4: Run tests**

Run: `php artisan test tests/Feature/JobListingControllerTest.php --compact`
Expected: PASS

- [ ] **Step 5: Pint + register + commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/JobListingController.php routes/web.php tests/Feature/JobListingControllerTest.php
git commit -m "feat: add job listing browse/search endpoint

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 5: `JobPoolController` — store/destroy + pool list

**Files:**
- Create: `app/Http/Controllers/JobPoolController.php`
- Create: `app/Http/Requests/StoreJobPoolEntryRequest.php`
- Modify: `routes/web.php` — add `job-pool.store`, `job-pool.destroy` routes
- Test: `tests/Feature/JobPoolControllerTest.php`

**Interfaces:**
- Consumes: `JobListing`, `JobPoolEntry` (Tasks 1–2).
- Produces: `POST /jobs/pool` (body `{ job_listing_id, resume_id }`) → creates entry, redirects back; 422 on validation/duplicate. `DELETE /jobs/pool/{jobPoolEntry}` → deletes entry owned by current user, 404 otherwise, redirects back. A shared helper `poolEntries(Request $request): array` is NOT introduced here — `JobListingController::index` (Task 4) does not need pool data; the "My Pool" list is loaded by `JobPoolController::index`, added in this task.

- [ ] **Step 1: Write the form request**

```php
<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreJobPoolEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'job_listing_id' => [
                'required',
                'integer',
                Rule::exists('job_listings', 'id'),
                Rule::unique('job_pool_entries')->where('user_id', $this->user()?->id),
            ],
            'resume_id' => [
                'required',
                'integer',
                Rule::exists('resumes', 'id')->where('user_id', $this->user()?->id),
            ],
        ];
    }
}
```

- [ ] **Step 2: Write the controller**

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreJobPoolEntryRequest;
use App\Models\JobPoolEntry;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class JobPoolController extends Controller
{
    public function index(Request $request): Response
    {
        $entries = $request->user()->jobPoolEntries()
            ->with(['jobListing', 'resume'])
            ->latest('id')
            ->get()
            ->map(fn (JobPoolEntry $entry) => [
                'id' => $entry->id,
                'job_listing_id' => $entry->job_listing_id,
                'title' => $entry->jobListing->title,
                'company' => $entry->jobListing->company,
                'location' => $entry->jobListing->location,
                'job_url' => $entry->jobListing->job_url,
                'resume_id' => $entry->resume_id,
                'resume_title' => $entry->resume->title,
            ]);

        return Inertia::render('Jobs/Pool', [
            'entries' => $entries,
        ]);
    }

    public function store(StoreJobPoolEntryRequest $request): RedirectResponse
    {
        $request->user()->jobPoolEntries()->create($request->validated());

        return back();
    }

    public function destroy(Request $request, JobPoolEntry $jobPoolEntry): RedirectResponse
    {
        abort_unless($jobPoolEntry->user_id === $request->user()->id, 404);

        $jobPoolEntry->delete();

        return back();
    }
}
```

- [ ] **Step 3: Add routes**

In `routes/web.php`, inside the authenticated group, immediately after the `jobs.browse` line added in Task 4:

```php
    Route::get('/jobs/pool', [JobPoolController::class, 'index'])->name('jobs.pool');
    Route::post('/jobs/pool', [JobPoolController::class, 'store'])->name('job-pool.store');
    Route::delete('/jobs/pool/{jobPoolEntry}', [JobPoolController::class, 'destroy'])->name('job-pool.destroy');
```

Add `use App\Http\Controllers\JobPoolController;` to the `use` block (alphabetical order).

- [ ] **Step 4: Write the failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\JobListing;
use App\Models\JobPoolEntry;
use App\Models\Resume;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class JobPoolControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_the_users_pool_entries(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $listing = JobListing::factory()->create();
        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->actingAs($user)
            ->get(route('jobs.pool'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Jobs/Pool')
                ->has('entries', 1)
            );
    }

    public function test_it_does_not_list_other_users_entries(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherResume = Resume::factory()->for($other)->create();
        $listing = JobListing::factory()->create();
        JobPoolEntry::factory()->create([
            'user_id' => $other->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $otherResume->id,
        ]);

        $this->actingAs($user)
            ->get(route('jobs.pool'))
            ->assertInertia(fn (Assert $page) => $page->has('entries', 0));
    }

    public function test_it_adds_a_listing_to_the_pool(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $listing = JobListing::factory()->create();

        $this->actingAs($user)
            ->post(route('job-pool.store'), [
                'job_listing_id' => $listing->id,
                'resume_id' => $resume->id,
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('job_pool_entries', [
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);
    }

    public function test_it_rejects_duplicate_pool_entries(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $listing = JobListing::factory()->create();
        JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->actingAs($user)
            ->post(route('job-pool.store'), [
                'job_listing_id' => $listing->id,
                'resume_id' => $resume->id,
            ])
            ->assertSessionHasErrors('job_listing_id');
    }

    public function test_it_rejects_a_resume_owned_by_another_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherResume = Resume::factory()->for($other)->create();
        $listing = JobListing::factory()->create();

        $this->actingAs($user)
            ->post(route('job-pool.store'), [
                'job_listing_id' => $listing->id,
                'resume_id' => $otherResume->id,
            ])
            ->assertSessionHasErrors('resume_id');
    }

    public function test_it_removes_a_pool_entry(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->for($user)->create();
        $listing = JobListing::factory()->create();
        $entry = JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $this->actingAs($user)
            ->delete(route('job-pool.destroy', $entry))
            ->assertRedirect();

        $this->assertDatabaseMissing('job_pool_entries', ['id' => $entry->id]);
    }

    public function test_it_404s_removing_another_users_pool_entry(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherResume = Resume::factory()->for($other)->create();
        $listing = JobListing::factory()->create();
        $entry = JobPoolEntry::factory()->create([
            'user_id' => $other->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $otherResume->id,
        ]);

        $this->actingAs($user)
            ->delete(route('job-pool.destroy', $entry))
            ->assertNotFound();

        $this->assertDatabaseHas('job_pool_entries', ['id' => $entry->id]);
    }
}
```

- [ ] **Step 5: Run tests**

Run: `php artisan test tests/Feature/JobPoolControllerTest.php --compact`
Expected: PASS

- [ ] **Step 6: Pint + register + commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/JobPoolController.php app/Http/Requests/StoreJobPoolEntryRequest.php routes/web.php tests/Feature/JobPoolControllerTest.php
git commit -m "feat: add job pool store/destroy/list endpoints

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 6: Extension API — `GET /api/extension/job-pool`

**Files:**
- Modify: `app/Http/Controllers/Api/ExtensionController.php` — add `jobPool` method
- Modify: `routes/api.php` — add route
- Test: `tests/Feature/Api/ExtensionApiTest.php` — add test methods (append to the existing file)

**Interfaces:**
- Consumes: `JobPoolEntry` (Task 2).
- Produces: `GET /api/extension/job-pool` → JSON `{ entries: [{ id, title, company, job_url, resume_id, resume_title }] }`. Same `ensureExtensionToken()` guard as every other `ExtensionController` method.

- [ ] **Step 1: Add the controller method**

In `app/Http/Controllers/Api/ExtensionController.php`, add this method after `jobApplicationStore` (before `updateTargetJobDescription`):

```php
    public function jobPool(Request $request): JsonResponse
    {
        $this->ensureExtensionToken($request);

        $user = $request->user();

        if ($user->disabled_at !== null) {
            return response()->json(['message' => 'Account disabled.'], 403);
        }

        $entries = $user->jobPoolEntries()
            ->with(['jobListing', 'resume'])
            ->latest('id')
            ->get()
            ->map(fn ($entry) => [
                'id' => $entry->id,
                'title' => $entry->jobListing->title,
                'company' => $entry->jobListing->company,
                'job_url' => $entry->jobListing->job_url,
                'resume_id' => $entry->resume_id,
                'resume_title' => $entry->resume->title,
            ]);

        return response()->json(['entries' => $entries]);
    }
```

- [ ] **Step 2: Add the route**

In `routes/api.php`, inside the `extension` prefix group, immediately after the `job-applications` line:

```php
    Route::get('/job-pool', [ExtensionController::class, 'jobPool'])->name('api.extension.job-pool');
```

- [ ] **Step 3: Write the failing test**

Append to `tests/Feature/Api/ExtensionApiTest.php` (match the existing class's token-issuing pattern used by the `job_application_store` tests — read the top of the file for the exact `Sanctum` token setup used there before writing this, since it varies slightly per test method):

```php
    public function test_job_pool_returns_the_users_pool_entries(): void
    {
        $user = User::factory()->create();
        $resume = \App\Models\Resume::factory()->for($user)->create();
        $listing = \App\Models\JobListing::factory()->create();
        \App\Models\JobPoolEntry::factory()->create([
            'user_id' => $user->id,
            'job_listing_id' => $listing->id,
            'resume_id' => $resume->id,
        ]);

        $token = $user->createToken(
            ResumeFillProfile::TOKEN_NAME,
            [ResumeFillProfile::TOKEN_ABILITY]
        )->plainTextToken;

        $response = $this->withToken($token)->getJson('/api/extension/job-pool');

        $response->assertOk();
        $response->assertJsonCount(1, 'entries');
        $response->assertJsonFragment(['title' => $listing->title]);
    }

    public function test_job_pool_requires_extension_ability(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('other', ['*'])->plainTextToken;

        // A token without the extension ability and without '*' is refused.
        $token = $user->createToken('limited', ['some-other-ability'])->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/extension/job-pool')
            ->assertForbidden();
    }
```

Note: read the existing file's imports and the exact token-creation helper before pasting — match its style (it already imports `User`, `ResumeFillProfile`; add `JobListing`, `JobPoolEntry`, `Resume` imports at the top of the file if not already present, following its existing import block).

- [ ] **Step 4: Run tests**

Run: `php artisan test tests/Feature/Api/ExtensionApiTest.php --compact`
Expected: PASS

- [ ] **Step 5: Pint + register + commit**

```bash
vendor/bin/pint --dirty --format agent
git add app/Http/Controllers/Api/ExtensionController.php routes/api.php tests/Feature/Api/ExtensionApiTest.php
git commit -m "feat: add extension API endpoint for the job pool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 7: `Jobs/Browse.tsx` — Browse tab (search + results + add-to-pool)

**Files:**
- Create: `resources/js/Pages/Jobs/Browse.tsx`
- Create: `resources/js/Components/jobs/add-to-pool-dialog.tsx`
- Modify: `resources/js/Layouts/AuthenticatedLayout.tsx` — add "Browse Jobs" nav item

**Interfaces:**
- Consumes: `jobs.browse` route + `listings`/`filters` Inertia props (Task 4 shape), `job-pool.store` route (Task 5).
- Produces: page component `Jobs/Browse` rendered at `/jobs/browse`; segmented control (plain buttons, not a new Tabs primitive — no shadcn Tabs component exists in this app's real `@/Components/ui`, only in the untouched `shadcn-demo` scaffold) switching between "Browse" (this task) and "My Pool" (Task 8, added as a second route/page — see note below). `AddToPoolDialog` component consumed by both.

Note on the two-tab design: the spec describes "Browse" and "My Pool" as tabs of one page. Since `jobs.browse` and `jobs.pool` are separate server routes (Task 4/5) rather than one endpoint with a client-side prop switch, implement the "tabs" as two Inertia pages that link to each other, both wrapped in a shared `JobsShell` layout component created in this task. This avoids inventing a combined index endpoint not in the spec's routes, while still presenting as one section with two tabs to the user.

- [ ] **Step 1: Write the shared shell component**

Create `resources/js/Components/jobs/jobs-shell.tsx`:

```tsx
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

export function JobsShell({
    active,
    children,
}: PropsWithChildren<{ active: 'browse' | 'pool' }>) {
    return (
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Browse Jobs</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Search job listings and save the ones you want to apply to.
            </p>

            <div className="mt-4 flex gap-1 border-b border-border">
                <Link
                    href={route('jobs.browse')}
                    className={cn(
                        'border-b-2 px-3 py-2 text-sm font-medium',
                        active === 'browse'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                >
                    Browse
                </Link>
                <Link
                    href={route('jobs.pool')}
                    className={cn(
                        'border-b-2 px-3 py-2 text-sm font-medium',
                        active === 'pool'
                            ? 'border-primary text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                >
                    My Pool
                </Link>
            </div>

            <div className="mt-6">{children}</div>
        </div>
    );
}
```

- [ ] **Step 2: Write the add-to-pool dialog**

Create `resources/js/Components/jobs/add-to-pool-dialog.tsx`:

```tsx
import { router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { Select } from '@/Components/ui/select';

export type ResumeOption = { id: number; title: string };

export function AddToPoolDialog({
    open,
    onClose,
    jobListingId,
    resumes,
}: {
    open: boolean;
    onClose: () => void;
    jobListingId: number | null;
    resumes: ResumeOption[];
}) {
    const [resumeId, setResumeId] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    function submit(event: FormEvent) {
        event.preventDefault();
        if (jobListingId === null || !resumeId) {
            return;
        }

        setProcessing(true);
        setError(null);

        router.post(
            route('job-pool.store'),
            { job_listing_id: jobListingId, resume_id: Number(resumeId) },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResumeId('');
                    onClose();
                },
                onError: (errors: Record<string, string>) => {
                    setError(Object.values(errors)[0] ?? 'Could not add to pool.');
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-sm font-bold">Add to pool</DialogTitle>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div>
                        <Label>Resume</Label>
                        <Select
                            value={resumeId}
                            onChange={(e) => setResumeId(e.target.value)}
                            className="mt-1"
                            required
                        >
                            <option value="">Select a resume</option>
                            {resumes.map((resume) => (
                                <option key={resume.id} value={resume.id}>
                                    {resume.title}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" type="button" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing || !resumeId}>
                            Add to pool
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 3: Write `Jobs/Browse.tsx`**

```tsx
import { Link, router, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { AddToPoolDialog, ResumeOption } from '@/Components/jobs/add-to-pool-dialog';
import { JobsShell } from '@/Components/jobs/jobs-shell';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type JobListingRow = {
    id: number;
    title: string;
    company: string;
    location: string | null;
    job_url: string;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    meta?: { current_page: number; last_page: number };
};

export default function BrowseJobs({
    listings,
    filters,
}: {
    listings: Paginated<JobListingRow>;
    filters: { q: string | null; location: string | null; company: string | null };
}) {
    const { auth } = usePage<{ auth: { user: { id: number } } }>().props;
    const [q, setQ] = useState(filters.q ?? '');
    const [location, setLocation] = useState(filters.location ?? '');
    const [company, setCompany] = useState(filters.company ?? '');
    const [dialogListingId, setDialogListingId] = useState<number | null>(null);

    function submit(event: FormEvent) {
        event.preventDefault();
        router.get(
            route('jobs.browse'),
            { q: q || undefined, location: location || undefined, company: company || undefined },
            { preserveState: true, preserveScroll: true },
        );
    }

    return (
        <AuthenticatedLayout>
            <JobsShell active="browse">
                <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
                    <Input
                        placeholder="Keyword"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        className="sm:col-span-2"
                    />
                    <Input
                        placeholder="Location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />
                    <Input
                        placeholder="Company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                    />
                    <Button type="submit" className="sm:col-span-4 sm:w-fit">
                        Search
                    </Button>
                </form>

                <ul className="mt-6 divide-y divide-border">
                    {listings.data.map((listing) => (
                        <li key={listing.id} className="flex items-center justify-between gap-4 py-4">
                            <div className="min-w-0">
                                <a
                                    href={listing.job_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                    {listing.title}
                                </a>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {listing.company}
                                    {listing.location ? ` · ${listing.location}` : ''}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setDialogListingId(listing.id)}
                            >
                                Add to pool
                            </Button>
                        </li>
                    ))}
                    {listings.data.length === 0 && (
                        <li className="py-8 text-center text-sm text-muted-foreground">
                            No listings match your search.
                        </li>
                    )}
                </ul>

                <div className="mt-4 flex flex-wrap gap-2">
                    {listings.links.map((link, index) => (
                        <Link
                            key={index}
                            href={link.url ?? '#'}
                            preserveScroll
                            className={
                                'rounded-md px-2.5 py-1 text-xs ' +
                                (link.active
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-muted') +
                                (link.url ? '' : ' pointer-events-none opacity-50')
                            }
                            dangerouslySetInnerHTML={{ __html: link.label }}
                        />
                    ))}
                </div>
            </JobsShell>

            <AddToPoolDialog
                open={dialogListingId !== null}
                onClose={() => setDialogListingId(null)}
                jobListingId={dialogListingId}
                resumes={((auth as unknown as { resumeOptions?: ResumeOption[] }).resumeOptions ?? []) as ResumeOption[]}
            />
        </AuthenticatedLayout>
    );
}
```

Note: the resume list for the dialog is NOT yet passed as a prop by `JobListingController::index` — fix this now rather than shipping a broken dropdown. Go back to `app/Http/Controllers/JobListingController.php` (Task 4) and add a `resumes` prop:

```php
use App\Models\Resume;

// inside index(), before the Inertia::render call:
$resumes = $request->user()->resumes()->select('id', 'title')->latest('updated_at')->get();
```

and add `'resumes' => $resumes,` to the `Inertia::render('Jobs/Browse', [...])` array. Then in `Jobs/Browse.tsx`, replace the `resumes={...}` line reading from `auth` with a direct prop:

```tsx
export default function BrowseJobs({
    listings,
    filters,
    resumes,
}: {
    listings: Paginated<JobListingRow>;
    filters: { q: string | null; location: string | null; company: string | null };
    resumes: ResumeOption[];
}) {
```

and

```tsx
            <AddToPoolDialog
                open={dialogListingId !== null}
                onClose={() => setDialogListingId(null)}
                jobListingId={dialogListingId}
                resumes={resumes}
            />
```

Remove the now-unused `usePage` import and `auth` destructure.

- [ ] **Step 4: Add the nav item**

In `resources/js/Layouts/AuthenticatedLayout.tsx`, in the `nav: NavItem[]` array, add an entry after the `Applications` entry:

```tsx
        {
            label: 'Browse Jobs',
            href: route('jobs.browse'),
            active: Boolean(route().current('jobs.*')),
            icon: BriefcaseIcon,
        },
```

Check the top of the file for the existing `@heroicons/react/24/outline` import line (used for `HomeIcon`, `DocumentTextIcon`, `ShareIcon`, `ClipboardDocumentListIcon`) and add `BriefcaseIcon` to it.

- [ ] **Step 5: Manual verification**

Run `composer run dev` if not already running. Log in, visit `/jobs/browse`. Confirm:
- Search box, location, company filters submit and re-render results.
- Empty state shows when no listings exist yet (expected until Task 3's import command is run with real data).
- Seed a `JobListing` via tinker if needed to see the row/button/dialog render, and confirm "Add to pool" opens the dialog with your resumes listed.

This step has no automated test — it is a UI smoke check per the project's verification policy. Report what you actually saw.

- [ ] **Step 6: Pint (frontend has no pint target — run tsc) + register + commit**

```bash
npx tsc --noEmit
vendor/bin/pint --dirty --format agent
git add resources/js/Pages/Jobs/Browse.tsx resources/js/Components/jobs/add-to-pool-dialog.tsx resources/js/Components/jobs/jobs-shell.tsx resources/js/Layouts/AuthenticatedLayout.tsx app/Http/Controllers/JobListingController.php
git commit -m "feat: add Browse Jobs page with search and add-to-pool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Task 8: `Jobs/Pool.tsx` — My Pool tab (list + remove)

**Files:**
- Create: `resources/js/Pages/Jobs/Pool.tsx`

**Interfaces:**
- Consumes: `jobs.pool` route + `entries` Inertia prop (Task 5 shape), `job-pool.destroy` route, `JobsShell` (Task 7).

- [ ] **Step 1: Write `Jobs/Pool.tsx`**

```tsx
import { router } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { JobsShell } from '@/Components/jobs/jobs-shell';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

type PoolEntry = {
    id: number;
    job_listing_id: number;
    title: string;
    company: string;
    location: string | null;
    job_url: string;
    resume_id: number;
    resume_title: string;
};

export default function JobPool({ entries }: { entries: PoolEntry[] }) {
    function remove(entry: PoolEntry) {
        router.delete(route('job-pool.destroy', entry.id), { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout>
            <JobsShell active="pool">
                <ul className="divide-y divide-border">
                    {entries.map((entry) => (
                        <li key={entry.id} className="flex items-center justify-between gap-4 py-4">
                            <div className="min-w-0">
                                <a
                                    href={entry.job_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="truncate text-sm font-semibold text-foreground hover:underline"
                                >
                                    {entry.title}
                                </a>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                    {entry.company}
                                    {entry.location ? ` · ${entry.location}` : ''} · Resume: {entry.resume_title}
                                </p>
                            </div>
                            <Button type="button" variant="outline" onClick={() => remove(entry)}>
                                Remove
                            </Button>
                        </li>
                    ))}
                    {entries.length === 0 && (
                        <li className="py-8 text-center text-sm text-muted-foreground">
                            You haven't added any jobs to your pool yet.
                        </li>
                    )}
                </ul>
            </JobsShell>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 2: Manual verification**

Visit `/jobs/pool` after adding at least one listing to the pool from the Browse tab (Task 7). Confirm the entry shows title/company/location/resume, and "Remove" deletes it and the list updates.

Report what you actually saw, per the project's verification policy.

- [ ] **Step 3: `tsc` + commit**

```bash
npx tsc --noEmit
git add resources/js/Pages/Jobs/Pool.tsx
git commit -m "feat: add My Pool page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes (from plan authoring)

- **Spec coverage:** `job_listings` table (Task 1), `job_pool_entries` table (Task 2), import command (Task 3), `JobListingController` (Task 4), `JobPoolController` (Task 5), extension endpoint (Task 6), frontend Browse + My Pool (Tasks 7–8), nav item (Task 7 step 4). All spec sections have a task.
- **Deviation from spec, logged above:** `search_vector`/GIN dropped for portable `LIKE` search (SQLite test compatibility). Pagination strategy resolved as offset `paginate()` (spec left this open) — simplest choice, matches every other paginated list in this app (none use cursor pagination).
- **Not built here (explicitly out of scope per spec):** the `minimal` parquet → JSONL conversion step before Task 3's command can run, and anything in `./extension/` (the Chrome extension client, which does exist in this repo but the spec keeps out of scope regardless).
- **Types checked across tasks:** `JobListingRow` (Task 4 controller shape, Task 7 TS type) — fields match: `id, title, company, location, job_url`. `PoolEntry`/pool row shape (Task 5 controller, Task 6 extension, Task 8 TS type) — fields match: `id, title, company, job_url, resume_id, resume_title` (Task 8 additionally has `job_listing_id, location` from the web controller's richer payload; the extension payload in Task 6 is intentionally narrower — no `location`, matches spec's "enough for the extension to render its dropdown").
