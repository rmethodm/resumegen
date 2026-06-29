<?php

namespace App\Filament\Pages;

use App\Services\GrowthReport;
use Filament\Pages\Page;

class GrowthPage extends Page
{
    protected static ?string $navigationLabel = 'Growth';

    protected static ?string $navigationIcon = 'heroicon-o-arrow-trending-up';

    protected static ?string $navigationGroup = 'Analytics';

    protected static string $view = 'filament.pages.growth-page';

    protected function getViewData(): array
    {
        $report = app(GrowthReport::class);

        $period = request()->query('period', '30d');
        if (! in_array($period, ['7d', '30d', 'all'], true)) {
            $period = '30d';
        }

        return [
            'period' => $period,
            'kpis' => [
                'total_users' => $report->totalUsers(),
                'activation_rate' => $report->activationRate(),
                'conversion_rate' => $report->conversionRate(),
                'avg_days_to_convert' => $report->avgDaysToConvert(),
            ],
            'funnel' => $report->funnel(),
            'retention' => $report->retentionCohorts(),
        ];
    }
}
