# Context

## Current Task
Branch `ShadEditor` @ `6e8486ec` (2026-09-15): **Apply flow designed and planned, not started.**

- Spec: `docs/superpowers/specs/2026-09-15-apply-flow-design.md` (commit `c40a0446`). Approved by user.
- Plan Part 1: `docs/superpowers/plans/2026-09-15-apply-flow-part1-job-add.md` (commit `6e8486ec`). 10 tasks: user columns, `CreateJobApplication` action, extension parity, `AddJobModal`, Workstation `application-chip`, Compare status, Dashboard "Add job" CTA + Next up strip, first-week checklist, skippable `/apply/new` wizard + preference toggle, live verification + docs.
- Plan Part 2 (not yet written): AI suggestions — `config/ai-prompts.php` curated library, `resume_ai_suggestions` table, `AiSuggestionService` with credit reservation, `TailorResumeJob`, Workstation review panel (Accept/Discard), Optimize upsell card, `tailor_with_ai`/`tailor_mode` on the modal, `pending_suggestions` Next up kind. Write after Part 1 ships.

Key decisions locked in brainstorming (2026-09-15): resume and job are equal entry points; adding a job with a base resume creates a tailored sibling version (never in-place); AI re-routed behind the credit ledger as Accept/Discard suggestions (reverses the 2026-09-10 unrouted stance); curated prompts only; Shares stays top-level nav untouched.

Working tree also holds uncommitted extension upgrade Phases B–F (see `.remember/` and `docs/UNFORGET.md`); those commits are separate from the apply-flow work.

Earlier: JobNavigator Tier-1 (2026-09-14, `1252e9a5`), Workstation AI credits plan (2026-09-10).

## Next Steps
1. Execute Part 1 plan via `superpowers:subagent-driven-development` (user chose to defer; ask which execution mode when resuming).
2. After Part 1: write Part 2 plan with `superpowers:writing-plans` from spec Section 3 + AI pieces of Sections 2/4/5.
3. Commit or discard the uncommitted extension Phase B–F work before starting Part 1, so diffs stay separable.
4. Do not set `STRIPE_CREDITS_PRICE_ID` until a Stripe webhook grants ledger credits on purchase.
5. See `docs/UNFORGET.md` for the deferred-work ledger.
