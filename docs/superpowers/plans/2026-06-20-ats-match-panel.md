# ATS Match Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the sidebar into a rule-based "Resume Checklist" panel and a new AI-powered "ATS Match" panel, moving the JD textarea out of the Skills section.

**Architecture:** Rename the existing label in `StrengthScorePanel.tsx`, create a presentational `AtsMatchPanel.tsx` that receives all state as props, then wire it into `Edit.tsx`'s sidebar while removing the JD block from the Skills section. No backend changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS v3, Inertia.js v2

## Global Constraints

- No new dependencies
- No backend changes — `target_job_description` save path is unchanged
- Follow existing sidebar component style (plain HTML elements, `text-xs`, `border-gray-100`, collapse toggle pattern matching `StrengthScorePanel`)
- Run `vendor/bin/pint --dirty --format agent` after any PHP change (none expected here)
- Run tests with `php artisan test --compact`

---

### Task 1: Rename "Strength Score" → "Resume Checklist"

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Partials/StrengthScorePanel.tsx:93`

**Interfaces:**
- Produces: same `StrengthPanelHandle` and `Props` — no signature changes

- [ ] **Step 1: Apply the label rename**

In `StrengthScorePanel.tsx`, find line 93 and change the label text:

```tsx
// Before
<span>
    Strength Score
    {score !== null && (
        <span className={`ml-1 ${color}`}>{score}%</span>
    )}
</span>

// After
<span>
    Resume Checklist
    {score !== null && (
        <span className={`ml-1 ${color}`}>{score}%</span>
    )}
</span>
```

- [ ] **Step 2: Run existing tests to confirm nothing broke**

```bash
php artisan test --compact tests/Feature/AiSuggestionTest.php
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Partials/StrengthScorePanel.tsx
git commit -m "ux: rename Strength Score panel to Resume Checklist"
```

---

### Task 2: Create AtsMatchPanel component

**Files:**
- Create: `resources/js/Pages/ResumeBuilder/Partials/AtsMatchPanel.tsx`

**Interfaces:**
- Consumes: nothing from prior tasks (standalone component)
- Produces:
  ```tsx
  export default function AtsMatchPanel(props: AtsMatchPanelProps): JSX.Element
  interface AtsMatchPanelProps {
      jobDescription: string;
      onJobDescriptionChange: (jd: string) => void;
      onJobDescriptionBlur: () => void;
      keywordGaps: string[];
      canAiTailoring: boolean;
      onUpgrade: () => void;
      aiButton: React.ReactNode;
  }
  ```

- [ ] **Step 1: Create the component file**

Create `resources/js/Pages/ResumeBuilder/Partials/AtsMatchPanel.tsx`:

```tsx
import { useState } from 'react';

interface AtsMatchPanelProps {
    jobDescription: string;
    onJobDescriptionChange: (jd: string) => void;
    onJobDescriptionBlur: () => void;
    keywordGaps: string[];
    canAiTailoring: boolean;
    onUpgrade: () => void;
    aiButton: React.ReactNode;
}

