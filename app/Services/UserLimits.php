<?php

namespace App\Services;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Support\Carbon;

class UserLimits
{
    private const FREE_TEMPLATES = ['classic', 'modern', 'ats', 'skills-first', 'bold'];

    private const ALL_TEMPLATES = [
        'classic', 'modern', 'minimal', 'minimal-ruled',
        'sidebar', 'creative', 'executive', 'ats',
        'skills-first', 'skills-first-visual', 'academic', 'bold', 'timeline',
    ];

    public static function resumeLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free' => 2,
            'starter' => 5,
            default => null,
        };
    }

    public static function coverLetterLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free' => 1,
            'starter' => 5,
            default => null,
        };
    }

    public static function jobLimit(User $user): ?int
    {
        return $user->planTier() === 'free' ? 3 : null;
    }

    public static function aiLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free' => 5,
            'starter' => 30,
            default => 500,
        };
    }

    public static function allowedTemplates(User $user): array
    {
        return $user->planTier() === 'free' ? self::FREE_TEMPLATES : self::ALL_TEMPLATES;
    }

    public static function canDocx(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canAts(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canTailor(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canPdfImport(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canGenerate(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canCoverLetterTailor(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function customSectionLimit(User $user): ?int
    {
        return $user->planTier() === 'free' ? 2 : null;
    }

    public static function aiUsageThisPeriod(User $user): int
    {
        $query = AiUsageLog::where('user_id', $user->id);

        if ($user->planTier() !== 'free') {
            $query->where('created_at', '>=', Carbon::now()->startOfMonth());
        }

        return $query->count();
    }

    public static function atAiLimit(User $user): bool
    {
        $limit = self::aiLimit($user);

        return $limit !== null && self::aiUsageThisPeriod($user) >= $limit;
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

        if (in_array($priceId, $proPrices, true)) {
            return 'pro';
        }

        if (in_array($priceId, $starterPrices, true)) {
            return 'starter';
        }

        return 'free';
    }
}
