# Resumegen Context

## Current Task
Filament admin migration merged to main. Blocked on production deployment — code not yet pushed to server.

## Key Decisions
- Filament panel complete on main: gated by `is_master_admin`, domain `admin.resumegen.app`.
- Apache vhost (`admin-resumegenapp.conf`) and SSL cert already configured on server.
- `APP_ADMIN_DOMAIN` and `SESSION_DOMAIN` already set in server `.env`.
- Blocker: local code not deployed — server still runs pre-Filament codebase.
- Renamed project folder `webdev/HERD` → `webdev/Herd` (case-only, same inode) to match the dual-graph MCP's locked path; fixed the Herd valet symlink target to match. Site and git repo verified working; graph_scan now succeeds.

## Next Steps
1. **Deploy code to server** — ask user how they deploy (git pull? rsync?), then run `php artisan migrate && php artisan config:clear`.
2. **Commit billing WIP** — `BillingController.php`, `Index.tsx`, `routes/web.php` are staged but not committed.
3. **Stripe webhook** — create endpoint at `https://resumegen.app/stripe/webhook`, paste `whsec_...` into `.env`.
4. **Deploy backup script** — `scp scripts/server-backup.sh root@157.245.94.47:/root/server-backup.sh`.
