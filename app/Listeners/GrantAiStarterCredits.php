<?php

namespace App\Listeners;

use App\Models\User;
use App\Services\AiCreditService;
use Illuminate\Contracts\Events\ShouldBeDiscovered;
use Laravel\Cashier\Events\WebhookReceived;

class GrantAiStarterCredits implements ShouldBeDiscovered
{
    public function __construct(private AiCreditService $credits) {}

    /**
     * Registered explicitly in AppServiceProvider — skip auto-discovery.
     */
    public static function shouldBeDiscovered(): bool
    {
        return false;
    }

    public function handle(WebhookReceived $event): void
    {
        $type = $event->payload['type'] ?? null;

        if (! in_array($type, ['customer.subscription.created', 'customer.subscription.updated'], true)) {
            return;
        }

        // An `incomplete` subscription (payment not yet confirmed) must not
        // burn the one-time grant; it arrives later as an `updated` event once
        // it turns active. grantStarterIfNeeded() keeps delivery idempotent.
        $status = $event->payload['data']['object']['status'] ?? null;

        if (! in_array($status, ['active', 'trialing'], true)) {
            return;
        }

        $customerId = $event->payload['data']['object']['customer'] ?? null;

        if (! is_string($customerId) || $customerId === '') {
            return;
        }

        $user = User::where('stripe_id', $customerId)->first();

        if ($user === null) {
            return;
        }

        $this->credits->grantStarterIfNeeded($user);
    }
}
