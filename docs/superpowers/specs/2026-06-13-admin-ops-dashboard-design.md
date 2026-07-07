# Admin Ops Dashboard — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Part of:** Super-admin initiative (sub-project 4 of 4)

## Goal

A master-admin operations dashboard surfacing the health of the background machinery: pending queue depth, failed jobs (with retry/forget), the scheduled-task inventory, and config-health checks. Scoped to what is **actually observable** in this app (database queue + Laravel scheduler) — webhook/mail *delivery history* is not persisted anywhere, so the dashboard reports config status for those rather than inventing a log.

## Controller — `App\Http\Controllers\Admin\AdminOpsController`

Master-admin gated by the `admin` route group.

### `index(Request): Response`
Builds and passes:
- `queue` = `{ pending: int, failed: int }` — `DB::table('jobs')->count()` and `DB::table('failed_jobs')->count()`.
- `failedJobs` = latest 50 from `failed_jobs`, mapped to `{uuid, connection, queue, job, failed_at, exception_summary}` where `job` is parsed from `payload` JSON (`displayName`) and `exception_summary` is the first line of `exception`.
- `schedule` = scheduled-command inventory from `app(Schedule::class)->events()`, mapped to `{command, expression}` (command string cleaned of the PHP binary/artisan prefix).
- `health` = config checks `[{key, ok, detail}]`:
  - Queue connection (`config('queue.default')`) — ok if not `sync`.
  - Mail mailer (`config('mail.default')`) — detail = mailer name; ok if not `log` in production-ish (always ok, informational).
  - Stripe secret (`config('cashier.secret')`) — ok if non-empty.
  - Stripe webhook secret (`config('cashier.webhook.secret')`) — ok if non-empty.
  - OpenAI key (`config('openai.api_key')`) — ok if non-empty.
- Renders `Admin/Ops/Index`.

### `retryFailed(string $uuid): RedirectResponse`
`AdminAuditLog::record('ops.job.retry', null, "Retried failed job {$uuid}", ['uuid'=>$uuid])`, then `Artisan::call('queue:retry', ['id' => [$uuid]])`, redirect back with flash.

### `forgetFailed(string $uuid): RedirectResponse`
`AdminAuditLog::record('ops.job.forget', null, "Deleted failed job {$uuid}", ['uuid'=>$uuid])`, then `DB::table('failed_jobs')->where('uuid', $uuid)->delete()`, redirect back.

(Both audited via sub-project 1. `target` is null — failed jobs aren't Eloquent models — so the uuid lives in `meta`/`description`.)

## Routes (inside `admin.` group)

```
GET    /ops                         ops.index
POST   /ops/failed/{uuid}/retry     ops.retry
DELETE /ops/failed/{uuid}           ops.forget
```

`{uuid}` is a raw string param (constrained to the failed_jobs uuid format isn't required — it's only used in a parameterized query / artisan id list).

## Frontend — `resources/js/Pages/Admin/Ops/Index.tsx`

`AdminLayout`. Reuses `Admin/Ai/Charts.tsx` `Stat`.
- Status tiles: Pending jobs, Failed jobs, Queue driver, Mail driver.
- Health checklist: each `health` row with a green ✓ / red ✗ dot + detail.
- Failed jobs table: job name · queue · failed_at · exception summary · [Retry] [Forget] (both `confirm()`-guarded; retry = `router.post`, forget = `router.delete`).
- Scheduled tasks table: command · cron expression.
- Empty states throughout.

Add an **Ops** nav entry to `AdminLayout` (`admin.ops.*`).

## Testing

`tests/Feature/Admin/AdminOpsTest.php`:
1. Index renders `Admin/Ops/Index` with `queue.pending`, `queue.failed`, `failedJobs`, `schedule`, `health` present.
2. A seeded `failed_jobs` row appears in `failedJobs` with its parsed job name.
3. `forgetFailed` deletes the `failed_jobs` row **and** writes an `ops.job.forget` audit entry.
4. `retryFailed` removes the row from `failed_jobs` (re-queued), writes an `ops.job.retry` audit entry, redirects. (Seed a row with `connection='database'`, `queue='default'`, valid JSON `payload` so `queue:retry` re-pushes cleanly.)
5. `health` includes a Stripe-secret check entry.
6. Non-master-admin gets 403 on `ops.index` and on a retry/forget route.

Failed-job rows are inserted directly via `DB::table('failed_jobs')->insert([...])` with a minimal valid JSON payload.

## Out of scope

Per-job payload inspection UI; bulk retry-all/flush (single-row actions only, consistent with the rest of the admin panel); real webhook/mail delivery logs (no storage exists — would need a dedicated table + listener, deferred).
