# Batch 11: Master Resume, Recruiter Heatmaps, Referral Rewards — Spec

**Date:** 2026-06-07
**Status:** Approved, ready for implementation

---

## Context

Batches 1–10 have shipped. Pre-build audit confirmed these features already exist with passing tests: view count badge, resume labels/tags, A/B testing (createVariant + AbCompare), resume comparison view, referral program UI + signup tracking. Batch 11 builds the three genuine gaps.

---

## Feature 1: Master Resume + Tailored Copies

### Goal

Allow users to designate one resume as a "master" and branch tailored copies from it. When the master is updated, copies show a stale indicator so the user knows to reconcile.

### Data Model

One migration adds three columns to `resumes`:

| Column | Type | Notes |
|---|---|---|
| `is_master` | boolean, default false | Any resume can be a master — no DB-level uniqueness per user |
| `master_resume_id` | nullable FK → `resumes`, nullOnDelete | Copies point to their master |
| `master_synced_at` | nullable timestamp | Last time this copy acknowledged the master's state |

### Routes

| Method | URI | Action |
|---|---|---|
| PATCH | `/builder/{resume}/set-master` | Toggle `is_master` on/off |
| POST | `/builder/{resume}/create-tailored-copy` | Duplicate + set `master_resume_id` on copy |
| PATCH | `/builder/{resume}/sync-master` | Set `master_synced_at = now()` (dismiss banner) |

All three require auth + `authorize('update', $resume)`.

### Controller Changes — `ResumeBuilderController`

**`index()`:** For each resume in the dashboard list, include:
- `is_master` (bool)
- `master_resume_id` (int|null)
- `master_updated_at` — if this resume is a copy, the `updated_at` of its master (looked up via `master_resume_id`); null if not a copy

The dashboard derives "is stale" client-side: `master_updated_at > resume.master_synced_at` (both are ISO strings).

**`edit()`:** Add two props:
- `masterOutOfSync` (bool) — true when the resume has a `master_resume_id` and `master.updated_at > resume.master_synced_at`
- `masterResume` (`{ id: int, name: string } | null`) — the master, for the "View master" link

### New Controller Methods

**`setMaster(Resume $resume)`** — toggle `is_master` and return `back()`. Toggling `is_master` off does NOT clear `master_resume_id` on existing copies — the relationship and stale-detection logic persist regardless of whether the master card shows the "Master" badge.

**`createTailoredCopy(Resume $resume)`** — replicate resume, set `master_resume_id = $resume->id`, set name to `"{original} (Tailored)"`, redirect to `builder.edit` for the new copy. Applies existing resume count gate via `UserLimits::resumeLimit()`.

**`syncMaster(Resume $resume)`** — `$resume->update(['master_synced_at' => now()])`, return `back()`.

### Frontend — Dashboard (`Index.tsx`)

- Master resume card: show a small "Master" crown/badge chip
- Tailored copy card: if stale (`master_updated_at > master_synced_at`), show amber "⚠ Master updated" badge
- Master card context/action: "Create tailored copy" button (calls `POST builder.create-tailored-copy`)
- Any resume: "Set as master" toggle (calls `PATCH builder.set-master`)

### Frontend — Editor (`Edit.tsx`)

- When `masterOutOfSync` prop is true, render a dismissible amber banner at the top of the editor panel:
  > "Your master resume has been updated — your tailored copy may be out of date. [View master →] [Dismiss]"
- "View master →" links to `route('builder.edit', masterResume.id)`
- "Dismiss" calls `router.patch(route('builder.sync-master', resume.id), {}, { preserveScroll: true })` and clears `masterOutOfSync` locally

### Tests

5 tests in `tests/Feature/MasterResumeTest.php`:
1. User can set a resume as master
2. User can create a tailored copy of a master (copy has `master_resume_id` set)
3. Dashboard index includes `is_master`, `master_resume_id`, `master_updated_at` in resume props
4. `masterOutOfSync` is true on edit when master was updated after `master_synced_at`
5. Syncing master sets `master_synced_at` and clears out-of-sync state

---

## Feature 2: Recruiter Heatmaps

### Goal

Track which sections of a public resume get the most attention (view count + dwell time), and surface that data to the resume owner as a visual analytics panel.

### Data Model

New table `resume_section_events` (append-only — no `updated_at`):

| Column | Type | Notes |
|---|---|---|
| `id` | bigint PK | |
| `resume_id` | FK → `resumes`, cascadeDelete | |
| `section` | string | e.g. `summary`, `experience`, `education`, `skills`, `certifications`, custom section name |
| `dwell_ms` | unsignedInteger | Milliseconds the section was visible |
| `ip_hash` | string | SHA-256 of visitor IP for deduplication |
| `created_at` | timestamp | |

### Routes

| Method | URI | Name | Auth |
|---|---|---|---|
| POST | `/r/{token}/section-events` | `public.section-events` | None |
| GET | `/builder/{resume}/heatmap` | `builder.heatmap` | Auth + ownership |

### Backend — `SectionEventController@store`

- Unauthenticated. Throttled `30,1` (30 req/min per IP).
- Validates token → looks up `ResumeShareLink` (active only) → resolves `resume_id`.
- Accepts `{ sections: [{ section: string, dwell_ms: int }] }` — max 20 sections per batch.
- `section` values are validated against an allowed list: `['summary', 'experience', 'education', 'skills', 'certifications']` plus any string matching `/^custom_[a-z0-9_]+$/` (for custom sections). Custom section wrappers in `PublicView.tsx` receive `data-section="custom_{slug}"` where `slug` is the custom section's `key` field lowercased and hyphenated.
- `dwell_ms` clamped to max 120000 (2 minutes) to prevent inflated data.
- Stores one `ResumeSectionEvent` row per section.
- Wrapped in try/catch — never crashes the unload event.

