<?php

namespace App\Filament\Widgets;

use App\Models\AiRequest;
use App\Models\CareerArticle;
use App\Models\JobRole;
use App\Models\JobTitle;
use App\Models\PortfolioMessage;
use App\Models\User;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class AdminStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $todayStart = now()->startOfDay();

        $stats = [
            Stat::make('Total Users', User::count()),
            Stat::make('Unread Messages', PortfolioMessage::whereNull('read_at')->count()),
            Stat::make('Published Articles', CareerArticle::where('is_published', true)->count()),
            Stat::make('Job Titles + Roles', JobTitle::count() + JobRole::count()),
        ];

        if (! config('ai.enabled')) {
            return $stats;
        }

        $aiRequestsToday = AiRequest::where('created_at', '>=', $todayStart)->count();
        $aiSpendTodayMicroCents = (int) AiRequest::where('created_at', '>=', $todayStart)
            ->sum('estimated_cost_micro_cents');

        return [
            ...$stats,
            Stat::make('AI Requests Today', $aiRequestsToday),
            // 4dp, not 2 — a day of gpt-4o-mini traffic is worth cents, and $0.00 was
            // exactly the uninformative figure this widget used to show.
            Stat::make('AI Spend Today', '$'.number_format($aiSpendTodayMicroCents / 100_000_000, 4)),
        ];
    }
}
