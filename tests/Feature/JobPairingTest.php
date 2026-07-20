<?php

namespace Tests\Feature;

use App\Models\AiRequest;
use App\Models\JobPairing;
use App\Models\User;
use App\Services\JobPairingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class JobPairingTest extends TestCase
{
    use RefreshDatabase;

    private function service(): JobPairingService
    {
        return app(JobPairingService::class);
    }

    /**
     * The whole point of dropping location from the key: one posting syndicated to
     * three boards renders its company three ways. If these split, the user is charged
     * three times for one job — the error the pricing model cannot afford.
     */
    public function test_same_job_from_different_sources_is_one_key(): void
    {
        $key = JobPairing::billingKey('Acme Inc.', 'Senior Product Manager');

        $this->assertSame($key, JobPairing::billingKey('Acme, Inc.', 'Senior Product Manager'));
        $this->assertSame($key, JobPairing::billingKey('ACME LLC', 'Senior Product Manager'));
        $this->assertSame($key, JobPairing::billingKey('  Acme   Inc  ', 'Senior  Product Manager'));
    }

    /** Distinct roles at one company must stay distinct, or under-charging goes too far. */
    public function test_different_titles_at_one_company_are_different_keys(): void
    {
        $this->assertNotSame(
            JobPairing::billingKey('Acme', 'Senior Product Manager'),
            JobPairing::billingKey('Acme', 'Staff Engineer'),
        );
    }

    /**
     * Documented ceiling, asserted so it stays a known limit rather than a surprise:
     * title-abbreviation folding is deliberately absent, so these still split.
     */
    public function test_abbreviated_titles_still_split(): void
    {
        $this->assertNotSame(
            JobPairing::billingKey('Acme', 'Sr. Product Manager'),
            JobPairing::billingKey('Acme', 'Senior Product Manager'),
        );
    }

    /** Resolving the same job twice must charge once — this is the double-charge fence. */
    public function test_resolving_the_same_job_twice_creates_one_pairing(): void
    {
        $user = User::factory()->create();

        $first = $this->service()->resolveForJob($user, 'Acme Inc.', 'Senior Product Manager');
        $second = $this->service()->resolveForJob($user, 'Acme, Inc.', 'Senior  Product Manager');

        $this->assertTrue($first->is($second));
        $this->assertSame(1, $user->jobPairings()->count());
        $this->assertSame(1, $user->balanceTransactions()->where('reason', 'charge')->count());
    }

    /** A blank company would normalize to a key shared by every unnamed job. */
    public function test_missing_company_is_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);

        $this->service()->resolveForJob(User::factory()->create(), null, 'Senior Product Manager');
    }

    /** Pairings are per-user; one user's key must never resolve to another's row. */
    public function test_pairings_are_scoped_per_user(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        $alicePairing = $this->service()->resolveForJob($alice, 'Acme', 'Senior Product Manager');
        $bobPairing = $this->service()->resolveForJob($bob, 'Acme', 'Senior Product Manager');

        $this->assertFalse($alicePairing->is($bobPairing));
        $this->assertSame(1, $alice->jobPairings()->count());
        $this->assertSame(1, $bob->jobPairings()->count());
    }

    /** Non-job AI collapses into one reserved pairing, not one per call. */
    public function test_general_pairing_is_resolved_once(): void
    {
        $user = User::factory()->create();

        $first = $this->service()->resolveGeneral($user);
        $second = $this->service()->resolveGeneral($user);

        $this->assertTrue($first->is($second));
        $this->assertSame(JobPairing::GENERAL, $first->billing_key);
    }

    /** Instrumentation, not billing: nothing is charged while prices are 0. */
    public function test_prices_are_zero_so_no_balance_moves(): void
    {
        $user = User::factory()->create();

        $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        $this->assertSame(0, $user->balanceCents());
        $this->assertSame(0, (int) $user->jobPairings()->sole()->price_cents);
    }

    /** The ledger, not a cached column, is the balance — and it debits once priced. */
    public function test_pairing_debits_the_ledger_when_priced(): void
    {
        config()->set('pricing.job_cents', 50);

        $user = User::factory()->create();
        $user->balanceTransactions()->create(['amount_cents' => 500, 'reason' => 'signup_grant']);

        $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        $this->assertSame(450, $user->balanceCents());
    }

    /** A refunded job must be buyable again — the partial unique index allows it. */
    public function test_refunded_pairing_can_be_repurchased(): void
    {
        $user = User::factory()->create();

        $first = $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');
        $first->update(['refunded_at' => now()]);

        $second = $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        $this->assertFalse($first->is($second));
        $this->assertSame(2, $user->jobPairings()->count());
    }

    /** The refund window closes on the first success, so output can never be kept for free. */
    public function test_pairing_stops_being_refundable_after_a_successful_call(): void
    {
        $user = User::factory()->create();
        $pairing = $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        $this->assertTrue($pairing->isRefundable());

        AiRequest::create([
            'user_id' => $user->id,
            'job_pairing_id' => $pairing->id,
            'model' => 'gpt-4o-mini',
            'status' => 'success',
        ]);

        $this->assertFalse($pairing->fresh()->isRefundable());
    }

    /** A user must never lose the refund window to our outage or a moderation block. */
    public function test_failed_and_flagged_calls_leave_the_window_open(): void
    {
        $user = User::factory()->create();
        $pairing = $this->service()->resolveForJob($user, 'Acme', 'Senior Product Manager');

        foreach (['error', 'flagged'] as $status) {
            AiRequest::create([
                'user_id' => $user->id,
                'job_pairing_id' => $pairing->id,
                'model' => 'gpt-4o-mini',
                'status' => $status,
            ]);
        }

        $this->assertTrue($pairing->fresh()->isRefundable());
    }
}