export default function AtsMatchPanel({
    jobDescription,
    onJobDescriptionChange,
    onJobDescriptionBlur,
    keywordGaps,
    aiButton,
}: AtsMatchPanelProps) {
    const [open, setOpen] = useState(true);

    return (
        <div className="border-t border-gray-100 pt-3">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 hover:text-gray-700"
            >
                <span className="flex items-center gap-1.5">
                    ATS Match
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-indigo-500">✨ AI</span>
                </span>
                <span>{open ? '−' : '+'}</span>
            </button>

            {open && (
                <div className="mt-3 space-y-2">
                    <textarea
                        value={jobDescription}
                        onChange={e => onJobDescriptionChange(e.target.value)}
                        onBlur={onJobDescriptionBlur}
                        placeholder="Paste a job description — AI will find keywords missing from your resume."
                        rows={4}
                        className="w-full rounded-md border border-gray-200 px-2.5 py-2 text-xs text-gray-700 placeholder-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                    />
                    {aiButton}
                    {keywordGaps.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {keywordGaps.map(k => (
                                <span key={k} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{k}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Partials/AtsMatchPanel.tsx
git commit -m "feat: add AtsMatchPanel sidebar component"
```

---

### Task 3: Wire AtsMatchPanel into Edit.tsx; remove JD from Skills

**Files:**
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx`

**Interfaces:**
- Consumes:
  - `AtsMatchPanel` from `./Partials/AtsMatchPanel`
  - Existing state in Edit.tsx: `targetJobDescription`, `setTargetJobDescription`, `keywordGaps`, `save`, `canAiTailoring`, `renderAiButton`, `handleKeywordGaps`, `triggerUpgradeModal`

- [ ] **Step 1: Add import at the top of Edit.tsx**

Find the existing import block near the top (around line 2, near the `StrengthScorePanel` import):

```tsx
// Before
import StrengthScorePanel, { type StrengthPanelHandle } from './Partials/StrengthScorePanel';

// After
import StrengthScorePanel, { type StrengthPanelHandle } from './Partials/StrengthScorePanel';
import AtsMatchPanel from './Partials/AtsMatchPanel';
```

- [ ] **Step 2: Add AtsMatchPanel into the sidebar**

Find this line in Edit.tsx (around line 870):

```tsx
{sidebarOpen && <StrengthScorePanel ref={strengthPanelRef} resumeId={resume.id} strengthHistoryEnabled={strengthHistoryEnabled} aiRemaining={ai.remaining} onGenerateSummary={handleGenerateSummary} />}
```

Replace with:

```tsx
{sidebarOpen && <StrengthScorePanel ref={strengthPanelRef} resumeId={resume.id} strengthHistoryEnabled={strengthHistoryEnabled} aiRemaining={ai.remaining} onGenerateSummary={handleGenerateSummary} />}
{sidebarOpen && (
    <AtsMatchPanel
        jobDescription={targetJobDescription}
        onJobDescriptionChange={setTargetJobDescription}
        onJobDescriptionBlur={save}
        keywordGaps={keywordGaps}
        canAiTailoring={canAiTailoring}
        onUpgrade={() => triggerUpgradeModal('ai_tailoring', 'starter')}
        aiButton={
            canAiTailoring
                ? renderAiButton({ idle: targetJobDescription.trim() ? '✨ Find gaps vs. this job' : '✨ Find ATS keyword gaps', onRun: handleKeywordGaps })
                : <button type="button" onClick={() => triggerUpgradeModal('ai_tailoring', 'starter')} className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors">🔒 Tailor to this job (Starter)</button>
        }
    />
)}
```

- [ ] **Step 3: Remove the JD block from the Skills section**

In the Skills section (around line 1003), find and remove these lines — they sit at the top of the Skills `DraggableSection`, before the layout picker cards:

```tsx
// REMOVE this entire block:
<div className="pb-1 space-y-1.5">
    <FLabel>Target Job Description <span className="text-[#94a3b8] font-normal">(optional — paste a posting to tailor keyword gaps)</span></FLabel>
    <FTextarea
        value={targetJobDescription}
        onChange={setTargetJobDescription}
        onBlur={save}
        placeholder="Paste the job description you're targeting. AI will find which keywords from it are missing from your resume."
        rows={4}
    />
    {canAiTailoring
        ? renderAiButton({ idle: targetJobDescription.trim() ? '✨ Find gaps vs. this job' : '✨ Find ATS keyword gaps', onRun: handleKeywordGaps })
        : <button type="button" onClick={() => triggerUpgradeModal('ai_tailoring', 'starter')} className="w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-1.5 text-center text-xs font-medium text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors">🔒 Tailor to this job (Starter)</button>}
    {keywordGaps.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
            {keywordGaps.map(k => (
                <span key={k} className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{k}</span>
            ))}
        </div>
    )}
</div>
```

The Skills `DraggableSection` body should now open directly with the layout picker cards (`<div className="grid grid-cols-3 gap-2 pb-1">`).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run full ATS test to confirm backend wiring unchanged**

```bash
php artisan test --compact tests/Feature/AiSuggestionTest.php
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/ResumeBuilder/Edit.tsx
git commit -m "feat: move ATS keyword gap tool to sidebar ATS Match panel"
```
