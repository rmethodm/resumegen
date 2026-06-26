<?php

namespace App\Console\Commands;

use App\Models\AiRequest;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

#[Signature('ai:cost-alert')]
#[Description("Email admin if yesterday's AI spend exceeded the configured threshold")]
class AiCostAlert extends Command
{
    public function handle(): int
    {
        $yesterday = now()->subDay();
        $threshold = (int) config('ai.daily_alert_threshold_cents', 500);

        $totalCents = AiRequest::whereBetween('created_at', [
            $yesterday->copy()->startOfDay(),
            $yesterday->copy()->endOfDay(),
        ])->sum('estimated_cost_cents');

        if ($totalCents < $threshold) {
            return self::SUCCESS;
        }

        $dollars = number_format($totalCents / 100, 2);
        $date = $yesterday->format('M j, Y');
        $adminEmail = config('mail.from.address');

        Mail::raw(
            "AI spend on {$date} was \${$dollars} (threshold: \$".number_format($threshold / 100, 2).").\n\nCheck /admin/ai for a breakdown.",
            fn ($msg) => $msg->to($adminEmail)->subject("AI cost alert: \${$dollars} on {$date}")
        );

        $this->info("Alert sent — \${$dollars} spent on {$date}.");

        return self::SUCCESS;
    }
}
