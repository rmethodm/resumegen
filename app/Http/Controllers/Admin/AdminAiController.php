<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\AiUsageReport;
use App\Services\OpenAiUsageService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminAiController extends Controller
{
    public function __construct(
        private AiUsageReport $report,
        private OpenAiUsageService $openAi,
    ) {}

    public function overview(Request $request): Response
    {
        $period = $this->period($request);
        $since = $this->report->since($period) ?? now()->subYears(5);

        return Inertia::render('Admin/Ai/Overview', [
            'period' => $period,
            'totals' => $this->report->totals($period),
            'series' => $this->report->dailySeries($period),
            'byFeature' => $this->report->breakdown('feature', $period),
            'byModel' => $this->report->breakdown('model', $period),
            'byStatus' => $this->report->breakdown('status', $period),
            'openAiCostCents' => $this->openAi->totalCostCents($since, now()),
        ]);
    }

    /**
     * Normalize the period query param to a known token.
     */
    private function period(Request $request): string
    {
        $period = (string) $request->query('period', '30d');

        return in_array($period, ['7d', '30d', 'all'], true) ? $period : '30d';
    }
}
