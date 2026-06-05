# Group B: AI & Content Intelligence — Design Spec

**Date:** 2026-06-05
**Features:** PDF Import (1), Persona Profile (2), Full AI Generation (7), AI Cover Letter per-JD (13)
**Status:** Approved

---

## Overview

Four features that reduce friction at the top of the funnel and extend AI capabilities into generation and cover letters. All four share the existing abuse-filter and AI logging infrastructure. None require schema changes beyond one new column on `users`.

---

## 1. Data Model

### `users.profile` (nullable JSON)

```sql
ALTER TABLE users ADD COLUMN profile JSON NULL AFTER remember_token;
```

Shape:
```json
{
  "full_name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1 555 000 0000",
  "location": "San Francisco, CA",
  "linkedin_url": "https://linkedin.com/in/janesmith",
  "website": ""
}
```

- `User` model: add `profile` to `$fillable`, cast as `array`.
- All fields are optional strings. No validation beyond max-length on each field.
- No other schema changes — PDF import, AI generation, and cover letter tailoring are stateless (results written into existing `resumes` and `cover_letters` records).

---

## 2. Feature 2: Persona Profile

### Scope
A persistent contact pre-fill profile. Saves the user's personal details once; new resumes auto-populate the contact section from it.

### Backend
- Migration: `add_profile_to_users_table` (created via `php artisan make:migration`)
- `PATCH /user/profile-info` → `ProfileController@updatePersona`
- Validation: each field is `nullable|string|max:255` except `linkedin_url` (`nullable|url|max:255`) and `website` (`nullable|url|max:255`).
- `ResumeBuilderController@store`: after creating a new `Resume`, if `$user->profile` is non-null, merge it into the new resume's `contact` array before saving. This is a one-time write — subsequent edits to the user profile do NOT sync back to existing resumes.

### Frontend
- New card in `resources/js/Pages/Profile/Edit.tsx` titled **"Default Contact Info"**.
- Six fields matching the resume contact panel: Full Name, Email, Phone, Location, LinkedIn URL, Website.
- Saves via `router.patch(route('profile.persona'), data)` on blur (same pattern as the resume editor).
- No tier gate — available to all users.

### Routes
```
PATCH /user/profile-info   profile.persona   ProfileController@updatePersona
```

---

## 3. Feature 1: PDF Import

### Scope
Upload an existing PDF resume → AI extracts structured data → user chooses to create a new resume or overwrite an existing one → lands in the editor.

### New Files
- `app/Http/Controllers/PdfImportController.php`
- `app/Services/PdfResumeParser.php`

### Routes
```
POST /import/pdf            import.pdf.extract    PdfImportController@extract
POST /import/pdf/confirm    import.pdf.confirm    PdfImportController@confirm
```

Both routes require `auth` middleware. `extract` is throttled `throttle:5,1` (calls Claude); `confirm` is lightweight with no throttle.

### PdfImportController@extract
1. Validate: `file` required, `mimes:pdf`, `max:5120` (5 MB).
2. Delegate to `PdfResumeParser::parse($file)` — returns `['data' => [...resume schema...], 'detected_name' => string]`.
3. Return JSON: `{ data, detected_name }`.
4. Tier gate: Starter+ — free users receive HTTP 402 `{ error, required_tier: 'starter' }`.

### PdfImportController@confirm
Accepts:
```json
{
  "data": { ...resume schema... },
  "action": "new" | "overwrite",
  "resume_id": null | int,
  "name": "string (for new resumes)"
}
```
- `action=new`: creates a new `Resume` record owned by the current user, returns `redirect()->route('builder.edit', $resume)`. Since the frontend calls this via Inertia `router.post()`, Inertia handles the redirect as a client-side navigation.
- `action=overwrite`: validates `resume_id` belongs to the current user (`authorize('update', $resume)`), then `$resume->update($data)`, returns `redirect()->route('builder.edit', $resume)` (same Inertia redirect).

