# Onboarding Template Preview + Dashboard First-Resume Nudge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-07-08-onboarding-preview-and-dashboard-nudge-design.md`

**Goal:** Two independent, additive UX changes:
1. Double-clicking a template thumbnail in the onboarding wizard (`Wizard.tsx` step 3) opens a modal with a full-size PDF preview of that template rendered with fixed dummy data — the existing `h-28` thumbnails are too small to evaluate.
2. First-time users who reach the Dashboard with zero resumes see a modal telling them to create their first resume, linking to the builder.

Item 1 from the original request (LinkedIn URL required) needs no code change — already `nullable` end-to-end; confirmed and communicated to the user.

**Context (verified current state):**
- `Wizard.tsx` step 3 already renders the 9-template grid with single-click select/lock logic (`resources/js/Pages/Onboarding/Wizard.tsx:284-312`) — this plan only adds `onDoubleClick` + a preview modal, no change to selection/lock behavior.
- `App\Data\SampleResume::data()` — fixed dummy resume content, already used by `GenerateTemplateThumbnails` to render the static thumbnail PNGs.
- `App\Console\Commands\GenerateTemplateThumbnails::TEMPLATES` — canonical 9 template keys array.
- `ResumeBuilderController::buildPdf(Resume $resume)` (private, line 322) renders `resume-pdf` view via `Pdf::loadView(...)->setPaper('letter','portrait')`; only reads content/style attributes + safe-navigated `$resume->user` — works on an unsaved, in-memory `Resume`.
- `Dashboard.tsx` already receives `resumeCount` as a prop (`resources/js/Pages/Dashboard.tsx:12,53`) from `AnalyticsController` — no backend change needed for item 2 here.
- `Components/Modal.tsx` — existing `show`/`onClose`/`maxWidth`/`closeable` API to reuse for both modals.

**Tech Stack:** Laravel 13, PHP 8.4, Inertia v2, React 18/TS, DomPDF.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `app/Http/Controllers/OnboardingController.php` | Add `templatePreview(string $template)` action |
| Modify | `routes/web.php` | Register `GET /onboarding/template-preview/{template}` |
| Modify | `resources/js/Pages/Onboarding/Wizard.tsx` | `onDoubleClick` per template + preview modal (iframe) |
| Modify | `resources/js/Pages/Dashboard.tsx` | First-resume nudge modal when `resumeCount === 0` |
| Modify | `tests/Feature/OnboardingTest.php` | Cover new preview route |

---

## Task 1: Backend — template preview route

- [ ] In `OnboardingController.php`, add imports: `App\Data\SampleResume`, `App\Models\Resume`, `App\Console\Commands\GenerateTemplateThumbnails`, `Barryvdh\DomPDF\Facade\Pdf`.
- [ ] Add method:
  ```php
  public function templatePreview(string $template)
  {
      abort_unless(in_array($template, GenerateTemplateThumbnails::TEMPLATES, true), 404);

      $resume = new Resume(SampleResume::data());
      $resume->template = $template;

      return Pdf::loadView('resume-pdf', ['resume' => $resume, 'watermark' => false])
          ->setPaper('letter', 'portrait')
          ->stream('preview.pdf');
  }
  ```
- [ ] In `routes/web.php`, add inside the same authenticated group as the other `onboarding.*` routes: `Route::get('/onboarding/template-preview/{template}', [OnboardingController::class, 'templatePreview'])->name('onboarding.template-preview');`

## Task 2: Frontend — double-click preview modal

- [ ] In `Wizard.tsx`, add `import Modal from '@/Components/Modal';` and state: `const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);`
- [ ] On each template `<button>` (step 3 grid), add `onDoubleClick={(e) => { e.preventDefault(); setPreviewTemplate(t); }}` — locked templates get the same handler (preview isn't gated, only selection is).
- [ ] After the grid, render:
  ```tsx
  <Modal show={previewTemplate !== null} onClose={() => setPreviewTemplate(null)} maxWidth="2xl">
      <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">
                  {previewTemplate && TEMPLATE_LABELS[previewTemplate]}
              </span>
              <button type="button" onClick={() => setPreviewTemplate(null)} className="text-sm text-gray-400 hover:text-gray-600">Close</button>
          </div>
          {previewTemplate && (
              <iframe
                  src={route('onboarding.template-preview', previewTemplate)}
                  className="h-[80vh] w-full rounded border border-gray-200"
                  title="Template preview"
              />
          )}
      </div>
  </Modal>
  ```
- [ ] Verify single-click select/lock behavior is unchanged (locked click still calls `triggerUpgradeModal`, unaffected by the new `onDoubleClick`).

## Task 3: Frontend — dashboard first-resume nudge

- [ ] In `Dashboard.tsx`, add `import Modal from '@/Components/Modal';` and `const [showNudge, setShowNudge] = useState(resumeCount === 0);`
- [ ] Render near the top of the page body:
  ```tsx
  <Modal show={showNudge} onClose={() => setShowNudge(false)} maxWidth="md">
      <div className="p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900">Create your first resume</h2>
          <p className="mt-2 text-sm text-gray-500">You haven't created a resume yet — build one to start tracking views and applications.</p>
          <Link href={route('builder.index')} className="mt-4 inline-block rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
              Create a resume
          </Link>
      </div>
  </Modal>
  ```
- [ ] No persistence/flag — re-derives from `resumeCount` on every load, per spec.

## Testing

- [ ] `OnboardingTest`: authenticated GET to `onboarding.template-preview` with a valid template key (e.g. `modern`) returns 200 with `Content-Type: application/pdf`; an invalid key (e.g. `nonexistent`) returns 404.
- [ ] Run `php artisan test --filter=OnboardingTest`.
- [ ] Manual/browser check: double-click opens the iframe preview modal for both a locked and unlocked template in the wizard; single-click select/lock behavior unchanged; Dashboard shows the nudge modal only when `resumeCount === 0` and the "Create a resume" link goes to `builder.index`.

## Rollout

Purely additive: one new GET route (no user data, fixed dummy content, safe to leave unauthenticated-gate as just `verified` like its siblings) and two new frontend modals gated on existing props (`resumeCount`) or explicit user interaction (double-click). No migrations, no billing/AI changes, no changes to existing selection/lock or analytics logic.
