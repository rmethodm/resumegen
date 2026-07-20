# Resumegen Context

## Current Task
Prepaid pricing instrumentation. `docs/prepaid-pricing-model.md` (14 sections) is still a
**proposal** and no user pays anything — but §13 slices 1–3 are now **built and shipped** at
`config/pricing.php` prices of 0, so pairings and a balance ledger are recorded for §12's numbers.
The two open decisions remain blocked on usage data that does not exist yet.

## Key Decisions
- Option C at true 50/50 weight (user overrode the coach-primary recommendation).
- Career coach chat kept but **dark** behind its own flag (`ai_enabled:career_coach` middleware param, `AI_CAREER_COACH_ENABLED=false`); code intact, still tested via phpunit.xml.
- Translate / career map / resignation-letter generation **deleted outright**, not flagged off — highest cost, lowest value per AI_STRATEGY.md.

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

Also open: wire cover letters to the existing `AiPrompts::coverLetter()` (no route yet); decide whether to hard-scope or delete career coach chat; add GitHub secrets `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY` for the deploy pipeline; background-check vendor pick still with user.
