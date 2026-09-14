# JobNavigator Tier-1 Import — Design

Date: 2026-09-14
Status: Design approved, not yet implemented

## Background

`vesaias/JobNavigator` is a self-hosted job-hunt automation tool (Python/FastAPI) with scraping, AI resume/job scoring, cover-letter generation, application tracking, autofill, and alerting. A survey of its feature set was ranked by fit against this app's existing architecture. This spec covers the four highest-value, most-compatible items ("Tier 1"):

1. Persona Q&A bank for application autofill (with AI-drafted answers)
2. Interview scheduling + notes on the Job Application Kanban
3. Funnel/Sankey stats on job applications
4. Cron/scheduling UI for backup/queue visibility

Two of these directly reopen decisions this codebase made deliberately:

- **Interview notes**: `JobApplicationController`'s docblock states explicitly — "Contact management and interview notes are NOT part of this — those were removed features and stay out of scope (see CLAUDE.md 'Removed Features')." This spec reopens that, at the user's explicit request, with a full multi-interview log (not a single field).
- **Cron/scheduling UI**: any UI that edits scheduled commands is inherently an admin/ops surface. The prior hand-rolled admin panel (`users.is_admin`, `EnsureUserIsAdmin`, `routes/admin.php`, `AdminActionLog`, `site_visits`, etc.) was removed 2026-09-02 with an explicit "do not reintroduce an admin surface without asking first." This spec reintroduces a **narrow** admin surface (schedule management only) at the user's explicit request — it does not resurrect the old Users/Visitors/Database sections, `AdminActionLog`, or `site_visits` tracking.

## Existing state (read before implementing)

- `app/Models/JobApplication.php`: `status`, single `notes` text field, `follow_up_at` date, `resume_id`. No interview fields.
- `app/Http/Controllers/JobApplicationController.php`: inline ownership checks (`abort_unless($jobApplication->user_id === $request->user()->id, 404)`), no policy class — matches this codebase's convention everywhere.
- `app/Http/Controllers/AnalyticsController.php`: feeds the Dashboard only; queries `job_applications` via `DB::table()` directly (comment: "job_applications has no Eloquent model (feature dark)" — stale, a model exists now, but the raw-query pattern is intentional there and worth reusing for new dark/append-only tables).
- `app/Models/StarterProfile.php` (`hasOne` off `User`): scalar contact fields + `skills`/`experience_snapshot` JSON columns. No Q&A structure.
- `app/Http/Controllers/Api/ExtensionController.php` + `app/Support/ResumeFillProfile.php`: token-gated (`extension` ability) JSON API for the browser extension. `ensureExtensionToken()` checks `$token->can(ResumeFillProfile::TOKEN_ABILITY)`.
- AI credit gating: `subscribed('default')` + balance ≥ cost + not `ai_blocked` → 402 (not subscribed/insufficient) or 429 (`ai_blocked`); debit `ai_credit_ledger` after a successful model response. See CLAUDE.md "AI — subscription credit gates."
- Backup schedule is hardcoded in `routes/console.php` (`Schedule::command(...)->dailyAt(...)`). No DB-backed config, no UI.
- Migrations in this repo are forward-only; rollback is explicitly unsupported (`migrate:fresh --seed` only). All new tables below are additive-only.

## Phasing

Five phases, each independently shippable and testable, in dependency order:

- **Phase A** — job application status history (foundation for Phase C)
- **Phase B** — interview log
- **Phase C** — funnel/Sankey stats (depends on Phase A)
- **Phase D** — persona Q&A bank + AI-drafted answers
- **Phase E** — admin reintroduction + cron/scheduling UI (largest, most sensitive; sequenced last)

Recommend five separate implementation plans, one per phase, rather than one combined plan.

## Phase A — Job application status history

