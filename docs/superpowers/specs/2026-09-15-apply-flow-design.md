# Apply flow — design

**Status:** Approved in brainstorming, not started
**Date:** 2026-09-15
**Supersedes (partially):** the 2026-09-10 decision that generative Workstation AI stays unrouted. The user explicitly asked on 2026-09-15 to re-route AI rewriting behind the credit ledger.

## Why

The data model already supports the job-search loop (a `JobApplication` links to a `Resume`; a resume holds `target_job_description`; a `ResumeGroup` holds tailored versions), but no surface walks the user through it. Today the user has to know to duplicate a resume, paste a JD into Optimize, export, autofill via the extension, then separately add a Kanban card and pick the resume from a dropdown. The five sidebar sections read as five silos.

Competitor trackers (Teal, Huntr, Simplify) make the *job* the unit: save the job with its JD once, tailor a resume to it, apply, log the stage, get follow-up reminders. Resumegen keeps the resume as a first-class unit too, so both entry points are equal.

## Decisions taken in brainstorming

1. **Both units are primary.** Dashboard shows "New resume" and "Add job" as equal CTAs. The user decides.
2. **Adding a job with a base resume creates a new tailored version**, never modifies the base in place. Base is picked at job-add time (dropdown, default most recently updated). AI proposes changes shown as Accept/Discard; nothing is written until accepted. Without AI credits the user is pointed at the Optimize panel to tailor manually.
3. **AI scope offered as options:** Narrow (summary, reorder/emphasize existing bullets and skills) and Wide (Narrow plus reword bullets and propose JD-required skills). Per-section and per-bullet prompts also exist.
4. **Canned prompt library is curated only**, shipped in code. No user-authored prompts.
5. **Shares stays top-level nav**, untouched here. It is a key selling point and will grow separately.
6. **Guided wizard exists for first-timers** and can be skipped at every step; a user preference decides which entry the CTA opens.

## Section 1 — Entry points and navigation

- Sidebar unchanged: Dashboard, Resumes, Shares, Applications, Profile.
- Dashboard top: two equal primary CTAs, **New resume** (existing modal, unchanged) and **Add job**.
- **Add job** opens the modal in Section 2. The same modal is reachable from the Kanban "Add" button. The extension's "Save to tracker" posts to the same endpoint without a modal.
- **Wizard** at `/apply/new`: four steps (Job, Resume, Tailor, Review). Every step has "Skip wizard", which drops into the plain modal with values carried over.
- **Preference** `users.prefers_apply_wizard` (boolean, default `true`). The Dashboard "Add job" CTA opens the wizard while true, the modal while false. Completing the wizard once, or clicking "Skip wizard", sets it false. The modal footer has a "Use wizard" link; the Profile page has a toggle to turn the preference back on.
- The existing onboarding wizard is untouched.

## Section 2 — Add job flow and data

### Modal fields

| Field | Rules |
|---|---|
| company, role | required, as today (`StoreJobApplicationRequest`) |
| job_url | optional, as today |
| job_description | optional textarea, `max:10000` (matches `App\Data\ResumeRules`) |
| base_resume_id | optional; dropdown of the user's resumes, default most recently updated, plus "None, track only" |
| tailor_with_ai | boolean; shows cost and current balance. Disabled (never hidden) with a Subscribe or Buy credits link when not subscribed or out of credits |
| tailor_mode | `narrow` or `wide`, shown when `tailor_with_ai` is on |

### Server

`POST /job-applications` is extended. `StoreJobApplicationRequest` gains the optional fields above. Steps, in one request:

1. Create the `JobApplication` with status `saved` and log the status event. Existing behavior.
2. If `base_resume_id` is present: verify ownership (404 otherwise), duplicate it with the same logic as `ResumeController::duplicate` (sibling in the same `ResumeGroup`), title `"{Company} – {Role}"`, set `target_company`, `target_role`, `target_job_description`. Set `job_applications.resume_id` to the new version.
3. If `tailor_with_ai` is on and the gate passes (`subscribed('default')`, balance ≥ cost, not `users.ai_blocked`): reserve the credit and dispatch `TailorResumeJob`. If the gate fails the card and version are still created; the response carries the existing 402/429 convention as a flash message, not an abort.
4. Redirect to the Workstation of the new version, or to the Kanban when no resume was chosen.

`POST /api/extension/job-applications` (ability `extension`) accepts the same optional fields and runs the same code path.

### New table `resume_ai_suggestions`

| Column | Notes |
|---|---|
| id | |
| resume_id | FK, cascadeOnDelete |
| job_application_id | nullable FK, nullOnDelete |
| prompt_key | matches a key in `config/ai-prompts.php` |
| target_type | `resume`, `section`, `item` |
| target_section | nullable, one of `Resume::SECTIONS` |
| target_item_id | nullable |
| original | json |
| proposed | json |
| status | `pending`, `accepted`, `discarded` |
| cost | integer credits charged for the pass this row belongs to |
| batch_id | uuid grouping rows from one pass |
| timestamps | |

One row per proposed change. Credits are debited once per batch after a successful model response, per the ledger convention.

### FK check

`job_applications.resume_id` must be `nullOnDelete` so deleting a resume leaves the card. If it currently cascades, change it in the migration for this feature.

## Section 3 — AI tailoring and canned prompts

### Prompt catalogue `config/ai-prompts.php`

Curated, code-only. Each entry: `key`, `label`, `description`, `scope` (`resume` | `section` | `item`), `cost` (integer credits), `system`, `template`. Shipped set:

