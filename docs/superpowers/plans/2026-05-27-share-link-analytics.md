# Share Link Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track page views, PDF downloads, and question submissions from public share link visitors, and surface per-resume analytics on the Dashboard.

**Architecture:** A new `resume_share_events` append-only table stores one row per event (page_view, pdf_download, question_submitted). Events are logged server-side in `PublicResumeController`. A new `AnalyticsController` aggregates events per resume and passes them as Inertia props to `Dashboard`. The Dashboard renders a new Analytics section at the top showing per-resume stats with unique visitor counts (deduplicated by hashed IP per calendar day).

**Tech Stack:** Laravel 13, PHP 8.3, SQLite, Inertia.js v2, React 18, TypeScript, Tailwind CSS v3

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `database/migrations/2026_05_27_XXXXXX_create_resume_share_events_table.php` | DB schema for events |
| Create | `app/Models/ResumeShareEvent.php` | Eloquent model + `log()` static helper |
| Modify | `app/Http/Controllers/PublicResumeController.php` | Log events on show, downloadPdf, storeQuestion |
| Create | `app/Http/Controllers/AnalyticsController.php` | Aggregate stats query, serve to Dashboard |
| Modify | `routes/web.php` | Add `GET /analytics` route |
| Modify | `resources/js/Pages/Dashboard.tsx` | Replace placeholder stat cards + tickets table with real Analytics section |
| Modify | `resources/js/types/index.d.ts` | Add `ResumeStat` and `AnalyticsProps` types |

---

## Task 1: Migration — create `resume_share_events` table

**Files:**
- Create: `database/migrations/2026_05_27_300000_create_resume_share_events_table.php`

- [ ] **Step 1: Create the migration file**

```bash
php artisan make:migration create_resume_share_events_table
```

Rename the generated file to match the timestamp above if needed.

- [ ] **Step 2: Write the migration**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('resume_share_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('resume_share_link_id')->constrained()->cascadeOnDelete();
            $table->foreignId('resume_id')->constrained()->cascadeOnDelete();
            $table->string('event', 32); // page_view | pdf_download | question_submitted
            $table->string('ip_hash', 64)->nullable();  // SHA-256 of IP
            $table->string('user_agent')->nullable();
            $table->string('referrer')->nullable();
            $table->timestamp('created_at')->useCurrent();
            // no updated_at — append-only

            $table->index(['resume_id', 'event']);
            $table->index(['resume_id', 'ip_hash', 'event']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resume_share_events');
    }
};
```

- [ ] **Step 3: Run the migration**

```bash
php artisan migrate
```

Expected output: `Migrating: ...create_resume_share_events_table` then `Migrated`.

- [ ] **Step 4: Commit**

```bash
git add database/migrations/
git commit -m "feat: add resume_share_events migration"
```

---

## Task 2: Model — `ResumeShareEvent`

**Files:**
- Create: `app/Models/ResumeShareEvent.php`

- [ ] **Step 1: Write the model**

```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;

class ResumeShareEvent extends Model
{
    public const UPDATED_AT = null; // append-only, no updated_at column

    protected $fillable = [
        'resume_share_link_id',
        'resume_id',
        'event',
        'ip_hash',
        'user_agent',
        'referrer',
    ];

    public function shareLink(): BelongsTo
    {
        return $this->belongsTo(ResumeShareLink::class, 'resume_share_link_id');
    }

    public function resume(): BelongsTo
    {
        return $this->belongsTo(Resume::class);
    }

