# Batch 5: Personalization & Conversion — Design Spec

**Date:** 2026-06-07  
**Batch theme:** Personalization & Conversion  
**Stack:** Laravel 13, PHP 8.4, React 18, TypeScript, Tailwind CSS v3, Inertia v2, SQLite, PHPUnit 12

---

## Overview

Four features that deepen engagement through personalization, close gaps in the job search workflow, and drive Pro conversions.

1. **Resume Freshness Nudges** — scheduled email reminding users to update stale resumes
2. **Profile Photo Support** — upload headshot, display in sidebar/creative/executive templates
3. **Application Funnel Analytics** — visual conversion funnel on Jobs dashboard
4. **Salary Negotiation Scripts** — Pro-gated AI email when job moves to Offer status

---

## Feature 1: Resume Freshness Nudges

### Goal
Send a weekly email to users whose resume(s) haven't been edited in 30+ days. Re-engages dormant users. One email per user per week max, even if multiple resumes are stale.

### Backend

**Artisan command:** `php artisan resumes:nudge-stale`

Logic:
1. Find all users with at least one resume where `updated_at < now()->subDays(30)` AND `is_snapshot = 0`
2. Group by user — only send one email per user
3. For each user, pick the most-recently-updated stale resume
4. Check `stale_nudge_sent_at` on user — skip if < 7 days ago
5. Send `StaleResumeNudgeMail` (queued)
6. Update `users.stale_nudge_sent_at = now()`

**Migration:** Add `stale_nudge_sent_at` (nullable timestamp) to `users`.

**Mail:** `app/Mail/StaleResumeNudgeMail.php`
- Subject: "Time to refresh your resume, {name}"  
- Body: resume name, days since last edit, CTA button → `route('builder.edit', $resume->id)`
- Uses existing mail queue (already configured)

**Scheduler:** In `routes/console.php`, register `resumes:nudge-stale` to run `daily()`.

**Test:** `tests/Feature/StaleNudgeTest.php` — 5 tests:
1. Command sends mail for user with stale resume
2. Command skips user who was nudged < 7 days ago
3. Command skips user with no stale resumes (all updated < 30 days)
4. Snapshots are excluded (is_snapshot = 1)
5. One mail per user even if multiple resumes are stale

---

## Feature 2: Profile Photo Support

### Goal
Users can upload a headshot (JPEG/PNG, max 2 MB). Displayed in sidebar, creative, and executive PDF templates. Stored via spatie/laravel-medialibrary (already installed and migrated).

### Backend

**Model changes:** `Resume` implements `HasMedia` via `InteractsWithMedia` trait. Media collection: `'photo'` (single file, image type, max 2 MB).

**Endpoints:**
- `POST /builder/{resume}/photo` → `ResumePhotoController@store` — accept `photo` file, add to media collection `'photo'`, clears previous
- `DELETE /builder/{resume}/photo` → `ResumePhotoController@destroy` — delete from media collection
- Both gate on `authorize('update', $resume)`

**PDF rendering:** In `resume-pdf.blade.php`, for sidebar/creative/executive templates: check `$photoUrl = $resume->getFirstMediaUrl('photo')`. If present, embed as base64 data URI (required for DomPDF — `file_get_contents($resume->getFirstMedia('photo')->getPath())`). Render as small circular/square image in the top-left of the template.

**Props:** `ResumeBuilderController@edit` passes `photoUrl` (string|null) to `Edit.tsx`.

**Test:** `tests/Feature/ResumePhotoTest.php` — 6 tests:
1. Upload stores photo in media collection
2. Upload replaces previous photo (only 1 remains)
3. Delete removes photo
4. Non-owner cannot upload (403)
5. Invalid file type returns 422
6. File exceeding 2 MB returns 422

### Frontend

**`Edit.tsx`** — In the template/design sidebar section, add a "Photo" subsection:
- Circle avatar showing `photoUrl` if set, or placeholder icon
- "Upload Photo" button (file input, accept image/\*, max 2 MB)
- "Remove" link if photo exists
- `router.post(route('builder.photo.store', resume.id), formData)` with `forceFormData: true`
- Only shown when template is `sidebar`, `creative`, or `executive`

---

## Feature 3: Application Funnel Analytics

