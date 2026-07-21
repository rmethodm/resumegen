<?php

namespace App\Filament\Widgets;

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
        return [
            Stat::make('Total Users', User::count()),
            Stat::make('Unread Messages', PortfolioMessage::whereNull('read_at')->count()),
            Stat::make('Published Articles', CareerArticle::where('is_published', true)->count()),
            Stat::make('Job Titles + Roles', JobTitle::count() + JobRole::count()),
        ];
    }
}
