# Resumegen Context

## Current Task
Filament admin migration merged to main. Billing WIP staged (BillingController, Index.tsx, routes/web.php).

## Key Decisions
- Filament panel live on main: `admin.resumegen.test` (local) / `admin.resumegen.app` (prod), gated by `is_master_admin`.
- Stripe: API keys set, all 6 price IDs confirmed. `STRIPE_WEBHOOK_SECRET` still placeholder — blocked on DNS.
- Billing WIP (staged, not committed): subscription flow changes in BillingController, Index.tsx, routes/web.php.

## Next Steps
1. **Commit or continue billing WIP** — BillingController + Index.tsx + routes/web.php are staged.
2. **Production Filament setup**: set `SESSION_DOMAIN=.resumegen.app` + `APP_ADMIN_DOMAIN=admin.resumegen.app`, configure vhost for `admin.resumegen.app`, issue SSL cert.
3. **Stripe webhook**: create endpoint, select Cashier events, paste `whsec_...` into `.env`.
4. **Deploy backup script**: `scp scripts/server-backup.sh root@<server>:/root/server-backup.sh && chmod +x && ./server-backup.sh cron-install`.