    /**
     * Log a single event from an incoming HTTP request.
     */
    public static function log(Request $request, ResumeShareLink $link, string $event): void
    {
        $ip = $request->ip();

        self::create([
            'resume_share_link_id' => $link->id,
            'resume_id'            => $link->resume_id,
            'event'                => $event,
            'ip_hash'              => $ip ? hash('sha256', $ip) : null,
            'user_agent'           => substr((string) $request->userAgent(), 0, 500),
            'referrer'             => substr((string) $request->header('referer', ''), 0, 500) ?: null,
        ]);
    }
}
```

- [ ] **Step 2: Add `hasMany` to `ResumeShareLink` model**

Open `app/Models/ResumeShareLink.php` and add this method inside the class:

```php
public function events(): HasMany
{
    return $this->hasMany(ResumeShareEvent::class);
}
```

Also add `ResumeShareEvent` to the `use` imports at the top if not already present (it's in the same namespace so no import needed in Laravel).

- [ ] **Step 3: Add `hasMany` to `Resume` model**

Open `app/Models/Resume.php` and add:

```php
public function shareEvents(): HasMany
{
    return $this->hasMany(ResumeShareEvent::class);
}
```

- [ ] **Step 4: Write a feature test**

Create `tests/Feature/ResumeShareEventTest.php`:

```php
<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResumeShareEventTest extends TestCase
{
    use RefreshDatabase;

    public function test_page_view_is_logged_on_public_show(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $this->get(route('public.resume', $link->token));

        $this->assertDatabaseHas('resume_share_events', [
            'resume_id' => $resume->id,
            'event'     => 'page_view',
        ]);
    }

    public function test_pdf_download_is_logged(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $this->get(route('public.pdf', $link->token));

        $this->assertDatabaseHas('resume_share_events', [
            'resume_id' => $resume->id,
            'event'     => 'pdf_download',
        ]);
    }

    public function test_question_submitted_is_logged(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $this->post(route('public.question', $link->token), [
            'sender_name'  => 'Alice',
            'sender_email' => 'alice@example.com',
            'sender_phone' => '555-1234',
            'message'      => 'Hello!',
        ]);

        $this->assertDatabaseHas('resume_share_events', [
            'resume_id' => $resume->id,
            'event'     => 'question_submitted',
        ]);
    }
}
```

- [ ] **Step 5: Run the tests — expect failures** (controllers don't log yet)

```bash
php artisan test tests/Feature/ResumeShareEventTest.php
```

Expected: all 3 tests FAIL with assertion errors.

- [ ] **Step 6: Add factories for Resume and ResumeShareLink**

Check if factories exist:

```bash
ls database/factories/
```

If `ResumeFactory.php` is missing, create `database/factories/ResumeFactory.php`:

```php
<?php
namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ResumeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'      => User::factory(),
            'name'         => $this->faker->name() . ' Resume',
            'pdf_filename' => $this->faker->uuid() . '.pdf',
            'template'     => 'classic',
        ];
    }
}
```

If `ResumeShareLinkFactory.php` is missing, create `database/factories/ResumeShareLinkFactory.php`:

```php
<?php
namespace Database\Factories;

use App\Models\Resume;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class ResumeShareLinkFactory extends Factory
{
    public function definition(): array
    {
        return [
            'resume_id' => Resume::factory(),
            'token'     => Str::random(48),
            'label'     => null,
            'is_active' => true,
        ];
    }
}
```

Add `use HasFactory;` + `use Illuminate\Database\Eloquent\Factories\HasFactory;` to both `Resume` and `ResumeShareLink` models if not already present.

- [ ] **Step 7: Commit**

```bash
git add app/Models/ database/factories/ tests/Feature/ResumeShareEventTest.php
git commit -m "feat: add ResumeShareEvent model, factories, and failing tests"
```

---

## Task 3: Log events in `PublicResumeController`

**Files:**
- Modify: `app/Http/Controllers/PublicResumeController.php`

- [ ] **Step 1: Update the controller**

Replace the full contents of `app/Http/Controllers/PublicResumeController.php`:

```php
<?php
namespace App\Http\Controllers;

use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicResumeController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(! $link->is_active, 403, 'This link has been deactivated.');

        ResumeShareEvent::log($request, $link, 'page_view');

        return Inertia::render('ResumeBuilder/PublicView', [
            'resume' => $link->resume,
            'token'  => $token,
        ]);
    }

    public function downloadPdf(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(! $link->is_active, 403, 'This link has been deactivated.');

        ResumeShareEvent::log($request, $link, 'pdf_download');

        $resume = $link->resume;
        $pdf = Pdf::loadView('resume-pdf', ['resume' => $resume])->setPaper('letter', 'portrait');

        return $pdf->download($resume->pdf_filename ?? ($resume->id . '.pdf'));
    }

    public function storeQuestion(Request $request, string $token)
    {
        $link = ResumeShareLink::with('resume')->where('token', $token)->firstOrFail();

        abort_if(! $link->is_active, 403, 'This link has been deactivated.');

        $validated = $request->validate([
            'sender_name'  => ['required', 'string', 'max:150'],
            'sender_email' => ['required', 'email', 'max:150'],
            'sender_phone' => ['required', 'string', 'max:30'],
            'message'      => ['required', 'string', 'max:2000'],
        ]);

        $link->questions()->create([
            ...$validated,
            'resume_id' => $link->resume_id,
        ]);

        ResumeShareEvent::log($request, $link, 'question_submitted');

        return back()->with('questionSubmitted', true);
    }
}
```

- [ ] **Step 2: Run the tests — expect pass**

```bash
php artisan test tests/Feature/ResumeShareEventTest.php
```

Expected: all 3 PASS.

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/PublicResumeController.php
git commit -m "feat: log page_view, pdf_download, question_submitted events"
```

