<?php

namespace Tests\Feature;

use App\Models\JobPairing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingUsageReportTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Signed up 120 days ago by default — past the command's 90-day maturity window, so
     * the user counts. Tests that care about censoring pass a smaller number explicitly.
     */
    private function userWithJobs(int $jobs, int $signedUpDaysAgo = 120): User
    {
        $user = User::factory()->create([
            'created_at' => now()->subDays($signedUpDaysAgo),
        ]);

        for ($i = 0; $i < $jobs; $i++) {
            $user->jobPairings()->create([
                'billing_key' => JobPairing::billingKey("Company {$i}", 'Engineer'),
                'company' => "Company {$i}",
                'title' => 'Engineer',
                'price_cents' => 0,
            ]);
        }

        return $user;
    }

    /**
     * The three numbers this command exists to produce decide whether the pricing
     * model is viable at all (pricing doc §12), so a wrong median is not a cosmetic
     * bug — it is a go/no-go signal pointing the wrong way.
     */
    public function test_it_reports_the_jobs_tailored_distribution(): void
    {
        // Sorted counts 1, 4, 7, 11, 13 → median 7, p90 13, and four users above the
        // $2 grant's three free jobs (4, 7, 11, 13).
        foreach ([7, 1, 13, 4, 11] as $jobs) {
            $this->userWithJobs($jobs);
        }

        $this->artisan('pricing:usage')
            ->expectsOutputToContain('7')   // median
            ->expectsOutputToContain('13')  // p90
            ->expectsOutputToContain('4 (80.0%)')
            ->assertSuccessful();
    }

    /**
     * __general__ is not a job anyone pursued and a refunded pairing is one they backed
     * out of. Counting either inflates the median, which is the number most likely to
     * be read as "users tailor plenty, ship the pricing."
     */
    public function test_it_excludes_general_and_refunded_pairings(): void
    {
        $user = $this->userWithJobs(8);

        $user->jobPairings()->create([
            'billing_key' => JobPairing::GENERAL,
            'price_cents' => 0,
        ]);

        $user->jobPairings()->create([
            'billing_key' => JobPairing::billingKey('Refunded Co', 'Engineer'),
            'company' => 'Refunded Co',
            'title' => 'Engineer',
            'price_cents' => 0,
            'refunded_at' => now(),
        ]);

        // Still 8 jobs, not 10. Asserted as a whole table rather than a "doesn't contain
        // 10": the report prints the grant (3), its derived triggers (4, 6, 15), and a
        // percentage, so every bare numeral collides with something — "10" matches
        // "100.0%" and "3" matches the threshold column, passing for the wrong reason.
        $this->artisan('pricing:usage')
            ->expectsTable(['Metric', 'Value', 'Re-base if'], [
                ['Users with >=1 job', 1, '—'],
                ['Median jobs tailored', 8, 'median <= 4'],
                ['p90 jobs tailored', 8, 'p90 < 6'],
                ['Users exceeding 3 jobs', '1 (100.0%)', '< 15%'],
            ])
            ->assertSuccessful();
    }

    /**
     * The §12 triggers are defined over *lifetime* jobs tailored, but a query run today can
     * only see jobs-so-far. Recent signups have not finished applying, and both the median
     * and p90 triggers fire on LOW values — so counting the half-finished drags the report
     * toward "re-base the grant down". Under signup growth the newest cohort is also the
     * largest, so the bias gets worse the better the product does. That makes this a
     * go/no-go signal pointing the wrong way, not a rounding error.
     */
    public function test_it_excludes_users_too_new_to_have_finished_tailoring(): void
    {
        foreach ([8, 8, 8] as $jobs) {
            $this->userWithJobs($jobs);
        }

        // Four users a week into their search, one job each. Uncensored these dominate the
        // population and drag the median from 8 to 1, tripping every trigger.
        foreach ([1, 1, 1, 1] as $jobs) {
            $this->userWithJobs($jobs, signedUpDaysAgo: 7);
        }

        $this->artisan('pricing:usage')
            ->expectsTable(['Metric', 'Value', 'Re-base if'], [
                ['Users with >=1 job', 3, '—'],
                ['Median jobs tailored', 8, 'median <= 4'],
                ['p90 jobs tailored', 8, 'p90 < 6'],
                ['Users exceeding 3 jobs', '3 (100.0%)', '< 15%'],
            ])
            ->expectsOutputToContain('Also excluded: 4 user(s)')
            ->assertSuccessful();
    }

    /**
     * A brand-new product has nothing but immature users. Reporting a median off them
     * would read as a real signal, so the command refuses rather than under-reporting.
     */
    public function test_it_refuses_to_report_when_every_user_is_too_new(): void
    {
        $this->userWithJobs(8, signedUpDaysAgo: 7);

        $this->artisan('pricing:usage')
            ->expectsOutputToContain('too new to read')
            ->assertSuccessful();
    }

    public function test_it_reports_nothing_when_no_pairings_exist(): void
    {
        $this->artisan('pricing:usage')
            ->expectsOutputToContain('No job pairings recorded yet')
            ->assertSuccessful();
    }
}
