# Admin Database Backups Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkboxes track progress.

**Goal:** Manual PostgreSQL backups on the support admin: list, create, download, delete, restore (filename confirm), cap 10.

**Architecture:** `DatabaseDumpRunner` shells out to `pg_dump`/`psql`; `DatabaseBackupService` manages files under `storage/app/private/backups/`; thin `BackupController` + Inertia page.

**Tech Stack:** Laravel 13, Inertia React, PostgreSQL tools, PHPUnit.

**Spec:** `docs/superpowers/specs/2026-08-04-admin-database-backups-design.md`

## File map

| File | Role |
|------|------|
| `app/Support/DatabaseDumpRunner.php` | `pg_dump` / `psql` adapter |
| `app/Services/DatabaseBackupService.php` | list/create/delete/restore/prune/validate |
| `app/Http/Controllers/Admin/BackupController.php` | HTTP |
| `routes/admin.php` | routes |
| `resources/js/Pages/Admin/Backups/Index.tsx` | UI |
| `resources/js/Layouts/AdminLayout.tsx` | nav |
| `app/Models/AdminActionLog.php` | nullable target for non-user actions |
| migration | nullable `target_user_id` |
| `storage/app/private/backups/.gitignore` | ignore dumps |
| `tests/Feature/Admin/BackupTest.php` | feature tests |

## Tasks

### Task 1: Runner + service + action log + storage

- [x] DatabaseDumpRunner, DatabaseBackupService, migration, AdminActionLog::record nullable target, backups .gitignore

### Task 2: Controller + routes

- [x] BackupController + admin routes

### Task 3: Frontend

- [x] Index page + AdminLayout nav

### Task 4: Tests + polish

- [x] BackupTest, pint, verify

---

Execute inline (user asked write and build).
