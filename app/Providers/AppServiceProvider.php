<?php

namespace App\Providers;

use App\Models\User;
use App\Services\ReferralRewardService;
use App\Services\UserLimits;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
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

        Subscription::saved(function (Subscription $subscription) {
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

            if (in_array($tier, ['starter', 'pro'])) {
                $user = User::find($subscription->user_id);
                if ($user) {
                    ReferralRewardService::grantIfEligible($user);
                }
            }
        });

        Subscription::deleted(function (Subscription $subscription) {
            User::where('id', $subscription->user_id)->update(['plan_tier' => 'free']);
        });
    }
}
