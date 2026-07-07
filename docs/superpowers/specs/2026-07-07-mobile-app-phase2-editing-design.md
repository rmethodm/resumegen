# Mobile App Phase 2 — Editing (Resumes, Cover Letters, Resignation Letters) — Design Spec

Date: 2026-07-07
Status: Approved for planning

## Problem

The Phase 1 mobile app (`/mobile`, iOS, Expo/React Native) is read-only: auth, resume
list/detail with PDF share, activity feed, and push notifications. The Phase 1 spec's
Non-goals section named "resume/cover-letter/resignation-letter editing on mobile" as the
first priority for future work. Users currently must switch to the web app to make any
change to their documents.

## Goals

- Full-parity editing of an existing **Resume** on mobile: every field the web builder
  supports, including template switching, appearance settings, section reordering, and
  photo upload — not just plain text fields.
- Full editing of an existing **Cover Letter** and **Resignation Letter** on mobile: name,
  template, linked resume, and body text.
- AI-generate support for **Resignation Letters** on mobile (the feature already exists on
  web/backend — this wires it into the mobile client).
- A **new** AI-generate feature for **Cover Letters** — this does not exist anywhere in the
  app today (web included) and is being built as part of this project, backend and mobile
  together.
- New backend support where missing: a Sanctum JSON API for Resignation Letters (currently
  Inertia-only), and write endpoints for Resumes on the mobile client (currently read-only).

## Non-goals

- Creating brand-new resumes/cover letters/resignation letters from scratch on mobile —
  this project edits existing documents only. Creation flows remain a separate future item.
- Any other Phase 2 candidates: AI tools beyond the two generate actions above (rewriter,
  ATS score, career coach, career map, proofreading), billing/paywall UI on mobile, job
  application tracker, portfolio builder, Android port, replying to activity threads.
- A mobile billing/upgrade purchase flow — quota-exceeded responses inform the user via an
  alert but do not deep-link to a mobile checkout (none exists).

## Architecture

Three parallel "document editor" verticals in `/mobile`, each following the same shape: a
list screen → an edit screen with fields matching the backend's existing validation rules
exactly → save-on-blur via `apiFetch`, reusing the existing central 401 handler
(`handleUnauthorizedResponse()`). AI-generate is an additional action on the cover-letter
and resignation-letter edit screens.

### 1. Backend additions

**`mobile/lib/resumeApi.ts` — add write methods.** Currently read-only (`listResumes`,
`getResume`). Add:

```ts
updateResume(id: number, data: Partial<ResumeFields>): Promise<Resume>  // PUT /api/resumes/{id}
```

No backend changes needed — `Api\ResumeController@update` and `ResumeRules::rules()`
already exist and are fully reused. New TypeScript types for `ResumeFields` mirror
`resources/js/types/index.d.ts`'s `Resume`, `CustomSection`, `CustomSectionEntry`, etc.

**New `Api\ResignationLetterController`** (mirrors `Api\CoverLetterController` exactly):