| key | scope | cost | behavior |
|---|---|---|---|
| `tailor.narrow` | resume | 1 | rewrite summary; reorder and emphasize existing bullets and skills to match the JD. No new facts. |
| `tailor.wide` | resume | 2 | narrow plus reword bullets; propose JD-required skills flagged "confirm you have this" |
| `quantify` | section, item | 1 | add measurable outcomes where the text implies them; never invent numbers |
| `concise` | section, item | 1 | tighten wording, keep facts |
| `jd-tone` | section, item | 1 | match vocabulary and tone of the stored JD |
| `stronger-verbs` | item | 1 | replace weak leading verbs |

Costs live in config, never in controllers.

### Runtime

- `TailorResumeJob` (queued) for `resume`-scope prompts; synchronous `POST /resumes/{resume}/ai/{promptKey}` for `section` and `item` scope (body: `section`, `item_id`).
- Both call one `AiSuggestionService::run()` which: applies the gate, reserves the credit inside a DB transaction, calls OpenAI through the existing `AiService`, validates the JSON response against the resume shape, strips any field outside the expected set, caps lengths with `ResumeRules`, writes `resume_ai_suggestions` rows, commits the debit. Failure at any step releases the reservation and writes nothing.
- `GET /resumes/{resume}/ai/suggestions` returns pending rows. `PATCH /resume-ai-suggestions/{suggestion}` with `status` accepted or discarded. Accept writes through the normal `resumes.update` path so the autosave snapshot is taken first.
- The orphaned `AiService::reviewResume` and `rewriteSection` are folded into this service or deleted. Nothing stays dangling.
- Model output is untrusted data. Suggestions are stored, never executed, and only the fields the resume schema allows are written on accept.

### Workstation UI

- "AI" button in the header, and a sparkle menu on each section header and each bullet, listing the prompts allowed for that scope with cost. Disabled with an upsell when gated.
- **Review panel**: pending suggestions grouped by section, original beside proposed, Accept / Discard per row, "Accept all". Nothing changes until accepted.
- While a queued job runs the panel shows "Tailoring…" and polls the suggestions endpoint every few seconds until rows appear or a failure is reported.
- **No-credits path**: the Optimize panel gets a "Tailor with AI" card with cost and Subscribe/Buy CTA above the existing missing-keywords list.

## Section 4 — Cross-links, Dashboard "Next up", wizard

### Cross-links

- **Kanban card**: shows the linked resume title and score with "Open resume". A card without a resume gets "Attach resume" (existing dropdown) and "Create tailored version" (opens the Add-job modal prefilled, resume step only).
- **Workstation header**: when any `job_applications.resume_id` points at this resume, show a "Company – Role · Status" chip linking to the Kanban with that card highlighted (`?highlight={id}`). Status can be changed from the chip via the existing `job-applications.update`.
- **Compare page**: version rows show the linked application status so the user can see which tailored version converted.

### Dashboard "Next up" strip

Server-computed in `DashboardController` as a deferred prop. Items, each linking to the exact card or Workstation panel:

- follow-ups due today or overdue (`follow_up_at <= today`, status `saved` or `applied`)
- interviews in the next 7 days (`job_application_interviews.scheduled_at`)
- cards with no resume attached
- pending AI suggestions awaiting review

Empty strip is hidden.

### First-week checklist

Dashboard, dismissible, stored in `users.dismissed_checklist_at`. Steps computed from existing data, no new tracking table: starter profile filled, first resume built, extension connected (any token with the `extension` ability exists), first job added, first application marked Applied.

### Wizard

`ApplyWizardController`, page `Apply/Wizard.tsx`, route `GET /apply/new`. Steps Job, Resume, Tailor, Review. Final submit posts to the same `POST /job-applications`. "Skip wizard" on every step opens the modal with the current values and sets `prefers_apply_wizard = false`.

The Stats page is untouched.

## Section 5 — Errors, testing, scope

### Errors

- AI job fails or times out: no suggestion rows, no debit, the Workstation panel shows "Tailoring failed, no credits charged" with Retry. The job retries twice, then logs.
- Malformed model JSON is a failure. Never partial-apply.
- Gate + spend race: reserve the credit in a DB transaction before the model call, release on failure. This closes the deferred race in `docs/UNFORGET.md`.
- Base resume deleted while a card points at it: `resume_id` becomes null (see FK check in Section 2).

### Tests (Pest feature tests on SQLite unless noted)

- Add job creates the card, a sibling version in the same group, JD and target fields set, `resume_id` linked. With and without a base resume. Foreign `base_resume_id` is 404.
- Gate: not subscribed 402, no credits 402, `ai_blocked` 429; card and version are still created in each case.
- `TailorResumeJob` with a faked OpenAI client: suggestion rows written, exactly one debit, malformed response writes nothing and debits nothing, reservation released on failure.
- Accept writes the resume and takes a snapshot first; discard leaves the resume untouched. Foreign resume or suggestion is 404.
- Prompt config: every entry has key, label, scope, positive cost; unknown prompt key is 404; scope mismatch is 422.
- Dashboard next-up: follow-up due, interview upcoming, unattached card, pending suggestion each appear; none appear when empty.
- Extension endpoint accepts the new fields and requires the `extension` ability.
- Wizard renders, skip sets the preference, submit lands on the Workstation.
- Vitest: suggestion grouping by section, checklist step computation.
- Live browser verification of the modal, wizard, review panel, and cross-links before the feature is called done, per the project verification policy.

### Out of scope, unchanged

Shares page and share links, auto-apply (UNFORGET P4), cover letters, chat coach, user-authored prompts, Stats page, onboarding wizard, mobile API.

### Docs to update when shipped

- `CLAUDE.md` AI section: rewrite is re-routed and metered through `resume_ai_suggestions`; the "do not re-expose" note becomes history.
- `docs/UNFORGET.md`: the gate + spend race item.
- `PRODUCT.md`: apply flow, Add job, wizard, prompt library.
