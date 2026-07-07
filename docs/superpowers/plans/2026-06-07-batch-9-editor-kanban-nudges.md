# Batch 9: Custom Sections, Section Reordering, Kanban Job Tracker, Freshness Nudges — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Batch 9 by adding missing tests and wiring the nudge schedule — all four features are already fully implemented in the codebase.

**Architecture:** All four features were pre-built in earlier sessions. The full-stack code (migrations, models, controllers, React components, PDF rendering) is already live and passing 425 tests. This plan closes the remaining gaps: 6 missing tests across 3 feature areas and 1 missing scheduler registration.

**Tech Stack:** Laravel 13, PHP 8.4, PHPUnit 12, React 18, @dnd-kit/core + @dnd-kit/sortable, SQLite

---

## Pre-flight: Verify Current State

Before starting, confirm the baseline:

```bash
php artisan test --compact
```

Expected: 425 tests, 425 passed.

---

## Task 1: Add nudge command to the scheduler

**Files:**
- Modify: `routes/console.php`

The `resumes:nudge-stale` command exists and is tested but is never scheduled. Add it to the daily schedule.

- [ ] **Step 1: Open `routes/console.php` and read its current content**

Current content (the default Laravel stub):
```php
<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');
```

- [ ] **Step 2: Add the schedule**

Replace the entire file with:

```php
<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('resumes:nudge-stale')->dailyAt('09:00');
```

- [ ] **Step 3: Verify the schedule is registered**

```bash
php artisan schedule:list
```

Expected output includes a line like:
```
0 9 * * *  php artisan resumes:nudge-stale
```

- [ ] **Step 4: Run pint**

```bash
./vendor/bin/pint routes/console.php --format agent
```

- [ ] **Step 5: Commit**

```bash
git add routes/console.php
git commit -m "feat: schedule resumes:nudge-stale daily at 09:00 UTC"
```

---

## Task 2: Tests for Custom Sections

**Files:**
- Modify: `tests/Feature/ResumeBuilderTest.php`

Custom sections can be saved to a resume and are persisted correctly. The controller already validates and enforces the `customSectionLimit`.

- [ ] **Step 1: Read `tests/Feature/ResumeBuilderTest.php`** to find the `test_user_can_update_resume` test and understand the update pattern used.

- [ ] **Step 2: Add two tests at the end of the class**

```php
public function test_custom_sections_are_saved_on_update(): void
{
    $user = User::factory()->pro()->create();
    $resume = Resume::factory()->create(['user_id' => $user->id]);

    $customSections = [
        [
            'id'      => 'abc-123',
            'name'    => 'Publications',
            'entries' => [
                [
                    'id'          => 'entry-1',
                    'title'       => 'My Paper',
                    'subtitle'    => 'Journal of Testing',
                    'start_date'  => '2024',
                    'end_date'    => null,
                    'description' => '',
                    'bullets'     => ['Key finding one', 'Key finding two'],
                ],
            ],
        ],
    ];

    $this->actingAs($user)
        ->put(route('builder.update', $resume), [
            'name'            => $resume->name,
            'custom_sections' => $customSections,
        ])
        ->assertRedirect();

    $this->assertEquals($customSections, $resume->fresh()->custom_sections);
}

public function test_free_user_cannot_exceed_custom_section_limit(): void
{
    $user = User::factory()->free()->create();
    $resume = Resume::factory()->create(['user_id' => $user->id]);

    // Free users are limited — build one more than allowed
    $limit = \App\Services\UserLimits::customSectionLimit($user);
    $this->assertNotNull($limit, 'Free users should have a custom section limit');

    $tooMany = array_map(fn ($i) => [
        'id'      => "id-{$i}",
        'name'    => "Section {$i}",
        'entries' => [],
    ], range(1, $limit + 1));

    $this->actingAs($user)
        ->put(route('builder.update', $resume), [
            'name'            => $resume->name,
            'custom_sections' => $tooMany,
        ])
        ->assertSessionHas('featureGate');
}
```

- [ ] **Step 3: Run the new tests**

```bash
php artisan test --compact --filter=test_custom_sections_are_saved_on_update,test_free_user_cannot_exceed_custom_section_limit
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add tests/Feature/ResumeBuilderTest.php
git commit -m "test: custom sections — save and free-tier limit enforcement"
```

---

## Task 3: Tests for Section Ordering

**Files:**
- Modify: `tests/Feature/ResumeBuilderTest.php`

Section order is persisted on update and defaults to the standard order when null.

- [ ] **Step 1: Add two tests at the end of the class**