- `index/store/show/update/destroy` — same validation as the existing web
  `ResignationLetterController`: `name` (`sometimes|required|string|max:255`),
  `template_key` (`sometimes|required|string|in:` + `ResignationLetterTemplates::keys()`),
  `body` (`sometimes|string|max:50000`), `resume_id`
  (`sometimes|nullable|integer|exists:resumes,id`, with an ownership check that the resume
  belongs to the authenticated user — matching `CoverLetterController`'s pattern).
- `generate(ResignationLetter $letter)` — ports the web action's logic: validates
  `last_day` (required date), `tone` (required, `in:formal,warm,brief`), `reason`
  (nullable, max 500); calls `AiService->chat()` with
  `feature: 'resignation_letter'`; persists `body`; returns `{ body: string, remaining: int }`
  on success. Error responses match the existing web action: `ModerationException` → 422
  `{ error }`; other `Throwable` → 503 `{ error }`; quota exceeded → 402
  `{ error, can_upgrade, next_tier, limit, used, resets_at }`.
- New `routes/api.php` entries: `Route::apiResource('resignation-letters', ...)` +
  `Route::post('resignation-letters/{letter}/generate', ...)`.
- Reuses the existing `ResignationLetterPolicy` (`view/update/delete`, ownership-only) — no
  new authorization code.

**New `cover_letter` AI feature** (does not exist today, backend or web):

- `AiPrompts::coverLetter(array $input)` — new case in the `match` in
  `AiPrompts::build()`. Inputs: `tone` (`formal|warm|brief` — same three values as
  `resignation_letter`, per user decision to keep the tone enum consistent across letter
  types), `job_description` (nullable string, since cover letters target a specific job
  unlike resignation letters), and `role`/`company`/`experience`/`skills` derived from the
  letter's linked `resume` (same derivation pattern as `resignationLetter()`'s
  `role`/`company` and `careerCoach()`'s experience/skills summarization). Prompt
  instructs: write a complete, professional cover letter body in the given tone,
  referencing the job description if provided, grounded strictly in the given experience/
  skills, no invented facts, no date/salutation/signature block (user adds those
  manually — matching `resignationLetter()`'s convention of body-text-only).
- `Api\CoverLetterController@generate(CoverLetter $letter)` — new action, added alongside
  the existing CRUD methods. Validates `tone` (required, `in:formal,warm,brief`),
  `job_description` (nullable, `max:10000` — matching `ResumeRules`'s
  `target_job_description` limit for consistency). Calls
  `AiService->chat($prompt, ['user' => $user, 'feature' => 'cover_letter'])`. Same success/
  error response shapes as the resignation-letter generate action above.
- New route: `Route::post('cover-letters/{letter}/generate', ...)`.
- Spends the same shared `ai_generations` monthly quota via `UserLimits::canUseAi()` — no
  new per-feature gate, consistent with how `resignation_letter` is metered today.

### 2. Mobile Resume Editor (full parity)

New `ResumeEditScreen`, reached from `ResumeListScreen`/`ResumeDetailScreen`, scrollable
with the following sections. Every field save uses the same **save-on-blur** pattern the
web app already uses (per this repo's documented convention) — no single "Save" button —
so each PUT payload stays small and behavior matches web exactly.

- **Basics**: `name`, `contact` fields, `summary` — plain `TextInput`s.
- **Template & appearance**: `template` picker (9 values: `classic, modern, minimal,
  minimal-ruled, executive, ats, skills-first, academic, bold` — a simple list/segmented
  control, no visual thumbnails needed for v1), `accent_color` (swatch row),
  `font_family` picker, `font_sizes`.
- **Experience / Education / Certifications / Projects**: repeatable card lists; each card
  expands to edit its fields; add-entry/delete-entry buttons. Same array-of-objects shape
  as web; mobile enforces the same max-length limits already defined in
  `App\Data\ResumeRules` (e.g. `projects.*.description` max 2000,
  `skill_narratives.*.bullets.*` max 500) via inline character counts, but does not
  duplicate the validation logic — the backend remains the source of truth and returns
  422s if exceeded.
- **Skills / skills_groups / skill_narratives**: tag/chip-style add-remove list editors.
- **Custom sections**: list of `CustomSection` blocks (`{ id, name, entries }`), each
  `entries` list using the same card editor as Experience (`CustomSectionEntry` has the
  identical shape: `title, subtitle, start_date, end_date, description, bullets`).
- **Section order**: a draggable list of section names (new dependency:
  `react-native-draggable-flatlist` + `react-native-gesture-handler` +
  `react-native-reanimated`), writing the reordered array back to `section_order` on drop.
- **Photo**: new dependency `expo-image-picker` to select from the camera roll, uploaded to
  the existing media-library endpoint used by the web photo-upload feature (verified to
  exist during implementation — Spatie media library is already installed per CLAUDE.md).

### 3. Cover Letter & Resignation Letter Editors

Both models share an identical shape (`name`, `template_key`, `body`, `resume_id`), so both
editors follow the same screen structure:

- New `CoverLetterListScreen` / `ResignationLetterListScreen` (mirroring
  `ResumeListScreen`'s existing pattern) and `CoverLetterEditScreen` /
  `ResignationLetterEditScreen`.
- Fields: `name` (text input), `template_key` (picker — 5 values for cover letters:
  `standard, modern, career_change, new_grad, referral`; 3 values for resignation letters:
  `standard, immediate, warm`), `resume_id` (picker sourced from the user's resume list via
  the existing `listResumes()`, optional/nullable), `body` (multiline `TextInput`,
  save-on-blur).
- **AI-generate action**, opening a small inline form:
  - Cover letter: `tone` (`formal|warm|brief` picker) + `job_description` (optional
    multiline input) → `POST /api/cover-letters/{id}/generate` → fills `body`, shows the
    returned `remaining` quota count to the user.
  - Resignation letter: `tone` + `last_day` (date input) + `reason` (optional text) →
    `POST /api/resignation-letters/{id}/generate` → same fill/quota-display pattern.
- New `mobile/lib/coverLetterApi.ts` and `mobile/lib/resignationLetterApi.ts` — CRUD +
  `generate()`, matching `resumeApi.ts`'s existing conventions (typed functions wrapping
  `apiFetch`).

## Error Handling

- **Save failures (non-401, non-402, e.g. 422 validation)**: inline error text under the
  relevant field/section, matching `ResumeDetailScreen`'s existing error-display
  convention. No retry loop — user edits and blurs again.
- **401 on any editor save/generate call**: routes through the existing
  `handleUnauthorizedResponse()` — same behavior as every other authenticated mobile call.
- **402 (quota exceeded) on generate**: mobile has no `UpgradeModal` equivalent today. Add
  a small shared helper, `showUpgradeAlert(feature: string, requiredTier: string): void`,
  using React Native's `Alert.alert` with a message naming the required tier (mirroring
  web's `FEATURE_LABELS`/`TIER_NAMES` maps). No deep-link to a billing screen — mobile has
  no billing/checkout UI — the alert simply informs the user to upgrade via the web app.
- **`ModerationException` (422) from generate**: inline message ("Couldn't generate — try
  adjusting your input"). No quota is consumed, matching backend behavior.
- **Validation errors on field saves** (422, e.g. `body` over 50000 chars): surfaced inline
  near the field, parsed from Laravel's standard validation error JSON response shape.

## Testing

- **Mobile**: Jest + `@testing-library/react-native` for every new screen and lib module,
  matching existing test conventions exactly (per `mobile/AGENTS.md` and this repo's
  established pattern — same `render`/`screen`/`waitFor`/`fireEvent` usage as existing
  tests).
- **Backend**: PHPUnit feature tests for the new `Api\ResignationLetterController` (CRUD +
  generate: success, moderation-blocked, quota-exceeded cases) and the new
  `Api\CoverLetterController@generate` action (same three cases), per this repo's
  "every change must be programmatically tested" rule.
- **Manual, TestFlight-only**: drag-reorder and the photo picker are native-gesture/
  camera-roll dependent and cannot be meaningfully exercised in Jest. Flagged as a
  documented follow-up, consistent with how Phase 1's push-notification behavior was
  handled (no Xcode/simulator available in this sandbox).

## Rollout

- New mobile dependencies (`expo-image-picker`, `react-native-gesture-handler`,
  `react-native-reanimated`, a draggable-list package) require a native rebuild (EAS)
  before the photo-upload and section-reorder features work on a real device — same
  caveat as Phase 1 Hardening's `expo-notifications` plugin change.
- No new environment variables.
- No new database migrations — all three models/tables (`resumes`, `cover_letters`,
  `resignation_letters`) already exist.
- Given the size of this project (a new backend AI feature, a new backend API surface, and
  three full mobile editor verticals), the implementation plan should be written with
  clearly separable tasks so review checkpoints stay meaningful, even though this spec and
  its plan are being kept as one document per the user's explicit choice not to split this
  into multiple sequential sub-project specs.