### Backend — `HeatmapController@show`

- Auth + `authorize('update', $resume)`.
- Aggregates: `SELECT section, COUNT(*) as view_count, AVG(dwell_ms) as avg_dwell_ms FROM resume_section_events WHERE resume_id = ? GROUP BY section ORDER BY view_count DESC`.
- Renders `ResumeBuilder/Heatmap.tsx` with `{ resume: {id, name}, sections: [{section, view_count, avg_dwell_ms}] }`.
- Available to all tiers.

### Frontend — Tracking (`PublicView.tsx`)

Add a `useSectionHeatmap(token)` hook:

1. On mount, attach an `IntersectionObserver` to each section wrapper element (identified by `data-section="experience"` etc.). Section wrappers need `data-section` attributes added to their JSX.
2. When a section enters the viewport, record `entry_time = Date.now()`.
3. When it leaves, accumulate `dwell_ms += Date.now() - entry_time`.
4. On `beforeunload`, if total page time > 500ms, call `navigator.sendBeacon(route('public.section-events', token), JSON.stringify({ sections: accumulated }))`.
5. Token is passed as a prop from the controller.

### Frontend — Analytics (`ResumeBuilder/Heatmap.tsx`)

- Uses `AuthenticatedLayout`.
- Page header: "Resume Heatmap — {resume.name}"
- If no events yet: empty state "No public views recorded yet. Share your resume to start collecting data."
- Otherwise: pure-CSS horizontal bar chart (flex, no library). One row per section:
  - Section label (human-readable: "Work Experience", "Education", etc.)
  - Bar — width proportional to `view_count` relative to max
  - Annotations: `{view_count} views · avg {(avg_dwell_ms/1000).toFixed(1)}s`
- Link from dashboard resume card: "📊 Heatmap" (shown only if the resume has at least one active share link)

### Tests

5 tests in `tests/Feature/HeatmapTest.php`:
1. Section events are stored for a valid active share link token
2. Invalid or inactive token returns 404
3. `dwell_ms` is clamped to 120000
4. Heatmap page loads and returns sections aggregated by view count
5. Unauthenticated user cannot access the heatmap analytics page

---

## Feature 3: Referral Upgrade Tracking + Rewards

### Goal

Complete the referral loop: when a referred user upgrades to a paid tier, log an `upgrade` event, increment the referrer's reward counter, and grant a free month.

### What Exists

- `referral_code`, `referred_by_user_id`, `referral_rewards_earned` columns on `users`
- `ReferralEvent` model (append-only, `referrer_user_id`, `referred_user_id`, `event_type`)
- `ReferralController@show` reads `totalUpgrades` and `rewardsEarned` (currently always 0)
- `RegisteredUserController` fires `signup` event + sets `referred_by_user_id`
- Subscription observer in `AppServiceProvider` syncs `plan_tier` on Stripe events

### What Needs Building

**Upgrade reward logic** — add to the Subscription observer in `AppServiceProvider` (the `plan_tier` sync already runs there):

```php
// After syncing plan_tier, check for referral reward
if (in_array($newTier, ['starter', 'pro'])) {
    $this->grantReferralReward($user);
}
```

**`grantReferralReward(User $user)`** (private method on the service provider or extracted to a `ReferralRewardService`):

1. If `$user->referred_by_user_id` is null → return early.
2. Check idempotency: if `ReferralEvent::where(['referred_user_id' => $user->id, 'event_type' => 'upgrade'])->exists()` → return early (only reward once per referred user).
3. Log: `ReferralEvent::create(['referrer_user_id' => $referrer->id, 'referred_user_id' => $user->id, 'event_type' => 'upgrade'])`.
4. Increment: `$referrer->increment('referral_rewards_earned')`.
5. Apply free month:
   - If referrer has an active `'default'` subscription → `$referrer->subscription('default')->extend(now()->addMonth())`.
   - If referrer is on the free tier → add a Stripe customer balance credit of -900 cents (redeems automatically on their next invoice): `$referrer->createOrGetStripeCustomer(); Cashier::stripe()->customers->createBalanceTransaction($referrer->stripeId(), ['amount' => -900, 'currency' => 'usd', 'description' => 'Referral reward — 1 free month']);`
6. Wrap the entire method in try/catch — a billing failure must not break the Stripe webhook response.

### Tests

5 tests in `tests/Feature/ReferralUpgradeTest.php`:
1. Upgrading a referred user fires an `upgrade` ReferralEvent
2. Referrer's `referral_rewards_earned` is incremented by 1
3. Upgrading the same referred user twice does not double-reward (idempotency guard)
4. User with no `referred_by_user_id` gets no reward event
5. `ReferralController@show` returns correct `totalUpgrades` and `rewardsEarned` counts after an upgrade

---

## Tier Gates

| Feature | Gate |
|---|---|
| Master Resume (set-master, create-tailored-copy) | All tiers |
| Recruiter Heatmaps (tracking + analytics) | All tiers |
| Referral rewards | All tiers |

---

## Dependencies

- Feature 1 requires migration before controller/frontend work
- Feature 2 requires migration + `data-section` attributes on `PublicView.tsx` section wrappers before tracking can work
- Feature 3 requires no migration — all columns already exist
- All three features are independent of each other
