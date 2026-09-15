# Context

## Current Task
Branch `ShadEditor` @ `1252e9a5` (2026-09-14): JobNavigator Tier-1 import shipped —
all 5 phases (status history, interview rounds, funnel/Sankey stats, Q&A bank +
AI-draft matching, admin reintroduction + cron UI). Spec:
`docs/superpowers/specs/2026-09-14-jobnavigator-tier1-import-design.md`.
Pushed to remote `ShadEditor` branch (no PR/merge).

Earlier: Workstation AI credits plan complete (2026-09-10) — AI credit ledger +
Cashier gates remain; Workstation Rewrite/Generate UI and HTTP removed/unrouted
(`ai.rewrite-bullet`, `ai.rewrite-summary`, `ai.generate-gap`). Shared Inertia
`aiCredits` prop and `/billing/credits` stub remain. Optimize diagnose stays free.
Nav moved to vertical left sidebar; Workstation content width widened 35% (2026-09-14).

## Next Steps
1. User-directed: PR / local merge / keep branch — only when asked.
2. Do not set `STRIPE_CREDITS_PRICE_ID` until a Stripe webhook grants ledger credits on purchase.
3. Optional deferred: check-then-spend race on gate + spend; orphaned `AiService::reviewResume` /
   `rewriteSection` cleanup or metered re-route.
4. Register real OAuth app credentials if providers are still empty in `.env`
   (`GOOGLE_/GITHUB_/MICROSOFT_CLIENT_ID/SECRET`).
5. See `docs/UNFORGET.md` for full deferred-work ledger (P1–P10, A1–A3).
