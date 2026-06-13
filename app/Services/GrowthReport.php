<?php

namespace App\Services;

use App\Models\User;
use App\Models\UserActivityDay;
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

    /**
     * Weekly retention cohorts for the most recent $weeks signup cohorts.
     *
     * @return array<int, array{cohort: string, size: int, retention: array<int, float>}>
     */
    public function retentionCohorts(int $weeks = 6): array
    {
        $earliest = now()->startOfWeek()->subWeeks($weeks - 1);

        $users = User::query()
            ->where('created_at', '>=', $earliest)
            ->get(['id', 'created_at']);

        if ($users->isEmpty()) {
            return [];
        }

        // Per-user set of active week-start dates (Monday), one query.
        $activeWeeks = UserActivityDay::query()
            ->whereIn('user_id', $users->pluck('id'))
            ->get(['user_id', 'activity_date'])
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows
                ->map(fn ($r) => Carbon::parse($r->activity_date)->startOfWeek()->toDateString())
                ->unique()
                ->flip()
            );

        // Group users into signup-week cohorts.
        $cohorts = $users->groupBy(fn (User $u) => $u->created_at->startOfWeek()->toDateString());

        return $cohorts
            ->sortKeys()
            ->map(function ($cohortUsers, string $cohortStart) use ($weeks, $activeWeeks): array {
                $start = Carbon::parse($cohortStart);
                $maxOffset = (int) $start->diffInWeeks(now()->startOfWeek());

                $retention = [];
                for ($k = 0; $k <= min($weeks - 1, $maxOffset); $k++) {
                    $weekKey = $start->copy()->addWeeks($k)->toDateString();
                    $retained = $cohortUsers->filter(fn (User $u) => isset($activeWeeks[$u->id][$weekKey]))->count();
                    $retention[$k] = round($retained / $cohortUsers->count() * 100, 1);
                }

                return [
                    'cohort' => $cohortStart,
                    'size' => $cohortUsers->count(),
                    'retention' => $retention,
                ];
            })
            ->values()
            ->all();
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
