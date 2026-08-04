<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

/**
 * Soft monthly AI quotas per user (free-tier taste).
 * Not billing — counters reset on calendar month key.
 */
final class AiUsageLimiter
{
    public function remaining(User $user, string $action): int
    {
        $cap = $this->cap($action);
        if ($cap <= 0) {
            return 0;
        }

        $used = (int) Cache::get($this->key($user, $action), 0);

        return max(0, $cap - $used);
    }

    public function allow(User $user, string $action): bool
    {
        return $this->remaining($user, $action) > 0;
    }

    public function hit(User $user, string $action): void
    {
        $key = $this->key($user, $action);
        $used = (int) Cache::get($key, 0);
        Cache::put($key, $used + 1, now()->endOfMonth());
    }

    public function cap(string $action): int
    {
        return match ($action) {
            'bullet_rewrite' => (int) config('ai.quotas.bullet_rewrite', 5),
            'summary' => (int) config('ai.quotas.summary', 2),
            default => 0,
        };
    }

    private function key(User $user, string $action): string
    {
        return 'ai_quota:'.$user->id.':'.$action.':'.now()->format('Y-m');
    }
}
