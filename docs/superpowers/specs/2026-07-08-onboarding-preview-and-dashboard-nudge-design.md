# Onboarding template preview + dashboard first-resume nudge

Date: 2026-07-08

## Background

Three items were requested:

1. Make the LinkedIn URL field in onboarding not required.
2. On the onboarding template picker, double-clicking a template should show a full sample resume (with dummy data), like the resume builder preview, instead of the small static thumbnail — the thumbnails are hard to see/understand.
3. First time a user reaches the dashboard with zero resumes, show a modal telling them to create their first resume, with a link to do so.

## Item 1 — already satisfied, no change

Investigated `resources/js/Pages/Onboarding/Wizard.tsx:224-231` and `app/Http/Controllers/OnboardingController.php:33`. The `linkedin_url` field has no `required` HTML attribute or client-side gate, and the backend rule is `['nullable', 'url', 'max:255']`. An empty field already passes validation and submission.

The "please enter a valid URL" message the user saw is the `url` format rule rejecting a non-empty, malformed value (e.g. a bare domain without `https://`) — expected behavior, not a required-field error, and not something the user asked to change. No code changes for this item.

## Item 2 — double-click template preview

### Existing reusable pieces

- `App\Data\SampleResume::data()` — fixed dummy resume content (contact, experience, education, skills, etc.), already used to render the static template thumbnails.
- `App\Console\Commands\GenerateTemplateThumbnails::TEMPLATES` — canonical list of the 9 template keys.
- Pattern already in use (`GenerateTemplateThumbnails::handle()`): `new Resume(SampleResume::data())` then override `->template`, all in-memory, never persisted.
- `ResumeBuilderController::buildPdf(Resume $resume)` renders `resume-pdf` view via `Pdf::loadView(...)` — confirmed it only reads content/style attributes and the safe-navigated `$resume->user`, not `id` or a persisted row.

### Design

- New route: `GET /onboarding/template-preview/{template}` → `OnboardingController::templatePreview(string $template)`.
  - Validate `$template` against `GenerateTemplateThumbnails::TEMPLATES`; abort 404 if not one of them.
  - Build `$resume = new Resume(SampleResume::data()); $resume->template = $template;`
  - Stream via the same PDF pipeline as the builder preview (`Pdf::loadView('resume-pdf', ['resume' => $resume, 'watermark' => false])->stream('preview.pdf')`), extracting a small shared private method or duplicating `buildPdf`'s one line — no need to touch `ResumeBuilderController`.
  - Route is inside the authenticated (`verified`) middleware group alongside the rest of onboarding, no extra authorization needed since it's fixed dummy content, not user data.
- Frontend: in `Wizard.tsx` step-3 grid (`:284-312`), add `onDoubleClick` to each template `<button>` that opens the existing `Components/Modal.tsx` with an `<iframe>` pointed at `route('onboarding.template-preview', t)`, sized larger (e.g. full modal width, ~80vh height) than the `h-28` thumbnail.
  - Works for locked templates too — it's a preview, not a selection; single-click still gates locked templates behind the upgrade flow as today.
  - Modal closes on backdrop click / an explicit close button, matching `Modal.tsx`'s existing API.

### Out of scope

- No new dummy dataset — reuses `SampleResume::data()` as-is.
- No changes to template selection/locking logic.

## Item 3 — dashboard first-resume nudge

### Design

- No backend change: `AnalyticsController::index` already computes and passes `resumeCount` to `Dashboard.tsx`.
- `Dashboard.tsx`: when `resumeCount === 0`, render a `Modal` (reusing `Components/Modal.tsx`) on mount with a short message ("You haven't created a resume yet") and a link/button to `route('builder.index')`.
- Persistence: shows on every dashboard visit while `resumeCount === 0` (per user decision — simplest option, no new column/flag). Dismissing the modal just closes it for that page load; it reappears next visit until a resume exists. Naturally stops once `resumeCount > 0`.

### Out of scope

- No "don't show again" flag/column.
- No changes to `AnalyticsController` or resume counting logic.

## Testing

- Feature test: `OnboardingController::templatePreview` returns a PDF (content-type `application/pdf`) for a valid template key and 404s for an invalid one, for an authenticated user.
- Frontend: manual check that double-click opens the modal/iframe for both locked and unlocked templates, and that single-click behavior is unchanged.
- Dashboard: feature test asserting the `Dashboard` Inertia response still includes `resumeCount`; manual/component check that the modal renders when `resumeCount === 0` and not otherwise.
