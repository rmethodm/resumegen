<?php

namespace App\Services;

use App\Models\AiRequest;
use App\Models\User;

class UserLimits
{
    private const ALL_TEMPLATES = [
        'classic', 'modern', 'minimal', 'minimal-ruled',
        'executive', 'ats',
        'skills-first', 'academic', 'bold',
    ];

    /** Templates available on the free tier; Starter+ unlocks the rest. */
    private const FREE_TEMPLATES = ['classic', 'modern', 'minimal', 'ats'];

    public static function resumeLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'starter' => 10,
            'pro', 'agency' => null,
            default => 2, // free or unknown — cap at 2
        };
    }

    public static function coverLetterLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free' => 1,
            'starter' => 10,
            'pro', 'agency' => null,
            default => 1, // unknown — most restrictive
        };
    }

    /** Team workspace + member seats are Agency-only. */
    public static function canCreateOrg(User $user): bool
    {
        return $user->planTier() === 'agency';
    }

    public static function canUseOrg(User $user): bool
    {
        return $user->planTier() === 'agency';
    }

    public static function jobLimit(User $user): ?int
    {
        return $user->planTier() === 'free' ? 3 : null;
    }

    public static function allowedTemplates(User $user): array
    {
        return $user->isAtLeastStarter() ? self::ALL_TEMPLATES : self::FREE_TEMPLATES;
    }

    public static function canDocx(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canStrengthHistory(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function customSectionLimit(User $user): ?int
    {
        return $user->planTier() === 'free' ? 2 : null;
    }

    public static function aiMonthlyLimit(User $user): int
    {
        $limits = config('ai.monthly_limits', []);

        return match ($user->planTier()) {
            'starter' => $limits['starter'] ?? 0,
            'pro' => $limits['pro'] ?? 0,
            'agency' => $limits['agency'] ?? 0,
            'free' => $limits['free'] ?? 0,
            default => $limits['free'] ?? 0, // unknown — most restrictive
        };
    }

    public static function aiRequestsThisMonth(User $user): int
    {
        return AiRequest::where('user_id', $user->id)
            ->where('status', 'success')
            ->where('created_at', '>=', now()->startOfMonth())
            ->count();
    }

    public static function canUseAi(User $user): bool
    {
        return self::aiRequestsThisMonth($user) < self::aiMonthlyLimit($user);
    }

    public static function aiRemaining(User $user): int
    {
        return max(0, self::aiMonthlyLimit($user) - self::aiRequestsThisMonth($user));
    }

    public static function aiCanUpgrade(User $user): bool
    {
        return in_array($user->planTier(), ['free', 'starter'], true);
    }

    public static function aiNextTier(User $user): ?string
    {
        return match ($user->planTier()) {
            'free' => 'starter',
            'starter' => 'pro',
            default => null,
        };
    }

    public static function requirePro(User $user): void
    {
        if (! in_array($user->planTier(), ['pro', 'agency'], true)) {
            abort(response()->json(['error' => 'Pro plan required.', 'required_tier' => 'pro'], 402));
        }
    }

    public static function tierFromPriceId(string $priceId): string
    {
        $proPrices = array_filter([
            config('services.stripe.pro_monthly_price_id'),
            config('services.stripe.pro_yearly_price_id'),
        ]);

        $starterPrices = array_filter([
            config('services.stripe.starter_monthly_price_id'),
            config('services.stripe.starter_yearly_price_id'),
        ]);

        $agencyPrices = array_filter([
            config('services.stripe.agency_monthly_price_id'),
            config('services.stripe.agency_yearly_price_id'),
        ]);

        if (in_array($priceId, $proPrices, true)) {
            return 'pro';
        }

        if (in_array($priceId, $starterPrices, true)) {
            return 'starter';
        }

        if (in_array($priceId, $agencyPrices, true)) {
            return 'agency';
        }

        return 'free';
    }
}
