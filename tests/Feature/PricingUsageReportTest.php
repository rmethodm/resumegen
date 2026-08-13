<?php

namespace Tests\Feature;

use App\Models\JobPairing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingUsageReportTest extends TestCase
{
    use RefreshDatabase;

    private function userWithJobs(int $jobs): User
    {
        $user = User::factory()->create();

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

    public function test_it_reports_nothing_when_no_pairings_exist(): void
    {
        $this->artisan('pricing:usage')
            ->expectsOutputToContain('No job pairings recorded yet')
            ->assertSuccessful();
    }
}