### PdfResumeParser
1. Extract raw text using `smalot/pdfparser`.
2. Apply `AbuseFilter::check()` to the extracted text. Return 422 on violation.
3. Build Claude prompt: wrap PDF text in `<user_content>` XML tags, ask Claude to return JSON matching the resume schema:
   ```json
   {
     "contact": { "full_name", "email", "phone", "location", "linkedin_url", "website" },
     "summary": "string",
     "experience": [{ "title", "company", "start_date", "end_date", "description", "bullets": [] }],
     "education": [{ "degree", "school", "start_date", "end_date", "description" }],
     "skills": ["string"],
     "certifications": [{ "name", "issuer", "date" }]
   }
   ```
4. Call Claude via `Http::post` (same pattern as `TailorController`). Log to `ai_usage_logs` with `feature: 'pdf_import'`.
5. JSON-decode response. If decode fails, throw a `\RuntimeException` — controller returns 422 `{ error: 'Could not parse resume. Please check the PDF and try again.' }`.

### Frontend
- `Index.tsx`: "⬆ Import PDF" button next to "New Resume". Opens a `<PdfImportModal>` component.
- **Step 1 — Upload:** Drag-and-drop zone + "Choose File" button. On file select, calls `extract` endpoint, shows spinner "Analyzing your resume…".
- **Step 2 — Destination:** Shows detected name + entry count. Radio choice:
  - "Create new resume" (default selected) — editable name field pre-filled with `detected_name + ' — Imported'`.
  - "Overwrite existing resume" — dropdown of user's existing resumes.
  - Warning banner for overwrite: "This cannot be undone."
- On confirm: submits via Inertia `router.post(route('import.pdf.confirm'), data)` — Inertia handles the server redirect to the editor.
- After redirect: dismissible banner in editor "Imported from PDF — review and edit your details." The controller flashes `pdfImported: true`; `Edit.tsx` reads it from `usePage().props` and shows the banner.
- Tier gate: free users see button disabled with upgrade tooltip.

### Composer dependency
`smalot/pdfparser` — already a well-established package, no licensing concern. Add via `composer require smalot/pdfparser`.

---

## 4. Feature 7: Full AI Generation

### Scope
User fills a 4-field form (target role, years of experience, industry, key skills) → AI generates a complete resume skeleton → new resume created → user lands in editor.

### New Files
- `app/Http/Controllers/ResumeGeneratorController.php`
- `app/Services/ResumeGenerator.php`

### Route
```
POST /builder/generate    builder.generate    ResumeGeneratorController@generate
```
Throttled: `throttle:3,1` (3 req/min — generation is expensive).

### ResumeGeneratorController@generate
Validation:
- `target_role`: required, string, max 100
- `years_experience`: required, integer, min 0, max 40
- `industry`: required, string, max 100
- `key_skills`: required, array, max 10 items; each item string max 50

`AbuseFilter::check()` applied to `target_role`, `industry`, and each skill. Returns 422 on violation.

Tier gate: Starter+ — free users receive featureGate flash redirect (Inertia request) or HTTP 402 (JSON request).

Delegates to `ResumeGenerator::generate(array $input, User $user): array`.

On success: creates a new `Resume` record, pre-fills `contact` from `$user->profile` if set, returns `redirect()->route('builder.edit', $resume)->with('resumeGenerated', true)`. `Edit.tsx` reads `usePage().props.resumeGenerated` and shows a dismissible banner "AI-generated draft — review and personalize your resume."

### ResumeGenerator
1. All user values wrapped in `<user_content>` XML tags in the prompt.
2. Prompt asks Claude to return JSON matching the full resume schema (same shape as PDF import above).
3. Contact fields pre-filled from `$user->profile` before sending to Claude, so the model doesn't invent personal details.
4. Log to `ai_usage_logs` with `feature: 'generate'`.
5. If JSON decode fails: throw `\RuntimeException` — controller returns 422 with a user-facing error message.

### Frontend
- `Index.tsx`: "✨ Generate" button. Opens `<GenerateResumeModal>` component.
- Four fields:
  - Target Role (text, required)
  - Years of Experience (number input 0–40)
  - Industry (text)
  - Key Skills (comma-separated text, split to array on submit, up to 10)
- Submit shows spinner "Generating your resume…" (~10–15 s).
- On success: Inertia redirect to editor. Banner: "AI-generated draft — review and personalize your resume."
- Tier gate: free users see button disabled with upgrade tooltip.

---

## 5. Feature 13: AI Cover Letter Suggestions

