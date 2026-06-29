<?php

namespace App\Filament\Pages;

use App\Services\AiUsageReport;
use App\Services\OpenAiUsageService;
use App\Services\RevenueReport;
use Filament\Pages\Page;

class AiOverviewPage extends Page
{
    protected static ?string $navigationLabel = 'AI Overview';

    protected static ?string $navigationIcon = 'heroicon-o-cpu-chip';

    protected static ?string $navigationGroup = 'Analytics';

    protected static string $view = 'filament.pages.ai-overview-page';

    protected function getViewData(): array
    {
        $report = app(AiUsageReport::class);
        $openAi = app(OpenAiUsageService::class);
        $revenue = app(RevenueReport::class);

        $period = request()->query('period', '30d');
        if (! in_array($period, ['7d', '30d', 'all'], true)) {
            $period = '30d';
        }

        $since = $report->since($period) ?? now()->subYears(5);

        return [
            'period' => $period,
            'totals' => $report->totals($period),
            'byFeature' => $report->breakdown('feature', $period),
            'byModel' => $report->breakdown('model', $period),
            'byStatus' => $report->breakdown('status', $period),
            'openAiCostCents' => $openAi->totalCostCents($since, now()),
            'mrrCents' => $revenue->mrrCents(),
        ];
    }
}
