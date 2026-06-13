<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Laravel\Cashier\Subscription;

class GrowthReport
{
    private const PAYING_TIERS = ['starter', 'pro', 'agency'];

    public function totalUsers(): int
    {
        return User::count();
    }

    /**
     * @return array<int, array{date: string, count: int, cost_cents: int}>
     */
    public function signupsSeries(string $period): array
    {
        $since = $this->since($period);

        return User::query()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->when($since, fn ($q) => $q->where('created_at', '>=', $since))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row): array => [
                'date' => (string) $row->date,
                'count' => (int) $row->count,
                'cost_cents' => 0,
            ])
            ->all();
    }

    private function activatedCount(): int
    {
        return User::has('resumes')->count();
    }

    private function payingCount(): int
    {
        return User::whereIn('plan_tier', self::PAYING_TIERS)->count();
    }

    /**
     * @return array<int, array{label: string, count: int, cost_cents: int}>
     */
    public function funnel(): array
    {
        return [
            ['label' => 'Signed up', 'count' => $this->totalUsers(), 'cost_cents' => 0],
            ['label' => 'Activated', 'count' => $this->activatedCount(), 'cost_cents' => 0],
            ['label' => 'Paying', 'count' => $this->payingCount(), 'cost_cents' => 0],
        ];
    }

    public function activationRate(): float
    {
        $total = $this->totalUsers();

        return $total === 0 ? 0.0 : round($this->activatedCount() / $total * 100, 1);
    }

    public function conversionRate(): float
    {
        $total = $this->totalUsers();

        return $total === 0 ? 0.0 : round($this->payingCount() / $total * 100, 1);
    }

    public function avgDaysToConvert(): ?float
    {
        $firstSubs = Subscription::query()
            ->selectRaw('user_id, MIN(created_at) as first_sub')
            ->groupBy('user_id')
            ->pluck('first_sub', 'user_id');

        if ($firstSubs->isEmpty()) {
            return null;
        }

        $users = User::whereIn('id', $firstSubs->keys())->get(['id', 'created_at'])->keyBy('id');

        $diffs = [];
        foreach ($firstSubs as $userId => $firstSub) {
            $user = $users->get($userId);
            if ($user && $user->created_at) {
                $diffs[] = $user->created_at->diffInDays(Carbon::parse($firstSub));
            }
        }

        return empty($diffs) ? null : round(array_sum($diffs) / count($diffs), 1);
    }

    /**
     * @return array{referred_signups: int, referred_converted: int}
     */
    public function referral(): array
    {
        return [
            'referred_signups' => User::whereNotNull('referred_by_user_id')->count(),
            'referred_converted' => User::whereNotNull('referred_by_user_id')
                ->whereIn('plan_tier', self::PAYING_TIERS)
                ->count(),
        ];
    }

    private function since(string $period): ?Carbon
    {
        return match ($period) {
            '7d' => now()->subDays(7),
            '30d' => now()->subDays(30),
            default => now()->subDays(90), // 'all' capped to 90d for the chart
        };
    }
}
