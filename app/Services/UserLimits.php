<?php

namespace App\Services;

use App\Models\AiUsageLog;
use App\Models\User;
use Illuminate\Support\Carbon;

class UserLimits
{
    private const FREE_ATS_MONTHLY_LIMIT = 3;

    private const FREE_INTERVIEW_COACH_MONTHLY_LIMIT = 3;

    private const ALL_TEMPLATES = [
        'classic', 'modern', 'minimal', 'minimal-ruled',
        'sidebar', 'creative', 'executive', 'ats',
        'skills-first', 'skills-first-visual', 'academic', 'bold', 'timeline',
    ];

    public static function resumeLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free', 'starter' => 5,
            default => null,
        };
    }

    public static function coverLetterLimit(User $user): ?int
    {
        return match ($user->planTier()) {
            'free' => 3,
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
            'free' => 30,
            'starter' => 30,
            default => 500,
        };
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

    public static function canAts(User $user): bool
    {
        if ($user->isAtLeastStarter()) {
            return true;
        }

        return self::atsUsesRemaining($user) > 0;
    }

    public static function atsUsageThisMonth(User $user): int
    {
        return AiUsageLog::where('user_id', $user->id)
            ->where('feature', 'ats_score')
            ->where('created_at', '>=', Carbon::now()->startOfMonth())
            ->count();
    }

    public static function atsUsesRemaining(User $user): ?int
    {
        if ($user->isAtLeastStarter()) {
            return null;
        }

        return max(0, self::FREE_ATS_MONTHLY_LIMIT - self::atsUsageThisMonth($user));
    }

    public static function canTailor(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canPdfImport(User $user): bool
    {
        // Always allowed — free tier can import
        return true;
    }

    public static function canGenerate(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canCoverLetterTailor(User $user): bool
    {
        return $user->isAtLeastStarter();
    }

    public static function canInterviewCoach(User $user): bool
    {
        if ($user->isAtLeastStarter()) {
            return true;
        }

        return self::interviewCoachUsesRemaining($user) > 0;
    }

    public static function interviewCoachUsageThisMonth(User $user): int
    {
        return AiUsageLog::where('user_id', $user->id)
            ->where('feature', 'interview_coach')
            ->where('created_at', '>=', Carbon::now()->startOfMonth())
            ->count();
    }

    public static function interviewCoachUsesRemaining(User $user): ?int
    {
        if ($user->isAtLeastStarter()) {
            return null;
        }

        return max(0, self::FREE_INTERVIEW_COACH_MONTHLY_LIMIT - self::interviewCoachUsageThisMonth($user));
    }

    public static function customSectionLimit(User $user): ?int
    {
        return $user->planTier() === 'free' ? 2 : null;
    }

    public static function aiUsageThisPeriod(User $user): int
    {
        return AiUsageLog::where('user_id', $user->id)
            ->where('created_at', '>=', Carbon::now()->startOfMonth())
            ->count();
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
