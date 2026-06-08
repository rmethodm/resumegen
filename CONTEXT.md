# Resumegen Context

## Current Task
Batch 11 complete — master resume, recruiter heatmaps, referral rewards. 544/544 tests passing.

## Key Decisions
- Master resume uses is_master + master_resume_id + master_synced_at; copies detect stale via updated_at comparison
- Heatmap tracking uses IntersectionObserver + sendBeacon in PublicView.tsx; section_events table is append-only
- ReferralRewardService is called from Subscription observer; idempotency guard prevents double-rewarding; Stripe calls wrapped in try/catch with Log::warning

## Next Steps
- Batch 12 candidates: real-time live score, custom domain for public resume, recruiter multi-seat
- 5 deferred audit fixes still pending (see project-audit-remaining-fixes.md)
