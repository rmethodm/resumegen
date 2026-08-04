# Workstation Actionable Quality Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface `ResumeAnalysis` breakdown and suggestions in the Workstation left rail, with jump-to-bullet, insert-rewrite, and post-save analysis refresh.

**Architecture:** Server already computes score/suggestions; add `breakdown` to the workstation `analysis` prop. Mount existing `SuggestionList` under a compact four-band breakdown in `SectionPanel`. Workstation owns apply/jump handlers and keeps a local `analysis` state refreshed after autosave (Inertia PUT `back()` already returns fresh props with `preserveState` — sync from props; optionally `router.reload({ only: ['analysis'] })` if prop sync fails). Bullet inputs get stable DOM ids for focus.

**Tech Stack:** Laravel 13, Inertia React, PHPUnit feature tests, existing `ResumeAnalysis` / `SuggestionList`.

## Global Constraints

- No AI, no JD keyword panel, no client-side scorer, no new analysis rules.
- Do not re-read full resume document into editor draft on save.
- Match Headless UI + Tailwind + brand tokens already used in workstation.
- Commit messages plain (no conventional-commit prefixes required by Agents.md).

---

### Task 1: Backend analysis prop + feature test

**Files:**
- Modify: `app/Http/Controllers/ResumeController.php` (`render` analysis array)
- Modify: `tests/Feature/WorkstationHeaderTest.php` (or add assertions there)
- Types later in Task 2: `resources/js/types/resume.ts`

**Interfaces:**
- Produces: `analysis: { score: int, breakdown: list<{label, score}>, suggestions: list }`

- [ ] **Step 1: Write failing test** asserting workstation has breakdown with four labels

```php
public function test_workstation_includes_analysis_breakdown_and_suggestions(): void
{
    $user = User::factory()->create();
    $resume = Resume::factory()->for($user)->create();

    $this->actingAs($user)
        ->get(route('resumes.workstation', $resume))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Resumes/Workstation')
            ->has('analysis.score')
            ->has('analysis.suggestions')
            ->has('analysis.breakdown', 4)
            ->where('analysis.breakdown.0.label', 'Profile')
            ->where('analysis.breakdown.1.label', 'Experience')
            ->where('analysis.breakdown.2.label', 'Impact')
            ->where('analysis.breakdown.3.label', 'Keywords')
        );
}
```

- [ ] **Step 2: Run test — expect fail** (missing breakdown)

Run: `php artisan test --compact tests/Feature/WorkstationHeaderTest.php --filter=test_workstation_includes_analysis`

- [ ] **Step 3: Add breakdown to controller**

