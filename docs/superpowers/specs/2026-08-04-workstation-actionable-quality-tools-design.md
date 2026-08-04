# Workstation actionable quality tools (v1)

**Date:** 2026-08-04  
**Status:** Approved for implementation planning  
**Scope:** Wire existing `ResumeAnalysis` into the Workstation left rail so score is explainable and suggestions are actionable. No new scoring rules, no JD match, no AI.

---

## Problem

The server already computes a strength score, a four-band breakdown, and up to six deterministic bullet/gap suggestions. The Workstation only shows the single score number in the left rail. Compare already visualizes the breakdown. A `SuggestionList` component (with “Insert rewrite”) already exists but is never mounted. Users get a number without a path to improve it.

## Goals

1. Explain the score (four bands) next to the dial.
2. Surface suggestions where people edit (left rail).
3. Let users jump to the implicated bullet and apply a safe rewrite with undo.
4. Keep analysis honest: refresh from the saved document after autosave succeeds.

## Non-goals (v1)

- Live re-score while typing (client-side scorer or debounced mid-edit analysis).
- Job-description keyword match / tailor mode.
- New analysis rules, categories, or score weights.
- Score history charts.
- Notes canvas, snapshots, live PDF preview (other robustness clusters).
- Any AI / LLM dependency.

## Current building blocks

| Piece | Location | Today |
|-------|----------|--------|
| Score + suggestions | `ResumeController::render` → `analysis` | Passed; score only used in UI |
| Breakdown | `ResumeAnalysis::breakdown()` | Used on Compare only |
| List UI | `resources/js/Components/resume/suggestion-list.tsx` | Unmounted |
| Types | `ResumeAnalysis` / `ResumeSuggestion` in `resources/js/types/resume.ts` | Missing `breakdown` |
| Autosave | `useAutosave` | `PUT` with `preserveState: true` — does not merge new props into draft |

## Product design

### Placement

Left rail (`SectionPanel`), under the score gauge and **above** the “Resume sections” list:

1. Score gauge (existing)
2. Score breakdown (new)
3. Improvements / suggestions (`SuggestionList`)
4. Section list + disabled “+ Add section” (existing)

No new header tab or mobile bottom sheet in v1. Mobile keeps the same vertical stack above the form.

### Score breakdown

**Data shape** (same as Compare):

```ts
breakdown: { label: string; score: number }[]
// Labels: Profile, Experience, Impact, Keywords — each score 0–25
```

**UI:** Compact bars under the gauge (Compare’s pattern, denser for a 260px rail). Labels + fill width = `score / 25`. No formula tooltips in v1.

**Server:** Include `breakdown` in the workstation `analysis` prop:

```php
'analysis' => [
    'score' => ResumeAnalysis::score($resume),
    'breakdown' => ResumeAnalysis::breakdown($resume),
    'suggestions' => ResumeAnalysis::suggestions($resume),
],
```

### Suggestions list

Use existing `SuggestionList`:

- Category chip when present
- Message text
- Optional rewrite + “Insert rewrite”
- Verb hints when rewrite is null
- Empty state copy already in the component

**Stale state:**

- `stale={true}` while autosave status is `dirty` or `saving`
- Optional one-line caption under the list while stale: “Tips reflect last saved version”
- `stale={false}` after a successful analysis refresh following save

### Jump-to field

| Suggestion | Behavior on card click (message area) |
|------------|----------------------------------------|
| `experience` + `bullet` non-null | Switch to Edit tab if needed; scroll to Experience section; focus bullet textarea at those indices; brief highlight (CSS pulse / ring, ~1.5s) |
| Indices null (gap / whole-resume) | Scroll to a best-effort section: prefer Experience for impact gaps, Skills for skill gaps, Contact for profile gaps when message implies them; otherwise Experience |

Indexing is **array position** in the document as analyzed (same order as `ResumeDocument` / draft `experiences`). After reorders, apply/jump remain correct only after analysis refresh — acceptable for v1.

### Insert rewrite

- Enabled when `suggestion.rewrite` is a non-empty string and list is not stale (component already disables on stale).
- Handler replaces `draft.experiences[experience].bullets[bullet]` with `rewrite` via the same `setDraft` path used by the form (so `useHistory` records the step; undo/redo work).
- Autosave runs as today after draft change.
- No separate dismiss control; fixed items drop off after the next analysis refresh.

