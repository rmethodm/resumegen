# Filament Admin Migration Design

**Date:** 2026-06-29
**Status:** Approved

## Summary

Replace the hand-rolled Inertia/React admin section with a Filament v3 panel served at `admin.resumegen.app`. Same Laravel codebase — Filament is a package, not a separate app. All existing `/admin` routes and React pages are deleted after cutover.

## Architecture

```
resumegen.app          →  existing Inertia/React app (unchanged)
admin.resumegen.app    →  Filament v3 panel (same Laravel app, different domain)
```

Both share the `web` session guard. `SESSION_DOMAIN=.resumegen.app` (leading dot) ensures the session cookie is valid on both subdomains. Logging in on the main app grants access to the admin panel automatically.

## Auth & Panel Configuration

**Panel provider:** `app/Providers/Filament/AdminPanelProvider.php`

- `->domain(config('app.admin_domain'))` — `admin.resumegen.app` prod / `admin.resumegen.test` local
- `->path('/')` — panel at subdomain root, not `/admin`
- `->authGuard('web')` — shares session with main app
- `->login()` — Filament login page kept as fallback
- `->colors(['primary' => Color::Slate])` — visually distinct from main app

**Access gate (User model):**
```php
public function canAccessPanel(Panel $panel): bool
{
    return $this->email === 'rmethodm@outlook.com';
}
```

**Environment variables:**
```
# Production
SESSION_DOMAIN=.resumegen.app
APP_ADMIN_DOMAIN=admin.resumegen.app

# Local
SESSION_DOMAIN=.resumegen.test
APP_ADMIN_DOMAIN=admin.resumegen.test
```

**`config/app.php`:** add `'admin_domain' => env('APP_ADMIN_DOMAIN', 'admin.resumegen.app')`

**Local Herd setup:** `herd link admin.resumegen` in project directory creates `admin.resumegen.test` alias pointing to same app.

## Resources (Full CRUD)

| Resource | Table Columns | Actions |
|---|---|---|
| `UserResource` | name, email, plan_tier, created_at | Edit plan/tier, view resumes, delete, impersonate |
| `JobTitleResource` | title, role, created_at | Create, edit, delete |
| `CareerArticleResource` | title, is_published, created_at | Create, edit, toggle publish, delete |
| `MessageResource` | name, email, read_at, created_at | View, mark read, delete |

Impersonation moves from `AdminImpersonationController` to a Filament table action on `UserResource`.

## Custom Pages (Read-Only Dashboards)

| Page | Source | Content |
|---|---|---|
| `AiOverviewPage` | `AdminAiController@overview` | AI usage stats, cost, model breakdown |
| `AiUsersPage` | `AdminAiController@users` | Per-user usage table, quota reset action |
| `RevenuePage` | `AdminRevenueController` | Subscription counts, MRR, churn |
| `GrowthPage` | `AdminGrowthController` | Signup trends, conversion funnel |
| `OpsPage` | `AdminOpsController` | System events log, webhook log |
| `AuditPage` | `AdminAuditController` | Admin audit log table |
| `ContentPage` | `AdminContentController` | Resume content review |

## Dashboard Widgets

Filament home page shows stat cards:
- Total users
- Unread messages
- Published articles
- Job titles count
- AI requests today
- AI spend today

## Cutover Plan

All steps in a single pass once Filament is verified locally:

1. Build and verify all Resources, Pages, and Widgets locally at `admin.resumegen.test`
2. Verify auth: `rmethodm@outlook.com` gets in, any other email gets 403
3. Verify all actions: quota reset, mark message read, toggle article publish, impersonate
4. Delete `app/Http/Controllers/Admin/` (all 11 controllers)
5. Delete `resources/js/Pages/Admin/` (all pages, ~2,000 lines)
6. Remove admin route group from `routes/web.php`
7. Remove `EnsureMasterAdmin` middleware
8. Run full test suite
9. Run `./vendor/bin/pint`
10. Deploy

## Tests

Replacement tests verify:
- `rmethodm@outlook.com` can access panel; any other authenticated user gets 403
- Each Resource table loads without error
- Quota reset action works
- Mark message read works
- Article publish toggle works
- Impersonate action works

## What Does Not Change

- All Eloquent models, queries, and business logic
- `AdminAuditLog::record()` calls (still used, just called from Filament actions)
- `ReferralRewardService`, `AiService`, `UserLimits` — untouched
- Main app routes, React pages, and Inertia setup

## Files Created

- `app/Providers/Filament/AdminPanelProvider.php`
- `app/Filament/Resources/UserResource.php` (+ Pages/)
- `app/Filament/Resources/JobTitleResource.php` (+ Pages/)
- `app/Filament/Resources/CareerArticleResource.php` (+ Pages/)
- `app/Filament/Resources/MessageResource.php` (+ Pages/)
- `app/Filament/Pages/AiOverviewPage.php`
- `app/Filament/Pages/AiUsersPage.php`
- `app/Filament/Pages/RevenuePage.php`
- `app/Filament/Pages/GrowthPage.php`
- `app/Filament/Pages/OpsPage.php`
- `app/Filament/Pages/AuditPage.php`
- `app/Filament/Pages/ContentPage.php`
- `app/Filament/Widgets/AdminStatsOverview.php`
- `tests/Feature/Admin/FilamentAdminTest.php`

## Files Deleted (on cutover)

- `app/Http/Controllers/Admin/` (all 11 files)
- `app/Http/Middleware/EnsureMasterAdmin.php`
- `resources/js/Pages/Admin/` (all files)
