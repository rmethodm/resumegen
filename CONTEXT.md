# Resumegen Context

## Current Task
Prepaid pricing model design — `docs/prepaid-pricing-model.md` (14 sections), still a **proposal**,
no code outside `docs/`. All operational decisions are now settled; only two remain open and both
are blocked on usage data that does not exist.

## Key Decisions
- **Prepaid dollar balance, no subscription.** $0.50/job, **$5 signup grant** (raised from $3), $5
  min / $50 max top-up. Withdraws §3 of `resume-builder-competitive-analysis.md`.
- **Refund window closes at the first successful AI call.** Unlimited refunds were exploitable —
  output survives the refund, so pay/generate/refund repeats forever. Unspent balance stays
  unconditionally refundable; **granted dollars are spendable but never withdrawable to card**
  (otherwise the grant funds a registration farm). Same rule applies to the signup grant.
- **§12's thresholds are derived from the grant, not independent.** At $5 the first paid job is the
  10th, so: re-base if median ≤ 10, conversion measured above 9 jobs, p90 < 12. Any further grant
  change must re-derive them.

## Next Steps
1. **Build §13 slices 1–3 at $0 prices** — `balance_transactions`, `job_pairings` (+ `refunded_at`,
   partial unique index), `ai_requests.job_pairing_id`, `billingKey()` + tests, pairing resolver.
   Yields §12's numbers 1–3, which unblock both open decisions. No Stripe, no paywall.
2. **Fix `ai_requests.estimated_cost_cents`** — the rounding is in `AiService::estimateCostCents()`
   (`(int) round($cents)`), not just the column type; a migration alone changes nothing. Blocks
   §12 number 5 and leaves `ai:cost-alert` unable to fire.
3. **Split this branch before it nears main** — 30+ commits bundling /shares, photo removal, job
   search, builder rework, cleanup, and pricing docs. Builder rework (`ebfc933..5e2ea61`) still
   unverified in a browser. Prod .env needs `AI_ENABLED=true`, `AI_CAREER_COACH_ENABLED=false`,
   deploy secrets `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`.

## Open (blocked on data)
- **Grant size vs free-tier competitiveness** (§14) — the grant is both the free-tier lever and the
  conversion lever, pulling opposite ways. $5 chosen with no data on either side.
- **Launch grant amount** (§8) — criteria/mechanics settled, floor $8; needs the production count
  of qualifying accounts, which is unknown.
