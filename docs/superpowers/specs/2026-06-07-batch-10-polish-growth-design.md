# Batch 10: Polish & Growth — Spec

**Date:** 2026-06-07
**Status:** Approved, ready for implementation

---

## Feature 1: Grammar/Spell Check (Browser-Native)

### Goal
Surface spelling errors inline in the resume editor with zero API cost.

### Implementation
Add `spellcheck="true"` to every user-facing `<textarea>` and free-text `<input>` in `Edit.tsx`. The browser's built-in spell checker underlines misspelled words and provides right-click correction suggestions.

Inputs that should NOT have spellcheck (date fields, URL fields, email fields, hidden inputs) receive `spellcheck="false"` explicitly.

### Scope
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` — audit all inputs and textareas
- No backend changes, no migrations, no new tests (browser behavior)

---

## Feature 2: Two New Resume Templates

### Goal
Add two design-forward templates to expand the template picker from 8 to 10 options.

### Templates

**`two-column`** — Bold sidebar layout. Left column (~30% width) has a dark accent-color background containing: name, contact info, skills, certifications. Right column (~70% white) contains: summary, experience, education. Strong visual contrast; suited to creative/design roles.

**`timeline`** — Clean single-column layout with a thin vertical accent-color line running down the left margin. Experience and education entries have a dot on the line at their date position. Elegant and modern; works well for chronological careers.

### Constraints
- Both templates respect `accent_color`, `font_family`, `section_order`, `custom_sections`, and `font_sizes`
- Rendered server-side via `resources/views/resume-pdf.blade.php` (same as existing 8 templates)
- Template keys: `'two-column'` and `'timeline'`
- Added to the template picker in `Edit.tsx`

### Scope
- Modify: `resources/views/resume-pdf.blade.php` — add two new `@elseif ($resume->template === '...')` branches
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` — add both keys to the template picker options
- Tests: 2 new cases in `tests/Feature/ResumeBuilderTest.php` verifying PDF preview returns 200 for each template key

---

## Feature 3: In-App Resume Tips Sidebar

### Goal
Give users a scannable list of actionable resume tips without leaving the editor.

### Implementation
A collapsible panel at the bottom of the left editor panel in `Edit.tsx`, below the Custom Sections area. Uses the same expand/collapse pattern (chevron toggle, `useState`) as other sections.

**Content:** Static array of 12–15 tips, defined in `resources/js/Pages/ResumeBuilder/Partials/ResumeTips.tsx`. Tips are grouped into 4 categories:

- **Summary** — keep to 2–3 sentences; lead with your value proposition; avoid "I" statements
- **Experience** — start every bullet with a strong action verb; quantify with numbers/percentages/dollar amounts; use past tense for previous roles
- **Skills** — list tools you can speak to confidently; group by category if more than 8; mirror keywords from the job description
- **General** — one page unless 10+ years experience; consistent formatting throughout; proofread for tense consistency; tailor for each application

### Scope
- Create: `resources/js/Pages/ResumeBuilder/Partials/ResumeTips.tsx`
- Modify: `resources/js/Pages/ResumeBuilder/Edit.tsx` — import and render `<ResumeTips />` panel
- No backend, no tests (static content)

---

## Feature 4: Resume Gallery (Public Portfolio Page)

### Goal
Give each user a public URL that displays all their publicly shared resumes as a card grid — a lightweight personal portfolio page.

### Data Model

New `username` column on `users`:
- Nullable string, unique index
- Auto-generated from `name` on user creation in `User::booted()` — slugified (e.g. "John Smith" → `john-smith`), with numeric suffix if collision (e.g. `john-smith-2`)
- Exposed in profile settings as a read-only field showing `{APP_URL}/portfolio/{username}` with a copy button

Migration: `add_username_to_users_table`

### Privacy
Only resumes that have at least one **active** `ResumeShareLink` appear on the portfolio. A user with zero active share links gets a 404. An unknown username gets a 404.

### Routes & Controller
- `GET /portfolio/{username}` → `PortfolioController@show` → named `portfolio.show`
- Unauthenticated — no `auth` middleware
- Controller: look up user by `username`, load their resumes that have active share links (eager-load `shareLinks`), render `Portfolio/Index.tsx` via `PublicLayout`

