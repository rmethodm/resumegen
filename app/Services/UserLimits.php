<?php

namespace App\Services;

use App\Models\AiRequest;
use App\Models\User;
use App\Support\ResumeDocument;

/**
 * Every feature in the app is free and unlimited. The only thing metered here is AI,
 * and that is a cost control, not a plan gate: OpenAI spend scales with usage, so an
 * unbounded quota would let a single account run up an arbitrary bill. The template
 * allowlist also lives here — several controllers validate against it.
 */
class UserLimits
{
    /**
     * @return list<string>
     */
    public static function allTemplates(): array
    {
        return ResumeDocument::TEMPLATES;
    }

    public static function aiMonthlyLimit(User $user): int
    {
        if ($user->ai_limit_override !== null) {
            return (int) $user->ai_limit_override;
        }

        return (int) config('ai.monthly_limit', 0);
    }

    public static function aiRequestsThisMonth(User $user): int
    {
        $since = now()->startOfMonth();
        if ($user->ai_usage_reset_at !== null && $user->ai_usage_reset_at->greaterThan($since)) {
            $since = $user->ai_usage_reset_at;
        }

        return AiRequest::where('user_id', $user->id)
            ->where('status', 'success')
            ->where('created_at', '>=', $since)
            ->count();
    }

    public static function canUseAi(User $user): bool
    {
        if ($user->ai_blocked) {
            return false;
        }

        return self::aiRequestsThisMonth($user) < self::aiMonthlyLimit($user);
    }

    public static function aiRemaining(User $user): int
    {
        return max(0, self::aiMonthlyLimit($user) - self::aiRequestsThisMonth($user));
    }

    /**
     * A zero quota never had a limit to "reach" — saying so reads as a bug to the user.
     * Distinguish never-had-access (AI switched off for this account) from used-it-up.
     */
    public static function aiLimitMessage(User $user): string
    {
        return self::aiMonthlyLimit($user) === 0
            ? 'AI features are unavailable on this account.'
            : 'Monthly AI limit reached.';
    }
}
