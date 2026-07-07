# AI Resignation Letter Generator — Design Spec

Date: 2026-07-05
Status: Approved for planning

## Problem

Competitive research against kickresume.com (`2026-07-05-kickresume-competitive-gap-analysis.md`)
identified an AI Resignation Letter Generator as a feature this app lacks. Two other
candidate gaps from that scan (resume scoring, interview questions) turned out to already
exist (`AtsScorer`, `InterviewCoachController`) — this is the one confirmed net-new gap
worth building now.

## Goals

- Let users generate, edit, and store resignation letters, personalized via AI using
  last working day, tone, optional reason, and (if linked) their resume's role/company/experience.
- Mirror the existing Cover Letters feature's architecture and UX as closely as possible —
  same CRUD shape, same tier-limit pattern, same AI quota/error handling as `interview_coach`.

## Non-goals

- PDF/DOCX export — Cover Letters have none today (plain editable text body only); resignation
  letters match that convention. Adding export to both is a separate future feature.
- Merging with the Cover Letters table/model — kept as a fully separate feature (own table,
  model, controller, routes, pages) per explicit decision, even though the two are structurally
  similar. Reason: separate resource keeps authorization, quota accounting, and future divergence simple.

## Data model

**Migration:** `resignation_letters` table:

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `user_id` | FK → users | |
| `resume_id` | FK → resumes, nullable | optional link for AI context |
| `name` | string | user-facing label |
| `template_key` | string | one of `ResignationLetterTemplates::keys()` |
| `body` | text | editable letter content |
| `timestamps` | | |

**Model:** `App\Models\ResignationLetter`, same shape as `CoverLetter`:
- `$fillable = ['user_id', 'resume_id', 'name', 'template_key', 'body']`
- `user(): BelongsTo`, `resume(): BelongsTo`

**Policy:** `ResignationLetterPolicy` — `update`/`delete` gated on `$user->id === $letter->user_id`,
mirroring `ResumePolicy`/`CoverLetterPolicy`.

## Backend

**`App\Data\ResignationLetterTemplates`** (mirrors `CoverLetterTemplates`):
- `TEMPLATES` const with keys: `standard` (two-weeks notice), `immediate` (short-notice/no notice
  period), `warm` (grateful, relationship-preserving tone).
- Placeholders: `{{company}}`, `{{role}}`, `{{name}}`, `{{last_day}}`.
- `keys(): array`, `render(string $key, array $vars = []): string` — same implementation pattern
  as `CoverLetterTemplates::render()`.

