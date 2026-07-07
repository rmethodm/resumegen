# Batch 6: Engagement & Insights — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four engagement/insight features: completion progress bar, per-template analytics, resume comparison view, and in-app tips sidebar.

**Architecture:** All four are additive — no existing behavior changes. Two touch the backend (completion score, template analytics), one adds a new page (comparison), one is pure frontend (tips).

**Tech Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, SQLite, PHPUnit 12

---

## Codebase context

- `app/Http/Controllers/ResumeBuilderController.php` — `edit()` method at ~line 100 returns Inertia props for `ResumeBuilder/Edit`. The `update()` method at ~line 155 validates and saves resume data.
- `app/Http/Controllers/AnalyticsController.php` — `index()` fetches events from `resume_share_events` and passes `resumeStats` + `resumeCount` to `Dashboard`.
- `app/Models/ResumeShareEvent.php` — columns: `id, resume_share_link_id, resume_id, event, ip_hash, user_agent, referrer, created_at`. The `event` column stores `'page_view'`, `'pdf_download'`, `'question_submitted'`.
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — left panel editor with toolbar. Props already include `photoUrl`, `completionScore` is NOT yet a prop.
- `resources/js/Pages/Dashboard.tsx` — shows per-resume analytics stats.
- `resources/js/Pages/ResumeBuilder/Compare.tsx` — does NOT exist yet.
- Template keys in use: `classic`, `modern`, `minimal`, `minimal-ruled`, `sidebar`, `creative`, `executive`, `ats`, `skills-first`, `skills-first-visual`, `academic`, `bold`, `timeline`.
- Tests live in `tests/Feature/`. Run with `php artisan test --compact`.

---

## Task 1: Resume Completion Progress Bar

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`
- Create: `tests/Feature/CompletionScoreTest.php`

### Step 1: Write failing tests

- [ ] Create `tests/Feature/CompletionScoreTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CompletionScoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_empty_resume_returns_score_zero(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create([
            'user_id' => $user->id,
            'contact' => [],
            'summary' => null,
            'experience' => [],
            'education' => [],
            'skills' => [],
            'certifications' => [],
        ]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume->id));
        $response->assertInertia(fn ($page) =>
            $page->where('completionScore', 0)
        );
    }

    public function test_fully_filled_resume_returns_high_score(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create([
            'user_id' => $user->id,
            'contact' => [
                'full_name' => 'Jane Doe',
                'email' => 'jane@example.com',
                'phone' => '555-1234',
                'location' => 'New York, NY',
                'title' => 'Software Engineer',
            ],
            'summary' => 'Experienced software engineer with 10 years building scalable systems.',
            'experience' => [
                ['company' => 'Acme', 'title' => 'Engineer', 'bullets' => 'Built stuff\nDid things'],
            ],
            'education' => [
                ['school' => 'MIT', 'degree' => 'BS Computer Science'],
            ],
            'skills' => ['PHP', 'Laravel', 'React'],
            'certifications' => [['name' => 'AWS Certified']],
        ]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume->id));
        $response->assertInertia(fn ($page) =>
            $page->where('completionScore', fn ($score) => $score >= 60)
        );
    }

    public function test_completion_score_prop_is_present_in_edit_page(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)->get(route('builder.edit', $resume->id));
        $response->assertInertia(fn ($page) =>
            $page->has('completionScore')
        );
    }
}
```

- [ ] Run to confirm they fail:
```
php artisan test --compact tests/Feature/CompletionScoreTest.php
```
Expected: 3 failures (prop not yet returned)

### Step 2: Add `computeCompletionScore` to controller

- [ ] Open `app/Http/Controllers/ResumeBuilderController.php`. After the closing brace of `edit()`, add a private method. Also add `'completionScore' => $this->computeCompletionScore($resume)` to the Inertia::render props array inside `edit()` (add it just before the `'snapshots'` line).

Add the private method anywhere inside the class:

```php
private function computeCompletionScore(Resume $resume): int
{
    $score = 0;
    $c = $resume->contact ?? [];

    if (! empty($c['full_name'])) { $score += 8; }
    if (! empty($c['email'])) { $score += 8; }
    if (! empty($c['phone'])) { $score += 5; }
    if (! empty($c['location'])) { $score += 5; }
    if (! empty($c['title'])) { $score += 5; }

    if (! empty($resume->summary) && strlen($resume->summary) >= 50) {
        $score += 20;
    }

    $exp = $resume->experience ?? [];
    if (count($exp) > 0) { $score += 15; }
    if (count(array_filter($exp, fn ($e) => ! empty($e['bullets']))) > 0) {
        $score += 5;
    }

    if (count($resume->education ?? []) > 0) { $score += 12; }
    if (count($resume->skills ?? []) > 0) { $score += 7; }
    if (count($resume->certifications ?? []) > 0) { $score += 5; }

    // Photo bonus for photo-supporting templates
    if (in_array($resume->template ?? 'classic', ['sidebar', 'creative', 'executive'])) {
        if ($resume->getFirstMediaUrl('photo')) { $score += 5; }
    }

    return min(100, $score);
}
```

### Step 3: Run tests

- [ ] `php artisan test --compact tests/Feature/CompletionScoreTest.php`
Expected: all 3 pass

### Step 4: Add progress bar to Edit.tsx

- [ ] In `resources/js/Pages/ResumeBuilder/Edit.tsx`:

1. Add `completionScore: number` to the Props interface (alongside `photoUrl`)

2. Destructure `completionScore` from props

3. Find the toolbar area (around line 720–750 where template/font controls are). After the toolbar closing div, add:

```tsx
{/* Completion progress bar */}
<div className="flex items-center gap-2 border-b border-gray-100 bg-white px-4 py-1.5">
    <div className="flex-1 overflow-hidden rounded-full bg-gray-100" style={{ height: '4px' }}>
        <div
            className={`h-full rounded-full transition-all ${
                completionScore >= 70
                    ? 'bg-green-500'
                    : completionScore >= 40
                      ? 'bg-amber-400'
                      : 'bg-red-400'
            }`}
            style={{ width: `${completionScore}%` }}
        />
    </div>
    <span className="w-20 shrink-0 text-right text-xs text-gray-400">
        {completionScore}% complete
    </span>
