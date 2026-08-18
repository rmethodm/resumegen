# Context

## Current Task
Pricing is closed, not open. On 2026-08-14 the prepaid-pricing instrumentation (`JobPairing`,
`BalanceTransaction`, `config/pricing.php`, the two `pricing:*` commands, `GrowthSampleSeeder`) and
every pricing-strategy doc were removed. Product decision: the app stays free, permanently — see
CLAUDE.md's "Billing — there is none". Nothing pricing-related is planned or in progress.

## Next Steps
1. **Split this branch before it nears main** — commits bundle /shares, photo removal, job search,
   builder rework, cleanup, and (now-reverted) pricing work. Builder rework (`ebfc933..5e2ea61`)
   still unverified in a browser. Prod .env needs `AI_ENABLED=true`, `AI_CAREER_COACH_ENABLED=false`,
   deploy secrets `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`.
