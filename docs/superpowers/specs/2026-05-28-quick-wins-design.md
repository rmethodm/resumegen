# Quick Wins Design Spec

**Date:** 2026-05-28  
**Scope:** 7 low-effort, high-polish improvements shipped in two focused batches.

---

## Batch 1 — Editor Polish

### A — Inline Resume Rename

**Where:** Resume list (`Index.tsx`) and editor header (`Edit.tsx`).

**Behavior:**
- On the list page: clicking a resume name replaces it with an `<input>`. Blur or Enter saves via `PATCH /builder/{resume}` with `{ name }`. Escape reverts without saving.
- In the editor header: the static `<h2>` showing the name becomes click-to-edit in the same way. The `name` state already exists; on save, calls the existing `save()` function.
- No new route needed — `builder.update` already accepts `name`.

**Implementation files:**
- `resources/js/Pages/ResumeBuilder/Index.tsx` — add inline edit to the list row
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — make header name editable

---

### B — Duplicate Resume

**Where:** Resume list (`Index.tsx`) — new "Duplicate" button alongside Edit/Delete.

**Backend:**
- New route: `POST /builder/{resume}/duplicate` → `ResumeBuilderController::duplicate()`
- Copies all JSON columns: `contact`, `experience`, `education`, `skills`, `certifications`, `summary`, `template`, `font_sizes`
- Sets `name` to `"Copy of {original name}"`
- Redirects to the new resume's editor (`builder.edit`)
- Authorized via `ResumePolicy` (same `update` gate — user must own the source resume)

**Implementation files:**
- `routes/web.php` — add duplicate route
- `app/Http/Controllers/ResumeBuilderController.php` — add `duplicate()` method
- `resources/js/Pages/ResumeBuilder/Index.tsx` — add Duplicate button

---

### F — Mark All Questions Read

**Where:** Questions panel in `Edit.tsx`.

**Backend:**
- New route: `PATCH /builder/{resume}/questions/read-all` → `ShareLinkController::markAllRead()`
- Sets `is_read = true` on all questions where `resume_id = $resume->id`
- Authorized via `ResumePolicy`

**Frontend:**
- Show "Mark all read" button in the Questions section header only when `unreadCount > 0`
- On click, fires `router.patch(route('questions.read-all', resume.id))` with `preserveScroll: true`
- Button disappears immediately after (optimistic: set local unread count to 0)

**Implementation files:**
- `routes/web.php` — add read-all route
- `app/Http/Controllers/ShareLinkController.php` — add `markAllRead()` method
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — add button to Questions panel

---

### G — PDF Syncs Font Sizes from Editor

**Where:** `resources/views/resume-pdf.blade.php`

**Behavior:**
- The Blade view receives `$resume` which has a `font_sizes` JSON column (cast to array).
- Replace the hardcoded CSS size values with PHP-rendered values from `$resume->font_sizes`, falling back to the same defaults used in the frontend (`DEFAULT_FONT_SIZES`):
  - `name`: 16pt
  - `contact`: 9.5pt
  - `heading`: 10.5pt
  - `body`: 10pt
  - `sectionSpacing`: 9pt (used as margin between sections)
  - `entrySpacing`: 3pt (used as margin between entries)
- No migration or model change needed — `font_sizes` column already exists and is passed to the view via `ResumeBuilderController::downloadPdf()`.

**Implementation files:**
- `resources/views/resume-pdf.blade.php` — replace hardcoded sizes with PHP variables

---

## Batch 2 — Platform Features

### E — Email Notification for New Questions

**Trigger:** `PublicResumeController::storeQuestion()` after a question is saved.

**Implementation:**
- Create `app/Mail/NewQuestionReceived.php` — a Markdown mailable
- Create `resources/views/mail/new-question.blade.php` — Markdown template showing:
  - Sender name and email
  - Their message body
  - A "View in editor" button linking to `/builder/{resume_id}` (authenticated URL, not public)
- In `storeQuestion()`, after saving: `Mail::to($resume->user->email)->queue(new NewQuestionReceived($question, $resume))`
- Wrapped in try/catch so a mail misconfiguration never breaks the public question form
- Requires `MAIL_*` env vars to be configured (SMTP, Mailgun, etc.) — documented in `.env.example`

**Implementation files:**
- `app/Mail/NewQuestionReceived.php` — new Mailable class
- `resources/views/mail/new-question.blade.php` — Markdown email template
- `app/Http/Controllers/PublicResumeController.php` — dispatch mail after save
- `.env.example` — add `MAIL_*` placeholder vars if not already present

---

### H — Welcome Page Redesign

**Style:** Warm and approachable — soft indigo/white gradients, friendly copy, mock resume preview.

**Sections:**
1. **Hero** — large headline ("Build resumes that get you hired"), subheadline, two CTAs: "Get started free" (→ register) and "Sign in" (→ login). Soft gradient background (indigo-50 to white).
2. **Features row** — 3 cards with icons:
   - AI-powered suggestions (sparkle icon)
   - Share a live link (share icon)
   - Track who's viewing (chart icon)
3. **Mock resume preview** — a static inline HTML snippet styled to look like the Minimal template, giving visitors a feel for the output quality.
4. **Footer** — minimal: product name + tagline.

**Implementation:**
- Replaces `resources/js/Pages/Welcome.tsx` entirely
- Uses Ziggy `route()` for login/register links (already available)
- No new layout needed — renders without `AuthenticatedLayout` (public page, already the case)
- `canLogin` and `canRegister` props already passed from the route closure in `web.php`

**Implementation files:**
- `resources/js/Pages/Welcome.tsx` — full rewrite

---

### J — Share Link Expiry / Deactivation

**Schema change:**
- New migration: add `expires_at` (nullable timestamp) to `resume_share_links`
- Model: add `expires_at` to `$fillable`, cast to `datetime`

**Public access check (`PublicResumeController::show()`):**
- After loading the link by token, check:
  1. `$link->is_active === false` → return 410 Inertia page "Link deactivated"
  2. `$link->expires_at !== null && $link->expires_at->isPast()` → return 410 Inertia page "Link expired"
- Create `resources/js/Pages/ResumeBuilder/LinkExpired.tsx` — simple centered message with a note to contact the resume owner

**Editor UI (`Edit.tsx` Share panel):**
- Each share link row gets an optional date input (`<input type="date">`) for `expires_at`
- On blur, fires `router.patch(route('share.update', [resume.id, link.id]), { expires_at })` 
- Display a small badge "Expires {date}" if set, "No expiry" otherwise
- Existing `is_active` toggle remains unchanged

**Controller (`ShareLinkController::update()`):**
- Accept `expires_at` as optional nullable date in validation
- Pass through to `$link->update()`

**Implementation files:**
- `database/migrations/{timestamp}_add_expires_at_to_resume_share_links_table.php` — new migration
- `app/Models/ResumeShareLink.php` — add `expires_at` to fillable + cast
- `app/Http/Controllers/PublicResumeController.php` — expiry/active check
- `app/Http/Controllers/ShareLinkController.php` — accept `expires_at` in update
- `resources/js/Pages/ResumeBuilder/Edit.tsx` — expiry date input in Share panel
- `resources/js/Pages/ResumeBuilder/LinkExpired.tsx` — new expired/deactivated page

---

## What's Explicitly Out of Scope

- Resume thumbnail previews (deferred — requires headless browser)
- Dashboard → editor links (deferred to a future small PR)
- Public view mobile layout (deferred)
- Any billing, subscription, or paid tier work
- New resume templates or color theming
