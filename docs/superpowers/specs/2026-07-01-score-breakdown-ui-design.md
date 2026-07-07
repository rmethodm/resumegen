# Score Breakdown UI — Design Spec

Date: 2026-07-01
Status: Approved for planning

## Problem

The resume strength score (`ResumeStrengthScorer.php`) is currently a single 0-100 number backed by a flat 10-item checklist. Competitive research (resumax.ai) showed a category-based score breakdown (their categories: Impact, Action Verbs, Language, Structure, Brevity, Contact) is a differentiator users respond to. Resumax's exact categories don't map to what Resumegen's scorer currently measures — some of what they check (language quality, brevity) isn't checked here at all.

## Goals

- Group the existing scoring signals into named categories instead of one flat checklist.
- Add two new lightweight signals (action-verb usage, brevity) to fill out categories that would otherwise be too thin, and fold them into the overall score.
- Keep detection logic rule-based (no AI call) — fast, free, no quota consumption.

## Non-goals

- Matching resumax's exact category names/count.
- AI-generated writing suggestions beyond what already exists (rewrite-bullet/summary AI actions are unchanged).
- Changing the underlying resume data model.

## New signals

Added to `ResumeStrengthScorer.php`:

- **Action-verb check**: passes if ≥70% of experience bullets start with a strong action verb from a curated list (e.g. Led, Built, Reduced, Increased, Designed, Implemented, Managed) rather than weak openers ("Responsible for", "Helped with", "Worked on", "Assisted with"). Pure string/regex matching against a static word list — no AI call.
- **Brevity check**: passes if the professional summary is 15-40 words and no single bullet exceeds ~30 words.

## Category structure

12 signals (10 existing + 2 new) grouped into 5 categories, weights summing to 100:

| Category | Pts | Signals |
|---|---|---|
| Contact & Structure | 15 | Contact info complete (10), LinkedIn URL (5) |
| Summary & Brevity | 15 | Professional summary present (10), brevity check *(new)* (5) |
| Experience Depth | 25 | 1+ experience (15), 2+ experiences (5), 3+ bullets on one job (5) |
| Impact & Action Verbs | 25 | Quantified bullet — contains a number (15), action-verb check *(new)* (10) |
| Skills & Credentials | 20 | 3+ skills listed (10), education present (5), certs/custom section (5) |

Point weights are a judgment call based on relative importance of each signal to resume quality; not derived from any external benchmark. Category and signal labels are user-facing copy, shown in the UI.

## API response shape

`GET /builder/{resume}/strength-score` changes from a flat `checklist` array to nested `categories`:

```json
{
  "score": 68,
  "tip": "Add a professional summary",
  "tipKey": "summary",
  "categories": [
    {
      "key": "contact_structure",
      "label": "Contact & Structure",
      "earned": 10,
      "max": 15,
      "checklist": [
        { "label": "Contact info complete", "pts": 10, "passed": true },
        { "label": "LinkedIn URL", "pts": 5, "passed": false }
      ]
    }
  ]
}
```

This is a breaking response-shape change (the flat `checklist` key is removed). Acceptable because `StrengthScorePanel.tsx` is the only consumer and is updated in the same change.

`tip`/`tipKey` logic is unchanged: still identifies the single highest-point unmet criterion across all categories, used to drive the existing "next-step nudge" + AI-assist button.

## Frontend

`StrengthScorePanel.tsx`:
- Top-line % score and progress bar: unchanged.
- Flat 10-item checklist: removed.
- New: 5 collapsible category rows, each showing a label, a mini progress bar (`earned`/`max`), and expanding to reveal its own signal checklist (same pass/fail row style as today, just scoped to the category).
- "Next-step nudge" box and AI-assist button: unchanged, still keyed off `tipKey`.

## Testing

- `tests/Unit/ResumeStrengthScorerTest.php`: update existing point-value expectations (weights changed for several signals), add tests for the 2 new signals (action-verb detection with various bullet phrasing, brevity with various summary/bullet lengths), add tests asserting correct category grouping and per-category point totals.
- `tests/Feature/StrengthScorePanelTest.php`: update response-shape assertions from flat `checklist` to nested `categories`; keep existing `tip`/`tipKey` priority and authorization test cases.

## Rollout

No external dependencies (no new env vars, no Stripe/AI config). Pure code change — scorer logic, controller response shape, and frontend component update together in one PR.
