# Resumegen Context

## Current Task
Narrowed background-check vendor shortlist to self-check use case (job seeker pulling own report). Filament admin migration still blocked on production deployment.

## Key Decisions
- Filament panel complete on main: gated by `is_master_admin`, domain `admin.resumegen.app`.
- Apache vhost (`admin-resumegenapp.conf`) and SSL cert already configured on server.
- Blocker: local code not deployed — server still runs pre-Filament codebase.
- Confirmed use case: self-check only (job seeker checks own record) — FCRA permissible-purpose/adverse-action rules don't apply since subject requests own report.
- Vendor shortlist narrowed: BackgroundChecks.com (consumer affiliate program) + CRS Credit API (API-first, built-in compliance) fit self-check. Dropped Checkr/ScoutLogic/GBS — B2B employer-screening platforms, no consumer self-check path. Equifax Consumer Engagement Suite is a fit but requires direct bureau business agreement, heavier than an affiliate signup. Avoided BeenVerified/TruthFinder/Instant Checkmate — FTC sued them in 2023 for FCRA violations.
- User will read BackgroundChecks.com and CRS Credit API docs directly to pick between them before implementation.

## Next Steps
1. **Deploy code to server** — ask user how they deploy (git pull? rsync?), then run `php artisan migrate && php artisan config:clear`.
2. **Commit billing WIP** — `BillingController.php`, `Index.tsx`, `routes/web.php` are staged but not committed.
3. **Stripe webhook** — create endpoint at `https://resumegen.app/stripe/webhook`, paste `whsec_...` into `.env`.