**`App\Http\Controllers\ResignationLetterController`** (mirrors `CoverLetterController`):
- `index(Request $request): Response` — lists user's letters, passes `templates`,
  `resignationLetterLimit`, `resignationLetterCount` (same shape as cover letters' index props).
- `store(Request $request)` — validates `template_key` (`in:` templates) + `name`, enforces
  `UserLimits::resignationLetterLimit()` via `featureGate` flash on limit exceeded (same
  required-tier logic as `coverLetterLimit`: free→starter, starter→pro), creates from template.
- `edit(Request $request, ResignationLetter $letter): Response` — `authorize('update', $letter)`,
  passes `letter` + user's resumes (`id`, `name`) for the optional resume-link dropdown.
- `update(Request $request, ResignationLetter $letter)` — validates `name`, `body`, `resume_id`
  (nullable, must belong to the user), same shape as `CoverLetterController::update`.
- `destroy(Request $request, ResignationLetter $letter)` — `authorize('delete', $letter)`.
- `generate(Request $request, ResignationLetter $letter): JsonResponse` — new AI endpoint:
  1. `authorize('update', $letter)`
  2. Validate `last_day` (date, required), `tone` (`in:formal,warm,brief`, required),
     `reason` (nullable, string, max 500)
  3. `UserLimits::canUseAi($user)` check → 402 on quota exhaustion (same shape as
     `InterviewCoachController`)
  4. Pull `role`/`company`/`experience` from `$letter->resume` if linked (nulls if not)
  5. Call `AiService::chat(AiPrompts::build('resignation_letter', [...]), ['user' => $user, 'feature' => 'resignation_letter'])`
  6. Catch `ModerationException` → 422 with `ModerationException::USER_MESSAGE`
  7. Catch `Throwable` → 503 `'AI is temporarily unavailable. Try again.'`
  8. On success: `$letter->update(['body' => $reply])`, return `{ body, remaining: UserLimits::aiRemaining($user) }`

**Routes** (`routes/web.php`, inside the existing authenticated/verified group):
```
GET    /resignation-letters                       resignation-letters.index
POST   /resignation-letters                       resignation-letters.store
GET    /resignation-letters/{letter}               resignation-letters.edit
PUT    /resignation-letters/{letter}               resignation-letters.update
DELETE /resignation-letters/{letter}               resignation-letters.destroy
POST   /resignation-letters/{letter}/generate       resignation-letters.generate
```

**`UserLimits::resignationLetterLimit(User $user): ?int`** — identical tiers to `coverLetterLimit`:
```php
return match ($user->planTier()) {
    'free' => 1,
    'starter' => 10,
    'pro', 'agency' => null,
    default => 1,
};
```

**`AiPrompts::build('resignation_letter', [...])`** — new prompt, added as a new match arm.
Inputs: `tone`, `last_day`, `reason` (nullable), `role` (nullable), `company` (nullable),
`experience` (nullable array). Instructs the model to write a complete, professional
resignation letter body (no AI generation of headers/dates the user will edit manually),
respecting the requested tone, mentioning the last working day, and referencing role/company
naturally if provided. Plain-text response (no JSON), consistent with `rewrite_bullet`/
`generate_summary`'s free-text pattern (not `interview_coach`'s structured-JSON pattern,
since this returns a single letter body, not a list).

## Frontend

**Nav:** New link "Resignation Letters" in `AuthenticatedLayout.tsx`, alongside "Cover Letters"
(`NavLink` desktop + `ResponsiveNavLink` mobile), both pointing at
`route('resignation-letters.index')` / `route().current('resignation-letters.*')`.

**`resources/js/Pages/ResignationLetter/Index.tsx`** — copied structure from `CoverLetter/Index.tsx`:
list of existing letters, template picker + "Create" flow, limit/count display, `featureGate`
handled by the existing app-wide `UpgradeModal` wiring (no new gating UI needed).

**`resources/js/Pages/ResignationLetter/Edit.tsx`** — copied structure from `CoverLetter/Edit.tsx`
(autosave `onBlur` on `body`/`name`/`resume_id`, matching the existing convention), plus:
- **Last working day** — date input
- **Tone** — select (Formal / Warm & grateful / Brief)
- **Reason / context** — optional textarea, placeholder text noting it's optional
- **"Generate with AI"** button — calls `resignation-letters.generate`, replaces `body` with
  the response, keeps `body` editable afterward (same "AI drafts, user edits" pattern as the
  rest of the app)
- AI quota-exhausted (402) response triggers the existing `triggerUpgradeModal` event path,
  consistent with other AI features called via XHR

## Error handling

- Tier limit exceeded on create → `featureGate` flash, same as cover letters.
- AI quota exhausted on generate → 402 JSON, `triggerUpgradeModal` event (XHR path, consistent
  with `UserLimits`-gated AI features).
- Moderation-flagged input → 422 with `ModerationException::USER_MESSAGE`.
- AI service failure → 503, generic retry message; `body` is left unchanged (no partial overwrite).

## Testing

- `tests/Feature/ResignationLetterTest.php` (mirrors `tests/Feature/CoverLetterTest.php`):
  CRUD (create/edit/update/delete), authorization (can't touch another user's letter),
  tier limit enforcement (Free capped at 1 → `featureGate` on the 2nd create attempt),
  `generate` endpoint: success shape, 402 on quota exhaustion, 422 on moderation rejection,
  503 on AI service failure (body left unchanged).
- Unit coverage for `ResignationLetterTemplates::render()` placeholder substitution, mirroring
  whatever test (if any) exists for `CoverLetterTemplates`.

## Rollout

No new external dependencies or env vars — reuses the existing `AiService`/OpenAI configuration
and the existing quota-accounting table (`ai_requests`, new `feature: 'resignation_letter'` value).
