<?php

namespace App\Services;

use App\Models\AiCreditLedgerEntry;
use App\Models\User;
use Illuminate\Support\Facades\DB;

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

    /**
     * Reserve-then-settle: under a lock on the user row, re-check the gate and
     * insert the debit before the (slow) model call, so concurrent requests
     * cannot all pass the balance check and overdraw. On model failure the
     * caller refunds via AiCreditService::refund().
     *
     * @return AiCreditLedgerEntry|int the debit entry, or a 402/429 refusal status
     */
    public function reserve(User $user, int $cost, string $feature): AiCreditLedgerEntry|int
    {
        return DB::transaction(function () use ($user, $cost, $feature): AiCreditLedgerEntry|int {
            $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();

            if ($status = $this->refusalStatus($locked, $cost)) {
                return $status;
            }

            return $this->credits->spend($locked, $cost, $feature);
        });
    }
}
