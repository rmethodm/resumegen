<?php

namespace App\Services;

use App\Jobs\DeliverWebhook;
use App\Models\User;
use App\Models\WebhookEndpoint;

class WebhookDispatcher
{
    public static function dispatch(User $user, string $event, array $payload): void
    {
        WebhookEndpoint::where('user_id', $user->id)
            ->where('active', true)
            ->whereJsonContains('events', $event)
            ->each(function (WebhookEndpoint $endpoint) use ($event, $payload) {
                DeliverWebhook::dispatch($endpoint, $event, $payload);
            });
    }
}