</div>
```

### Step 5: Run Pint and build

- [ ] `./vendor/bin/pint app/Http/Controllers/ResumeBuilderController.php`
- [ ] `npm run build`

### Step 6: Commit

- [ ] `git add app/Http/Controllers/ResumeBuilderController.php resources/js/Pages/ResumeBuilder/Edit.tsx tests/Feature/CompletionScoreTest.php`
- [ ] `git commit -m "feat: add resume completion progress bar — server-computed score, colored bar in editor (3 tests)"`

---

## Task 2: Per-Template Performance Analytics

**Files:**
- Modify: `app/Http/Controllers/AnalyticsController.php`
- Modify: `resources/js/Pages/Dashboard.tsx`
- Modify: `resources/js/types/index.d.ts`
- Modify or create: `tests/Feature/AnalyticsTest.php`

### Step 1: Write failing tests

- [ ] Check if `tests/Feature/AnalyticsTest.php` exists. If not, create it. If it exists, add these two test methods to the class:

```php
public function test_dashboard_includes_template_stats(): void
{
    $user = User::factory()->create();
    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) =>
            $page->has('templateStats')
        );
}

public function test_template_stats_aggregates_per_template(): void
{
    $user = User::factory()->create();

    $classicResume = Resume::factory()->create([
        'user_id' => $user->id,
        'template' => 'classic',
    ]);
    $modernResume = Resume::factory()->create([
        'user_id' => $user->id,
        'template' => 'modern',
    ]);

    // Create a share link for classic resume
    $classicLink = \App\Models\ResumeShareLink::factory()->create([
        'resume_id' => $classicResume->id,
    ]);

    // Log 2 page views for classic, 1 for modern
    \App\Models\ResumeShareEvent::create([
        'resume_share_link_id' => $classicLink->id,
        'resume_id' => $classicResume->id,
        'event' => 'page_view',
        'ip_hash' => 'abc',
    ]);
    \App\Models\ResumeShareEvent::create([
        'resume_share_link_id' => $classicLink->id,
        'resume_id' => $classicResume->id,
        'event' => 'page_view',
        'ip_hash' => 'def',
    ]);

    $modernLink = \App\Models\ResumeShareLink::factory()->create([
        'resume_id' => $modernResume->id,
    ]);
    \App\Models\ResumeShareEvent::create([
        'resume_share_link_id' => $modernLink->id,
        'resume_id' => $modernResume->id,
        'event' => 'page_view',
        'ip_hash' => 'ghi',
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));
    $response->assertInertia(fn ($page) =>
        $page->where('templateStats', fn ($stats) =>
            collect($stats)->firstWhere('template', 'classic')['views'] === 2
            && collect($stats)->firstWhere('template', 'modern')['views'] === 1
        )
    );
}
```

If creating a new file, wrap in:
```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AnalyticsTest extends TestCase
{
    use RefreshDatabase;

    // ... tests here
}
```

- [ ] Run to confirm failure:
```
php artisan test --compact tests/Feature/AnalyticsTest.php
```

### Step 2: Add templateStats to AnalyticsController

- [ ] In `app/Http/Controllers/AnalyticsController.php`, inside `index()`, after the `$stats` computation and before the `return Inertia::render`, add:

```php
$templateStats = ResumeShareEvent::query()
    ->join('resumes', 'resume_share_events.resume_id', '=', 'resumes.id')
    ->whereIn('resume_share_events.resume_id', $resumeIds)
    ->selectRaw(
        'resumes.template,
        SUM(CASE WHEN resume_share_events.event = "page_view" THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN resume_share_events.event = "pdf_download" THEN 1 ELSE 0 END) as downloads'
    )
    ->groupBy('resumes.template')
    ->orderByDesc('views')
    ->get()
    ->map(fn ($row) => [
        'template' => $row->template,
        'views' => (int) $row->views,
        'downloads' => (int) $row->downloads,
    ])
    ->values()
    ->all();