- New table `job_application_status_events`: `id`, `job_application_id` (FK, `cascadeOnDelete`), `from_status` (nullable — null on initial creation), `to_status`, `created_at` only (append-only, no `updated_at` — same shape as `resume_share_link_views`).
- `JobApplicationController::store()` writes one row on creation (`from_status = null`, `to_status = $data['status'] ?? 'saved'`).
- `JobApplicationController::update()` writes one row when `status` changes (compare before `$jobApplication->update()`; skip the write if `status` isn't part of the diff).
- No Eloquent model — write via `DB::table('job_application_status_events')->insert(...)`, matching `AnalyticsController`'s existing raw-query convention for this kind of dark analytics table.
- No new endpoint this phase — pure plumbing for Phase C.

**Tests**: a status change on an existing application produces exactly one event row with the correct `from_status`/`to_status`; creating an application produces one row with `from_status = null`.

## Phase B — Interview log

- New table `job_application_interviews`: `id`, `job_application_id` (FK, `cascadeOnDelete`), `round` (int, unique per `job_application_id`), `scheduled_at` (nullable datetime), `type` (string, free text — e.g. phone/video/onsite/technical/other; not an enum column, to avoid a migration per new type), `notes` (nullable text), timestamps.
- New `JobApplicationInterview` model (`hasMany` off `JobApplication`) — this one is a real Eloquent model (unlike Phase A's dark table) since it's user-facing CRUD.
- Kanban card gets an expandable "Interviews" section — add/edit/delete rounds inline, same list-editor interaction pattern as the existing bullets/experience editors.
- New routes, nested under the same inline ownership check pattern (no policy class): `POST/PATCH/DELETE /job-applications/{jobApplication}/interviews/{interview?}`.
- `JobApplicationController::present()` gains an `interviews` key, ordered by `round`.
- The existing single `notes` field on `JobApplication` is unchanged — it remains general application notes, distinct from per-interview notes.

**Tests**: CRUD scoped to owner; 404 on cross-user access; Kanban payload includes ordered interview list.

## Phase C — Funnel/Sankey stats

- New page `Jobs/Stats.tsx`, route `GET /job-applications/stats` (name `job-applications.stats`), linked from the Kanban header. Separate from the Dashboard (resume-centric) rather than bolted onto it.
- New `JobApplicationStatsController@index`: reads `job_application_status_events` joined to the requesting user's `job_applications`, returns (a) a from→to transition count matrix for the Sankey (source/target/value triples) and (b) a current-state funnel (count per status, ordered Saved → Applied → Interviewing → Offer → Rejected).
- Scope: per-user, all-time (no date-range filter, no export) for v1.
- Charting library: confirm at implementation time whether an existing charting dependency is already in `package.json` and reuse it; only add a new one if none exists.

**Tests**: seed an application through several status transitions; assert the stats endpoint returns correct transition counts and funnel counts, scoped to the requesting user only.

## Phase D — Persona Q&A bank + AI-drafted answers

- New table `qa_bank_entries`: `id`, `starter_profile_id` (FK, `cascadeOnDelete`), `question` (text), `answer` (text, nullable), `position` (int, manual ordering), timestamps.
- New `QaBankEntry` model, `hasMany` off `StarterProfile`.
- Settings UI: new section on `Settings/StarterProfile.tsx` — add/edit/delete/reorder rows, matching the existing skills/experience list-editor pattern on that page.
- **AI drafting endpoint**: `POST /settings/starter-profile/qa-bank/{entry}/draft` — generates a draft answer from the question + the user's `StarterProfile` + primary resume content. Gated identically to the existing AI system: `subscribed('default')` + balance ≥ cost + not `ai_blocked`, using the existing `AiService`/`ai_credit_ledger` plumbing (no parallel gating system). Cost added alongside other AI action costs in `config/ai.php`. Draft is written into `answer` as an editable suggestion, never auto-saved silently.
- **Extension surfacing (server-side matching)**:
  - `GET /api/extension/qa-bank/match?question=...` (ability `extension`, same token gate as the rest of `ExtensionController`) — server does fuzzy matching (normalized string similarity, e.g. trigram/Levenshtein) against the user's `qa_bank_entries.question`, returns the best match's `answer` or `null` + close candidates. Matching logic lives server-side so it can improve without an extension redeploy.
  - `GET /api/extension/qa-bank` — full list, for a "browse saved answers" fallback in the extension side panel when no confident match is found.

**Tests**: CRUD scoped to owner; AI draft endpoint enforces the credit gate (402 unsubscribed/insufficient, 429 blocked) and debits the ledger on success; match endpoint returns the correct entry for near-duplicate phrasing and `null` for no match, scoped to the token's own user.

## Phase E — Admin reintroduction + cron/scheduling UI

Narrow reintroduction — schedule management only, not a resurrection of the old admin panel's other sections.

- New migration adding `users.is_admin` (boolean, default false — forward-only, no backfill needed).
- New `EnsureUserIsAdmin` middleware and a fresh `routes/admin.php` route group scoped to schedule management only. No 2FA/idle-timeout middleware stack this phase (that was specific to the old admin's broader surface) — revisit separately if wanted.
- New table `scheduled_task_configs`: `id`, `command` (string), `cron_expression` (string), `enabled` (boolean), timestamps. `routes/console.php` is rewritten to loop over this table's enabled rows and register each via `Schedule::command($row->command)->cron($row->cron_expression)`, instead of hardcoding each `Schedule::command(...)->dailyAt(...)` call. A migration seeds the table with the current three backup commands + their existing schedule so behavior is unchanged on deploy.
- New `Admin\ScheduleController`: `index` (list configs + next-run estimate per row, computed from the cron expression), `update` (edit `cron_expression`/`enabled` for a row). Editable, not read-only-status, per the approved design.
- Cron field-level "explain" is a small self-contained utility (parse a 5-field cron string into a human sentence) — no new dependency.

**Tests**: non-admin user gets 403 on all `/admin/*` routes; admin can list and edit schedule rows; editing a row's `cron_expression` changes what `routes/console.php` registers on the next scheduler run; seeded rows preserve the exact current backup timing (01:00/01:30/01:45) so the migration doesn't silently change production behavior.

## Cross-cutting

- All new tables are additive-only — no drops/renames on existing tables, consistent with this repo's forward-only migration policy.
- `./vendor/bin/pint` on all touched PHP before finalizing, per project convention.
- Per CLAUDE.md's Verification Policy: each phase's UI (interview log, Q&A bank settings, funnel stats page, admin schedule UI) gets a real click-through in the running app before being called done — not just passing tests.

## Explicitly out of scope (not reopened by this spec)

- Job board scraping/aggregation, career-page ATS scraping, LinkedIn capture — still out of scope; a much larger, separately-scoped decision.
- Cover letter generation — still removed; not reopened here.
- The old admin panel's Users/Visitors/Database sections, `AdminActionLog`, `site_visits` tracking — stay gone.
- Gmail integration, Telegram alerts, salary/H-1B extraction — not part of Tier 1.