### Goal
Show a horizontal funnel chart on the Jobs index page showing how many applications are in each status, with conversion rates between stages. Gives users insight into their job search pipeline health.

### Data

Statuses (from `JobApplication::STATUSES`): `saved`, `applied`, `phone_screen`, `interview`, `offer`, `rejected`.

The funnel shows: Applied → Phone Screen → Interview → Offer. `Saved` and `Rejected` displayed as side stats, not in the main funnel.

### Backend

`JobApplicationController@index` already queries all user's jobs. Extend the Inertia props to include `funnelStats`:

```php
$funnelStats = $jobs->groupBy('status')->map->count();
```

Pass as prop: `funnelStats` — an object keyed by status with integer counts.

No new endpoint needed — extend existing `index()` props.

### Frontend

**`resources/js/Pages/Jobs/Index.tsx`** — Add a `FunnelChart` component above the job table/kanban toggle.

`FunnelChart` renders:
- A row of 4 stage bars: Applied / Phone Screen / Interview / Offer
- Each bar height proportional to count relative to max
- Conversion % shown between stages: "Phone Screen: 40% of Applied"
- Side stats: Saved (X), Rejected (X)
- Compact, max-height 140px, no external charting library — pure Tailwind CSS bars

**Test:** No new PHP tests needed (data comes from existing query). Add 1 test to `JobApplicationTest` verifying `funnelStats` is returned in index props.

---

## Feature 4: Salary Negotiation Scripts

### Goal
When a job application status is updated to `offer`, surface an AI-generated negotiation email template. Pro-only. User sees a dismissible card in `Jobs/Edit.tsx` when status is `offer`.

### Backend

**`NegotiationScriptController`** (`app/Http/Controllers/NegotiationScriptController.php`)
- Route: `POST /jobs/{job}/negotiation-script` (throttled 5/min)
- Auth: `authorize('update', $job)`
- Tier gate: Starter+ only (`UserLimits::canTailor($user)` — reuses same gate as job tailoring); free users get 402 with `required_tier: 'starter'`
- Accepts: `{ offered_salary: string (optional), target_salary: string (optional), role: string (auto from job) }`
- Prompt to Claude: generate a 150–200 word professional negotiation email based on role, current offer, and target. Return `{ email_body: string }`.
- No usage log (reuses `tailor` feature's upstream gate — keep it simple, or log as `negotiation`)
- Log to `ai_usage_logs` with `feature: 'negotiation'`

**`UserLimits`** — `canNegotiation(User $user): bool` → `$user->planTier() !== 'free'` (Starter+ only).

**`Edit.tsx` prop:** `canNegotiation` (bool) + `jobStatus` already available via `job.status`.

**Test:** `tests/Feature/NegotiationScriptTest.php` — 5 tests:
1. Pro user gets negotiation script (mock Claude response)
2. Free user gets 402 with `required_tier: 'starter'`
3. Non-owner gets 403
4. Missing role returns 422
5. Script logged to `ai_usage_logs`

### Frontend

**`Jobs/Edit.tsx`** — When `job.status === 'offer'` and `canNegotiation`:
- Show a dismissible amber "Offer received! 🎉" card below the status field
- "Generate Negotiation Script" button (Pro badge if `!canNegotiation`)
- On click: `axios.post(route('jobs.negotiation-script', job.id), { offered_salary, target_salary, role })` 
- Shows loading state, then renders the script in a textarea (copyable)
- Script stays until user dismisses or navigates away (no persistence)

**Free user UX:** "Generate Negotiation Script" button with lock icon; click triggers `triggerUpgradeModal('negotiation_script', 'starter')`.

---

## Test Summary

| Feature | New Tests | Total New |
|---|---|---|
| Freshness Nudges | 5 | 5 |
| Profile Photo | 6 | 6 |
| Funnel Analytics | 1 (added to existing) | 1 |
| Negotiation Scripts | 5 | 5 |
| **Total** | | **17** |

Starting count: 453 tests. Target: 470+ tests.

---

## Tier Gates Summary

| Feature | Free | Starter | Pro |
|---|---|---|---|
| Freshness Nudges | ✓ | ✓ | ✓ |
| Profile Photo | ✓ | ✓ | ✓ |
| Funnel Analytics | ✓ | ✓ | ✓ |
| Negotiation Scripts | ✗ (locked) | ✓ | ✓ |
