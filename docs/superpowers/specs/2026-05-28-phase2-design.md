# Phase 2 Design Spec — Templates, Productivity, UX

**Date:** 2026-05-28  
**Scope:** Three independent subsystems implemented in sequence after the Quick Wins batch.  
**Billing:** All features ship ungated. Stripe/tiers designed separately in a future phase.

---

## Subsystem 1 — Templates & Visual Polish

### New Layouts (4 additional templates)

The existing 4 templates (`classic`, `modern`, `minimal`, `minimal-ruled`) remain unchanged. Four new templates are added, bringing the total to 8.

| Template key | Name | Description |
|---|---|---|
| `sidebar` | Sidebar | Colored left column (35%) with contact/skills; experience/education on right |
| `creative` | Creative | Large bold name, accent color header band, contemporary feel |
| `executive` | Executive | Formal, serif-heavy, wide margins, traditional layout |
| `ats` | ATS-Safe | No frills, single column, plain text, maximum parsability |

**Sidebar layout specifics:**
- Left column (35%): accent color background, name + title at top, contact info, skills list
- Right column (65%): summary, experience entries, education, certifications
- Left column text is white on the accent color
- Photo placeholder slot at top of left column (shown as a circle placeholder; no actual upload in this phase)

**Creative layout specifics:**
- Full-width header band in accent color, white text, large name (24–28pt), subtitle below
- Single column body below the band
- Section headings use accent color

**Executive layout specifics:**
- DejaVu Serif as default font
- Centered name/contact header with horizontal rules
- Wide top/bottom margins (1in), tighter side margins
- All-caps small-caps section headings with double rule

**ATS-Safe layout specifics:**
- DejaVu Sans only, no color, no decorative elements
- Plain section headings (bold text, no borders/rules)
- Contact info on one line separated by `|`
- No columns, no sidebar

### Accent Color System

**Where it applies:** `sidebar`, `creative`, `classic`, `modern`, `minimal-ruled` templates. `executive` and `ats` ignore accent color (they have fixed styling).

**8 preset swatches (stored as hex):**

| Name | Hex |
|---|---|
| Indigo | `#4f46e5` |
| Navy | `#1e3a5f` |
| Slate | `#475569` |
| Forest | `#166534` |
| Burgundy | `#7f1d1d` |
| Charcoal | `#1f2937` |
| Teal | `#0f766e` |
| Warm Gray | `#78716c` |

**Data model:** Add `accent_color` (nullable string, max 7 chars) column to `resumes` table via migration. Default: `#4f46e5` (Indigo). Validated as one of the 8 allowed hex values on the backend.

**UI:** A row of 8 color swatches in the editor header (next to the template selector). Clicking a swatch saves immediately. Hidden when the selected template is `executive` or `ats`.

**PDF:** The accent color is passed to the Blade PDF view and applied inline via PHP variables (same pattern as font sizes).

### Font Family System

**3 options (all DomPDF-native, zero PDF mismatch):**

| Key | Display name | CSS family |
|---|---|---|
| `sans` | Sans-serif | `DejaVu Sans, sans-serif` |
| `serif` | Serif | `DejaVu Serif, serif` |
| `mono` | Monospace | `DejaVu Sans Mono, monospace` |

**Data model:** Add `font_family` (nullable string, default `sans`) column to `resumes` table via migration.

**UI:** A small 3-button toggle in the editor header (Sans / Serif / Mono). Saves on click. `executive` template defaults to `serif` but user can still override.

**Live preview + PDF:** Both use the selected font family. Passed to Blade PDF view alongside font sizes.

---

## Subsystem 2 — Productivity Features

### ATS Keyword Scoring

**Mechanism:** Built-in keyword database — no job description needed. Score is computed server-side from a curated list of high-value resume keywords organized by category (action verbs, technical skills, soft skills, format signals). The algorithm checks the resume's summary, experience bullets, and skills against this list.

**Score formula:**
- 0–100 integer
- Weighted: action verbs (30%), technical/domain keywords (40%), soft skills (15%), format signals (15% — has summary, has bullets, has dates, has quantified achievements)

**API:** `GET /builder/{resume}/ats-score` → `AtsScoreController@show` — returns `{ score: 74, missing: [...], found: [...] }`. Throttled (10 req/min per user, same as AI suggest). Score is computed fresh each call (not cached — resume content changes frequently). Route sits inside the `auth` middleware group alongside the other builder routes.

**UI:**
- **Header badge:** Small pill next to the Save indicator showing `74 ATS` with a color band (red <50, amber 50–74, green ≥75). Updates after each save (fires the GET after `onFinish` of any save).
- **Sidebar panel:** Collapsible "ATS Score" section (collapsed by default) showing the score, a breakdown by category, and a list of up to 10 suggested missing keywords. Each missing keyword has a one-click "Add to Skills" button.

**Keyword database:** Stored as a PHP array in `app/Data/AtsKeywords.php` — not a database table. Categories: `action_verbs`, `technical`, `soft_skills`, `format_signals`. Approx 200–300 keywords total across all categories.

### Cover Letter Builder

**Scope:** Template library only — no AI generation in this phase.

**Data model:** New `cover_letters` table:
- `id`, `user_id` (FK), `resume_id` (nullable FK — links to a resume for context), `name` (string), `template_key` (string), `body` (text — the letter content), `timestamps`

