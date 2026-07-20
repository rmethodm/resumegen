# Resumegen Context

## Current Task
Prepaid pricing **modelling**, not implementation. The doc is still a proposal, `config/pricing.php`
is still 0, nobody pays. `GrowthSampleSeeder` now sweeps 19 fabricated scenarios
(`docs/growth-model-sample-run.md`) via `GROWTH_*` env vars. Does not satisfy §12's stop rule.
Branch is pushed and clean as of 2026-07-20; doc sweep done (dead tier docs deleted, AI_STRATEGY
rewritten, AGENTS.md reduced to a pointer, Imagick timestamp churn fixed).

## Key Decisions
- **Cash and accrual are bounds of one measure**: `net(r) = recognised + deferred x (1-r) - stripe -
  ai - infra`. Accrual is the 100%-refund *pessimistic* bound; breakage is upside.
- **§12 triggers are formulas of `GRANT_JOBS`** (`median <= G+1`, `p90 < G+3`, `%exceeding G < 15%`).
  `GRANT_JOBS`=3 deliberately disagrees with §9's settled $5 — move both together.
- **Pricing knobs are second-order.** Activation / jobs-per-user / ramp swing $659-$906 each; the
  grant $646, infra $180, AI $11. Two of the top three are the least-confident inputs.
- **Refund window closes at the first successful AI call**; granted dollars never withdrawable.

## Next Steps
1. **Nothing is broken — the pricing items below are parked on purpose, not chores.** §12's stop rule
   says do not decide the grant without real usage data, which does not exist. Correct action: none.
2. **Two loose ends in the builder.** `JdMatcher` renders only when `aiEnabled` is false, and both
   `.env` and `.env.dusk.local` set `AI_ENABLED=true`, so that fallback has never run in a browser —
   covering it needs a Dusk server booted with AI off. `PlainTextView`'s component export is rendered
   nowhere; only its `buildPlainText` and type are used (by `JdMatcher`).
3. **Split this branch before main** — 36+ commits. Builder now **verified**: Dusk 3/3, React mounts
   clean, save-on-blur round trip works. Prod .env needs `AI_ENABLED=true` and deploy secrets
   `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`.

## Open (blocked on data)
- **Grant size vs free-tier competitiveness** (§14) — the sweep narrows it, cannot settle it.
- **Price elasticity unmodelled** — carries the largest swing in the tornado.
- **Launch grant amount** (§8) — floor $8; needs production count of qualifying accounts.
