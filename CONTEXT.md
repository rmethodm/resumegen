# Resumegen Context

## Current Task
Prepaid pricing **modelling**, not implementation. The doc is still a proposal, `config/pricing.php`
is still 0, nobody pays. `GrowthSampleSeeder` now sweeps 19 fabricated scenarios
(`docs/growth-model-sample-run.md`) via `GROWTH_*` env vars. Does not satisfy §12's stop rule.

## Key Decisions
- **Cash and accrual are bounds of one measure**: `net(r) = recognised + deferred x (1-r) - stripe -
  ai - infra`. Accrual is the 100%-refund *pessimistic* bound; breakage is upside.
- **§12 triggers are formulas of `GRANT_JOBS`** (`median <= G+1`, `p90 < G+3`, `%exceeding G < 15%`).
  `GRANT_JOBS`=3 deliberately disagrees with §9's settled $5 — move both together.
- **Pricing knobs are second-order.** Activation / jobs-per-user / ramp swing $659-$906 each; the
  grant $646, infra $180, AI $11. Two of the top three are the least-confident inputs.
- **Refund window closes at the first successful AI call**; granted dollars never withdrawable.

## Next Steps
1. **Decide the grant or wait for data.** $2 is profitable but trips §12's median trigger; $1 clears
   all three at a worse free tier. Free `__general__` == cutting the grant 50c, and is a framing win.
2. **Split this branch before main** — 35+ commits; builder rework (`ebfc933..5e2ea61`) unverified in
   a browser. Prod .env needs `AI_ENABLED=true`, `AI_CAREER_COACH_ENABLED=false`, deploy secrets.

## Open (blocked on data)
- **Grant size vs free-tier competitiveness** (§14) — the sweep narrows it, cannot settle it.
- **Price elasticity unmodelled** — carries the largest swing in the tornado.
- **Launch grant amount** (§8) — floor $8; needs production count of qualifying accounts.
