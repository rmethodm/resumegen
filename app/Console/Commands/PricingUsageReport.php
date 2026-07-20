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
     * Jobs covered by the proposed $2 signup grant: $2.00 less the reserved
     * __general__ pairing at 50c, divided by 50c a job. The first paid job is
     * therefore the 4th, so "exceeds the grant" means more than 3.
     *
     * Hardcoded rather than derived from config('pricing.signup_grant_cents'): both
     * prices are currently 0, so deriving it would divide by zero. Re-derive this if
     * the grant or the unit price moves.
     *
     * Was 9, for the $5 grant, until 2026-07-20.
     */
    private const GRANT_JOBS = 3;

    /**
     * The §12 re-base triggers, as formulas of GRANT_JOBS rather than free-standing
     * judgments — the pricing doc is explicit that they are derived from the grant and
     * that any change to the grant must re-derive them. Stated here so the next change
     * is arithmetic instead of archaeology:
     *
     *   median <= GRANT_JOBS + 1  — the median user pays for at most one job
     *   p90    <  GRANT_JOBS + 3  — even the top decile pays barely anything
     *   % exceeding GRANT_JOBS < 15% — too few users reach a card at all
     *
     * At the old grant of 9 these produced the doc's 10, 12, and 15%.
     */
    private const MEDIAN_TRIGGER = self::GRANT_JOBS + 1;

    private const P90_TRIGGER = self::GRANT_JOBS + 3;

    private const CONVERSION_TRIGGER_PERCENT = 15;

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
            ['Median jobs tailored', $this->median($counts), 'median <= '.self::MEDIAN_TRIGGER],
            ['p90 jobs tailored', $this->percentile($counts, 90), 'p90 < '.self::P90_TRIGGER],
            [
                'Users exceeding '.self::GRANT_JOBS.' jobs',
                sprintf('%d (%.1f%%)', $exceeding, $exceeding / $users * 100),
                '< '.self::CONVERSION_TRIGGER_PERCENT.'%',
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
