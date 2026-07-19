# Resumegen Context

## Current Task
Dead-code + Claude-config cleanup (2026-07-19). Deleted unrouted `ImportTestController` + `ImportTest.tsx`
(commit `d4f797f`, −487). Removed the `cashier-stripe-development` and `medialibrary-development` skills, the two
Stripe MCP permissions, and a `types:check` grant for a script that doesn't exist. Added
`.claude/hooks/block-migrate-rollback.sh` (PreToolUse, 10/10 cases pass). Prior work: builder rework
(`ebfc933..5e2ea61`) still UNVERIFIED IN A BROWSER.

## Key Decisions
- Forward-only migrations are now enforced by a hook, not just documented — prose in CLAUDE.md failed to
  prevent two misdiagnoses. Regex requires an `artisan` prefix so grepping the term still works.
- Laravel Boost's context header falsely lists `laravel/cashier v16` as installed. Verify packages against
  `composer.json`/`vendor/`, never that header. Noted in CLAUDE.md.
- Controllers here are NOT bloated (max method 54 lines). Form Request / Action extraction would be churn.
  The real finding was dead code, not fat controllers.

## Next Steps
1. **Click through the builder in a browser.** Every visual claim rests on static reasoning. Only gate left.
2. **Split this branch before it goes near main** — 25 commits ahead, bundling /shares, photo removal, the
   07-17 Skills experiment, job search, builder rework, and this cleanup. Independently mergeable.
3. Production .env needs `AI_ENABLED=true` + `AI_CAREER_COACH_ENABLED=false`; add deploy secrets
   `SSH_HOST`/`SSH_USER`/`SSH_PRIVATE_KEY`. Cover letters still have no route to `AiPrompts::coverLetter()`.
