# Admin Delivery Log — Design Spec

**Date:** 2026-06-13
**Status:** Approved
**Part of:** Super-admin stretch items (sub-project 5; first of mail-log → MRR-snapshots → growth)

## Goal

Persist a record of outbound email and inbound Stripe webhook events so the Ops dashboard can show real delivery history instead of only config status. Append-only, best-effort (logging must never break a send or a webhook), with a daily retention prune.

## Data model — `system_events`

Append-only (`created_at` only):

| column | type | notes |
|---|---|---|
| `id` | bigIncrements | |
| `channel` | string, indexed | `mail` \| `stripe_webhook` |
| `type` | string | mail subject, or Stripe event type (e.g. `invoice.paid`) |
| `status` | string | `sent` \| `received` \| `failed` |
| `recipient` | string, nullable | email address(es) for mail; null for webhooks |
| `meta` | json, nullable | mailer name / stripe event id, etc. |
| `created_at` | timestamp | `useCurrent` |

Index `(channel)`, `(created_at)`.

## Model — `App\Models\SystemEvent`

- `public const UPDATED_AT = null;`
- fillable: all columns; `meta` array cast.
- Static best-effort recorder:

```php
public static function record(string $channel, string $type, string $status, ?string $recipient = null, array $meta = []): void
{
    try {
        self::create(compact('channel', 'type', 'status', 'recipient') + ['meta' => $meta ?: null]);
    } catch (\Throwable) {
        // best-effort; never break the send/webhook it observes
    }
}
```

## Listeners — registered in `AppServiceProvider::boot()`

```php
Event::listen(MessageSent::class, function (MessageSent $e) {
    try {
        $email = $e->message; // Symfony\Component\Mime\Email (via __get)
        $to = collect($email->getTo())->map->getAddress()->implode(', ');
        SystemEvent::record('mail', $email->getSubject() ?: '(no subject)', 'sent', $to ?: null);
    } catch (\Throwable) {
    }
});

Event::listen(WebhookReceived::class, function (WebhookReceived $e) {
    SystemEvent::record('stripe_webhook', $e->payload['type'] ?? 'unknown', 'received', null, ['id' => $e->payload['id'] ?? null]);
});
```

`WebhookReceived` is Cashier's event (`Laravel\Cashier\Events\WebhookReceived`). We log on receipt (status `received`); `WebhookHandled` is not separately logged — the goal is a delivery record, not a processing trace.

## Retention — `system-events:prune`

Command `App\Console\Commands\PruneSystemEvents` (`system-events:prune {--days=30}`) deletes rows older than the cutoff (mail/webhook volume is high; 30-day window). Scheduled daily in `routes/console.php`.

## Ops dashboard surfacing

Extend `AdminOpsController@index` to also pass `recentEvents` = latest 50 `system_events` mapped to `{id, channel, type, status, recipient, created_at}`. `Admin/Ops/Index.tsx` gains a "Recent deliveries" section: a table with channel badge (mail/stripe), type, recipient, status, when. Empty state when none.

No new route or nav entry — it lives inside the existing Ops page.

## Testing

`tests/Feature/Admin/AdminDeliveryLogTest.php`:
1. `SystemEvent::record` writes a row.
2. Firing `WebhookReceived(['type'=>'invoice.paid','id'=>'evt_1'])` writes a `stripe_webhook` row with type `invoice.paid`.
3. Sending mail (config `mail.default=array`, `Mail::raw(...)->to('x@y.com')->subject('Hello')`) writes a `mail` row with type `Hello`, recipient `x@y.com`.
4. Ops index includes `recentEvents` containing a seeded event.
5. `system-events:prune --days=30` deletes a 40-day-old row, keeps a recent one.

## Out of scope

Per-recipient open/click tracking; webhook *handled/failed* outcome tracing; a dedicated full-page event browser (the Ops section shows the recent 50 — deep history is pruned at 30 days by design).
