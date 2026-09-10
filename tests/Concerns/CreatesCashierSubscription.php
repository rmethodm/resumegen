<?php

namespace Tests\Concerns;

use App\Models\User;
use DateTimeInterface;
use Illuminate\Support\Str;
use Laravel\Cashier\Subscription;

trait CreatesCashierSubscription
{
    protected function subscribeUser(
        User $user,
        string $stripeStatus = 'active',
        ?DateTimeInterface $endsAt = null,
    ): void {
        Subscription::query()->create([
            'user_id' => $user->id,
            'type' => 'default',
            'stripe_id' => 'sub_test_'.Str::lower((string) Str::ulid()),
            'stripe_status' => $stripeStatus,
            'stripe_price' => 'price_test',
            'quantity' => 1,
            'ends_at' => $endsAt,
        ]);

        $user->unsetRelation('subscriptions');
    }
}
