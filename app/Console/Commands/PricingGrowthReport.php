<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Month-by-month P&L for the prepaid model, read straight off the ledger.
 *
 * Works on seeded sample data (`db:seed --class=GrowthSampleSeeder`) and, unchanged,
 * on real traffic once PRICING_JOB_CENTS is non-zero. Everything except the two
 * costs we do not store — Stripe fees and hosting — comes from the database.
 */
#[Signature('pricing:growth {--months=12 : How many months back to report} {--infra= : Fixed monthly hosting cost in dollars}')]
#[Description('Month-by-month revenue, AI cost, and margin for the prepaid pricing model')]
class PricingGrowthReport extends Command
{
    /** Stripe standard card pricing: 2.9% + 30c per successful charge. */
    private const STRIPE_PERCENT = 0.029;

    private const STRIPE_FIXED_CENTS = 30;

    /** Default hosting cost per month, in dollars. A small VPS plus Postgres. */
    private const DEFAULT_INFRA_DOLLARS = 40.0;

    public function handle(): int
    {
        $months = max(1, (int) $this->option('months'));
        $infraCents = (int) round(((float) ($this->option('infra') ?? self::DEFAULT_INFRA_DOLLARS)) * 100);
        $since = Carbon::now()->startOfMonth()->subMonths($months - 1);

        $signups = $this->countByMonth(DB::table('users'), $since);
        $topups = DB::table('balance_transactions')->where('reason', 'topup')->where('created_at', '>=', $since);
        $topupCents = $this->sumByMonth(clone $topups, $since, 'amount_cents');
        $topupCount = $this->countByMonth(clone $topups, $since);
        $liveJobs = DB::table('job_pairings')->whereNull('refunded_at')->where('billing_key', '!=', '__general__');
        $jobs = $this->countByMonth($liveJobs, $since);
        $aiMicro = $this->sumByMonth(DB::table('ai_requests'), $since, 'estimated_cost_micro_cents');
        $activeUsers = $this->distinctUsersByMonth($since);

        if (array_sum($signups) === 0) {
            $this->warn('No accounts in the reporting window — seed with `php artisan db:seed --class=GrowthSampleSeeder`.');

            return self::SUCCESS;
        }

        $rows = [];
        $cumulativeCents = 0;

        for ($i = 0; $i < $months; $i++) {
            $key = $since->copy()->addMonths($i)->format('Y-m');

            $revenue = $topupCents[$key] ?? 0;
            $stripe = (int) round(($revenue * self::STRIPE_PERCENT) + (($topupCount[$key] ?? 0) * self::STRIPE_FIXED_CENTS));
            // Micro-cents to cents. Rounded once, at the edge, as the AI docs require.
            $ai = (int) round(($aiMicro[$key] ?? 0) / 1_000_000);
            $net = $revenue - $stripe - $ai - $infraCents;
            $cumulativeCents += $net;

            $rows[] = [
                $key,
                number_format($signups[$key] ?? 0),
                number_format($activeUsers[$key] ?? 0),
                number_format($jobs[$key] ?? 0),
                $this->dollars($revenue),
                $this->dollars($ai),
                $this->dollars($stripe),
                $this->dollars($infraCents),
                $this->dollars($net),
                $this->dollars($cumulativeCents),
            ];
        }

        $this->table(
            ['Month', 'Signups', 'Active', 'Jobs', 'Revenue', 'AI cost', 'Stripe', 'Infra', 'Net', 'Cumulative'],
            $rows
        );

        $this->summarise($infraCents, $months);

        return self::SUCCESS;
    }

    private function summarise(int $infraCents, int $months): void
    {
        $revenue = (int) DB::table('balance_transactions')->where('reason', 'topup')->sum('amount_cents');
        $aiCents = (int) round((int) DB::table('ai_requests')->sum('estimated_cost_micro_cents') / 1_000_000);
        $jobs = (int) DB::table('job_pairings')->where('billing_key', '!=', '__general__')->whereNull('refunded_at')->count();
        $payers = (int) DB::table('balance_transactions')->where('reason', 'topup')->distinct()->count('user_id');
        $users = (int) DB::table('users')->count();

        $this->line('');
        $this->table(['Metric', 'Value'], [
            ['Gross margin on AI', $revenue > 0 ? sprintf('%.1f%%', (1 - $aiCents / $revenue) * 100) : 'n/a'],
            // In cents, not dollars — at these volumes a per-job dollar figure is all zeroes.
            ['AI cost per job tailored', $jobs > 0 ? sprintf('%.2f cents (vs a 50c price)', $aiCents / $jobs) : 'n/a'],
            ['Paying users / all users', sprintf('%d / %d (%.1f%%)', $payers, $users, $users > 0 ? $payers / $users * 100 : 0)],
            ['Revenue per paying user', $payers > 0 ? $this->dollars((int) round($revenue / $payers)) : 'n/a'],
            ['Fixed cost to cover', $this->dollars($infraCents * $months).' over '.$months.' months'],
        ]);

        $this->line('');
        $this->line('Revenue is cash collected from top-ups, not revenue recognised — prepaid');
        $this->line('balance is a liability until it is spent. The gap only matters at exit.');
        $this->line('Grants are excluded: they are discount, not income.');
        $this->line('The final row is the current month and is partial.');
    }

    /**
     * Monthly buckets are folded in PHP, not SQL, because Postgres and SQLite (the
     * test connection) disagree on date extraction — the same reason
     * PricingUsageReport computes its percentiles here rather than in the query.
     *
     * @param  Builder  $query
     * @return array<string, int>
     */
    private function countByMonth($query, Carbon $since): array
    {
        return $this->fold($query, $since, fn (): int => 1);
    }

    /**
     * @param  Builder  $query
     * @return array<string, int>
     */
    private function sumByMonth($query, Carbon $since, string $column): array
    {
        return $this->fold($query->addSelect($column), $since, fn ($row): int => (int) $row->{$column});
    }

    /**
     * Users who tailored at least one job in the month — the retention signal that
     * signups alone cannot show.
     *
     * @return array<string, int>
     */
    private function distinctUsersByMonth(Carbon $since): array
    {
        $seen = [];

        foreach (DB::table('job_pairings')->where('created_at', '>=', $since)->select('created_at', 'user_id')->cursor() as $row) {
            $seen[Carbon::parse($row->created_at)->format('Y-m')][$row->user_id] = true;
        }

        return array_map(count(...), $seen);
    }

    /**
     * @param  Builder  $query
     * @param  callable(object): int  $value
     * @return array<string, int>
     */
    private function fold($query, Carbon $since, callable $value): array
    {
        $out = [];

        foreach ($query->where('created_at', '>=', $since)->addSelect('created_at')->cursor() as $row) {
            $key = Carbon::parse($row->created_at)->format('Y-m');
            $out[$key] = ($out[$key] ?? 0) + $value($row);
        }

        return $out;
    }

    private function dollars(int $cents): string
    {
        return ($cents < 0 ? '-$' : '$').number_format(abs($cents) / 100, 2);
    }
}