### Frontend (`Portfolio/Index.tsx`)
- Uses `PublicLayout`
- Sticky conversion header + fixed footer CTA ("Made with Resumegen · Build yours free →") for unauthenticated visitors — same pattern as `PublicView.tsx`
- Card grid (2–3 cols): each card shows resume name, template badge, "View Resume →" link (to `/r/{token}`), "Download PDF" link (to `/r/{token}/pdf`)
- Cards ordered by `updated_at` desc
- Empty state not reachable (404 if no active links)

### Profile Settings
Add "Portfolio URL" to `Profile/Edit.tsx` (or `Settings`) — read-only text field + copy button, value: `route('portfolio.show', { username: auth.user.username })`.

### Tests
5 tests in `tests/Feature/PortfolioTest.php`:
1. Portfolio renders for user with active share links
2. 404 for user with no active share links
3. 404 for unknown username
4. Only resumes with active share links appear (inactive links excluded)
5. Unauthenticated visitor can access the portfolio

---

## Feature 5: Application Funnel Analytics

### Goal
Show users their job search momentum: how many applications they're sending per week and whether their response rate is improving.

### UI
New analytics bar at the top of `Jobs/Index.tsx`, above the board/list toggle. Two stat cards + one bar chart:

**Stat cards:**
- "Applications this month" — count of `job_applications` created in the current calendar month for the user
- "Response rate" — percentage of applications older than 14 days that reached `interviewing` or `offered` status (excludes `rejected`, `closed`, `saved`, `applied`)

**Bar chart:**
- 12 weekly bars showing application count per week (last 84 days)
- Pure CSS flex implementation — bars are `<div>` elements with `height` proportional to the max week's count; week label (e.g. "Jun 2") below each bar
- No external charting library

### Architecture
All aggregation is client-side — computed from the existing `applications` prop already passed to `Jobs/Index.tsx`. No new backend endpoint, no migration.

A `useJobAnalytics(applications)` hook in `resources/js/hooks/useJobAnalytics.ts` performs the calculations and returns `{ thisMonthCount, responseRate, weeklyBars }`.

### Gating
Available to all tiers.

### Tests
No new backend tests. Existing `test_jobs_index_loads_for_authenticated_user` already verifies the prop is present.

---

## Feature 6: OG Image Polish

### Goal
Improve the visual quality of the share card generated when a public resume link is posted to LinkedIn or X.

### Current State
The existing OG image endpoint generates a static card. The improvement is visual only — no route, schema, or API changes.

### Improvements
- **Mini resume mockup:** On the right half of the card, render a small structural preview of the resume — section headings as colored rectangles (using `accent_color`), text lines as thin grey horizontal bars. Purely decorative, not real resume content.
- **Typography:** Larger, bolder name (candidate name from `contact.name`); job title in `accent_color`; tagline "Built with Resumegen" in small grey text at the bottom left.
- **Card dimensions:** 1200×630px (unchanged — OG standard).
- **Rendering:** Server-side Blade view, no Puppeteer.

### Scope
- Modify: `app/Http/Controllers/OgImageController.php` — the card is rendered as inline SVG directly in the controller (no separate Blade view). Update the SVG markup to implement the new layout.
- Tests: update `tests/Feature/OgImageTest.php` to assert the response has the correct content-type and contains the candidate's name in the SVG output.

---

## Tier Gates

| Feature | Gate |
|---|---|
| Spell check | All tiers |
| New templates | All tiers |
| Tips sidebar | All tiers |
| Portfolio page | All tiers (only shows resumes with active share links) |
| Funnel analytics | All tiers |
| OG image polish | All tiers |

---

## Dependencies

- Features 1, 3 are frontend-only with no dependencies
- Feature 2 requires PDF Blade changes — implement and visually verify both templates before writing tests
- Feature 4 requires migration before controller/frontend work
- Feature 5 has no backend dependencies — frontend-only
- Feature 6 requires locating the existing OG image implementation before editing
- All features are independent of each other
