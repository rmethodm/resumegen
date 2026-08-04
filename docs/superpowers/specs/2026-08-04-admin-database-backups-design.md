# Admin Database Backups — Design

**Date:** 2026-08-04  
**Status:** Approved for implementation planning  
**Scope:** Manual PostgreSQL backups on the domain-scoped Inertia admin site, with list / create / download / delete / restore and a hard cap of 10 files.

## Goals

- Let support admins create full database dumps from the admin UI without SSH.
- Keep dumps on the server in private storage; list, download, and delete them.
- Allow restore of a chosen dump into the live database, with accidental-trigger protection.
- Cap disk use at 10 dumps (auto-prune oldest on create).
- Log create / delete / restore on `AdminActionLog`.

## Non-goals (v1)

- Scheduled / cron backups
- Remote storage (S3, etc.)
- Partial or table-level restore
- MySQL / SQLite dump support
- Automatic pre-restore safety dump
- Filament or a separate admin package

## Product behavior

Admin nav adds **Backups** next to Dashboard and Users.

| Action | Behavior |
|--------|----------|
| **Create** | Run dump now; store under private storage; flash success with filename; if more than 10 files, delete oldest until ≤10 |
| **Download** | Stream the file to the browser (session auth only) |
| **Delete** | Remove file after a simple confirm |
| **Restore** | Modal: type the **exact backup filename** to enable submit; apply dump to the live DB; flash result; log action |

UI copy on the page and restore modal: restore is destructive; create a backup first if unsure.

## Architecture

### Routes

All on the admin domain, existing middleware stack (`auth`, `verified` if applicable, admin gate, not-disabled):

| Method | Path | Name |
|--------|------|------|
| GET | `/backups` | `admin.backups.index` |
| POST | `/backups` | `admin.backups.store` |
| GET | `/backups/{filename}` | `admin.backups.download` |
| DELETE | `/backups/{filename}` | `admin.backups.destroy` |
| POST | `/backups/{filename}/restore` | `admin.backups.restore` |

`{filename}` is constrained to a single path segment matching:

```text
resumegen-\d{8}-\d{6}\.sql\.gz
```

Reject `..`, slashes, and any other pattern with 404.

### Components

1. **`App\Services\DatabaseBackupService`**
   - `list(): Collection` of `{ filename, size_bytes, created_at }`
   - `create(): string` — dump, return filename, `pruneTo(10)`
   - `delete(string $filename): void`
   - `restore(string $filename): void`
   - `absolutePath(string $filename): string` after validation
   - `pruneTo(int $max = 10): void` — sort by mtime ascending, delete excess oldest

2. **`App\Support\DatabaseDumpRunner`** (shell adapter)
   - `dump(string $absolutePath): void` — `pg_dump` → gzip to path
   - `restore(string $absolutePath): void` — gunzip | `psql`
   - Credentials from the default `pgsql` connection config
   - Flags: `--no-owner --no-acl` on dump
   - Process timeout 300s; non-zero exit throws a domain exception; stderr logged
   - Bound in the container so tests can swap a fake

3. **`App\Http\Controllers\Admin\BackupController`**
   - Thin HTTP layer over the service
   - Restore validates `confirmation` must **exactly equal** the route `{filename}`
   - Writes `AdminActionLog` for create, delete, restore (action names e.g. `backup.created`, `backup.deleted`, `backup.restored`; metadata includes filename)

4. **Storage**
   - Directory: `storage/app/private/backups/`
   - Not publicly served; only the download action streams files
   - Directory gitignored (`*` + `!.gitignore`)

5. **Frontend**
   - `resources/js/Pages/Admin/Backups/Index.tsx`
   - Table: filename, human size, created time
   - Primary **Create backup** button
   - Row: Download (link), Delete (confirm), Restore (modal + type-filename)
   - Nav item in `AdminLayout`
   - Match existing admin slate / indigo styles

### Dump format

- Filename: `resumegen-{Ymd}-{His}.sql.gz` (e.g. `resumegen-20260804-153045.sql.gz`)
- Plain SQL via `pg_dump`, gzipped
- Full database replace on restore

### Engine guard

If `DB_CONNECTION` is not `pgsql`, create/restore fail with a clear flash error (and list can still show any leftover files). Feature tests use a fake runner and do not require real `pg_dump`.

## Security

- Admin domain + existing admin middleware only; no public routes.
- Filename allowlist prevents path traversal and arbitrary file read/delete.
- Downloads are authenticated responses, not public disk URLs.
- Restore requires exact filename confirmation (user choice over password re-entry for v1).
- Dump/restore subprocess env: pass DB password via `PGPASSWORD` (or equivalent) only for the child process; do not log connection strings or passwords.
- Action log records who did create/delete/restore and which file.
- No impersonation and no elevation of non-admins.

## Ops notes

- Production and local Herd must have `pg_dump` and `psql` on PATH for the PHP process user.
- Restore disconnects nothing automatically; long restore may briefly contend with live traffic — acceptable for support-only v1.
- Operators should Create before Restore when recovering from a bad state.
- Cap of 10 is enforced on create only; manual delete is always available.
- Deploy: no new env vars required beyond existing `DB_*`. Ensure private storage is writable and not wiped by deploy scripts (storage is typically persistent).

## Error handling

| Case | Response |
|------|----------|
| Non-admin / not authenticated | 403 / login redirect (existing) |
| Disabled admin | Existing not-disabled middleware |
| Non-pgsql | Flash error; no dump/restore |
| Missing binary / dump failure | Flash error; log stderr; no partial file left (write to temp then rename, or delete on failure) |
| Unknown / invalid filename | 404 |
| Restore confirmation mismatch | 422 validation error |
| Process timeout | Flash error; log |

## Testing

`tests/Feature/Admin/BackupTest.php` (PHPUnit), with a fake `DatabaseDumpRunner`:

- Guest and non-admin cannot access backup routes
- Admin can list empty and populated directory
- Create invokes runner, creates listing entry, logs action
- Creating when 10 already exist prunes oldest (use real filesystem under `storage/framework/testing` or temp disk)
- Download returns file for valid name; 404 for traversal and missing
- Delete removes file and logs
- Restore rejects wrong confirmation; accepts exact match and invokes runner; logs
- Disabled admin cannot access

Optional unit tests for filename validation and prune ordering if kept pure on the service.

## Implementation sketch (not a plan)

1. Dump runner + service + storage dir  
2. Controller + routes + action log  
3. Inertia page + nav  
4. Feature tests + Pint  
5. Manual smoke on `admin.resumegen.test` when Postgres tools available  

## Decisions log

| Decision | Choice | Why |
|----------|--------|-----|
| Storage model | Server archive + list | Ops can re-download without re-dumping |
| Schedule | Manual only v1 | Prove dump path first |
| Retention | Hard cap 10, prune oldest on create | Disk safety without UI config |
| Restore | In scope | User request |
| Restore confirm | Type exact filename | User choice; no password re-entry v1 |
| Tooling | Raw `pg_dump`/`psql`, not Spatie Backup | Minimal surface for support admin |
| Format | Gzipped plain SQL | Simple full restore via `psql` |