### Scope
In the cover letter editor, user pastes a job description → AI analyzes the existing letter body against the JD → returns up to 8 numbered inline edit suggestions → user accepts or skips each.

### New File
- `app/Http/Controllers/CoverLetterTailorController.php`

### Route
```
POST /cover-letters/{letter}/ai-tailor    cover-letters.ai-tailor    CoverLetterTailorController@tailor
```
Throttled: `throttle:5,1` (same as resume tailor).

### CoverLetterTailorController@tailor
Validation:
- `job_description`: required, string, 50–5000 chars

`AbuseFilter::check()` applied to both `job_description` and `$letter->body`.

Tier gate: Starter+ — HTTP 402 `{ error, required_tier: 'starter' }`.

Prompt: sends `$letter->body` + JD to Claude (both wrapped in `<user_content>` tags). Requests JSON array of up to 8 suggestions:
```json
[
  {
    "id": 1,
    "original_text": "team leadership",
    "suggested_text": "cross-functional team leadership",
    "reason": "JD mentions cross-functional collaboration 3 times"
  }
]
```

Returns suggestions array as JSON. Logs to `ai_usage_logs` with `feature: 'cover_letter_tailor'`.

### Frontend changes to `CoverLetter/Edit.tsx`
- "✨ Tailor to Job" button in the editor toolbar. Opens a slide-in right panel.
- Panel step 1: JD textarea (50–5000 chars) + "Analyze" button.
- Panel step 2 (after response): numbered suggestion cards. Each shows `reason` + before/after text + **Accept** / **Skip** buttons.
  - Accept: replaces first occurrence of `original_text` in `body` state with `suggested_text`, marks suggestion applied (green), triggers `router.put` auto-save.
  - Skip: marks suggestion dismissed (muted red).
- Suggestions are stored in local React state only — not persisted to the database.
- Highlighted spans in the letter body preview show which text each pending suggestion targets.
- Tier gate: free users see "✨ Tailor to Job" disabled with upgrade modal on click.

---

## 6. Shared Infrastructure

All four features reuse existing patterns without modification:

| Concern | Existing mechanism |
|---|---|
| Abuse filtering | `App\Services\AbuseFilter::check(string $text): bool` |
| AI usage logging | `App\Services\AiUsageLogger::log()` |
| Prompt injection defense | `<user_content>` XML tag wrappers in all prompts |
| Tier gating (Inertia) | `back()->with('featureGate', [...])` → `UpgradeModal` |
| Tier gating (JSON/API) | HTTP 402 `{ error, required_tier }` |
| Anthropic HTTP calls | `Http::post` to Anthropic API (same as `TailorController`) |

---

## 7. Error Handling

| Scenario | Response |
|---|---|
| PDF text extraction fails (corrupt/image-only PDF) | 422 `{ error: 'Could not read this PDF. Try a text-based PDF.' }` |
| Claude returns invalid JSON | 422 `{ error: 'AI response could not be parsed. Please try again.' }` |
| Abuse filter match | 422 `{ error: 'Content policy violation' }` |
| PDF > 5 MB | 422 validation error |
| AI generation / import throttle exceeded | 429 standard Laravel throttle response |
| Overwrite resume not owned by user | 403 via `authorize()` |

---

## 8. Testing Plan

- **Persona profile:** store/update profile, auto-fill on new resume creation, no auto-fill when profile is null.
- **PDF import (extract):** valid PDF parses and returns schema-shaped JSON; tier gate blocks free users; corrupt PDF returns 422; abuse filter triggers on injected PDF text.
- **PDF import (confirm):** `new` action creates resume; `overwrite` action updates correct resume; `overwrite` with wrong `resume_id` returns 403.
- **AI generation:** valid input creates new resume and redirects; tier gate blocks free users; abuse filter triggers; throttle enforced; invalid JSON from Claude returns 422.
- **Cover letter tailor:** returns suggestion array; abuse filter applies to JD and body; tier gate blocks free users; throttle enforced.
- **Unit test for `PdfResumeParser`:** mock `smalot/pdfparser` and Claude HTTP call; assert schema shape of returned array.
- **Unit test for `ResumeGenerator`:** mock Claude HTTP call; assert contact pre-fill from user profile.
