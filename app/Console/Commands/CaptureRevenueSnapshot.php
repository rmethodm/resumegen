<?php

namespace App\Console\Commands;

use App\Models\RevenueSnapshot;
use App\Services\RevenueReport;
use Illuminate\Console\Command;

class CaptureRevenueSnapshot extends Command
{
    protected $signature = 'revenue:snapshot';

    protected $description = 'Capture a daily snapshot of revenue metrics (MRR, tiers, active subs) for historical reporting.';

    public function handle(RevenueReport $report): int
    {
        RevenueSnapshot::updateOrCreate(
            ['captured_on' => today()],
            [
                'mrr_cents' => $report->mrrCents(),
                'paying_users' => $report->payingUsers(),
                'free_users' => $report->freeUsers(),
                'active_subscriptions' => $report->activeSubscriptions(),
                'tier_counts' => $report->tierCounts(),
            ],
        );

        $this->info('Revenue snapshot captured for '.today()->toDateString().'.');

        return self::SUCCESS;
    }
}
