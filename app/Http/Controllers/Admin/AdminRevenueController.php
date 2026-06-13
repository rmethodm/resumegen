<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\RevenueReport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminRevenueController extends Controller
{
    public function __construct(private readonly RevenueReport $report) {}

    public function index(Request $request): Response
    {
        $period = in_array($request->input('period'), ['7d', '30d', 'all'], true)
            ? $request->input('period')
            : '30d';

        $counts = $this->report->tierCounts();

        $tierBars = collect(['free', 'starter', 'pro', 'agency'])
            ->map(fn (string $tier): array => [
                'label' => ucfirst($tier),
                'count' => $counts[$tier],
                'cost_cents' => 0,
            ])
            ->all();

        return Inertia::render('Admin/Revenue/Index', [
            'period' => $period,
            'kpis' => [
                'mrr_cents' => $this->report->mrrCents(),
                'active_subscriptions' => $this->report->activeSubscriptions(),
                'paying_users' => $this->report->payingUsers(),
                'free_users' => $this->report->freeUsers(),
            ],
            'tierBars' => $tierBars,
            'series' => $this->report->newSubscriptionsSeries($period),
            'recent' => $this->report->recentSubscriptions(),
            'liveActiveSubscriptions' => $this->report->liveActiveSubscriptions(),
        ]);
    }
}
