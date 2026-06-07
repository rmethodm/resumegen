# Batch 6: Engagement & Insights — Design Spec

**Date:** 2026-06-07  
**Batch theme:** Engagement & Insights  
**Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, SQLite, PHPUnit 12

---

## Context

After auditing the codebase, features previously thought to be missing (section reordering, custom sections, 13 templates, spell check) are already fully implemented. Batch 6 targets genuinely missing features that drive engagement and insight.

---

## Overview

1. **Resume Completion Progress Bar** — server-computed 0–100 score shown in editor header, motivates filling in sparse resumes
2. **Per-Template Performance Analytics** — dashboard card showing view/download counts per template across all user resumes
3. **Resume Comparison View** — side-by-side comparison of any two resume snapshots or variants
4. **In-App Tips Sidebar** — collapsible panel in the editor with contextual tips per section (no database)

---

## Feature 1: Resume Completion Progress Bar

### Goal
Show a 0–100 completion score in the editor header. Motivates users to fill in sparse sections. Score recalculates after each save.

### Scoring Algorithm (server-side in `ResumeBuilderController@edit`)

| Field | Points |
|-------|--------|
| Contact name present | 8 |
| Contact email present | 8 |
| Contact phone present | 5 |
| Contact location present | 5 |
| Contact title/role present | 5 |
| Summary ≥ 50 chars | 20 |
| At least 1 experience entry | 15 |
| At least 1 experience with bullets | 5 |
| At least 1 education entry | 12 |
| At least 1 skill | 7 |
| At least 1 certification | 5 |
| Photo uploaded (sidebar/creative/executive) | 5 |
| **Total possible** | **100** |

Clamp to `min(100, computed)`. Pass as `completionScore: int` prop to `Edit.tsx`. For non-photo templates, max is 95 (still shows 95% complete).

### Backend

**`app/Http/Controllers/ResumeBuilderController.php`** — add a private `computeCompletionScore(Resume $resume): int` method and call it in `edit()`, passing `'completionScore' => $this->computeCompletionScore($resume)` to Inertia.

### Frontend

**`resources/js/Pages/ResumeBuilder/Edit.tsx`**:
- `completionScore: number` in Props interface
- Below the template/font toolbar, add a thin progress bar (full width of the left panel)
- Color: `bg-red-400` < 40, `bg-amber-400` 40–69, `bg-green-500` ≥ 70
- Label: `"72% complete"` in `text-xs text-gray-400` to the right of the bar
- No reload needed — score is a server-rendered prop. Refresh iframe after save as normal.

### Tests

**`tests/Feature/CompletionScoreTest.php`** — 3 tests:
1. Empty resume returns score 0
2. Fully filled resume returns score ≥ 60
3. `completionScore` present in edit page props

---

## Feature 2: Per-Template Performance Analytics

### Goal
Show users which resume template gets the most engagement. One bar/row per template that has been shared. Appears on the Dashboard as a new card.

### Data Source

`resume_share_events` joined with `resumes` via `resume_id` → `resumes.template`. Group by template, sum `page_view` and `pdf_download` counts.

### Backend

**`app/Http/Controllers/AnalyticsController.php`** (existing) — extend `index()` to also compute `$templateStats`:

```php
$templateStats = ResumeShareEvent::query()
    ->join('resumes', 'resume_share_events.resume_id', '=', 'resumes.id')
    ->where('resumes.user_id', $user->id)
    ->selectRaw('resumes.template, COUNT(*) as total_events,
        SUM(resume_share_events.event_type = "page_view") as views,
        SUM(resume_share_events.event_type = "pdf_download") as downloads')
    ->groupBy('resumes.template')
    ->orderByDesc('views')
    ->get();
```

Pass as `templateStats` Inertia prop.

**`resources/js/types/index.d.ts`** — add:
```typescript
export interface TemplateStatRow {
    template: string;
    views: number;
    downloads: number;
    total_events: number;
}
```

### Frontend

**`resources/js/Pages/Dashboard.tsx`** — add a `TemplatePerformanceCard` component below the existing analytics cards. Only shows if `templateStats.length > 0`.

Each row: template name | views count | downloads count | horizontal mini-bar proportional to views.
No external chart library — pure Tailwind CSS bars (same as FunnelChart pattern).

### Tests

**`tests/Feature/AnalyticsTest.php`** (extend existing or create) — 2 tests:
1. Dashboard includes `templateStats` in props
2. `templateStats` aggregates correctly per template

---

## Feature 3: Resume Comparison View

### Goal
Let users compare any two resumes or snapshots side-by-side. No competitor has this. Useful for seeing how tailored versions differ from the original.

### Backend