### Analysis refresh after autosave

**Requirement:** After a successful save, score, breakdown, and suggestions must match the saved resume without a full page navigation or clobbering local draft state.

**Mechanism:**

1. Extend `useAutosave` with an optional `onSuccess` callback (or return a richer API) invoked in the existing `onSuccess` of `router.put`.
2. Workstation calls:

   ```ts
   router.reload({
     only: ['analysis'],
     preserveScroll: true,
     preserveState: true,
   })
   ```

3. Keep local `analysis` in React state (or read from page props that Inertia merges for `only` keys). Prefer:

   - `const { analysis } = usePage().props` if Inertia merges `only` into props under `preserveState`, **or**
   - Lift analysis into `useState` seeded from props and update when reload completes (`onSuccess` of reload).

   Implementation must verify Inertia v2/v3 merge behavior for `only` + `preserveState` in this app and pick the pattern that updates the rail without resetting draft/history.

4. Do **not** re-read the full `resume` document into the editor on save (current autosave invariant stays).

**Failure:** If reload fails, leave previous analysis visible and keep a non-blocking error affordance optional; do not block editing. Autosave `error` status already covers failed PUTs.

No dedicated `GET /resumes/{id}/analysis` route in v1 unless partial reload proves insufficient.

## Data / type updates

```ts
export type ResumeAnalysis = {
    score: number;
    breakdown: { label: string; score: number }[];
    suggestions: ResumeSuggestion[];
};
```

`ResumeSuggestion` unchanged.

## Files expected to change (implementation plan will refine)

| File | Change |
|------|--------|
| `app/Http/Controllers/ResumeController.php` | Add `breakdown` to `analysis` |
| `resources/js/types/resume.ts` | Add `breakdown` to `ResumeAnalysis` |
| `resources/js/Components/workstation/section-panel.tsx` | Render breakdown + `SuggestionList`; wire callbacks |
| `resources/js/Pages/Resumes/Workstation.tsx` | Apply rewrite; jump-to; autosave success → reload analysis |
| `resources/js/hooks/use-autosave.ts` | Optional `onSuccess` / `onError` callbacks |
| `resources/js/Components/resume/suggestion-list.tsx` | Possibly clickable card for jump (if not parent-wrapped) |
| Tests | Workstation analysis props; apply/jump covered if practical |

No migration. No new packages.

## Testing

1. **Feature:** Authenticated workstation response includes `analysis.score`, `analysis.breakdown` with four expected labels, and `analysis.suggestions` as an array of the known shape.
2. **Feature (optional):** After `PUT` update that improves content, a subsequent workstation/show of analysis reflects new score — via reload path if tested through HTTP only.
3. **Existing** `ResumeAnalysis` unit/feature tests remain green; no rule changes.
4. Browser/Dusk not required for v1 if feature tests cover the prop contract; manual check for jump/highlight.

## Success criteria

- [ ] Left rail shows four-band breakdown under the score gauge.
- [ ] Suggestions list is visible (or empty-state copy) without opening Compare.
- [ ] Insert rewrite updates the bullet, is undoable, and autosaves.
- [ ] Jump focuses the right bullet when indices exist.
- [ ] After successful autosave, analysis props refresh without wiping draft state.
- [ ] No JD tooling, no AI, no client-side scorer.

## Follow-ups (explicitly later)

- Live re-score while typing.
- Deterministic JD keyword panel.
- Band formula tooltips / educational copy.
- Dismissed-suggestion preferences.

## Risks

| Risk | Mitigation |
|------|------------|
| `preserveState` + `only` does not update analysis in props | Hold analysis in local state; set from reload `onSuccess` page props |
| Experience/bullet indices drift after reorder before save | Stale UI until save+refresh; document as v1 |
| Rail height grows on small screens | Keep breakdown compact; list scrolls with rail |
| Double network (PUT then reload) | Acceptable; debounce already 1.5s; no second PUT |

---

## Approval

- Product direction: Cluster B, MVP wire-up only.
- Refresh strategy: analysis reload after successful autosave.
- Spec written for implementation planning next.
