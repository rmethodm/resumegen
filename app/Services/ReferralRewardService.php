<?php

namespace App\Services;

use App\Models\ReferralEvent;
use App\Models\User;
use Laravel\Cashier\Cashier;

class ReferralRewardService
{
    public static function grantIfEligible(User $upgradedUser): void
    {
        if (! $upgradedUser->referred_by_user_id) {
            return;
        }

        if (ReferralEvent::where('referred_user_id', $upgradedUser->id)
            ->where('event_type', 'upgrade')
            ->exists()) {
            return;
        }

        $referrer = User::find($upgradedUser->referred_by_user_id);
        if (! $referrer) {
            return;
        }

        ReferralEvent::create([
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $upgradedUser->id,
            'event_type' => 'upgrade',
        ]);

        $referrer->increment('referral_rewards_earned');

        try {
            $sub = $referrer->subscription('default');
            if ($sub && $sub->active()) {
                $sub->extend(now()->addMonth());
            } else {
                $referrer->createOrGetStripeCustomer();
                Cashier::stripe()->customers->createBalanceTransaction(
                    $referrer->stripeId(),
                    [
                        'amount' => -900,
                        'currency' => 'usd',
                        'description' => 'Referral reward — 1 free month',
                    ]
                );
            }
        } catch (\Throwable $e) {
            \Log::warning('Referral Stripe reward failed', [
                'referrer_id' => $referrer->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
