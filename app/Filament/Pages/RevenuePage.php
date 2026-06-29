<?php

namespace App\Filament\Pages;

use App\Services\RevenueReport;
use Filament\Pages\Page;

class RevenuePage extends Page
{
    protected static ?string $navigationLabel = 'Revenue';

    protected static ?string $navigationIcon = 'heroicon-o-currency-dollar';

    protected static ?string $navigationGroup = 'Analytics';

    protected static string $view = 'filament.pages.revenue-page';

    protected function getViewData(): array
    {
        $report = app(RevenueReport::class);

        return [
            'kpis' => [
                'mrr_cents' => $report->mrrCents(),
                'active_subscriptions' => $report->activeSubscriptions(),
                'paying_users' => $report->payingUsers(),
                'free_users' => $report->freeUsers(),
            ],
            'tierCounts' => $report->tierCounts(),
            'recent' => $report->recentSubscriptions(),
            'liveActiveSubscriptions' => $report->liveActiveSubscriptions(),
        ];
    }
}