---

## Task 4: `AnalyticsController` — aggregate stats

**Files:**
- Create: `app/Http/Controllers/AnalyticsController.php`
- Modify: `routes/web.php`

The query strategy: for each resume owned by the user, count raw totals per event type, then count unique visitors by counting distinct `ip_hash` values per day (grouping by `DATE(created_at)` and `ip_hash`, then counting the resulting groups).

- [ ] **Step 1: Write the controller**

Create `app/Http/Controllers/AnalyticsController.php`:

```php
<?php
namespace App\Http\Controllers;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $userId = $request->user()->id;

        // Get all resume IDs belonging to this user
        $resumeIds = Resume::where('user_id', $userId)->pluck('id');

        // Raw event totals per resume per event type
        $totals = ResumeShareEvent::whereIn('resume_id', $resumeIds)
            ->select('resume_id', 'event', DB::raw('COUNT(*) as total'))
            ->groupBy('resume_id', 'event')
            ->get()
            ->groupBy('resume_id');

        // Unique visitors per resume: distinct ip_hash+date combinations
        $uniqueVisitors = ResumeShareEvent::whereIn('resume_id', $resumeIds)
            ->where('event', 'page_view')
            ->whereNotNull('ip_hash')
            ->select('resume_id', DB::raw('COUNT(DISTINCT ip_hash || DATE(created_at)) as unique_visitors'))
            ->groupBy('resume_id')
            ->pluck('unique_visitors', 'resume_id');

        $resumes = Resume::whereIn('id', $resumeIds)
            ->orderByDesc('updated_at')
            ->get(['id', 'name']);

        $stats = $resumes->map(function (Resume $resume) use ($totals, $uniqueVisitors) {
            $events = $totals->get($resume->id, collect());
            $byType = $events->pluck('total', 'event');

            return [
                'resume_id'          => $resume->id,
                'resume_name'        => $resume->name,
                'page_views'         => (int) ($byType['page_view'] ?? 0),
                'unique_visitors'    => (int) ($uniqueVisitors[$resume->id] ?? 0),
                'pdf_downloads'      => (int) ($byType['pdf_download'] ?? 0),
                'questions_submitted'=> (int) ($byType['question_submitted'] ?? 0),
            ];
        });

        return Inertia::render('Dashboard', [
            'resumeStats' => $stats,
        ]);
    }
}
```

- [ ] **Step 2: Add the route**

Open `routes/web.php` and add inside the `auth` middleware group, after the existing builder routes:

```php
Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');
```

Also add to the top imports:

```php
use App\Http\Controllers\AnalyticsController;
```

- [ ] **Step 3: Write a feature test**

Create `tests/Feature/AnalyticsControllerTest.php`:

```php
<?php
namespace Tests\Feature;

use App\Models\Resume;
use App\Models\ResumeShareEvent;
use App\Models\ResumeShareLink;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnalyticsControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_analytics_page_returns_stats_for_authenticated_user(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id'            => $resume->id,
            'event'                => 'page_view',
            'ip_hash'              => hash('sha256', '1.2.3.4'),
        ]);
        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id'            => $resume->id,
            'event'                => 'pdf_download',
            'ip_hash'              => hash('sha256', '1.2.3.4'),
        ]);

        $response = $this->actingAs($user)->get(route('analytics'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('resumeStats.0.resume_id', $resume->id)
            ->where('resumeStats.0.page_views', 1)
            ->where('resumeStats.0.pdf_downloads', 1)
            ->where('resumeStats.0.unique_visitors', 1)
        );
    }

    public function test_analytics_does_not_include_other_users_resumes(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $otherResume = Resume::factory()->create(['user_id' => $other->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $otherResume->id]);

        ResumeShareEvent::create([
            'resume_share_link_id' => $link->id,
            'resume_id'            => $otherResume->id,
            'event'                => 'page_view',
            'ip_hash'              => hash('sha256', '9.9.9.9'),
        ]);

        $response = $this->actingAs($user)->get(route('analytics'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('resumeStats', [])
        );
    }

    public function test_same_ip_on_same_day_counts_as_one_unique_visitor(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);
        $link = ResumeShareLink::factory()->create(['resume_id' => $resume->id]);

        $ipHash = hash('sha256', '5.5.5.5');

        ResumeShareEvent::create(['resume_share_link_id' => $link->id, 'resume_id' => $resume->id, 'event' => 'page_view', 'ip_hash' => $ipHash]);
        ResumeShareEvent::create(['resume_share_link_id' => $link->id, 'resume_id' => $resume->id, 'event' => 'page_view', 'ip_hash' => $ipHash]);

        $response = $this->actingAs($user)->get(route('analytics'));

        $response->assertInertia(fn ($page) => $page
            ->where('resumeStats.0.page_views', 2)
            ->where('resumeStats.0.unique_visitors', 1)
        );
    }
}
```

