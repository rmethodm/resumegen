<?php

namespace App\Providers;

use App\Models\SystemEvent;
use App\Models\User;
use App\Services\UserLimits;
use Illuminate\Mail\Events\MessageSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Laravel\Cashier\Cashier;
use Laravel\Cashier\Subscription;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Webhooks are removed from this app: Cashier must not register POST /stripe/webhook.
        // Subscription tier changes therefore only sync when the app itself writes a Subscription.
        Cashier::ignoreRoutes();
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Delivery log: record outbound mail (best-effort).
        Event::listen(MessageSent::class, function (MessageSent $event): void {
            try {
                $email = $event->message; // Symfony\Component\Mime\Email
                $to = collect($email->getTo())->map->getAddress()->implode(', ');
                SystemEvent::record('mail', $email->getSubject() ?: '(no subject)', 'sent', $to ?: null);
            } catch (\Throwable) {
            }
        });

        Subscription::saved(function (Subscription $subscription) {
            if (! $subscription->isDirty(['stripe_status', 'stripe_price'])) {
                return;
            }

            if (in_array($subscription->stripe_status, ['canceled', 'incomplete_expired', 'unpaid'])) {
                User::where('id', $subscription->user_id)->update(['plan_tier' => 'free']);

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

            User::where('id', $subscription->user_id)->update(['plan_tier' => $tier]);
        });

        Subscription::deleted(function (Subscription $subscription) {
            User::where('id', $subscription->user_id)->update(['plan_tier' => 'free']);
        });
    }
}
