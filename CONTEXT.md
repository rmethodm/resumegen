# Resumegen Context

## Current Task
Designed a prepaid pricing model to replace subscriptions — full proposal in
`docs/prepaid-pricing-model.md` (13 sections). Nothing implemented; no code touched outside `docs/`.

## Key Decisions
- **Prepaid dollar balance, no subscription.** $0.50 per job (unlimited AI + revisions inside it,
  forever), $3 signup grant, $5 min / $50 max top-up, no volume bonus, balances never expire,
  refunds self-serve and unlimited. Withdraws §3 of `resume-builder-competitive-analysis.md`.
- **AI COGS is ~$0.0005/call** (modelled; `ai_requests` was empty). The current 150/mo cap costs
  ~8¢/user. Invalidates the competitive doc's §2 "structural cost asymmetry" argument — metering is
  a pricing decision, not cost recovery.
- **Implementation is gated on usage data** (§12). The $3 grant covers 5 jobs, so a user pays
  nothing until their 6th tailored job — if the median user tailors ≤5, the median user never pays.

## Next Steps
1. Build `job_pairings` + `balance_transactions` with **all prices $0** to collect the §12 numbers
   (median jobs tailored, % exceeding 6, p90). No Stripe, no paywall. Also fix
   `ai_requests.estimated_cost_cents` — it's an `integer`, so every call rounds to 0.
2. **Split this branch before it goes near main** — 25+ commits bundling /shares, photo removal, the
   07-17 Skills experiment, job search, builder rework, cleanup, and now pricing docs.
3. Click through the builder in a browser — builder rework (`ebfc933..5e2ea61`) still unverified.
   Prod .env still needs `AI_ENABLED=true` + `AI_CAREER_COACH_ENABLED=false`, deploy secrets
   `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`; cover letters have no route to `AiPrompts::coverLetter()`.
