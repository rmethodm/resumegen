# Viewer-Engagement Upsell Email — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send free-tier users a periodic email when their shared resume gets viewed, surfacing the engagement data that already exists (`resume_share_events`, `resume_section_events`) but is currently silent unless the user manually opens the Dashboard. The email teases richer detail (which section recruiters spent the most time on) as a Starter-tier upsell.

**Context (already exists, do not rebuild):**
- `resume_share_events` (page_view/pdf_download/question_submitted) and `resume_section_events` (per-section dwell time) are already recorded via `PublicResumeController` and `SectionEventController`.
- `AnalyticsController` already aggregates and surfaces this on `Dashboard.tsx` for all tiers — that stays free and ungated (per `2026-06-14-freemium-conversion-tuning-design.md`, analytics is deliberately part of the free product). **Do not gate the Dashboard analytics section in this plan.**
- `app/Console/Commands/NudgeStaleResumesCommand.php` + `app/Mail/StaleResumeNudgeMail.php` is the existing pattern for a scheduled digest email — follow its structure exactly (queued Mailable, cooldown column on `users`, `emails.*` Blade view).

**What's new here:** a second scheduled command that looks at *view activity* (not staleness) and, only for free-tier users who had at least one new view since the last email, sends a "N people viewed your resume this week" email with a Starter upsell CTA. Pro/Agency/Starter users are excluded — they already get this in the Dashboard and don't need the nudge.

**Tech Stack:** Laravel 13, PHP 8.4, SQLite, Mailables, `laravel/scheduler`.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `database/migrations/2026_07_08_100000_add_view_nudge_sent_at_to_users_table.php` | Cooldown column |
| Create | `app/Console/Commands/NudgeResumeViewsCommand.php` | Weekly scan + send |
| Create | `app/Mail/ResumeViewNudgeMail.php` | Mailable |
| Create | `resources/views/emails/resume-view-nudge.blade.php` | Email body |
| Modify | `routes/console.php` (or wherever `resumes:nudge-stale` is scheduled) | Register weekly schedule |
| Create | `tests/Feature/Console/NudgeResumeViewsCommandTest.php` | Coverage |

---

## Task 1: Migration — cooldown column

- [x] **Step 1:** `php artisan make:migration add_view_nudge_sent_at_to_users_table --table=users`
- [x] **Step 2:** Add nullable `timestamp('view_nudge_sent_at')->nullable()` in `up()`, drop in `down()`.
- [x] **Step 3:** `php artisan migrate`.

## Task 2: `NudgeResumeViewsCommand`

- [x] **Step 1:** `php artisan make:command NudgeResumeViewsCommand`, signature `resumes:nudge-views`.
- [x] **Step 2:** Query: free-tier users (`plan_tier` free / not `isAtLeastStarter()`) who have a `ResumeShareEvent` with `event = 'page_view'` and `created_at` after `GREATEST(users.view_nudge_sent_at, now()->subDays(7))` (i.e. new views since last email, capped to a 7-day lookback window so a long-dormant account doesn't suddenly get a huge stale count). Use existing eager-loading conventions (`->with('resumes')`) to avoid N+1 — mirror `NudgeStaleResumesCommand`'s query shape.
- [x] **Step 3:** For each qualifying user, compute: total new view count, and (if `resume_section_events` present) the single section with the highest total `dwell_ms` across those events — this becomes the "recruiters spent the most time on your {section}" teaser line.
- [x] **Step 4:** Skip users with zero qualifying resumes (no query match) — no email, no timestamp update.
- [x] **Step 5:** `Mail::to($user->email)->queue(new ResumeViewNudgeMail($user, $viewCount, $topSection))`; update `view_nudge_sent_at = now()`.
- [x] **Step 6:** Register in the scheduler weekly (`->weekly()`), same file/pattern as `resumes:nudge-stale`.

## Task 3: `ResumeViewNudgeMail`

- [x] Follow `StaleResumeNudgeMail` exactly: `ShouldQueue`, `Queueable, SerializesModels`, constructor-promoted `public readonly` props (`User $user`, `int $viewCount`, `?string $topSection`), `envelope()` subject e.g. `"Your resume got {$viewCount} views this week"`, `content()` → `emails.resume-view-nudge` view with `with([...])`.

## Task 4: Email view

- [x] `resources/views/emails/resume-view-nudge.blade.php` — match existing email layout/branding (check `emails.stale-resume-nudge` for the shared layout component). Body: view count, optional "spent the most time on your {section}" line, CTA button linking to Dashboard, and a secondary CTA "Upgrade to Starter to see who's viewing and remove the watermark" linking to `billing.index`.

## Testing

- [x] `NudgeResumeViewsCommandTest`: free user with new views since last send → mail queued, `view_nudge_sent_at` updated; free user with zero new views → no mail; Starter/Pro/Agency user with views → no mail (excluded by tier); cooldown respected (re-running same day doesn't double-send once `view_nudge_sent_at` is fresh).
- [x] Assert email content includes view count and (when present) top-section line via `Mail::assertQueued(ResumeViewNudgeMail::class, fn ($mail) => ...)`.

## Rollout

No new tables, no Stripe/AI config changes. Additive migration + command + Mailable, mirrors an existing shipped pattern almost exactly — low risk.
