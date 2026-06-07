# Batch 1 — Productivity & Engagement Design Spec

**Date:** 2026-06-07
**Status:** Approved
**Features:** Follow-up Reminders · Resume Versioning · Grammar/Spell Check · Resume Strength Score Panel

---

## 1. Follow-up Reminders

### Problem
Users set a job application to "Applied" but have no mechanism to remind themselves to follow up. The application disappears into the tracker and they miss the optimal 5–7 day follow-up window.

### Design
- New `follow_up_at` date column (`nullable`) on `job_applications`
- Date picker in `Jobs/Edit.tsx` — simple `<input type="date">` below the `applied_at` field
- `Jobs/Index.tsx` shows follow-up date in a new column; overdue dates styled in amber
- Artisan command `app:send-followup-reminders` registered in the scheduler (daily at 8am)
  - Queries `job_applications` where `follow_up_at = today` and user has not yet been reminded
  - Sends queued `FollowUpReminderMail` to the resume owner
- No new tracking column — command is idempotent via `whereDate('follow_up_at', today())`
- Gated: all tiers (free included)

### Data Model
```sql
ALTER TABLE job_applications ADD COLUMN follow_up_at DATE NULL;
```

### Acceptance Criteria
- User can set/clear follow-up date on any job application
- Overdue follow-up date shows amber warning in job tracker index
- Scheduler fires `FollowUpReminderMail` on the correct date
- Mail contains: job company, role, application notes, link to edit the application
- No duplicate emails if scheduler runs twice in a day

---

## 2. Resume Versioning

### Problem
Users tailor a resume to a specific job, then continue editing the "master" — losing the tailored version. No way to say "I sent this exact resume to Company X."

### Design
- `parent_resume_id` nullable FK (self-referential on `resumes`) + `is_snapshot` boolean column
- "Save Version" button in editor sidebar — duplicates current resume state as a snapshot with `parent_resume_id` pointing to origin and `is_snapshot = true`
- Version is named automatically: `"{Resume Name} — {Company} ({date})"` where company defaults to today's date if not provided
- Version list panel in editor (collapsible, below save area): shows all snapshots for this resume, click to open in new tab (read-only view)
- Snapshot pages are not editable in the full editor — they open in a read-only variant with a "Restore as Copy" button that duplicates the snapshot as a new full resume
- Job application `resume_id` can point to any snapshot — no changes to job application model needed
- Snapshots do NOT count toward the free tier resume limit (`UserLimits::resumeLimit` excludes `is_snapshot = true`)
- Gated: all tiers

### Data Model
```sql
ALTER TABLE resumes ADD COLUMN parent_resume_id BIGINT UNSIGNED NULL REFERENCES resumes(id) ON DELETE SET NULL;
ALTER TABLE resumes ADD COLUMN is_snapshot BOOLEAN NOT NULL DEFAULT FALSE;
```

### Acceptance Criteria
- "Save Version" creates a snapshot linked to origin resume
- Snapshots are excluded from resume count (free tier unaffected)
- Version list shows all snapshots with date and name
- Clicking a snapshot opens read-only view
- "Restore as Copy" on read-only view creates a new editable resume
- Deleting origin resume sets `parent_resume_id` to NULL on snapshots (cascade SET NULL)

---

## 3. Grammar & Spell Check (Typo.js)

### Problem
Users write resume content directly in textareas — typos go undetected until a recruiter notices. No proofreading feedback in the editor.

### Design
- `npm install typo-js` — offline dictionary-based, no API cost, works client-side
- Custom `useSpellCheck(text: string): string[]` hook: loads `en_US` dictionary once (lazy, on first use), returns array of misspelled words
- Applied to: Summary textarea, Experience bullet textareas
- UI pattern: small pill badge below each field — "2 misspelled words" — clicking expands a list of the words
- Badge is amber for 1–3 errors, red for 4+, hidden when clean
- Dictionary load is async; hook returns empty array until loaded (no flash)
- User can right-click a word to see nothing (we don't override browser context menu — browser's own spellcheck is separate and remains enabled)
- Gated: all tiers

### Implementation Notes
- `Typo` constructor: `new Typo('en_US', false, false, { dictionaryPath: '/dictionaries' })`
- Dictionary files (`en_US.aff`, `en_US.dic`) placed in `public/dictionaries/` (served statically)
- Hook memoizes the Typo instance in a module-level variable (not re-created per component)

### Acceptance Criteria
- Summary field shows misspelled word count badge
- Experience bullets show misspelled word count per entry
- Badge disappears when all words are correctly spelled
- Dictionary loads once and is reused across all fields
- No performance regression on fast typing (debounce 300ms before checking)

---

## 4. Resume Strength Score Panel

### Problem
The dashboard shows a single percentage — useful but opaque. Users don't know what to fix. The "one tip" approach leaves most improvement opportunities invisible.

### Design

#### Backend
- `ResumeStrengthScorer::score()` extended: returns `score`, `tip` (unchanged), and new `checklist` array:
  ```php
  [
    ['label' => 'Professional summary', 'pts' => 15, 'passed' => true],
    ['label' => 'Contact info complete', 'pts' => 15, 'passed' => false],
    ...
  ]
  ```
- New `resume_strength_snapshots` table:
  ```sql
  CREATE TABLE resume_strength_snapshots (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    resume_id BIGINT UNSIGNED NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    checklist JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```
  No `updated_at` — append-only.
- New `StrengthScoreController`:
  - `GET /builder/{resume}/strength-score` — scores the resume, saves snapshot if score changed by ≥ 5 points from last snapshot (or no prior snapshot), returns `{ score, checklist, history }`
  - `history` is an array of `{ score, created_at }` — last 30 snapshots (Starter+ only; null for free)
- Throttled: `10,1` (10 req/min)

#### Frontend
- Collapsible "Strength Score" panel in editor sidebar (same pattern as ATS panel)
- Panel shows:
  - Circular or bar score indicator (color-coded: red ≤40, amber ≤70, green >70)
  - Full checklist with ✓/✗ per item and point value
  - "How to improve" — top 3 failed items highlighted
  - History sparkline (Starter+ only): tiny line chart using recharts `<LineChart>` (already in bundle via ATS panel if used, otherwise lightweight sparkline via `react-sparklines`)
- Free users see current score + full checklist; history section shows "Upgrade to Starter to track score history"
- Prop `strengthHistoryEnabled: boolean` passed from `ResumeBuilderController::edit()`

### Acceptance Criteria
- Full checklist visible with pass/fail per item
- Score saved as snapshot on each panel open (deduped by ±5 pts)
- History graph visible for Starter+ users
- Free users see upgrade prompt for history only (score itself is free)
- Panel opens/closes cleanly, no stale data

---

## Testing Strategy

- `FollowUpReminderTest` (Feature): sets follow_up_at, runs command, asserts mail queued
- `ResumeVersioningTest` (Feature): save version creates snapshot, count excludes snapshots, read-only view loads
- `SpellCheckTest` — not tested server-side (pure client JS); TypeScript build coverage only
- `StrengthScorePanelTest` (Feature): endpoint returns checklist, snapshot saved, history gated to Starter+
- Existing 376 tests must remain green

---

## Out of Scope
- Real-time spell-as-you-type underlines (requires contenteditable; textareas don't support inline markup)
- AI-powered grammar suggestions (future batch)
- Version diff/compare view (Batch 4 — Resume Comparison)
- Multi-language dictionaries (Batch 7)
