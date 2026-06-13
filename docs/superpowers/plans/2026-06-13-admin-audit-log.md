# Admin Audit Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Append-only admin action log + master-admin review feed, with existing privileged actions retrofitted to record.

**Architecture:** `admin_audit_logs` table; `AdminAuditLog` model with static best-effort `record()`; retrofit `AdminUserController`/`AdminAiController`; `AdminAuditController@index` → `Admin/Audit/Index.tsx`.

**Tech Stack:** Laravel 13, PHP 8.4, Inertia v2, React/TS, PHPUnit 12.

---

### Task 1: Migration + model + schema test

**Files:**
- Create: `database/migrations/2026_06_13_200000_create_admin_audit_logs_table.php`
- Create: `app/Models/AdminAuditLog.php`
- Create: `database/factories/AdminAuditLogFactory.php`
- Test: `tests/Feature/Admin/AdminAuditLogTest.php`

- [ ] Migration: columns per spec, `nullableTimestamps`/manual `created_at` only (use `$table->timestamp('created_at')->nullable()` + no updated_at). Indexes on `admin_user_id`, `action`. FK `nullOnDelete`.
- [ ] Model: `UPDATED_AT = null`, fillable, `meta` array cast, `admin()` relation, static `record()` per spec.
- [ ] Factory: random action/description, `admin_user_id` via `User::factory()`.
- [ ] Test `test_record_writes_a_row`: acting as master admin, `AdminAuditLog::record('user.delete', $target, 'desc', ['k'=>'v'])`, assert DB has row with admin_user_id, action, target_type/id, ip nullable.
- [ ] Run `php artisan migrate`, then the test → PASS.
- [ ] Commit.

### Task 2: Retrofit existing admin actions

**Files:**
- Modify: `app/Http/Controllers/Admin/AdminUserController.php`
- Modify: `app/Http/Controllers/Admin/AdminAiController.php`
- Test: `tests/Feature/Admin/AdminAuditLogTest.php`

- [ ] Test `test_toggle_pro_is_audited`: acting as master admin, PATCH `admin.users.toggle-pro` on a normal user → assertDatabaseHas `admin_audit_logs` action `user.toggle-pro`.
- [ ] Test `test_destroy_user_is_audited`: action `user.delete`.
- [ ] Run → FAIL.
- [ ] Add `AdminAuditLog::record(...)` to togglePro/toggleAgency/destroy (after guards, success path) and to AiController resetQuota/setLimit/toggleBlock/destroyFlagged.
- [ ] Run → PASS.
- [ ] Commit.

### Task 3: Controller + route + index test

**Files:**
- Create: `app/Http/Controllers/Admin/AdminAuditController.php`
- Modify: `routes/web.php`
- Test: `tests/Feature/Admin/AdminAuditLogTest.php`

- [ ] Test `test_index_lists_and_filters`: seed 2 rows (different actions), acting master admin GET `admin.audit.index` → Inertia `Admin/Audit/Index` has `logs.data` count 2; with `?action=user.delete` → count 1.
- [ ] Test `test_non_admin_forbidden`.
- [ ] Run → FAIL (no route).
- [ ] Add controller (index per spec) + route.
- [ ] Run → FAIL on Vite manifest (page missing) — proceed to Task 4.

### Task 4: Frontend page + nav + build

**Files:**
- Create: `resources/js/Pages/Admin/Audit/Index.tsx`
- Modify: `resources/js/Layouts/AdminLayout.tsx`
- Test: `tests/Feature/Admin/AdminAuditLogTest.php`

- [ ] Create `Admin/Audit/Index.tsx`: AdminLayout, filter bar, table, pagination, empty state (match `Admin/Ai/Users.tsx` style).
- [ ] Add nav entry `{ label: 'Audit Log', href: route('admin.audit.index'), pattern: 'admin.audit.*' }`.
- [ ] `npm run build`.
- [ ] Run full audit test file → PASS.
- [ ] `vendor/bin/pint --dirty --format agent`.
- [ ] Commit (source only, not public/build).

### Task 5: Docs + finish

- [ ] Add an "Admin audit log" note to CLAUDE.md under the admin panel section.
- [ ] Run full suite `php artisan test --compact` → green.
- [ ] finishing-a-development-branch: merge to main.