- [ ] **Step 4: Run the tests**

```bash
php artisan test tests/Feature/AnalyticsControllerTest.php
```

Expected: all 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/Http/Controllers/AnalyticsController.php routes/web.php tests/Feature/AnalyticsControllerTest.php
git commit -m "feat: add AnalyticsController with per-resume event aggregation"
```

---

## Task 5: Update TypeScript types

**Files:**
- Modify: `resources/js/types/index.d.ts`

- [ ] **Step 1: Add the new types**

Append to the end of `resources/js/types/index.d.ts`:

```typescript
export interface ResumeStat {
    resume_id: number;
    resume_name: string;
    page_views: number;
    unique_visitors: number;
    pdf_downloads: number;
    questions_submitted: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/types/index.d.ts
git commit -m "feat: add ResumeStat TypeScript type"
```

---

## Task 6: Update Dashboard page with Analytics section

**Files:**
- Modify: `resources/js/Pages/Dashboard.tsx`

The current Dashboard has placeholder ticket data (hardcoded). Keep that section intact below — add the new Analytics section at the top. The Dashboard is now served from two routes: the existing `/dashboard` (no stats) and the new `/analytics` (with stats). We need to handle both by making `resumeStats` optional.

- [ ] **Step 1: Update the route for `/dashboard` to also pass stats**

The simplest approach: make `/dashboard` redirect to `/analytics`, or pass an empty array. Open `routes/web.php` and replace:

```php
Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');
```

with:

```php
Route::get('/dashboard', [AnalyticsController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');
```

This means both `/dashboard` and `/analytics` serve the same page with real stats. Remove the now-redundant `/analytics` route (or keep it as an alias — either is fine).

- [ ] **Step 2: Rewrite `Dashboard.tsx`**

Replace the full contents of `resources/js/Pages/Dashboard.tsx`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps, ResumeStat } from '@/types';

// --- placeholder ticket data (unchanged) ---
const tickets = [
    { id: '#TK-1001', subject: 'Unable to access dashboard after password reset',     customer: 'John Smith',      avatar: 'JS', priority: 'high',   status: 'open',     date: 'Jan 10, 2025' },
    { id: '#TK-1002', subject: 'Payment not reflecting in account balance',           customer: 'Sarah Johnson',   avatar: 'SJ', priority: 'urgent', status: 'pending',  date: 'Jan 11, 2025' },
    { id: '#TK-1003', subject: 'Request for bulk export of transaction history',      customer: 'Michael Brown',   avatar: 'MB', priority: 'medium', status: 'resolved', date: 'Jan 12, 2025' },
    { id: '#TK-1004', subject: 'Two-factor authentication not sending SMS codes',     customer: 'Emily Davis',     avatar: 'ED', priority: 'high',   status: 'open',     date: 'Jan 13, 2025' },
    { id: '#TK-1005', subject: 'Profile picture upload fails for large images',       customer: 'Robert Wilson',   avatar: 'RW', priority: 'low',    status: 'resolved', date: 'Jan 14, 2025' },
    { id: '#TK-1006', subject: 'API rate limit exceeded — need quota increase',       customer: 'Lisa Anderson',   avatar: 'LA', priority: 'medium', status: 'pending',  date: 'Jan 15, 2025' },
    { id: '#TK-1007', subject: 'Dark mode settings not persisting after logout',      customer: 'David Martinez',  avatar: 'DM', priority: 'low',    status: 'open',     date: 'Jan 16, 2025' },
    { id: '#TK-1008', subject: 'Billing cycle changed without notification',          customer: 'Jennifer Taylor', avatar: 'JT', priority: 'urgent', status: 'open',     date: 'Jan 17, 2025' },
];

const priorityStyles: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high:   'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low:    'bg-green-100 text-green-700',
};

const statusStyles: Record<string, string> = {
    open:     'bg-blue-100 text-blue-700',
    pending:  'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
};

const avatarColors = [
    'bg-indigo-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
    'bg-purple-500', 'bg-cyan-500', 'bg-rose-500', 'bg-emerald-500',
];

type Props = PageProps<{ resumeStats?: ResumeStat[] }>;

export default function Dashboard() {
    const { resumeStats = [] } = usePage<Props>().props;

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-12">
                <div className="mx-auto max-w-7xl sm:px-6 lg:px-8 space-y-6">

                    {/* Analytics */}
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Analytics</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Public share link activity across all your resumes</p>
                        </div>

                        {resumeStats.length === 0 ? (
                            <div className="px-6 py-10 text-center text-sm text-gray-400">
                                No activity yet. Share a resume link to start tracking views.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                            <th className="px-6 py-3">Resume</th>
                                            <th className="px-6 py-3 text-right">Page Views</th>
                                            <th className="px-6 py-3 text-right">Unique Visitors</th>
                                            <th className="px-6 py-3 text-right">PDF Downloads</th>
                                            <th className="px-6 py-3 text-right">Messages Sent</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {resumeStats.map((stat) => (
                                            <tr key={stat.resume_id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-800">{stat.resume_name}</td>
                                                <td className="px-6 py-4 text-right tabular-nums text-gray-700">{stat.page_views.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right tabular-nums text-gray-700">{stat.unique_visitors.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right tabular-nums text-gray-700">{stat.pdf_downloads.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right tabular-nums text-gray-700">{stat.questions_submitted.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500">
                                            <td className="px-6 py-3">Totals</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{resumeStats.reduce((s, r) => s + r.page_views, 0).toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{resumeStats.reduce((s, r) => s + r.unique_visitors, 0).toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{resumeStats.reduce((s, r) => s + r.pdf_downloads, 0).toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right tabular-nums">{resumeStats.reduce((s, r) => s + r.questions_submitted, 0).toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Support Tickets Table (placeholder) */}
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">Support Tickets</h3>
                            <div className="flex items-center gap-3">
                                <label htmlFor="ticket-status-filter" className="sr-only">Filter by status</label>
                                <select id="ticket-status-filter" className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option>All Status</option>
                                    <option>Open</option>
                                    <option>Pending</option>
                                    <option>Resolved</option>
                                </select>
                                <button type="button" className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
                                    + New Ticket
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        <th className="px-6 py-3">Ticket ID</th>
                                        <th className="px-6 py-3">Subject</th>
                                        <th className="px-6 py-3">Customer</th>
                                        <th className="px-6 py-3">Priority</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Date</th>
                                        <th className="px-6 py-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {tickets.map((ticket, i) => (
                                        <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-xs text-gray-500 whitespace-nowrap">{ticket.id}</td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <span className="font-medium text-gray-800 line-clamp-1">{ticket.subject}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColors[i % avatarColors.length]}`}>
                                                        {ticket.avatar}
                                                    </span>
                                                    <span className="text-gray-700">{ticket.customer}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${priorityStyles[ticket.priority]}`}>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[ticket.status]}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{ticket.date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button type="button" className="text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors">View</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                            <p className="text-sm text-gray-500">
                                Showing <span className="font-medium text-gray-700">1–8</span> of <span className="font-medium text-gray-700">2,458</span> tickets
                            </p>
                            <div className="flex items-center gap-1">
                                <button type="button" className="rounded px-2.5 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-40" disabled>← Prev</button>
                                {[1, 2, 3].map((p) => (
                                    <button key={p} type="button" className={`rounded px-2.5 py-1 text-sm font-medium ${p === 1 ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{p}</button>
                                ))}
                                <span className="px-1 text-gray-400 text-sm">…</span>
                                <button type="button" className="rounded px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-100">Next →</button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

- [ ] **Step 3: Build and verify no TypeScript errors**

```bash
npm run build
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 4: Run all tests**

```bash
php artisan test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Dashboard.tsx resources/js/types/index.d.ts routes/web.php
git commit -m "feat: add Analytics section to Dashboard with real per-resume stats"
```

---

## Self-Review

**Spec coverage:**
- ✅ Page views logged server-side (Task 3, `show`)
- ✅ PDF downloads logged server-side (Task 3, `downloadPdf`)
- ✅ Question submissions logged server-side (Task 3, `storeQuestion`)
- ✅ Date + time captured via `created_at` timestamp
- ✅ Unique visitors (hashed IP deduplicated per calendar day, Task 4)
- ✅ Analytics section at top of Dashboard (Task 6)
- ✅ Totals row for cross-resume aggregates (Task 6)
- ✅ Empty state for resumes with no activity (Task 6)

**Placeholder scan:** None found.

**Type consistency:** `ResumeStat` defined in Task 5, imported and used in Task 6. `ResumeShareEvent::log()` signature consistent across Tasks 2 and 3. `AnalyticsController` returns `resumeStats` (array of objects matching `ResumeStat`) — consistent with Task 6 `usePage` destructure.
