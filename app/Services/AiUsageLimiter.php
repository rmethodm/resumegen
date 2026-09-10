<?php

namespace App\Services;

use App\Models\User;

/**
 * Gates AI spend on Cashier subscription + credit balance.
 * `ai_blocked` is a hard stop (429) regardless of subscription or balance.
 */
class AiUsageLimiter
{
    public function __construct(private AiCreditService $credits) {}

    public function remaining(User $user): int
    {
        return $this->credits->balance($user);
    }

    public function subscribedForAi(User $user): bool
    {
        return $user->subscribed('default');
    }

    public function allows(User $user, int $cost = 1): bool
    {
        return $this->refusalStatus($user, $cost) === null;
    }

    public function refusalStatus(User $user, int $cost = 1): ?int
    {
        if ($user->ai_blocked) {
            return 429;
        }

        if (! $this->subscribedForAi($user) || $this->credits->balance($user) < $cost) {
            return 402;
        }

        return null;
    }
}
