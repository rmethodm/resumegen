<?php

namespace App\Services;

use App\Models\User;

class UserLimits
{
    private const ALL_TEMPLATES = [
        'classic', 'modern', 'minimal', 'minimal-ruled',
        'executive', 'ats',
        'skills-first', 'academic', 'bold',
    ];

    public static function resumeLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'starter' => 5,
            'pro', 'agency' => null,
            default => 5, // free or unknown — cap at 5
        };
    }

    public static function coverLetterLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free' => 3,
            'starter' => 5,
            'pro', 'agency' => null,
            default => 3, // unknown — most restrictive
        };
    }

    public static function jobLimit(User $user): ?int
    {
        return $user->planTier() === 'free' ? 3 : null;
    }

    public static function allowedTemplates(User $user): array
    {
        // All templates available to all tiers — kept for API compatibility
        return self::ALL_TEMPLATES;
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
