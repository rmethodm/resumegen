# Resume Translator — Design Spec

Date: 2026-07-05
Status: Approved for planning

## Problem

Competitive research against kickresume.com (`2026-07-05-kickresume-competitive-gap-analysis.md`)
listed "translator/rewriter micro-tools" as a gap. The "rewriter" half already exists
(`rewrite_bullet`, wording/tone rewrite of a single bullet) — grepped and confirmed no translation
code exists anywhere in the app. The real net-new gap is a resume language translator.

## Goals

- Let Starter+ users translate a resume into one of 7 supported languages with one click.
- Never destroy the original — translation always produces a new resume record.
- Never let the AI touch structural fields (dates, IDs, contact info, template/color/font
  settings) — only true free-text content is sent to the model.

## Non-goals

- Translating a single field/bullet in place (smaller-scope alternative considered, not chosen —
  whole-resume translation was preferred).
- Free-text language input — a fixed dropdown of 7 languages keeps AI output predictable and
  validation simple.
- In-place overwrite of the original resume — always creates a copy (see Data model).

## Data model

No schema changes. Reuses `ResumeCopier::copy()` (already used by `duplicate()`) to create the
translated resume, and the existing `ai_requests` quota-logging table with a new `feature` value
(`'translate_resume'`).

**Supported languages:** Spanish, French, German, Portuguese, Italian, Mandarin, Japanese.

**Translated fields** (sent to the AI): `summary`, `experience[].bullets`/`description`,
`education[].degree`/`field`, `projects[].description`/`bullets`, `skills`, `skills_groups[].items`,
`skill_narratives[].bullets`, `custom_sections` text values.

**Untouched fields** (copied as-is by `ResumeCopier`, never sent to the AI): `contact`, all dates,
`template`, `accent_color`, `font_family`, `font_sizes`, `section_order`, IDs, company/school names
embedded in `experience`/`education` (the prompt explicitly instructs the model not to translate
proper nouns).

## Backend

**`UserLimits::canTranslate(User $user): bool`** — new method:
```php
return $user->isAtLeastStarter();
```

**`AiSuggestionController::translate(Request $request, Resume $resume): JsonResponse`** — new
method:
1. `$this->authorize('update', $resume)`
2. Validate `language` (`required`, `in:spanish,french,german,portuguese,italian,mandarin,japanese`)
3. Tier gate: if `! UserLimits::canTranslate($user)`, return 402
   `{ error: 'Resume translation is a Starter feature.', required_tier: 'starter' }`
4. Resume-limit gate (same check `duplicate()` uses): if
   `UserLimits::resumeLimit($user)` is not null and `$user->resumes()->nonSnapshot()->count()` is at
   or over it, return 402 `{ error: 'Resume limit reached.', required_tier: <free ? 'starter' : 'pro'> }`
5. AI quota gate: if `! UserLimits::canUseAi($user)`, return 402 with the existing shape (same
   fields as `AiSuggestionController::run()`'s quota-exhausted response)
6. Build `content` from the translated-fields list above (only those fields, structured as JSON)
7. Call
   `$this->ai->chat(AiPrompts::build('translate_resume', ['language' => $language, 'content' => $content]), ['user' => $user, 'feature' => 'translate_resume'])`
   — catch `ModerationException` → 422 `ModerationException::USER_MESSAGE`; catch `Throwable` → 503
   `'AI is temporarily unavailable. Try again.'`
8. `json_decode($reply, true)` — if not an array matching the same top-level keys as `$content`,
   return 503 (same message as above). **No resume copy is created if this step fails.**
9. `ResumeCopier::copy($resume, $user, "{$resume->name} ({$language})")`, then update the copy with
   the translated fields only
10. Return `{ resume_id: $copy->id, remaining: UserLimits::aiRemaining($user) }`

**Route** (`routes/web.php`, alongside the other `builder.ai.*` routes):
```
POST /builder/{resume}/ai/translate    builder.ai.translate
```

**`AiPrompts::build('translate_resume', ['language' => ..., 'content' => [...]])`** — new prompt,
added as a new match arm. Structured JSON in, structured JSON out (same top-level shape as the
input), instructing the model to: translate all string values into the target language, preserve
the exact key structure and array ordering, and NOT translate proper nouns (company names, school
names, product names).

## Frontend

**`resources/js/Pages/ResumeBuilder/Partials/TranslatePanel.tsx`** — new panel, same collapsible
shell as `AtsMatchPanel.tsx`/`CareerMapPanel.tsx`. Contents: a language `<select>` (the 7 supported
languages) and a "Translate" button.

- On success: `router.visit(route('builder.edit', resume_id))` — navigates into the new translated
  copy's editor.
- On 402 (tier gate, resume limit, or AI quota — all three now share the same JSON shape):
  `triggerUpgradeModal('translate', required_tier)`.
- On 422/503: inline error message in the panel, consistent with the other AI panels.

Added to `Edit.tsx`'s sidebar alongside `AtsMatchPanel`, `CareerMapPanel`, and the other AI panels.

## Error handling

- Free tier → 402 `{ error, required_tier: 'starter' }`
- Resume limit reached → 402 `{ error, required_tier }` (free→starter, else→pro)
- Monthly AI quota exhausted → 402, existing shape
- Moderation-flagged resume content → 422, `ModerationException::USER_MESSAGE`
- AI failure or malformed/mismatched-shape JSON reply → 503, generic retry message — **no resume
  copy is created**, so a failed translation never leaves an orphaned or half-translated resume
  behind

## Testing

- `tests/Feature/ResumeTranslateTest.php`:
  - 402 for Free tier
  - 402 at resume limit (Starter+ user already at their resume cap)
  - 200: creates a new resume with translated text fields, and asserts contact/dates/template
    fields are unchanged from the original
  - 402 on monthly AI quota exhaustion
  - 422 on moderation rejection
  - 503 on AI service failure and on malformed/mismatched-shape JSON reply — asserts no extra
    resume row was created in either case
- Unit test in `tests/Unit/AiPromptsTest.php` covering the new `translate_resume` prompt-building
  branch.

## Rollout

No new external dependencies or env vars — reuses the existing `AiService`/OpenAI configuration,
`ResumeCopier`, and the existing quota-accounting table (`ai_requests`, new
`feature: 'translate_resume'` value).
