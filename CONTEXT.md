# Resumegen Context

## Current Task
Prepaid pricing instrumentation. `docs/prepaid-pricing-model.md` (14 sections) is still a
**proposal** and no user pays anything — but §13 slices 1–3 are now **built and shipped** at
`config/pricing.php` prices of 0, so pairings and a balance ledger are recorded for §12's numbers.
The two open decisions remain blocked on usage data that does not exist yet.

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
1. **Let the instrumentation collect.** Slices 1–3 and the cost fix are done; §12's numbers 1–3 and
   5 now need real traffic, which needs the branch shipped. Nothing more to build here — resist
   adding billing code before the data exists (§12 stop rule).
2. **Split this branch before it nears main** — 30+ commits bundling /shares, photo removal, job
   search, builder rework, cleanup, and pricing docs. Builder rework (`ebfc933..5e2ea61`) still
   unverified in a browser. Prod .env needs `AI_ENABLED=true`, `AI_CAREER_COACH_ENABLED=false`,
   deploy secrets `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`.
3. **Leave `PRICING_JOB_CENTS` at 0.** Turning it on is a paywall and needs explicit approval per
   `CLAUDE.md`, plus §12's numbers 1–3.

## Open (blocked on data)
- **Grant size vs free-tier competitiveness** (§14) — the grant is both the free-tier lever and the
  conversion lever, pulling opposite ways. $5 chosen with no data on either side.
- **Launch grant amount** (§8) — criteria/mechanics settled, floor $8; needs the production count
  of qualifying accounts, which is unknown.