```php
public function test_section_order_is_saved_on_update(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->create(['user_id' => $user->id, 'section_order' => null]);

    $order = ['skills', 'summary', 'experience', 'education', 'certifications'];

    $this->actingAs($user)
        ->put(route('builder.update', $resume), [
            'name'          => $resume->name,
            'section_order' => $order,
        ])
        ->assertRedirect();

    $this->assertEquals($order, $resume->fresh()->section_order);
}

public function test_resume_with_null_section_order_uses_default_in_pdf(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->create([
        'user_id'       => $user->id,
        'section_order' => null,
        'summary'       => 'A brief summary.',
    ]);

    $response = $this->actingAs($user)
        ->get(route('builder.preview', $resume));

    $response->assertOk();
    $response->assertHeader('content-type', 'application/pdf');
}
```

- [ ] **Step 2: Run the new tests**

```bash
php artisan test --compact --filter=test_section_order_is_saved_on_update,test_resume_with_null_section_order_uses_default_in_pdf
```

Expected: 2 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/Feature/ResumeBuilderTest.php
git commit -m "test: section ordering — persist custom order and PDF default fallback"
```

---

## Task 4: Tests for Kanban Job Tracker

**Files:**
- Modify: `tests/Feature/JobApplicationTest.php`

The Kanban board renders from the existing job list. The key behaviors to test: the jobs index page loads successfully and a status change via `PUT /jobs/{id}` (the drag-and-drop endpoint) updates the status.

- [ ] **Step 1: Read `tests/Feature/JobApplicationTest.php`** to understand the existing patterns for creating jobs and making requests.

- [ ] **Step 2: Add two tests**

```php
public function test_jobs_index_loads_for_authenticated_user(): void
{
    $user = User::factory()->pro()->create();
    \App\Models\JobApplication::factory()->count(3)->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get(route('jobs.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Jobs/Index')
            ->has('applications', 3)
        );
}

public function test_kanban_drag_updates_job_status(): void
{
    $user = User::factory()->create();
    $job = \App\Models\JobApplication::factory()->create([
        'user_id' => $user->id,
        'status'  => 'saved',
    ]);

    $this->actingAs($user)
        ->put(route('jobs.update', $job), ['status' => 'applied'])
        ->assertRedirect();

    $this->assertEquals('applied', $job->fresh()->status);
}
```

- [ ] **Step 3: Run the new tests**

```bash
php artisan test --compact --filter=test_jobs_index_loads_for_authenticated_user,test_kanban_drag_updates_job_status
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add tests/Feature/JobApplicationTest.php
git commit -m "test: kanban job tracker — index loads and drag-drop status update"
```

---

## Task 5: Full Suite Verification

- [ ] **Step 1: Run the complete test suite**

```bash
php artisan test --compact
```

Expected: all tests pass (431+ tests, 0 failures).

- [ ] **Step 2: If everything passes, update CONTEXT.md**

```
# Resumegen Context

## Current Task
Batch 9 complete — custom sections, section reordering, kanban, freshness nudges.

## Key Decisions
- All 4 features were pre-built; plan closed gaps: schedule + 6 tests
- Nudge command uses per-user 30-day threshold (not per-resume 90-day per spec)
- Referral program was already shipped in Batch 2 — skipped in Batch 9

## Next Steps
- Batch 10 candidates: LinkedIn Profile Optimizer, GitHub Portfolio Import, Chrome extension
- 5 deferred audit fixes still pending (see project-audit-remaining-fixes.md)
```

---

## File Map

| File | Action | Why |
|---|---|---|
| `routes/console.php` | Modify | Register nudge schedule |
| `tests/Feature/ResumeBuilderTest.php` | Modify | Custom sections + section order tests |
| `tests/Feature/JobApplicationTest.php` | Modify | Kanban index + drag-update tests |

## What Is NOT in This Plan

The following are already fully implemented and do not need any changes:

- `database/migrations/2026_06_05_214859_add_section_order_and_custom_sections_to_resumes_table.php` — ran ✅
- `app/Models/Resume.php` — casts custom_sections + section_order ✅
- `app/Http/Controllers/ResumeBuilderController.php` — validates + gates custom_sections, passes customSectionLimit ✅
- `app/Services/UserLimits.php` — `customSectionLimit()` method ✅
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — full DnD + custom sections UI ✅
- `resources/views/partials/resume-body.blade.php` — section_order loop + custom section rendering ✅
- `resources/js/Pages/Jobs/KanbanView.tsx`, `KanbanColumn.tsx`, `KanbanCard.tsx` — fully built ✅
- `resources/js/Pages/Jobs/Index.tsx` — board/table toggle with localStorage ✅
- `app/Mail/StaleResumeNudgeMail.php` — mail class ✅
- `app/Console/Commands/NudgeStaleResumesCommand.php` — command ✅
- `resources/views/emails/stale-resume-nudge.blade.php` — email view ✅
- `tests/Feature/StaleNudgeTest.php` — 5 passing nudge tests ✅
