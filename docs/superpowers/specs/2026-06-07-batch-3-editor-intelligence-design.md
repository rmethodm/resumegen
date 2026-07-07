# Batch 3 — Editor Intelligence Design Spec

**Date:** 2026-06-07
**Status:** Approved
**Features:** Real-Time Live Score · Resume Labels/Tags · Bullet Quantification Assistant · Career Path Suggestions

---

## Pre-flight: Already Implemented (skip these)
- ~~Full Resume AI Generation~~ ✅ — `ResumeGeneratorController`, `ResumeGenerator` service, `GenerateResumeModal`, `canGenerate` prop — fully shipped
- ~~Completion Progress Bar on Index~~ ✅ — strength progress bar already on `Index.tsx` using `strength` field
- ~~Section Drag-and-Drop~~ ✅ — `section_order` field and drag-and-drop section reordering already in editor

---

## 1. Real-Time Live Score

### Problem
The `StrengthScorePanel` in `Edit.tsx` only loads its score when the user manually opens the panel. After the user saves (every `onBlur` triggers a `router.put`), the score silently becomes stale. Users have no feedback that their edit improved the score.

### Design
- Expose a `refresh()` method from `StrengthScorePanel` via `forwardRef` + `useImperativeHandle`
- In `Edit.tsx`, store a ref: `const strengthPanelRef = useRef<{ refresh: () => void }>(null)`
- After every successful Inertia save (`router.put` `onSuccess`), call `strengthPanelRef.current?.refresh()`
- The panel's `refresh()` silently re-fetches from `GET /builder/{resume}/strength-score` (existing endpoint)
- Additionally, add a **persistent score mini-badge** in the editor top bar:
  - Shows current strength score as `N%` in a small pill
  - Color: `bg-green-100 text-green-700` if ≥ 80; `bg-amber-100 text-amber-700` if 50–79; `bg-red-100 text-red-700` if < 50
  - Fetches on mount, updates after each save
  - Lives in `Edit.tsx` as local state — no separate component needed
- No new backend endpoint

### Save callback change (Edit.tsx)
```tsx
router.put(route('builder.update', resume.id), data, {
    preserveScroll: true,
    onSuccess: () => {
        setPdfSrc(`/builder/${resume.id}/preview?t=${Date.now()}`);
        strengthPanelRef.current?.refresh();
        // score badge state updates inside panel via forwardRef
    },
});
```

### Acceptance Criteria
- Score mini-badge visible in editor toolbar on mount (fetches once)
- After each field save, badge updates automatically (no click required)
- Strength panel (when open) also refreshes after each save
- Badge color matches score ranges above
- One fetch per save (badge + panel share the same fetch)

---

## 2. Resume Labels/Tags

### Problem
Users with multiple resumes (tailored for different roles, industries) have no way to organize them. The list becomes unwieldy beyond 5 resumes with no grouping or filtering.

### Design
- New `resume_tags` table:
  ```sql
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  resume_id BIGINT UNSIGNED NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  label VARCHAR(30) NOT NULL,
  color CHAR(7) NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ```
- Model: `ResumeTag` — `fillable = ['resume_id', 'label', 'color']`, `$timestamps = false`, casts `created_at` datetime
- `Resume` hasMany `ResumeTags`
- Routes (inside `auth` middleware, after `builder.share-url`):
  - `POST /builder/{resume}/tags` → `ResumeTagController@store` (named `builder.tags.store`)
  - `DELETE /builder/{resume}/tags/{tag}` → `ResumeTagController@destroy` (named `builder.tags.destroy`)
- Validation: `label` required, string, max 30; `color` required, regex `/^#[0-9a-fA-F]{6}$/`
- Max 5 tags per resume (validate in controller)
- `ResumeBuilderController::index()` eager-loads: `->with('tags:id,resume_id,label,color')`

