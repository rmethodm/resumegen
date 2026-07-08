# Free Tier Simplification

## Context

Part of a broader pricing simplification effort (moving toward fewer, more differentiated plans). This first pass touches only the **Free** tier; Starter/Pro/Agency are unchanged and will be addressed in later passes.

## Changes

### 1. `UserLimits` — free tier arm only

| Limit | Today | New |
|---|---|---|
| Resumes | 2 | 2 (unchanged) |
| Cover letters | 1 | 2 |
| Job applications | 3 | 3 (unchanged) |
| Templates | 4 (classic, modern, minimal, ats) | all 9 |
| DOCX export | ✗ | ✗ (unchanged) |
| AI generations/month | 10 | 0 |
| AI tailoring | ✗ | ✗ (unchanged) |

Only the free-tier match arms in `App\Services\UserLimits` change. Starter/Pro/Agency arms and the restrictive `default` case are untouched.

### 2. Share-link view cap (new)

Free-tier users' share links are capped at 25 page views. No new column or migration — cap is evaluated live on each request in `PublicResumeController::show()`:

- If `$resume->user->planTier() === 'free'`: count `page_view` events for that share link (`resume_share_events` where `resume_share_link_id = ... AND event = 'page_view'`). At or over 25, render the same `LinkExpired` page currently used for inactive/expired links (existing `is_active`/`expires_at` check in `show()`).
- Non-free owners: no count query, no cap.
- Only `page_view` events count toward the cap. `pdf_download` events do not.
- Cap is evaluated against the *owner's current tier* at request time, not stored per-link — so upgrading a free user to a paid tier immediately removes the cap on all their existing links (no backfill/migration needed, no stale state to reconcile).

No changes to `ResumeShareLink` model/migrations. No changes to `docx` download behavior (still blocked entirely for free tier, unrelated to this cap).

## Testing

- Update `UserLimitsTest` for the new free-tier arms (cover letters, templates, AI generations).
- New feature test coverage on `PublicResumeController`:
  - Free-tier owner's link is viewable under 25 `page_view`s.
  - Free-tier owner's link returns `LinkExpired` at/over the 25th `page_view`.
  - `pdf_download` events don't count toward the cap.
  - Paid-tier owner's link has no cap regardless of view count.

## Out of scope

- Starter/Pro/Agency tier changes (future passes).
- Trial/subscription model redesign (7-day trial, $20/mo auto-charge) — still under discussion, not part of this spec.
- Agency tier removal — still under discussion, not part of this spec.