```php
'analysis' => [
    'score' => ResumeAnalysis::score($resume),
    'breakdown' => ResumeAnalysis::breakdown($resume),
    'suggestions' => ResumeAnalysis::suggestions($resume),
],
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Commit** backend + test

---

### Task 2: Types + autosave callback + bullet DOM ids

**Files:**
- Modify: `resources/js/types/resume.ts` — add `breakdown` to `ResumeAnalysis`
- Modify: `resources/js/hooks/use-autosave.ts` — optional `onSuccess?: () => void`
- Modify: `resources/js/Components/workstation/inspector-fields.tsx` — `BulletsField` optional `idPrefix?: string`; set `id={`${idPrefix}-${index}`}` on inputs
- Modify: `resources/js/Components/workstation/inspector-sections.tsx` — pass `idPrefix={\`experience-bullet-${index}\`}`

**Interfaces:**
- Produces: `ResumeAnalysis.breakdown: { label: string; score: number }[]`
- Produces: bullet input ids `experience-bullet-{expIndex}-{bulletIndex}`
- Produces: `useAutosave(url, data, delay?, onSuccess?)`

- [ ] **Step 1: Type update**

```ts
export type ResumeAnalysis = {
    score: number;
    breakdown: { label: string; score: number }[];
    suggestions: ResumeSuggestion[];
};
```

- [ ] **Step 2: useAutosave onSuccess**

```ts
export function useAutosave<T extends RequestPayload>(
    url: string,
    data: T,
    delay = 1500,
    onSuccess?: () => void,
): SaveStatus {
    // ...
    onSuccess: () => {
        setStatus('saved');
        onSuccess?.();
    },
}
```

Note: wrap `onSuccess` in a ref if eslint complains about deps, so draft changes don't reset the timer incorrectly. Prefer storing callback in `useRef`.

- [ ] **Step 3: BulletsField idPrefix**

```tsx
// on Input:
id={idPrefix !== undefined ? `${idPrefix}-${index}` : undefined}
```

Experience section: `idPrefix={\`experience-bullet-${index}\`}`

- [ ] **Step 4: Commit**

---

### Task 3: SuggestionList jump + SectionPanel UI

**Files:**
- Modify: `resources/js/Components/resume/suggestion-list.tsx` — optional `onSelect?: (s) => void`; make card clickable
- Modify: `resources/js/Components/workstation/section-panel.tsx` — breakdown bars + SuggestionList + stale caption

**Interfaces:**
- Consumes: `analysis.breakdown`, `analysis.suggestions`, `stale`, `onApply`, `onSelect`
- Produces: UI under score gauge

- [ ] **Step 1: SuggestionList**

```tsx
onSelect?: (suggestion: ResumeSuggestion) => void;
// on card:
onClick={() => onSelect?.(suggestion)}
// Button Insert rewrite: stopPropagation
```

- [ ] **Step 2: SectionPanel props**

```tsx
stale: boolean;
onApplySuggestion: (s: ResumeSuggestion) => void;
onSelectSuggestion: (s: ResumeSuggestion) => void;
```

Breakdown UI (after gauge, before sections list):

```tsx
{analysis.breakdown?.length > 0 && (
  <div className="mt-4 grid grid-cols-2 gap-2">
    {analysis.breakdown.map((band) => (
      <div key={band.label} className="space-y-1">
        <div className="flex justify-between text-[10px] font-semibold text-gray-500 uppercase">
          <span>{band.label}</span>
          <span>{band.score}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-brand" style={{ width: `${(band.score / 25) * 100}%` }} />
        </div>
      </div>
    ))}
  </div>
)}
```

Improvements block:

```tsx
<p className="mt-4 mb-2 px-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
  Improvements
</p>
{stale && (
  <p className="mb-2 text-[10px] text-gray-500">Tips reflect last saved version</p>
)}
<SuggestionList
  suggestions={analysis.suggestions}
  stale={stale}
  onApply={onApplySuggestion}
  onSelect={onSelectSuggestion}
/>
```

- [ ] **Step 3: Commit**

---

### Task 4: Wire Workstation handlers

**Files:**
- Modify: `resources/js/Pages/Resumes/Workstation.tsx`

**Interfaces:**
- Consumes: Task 1–3 APIs
- Produces: apply rewrite, jump focus, stale flag, analysis state

- [ ] **Step 1: Local analysis state**

```tsx
const [liveAnalysis, setLiveAnalysis] = useState(analysis);
useEffect(() => {
    setLiveAnalysis(analysis);
}, [analysis]);
```

- [ ] **Step 2: Autosave success** — rely on prop sync from PUT `back()`; if needed also:

```tsx
const saveStatus = useAutosave(route('resumes.update', id), payload, 1500, () => {
    // Props already include fresh analysis after back(); state sync via effect.
    // Optional belt-and-suspenders:
    // router.reload({ only: ['analysis'], preserveScroll: true, preserveState: true });
});
```

Prefer prop sync first (no double request). Document in code comment.

- [ ] **Step 3: Handlers**

```tsx
const tipsStale = saveStatus === 'dirty' || saveStatus === 'saving';

function applySuggestion(suggestion: ResumeSuggestion) {
    if (suggestion.experience === null || suggestion.bullet === null || !suggestion.rewrite) {
        return;
    }
    const experiences = draft.experiences.map((exp, i) => {
        if (i !== suggestion.experience) return exp;
        const bullets = exp.bullets.map((b, j) =>
            j === suggestion.bullet ? suggestion.rewrite! : b,
        );
        return { ...exp, bullets };
    });
    setDraft({ ...draft, experiences });
}

function selectSuggestion(suggestion: ResumeSuggestion) {
    setTab('Edit');
    if (suggestion.experience !== null && suggestion.bullet !== null) {
        scrollToSection('experience');
        requestAnimationFrame(() => {
            const el = document.getElementById(
                `experience-bullet-${suggestion.experience}-${suggestion.bullet}`,
            );
            el?.focus();
            el?.classList.add('ring-2', 'ring-brand');
            window.setTimeout(() => el?.classList.remove('ring-2', 'ring-brand'), 1500);
        });
        return;
    }
    const msg = suggestion.message.toLowerCase();
    if (msg.includes('skill')) scrollToSection('skills');
    else if (msg.includes('summary')) scrollToSection('summary');
    else if (msg.includes('role') || msg.includes('missing')) scrollToSection('contact');
    else scrollToSection('experience');
}
```

Pass to SectionPanel: `analysis={liveAnalysis}`, `stale={tipsStale}`, handlers.

- [ ] **Step 4: Manual sanity** — open workstation, see breakdown + tips; edit bullet → stale; after save tips refresh.

- [ ] **Step 5: Commit**

---

### Task 5: Verify

- [ ] Run: `php artisan test --compact tests/Feature/WorkstationHeaderTest.php tests/Feature/ResumeAnalysisWeakOpeningsTest.php`
- [ ] Run: `npx tsc --noEmit` if project uses it, or `npm run build` if feasible
- [ ] Pint dirty PHP: `./vendor/bin/pint --dirty --format agent`

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| breakdown in analysis prop | 1 |
| SuggestionList in rail | 3 |
| Insert rewrite via setDraft | 4 |
| Jump to bullet | 2 + 4 |
| Stale while dirty/saving | 4 |
| Refresh after save | 4 (prop sync) |
| Types | 2 |
| Feature test | 1 |
| Non-goals | not implemented |
