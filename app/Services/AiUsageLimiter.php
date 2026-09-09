<?php

namespace App\Services;

use App\Models\User;

/**
 * Free-tier AI request cap. `ai_limit_override` on the user bypasses the
 * default; `ai_blocked` is a hard stop regardless of remaining quota.
 */
class AiUsageLimiter
{
    private const DEFAULT_DAILY_LIMIT = 10;

    public function remaining(User $user): int
    {
        $limit = $user->ai_limit_override ?? self::DEFAULT_DAILY_LIMIT;

        $used = $user->aiRequests()
            ->where('created_at', '>=', now()->subDay())
            ->count();

        return max(0, $limit - $used);
    }

    public function allows(User $user): bool
    {
        return ! $user->ai_blocked;
    }
}
