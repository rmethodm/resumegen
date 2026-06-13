# Admin Delivery Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.

**Goal:** Append-only `system_events` log of outbound mail + inbound Stripe webhooks, surfaced on the Ops dashboard, with daily prune.

**Architecture:** `system_events` table + `SystemEvent` model (best-effort `record()`); `MessageSent`/`WebhookReceived` listeners in `AppServiceProvider`; `system-events:prune` command; `AdminOpsController` passes `recentEvents` to `Admin/Ops/Index.tsx`.

**Tech Stack:** Laravel 13, PHP 8.4, Cashier 16, Inertia v2, React/TS, PHPUnit 12.

---

### Task 1: Table + model + record() test

**Files:**
- Create: `database/migrations/2026_06_13_210000_create_system_events_table.php`
- Create: `app/Models/SystemEvent.php`
- Create: `database/factories/SystemEventFactory.php`
- Test: `tests/Feature/Admin/AdminDeliveryLogTest.php`

- [ ] Migration per spec. Model (`UPDATED_AT=null`, fillable, meta cast, static `record()`). Factory.
- [ ] Test `record()` writes a row. Migrate. Run → PASS. Commit.

### Task 2: Listeners + prune command + tests

**Files:**
- Modify: `app/Providers/AppServiceProvider.php`
- Create: `app/Console/Commands/PruneSystemEvents.php`
- Modify: `routes/console.php`
- Test: `tests/Feature/Admin/AdminDeliveryLogTest.php`

- [ ] Tests: `WebhookReceived` → stripe row; `Mail::raw` (mail.default=array) → mail row with subject + recipient; prune deletes 40d-old keeps recent.
- [ ] Run → FAIL.
- [ ] Register two `Event::listen` closures in `AppServiceProvider::boot()`; create prune command; schedule daily.
- [ ] Run → PASS. Pint. Commit.

### Task 3: Ops surfacing + test + build

**Files:**
- Modify: `app/Http/Controllers/Admin/AdminOpsController.php`
- Modify: `resources/js/Pages/Admin/Ops/Index.tsx`
- Test: `tests/Feature/Admin/AdminDeliveryLogTest.php`

- [ ] Test: ops index includes `recentEvents` with a seeded event.
- [ ] Add `recentEvents` to controller index; add "Recent deliveries" table to Ops page.
- [ ] `npm run build`. Run full file + AdminOpsTest → PASS. Commit.

### Task 4: Docs + finish

- [ ] CLAUDE.md note. Full suite green. Merge to main.
