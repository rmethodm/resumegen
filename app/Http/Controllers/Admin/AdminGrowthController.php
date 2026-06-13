<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\GrowthReport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminGrowthController extends Controller
{
    public function __construct(private readonly GrowthReport $report) {}

    public function index(Request $request): Response
    {
        $period = in_array($request->input('period'), ['7d', '30d', 'all'], true)
            ? $request->input('period')
            : '30d';

        return Inertia::render('Admin/Growth/Index', [
            'period' => $period,
            'kpis' => [
                'total_users' => $this->report->totalUsers(),
                'activation_rate' => $this->report->activationRate(),
                'conversion_rate' => $this->report->conversionRate(),
                'avg_days_to_convert' => $this->report->avgDaysToConvert(),
            ],
            'signups' => $this->report->signupsSeries($period),
            'funnel' => $this->report->funnel(),
            'referral' => $this->report->referral(),
            'retention' => $this->report->retentionCohorts(),
        ]);
    }
}
