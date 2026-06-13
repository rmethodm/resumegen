# Admin Audit Log — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Part of:** Super-admin initiative (sub-project 1 of 4: audit → content → revenue → ops)

## Goal

Record every privileged admin action (who, what, which target, when, from where) in an append-only log, reviewable from a master-admin-only feed. Build first so the destructive actions added in later sub-projects are audited from day one.

## Data model

Migration `admin_audit_logs` (append-only — `created_at` only, no `updated_at`):

| column | type | notes |
|---|---|---|
| `id` | bigIncrements | |
| `admin_user_id` | foreignId → users, cascadeOnDelete, **nullable** | nullable so the log survives if the actor is later deleted (set null) — use `nullOnDelete` |
| `action` | string, indexed | dot-namespaced, e.g. `user.delete`, `ai.block`, `content.resume.delete` |
| `target_type` | string, nullable | model class of the affected record |
| `target_id` | unsignedBigInteger, nullable | |
| `description` | string | human-readable summary |
| `meta` | json, nullable | extra context (old/new value, etc.) |
| `ip_address` | string(45), nullable | |
| `created_at` | timestamp | |

Index `(admin_user_id)`, `(action)`.

## Model — `App\Models\AdminAuditLog`

- `public const UPDATED_AT = null;`
- `$fillable`: all columns above.
- `casts()`: `meta => array`.
- `admin(): BelongsTo` → `User` (`admin_user_id`).
- Static recorder:

```php
public static function record(string $action, ?Model $target, string $description, array $meta = []): void
{
    try {
        self::create([
            'admin_user_id' => auth()->id(),
            'action' => $action,
            'target_type' => $target ? $target::class : null,
            'target_id' => $target?->getKey(),
            'description' => $description,
            'meta' => $meta ?: null,
            'ip_address' => request()->ip(),
        ]);
    } catch (\Throwable) {
        // Auditing is best-effort; never break the admin action it records.
    }
}
```

Best-effort (try/catch) — an audit failure must never abort the underlying admin action.

## Retrofit existing admin actions

Add a `AdminAuditLog::record(...)` call to each existing privileged write:

- `AdminUserController@togglePro` → `user.toggle-pro`
- `AdminUserController@toggleAgency` → `user.toggle-agency`
- `AdminUserController@destroy` → `user.delete`
- `AdminAiController@resetQuota` → `ai.reset-quota`
- `AdminAiController@setLimit` → `ai.set-limit` (meta: `{limit}`)
- `AdminAiController@toggleBlock` → `ai.block` (meta: `{blocked: bool}`)
- `AdminAiController@destroyFlagged` → `ai.flagged.delete`

Record only on the success path (after the guard early-returns), so blocked attempts on master admins are not logged as actions taken.

## Controller — `App\Http\Controllers\Admin\AdminAuditController`

`index(Request $request): Response` — master-admin gated by the existing `admin` route group.

- Eager-load `admin:id,name,email`.
- Filters: `?action=` (exact), `?admin=` (admin_user_id).
- `latest()->paginate(50)->withQueryString()`, mapped to `{id, admin_name, admin_email, action, description, target_type, target_id, ip_address, created_at}`.
- Pass `actions` (distinct action list for the filter dropdown) + `admins` (id/name of admins who have log rows) + current `filters`.
- Renders `Admin/Audit/Index`.

## Route

Inside the `admin.` group: `Route::get('/audit', [AdminAuditController::class, 'index'])->name('audit.index');`

## Frontend — `resources/js/Pages/Admin/Audit/Index.tsx`

`AdminLayout`. Filter bar (action `<select>`, admin `<select>`, Clear). Table: When / Admin / Action (mono badge) / Description / Target / IP. Inertia pagination links. Empty state. Add an "Audit Log" entry to `AdminLayout` nav (`admin.audit.*`).

## Testing

`tests/Feature/Admin/AdminAuditLogTest.php`:

1. `record()` writes a row with actor, action, target, ip.
2. `togglePro` on a user creates a `user.toggle-pro` audit row.
3. `destroy` on a user creates a `user.delete` audit row.
4. Index renders `Admin/Audit/Index` with the rows; respects `?action=` filter.
5. Non-master-admin gets 403 on `admin.audit.index`.
6. A failing insert inside `record()` does not bubble (best-effort) — and the underlying action still succeeds.

Each test that touches `record()` runs as an authenticated master admin so `auth()->id()` resolves.

## Out of scope

Mutations of the audit log (it is append-only and never edited/deleted from the UI); retention/pruning (audit history is kept indefinitely for now).