### UI: Resume Index Cards
- Tags shown as small colored chips below the resume name (using the tag's `color` as background at 20% opacity, text in the color itself)
- `+ Tag` button (small, below chips) opens inline popover with:
  - Text input for label (max 30 chars)
  - 8 preset color swatches: `#6366f1` (indigo), `#8b5cf6` (violet), `#10b981` (emerald), `#f59e0b` (amber), `#ef4444` (rose), `#0ea5e9` (sky), `#64748b` (slate), `#f97316` (orange)
  - "Add" button → `router.post(route('builder.tags.store', resume.id), { label, color }, { preserveScroll: true })`
- Each tag chip has an `×` button: `router.delete(route('builder.tags.destroy', [resume.id, tag.id]), { preserveScroll: true })`

### TypeScript
```ts
export interface ResumeTag {
    id: number;
    label: string;
    color: string;
}
// ResumeRow gains: tags: ResumeTag[]
```

### Acceptance Criteria
- Tags appear as colored chips on resume index cards
- Add tag via inline popover (no page reload, preserveScroll)
- Delete tag with × button (no page reload)
- Max 5 tags per resume (422 if exceeded)
- Tags cascade-deleted when resume is deleted
- Tags eager-loaded in index query (no N+1)

---

## 3. Bullet Quantification Assistant

### Problem
Users know bullets should have numbers but don't know how. "Quantify your achievements" is the most common resume advice with the least actionable guidance. An AI button that rewrites any bullet with metrics solves this immediately.

### Design
- New endpoint: `POST /builder/{resume}/quantify-bullet`
  - Request: `{ bullet: string }` (required, string, min:10, max:500)
  - Response: `{ suggestions: string[] }` — 3 rewritten bullet variants with numbers/metrics
  - Throttled: `throttle:10,1` (10/min)
  - Usage logged to `ai_usage_logs` with `feature: 'quantify_bullet'`
  - **Gating**: Free users: 10/month via `ai_usage_logs`; Starter+: unlimited
  - `AbuseFilter::check()` applied to `bullet`
  - Uses Anthropic Claude with prompt:
    ```
    Rewrite this resume bullet in exactly 3 ways, each adding specific numbers, percentages, dollar amounts, or measurable metrics. Return only a JSON array of 3 strings, nothing else.
    Bullet: <user_content>{$bullet}</user_content>
    ```
- Controller: `QuantifyBulletController` (single `store` method)
- `UserLimits::canQuantifyBullet(User $user): bool` — true for Starter+, else check monthly count
- `UserLimits::quantifyBulletUsesRemaining(User $user): ?int` — null for Starter+, int for free
- Route: `POST /builder/{resume}/quantify-bullet` → `builder.quantify-bullet`, throttle 10/1

### UI: Edit.tsx (Experience section)
- Each experience entry's bullet textarea gets a small `⚡ Quantify` button (appears as a pill below the textarea)
- Clicking sends request; shows loading spinner in button
- On success: shows a small card below the textarea listing the 3 suggestions, each with a "↩ Use" button
- "↩ Use" replaces the textarea content and dismisses the suggestions card
- On error: brief "Unable to generate suggestions" error message
- `canQuantifyBullet` and `quantifyBulletUsesRemaining` props from Edit page
- Free users with 0 remaining: button shows "0 left · Upgrade" that triggers `triggerUpgradeModal`

### Acceptance Criteria
- "Quantify" button on each experience bullet textarea
- Returns 3 AI-generated quantified variants
- "Use" button inserts suggestion into textarea (triggers save on next blur)
- Rate-limited 10/min
- Free users capped 10/month; 0 remaining shows upgrade prompt
- AbuseFilter blocks prompt injection
- Usage logged to `ai_usage_logs`

---

## 4. Career Path Suggestions

### Problem
Users stare at their resume and don't know what jobs to target next. Competitors like LinkedIn Premium and SkillsFirst offer "roles you might be ready for" — a compelling Pro-tier sticky feature.

### Design
- New endpoint: `GET /builder/{resume}/career-paths` (throttled `throttle:5,1`)
  - No request body — analyses the resume's current data
  - Response: `{ paths: [{ title: string, match_score: number, rationale: string, skills_gap: string[] }] }` — array of 3 next-role suggestions
  - Gated: **Starter+** — free users get 402
  - Uses Claude to analyze resume and suggest 3 career paths
  - Usage logged with `feature: 'career_paths'`
  - Cached in session for 24h to avoid re-running on every panel open (use Laravel cache with key `career_paths_{resume_id}_{updated_at}`)
  - `DELETE /builder/{resume}/career-paths` clears cache
- Controller: `CareerPathController` (`show` + `destroy`)
- `UserLimits::canCareerPaths(User $user): bool` — true for Starter+

### UI: Edit.tsx sidebar
- New collapsible "Career Paths" panel in the right sidebar (below StrengthScorePanel)
- Shows lock icon for free users with upgrade CTA
- For Starter+: "Analyse Career Paths" button → fetches and displays 3 cards:
  - Role title + match score badge (e.g. "87% match")
  - One-line rationale
  - Skills gap chips (up to 3 skills to learn)
- Cached result shown immediately on re-open; "Refresh" button to clear + re-fetch
- `canCareerPaths` prop passed to `Edit.tsx`

### Acceptance Criteria
- Panel locked for free users (upgrade CTA)
- Starter+ users see 3 career path suggestions on fetch
- Results cached (re-opening panel does not re-fetch)
- "Refresh" clears cache and re-fetches
- Throttled 5/min
- `canCareerPaths` prop on Edit.tsx

---

## Testing Strategy

- `RealTimeLiveScoreTest` (Feature): verify `strengthHistoryEnabled` prop on Edit page; test that strength-score endpoint is callable post-save (backend behavior unchanged — UI auto-refresh is client-side only, so no new backend tests needed beyond verifying the endpoint still works)
- `ResumeTagTest` (Feature): store tag, max-5 enforced, delete tag, tags in index response, ownership guard 403, cascade delete, invalid color rejected
- `QuantifyBulletTest` (Feature): 3 suggestions returned (mocked AI), AbuseFilter blocks, short bullet rejected, usage logged, free limit enforced (402), Starter unrestricted
- `CareerPathTest` (Feature): 3 paths returned (mocked AI), free user 402, cached on second call, DELETE clears cache, ownership guard

---

## Out of Scope
- Tag-based filtering/search on Index (Batch 4)
- Quantify for education or skills sections (experience bullets only)
- Career paths for specific target companies
- Resume templates selection during AI generation