```

Then add to the `Inertia::render` props:
```php
'templateStats' => $templateStats,
```

### Step 3: Run tests

- [ ] `php artisan test --compact tests/Feature/AnalyticsTest.php`
Expected: both pass

### Step 4: Add TemplateStatRow type to index.d.ts

- [ ] In `resources/js/types/index.d.ts`, add:

```typescript
export interface TemplateStatRow {
    template: string;
    views: number;
    downloads: number;
}
```

### Step 5: Add TemplatePerformanceCard to Dashboard.tsx

- [ ] In `resources/js/Pages/Dashboard.tsx`, add `templateStats: TemplateStatRow[]` to the Props interface. Then add a `TemplatePerformanceCard` component and render it in the page. Find an appropriate spot below the existing cards (after the per-resume stats table or grid).

The component:

```tsx
function TemplatePerformanceCard({ stats }: { stats: TemplateStatRow[] }) {
    if (stats.length === 0) return null;
    const maxViews = Math.max(...stats.map((s) => s.views), 1);
    const LABELS: Record<string, string> = {
        classic: 'Classic', modern: 'Modern', minimal: 'Minimal',
        'minimal-ruled': 'Minimal Ruled', sidebar: 'Sidebar', creative: 'Creative',
        executive: 'Executive', ats: 'ATS', 'skills-first': 'Skills-First',
        'skills-first-visual': 'Skills-First Visual', academic: 'Academic CV',
        bold: 'Minimalist Bold', timeline: 'Timeline',
    };
    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Template Performance</h3>
                <p className="mt-0.5 text-xs text-gray-500">Views per template across all your shared resumes</p>
            </div>
            <div className="divide-y divide-gray-50">
                {stats.map((row) => (
                    <div key={row.template} className="flex items-center gap-3 px-6 py-3">
                        <span className="w-32 shrink-0 text-sm text-gray-700">
                            {LABELS[row.template] ?? row.template}
                        </span>
                        <div className="flex-1 overflow-hidden rounded-full bg-gray-100" style={{ height: '6px' }}>
                            <div
                                className="h-full rounded-full bg-indigo-500"
                                style={{ width: `${(row.views / maxViews) * 100}%` }}
                            />
                        </div>
                        <span className="w-12 shrink-0 text-right text-sm font-medium text-gray-700">{row.views}</span>
                        <span className="w-20 shrink-0 text-right text-xs text-gray-400">{row.downloads} dl</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

Import `TemplateStatRow` from `@/types`. Destructure `templateStats` from props. Add `<TemplatePerformanceCard stats={templateStats} />` somewhere in the page JSX below the resume stats section.

### Step 6: Run Pint and build

- [ ] `./vendor/bin/pint app/Http/Controllers/AnalyticsController.php`
- [ ] `npm run build`

### Step 7: Commit

- [ ] `git add app/Http/Controllers/AnalyticsController.php resources/js/Pages/Dashboard.tsx resources/js/types/index.d.ts tests/Feature/AnalyticsTest.php`
- [ ] `git commit -m "feat: add per-template performance analytics — bar chart card on dashboard (2 tests)"`

---

## Task 3: Resume Comparison View

**Files:**
- Modify: `app/Http/Controllers/ResumeBuilderController.php`
- Modify: `routes/web.php`
- Create: `resources/js/Pages/ResumeBuilder/Compare.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` (add link in snapshots panel)
- Create: `tests/Feature/ResumeCompareTest.php`

### Step 1: Write failing tests

- [ ] Create `tests/Feature/ResumeCompareTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Resume;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ResumeCompareTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_load_compare_page(): void
    {
        $user = User::factory()->create();
        $resumeA = Resume::factory()->create(['user_id' => $user->id]);
        $resumeB = Resume::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user)
            ->get(route('builder.compare', $resumeA->id) . '?with=' . $resumeB->id);

        $response->assertInertia(fn ($page) =>
            $page->component('ResumeBuilder/Compare')
                ->has('resume')
                ->has('other')
        );
    }

    public function test_returns_403_when_other_resume_belongs_to_different_user(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $resumeA = Resume::factory()->create(['user_id' => $user->id]);
        $resumeB = Resume::factory()->create(['user_id' => $other->id]);

        $this->actingAs($user)
            ->get(route('builder.compare', $resumeA->id) . '?with=' . $resumeB->id)
            ->assertForbidden();
    }

    public function test_returns_404_when_with_param_is_missing(): void
    {
        $user = User::factory()->create();
        $resume = Resume::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user)
            ->get(route('builder.compare', $resume->id))
            ->assertNotFound();
    }

    public function test_resume_and_other_props_are_present(): void
    {
        $user = User::factory()->create();
        $resumeA = Resume::factory()->create([
            'user_id' => $user->id,
            'name' => 'Resume A',
        ]);
        $resumeB = Resume::factory()->create([
            'user_id' => $user->id,
            'name' => 'Resume B',
        ]);

        $response = $this->actingAs($user)
            ->get(route('builder.compare', $resumeA->id) . '?with=' . $resumeB->id);

        $response->assertInertia(fn ($page) =>
            $page->where('resume.name', 'Resume A')
                ->where('other.name', 'Resume B')
        );
    }
}
```

- [ ] Run to confirm failure:
```
php artisan test --compact tests/Feature/ResumeCompareTest.php
```

### Step 2: Add route

- [ ] In `routes/web.php`, inside the authenticated group, after the `builder.ab-compare` route line, add:

```php
Route::get('/builder/{resume}/compare', [ResumeBuilderController::class, 'compare'])->name('builder.compare');
```

### Step 3: Add `compare` method to controller

- [ ] In `app/Http/Controllers/ResumeBuilderController.php`, add this method (after `abCompare` method is a good place):

```php
public function compare(Request $request, Resume $resume): \Inertia\Response
{
    $this->authorize('update', $resume);

    $otherId = $request->query('with');
    if (! $otherId) {
        abort(404);
    }

    $other = Resume::findOrFail($otherId);
    $this->authorize('update', $other);

    $fields = ['id', 'name', 'contact', 'summary', 'experience', 'education',
        'skills', 'certifications', 'custom_sections', 'template', 'updated_at'];

    return Inertia::render('ResumeBuilder/Compare', [
        'resume' => $resume->only($fields),
        'other'  => $other->only($fields),
    ]);
}
```

### Step 4: Run tests

- [ ] `php artisan test --compact tests/Feature/ResumeCompareTest.php`
Expected: first 3 pass; 4th depends on component existing (may fail on component — that's fine, add `allowEmptyComponent` or fix after creating the component)

Actually all 4 tests can pass now because Inertia test assertions just check props, not whether the React component exists.

### Step 5: Create `Compare.tsx`

- [ ] Create `resources/js/Pages/ResumeBuilder/Compare.tsx`:

```tsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

interface ResumeData {
    id: number;
    name: string;
    contact: Record<string, string> | null;
    summary: string | null;
    experience: Array<Record<string, string>> | null;
    education: Array<Record<string, string>> | null;
    skills: string[] | null;
    certifications: Array<Record<string, string>> | null;
    custom_sections: Array<{ id: string; title: string; items: Array<{ id: string; text: string }> }> | null;
    template: string;
    updated_at: string;
}

interface Props {
    resume: ResumeData;
    other: ResumeData;
}

function differs(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) !== JSON.stringify(b);
}

function Cell({ value, highlight }: { value: string | null | undefined; highlight: boolean }) {
    return (
        <div
            className={`min-h-[2rem] rounded p-2 text-sm text-gray-800 ${
                highlight ? 'border border-amber-300 bg-amber-50' : 'bg-gray-50'
            }`}
        >
            {value || <span className="italic text-gray-400">empty</span>}
        </div>
    );
}

export default function Compare({ resume, other }: Props) {
    const sections = [
        { label: 'Template', a: resume.template, b: other.template },
        { label: 'Summary', a: resume.summary, b: other.summary },
    ];

    const contactFields = ['full_name', 'title', 'email', 'phone', 'location', 'linkedin', 'website'];

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Compare Resumes</h2>}>
            <Head title="Compare Resumes" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Header row */}
                    <div className="mb-6 grid grid-cols-2 gap-4">
                        {[resume, other].map((r) => (
                            <div key={r.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-3">
                                <div>
                                    <div className="font-semibold text-gray-900">{r.name}</div>
                                    <div className="text-xs text-gray-500">Template: {r.template} · Updated {r.updated_at.slice(0, 10)}</div>
                                </div>
                                <Link
                                    href={route('builder.edit', r.id)}
                                    className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                                >
                                    Edit
                                </Link>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4">
                        {/* Simple fields */}
                        {sections.map((s) => (
                            <div key={s.label} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    {s.label}
                                </div>
                                <div className="grid grid-cols-2 gap-3 p-3">
                                    <Cell value={s.a ?? ''} highlight={differs(s.a, s.b)} />
                                    <Cell value={s.b ?? ''} highlight={differs(s.a, s.b)} />
                                </div>
                            </div>
                        ))}

                        {/* Contact */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Contact</div>
                            <div className="p-3 space-y-2">
                                {contactFields.map((f) => {
                                    const av = (resume.contact ?? {})[f];
                                    const bv = (other.contact ?? {})[f];
                                    return (
                                        <div key={f}>
                                            <div className="mb-1 text-xs text-gray-400">{f}</div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Cell value={av} highlight={differs(av, bv)} />
                                                <Cell value={bv} highlight={differs(av, bv)} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Skills */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Skills</div>
                            <div className="grid grid-cols-2 gap-3 p-3">
                                <Cell
                                    value={(resume.skills ?? []).join(', ')}
                                    highlight={differs(resume.skills, other.skills)}
                                />
                                <Cell
                                    value={(other.skills ?? []).join(', ')}
                                    highlight={differs(resume.skills, other.skills)}
                                />
                            </div>
                        </div>

                        {/* Experience */}
                        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Experience ({resume.experience?.length ?? 0} vs {other.experience?.length ?? 0} entries)
                            </div>
                            <div className="grid grid-cols-2 gap-3 p-3">
                                <Cell
                                    value={(resume.experience ?? []).map((e) => `${e.title} @ ${e.company}`).join('\n')}
                                    highlight={differs(resume.experience, other.experience)}
                                />
                                <Cell
                                    value={(other.experience ?? []).map((e) => `${e.title} @ ${e.company}`).join('\n')}
                                    highlight={differs(resume.experience, other.experience)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <Link href={route('builder.edit', resume.id)} className="text-sm text-gray-500 hover:text-gray-700">
                            ← Back to editor
                        </Link>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
```

### Step 6: Add compare link in Edit.tsx snapshots panel

- [ ] In `resources/js/Pages/ResumeBuilder/Edit.tsx`, find the snapshots panel section (look for `snapshots.map` or similar). For each snapshot item, add a "Compare" link next to the existing "Restore" link:

```tsx
<a
    href={route('builder.compare', resume.id) + '?with=' + snapshot.id}
    className="text-xs text-gray-400 hover:text-indigo-600"
>
    Compare
</a>
```

### Step 7: Run all 4 tests

- [ ] `php artisan test --compact tests/Feature/ResumeCompareTest.php`
Expected: all 4 pass

### Step 8: Run Pint and build

- [ ] `./vendor/bin/pint app/Http/Controllers/ResumeBuilderController.php routes/web.php`
- [ ] `npm run build`

### Step 9: Commit

- [ ] `git add app/Http/Controllers/ResumeBuilderController.php routes/web.php resources/js/Pages/ResumeBuilder/Compare.tsx resources/js/Pages/ResumeBuilder/Edit.tsx tests/Feature/ResumeCompareTest.php`
- [ ] `git commit -m "feat: add resume comparison view — side-by-side snapshot diff with field-level highlighting (4 tests)"`

---

## Task 4: In-App Tips Sidebar

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

No backend changes. No PHP tests (pure frontend).

### Step 1: Add tips data and UI to Edit.tsx

- [ ] In `resources/js/Pages/ResumeBuilder/Edit.tsx`:

1. Add tips constant at module scope (near `DEFAULT_SECTION_ORDER` or similar constants):

```typescript
const SECTION_TIPS: Record<string, string[]> = {
    summary: [
        'Lead with your strongest skill or most impressive accomplishment.',
        'Keep it 2–3 sentences — recruiters scan in seconds.',
        'Mention years of experience and your specific target role.',
        'Avoid personal pronouns ("I am...") — start with your title or skill.',
    ],
    experience: [
        'Start every bullet with a strong action verb: Led, Built, Reduced, Grew.',
        'Quantify impact where possible: "Increased revenue by 23%" beats "Improved revenue".',
        'Focus on accomplishments, not just duties — what changed because of you?',
        'Use consistent tense: past tense for old jobs, present for current.',
    ],
    education: [
        'List most recent degree first.',
        'Include GPA only if ≥ 3.5 and you graduated within the last 5 years.',
        'Relevant coursework can help if you lack experience in a target area.',
    ],
    skills: [
        'List skills that match the job description first.',
        'Group into categories: Languages, Frameworks, Tools, Certifications.',
        'Avoid soft skills (teamwork, communication) — they\'re expected, not differentiating.',
        'Only list tools you can speak to confidently in an interview.',
    ],
    certifications: [
        'Include the issuing body and date for credibility.',
        'Active certifications are more valuable — remove expired ones for senior roles.',
    ],
    contact: [
        'Use a professional email address — firstname.lastname@domain.com.',
        'LinkedIn URL should be linkedin.com/in/yourname (customize it in LinkedIn settings).',
        'City, State is enough for location — no full address needed.',
    ],
    custom: [
        'Custom sections like "Publications" or "Volunteer Work" can differentiate you.',
        'Use section titles recruiters recognize — avoid overly creative names.',
    ],
};
```

2. Add `showTips` state and `activeTipsSection` state:
```typescript
const [showTips, setShowTips] = useState(false);
const [activeTipsSection, setActiveTipsSection] = useState('summary');
```

3. In the editor toolbar area (near the other toolbar buttons), add a Tips toggle button:
```tsx
<button
    type="button"
    onClick={() => setShowTips(v => !v)}
    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
        showTips
            ? 'bg-indigo-100 text-indigo-700'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
    }`}
    title="Writing tips"
>
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.14.08-.27.165-.386l2.554-3.476A4 4 0 1010 4a4 4 0 00-1.719 7.138L8 12h4l-.165.614A2 2 0 0112 14z" />
    </svg>
    Tips
</button>
```

4. In the left panel, after the existing content sections (or in the sidebar below the template selector), add the tips panel, shown only when `showTips` is true:

```tsx
{showTips && (
    <div className="border-t border-gray-100 bg-indigo-50/50 p-4">
        <div className="mb-3 flex flex-wrap gap-1">
            {Object.keys(SECTION_TIPS).map((section) => (
                <button
                    key={section}
                    type="button"
                    onClick={() => setActiveTipsSection(section)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        activeTipsSection === section
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-indigo-700 hover:bg-indigo-100'
                    }`}
                >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                </button>
            ))}
        </div>
        <ul className="space-y-2">
            {(SECTION_TIPS[activeTipsSection] ?? []).map((tip, i) => (
                <li key={i} className="flex gap-2 text-xs text-indigo-900">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    {tip}
                </li>
            ))}
        </ul>
    </div>
)}
```

### Step 2: Build

- [ ] `npm run build`
Expected: 0 TypeScript errors

### Step 3: Commit

- [ ] `git add resources/js/Pages/ResumeBuilder/Edit.tsx`
- [ ] `git commit -m "feat: add in-app tips sidebar — contextual writing tips panel per resume section"`

---

## Final Verification

- [ ] `php artisan test --compact` — all tests pass (target: 479+)
- [ ] `npm run build` — 0 TypeScript errors
- [ ] `./vendor/bin/pint --dirty` — clean

---

## Summary

| Task | Tests Added | Commit |
|---|---|---|
| Completion Progress Bar | +3 | feat: completion progress bar |
| Template Performance Analytics | +2 | feat: per-template analytics |
| Resume Comparison View | +4 | feat: resume comparison view |
| In-App Tips | +0 | feat: in-app tips sidebar |
| **Total** | **+9** | |
