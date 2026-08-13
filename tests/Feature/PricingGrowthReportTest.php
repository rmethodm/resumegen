<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\JobPairing;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PricingGrowthReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_reports_net_margin_after_ai_stripe_and_infra_costs(): void
    {
        $user = User::factory()->create(['created_at' => now()]);

        // One $5 top-up: $5.00 in, minus Stripe (2.9% + 30c = 45c) = $4.55 kept.
        $user->balanceTransactions()->create([
            'amount_cents' => 500,
            'reason' => 'topup',
            'created_at' => now(),
        ]);

        $pairing = $user->jobPairings()->create([
            'billing_key' => JobPairing::billingKey('Acme', 'Engineer'),
            'company' => 'Acme',
            'title' => 'Engineer',
            'price_cents' => 50,
        ]);

        // 6,000,000 micro-cents = 6 cents of model spend.
        AiRequest::factory()->for($user)->create([
            'job_pairing_id' => $pairing->id,
            'estimated_cost_micro_cents' => 6_000_000,
            'created_at' => now(),
        ]);

        // $5.00 - $0.45 Stripe - $0.06 AI - $1.00 infra = $3.49 net.
        $this->artisan('pricing:growth --months=1 --infra=1')
            ->expectsOutputToContain('$3.49')
            ->assertSuccessful();
    }

    public function test_grants_are_not_counted_as_revenue(): void
    {
        // A grant is a discount, not income — counting it would invent revenue that
        // no card ever paid, which is the whole point of the grant/top-up split.
        $user = User::factory()->create(['created_at' => now()]);

        $user->balanceTransactions()->create([
            'amount_cents' => 500,
            'reason' => 'signup_grant',
            'created_at' => now(),
        ]);

        $this->artisan('pricing:growth --months=1 --infra=0')
            ->doesntExpectOutputToContain('$5.00')
            ->assertSuccessful();
    }

    public function test_it_warns_rather_than_reporting_on_an_empty_database(): void
    {
        $this->artisan('pricing:growth')
            ->expectsOutputToContain('No accounts in the reporting window')
            ->assertSuccessful();
    }
}
