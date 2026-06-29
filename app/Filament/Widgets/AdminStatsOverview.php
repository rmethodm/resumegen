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

        $aiRequestsToday = AiRequest::where('created_at', '>=', $todayStart)->count();
        $aiSpendTodayCents = (int) AiRequest::where('created_at', '>=', $todayStart)
            ->sum('estimated_cost_cents');

        return [
            Stat::make('Total Users', User::count()),
            Stat::make('Unread Messages', PortfolioMessage::whereNull('read_at')->count()),
            Stat::make('Published Articles', CareerArticle::where('is_published', true)->count()),
            Stat::make('Job Titles + Roles', JobTitle::count() + JobRole::count()),
            Stat::make('AI Requests Today', $aiRequestsToday),
            Stat::make('AI Spend Today', '$'.number_format($aiSpendTodayCents / 100, 2)),
        ];
    }
}