**Templates:** 5 cover letter templates stored as PHP constants in `app/Data/CoverLetterTemplates.php`. Each is a text string with `{{placeholders}}` for name, company, role, date. Templates:
1. `standard` — Professional standard format
2. `modern` — Shorter, punchy, 3-paragraph
3. `career_change` — Addresses switching industries
4. `new_grad` — For students/recent grads
5. `referral` — Opens with the referral name

**UI flow:**
- New nav item: "Cover Letters" in the authenticated layout sidebar/nav
- List page at `/cover-letters` — same card-list pattern as `/builder`
- Create: pick a template from a visual grid, give it a name → opens editor
- Editor: simple `<textarea>` with the template pre-filled, resume selector dropdown to link it, save on blur
- No live preview — cover letters are plain text

**Routes:**
```
GET    /cover-letters              cover-letters.index
POST   /cover-letters              cover-letters.store
GET    /cover-letters/{letter}     cover-letters.edit
PUT    /cover-letters/{letter}     cover-letters.update
DELETE /cover-letters/{letter}     cover-letters.destroy
```

**Authorization:** `CoverLetterPolicy` — same pattern as `ResumePolicy` (user owns the letter).

### Job Application Tracker

**Data model:** New `job_applications` table:
- `id`, `user_id` (FK), `resume_id` (nullable FK), `company` (string), `role` (string), `status` (enum: `saved`, `applied`, `interviewing`, `offered`, `rejected`, `closed`), `applied_at` (nullable date), `notes` (nullable text), `job_url` (nullable string), `timestamps`

**UI:** Separate page at `/jobs`

**List view** (`/jobs`):
- Kanban-style columns by status OR a simple sortable table (table is simpler to build — go with table)
- Columns: Company, Role, Status (colored badge), Resume Used, Date Applied, Notes (truncated), Actions (Edit/Delete)
- "New Application" button opens an inline form or modal

**Create/edit form fields:** Company, Role, Status (dropdown), Resume (dropdown of user's resumes), Date Applied, Job URL, Notes

**Routes:**
```
GET    /jobs                   jobs.index
POST   /jobs                   jobs.store
GET    /jobs/{application}     jobs.edit
PUT    /jobs/{application}     jobs.update
DELETE /jobs/{application}     jobs.destroy
```

**Authorization:** `JobApplicationPolicy` — same pattern as `ResumePolicy`.

**Navigation:** Add "Jobs" link to `AuthenticatedLayout` nav alongside "Dashboard" and "Resume Builder".

---

## Subsystem 3 — UX & Onboarding

### First-Run Wizard

**Trigger:** Fires once, on the very first resume a user creates. Subsequent resumes skip straight to the editor.

**Detection:** Check `$user->resumes()->count() === 1` after creating the first resume (the newly created one is the only one). Store a `has_completed_onboarding` boolean on the `users` table via migration. The wizard sets this flag on completion; the editor checks it.

**Wizard flow (4 steps, no page reloads — React state machine):**

1. **Welcome** — "Let's build your resume. It takes about 5 minutes." + Continue button
2. **Contact Info** — Pre-fills the Contact section fields (full name, email, phone, location). Same fields as the editor Contact section.
3. **Your Experience** — Add your most recent job (company, title, dates, 1–3 bullets). Can skip.
4. **Skills** — Add 3–5 skills using the existing `TagInput` component. Can skip.

After step 4, user lands in the normal editor with the data pre-filled. The wizard does NOT replace the editor — it's an overlay/modal on top of the editor that dismisses on completion.

**Implementation:** Rendered as a centered modal overlay in `Edit.tsx`. Only shown when `isFirstResume` prop is `true` (passed from `ResumeBuilderController::edit()` based on `has_completed_onboarding`). Wizard state managed with `useState` (step 0–3). On "Finish", fires the normal `save()` and sets `has_completed_onboarding` via a `PATCH /user/onboarding` endpoint.

### Undo/Redo

**Scope:** In-session only. State resets on page reload. No server persistence.

**What's undoable:** All text field changes, section additions/deletions, drag-and-drop reorders, skills tag adds/removes. Template and font changes are NOT undoable (they save instantly and are cosmetic).

**Implementation:** A custom `useHistory` hook in `Edit.tsx`:
- Maintains a stack of resume state snapshots (max 50 entries to cap memory)
- Snapshots are taken on every `save()` call (i.e., on every onBlur)
- `undo()` pops the stack and restores the previous snapshot to all state setters
- `redo()` moves forward in the stack

**UI:**
- Two small icon buttons (↩ ↪) in the editor header bar, next to the Save indicator
- Keyboard shortcuts: `Cmd+Z` / `Ctrl+Z` for undo, `Cmd+Shift+Z` / `Ctrl+Y` for redo
- Buttons are disabled (grayed) when no history is available

**Snapshot format:** A plain object matching the current `save()` payload shape: `{ name, template, contact, summary, experience, education, skills, certifications, font_sizes }`.

---

## Implementation Order

1. **Templates & Visual Polish** — foundational; accent color + font family columns needed before Productivity/UX work
2. **Productivity** — independent of UX; ATS scoring, cover letters, job tracker can be built in parallel within this subsystem
3. **UX & Onboarding** — touches `Edit.tsx` heavily; do last to avoid conflicts with template changes

---

## What's Explicitly Out of Scope

- Billing / Stripe / paid tiers (deferred to a future phase)
- LinkedIn/PDF import
- Mobile responsive editor
- Photo upload (placeholder circle shown in sidebar template only)
- AI cover letter generation
- Kanban board for job tracker (table-only in this phase)
- Version history / persistent undo
