<?php

namespace App\Services;

use App\Models\AiCreditLedgerEntry;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AiCreditService
{
    public function balance(User $user): int
    {
        return (int) AiCreditLedgerEntry::where('user_id', $user->id)->sum('amount');
    }

    public function grant(User $user, int $amount, string $reason, ?string $feature = null): void
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Grant amount must be greater than zero.');
        }

        AiCreditLedgerEntry::create([
            'user_id' => $user->id,
            'amount' => $amount,
            'reason' => $reason,
            'feature' => $feature,
        ]);
    }

    public function spend(User $user, int $amount, string $feature, ?int $aiRequestId = null): void
    {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Spend amount must be greater than zero.');
        }

        AiCreditLedgerEntry::create([
            'user_id' => $user->id,
            'amount' => -$amount,
            'reason' => 'spend',
            'feature' => $feature,
            'ai_request_id' => $aiRequestId,
        ]);
    }

    public function grantStarterIfNeeded(User $user): bool
    {
        return DB::transaction(function () use ($user) {
            $locked = User::whereKey($user->id)->lockForUpdate()->first();

            if ($locked->ai_starter_credits_granted_at !== null) {
                return false;
            }

            $this->grant($locked, (int) config('ai.starter_credits'), 'starter');
            $locked->ai_starter_credits_granted_at = now();
            $locked->save();

            $user->setAttribute('ai_starter_credits_granted_at', $locked->ai_starter_credits_granted_at);

            return true;
        });
    }
}
