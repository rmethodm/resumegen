<?php

namespace App\Providers;

use App\Models\SystemEvent;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Laravel\Cashier\Events\WebhookReceived;
use Laravel\Cashier\Subscription;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Delivery log: record outbound mail + inbound Stripe webhooks (best-effort).
        Event::listen(MessageSent::class, function (MessageSent $event): void {
            try {
                $email = $event->message; // Symfony\Component\Mime\Email
                $to = collect($email->getTo())->map->getAddress()->implode(', ');
                SystemEvent::record('mail', $email->getSubject() ?: '(no subject)', 'sent', $to ?: null);
            } catch (\Throwable) {
            }
        });

        Event::listen(WebhookReceived::class, function (WebhookReceived $event): void {
            SystemEvent::record('stripe_webhook', $event->payload['type'] ?? 'unknown', 'received', null, ['id' => $event->payload['id'] ?? null]);
        });

        Subscription::saved(function (Subscription $subscription) {
            if (! $subscription->isDirty(['stripe_status', 'stripe_price'])) {
                return;
            }

            if (in_array($subscription->stripe_status, ['canceled', 'incomplete_expired', 'unpaid'])) {
                User::where('id', $subscription->user_id)->update(['plan_tier' => 'free', 'is_agency' => false]);

                return;
            }

            if (! in_array($subscription->stripe_status, ['active', 'trialing'])) {
                return;
            }

            $item = $subscription->items()->first();

            if (! $item) {
                return;
            }

            $tier = UserLimits::tierFromPriceId($item->stripe_price);

            if ($tier === 'agency') {
                User::where('id', $subscription->user_id)->update(['plan_tier' => $tier, 'is_agency' => true]);
            } else {
                User::where('id', $subscription->user_id)->update(['plan_tier' => $tier, 'is_agency' => false]);
            }

        });

        Subscription::deleted(function (Subscription $subscription) {
            User::where('id', $subscription->user_id)->update(['plan_tier' => 'free', 'is_agency' => false]);
        });
    }
}