**Route:** `GET /builder/{resume}/compare?with={otherId}` → `ResumeBuilderController@compare`
- Named: `builder.compare`
- Auth: owner of both resumes (403 if `other->user_id !== $user->id`)
- Returns Inertia `ResumeBuilder/Compare` page with both resume data objects

**`ResumeBuilderController@compare`:**
```php
public function compare(Request $request, Resume $resume): Response
{
    $this->authorize('update', $resume);
    $other = Resume::findOrFail($request->query('with'));
    $this->authorize('update', $other);
    return Inertia::render('ResumeBuilder/Compare', [
        'resume' => $resume->only('id', 'name', 'contact', 'summary', 'experience',
            'education', 'skills', 'certifications', 'custom_sections', 'template', 'updated_at'),
        'other'  => $other->only('id', 'name', 'contact', 'summary', 'experience',
            'education', 'skills', 'certifications', 'custom_sections', 'template', 'updated_at'),
    ]);
}
```

### Frontend

**`resources/js/Pages/ResumeBuilder/Compare.tsx`** — new page.

Layout: two columns of equal width inside `AuthenticatedLayout`.
- Header: `{resume.name}` vs `{other.name}` with template badges
- Each section (Contact, Summary, Experience, Education, Skills, Certifications): side-by-side panels
- Differences highlighted: if a field differs between the two, wrap in a light yellow `bg-amber-50` border
- Simple text diff: show full field values, not inline char-level diffs (too complex)
- "Edit A" and "Edit B" buttons linking to `builder.edit` for each

**Entry point:** In `Edit.tsx` version panel / snapshot list, add "Compare with current" link next to each snapshot. Route: `route('builder.compare', resume.id) + '?with=' + snapshot.id`.

In `ResumeBuilder/Index.tsx`, add "Compare" as an action in the resume dropdown menu.

### Tests

**`tests/Feature/ResumeCompareTest.php`** — 4 tests:
1. Owner can load compare page with two resumes
2. Returns 403 when `with` resume belongs to another user
3. Returns 404 when `with` param is invalid
4. `resume` and `other` props are present in response

---

## Feature 4: In-App Tips Sidebar

### Goal
Show contextual writing tips in the editor to help users write better resumes. No database — tips are static JSON. Collapsible panel below the strength score.

### Tips Data (frontend only)

```typescript
const TIPS: Record<string, string[]> = {
    summary: [
        'Lead with your strongest skill or accomplishment.',
        'Keep it to 2–3 sentences. Recruiters scan fast.',
        'Mention years of experience and your target role.',
    ],
    experience: [
        'Start each bullet with an action verb (Led, Built, Reduced).',
        'Quantify impact: "Increased sales by 23%" beats "Improved sales".',
        'Focus on achievements, not just responsibilities.',
    ],
    education: [
        'List most recent degree first.',
        'Include GPA only if ≥ 3.5 and you graduated within 5 years.',
    ],
    skills: [
        'Group related skills (Languages, Frameworks, Tools).',
        'Avoid soft skills — recruiters expect them.',
        'List skills relevant to the job you want, not every tool ever used.',
    ],
    contact: [
        'Use a professional email address.',
        'LinkedIn URL should be linkedin.com/in/yourname.',
        'Location: City, State is enough — no full address.',
    ],
};
```

### Frontend

**`resources/js/Pages/ResumeBuilder/Edit.tsx`**:
- Add `showTips` state (default `false`)
- "Tips" toggle button in the editor toolbar (lightbulb icon)
- When open: collapsible panel at the bottom of the left sidebar showing tips for the currently active section
- Detect active section by which section the user is currently viewing (track `activeSection: string` state based on which section heading is in view — use `IntersectionObserver` on section headers, or simply track the last section the user interacted with)
- Simpler approach: tabs at top of tips panel showing section names; user clicks section name to see relevant tips
- Tips rendered as a bulleted list in a light indigo `bg-indigo-50 rounded-lg p-3` panel

### Tests

No PHP tests needed — purely frontend. Skip PHP tests for this feature.

---

## Test Summary

| Feature | New Tests |
|---|---|
| Completion Progress Bar | 3 |
| Template Performance Analytics | 2 |
| Resume Comparison View | 4 |
| In-App Tips Sidebar | 0 (frontend only) |
| **Total** | **9** |

Starting count: 470 tests. Target: 479+ tests.

---

## Tier Gates Summary

| Feature | Free | Starter | Pro |
|---|---|---|---|
| Completion Score | ✓ | ✓ | ✓ |
| Template Analytics | ✓ | ✓ | ✓ |
| Comparison View | ✓ | ✓ | ✓ |
| In-App Tips | ✓ | ✓ | ✓ |

All features free — engagement-focused, not conversion-focused.
