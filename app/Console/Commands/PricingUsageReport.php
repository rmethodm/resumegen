<?php

namespace App\Console\Commands;

use App\Models\JobPairing;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('pricing:usage')]
#[Description("Report the jobs-tailored distribution behind the pricing model's go/no-go decision")]
class PricingUsageReport extends Command
{
    /**
     * Jobs covered by the proposed $5 signup grant. The first paid job would be the
     * 10th, so "exceeds the grant" means more than 9 — see the pricing doc §12.
     *
     * Hardcoded rather than derived from config('pricing.signup_grant_cents'): both
     * prices are currently 0, so deriving it would divide by zero. Re-derive this if
     * the grant or the unit price moves.
     */
    private const GRANT_JOBS = 9;

    public function handle(): int
    {
        // Live, real jobs only: __general__ is not a job someone pursued, and a
        // refunded pairing is one they backed out of.
        $counts = JobPairing::query()
            ->whereNull('refunded_at')
            ->where('billing_key', '!=', JobPairing::GENERAL)
            ->selectRaw('user_id, COUNT(*) as jobs')
            ->groupBy('user_id')
            ->pluck('jobs')
            ->map(fn ($jobs): int => (int) $jobs)
            ->sort()
            ->values()
            ->all();

        if ($counts === []) {
            $this->warn('No job pairings recorded yet — nothing to report.');

            return self::SUCCESS;
        }

        $users = count($counts);
        $exceeding = count(array_filter($counts, fn (int $jobs): bool => $jobs > self::GRANT_JOBS));

        $this->table(['Metric', 'Value', 'Re-base if'], [
            ['Users with >=1 job', $users, '—'],
            ['Median jobs tailored', $this->median($counts), 'median <= 10'],
            ['p90 jobs tailored', $this->percentile($counts, 90), 'p90 < 12'],
            [
                'Users exceeding '.self::GRANT_JOBS.' jobs',
                sprintf('%d (%.1f%%)', $exceeding, $exceeding / $users * 100),
                '< 15%',
            ],
        ]);

        $this->line('');
        $this->line('Denominator is users who tailored at least one job — users who never');
        $this->line('used job-targeted AI are excluded, or the median reads 0 and says nothing.');

        return self::SUCCESS;
    }

    /**
     * @param  list<int>  $sorted
     */
    private function median(array $sorted): float
    {
        $count = count($sorted);
        $middle = intdiv($count, 2);

        return $count % 2 === 1
            ? $sorted[$middle]
            : ($sorted[$middle - 1] + $sorted[$middle]) / 2;
    }

    /**
     * Nearest-rank percentile, computed in PHP so the report reads the same on
     * Postgres and on SQLite (the test connection), which disagree on percentile SQL.
     *
     * @param  list<int>  $sorted
     */
    private function percentile(array $sorted, int $percentile): int
    {
        $rank = (int) ceil($percentile / 100 * count($sorted));

        return $sorted[max($rank - 1, 0)];
    }
}
