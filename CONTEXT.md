# Resumegen Context

## Current Task
Support admin complete (subdomain + action logs + resend verification).

## Key Decisions
- Admin host: APP_ADMIN_DOMAIN (local admin.resumegen.test); is_admin not fillable.
- Disable = disabled_at only; data kept; tokens revoked.
- Guest auth redirects use host-relative /login (stay on admin host).

## Next Steps
- Prod: set APP_ADMIN_DOMAIN, DNS/TLS, migrate, promote admin via tinker.
- Workstation UI smoke (Optimize / create / export) if not done.
- Optional: impersonation only with explicit audit decision.
