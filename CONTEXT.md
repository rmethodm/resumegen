# Resumegen Context

## Current Task
Prepaid pricing **modelling**, not implementation. The doc is still a proposal, `config/pricing.php`
is still 0, nobody pays. `GrowthSampleSeeder` now sweeps 19 fabricated scenarios
(`docs/growth-model-sample-run.md`) via `GROWTH_*` env vars. Does not satisfy §12's stop rule.
Branch is pushed and clean as of 2026-07-20; doc sweep done (dead tier docs deleted, AI_STRATEGY
rewritten, AGENTS.md reduced to a pointer, Imagick timestamp churn fixed). Scenario D re-measured
and D2 (75c/$5) added in `docs/growth-model-sample-run.md`. Dev DB currently holds the D2 seed,
not baseline.

## Key Decisions
- **Cash and accrual are bounds of one measure**: `net(r) = recognised + deferred x (1-r) - stripe -
  ai - infra`. Accrual is the 100%-refund *pessimistic* bound; breakage is upside.
- **§12 triggers are formulas of `GRANT_JOBS`** (`median <= G+1`, `p90 < G+3`, `%exceeding G < 15%`).
  `GRANT_JOBS`=3 deliberately disagrees with §9's settled $5 — move both together.
- **Pricing knobs are second-order.** Activation / jobs-per-user / ramp swing $659-$906 each; the
  grant $646, infra $180, AI $11. Two of the top three are the least-confident inputs.
- **Refund window closes at the first successful AI call**; granted dollars never withdrawable.
- **Prepaid stays; subscriptions were reconsidered and rejected 2026-07-20.** Job hunting is
  episodic (tailor 8 resumes in five weeks, vanish for two years) — a subscription bills a
  relationship the product does not have, and the revenue that survives that mismatch is mostly
  forgot-to-cancel. Raising price beats changing model: D2 (75c/$5) accrues **+$1,196** vs B's
  **+$447**, no second billing implementation, no churn assumption.
- **Grant-vs-cash split is per-user FIFO, never global.** Global FIFO lets non-payers' unspent
  grant offset payers' cash spend and inverts the sign (D reads −$224 instead of +$1,155).

## Next Steps
**`WORKLOG.md` is the work queue.** Say "process the next TODO in WORKLOG.md", one item per pass.
Three of its six items are `BLOCKED` on production data by §12's stop rule — **nothing is broken,
those are parked on purpose, not chores.** Correct action on them: none.
