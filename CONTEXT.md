# Resumegen Context

## Current Task
Completed 16-task audit remediation plan (2026-06-10). All security, dead code, performance, and code health findings addressed.

## Key Decisions
- Security: accent_color whitelisted in OgImageController, CareerHub body sanitized, dead question routes removed, SSRF blocked via PublicUrl rule
- Dead code: ResumeQuestion model/mail deleted, ai_usage_logs/ai_model_rates tables dropped, two-column removed from validation, openai/smalot deps removed
- Performance: N+1 fixed in MessagesController, AnalyticsController now DB-aggregates, indexes added, strength scorer cached, Subscription observer guarded with isDirty
- Code health: ResumeCompletionScorer extracted, write-on-read fixed with EnsureReferralCode action, ThreadsPanel/SharePopover extracted from Edit.tsx

## Next Steps
- Feature backlog candidates: real-time live score, kanban job tracker (see project-feature-backlog.md)
- 5 pre-audit deferred fixes still pending (see project-audit-remaining-fixes.md)
