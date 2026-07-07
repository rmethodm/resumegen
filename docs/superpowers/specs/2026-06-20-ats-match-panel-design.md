# ATS Match Panel — Split Sidebar Design

**Date:** 2026-06-20

## Problem

The sidebar's "Strength Score" panel is entirely rule-based PHP (`ResumeStrengthScorer`) — no AI involved. However, users see it next to AI buttons and assume the checklist is AI-generated analysis. Meanwhile, the actual AI-powered JD keyword gap tool is buried in the Skills section of the editor, where it is easy to miss and out of context.

## Solution

Split the sidebar into two clearly-labelled panels:

1. **Resume Checklist** (renamed from "Strength Score") — instant, rule-based, free
2. **ATS Match** (new panel) — AI-powered, costs a credit, requires a pasted JD

The JD textarea and keyword gap results move from the Skills section entirely into the sidebar.

## Architecture

### Panel 1 — Resume Checklist (`StrengthScorePanel.tsx`)

- Rename the collapsible header label from `Strength Score` → `Resume Checklist`
- No logic changes — same rule-based scorer, same score bar, same checklist items, same history sparkline
- The rename alone signals "completeness checklist" rather than intelligent analysis

### Panel 2 — ATS Match (`Partials/AtsMatchPanel.tsx`, new file)

A new collapsible sidebar panel rendered directly below `StrengthScorePanel` in `Edit.tsx`.

**Props:**
```tsx
interface AtsMatchPanelProps {
    jobDescription: string;
    onJobDescriptionChange: (jd: string) => void;
    onJobDescriptionBlur: () => void;          // triggers save
    keywordGaps: string[];
    canAiTailoring: boolean;
    onUpgrade: () => void;
    aiButton: React.ReactNode;                 // pre-rendered in Edit.tsx
}
```

**State:** collapsible `open` (default open) — no other local state; all data is props.

**Layout:**
- Header: `ATS MATCH` label + small `✨ AI` badge (right-aligned) + collapse toggle
- Body: JD textarea (4 rows, onBlur saves) + the AI button (or upgrade CTA) + keyword gap chips

### `Edit.tsx` changes

1. Render `<AtsMatchPanel>` in the sidebar, below `<StrengthScorePanel>`, passing:
   - `jobDescription={targetJobDescription}`
   - `onJobDescriptionChange={setTargetJobDescription}`
   - `onJobDescriptionBlur={save}`
   - `keywordGaps={keywordGaps}`
   - `canAiTailoring={canAiTailoring}`
   - `onUpgrade={() => triggerUpgradeModal('ai_tailoring', 'starter')}`
   - `aiButton={canAiTailoring ? renderAiButton({...}) : <upgrade button>}`
2. Remove the entire "Target Job Description" block from the Skills section (lines ~1003–1023)
3. No state or logic moves — `targetJobDescription`, `keywordGaps`, `handleKeywordGaps` stay in `Edit.tsx`

## Files

| File | Change |
|------|--------|
| `resources/js/Pages/ResumeBuilder/Partials/StrengthScorePanel.tsx` | Rename label only |
| `resources/js/Pages/ResumeBuilder/Partials/AtsMatchPanel.tsx` | New file (~60 lines) |
| `resources/js/Pages/ResumeBuilder/Edit.tsx` | Wire panel into sidebar; remove JD block from Skills |

## Non-Goals

- No backend changes
- No changes to `ResumeStrengthScorer.php`
- No changes to the ATS keywords controller or prompt
- No changes to how `target_job_description` is saved (already in save payload via `targetJobDescriptionRef`)

## Testing

- Existing `AiSuggestionTest.php` ATS keyword gap test should still pass (no backend change)
- Manual check: JD textarea no longer appears in Skills section; keyword gaps appear in sidebar
- Manual check: "Resume Checklist" label renders correctly; score/checklist unchanged
